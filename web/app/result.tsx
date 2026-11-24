"use client";

import { useState } from "react";
import { HelpNow } from "./help";
import { lookup, reasonText, rich, useT, type Messages } from "./i18n";
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

/** What was checked: "text" for pasted text, plus the kind of file, if any. */
export type InputKind = "text" | "image" | "audio" | "video" | "pdf";

export type Verdict = "likely_scam" | "suspicious" | "not_sure" | "no_red_flags" | "unclear";
type Group = "asks" | "pressure" | "identity";
type Claim = "bank" | "government" | "company" | "family_or_friend";

// Labels in the backend's answer are English. The screen shows the translation for each key
// (see i18n/en.ts), and falls back to the backend's label for a key this version doesn't know.
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

const pct = (p: number) => Math.round(p * 100);

function CheckRow({ check, t }: { check: Sign; t: Messages }) {
  const SignIcon = SIGN_ICONS[check.key] ?? SignFallbackIcon;
  return (
    <li data-state={check.present ? (check.high_risk ? "high" : "found") : "clear"}>
      <span className="check-label">
        <SignIcon className="check-icon" />
        <span>
          {lookup(t.result.signLabels, check.key) ?? check.label}
          {check.present && check.high_risk && <span className="tag">{t.result.serious}</span>}
        </span>
      </span>
      <span className="check-p mono">{pct(check.probability)}%</span>
      <div className="bar" aria-hidden="true">
        <span style={{ width: `${Math.max(pct(check.probability), 1)}%` }} />
      </div>
    </li>
  );
}

// The one check that settles it, by who they claim to be.
function firstStep(result: CheckResult, t: Messages) {
  return lookup(t.result.checkFirst, result.claims_to_be?.key) ?? t.result.checkFirst.default;
}

function riskLevel(result: CheckResult, score: number, t: Messages) {
  if (result.verdict === "likely_scam" && score >= 90) return t.result.criticalRisk;
  return t.result.verdicts[result.verdict].level;
}

function scamTypeLabel(result: CheckResult, t: Messages) {
  if (!result.scam_type) return null;
  return lookup(t.result.scamTypes, result.scam_type.key) ?? result.scam_type.label;
}

function claimLabel(result: CheckResult, t: Messages) {
  if (!result.claims_to_be) return null;
  return lookup(t.result.claims, result.claims_to_be.key) ?? `Says they're ${result.claims_to_be.label}`;
}

