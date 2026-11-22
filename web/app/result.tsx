"use client";

import { useState } from "react";
import { HelpNow } from "./help";
import {
  AlertIcon,
  CheckIcon,
  HelpIcon,
  PhoneIcon,
  ShareIcon,
  ShieldIcon,
  SIGN_ICONS,
  SignFallbackIcon,
  XCircleIcon,
} from "./icons";

export type Verdict = "likely_scam" | "suspicious" | "not_sure" | "no_red_flags" | "unclear";
type Group = "asks" | "pressure" | "identity";
type Claim = "bank" | "government" | "company" | "family_or_friend";

type Sign = {
  key: string;
  label: string;
  group: Group;
  probability: number;
  high_risk: boolean;
  present: boolean;
};

export type CheckResult = {
  verdict: Verdict;
  scam_probability: number;
  claims_to_be: { key: Claim; label: string } | null;
  groups: Record<Group, string>;
  signs: Sign[];
  checks: Sign[];
  scam_type: { key: string; label: string; probability: number } | null;
  reasons: string[];
  latency_ms: number;
  input_tokens: number | null;
};

const VERDICTS: Record<Verdict, { title: string; lede: string; level: string }> = {
  likely_scam: {
    title: "Likely a scam",
    lede: "Stop here and don't reply. Do the steps below first.",
    level: "High risk",
  },
  suspicious: {
    title: "Be careful",
    lede: "There are warning signs. Check before you do anything.",
    level: "Caution",
  },
  not_sure: {
    title: "Can't tell. Check this first",
    lede: "This could be genuine or a scam. One quick check will tell you.",
    level: "Unsure",
  },
  no_red_flags: {
    title: "Looks OK",
    lede: "Nothing worrying matched. Still, never share an OTP or PIN with anyone.",
    level: "Low risk",
  },
  unclear: {
    title: "Couldn't read this",
    lede: "We couldn't find a message to check. Try a clearer screenshot, or type out what it says.",
    level: "",
  },
};

// The one check that settles it, by who they claim to be.
const CHECK_FIRST: Record<Claim | "default", string> = {
  family_or_friend:
    "Call them on the number saved in your phone and ask if they really sent this. If the message came from a new number, don't reply to it.",
  bank: "Open your bank's own app, or call the number on the back of your card. Don't use any number or link from the message.",
  government:
    "Police, courts, and government offices never ask for money or OTPs on a call or chat. Call 1930 if you're unsure.",
  company: "Open the company's official app or type its website yourself. Don't use links or numbers from the message.",
  default: "Don't reply or pay yet. Show it to someone you trust, or call 1930 to ask.",
};

// A fact that undercuts each scam's story.
const FACTS: Record<string, { title: string; body: string }> = {
  digital_arrest: {
    title: "Not how Indian police work",
    body: "There is no such thing as a “digital arrest”. Police never arrest or question anyone over a video call.",
  },
  bank_kyc: {
    title: "Not how banks or tax offices contact you",
    body: "Banks and government offices never ask for OTPs, passwords, KYC updates, or PAN linking through SMS links or calls.",
  },
  courier_parcel: {
    title: "Not how couriers work",
    body: "Courier companies don't hand you over to the police by phone or ask for customs fees on WhatsApp.",
  },
  upi_refund: {
    title: "A UPI PIN only sends money",
    body: "You never need to enter your UPI PIN or scan a QR code to receive money. A PIN always sends money out.",
  },
  job_task: {
    title: "Real jobs don't charge you",
    body: "Real jobs never charge a registration fee or pay you to like videos.",
  },
  investment: {
    title: "No such thing as guaranteed returns",
    body: "Guaranteed high returns don't exist. Registered advisers don't run tips through Telegram groups.",
  },
  lottery_prize: {
    title: "You can't win what you didn't enter",
    body: "You can't win a lottery you didn't enter. A prize that needs a fee first is always fake.",
  },
  loan: {
    title: "Real lenders don't charge upfront",
    body: "Real lenders deduct charges from the loan. They never ask you to pay first.",
  },
  utility_bill: {
    title: "Not how power boards work",
    body: "Electricity boards don't cut power by text message or ask you to call a personal mobile number.",
  },
  fake_friend: {
    title: "A profile photo proves nothing",
    body: "Anyone can copy a friend's photo and name onto a new number.",
  },
  sextortion: {
    title: "Paying rarely ends it",
    body: "Don't pay or reply. Save the evidence and report it at cybercrime.gov.in.",
  },
  tech_support: {
    title: "Not how customer care works",
    body: "Real companies never ask you to pay with gift cards, install remote-access apps, or unlock an account over WhatsApp.",
  },
};

const pct = (p: number) => Math.round(p * 100);

