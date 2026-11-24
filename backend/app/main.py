import base64
import json
import logging
import mimetypes
import os
import time
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from google import genai
# The Decisions API client raises these (not google.genai.errors.APIError).
from google.genai._interactions import APIConnectionError, APIStatusError

from .injection import tries_to_fool_checker
from .media import actual_mime
from .questions import CONTEXT_HEADER, INPUT_PREAMBLE, SIGNS, USER_NOTE_HEADER, from_wire, wire_questions
from .ratelimit import Limits, RateLimiter, client_ip, trusted_proxies_from_env
from .verdict import SMS_FROM_VALUES, Answers, Context, decide

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
log = logging.getLogger("scamcheck")
if not log.handlers:  # uvicorn only configures its own loggers; print ours next to them
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(levelname)s:     %(name)s: %(message)s"))
    log.addHandler(_handler)
    log.setLevel(logging.INFO)
    log.propagate = False

MODEL = "gemini-decision-1"
MAX_TEXT_CHARS = 10_000
# Vercel and Netlify reject request bodies over ~4.5 MB, so 4 MB is the default; a
# 3-minute call recording is 1-3 MB. When self-hosting, raise MAX_UPLOAD_MB (the
# Gemini API itself takes up to 100 MB after base64, PDFs up to 50 MB).
MAX_FILE_BYTES = int(float(os.environ.get("MAX_UPLOAD_MB", "4")) * 1024 * 1024)

# Decisions API MIME type -> input block type.
SUPPORTED_MIME = {
    **{m: "image" for m in ("image/png", "image/jpeg", "image/webp", "image/heic", "image/heif", "image/gif", "image/bmp", "image/tiff")},
    **{m: "audio" for m in ("audio/wav", "audio/mp3", "audio/mpeg", "audio/aiff", "audio/aac", "audio/ogg", "audio/flac", "audio/m4a", "audio/opus", "audio/webm")},
    **{m: "video" for m in ("video/mp4", "video/mpeg", "video/mov", "video/avi", "video/webm", "video/wmv", "video/x-flv", "video/3gpp")},
    "application/pdf": "document",
}
# Browser/OS spellings -> the spelling the API accepts.
MIME_ALIASES = {
    "image/jpg": "image/jpeg",
    "audio/x-wav": "audio/wav",
    "audio/wave": "audio/wav",
    "audio/vnd.wave": "audio/wav",
    "audio/x-m4a": "audio/m4a",
    "audio/mp4": "audio/m4a",
    "audio/x-aac": "audio/aac",
    "audio/x-flac": "audio/flac",
    "audio/x-aiff": "audio/aiff",
    "video/quicktime": "video/mov",
    "video/x-msvideo": "video/avi",
    "video/x-ms-wmv": "video/wmv",
}
EXTENSION_MIME = {".opus": "audio/opus", ".m4a": "audio/m4a", ".mov": "video/mov", ".heic": "image/heic", ".heif": "image/heif"}
# `error.code` values the Decisions API returns (HTTP 400) when safety filters block input.
SAFETY_CODES = frozenset({"safety", "prohibited_content", "blocklist", "image_safety", "content_blocked"})

DAMAGED_FILE = (
    "We couldn't open this file. It may be damaged, or saved in a different format than its name says "
    "(common with online converters). Try the original recording or screenshot."
)

# Interactive docs (/docs, /redoc, /openapi.json) are off unless ENABLE_API_DOCS=1.
_docs = os.environ.get("ENABLE_API_DOCS") == "1"
app = FastAPI(
    title="ScamCheck API",
    docs_url="/docs" if _docs else None,
    redoc_url="/redoc" if _docs else None,
    openapi_url="/openapi.json" if _docs else None,
)
_client: genai.Client | None = None
limiter = RateLimiter(Limits.from_env())
TRUSTED_PROXIES = trusted_proxies_from_env()


def get_client() -> genai.Client:
    global _client
    if _client is None:
        key = os.environ.get("GEMINI_API_KEY")
        if not key:
            raise HTTPException(503, "The server has no GEMINI_API_KEY configured.")
        _client = genai.Client(api_key=key, http_options={"api_version": "v1beta"})
    return _client


def resolve_mime(upload: UploadFile) -> str:
    mime = (upload.content_type or "").split(";")[0].strip().lower()
    if mime in ("", "application/octet-stream"):
        ext = Path(upload.filename or "").suffix.lower()
        mime = EXTENSION_MIME.get(ext) or mimetypes.guess_type(upload.filename or "")[0] or ""
    mime = MIME_ALIASES.get(mime, mime)
    if mime not in SUPPORTED_MIME:
        raise HTTPException(415, "Unsupported file type. Upload a screenshot, audio, video, or PDF.")
    return mime


async def read_limited(upload: UploadFile) -> bytes:
    data = await upload.read(MAX_FILE_BYTES + 1)
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(413, f"File is larger than {MAX_FILE_BYTES // (1024 * 1024)} MB.")
    if not data:
        raise HTTPException(400, "The uploaded file is empty.")
    return data


def _yes_no(value: str, allowed: tuple[str, ...] = ("yes", "no")) -> str | None:
    value = value.strip().lower()
    return value if value in allowed else None


