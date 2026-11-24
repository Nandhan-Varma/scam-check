"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type DragEvent, type FormEvent } from "react";
import { serverMessage, useT, type Messages, type RecordingLength } from "./i18n";
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
import { Result, describeInput, type CheckResult, type InputKind } from "./result";

// Vercel and Netlify reject request bodies over ~4.5 MB. Match the backend's MAX_UPLOAD_MB.
const MAX_FILE_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB) || 4;
const MAX_TEXT_CHARS = 10_000;
const ACCEPT = "image/*,audio/*,video/*,application/pdf,.opus,.m4a,.mov";
// Recordings: up to 5 minutes is quick; up to 10 is allowed with a warning; longer is refused.
const COMFORTABLE_SECONDS = 5 * 60;
const MAX_MEDIA_SECONDS = 10 * 60;

type FileKind = Exclude<InputKind, "text">;

// Text shown to the person is kept as a function of the strings, so it follows a language switch.
type Localized = (t: Messages) => string;

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

// "short" for under a minute and a half, otherwise the length in whole minutes.
function recordingLength(seconds: number | null): RecordingLength {
  return seconds === null ? null : { short: seconds < 90, minutes: Math.round(seconds / 60) };
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

function tooBigMessage(file: File, size: string): Localized {
  switch (fileKind(file)) {
    case "audio":
      return (t) => t.errors.tooBigAudio(size, MAX_FILE_MB);
    case "video":
      return (t) => t.errors.tooBigVideo(size, MAX_FILE_MB);
    default:
      return (t) => t.errors.tooBigFile(size, MAX_FILE_MB);
  }
}

type Progress = { kind: InputKind; seconds: number | null };

// What the person sees while a check runs. The API answers everything in one
// request, so these follow typical timing rather than live progress.
const STAGES: { at: number; text: (p: Progress, t: Messages) => string }[] = [
  { at: 0, text: ({ kind }, t) => (kind === "text" ? t.stages.sending : t.stages.uploading) },
  {
    at: 1500,
    text: ({ kind, seconds }, t) =>
      kind === "audio"
        ? t.stages.listening(recordingLength(seconds))
        : kind === "video"
          ? t.stages.watching
          : t.stages.reading,
  },
  { at: 4000, text: (_, t) => t.stages.signs },
  { at: 9000, text: (_, t) => t.stages.verdict },
  {
    at: 18000,
    text: ({ kind, seconds }, t) =>
      kind !== "audio" && kind !== "video"
        ? t.stages.nearly
        : t.stages.recordingSlow(recordingLength(seconds), seconds ? checkSeconds(seconds) : 0),
  },
  { at: 40000, text: (_, t) => t.stages.almost },
];

// Clipboard reading needs a secure context (https or localhost) and a supporting browser.
const noSubscribe = () => () => {};
const clipboardReadable = () => typeof navigator !== "undefined" && typeof navigator.clipboard?.readText === "function";

// One-click samples for demos. The last two are genuine or borderline, so
// people can see the checker doesn't flag everything. The messages stay as they
// were received, in English; their chip labels come from t.checker.examples, in this order.
const EXAMPLES: { icon: IconComponent; text: string }[] = [
  {
    icon: BankIcon,
    text: "Dear Customer, your SBI YONO account will be blocked today due to pending PAN/KYC update. Update immediately at http://sbi-kyc-verify.in or share the OTP sent to your mobile with our executive. -SBI",
  },
  {
    icon: PoliceIcon,
    text: "Caller: This is Inspector Rajesh Sharma from Mumbai Cyber Crime. A FedEx parcel in your name with 5 fake passports and drugs was seized. You are now under digital arrest. Stay on this video call and do not tell anyone, including your family. To clear your name, transfer ₹1,50,000 to the RBI verification account we send you.",
  },
  {
    icon: CardIcon,
    text: "Bro, my card got blocked and the flight fare goes up in 20 mins. Send me your card number, expiry and CVV, I'll book it and pay you back tonight. Can't talk right now, I'm at the airport counter. This is my new number.",
  },
  {
    icon: JobIcon,
    text: "Hi! I'm Priya from Amazon HR. We have a part-time job: earn ₹3,000–8,000 daily just by liking YouTube videos. Pay a small ₹500 registration fee on Telegram to unlock VIP tasks.",
  },
  {
    icon: PersonIcon,
    text: 'My dad messaged me on WhatsApp from his usual number, the one saved as Nanna: "Hi. Can you transfer 10k?"',
  },
  {
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
type Option = readonly [string, Localized];
const YES_NO: readonly Option[] = [
  ["yes", (t) => t.checker.yes],
  ["no", (t) => t.checker.no],
  ["", (t) => t.checker.notSure],
];

const QUESTIONS: { key: keyof Context; icon: IconComponent; options: readonly Option[] }[] = [
  {
    key: "sms_from",
    icon: SenderIcon,
    options: [
      ["sender_name", (t) => t.checker.smsSenderName],
      ["phone_number", (t) => t.checker.smsPhoneNumber],
      ["", (t) => t.checker.notSure],
    ],
  },
  { key: "saved_contact", icon: SavedContactIcon, options: YES_NO },
  { key: "relayed", icon: ForwardedIcon, options: YES_NO },
  { key: "confirmed_by_call", icon: CalledIcon, options: YES_NO },
];

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function inputKinds(text: string, file: File | null): InputKind[] {
  const kinds: InputKind[] = [];
  if (text.trim()) kinds.push("text");
  if (file) kinds.push(fileKind(file));
  return kinds;
}

// Under a chosen recording: how long the check will take, or a warning when it's long.
function MediaNote({ kind, seconds, t }: { kind: FileKind; seconds: number | null; t: Messages }) {
  if (kind !== "audio" && kind !== "video") return null;
  if (seconds === null) return <p className="hint media-note">{t.checker.mediaUnknown}</p>;
  if (seconds <= COMFORTABLE_SECONDS) return <p className="hint media-note">{t.checker.mediaTakes(checkSeconds(seconds))}</p>;
  return (
    <p className="media-note" data-long>
      {t.checker.mediaLong(checkSeconds(seconds) >= 90)}
    </p>
  );
}

export default function Checker() {
  const id = useId();
  const t = useT();
  const fileInput = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [context, setContext] = useState<Context>(NO_CONTEXT);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Localized | null>(null);
  const [result, setResult] = useState<{
    data: CheckResult;
    source: InputKind[];
  } | null>(null);
  // After a check the form folds into a one-line summary; "Edit" opens it again.
  const [editing, setEditing] = useState(false);
  const collapsed = result !== null && !editing;
  const cardRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const focusText = useRef(false);
  const canPaste = useSyncExternalStore(noSubscribe, clipboardReadable, () => false);
  const [pasteNote, setPasteNote] = useState<Localized | null>(null);
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
        setPasteNote(() => (t: Messages) => t.checker.pasteEmpty);
        return;
      }
      setText(clip.slice(0, MAX_TEXT_CHARS));
      setError(null);
      if (clip.length > MAX_TEXT_CHARS) {
        const chars = MAX_TEXT_CHARS.toLocaleString("en-IN");
        setPasteNote(() => (t: Messages) => t.checker.pasteTruncated(chars));
      }
    } catch {
      // Permission refused, or the browser only allows pasting from its own menu.
      setPasteNote(() => (t: Messages) => t.checker.pasteFailed);
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

  // State setters treat a function argument as an updater, so a Localized is wrapped once more.
  function showError(message: Localized) {
    setError(() => message);
  }

  async function pickFile(next: File | null) {
    const token = ++pickToken.current;
    setError(null);
    if (!next) return clearFile();
    if (next.size > MAX_FILE_MB * 1024 * 1024) {
      clearFile();
      showError(tooBigMessage(next, formatSize(next.size)));
      return;
    }
    const kind = fileKind(next);
    const seconds = kind === "audio" || kind === "video" ? await readDuration(next) : null;
    if (token !== pickToken.current) return; // another file was picked while this one was read
    if (seconds !== null && seconds > MAX_MEDIA_SECONDS) {
      clearFile();
      const duration = formatDuration(seconds);
      showError((t) => t.errors.tooLong(kind === "video", duration, MAX_MEDIA_SECONDS / 60));
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
      showError((t) => t.errors.empty);
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
    const source = inputKinds(text, file);
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
        const detail: unknown = data?.detail;
        showError(
          typeof detail === "string"
            ? (t) => serverMessage(detail, t)
            : slow
              ? (t) => t.errors.slow
              : (t) => t.errors.generic(res.status),
        );
        return;
      }
      // An older backend answers in a different shape (no `checks`); say so instead of crashing.
      if (!Array.isArray(data?.checks) || !Array.isArray(data?.reasons)) {
        showError((t) => t.errors.oldBackend);
        return;
      }
      setResult({ data: data as CheckResult, source });
      setEditing(false);
    } catch {
      showError((t) => t.errors.offline);
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
              <p className="checked-label">
                {t.checker.youChecked} · {describeInput(result.source, t)}
              </p>
              <p className="checked-snippet">{text.trim() || file?.name}</p>
            </div>
            <div className="checked-actions">
              <button type="button" className="button button-small button-ghost" onClick={editCheck}>
                {t.checker.edit}
              </button>
              <button type="button" className="button button-small" onClick={checkAnother}>
                {t.checker.checkAnother}
              </button>
            </div>
          </div>
        ) : (
          <form className="checker" onSubmit={onSubmit} aria-label={t.checker.formLabel} noValidate>
            <div className="examples" role="group" aria-labelledby={`${id}-examples`}>
              <span id={`${id}-examples`} className="examples-label">
                {t.checker.examplesLabel}
              </span>
              <div className="example-chips">
                {EXAMPLES.map(({ icon: ExampleIcon, text: sample }, i) => (
                  <button key={i} type="button" className="chip-button" onClick={() => loadExample(sample)}>
                    <ExampleIcon className="chip-icon" />
                    {t.checker.examples[i]}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <div className="field-head">
                <label htmlFor={`${id}-text`}>{t.checker.messageLabel}</label>
                {canPaste && (
                  <button type="button" className="paste-button" onClick={pasteFromClipboard}>
                    <PasteIcon className="button-icon" /> {t.checker.paste}
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
                placeholder={t.checker.placeholder}
              />
              {pasteNote && (
                <p className="paste-note" role="status">
                  {pasteNote(t)}
                </p>
              )}
              <p id={`${id}-text-hint`} className="hint">
                {t.checker.textHint}
              </p>
            </div>

            <div className="field">
              <span className="label" id={`${id}-file-label`}>
                {t.checker.fileLabel} <span className="optional">{t.checker.optional}</span>
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
                      {t.checker.remove}
                      <span className="visually-hidden"> {file.name}</span>
                    </button>
                  </div>
                  <MediaNote kind={fileKind(file)} seconds={mediaSeconds} t={t} />
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
                  <span className="dropzone-title">{t.checker.dropTitle}</span>
                  <span className="hint">
                    {t.checker.dropTap}
                    <span className="drop-only">{t.checker.dropOnly}</span> · {t.checker.dropLimit(MAX_FILE_MB)}
                  </span>
                  <span className="hint">{t.checker.dropTip}</span>
                </label>
              )}
              {!file && <p className="hint">{t.checker.noRecording}</p>}
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
                {t.checker.quickTitle} <span className="optional">{t.checker.optional}</span>
              </legend>
              <p className="hint">{t.checker.quickHint}</p>
              {QUESTIONS.map(({ key, icon: QuestionIcon, options }) => (
                <div key={key} className="quick-question" role="radiogroup" aria-labelledby={`${id}-${key}`}>
                  <span id={`${id}-${key}`} className="quick-question-text">
                    <QuestionIcon className="quick-question-icon" />
                    {t.checker.questions[key]}
                  </span>
                  <span className="pill-group">
                    {options.map(([value, label]) => (
                      <label key={value || "unsure"} className="pill" data-default={value === "" || undefined}>
                        <input
                          type="radio"
                          name={key}
                          value={value}
                          checked={context[key] === value}
                          onChange={() => setContext((c) => ({ ...c, [key]: value }))}
                        />
                        <span>{label(t)}</span>
                      </label>
                    ))}
                  </span>
                </div>
              ))}
            </fieldset>

            {error && (
              <p className="error" role="alert">
                <XCircleIcon className="error-icon" />
                <span>{error(t)}</span>
              </p>
            )}

            <div className="submit-row">
              <button type="submit" className="button" disabled={loading}>
                {loading ? (
                  <>
                    <progress className="loading-spinner" aria-label={t.checker.checkingLabel} />
                    {t.checker.checking}
                  </>
                ) : (
                  t.checker.submit
                )}
              </button>
              {loading ? (
                <div className="progress" role="status">
                  <div className="progress-track" aria-hidden="true">
                    {STAGES.slice(0, 4).map((s, i) => (
                      <span key={s.at} data-done={i <= stage || undefined} />
                    ))}
                  </div>
                  <p className="progress-text">{STAGES[stage].text(progress, t)}</p>
                </div>
              ) : (
                <p className="hint">{t.checker.freeNote}</p>
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
