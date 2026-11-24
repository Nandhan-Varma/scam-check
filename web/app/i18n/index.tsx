"use client";

import { Fragment, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { LanguageIcon } from "../icons";
import { en, type Messages } from "./en";
import { hi } from "./hi";
import { te } from "./te";

export type { Messages, RecordingLength } from "./en";

const MESSAGES = { en, hi, te } satisfies Record<string, Messages>;
export type Lang = keyof typeof MESSAGES;
const LANGS = Object.keys(MESSAGES) as Lang[];
const isLang = (value: unknown): value is Lang => typeof value === "string" && value in MESSAGES;

// The chosen language lives in localStorage, so it survives reloads without an account.
// With no saved choice, a phone set to Hindi or Telugu starts in that language.
const STORAGE_KEY = "scamcheck-lang";
const listeners = new Set<() => void>();
let memoryLang: Lang | null = null; // used only when localStorage is blocked

function readLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch {
    // Storage blocked (private mode, strict settings): fall through to the browser language.
  }
  for (const tag of navigator.languages ?? [navigator.language]) {
    const code = tag?.slice(0, 2).toLowerCase();
    if (isLang(code)) return code;
  }
  return "en";
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange); // another tab changed it
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Not saved, but still switch for this visit.
    memoryLang = lang;
  }
  listeners.forEach((fn) => fn());
}

/** The current language. The server render is always English; the saved choice applies on load. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, () => memoryLang ?? readLang(), () => "en");
}

/** The strings for the current language. */
export function useT(): Messages {
  return MESSAGES[useLang()];
}

/** Swaps {name} placeholders in a translated string for links or other elements. */
export function rich(text: string, slots: Record<string, ReactNode>): ReactNode[] {
  return text.split(/\{(\w+)\}/).map((part, i) => (i % 2 ? <Fragment key={i}>{slots[part] ?? part}</Fragment> : part));
}

/** A translated label for a key the backend sent, or undefined for a key this version doesn't know. */
export function lookup<T extends object>(table: T, key: string | undefined): T[keyof T] | undefined {
  return key !== undefined && Object.hasOwn(table, key) ? table[key as keyof T] : undefined;
}

type ServerKey = { [K in keyof Messages["server"]]: Messages["server"][K] extends string ? K : never }[keyof Messages["server"]];
const SERVER_KEYS = (Object.keys(en.server) as (keyof Messages["server"])[]).filter(
  (key): key is ServerKey => typeof en.server[key] === "string",
);

/** A backend error, recognised by its English text and shown in the chosen language. Unknown text is shown as is. */
export function serverMessage(detail: string, t: Messages): string {
  const key = SERVER_KEYS.find((k) => en.server[k] === detail);
  if (key) return t.server[key];
  const tooLarge = /^File is larger than (\d+) MB\.$/.exec(detail);
  if (tooLarge) return t.server.fileTooLarge(tooLarge[1]);
  const tooLong = /^Text is longer than ([\d,]+) characters\.$/.exec(detail);
  if (tooLong) return t.server.textTooLong(tooLong[1]);
  return detail;
}

const REASON_KEYS = Object.keys(en.result.reasons) as (keyof Messages["result"]["reasons"])[];

/** A note from backend/app/verdict.py, in the chosen language. Unknown text is shown as is. */
export function reasonText(reason: string, t: Messages): string {
  const key = REASON_KEYS.find((k) => en.result.reasons[k] === reason);
  return key ? t.result.reasons[key] : reason;
}

/** The language menu in the header. Also keeps <html lang> and the tab title in step. */
export function LanguagePicker({ id }: { id: string }) {
  const lang = useLang();
  const t = MESSAGES[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t.meta.title;
  }, [lang, t]);

  return (
    <div className="lang-picker">
      <label htmlFor={id} className="visually-hidden">
        {t.header.language}
      </label>
      <LanguageIcon className="lang-icon" />
      <select id={id} value={lang} onChange={(e) => isLang(e.target.value) && setLang(e.target.value)}>
        {LANGS.map((code) => (
          <option key={code} value={code} lang={code}>
            {MESSAGES[code].name}
          </option>
        ))}
      </select>
    </div>
  );
}