// Shares the verdict only, never the message itself: it may hold names, numbers, or amounts.
async function shareResult(result: CheckResult, t: Messages) {
  const text = t.result.shareText(
    t.result.verdicts[result.verdict].title,
    scamTypeLabel(result, t),
    pct(result.scam_probability),
    t.result.shareAdvice[result.verdict],
    window.location.origin,
  );
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
function assessment(result: CheckResult, t: Messages) {
  const n = result.signs.length;
  const serious = result.signs.filter((s) => s.high_risk).length;
  switch (result.verdict) {
    case "likely_scam":
      return t.result.assessment.likely(n, serious);
    case "suspicious":
      return t.result.assessment.suspicious(n);
    case "not_sure":
      return t.result.assessment.notSure;
    default:
      return t.result.assessment.none;
  }
}

// "Couldn't read this" advice that fits what was uploaded.
function unclearHint(source: InputKind[], t: Messages) {
  if (source.includes("video")) return t.result.unclear.video;
  if (source.includes("audio")) return t.result.unclear.audio;
  if (source.includes("pdf")) return t.result.unclear.pdf;
  if (source.length === 1 && source[0] === "text") return t.result.unclear.text;
  return t.result.verdicts.unclear.lede;
}

/** "Text + Screenshot", in the chosen language. */
export function describeInput(source: InputKind[], t: Messages) {
  return source.map((kind) => t.checker.kinds[kind]).join(" + ");
}

export function Result({
  result,
  source,
  onConfirmedByCall,
}: {
  result: CheckResult;
  source: InputKind[];
  onConfirmedByCall?: () => void;
}) {
  const t = useT();
  const [showHelp, setShowHelp] = useState(false);
  const copy = t.result.verdicts[result.verdict];
  const lede = result.verdict === "unclear" ? unclearHint(source, t) : copy.lede;
  const judged = result.verdict !== "unclear";
  const warn = result.verdict === "likely_scam" || result.verdict === "suspicious";
  const score = pct(result.scam_probability);
  const fact = lookup(t.result.facts, result.scam_type?.key);
  const Icon = result.verdict === "no_red_flags" ? ShieldIcon : result.verdict === "unclear" ? HelpIcon : AlertIcon;
  const meta = [describeInput(source, t), claimLabel(result, t), scamTypeLabel(result, t)].filter(Boolean);
  const seconds = (result.latency_ms / 1000).toFixed(1);
  // Signs found get full bars; the rest fold away under "Other checks".
  const strong = result.checks.filter((c) => c.present);
  const weaker = result.checks.filter((c) => !c.present);
  // The OTP rule is already in the lede ("Looks OK") or the steps (scam / be careful).
  const showOtpRule = result.verdict === "not_sure";
  const hasSafety = Boolean(fact) || showOtpRule;
  const chakshu = (
    <a href="https://sancharsaathi.gov.in/sfc/" target="_blank" rel="noreferrer">
      {t.result.chakshu}
    </a>
  );

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
              <span>{t.result.riskScore}</span>
              <span className="risk-level">{riskLevel(result, score, t)}</span>
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
          <h3 id="check-first-title">{t.result.doThisCheck}</h3>
          <p>{firstStep(result, t)}</p>
          {onConfirmedByCall && result.claims_to_be?.key === "family_or_friend" && (
            <button type="button" className="button button-small" onClick={onConfirmedByCall}>
              <PhoneIcon className="button-icon" /> {t.result.calledConfirmed}
            </button>
          )}
        </section>
      )}

      {warn && (
        <section aria-labelledby="todo-title">
          <h3 id="todo-title">{t.result.whatToDo}</h3>
          <ol className="steps steps-lg">
            <li>{firstStep(result, t)}</li>
            {t.result.steps.map((step, i) => (
              <li key={i}>{rich(step, { chakshu })}</li>
            ))}
          </ol>

          <div className="already-paid">
            <div className="already-paid-row">
              <p className="already-paid-title">{t.result.alreadyPaid}</p>
              <div className="already-paid-actions">
                <a className="button button-small button-danger" href="tel:1930">
                  <PhoneIcon className="button-icon" /> {t.result.call1930}
                </a>
                <button
                  type="button"
                  className="button button-small button-ghost"
                  aria-expanded={showHelp}
                  onClick={() => setShowHelp((v) => !v)}
                >
                  {showHelp ? t.result.hideSteps : t.result.getHelp}
                </button>
              </div>
            </div>
            {showHelp && <HelpNow compact />}
          </div>
        </section>
      )}

      {judged && (
        <section aria-labelledby="assessment-title">
          <h3 id="assessment-title">{t.result.why}</h3>
          <p className="assessment">{assessment(result, t)}</p>
          {result.reasons.length > 0 && (
            <ul className="assessment-list">
              {result.reasons.map((r) => (
                <li key={r} data-note>
                  <span>{reasonText(r, t)}</span>
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
              <h3 id="patterns-title">{t.result.signsFound}</h3>
              <ul className="checks">
                {strong.map((c) => (
                  <CheckRow key={c.key} check={c} t={t} />
                ))}
              </ul>
            </section>
          )}

          {hasSafety && (
            <section aria-labelledby="safety-title">
              <h3 id="safety-title">{t.result.goodToKnow}</h3>
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
                      <p className="safety-title">{t.result.otpRuleTitle}</p>
                      <p className="safety-body">{t.result.otpRuleBody}</p>
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
              {strong.length > 0 ? t.result.otherChecks(weaker.length) : t.result.whatWeChecked(weaker.length)}
            </span>
            <span className="other-checks-hint">
              {strong.length > 0 ? t.result.notFoundHint : t.result.noneFoundHint}
            </span>
          </summary>
          <ul className="checks checks-compact">
            {weaker.map((c) => (
              <CheckRow key={c.key} check={c} t={t} />
            ))}
          </ul>
        </details>
      )}

      {judged && (
        <footer className="result-foot">
          <div className="result-foot-actions">
            <button type="button" className="button button-small button-ghost" onClick={() => shareResult(result, t)}>
              <ShareIcon className="button-icon" /> {t.result.share}
            </button>
            {!warn && (
              <button type="button" className="link-button" onClick={() => setShowHelp((v) => !v)}>
                {t.result.alreadyPaid}
              </button>
            )}
          </div>
          {!warn && showHelp && <HelpNow compact />}
          <details className="tech-details">
            <summary>{t.result.techDetails}</summary>
            <p>
              {rich(
                t.result.techBody(
                  seconds,
                  result.input_tokens != null ? result.input_tokens.toLocaleString("en-IN") : null,
                ),
                { model: <span className="mono">gemini-decision-1</span> },
              )}
            </p>
          </details>
        </footer>
      )}
    </article>
  );
}
