"use client";

import { useId, useState, type ReactNode } from "react";
import { PhoneIcon } from "./icons";

type Happened = "paid" | "card" | "otp" | "app" | "id";

const OPTIONS: { key: Happened; label: string }[] = [
  { key: "paid", label: "I sent money (UPI, bank transfer, or card)" },
  { key: "card", label: "I shared my card number, expiry, or CVV" },
  { key: "otp", label: "I shared an OTP or PIN" },
  { key: "app", label: "I installed an app they asked for, or shared my screen" },
  { key: "id", label: "I shared Aadhaar, PAN, or photos of my ID" },
];

type Step = { id: string; text: ReactNode };

const CYBERCRIME = (
  <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">
    cybercrime.gov.in
  </a>
);

// Steps per situation, most urgent first. Shared steps are de-duplicated by id.
const STEPS: Record<Happened, Step[]> = {
  paid: [
    { id: "1930", text: <>Call <a href="tel:1930">1930</a> now. Reporting in the first hours gives the best chance of freezing the money.</> },
    { id: "bank-fraud", text: "Call your bank's helpline and report the payment as fraud. Ask them to raise a dispute." },
    { id: "keep-proof", text: "Keep the transaction ID (UTR), the sender's number or UPI ID, and screenshots of the chat." },
  ],
  card: [
    { id: "block-card", text: "Block the card now in your bank app, or call the number on the back of the card." },
    { id: "1930", text: <>Call <a href="tel:1930">1930</a> if any money has already gone.</> },
    { id: "dispute", text: "Check recent transactions and dispute any you don't recognise. Ask the bank for a new card." },
  ],
  otp: [
    { id: "1930", text: <>Call <a href="tel:1930">1930</a> now if the OTP was for a payment or a bank login.</> },
    { id: "change-pin", text: "Change your UPI PIN and net-banking password." },
    { id: "bank-fraud", text: "Call your bank's helpline and report the payment as fraud. Ask them to raise a dispute." },
  ],
  app: [
    { id: "offline", text: "Turn on airplane mode right away so they lose control of your phone." },
    { id: "uninstall", text: "Uninstall the app they asked for (AnyDesk, TeamViewer, QuickSupport, or any APK file)." },
    { id: "change-pin-other", text: "From another phone, change your UPI PIN and banking passwords." },
    { id: "1930", text: <>Call <a href="tel:1930">1930</a> if any money has gone.</> },
  ],
  id: [
    {
      id: "aadhaar-lock",
      text: (
        <>
          Lock your Aadhaar biometrics on the mAadhaar app or{" "}
          <a href="https://myaadhaar.uidai.gov.in" target="_blank" rel="noreferrer">
            myaadhaar.uidai.gov.in
          </a>
          .
        </>
      ),
    },
    { id: "credit-watch", text: "Watch for loans or SIM cards taken in your name over the next few months." },
  ],
};

const ALWAYS_LAST: Step[] = [
  { id: "complain", text: <>File a complaint at {CYBERCRIME} with your screenshots.</> },
  { id: "tell-family", text: "Tell your family and friends, so they aren't the next target." },
];

const ORDER: Happened[] = ["paid", "card", "otp", "app", "id"];

function stepsFor(picked: Set<Happened>): Step[] {
  const seen = new Set<string>();
  const steps: Step[] = [];
  // 1930 goes first whenever money may be moving.
  const urgent = picked.has("paid") || picked.has("card") || picked.has("otp");
  for (const key of ORDER) {
    if (!picked.has(key)) continue;
    for (const step of STEPS[key]) {
      if (seen.has(step.id)) continue;
      seen.add(step.id);
      steps.push(step);
    }
  }
  if (urgent) steps.sort((a, b) => Number(b.id === "1930") - Number(a.id === "1930"));
  return [...steps, ...ALWAYS_LAST];
}

export function HelpNow({ compact = false }: { compact?: boolean }) {
  const id = useId();
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
        <legend id={`${id}-legend`}>What happened? Tick everything that applies.</legend>
        <div className="help-options">
          {OPTIONS.map((o) => (
            <label key={o.key} className="help-option">
              <input type="checkbox" checked={picked.has(o.key)} onChange={() => toggle(o.key)} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {picked.size > 0 && (
        <div className="help-steps" aria-live="polite">
          <p className="help-steps-title">Do these now, in this order</p>
          <ol className="steps">
            {stepsFor(picked).map((s) => (
              <li key={s.id}>{s.text}</li>
            ))}
          </ol>
          <a className="button button-small help-call" href="tel:1930">
            <PhoneIcon className="button-icon" /> Call 1930
          </a>
        </div>
      )}
    </div>
  );
}
