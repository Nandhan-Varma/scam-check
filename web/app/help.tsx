"use client";

import { useId, useState } from "react";
import { rich, useT, type Messages } from "./i18n";
import { PhoneIcon } from "./icons";

type Happened = "paid" | "card" | "otp" | "app" | "id";
type StepKey = keyof Messages["help"]["steps"];

// Steps per situation, most urgent first, as keys into t.help.steps.
// Shared steps are de-duplicated by key; "1930" steps share the id "1930" so only the first shows.
type Step = { id: string; text: StepKey };
const call = (text: StepKey): Step => ({ id: "1930", text });
const step = (text: StepKey): Step => ({ id: text, text });

const STEPS: Record<Happened, Step[]> = {
  paid: [call("callPaid"), step("bankFraud"), step("keepProof")],
  card: [step("blockCard"), call("callCard"), step("dispute")],
  otp: [call("callOtp"), step("changePin"), step("bankFraud")],
  app: [step("offline"), step("uninstall"), step("changePinOther"), call("callApp")],
  id: [step("aadhaarLock"), step("creditWatch")],
};

const ALWAYS_LAST: Step[] = [step("complain"), step("tellFamily")];

const ORDER: Happened[] = ["paid", "card", "otp", "app", "id"];

// Links that the translated steps place with {1930}, {cybercrime}, and {uidai}.
const LINKS = {
  1930: <a href="tel:1930">1930</a>,
  cybercrime: (
    <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">
      cybercrime.gov.in
    </a>
  ),
  uidai: (
    <a href="https://myaadhaar.uidai.gov.in" target="_blank" rel="noreferrer">
      myaadhaar.uidai.gov.in
    </a>
  ),
};

function stepsFor(picked: Set<Happened>): Step[] {
  const seen = new Set<string>();
  const steps: Step[] = [];
  // 1930 goes first whenever money may be moving.
  const urgent = picked.has("paid") || picked.has("card") || picked.has("otp");
  for (const key of ORDER) {
    if (!picked.has(key)) continue;
    for (const s of STEPS[key]) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      steps.push(s);
    }
  }
  if (urgent) steps.sort((a, b) => Number(b.id === "1930") - Number(a.id === "1930"));
  return [...steps, ...ALWAYS_LAST];
}

export function HelpNow({ compact = false }: { compact?: boolean }) {
  const id = useId();
  const t = useT();
  const [picked, setPicked] = useState<Set<Happened>>(new Set());

  function toggle(key: Happened) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="help-now" data-compact={compact || undefined}>
      <fieldset>
        <legend id={`${id}-legend`}>{t.help.legend}</legend>
        <div className="help-options">
          {ORDER.map((key) => (
            <label key={key} className="help-option">
              <input type="checkbox" checked={picked.has(key)} onChange={() => toggle(key)} />
              <span>{t.help.options[key]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {picked.size > 0 && (
        <div className="help-steps" aria-live="polite">
          <p className="help-steps-title">{t.help.stepsTitle}</p>
          <ol className="steps">
            {stepsFor(picked).map((s) => (
              <li key={s.id}>{rich(t.help.steps[s.text], LINKS)}</li>
            ))}
          </ol>
          <a className="button button-small help-call" href="tel:1930">
            <PhoneIcon className="button-icon" /> {t.help.call}
          </a>
        </div>
      )}
    </div>
  );
}
