"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type DragEvent, type FormEvent } from "react";
import {
  BankIcon,
  CalledIcon,
  CardIcon,
  ForwardedIcon,
  JobIcon,
  MessageIcon,
  PasteIcon,
  PersonIcon,
  PoliceIcon,
  SavedContactIcon,
  SenderIcon,
  UploadIcon,
  XCircleIcon,
  type IconComponent,
} from "./icons";
import { Result, type CheckResult } from "./result";

// Vercel and Netlify reject request bodies over ~4.5 MB. Match the backend's MAX_UPLOAD_MB.
const MAX_FILE_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB) || 4;
const MAX_TEXT_CHARS = 10_000;
const ACCEPT = "image/*,audio/*,video/*,application/pdf,.opus,.m4a,.mov";
// Recordings: up to 5 minutes is quick; up to 10 is allowed with a warning; longer is refused.
const COMFORTABLE_SECONDS = 5 * 60;
const MAX_MEDIA_SECONDS = 10 * 60;
const TRIM_TIP = "trim it to the part where they ask for money, an OTP, or an app";

type FileKind = "image" | "audio" | "video" | "pdf";
type InputKind = FileKind | "text";

function fileKind(file: File): FileKind {
  const type = file.type;
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("audio/") || /\.(opus|m4a|amr)$/i.test(file.name)) return "audio";
  if (type.startsWith("video/") || /\.mov$/i.test(file.name)) return "video";
  return "pdf";
}

// Gemini takes roughly 5 s plus 0.2 s per second of recording (a 4-minute call took ~50 s).
function checkSeconds(mediaSeconds: number) {
  return Math.max(10, Math.round((5 + mediaSeconds * 0.2) / 10) * 10);
}

function formatDuration(seconds: number) {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// "3-minute", or "short" for under a minute and a half.
function lengthWord(seconds: number) {
  return seconds < 90 ? "short" : `${Math.round(seconds / 60)}-minute`;
}

// The recording's length, read in the browser without uploading it. Null when the
// browser can't play the format (some .opus and .amr files) or reports no length.
function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement(fileKind(file) === "video" ? "video" : "audio");
    let settled = false;
    const done = (seconds: number | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      el.removeAttribute("src");
      resolve(seconds);
    };
    el.preload = "metadata";
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) && el.duration > 0 ? el.duration : null);
    el.onerror = () => done(null);
    window.setTimeout(() => done(null), 5000);
    el.src = url;
  });
}

function tooBigMessage(file: File, size: string) {
  const limit = `The limit is ${MAX_FILE_MB} MB`;
  switch (fileKind(file)) {
    case "audio":
      return `That recording is ${size}. ${limit}. Try a shorter clip (${TRIM_TIP}), or type what the caller said.`;
    case "video":
      return `That video is ${size}. ${limit}, so most videos are too big. Upload a screenshot instead, or type what was said.`;
    default:
      return `That file is ${size}. ${limit}. Try a screenshot of just the part that worries you.`;
  }
}

type Progress = { kind: InputKind; seconds: number | null };

// What the person sees while a check runs. The API answers everything in one
// request, so these follow typical timing rather than live progress.
const STAGES: { at: number; text: (p: Progress) => string }[] = [
  { at: 0, text: ({ kind }) => (kind === "text" ? "Sending your message…" : "Uploading your file…") },
  {
    at: 1500,
    text: ({ kind, seconds }) =>
      kind === "audio"
        ? `Listening to the ${seconds ? `${lengthWord(seconds)} ` : ""}recording…`
        : kind === "video"
          ? "Watching the video…"
          : "Reading what it says…",
  },
  { at: 4000, text: () => "Checking for warning signs…" },
  { at: 9000, text: () => "Working out the verdict…" },
  {
    at: 18000,
    text: ({ kind, seconds }) =>
      kind !== "audio" && kind !== "video"
        ? "Still working, nearly there…"
        : seconds
          ? `Still working. A ${lengthWord(seconds)} recording takes about ${checkSeconds(seconds)} seconds.`
          : "Still working. Recordings can take up to a minute.",
  },
  { at: 40000, text: () => "Almost done. Thanks for waiting." },
];