function CheckRow({ check }: { check: Sign }) {
  const SignIcon = SIGN_ICONS[check.key] ?? SignFallbackIcon;
  return (
    <li data-state={check.present ? (check.high_risk ? "high" : "found") : "clear"}>
      <span className="check-label">
        <SignIcon className="check-icon" />
        <span>
          {check.label}
          {check.present && check.high_risk && <span className="tag">Serious</span>}
        </span>
      </span>
      <span className="check-p mono">{pct(check.probability)}%</span>
      <div className="bar" aria-hidden="true">
        <span style={{ width: `${Math.max(pct(check.probability), 1)}%` }} />
      </div>
    </li>
  );
}
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function firstStep(result: CheckResult) {
  return CHECK_FIRST[result.claims_to_be?.key ?? "default"];
}

function riskLevel(result: CheckResult, score: number) {
  if (result.verdict === "likely_scam" && score >= 90) return "Critical risk";
  return VERDICTS[result.verdict].level;
}

const SHARE_ADVICE: Record<Verdict, string> = {
  likely_scam: "Don't reply, pay, or share any OTP. If money has already gone, call 1930 now.",
  suspicious: "Don't pay or share any OTP until you've checked it another way.",
  not_sure: "Check with the sender on a number you already have before doing anything.",
  no_red_flags: "No warning signs found, but never share an OTP or PIN with anyone.",
  unclear: "",
};