def build_input(text: str, context: Context, mime: str | None = None, data: bytes | None = None) -> list[dict]:
    """Decisions API input: preamble, what the person told us, their text, then the file."""
    blocks: list[dict] = [{"type": "text", "text": INPUT_PREAMBLE}]
    if context.as_dict():
        blocks.append({"type": "text", "text": CONTEXT_HEADER + json.dumps(context.as_dict()) + "\n\n"})
    if text:
        blocks.append({"type": "text", "text": USER_NOTE_HEADER + text + "\n\n"})
    if mime is not None and data is not None:
        block = {"type": SUPPORTED_MIME[mime], "data": base64.b64encode(data).decode("ascii"), "mime_type": mime}
        if block["type"] == "video":
            block["resolution"] = "low"  # keeps long clips inside the 262K-token context
        blocks.append(block)
    return blocks


def to_answers(wire_answers, context: Context, text: str = "") -> Answers:
    ans = from_wire(wire_answers)
    return Answers(
        readable=ans["readable"].noul,
        is_scam=ans["is_scam"].noul,
        claims_to_be=ans["claims_to_be"].choice,
        claims_to_be_p=ans["claims_to_be"].confidence,
        signs={key: ans[f"sign_{key}"].noul for key in SIGNS},
        scam_type=ans["scam_type"].choice,
        scam_type_p=ans["scam_type"].confidence,
        context=context,
        tampered=tries_to_fool_checker(text),
    )


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "api_key_configured": bool(os.environ.get("GEMINI_API_KEY"))}


@app.post("/api/check")
async def check(
    request: Request,
    text: str = Form(""),
    file: UploadFile | None = File(None),
    saved_contact: str = Form(""),
    relayed: str = Form(""),
    confirmed_by_call: str = Form(""),
    sms_from: str = Form(""),
) -> dict:
    text = text.strip()
    if not text and file is None:
        raise HTTPException(400, "Paste a message or upload a file to check.")
    if len(text) > MAX_TEXT_CHARS:
        raise HTTPException(413, f"Text is longer than {MAX_TEXT_CHARS:,} characters.")

    visitor = client_ip(
        request.client.host if request.client else None, request.headers.get("x-forwarded-for"), TRUSTED_PROXIES
    )
    wait = limiter.check(visitor)
    if wait is not None:
        raise HTTPException(
            429, "Too many checks right now. Try again in a little while.", headers={"Retry-After": str(wait)}
        )

    context = Context(
        saved_contact=_yes_no(saved_contact),
        relayed=_yes_no(relayed),
        confirmed_by_call=_yes_no(confirmed_by_call),
        sms_from=_yes_no(sms_from, SMS_FROM_VALUES),
    )
    mime = data = None
    if file is not None:
        declared = resolve_mime(file)
        data = await read_limited(file)
        mime = actual_mime(declared, SUPPORTED_MIME[declared], data)
        if mime is None:
            raise HTTPException(422, DAMAGED_FILE)
        if mime != declared:
            log.info("check: %s upload is really %s", declared, mime)
    blocks = build_input(text, context, mime, data)

    client = get_client()
    started = time.perf_counter()
    try:
        result = await client.aio.decisions.create(model=MODEL, input=blocks, questions=wire_questions())
    except APIStatusError as e:
        error_body = e.body.get("error", {}) if isinstance(e.body, dict) else {}
        if e.status_code == 400 and error_body.get("code") in SAFETY_CODES:
            raise HTTPException(422, "Gemini's safety filters blocked this content, so it could not be checked.") from e
        if e.status_code == 400 and "decode" in str(error_body.get("message", "")).lower():
            log.warning("Gemini could not decode the %s upload: %s", mime, error_body.get("message"))
            raise HTTPException(422, DAMAGED_FILE) from e
        if e.status_code == 429:
            raise HTTPException(429, "Too many checks right now. Try again in a minute.") from e
        # Upstream messages can describe the key or project ("API key not valid", quota
        # names, project IDs). Log them here; tell the browser only that it failed.
        log.error("Gemini API error %s: %s", e.status_code, error_body.get("message"))
        raise HTTPException(502, "The checking service had a problem. Try again in a minute.") from e
    except APIConnectionError as e:
        raise HTTPException(504, "Couldn't reach the Gemini API. Try again.") from e
    latency_ms = round((time.perf_counter() - started) * 1000)

    if not result.answers:  # input filters can block without an HTTP error; prompt_feedback says why
        raise HTTPException(422, "Gemini's safety filters blocked this content, so it could not be checked.")
    answers = to_answers(result.answers, context, text)
    decision = decide(answers)
    input_tokens = result.usage.total_input_tokens if result.usage else None
    # Scores and sizes only, never the message: enough to see why a check came out "unclear".
    log.info(
        "check: input=%s file_kb=%s text_chars=%d readable=%.2f is_scam=%.2f verdict=%s tokens=%s %dms",
        mime or "text", len(data) // 1024 if data else 0, len(text), answers.readable, answers.is_scam,
        decision["verdict"], input_tokens, latency_ms,
    )
    return {**decision, "latency_ms": latency_ms, "input_tokens": input_tokens}