// Clipboard reading needs a secure context (https or localhost) and a supporting browser.
const noSubscribe = () => () => {};
const clipboardReadable = () => typeof navigator !== "undefined" && typeof navigator.clipboard?.readText === "function";

// One-click samples for demos. The last two are genuine or borderline, so
// people can see the checker doesn't flag everything.
const EXAMPLES: { label: string; icon: IconComponent; text: string }[] = [
  {
    label: "Bank KYC SMS",
    icon: BankIcon,
    text: "Dear Customer, your SBI YONO account will be blocked today due to pending PAN/KYC update. Update immediately at http://sbi-kyc-verify.in or share the OTP sent to your mobile with our executive. -SBI",
  },
  {
    label: "Digital arrest call",
    icon: PoliceIcon,
    text: "Caller: This is Inspector Rajesh Sharma from Mumbai Cyber Crime. A FedEx parcel in your name with 5 fake passports and drugs was seized. You are now under digital arrest. Stay on this video call and do not tell anyone, including your family. To clear your name, transfer ₹1,50,000 to the RBI verification account we send you.",
  },
  {
    label: "Friend needs your card",
    icon: CardIcon,
    text: "Bro, my card got blocked and the flight fare goes up in 20 mins. Send me your card number, expiry and CVV, I'll book it and pay you back tonight. Can't talk right now, I'm at the airport counter. This is my new number.",
  },
  {
    label: "Part-time job offer",
    icon: JobIcon,
    text: "Hi! I'm Priya from Amazon HR. We have a part-time job: earn ₹3,000–8,000 daily just by liking YouTube videos. Pay a small ₹500 registration fee on Telegram to unlock VIP tasks.",
  },
  {
    label: "Dad asks for money",
    icon: PersonIcon,
    text: 'My dad messaged me on WhatsApp from his usual number, the one saved as Nanna: "Hi. Can you transfer 10k?"',
  },
  {
    label: "Real bank OTP",
    icon: MessageIcon,
    text: "482913 is your OTP for a transaction of INR 2,499.00 at AMAZON on HDFC Bank card XX1234. Valid for 10 mins. Do not share this OTP with anyone. -HDFC Bank",
  },
];

type Answer = "yes" | "no" | "";
type Context = {
  saved_contact: Answer;
  relayed: Answer;
  confirmed_by_call: Answer;
  sms_from: "sender_name" | "phone_number" | "";
};
const NO_CONTEXT: Context = {
  saved_contact: "",
  relayed: "",
  confirmed_by_call: "",
  sms_from: "",
};

// [value sent to the server, label]. "" is "Not sure", the starting answer, and is never sent.
type Option = readonly [string, string];
const YES_NO: readonly Option[] = [
  ["yes", "Yes"],
  ["no", "No"],
  ["", "Not sure"],
];

const QUESTIONS: { key: keyof Context; text: string; icon: IconComponent; options: readonly Option[] }[] = [
  {
    key: "sms_from",
    text: "If it's an SMS, who sent it?",
    icon: SenderIcon,
    options: [
      ["sender_name", "A name like AX-HDFCBK"],
      ["phone_number", "A phone number"],
      ["", "Not sure"],
    ],
  },
  { key: "saved_contact", text: "Is this number saved in your phone?", icon: SavedContactIcon, options: YES_NO },
  { key: "relayed", text: "Did someone else pass this request on to you?", icon: ForwardedIcon, options: YES_NO },
  {
    key: "confirmed_by_call",
    text: "Have you called them on a number you already had, to check?",
    icon: CalledIcon,
    options: YES_NO,
  },
];

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const KIND_LABEL: Record<FileKind, string> = {
  image: "Screenshot",
  audio: "Call recording",
  video: "Video",
  pdf: "PDF",
};

function describeInput(text: string, file: File | null) {
  const parts: string[] = [];
  if (text.trim()) parts.push("Text");
  if (file) parts.push(KIND_LABEL[fileKind(file)]);
  return parts.join(" + ");
}