// Shares the verdict only, never the message itself: it may hold names, numbers, or amounts.
async function shareResult(result: CheckResult) {
  const verdict = VERDICTS[result.verdict].title;
  const type = result.scam_type ? ` (${result.scam_type.label})` : "";
  const text = `ScamCheck says: ${verdict}${type}, risk ${pct(result.scam_probability)}/100. ${SHARE_ADVICE[result.verdict]}\nCheck a message yourself: ${window.location.origin}`;
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch (e) {
      // The person closed the share sheet; don't fall through to WhatsApp.
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}

// One plain sentence or two that sums up what the signs add up to. Who the sender
// claims to be is already in the line above the verdict, so it isn't repeated here.
function assessment(result: CheckResult) {
  const n = result.signs.length;
  const serious = result.signs.filter((s) => s.high_risk).length;
  switch (result.verdict) {
    case "likely_scam":
      return n
        ? `We found ${plural(n, "warning sign")}${serious ? `, ${serious} of them serious` : ""}. Together they match how this kind of scam works.`
        : "The message as a whole matches how scams work, even without one clear warning sign.";
    case "suspicious":
      return `We found ${plural(n, "warning sign")}. That isn't proof of a scam, but check before you act.`;
    case "not_sure":
      return "The message alone doesn't settle it. Who really sent it matters more than what it says.";
    default:
      return "None of our checks found a clear warning sign.";
  }
}

// "Couldn't read this" advice that fits what was uploaded.
function unclearHint(source: string) {
  if (source.includes("Video"))
    return "We couldn't see or hear a message in this video. If it's a screen recording of a chat, upload a screenshot instead, or type out what was said.";
  if (source.includes("Call recording"))
    return "We couldn't hear a conversation in this recording. Check it has sound, or type out what the caller said.";
  if (source.includes("PDF")) return "We couldn't find a message in this document. Try a screenshot of the part that worries you.";
  if (source === "Text") return "We couldn't find a message in what you pasted. Paste the full message you received.";
  return VERDICTS.unclear.lede;
}

export function Result({
  result,
  source,
  onConfirmedByCall,
}: {
  result: CheckResult;
  source: string;
  onConfirmedByCall?: () => void;
}) {
  const [showHelp, setShowHelp] = useState(false);
  const copy = VERDICTS[result.verdict];
  const lede = result.verdict === "unclear" ? unclearHint(source) : copy.lede;
  const judged = result.verdict !== "unclear";
  const warn = result.verdict === "likely_scam" || result.verdict === "suspicious";
  const score = pct(result.scam_probability);
  const fact = result.scam_type ? FACTS[result.scam_type.key] : undefined;
  const Icon = result.verdict === "no_red_flags" ? ShieldIcon : result.verdict === "unclear" ? HelpIcon : AlertIcon;
  const meta = [
    source,
    result.claims_to_be && `Says they're ${result.claims_to_be.label}`,
    result.scam_type?.label,
  ].filter(Boolean);
  const seconds = (result.latency_ms / 1000).toFixed(1);
  // Signs found get full bars; the rest fold away under "Other checks".
  const strong = result.checks.filter((c) => c.present);
  const weaker = result.checks.filter((c) => !c.present);
  // The OTP rule is already in the lede ("Looks OK") or the steps (scam / be careful).
  const showOtpRule = result.verdict === "not_sure";
  const hasSafety = Boolean(fact) || showOtpRule;

  return (
    <article className="result" data-verdict={result.verdict}>
      <header className="result-head">
        <div className="result-title">
          {meta.length > 0 && (
            <p className="result-meta">
              {meta.map((m) => (
                <span key={String(m)}>{m}</span>
              ))}
            </p>
          )}
          <h2>
            <Icon className="result-icon" />
            {copy.title}
          </h2>
          <p className="result-lede">{lede}</p>
        </div>
        {judged && (
          <div className="risk-box">
            <p className="risk-top">
              <span>Scam risk score</span>
              <span className="risk-level">{riskLevel(result, score)}</span>
            </p>
            <p className="risk-score">
              {score}
              <span className="mono">/100</span>
            </p>
            <div className="bar bar-risk" aria-hidden="true">
              <span style={{ width: `${Math.max(score, 2)}%` }} />
            </div>
          </div>
        )}
      </header>

      {result.verdict === "not_sure" && (
        <section className="check-first" aria-labelledby="check-first-title">
          <h3 id="check-first-title">Do this one check</h3>
          <p>{firstStep(result)}</p>
          {onConfirmedByCall && result.claims_to_be?.key === "family_or_friend" && (
            <button type="button" className="button button-small" onClick={onConfirmedByCall}>
              <PhoneIcon className="button-icon" /> I called them and they confirmed
            </button>
          )}
        </section>
      )}

      {warn && (
        <section aria-labelledby="todo-title">
          <h3 id="todo-title">What to do now</h3>
          <ol className="steps steps-lg">
            <li>{firstStep(result)}</li>
            <li>Don&apos;t share any OTP, PIN, CVV, or card number, not even with a friend.</li>
            <li>Don&apos;t pay, scan a QR code, or install any app they ask for.</li>
            <li>
              Report the number on{" "}
              <a href="https://sancharsaathi.gov.in/sfc/" target="_blank" rel="noreferrer">
                Chakshu (Sanchar Saathi)
              </a>
              .
            </li>
          </ol>

          <div className="already-paid">
            <div className="already-paid-row">
              <p className="already-paid-title">Already paid or shared something?</p>
              <div className="already-paid-actions">
                <a className="button button-small button-danger" href="tel:1930">
                  <PhoneIcon className="button-icon" /> Call 1930
                </a>
                <button
                  type="button"
                  className="button button-small button-ghost"
                  aria-expanded={showHelp}
                  onClick={() => setShowHelp((v) => !v)}
                >
                  {showHelp ? "Hide steps" : "Get step-by-step help"}
                </button>
              </div>
            </div>
            {showHelp && <HelpNow compact />}
          </div>
        </section>
      )}

      {judged && (
        <section aria-labelledby="assessment-title">
          <h3 id="assessment-title">Why we think this</h3>
          <p className="assessment">{assessment(result)}</p>
          {result.reasons.length > 0 && (
            <ul className="assessment-list">
              {result.reasons.map((r) => (
                <li key={r} data-note>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {judged && (strong.length > 0 || hasSafety) && (
        <div className="result-grid" data-single={!(strong.length > 0 && hasSafety) || undefined}>
          {strong.length > 0 && (
            <section aria-labelledby="patterns-title">
              <h3 id="patterns-title">Warning signs found</h3>
              <ul className="checks">
                {strong.map((c) => (
                  <CheckRow key={c.key} check={c} />
                ))}
              </ul>
            </section>
          )}

          {hasSafety && (
            <section aria-labelledby="safety-title">
              <h3 id="safety-title">Good to know</h3>
              <ul className="safety-list">
                {fact && (
                  <li data-state="fail">
                    <XCircleIcon className="safety-icon" />
                    <div>
                      <p className="safety-title">{fact.title}</p>
                      <p className="safety-body">{fact.body}</p>
                    </div>
                  </li>
                )}
                {showOtpRule && (
                  <li data-state="rule">
                    <CheckIcon className="safety-icon" />
                    <div>
                      <p className="safety-title">Never share an OTP, UPI PIN, or CVV</p>
                      <p className="safety-body">
                        No bank, police officer, company, or friend needs these. Anyone who asks is trying to take
                        money.
                      </p>
                    </div>
                  </li>
                )}
              </ul>
            </section>
          )}
        </div>
      )}

      {judged && weaker.length > 0 && (
        <details className="other-checks">
          <summary>
            <span className="other-checks-title">
              {strong.length > 0 ? "Other checks" : "What we checked"} ({weaker.length})
            </span>
            <span className="other-checks-hint">
              {strong.length > 0 ? "Not found in this message" : "None of these were found"}
            </span>
          </summary>
          <ul className="checks checks-compact">
            {weaker.map((c) => (
              <CheckRow key={c.key} check={c} />
            ))}
          </ul>
        </details>
      )}

      {judged && (
        <footer className="result-foot">
          <div className="result-foot-actions">
            <button type="button" className="button button-small button-ghost" onClick={() => shareResult(result)}>
              <ShareIcon className="button-icon" /> Share with family
            </button>
            {!warn && (
              <button type="button" className="link-button" onClick={() => setShowHelp((v) => !v)}>
                Already paid or shared something?
              </button>
            )}
          </div>
          {!warn && showHelp && <HelpNow compact />}
          <details className="tech-details">
            <summary>Technical details</summary>
            <p>
              Checked by <span className="mono">gemini-decision-1</span> in {seconds} s
              {result.input_tokens != null && ` · ${result.input_tokens.toLocaleString("en-IN")} tokens`}. Percentages
              show how sure the model is that each sign is present.
            </p>
          </details>
        </footer>
      )}
    </article>
  );
}