// Under a chosen recording: how long the check will take, or a warning when it's long.
function MediaNote({ kind, seconds }: { kind: FileKind; seconds: number | null }) {
  if (kind !== "audio" && kind !== "video") return null;
  if (seconds === null) return <p className="hint media-note">Recordings take up to a minute to check.</p>;
  if (seconds <= COMFORTABLE_SECONDS)
    return <p className="hint media-note">Takes about {checkSeconds(seconds)} seconds to check.</p>;
  return (
    <p className="media-note" data-long>
      This is a long recording, so the check may take {checkSeconds(seconds) >= 90 ? "a couple of minutes" : "over a minute"}. For a
      faster answer, {TRIM_TIP}.
    </p>
  );
}

export default function Checker() {
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [context, setContext] = useState<Context>(NO_CONTEXT);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    data: CheckResult;
    source: string;
  } | null>(null);
  // After a check the form folds into a one-line summary; "Edit" opens it again.
  const [editing, setEditing] = useState(false);
  const collapsed = result !== null && !editing;
  const cardRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const focusText = useRef(false);
  const canPaste = useSyncExternalStore(noSubscribe, clipboardReadable, () => false);
  const [pasteNote, setPasteNote] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const stageTimers = useRef<number[]>([]);
  // Length of the chosen recording in seconds; null for other files or when unknown.
  const [mediaSeconds, setMediaSeconds] = useState<number | null>(null);
  const [progress, setProgress] = useState<Progress>({ kind: "text", seconds: null });
  const pickToken = useRef(0);

  // Stop the progress timers if the page goes away mid-check.
  useEffect(() => {
    const timers = stageTimers;
    return () => timers.current.forEach(clearTimeout);
  }, []);

  async function pasteFromClipboard() {
    setPasteNote(null);
    try {
      const clip = (await navigator.clipboard.readText()).trim();
      if (!clip) {
        setPasteNote("Nothing to paste. Copy the message first, then tap Paste.");
        return;
      }
      setText(clip.slice(0, MAX_TEXT_CHARS));
      setError(null);
      if (clip.length > MAX_TEXT_CHARS) {
        setPasteNote(`Only the first ${MAX_TEXT_CHARS.toLocaleString("en-IN")} characters were pasted.`);
      }
    } catch {
      // Permission refused, or the browser only allows pasting from its own menu.
      setPasteNote("Couldn't open your clipboard. Long-press the message box and choose Paste.");
    }
    textRef.current?.focus();
  }

  // Bring the summary and the verdict into view; on small screens they land below the fold.
  useEffect(() => {
    if (result) cardRef.current?.scrollIntoView({ block: "start" });
  }, [result]);

  // The textarea only exists once the form re-opens, so focus it after that render.
  useEffect(() => {
    if (focusText.current && textRef.current) {
      textRef.current.focus();
      focusText.current = false;
    }
  });

  function editCheck() {
    focusText.current = true;
    setEditing(true);
  }

  function checkAnother() {
    focusText.current = true;
    setText("");
    clearFile();
    setContext(NO_CONTEXT);
    setError(null);
    setResult(null);
    setEditing(false);
  }

  async function pickFile(next: File | null) {
    const token = ++pickToken.current;
    setError(null);
    if (!next) return clearFile();
    if (next.size > MAX_FILE_MB * 1024 * 1024) {
      clearFile();
      setError(tooBigMessage(next, formatSize(next.size)));
      return;
    }
    const kind = fileKind(next);
    const seconds = kind === "audio" || kind === "video" ? await readDuration(next) : null;
    if (token !== pickToken.current) return; // another file was picked while this one was read
    if (seconds !== null && seconds > MAX_MEDIA_SECONDS) {
      clearFile();
      setError(
        `That ${kind === "video" ? "video" : "recording"} is ${formatDuration(seconds)} long. ` +
          `The limit is ${MAX_MEDIA_SECONDS / 60} minutes: ${TRIM_TIP}, or type what was said.`,
      );
      return;
    }
    setMediaSeconds(seconds);
    setFile(next);
  }

  function clearFile() {
    setFile(null);
    setMediaSeconds(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    void pickFile(e.dataTransfer.files[0] ?? null);
  }

  async function runCheck(ctx: Context) {
    if (!text.trim() && !file) {
      setError("Paste a message, describe what happened, or add a screenshot.");
      return;
    }
    setError(null);
    setPasteNote(null);
    setResult(null);
    setLoading(true);
    setStage(0);
    setProgress({ kind: file ? fileKind(file) : "text", seconds: mediaSeconds });
    stageTimers.current.forEach(clearTimeout);
    stageTimers.current = STAGES.slice(1).map((s, i) => window.setTimeout(() => setStage(i + 1), s.at));
    const source = describeInput(text, file);
    const body = new FormData();
    body.set("text", text);
    if (file) body.set("file", file);
    for (const [key, value] of Object.entries(ctx)) if (value) body.set(key, value);
    try {
      const res = await fetch("/api/check", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        // No `detail` means the backend never answered (crashed, restarting, or too slow for the proxy).
        const slow = file && (fileKind(file) === "audio" || fileKind(file) === "video");
        setError(
          typeof data?.detail === "string"
            ? data.detail
            : slow
              ? "This took too long to check. Try a shorter clip (under 5 minutes works best), or try again."
              : `Something went wrong (${res.status}). Try again.`,
        );
        return;
      }
      // An older backend answers in a different shape (no `checks`); say so instead of crashing.
      if (!Array.isArray(data?.checks) || !Array.isArray(data?.reasons)) {
        setError("The ScamCheck server is running an older version. Restart the backend, then check again.");
        return;
      }
      setResult({ data: data as CheckResult, source });
      setEditing(false);
    } catch {
      setError("Couldn't reach ScamCheck. Check your connection and try again.");
    } finally {
      stageTimers.current.forEach(clearTimeout);
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    runCheck(context);
  }

  // "I called them and they confirmed" on an unsure result: record it and check again.
  function confirmedByCall() {
    const next = { ...context, confirmed_by_call: "yes" as const };
    setContext(next);
    runCheck(next);
  }

  function loadExample(sample: string) {
    setPasteNote(null);
    setText(sample);
    clearFile();
    setContext(NO_CONTEXT);
    setError(null);
    setResult(null);
  }

  return (
    <>
      <div ref={cardRef} className="checker-card" data-collapsed={collapsed || undefined}>
        {collapsed ? (
          <div className="checked-summary">
            <div className="checked-summary-text">
              <p className="checked-label">You checked · {result.source}</p>
              <p className="checked-snippet">{text.trim() || file?.name}</p>
            </div>
            <div className="checked-actions">
              <button type="button" className="button button-small button-ghost" onClick={editCheck}>
                Edit
              </button>
              <button type="button" className="button button-small" onClick={checkAnother}>
                Check another
              </button>
            </div>
          </div>
        ) : (
          <form className="checker" onSubmit={onSubmit} aria-label="Scam check" noValidate>
            <div className="examples" role="group" aria-labelledby={`${id}-examples`}>
              <span id={`${id}-examples`} className="examples-label">
                Try an example
              </span>
              <div className="example-chips">
                {EXAMPLES.map(({ label, icon: ExampleIcon, text: sample }) => (
                  <button key={label} type="button" className="chip-button" onClick={() => loadExample(sample)}>
                    <ExampleIcon className="chip-icon" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <div className="field-head">
                <label htmlFor={`${id}-text`}>Message</label>
                {canPaste && (
                  <button type="button" className="paste-button" onClick={pasteFromClipboard}>
                    <PasteIcon className="button-icon" /> Paste
                  </button>
                )}
              </div>
              <textarea
                ref={textRef}
                id={`${id}-text`}
                name="text"
                rows={6}
                maxLength={MAX_TEXT_CHARS}
                value={text}
                onChange={(e) => setText(e.target.value)}
                aria-describedby={`${id}-text-hint`}
                placeholder="Paste the SMS or WhatsApp message here, or describe the call in your own words"
              />
              {pasteNote && (
                <p className="paste-note" role="status">
                  {pasteNote}
                </p>
              )}
              <p id={`${id}-text-hint`} className="hint">
                Any language is fine. Remove OTPs, card numbers, and account numbers first.
              </p>
            </div>

            <div className="field">
              <span className="label" id={`${id}-file-label`}>
                Screenshot or recording <span className="optional">(optional)</span>
              </span>
              {file ? (
                <>
                  <div className="file-chip">
                    <UploadIcon className="file-icon" />
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">
                      {mediaSeconds !== null && `${formatDuration(mediaSeconds)} · `}
                      {formatSize(file.size)}
                    </span>
                    <button type="button" className="link-button" onClick={clearFile}>
                      Remove<span className="visually-hidden"> {file.name}</span>
                    </button>
                  </div>
                  <MediaNote kind={fileKind(file)} seconds={mediaSeconds} />
                </>
              ) : (
                <label
                  htmlFor={`${id}-file`}
                  className="dropzone"
                  data-dragging={dragging || undefined}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                >
                  <UploadIcon className="dropzone-icon" />
                  <span className="dropzone-title">Add a screenshot, voice note, video, or PDF</span>
                  <span className="hint">
                    Tap to choose<span className="drop-only">, or drop it here</span> · up to {MAX_FILE_MB}
                    {" "}MB
                  </span>
                  <span className="hint">Call recordings work best under 5 minutes.</span>
                </label>
              )}
              {!file && (
                <p className="hint">
                  No recording? Type what the caller said in the message box: who they said they were, and what they
                  asked you to do.
                </p>
              )}
              <input
                ref={fileInput}
                id={`${id}-file`}
                name="file"
                type="file"
                accept={ACCEPT}
                className="visually-hidden"
                aria-labelledby={`${id}-file-label`}
                onChange={(e) => void pickFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <fieldset className="quick-questions">
              <legend>
                Quick questions <span className="optional">(optional)</span>
              </legend>
              <p className="hint">These help most when the message says it&apos;s from your bank, family, or a friend.</p>
              {QUESTIONS.map(({ key, text: question, icon: QuestionIcon, options }) => (
                <div key={key} className="quick-question" role="radiogroup" aria-labelledby={`${id}-${key}`}>
                  <span id={`${id}-${key}`} className="quick-question-text">
                    <QuestionIcon className="quick-question-icon" />
                    {question}
                  </span>
                  <span className="pill-group">
                    {options.map(([value, label]) => (
                      <label key={label} className="pill" data-default={value === "" || undefined}>
                        <input
                          type="radio"
                          name={key}
                          value={value}
                          checked={context[key] === value}
                          onChange={() => setContext((c) => ({ ...c, [key]: value }))}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </span>
                </div>
              ))}
            </fieldset>

            {error && (
              <p className="error" role="alert">
                <XCircleIcon className="error-icon" />
                <span>{error}</span>
              </p>
            )}

            <div className="submit-row">
              <button type="submit" className="button" disabled={loading}>
                {loading ? (
                  <>
                    <progress className="loading-spinner" aria-label="Checking" />
                    Checking…
                  </>
                ) : (
                  "Check for scam"
                )}
              </button>
              {loading ? (
                <div className="progress" role="status">
                  <div className="progress-track" aria-hidden="true">
                    {STAGES.slice(0, 4).map((s, i) => (
                      <span key={s.at} data-done={i <= stage || undefined} />
                    ))}
                  </div>
                  <p className="progress-text">{STAGES[stage].text(progress)}</p>
                </div>
              ) : (
                <p className="hint">Free. Checked by Google&apos;s Gemini AI. ScamCheck doesn&apos;t save what you send.</p>
              )}
            </div>
          </form>
        )}
      </div>

      {/* A sibling of the form card, not nested in it, so the verdict reads as its own card. */}
      <section className="result-region" aria-live="polite">
        {result && <Result result={result.data} source={result.source} onConfirmedByCall={confirmedByCall} />}
      </section>
    </>
  );
}
