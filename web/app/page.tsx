"use client";

import Checker from "./checker";
import { HelpNow } from "./help";
import { LanguagePicker, useT } from "./i18n";
import {
  ArrowIcon,
  AudioIcon,
  CheckIcon,
  DocumentIcon,
  EyeIcon,
  FlagIcon,
  ImageIcon,
  LockIcon,
  MessageIcon,
  PhoneIcon,
  ShieldIcon,
  VideoIcon,
} from "./icons";

// Same order as t.inputs.items and t.trust.items.
const INPUT_ICONS = [MessageIcon, ImageIcon, AudioIcon, VideoIcon, DocumentIcon];
const TRUST_ICONS = [LockIcon, EyeIcon, PhoneIcon];

export default function Home() {
  const t = useT();
  return (
    <>
      <a className="skip-link" href="#check">
        {t.header.skip}
      </a>

      <div className="header-wrap">
        <header className="site-header">
          <a className="brand" href="#top">
            <ShieldIcon className="brand-mark" />
            ScamCheck
          </a>
          <nav aria-label={t.header.nav} className="site-nav">
            <ul>
              <li>
                <a href="#how">{t.header.how}</a>
              </li>
              <li>
                <a href="#signs">{t.header.signs}</a>
              </li>
              <li>
                <a href="#faq">{t.header.faq}</a>
              </li>
            </ul>
          </nav>
          <LanguagePicker id="language" />
          <a className="button button-small header-cta" href="#check">
            {t.header.checkNow}
          </a>
        </header>
      </div>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              {t.hero.eyebrow}
            </p>
            <h1 id="hero-title">
              {t.hero.title} <em>{t.hero.titleEm}</em>
            </h1>
            <p className="hero-lede">{t.hero.lede}</p>
            <div className="hero-actions">
              <a className="button" href="#check">
                {t.hero.cta}
                <ArrowIcon className="button-icon" />
              </a>
              <a className="button button-ghost" href="#how">
                {t.hero.secondary}
              </a>
            </div>
            <ul className="trust-row">
              {t.hero.trust.map((item) => (
                <li key={item}>
                  <CheckIcon /> {item}
                </li>
              ))}
            </ul>
          </div>

          <figure className="hero-demo">
            {/* The SMS itself stays in English: it shows what a real scam message looks like. */}
            <div className="demo-phone" lang="en">
              <p className="demo-sender">
                <span className="demo-avatar" aria-hidden="true">
                  VM
                </span>
                VM-SBIUPD
              </p>
              <p className="demo-bubble">
                Dear Customer, your SBI account will be <mark>blocked today</mark> due to pending KYC.{" "}
                <mark>Share the OTP</mark> sent to you or update at <mark>sbi-kyc-verify.in</mark>
              </p>
            </div>
            <div className="demo-verdict">
              <p className="demo-verdict-title">
                <span className="demo-verdict-icon" aria-hidden="true">
                  ✕
                </span>
                {t.result.verdicts.likely_scam.title}
              </p>
              <ul>
                {t.hero.demoFlags.map((flag) => (
                  <li key={flag}>
                    <FlagIcon /> {flag}
                  </li>
                ))}
              </ul>
            </div>
            <figcaption>{t.hero.demoCaption}</figcaption>
          </figure>
        </section>

        <section className="inputs" aria-label={t.inputs.label}>
          <ul className="input-grid">
            {t.inputs.items.map(({ title, body }, i) => {
              const InputIcon = INPUT_ICONS[i];
              return (
                <li key={i}>
                  <InputIcon className="input-icon" />
                  <span className="input-title">{title}</span>
                  <span className="input-body">{body}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section id="check" className="check-section" aria-labelledby="check-title">
          <div className="section-head">
            <p className="kicker">{t.check.kicker}</p>
            <h2 id="check-title">{t.check.title}</h2>
            <p>{t.check.lede}</p>
          </div>
          <Checker />
        </section>

        <section id="how" className="band band-dark" aria-labelledby="how-title">
          <div className="band-inner">
            <div className="section-head">
              <p className="kicker">{t.how.kicker}</p>
              <h2 id="how-title">{t.how.title}</h2>
            </div>
            <ol className="steps-grid">
              {t.how.steps.map((step, i) => (
                <li key={i}>
                  <span className="step-number" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="signs" className="section" aria-labelledby="signs-title">
          <div className="section-head">
            <p className="kicker">{t.signs.kicker}</p>
            <h2 id="signs-title">{t.signs.title}</h2>
            <p>{t.signs.lede}</p>
          </div>
          <ul className="flag-grid">
            {t.signs.groups.map((group, i) => (
              <li key={i}>
                <FlagIcon className="flag-icon" />
                <h3>{group.title}</h3>
                <ul className="sign-list">
                  {group.signs.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <div className="types">
            <h3>{t.signs.typesTitle}</h3>
            <ul className="chip-list">
              {t.signs.types.map((type) => (
                <li key={type}>{type}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section" aria-labelledby="trust-title">
          <div className="section-head">
            <p className="kicker">{t.trust.kicker}</p>
            <h2 id="trust-title">{t.trust.title}</h2>
          </div>
          <ul className="trust-grid">
            {t.trust.items.map((item, i) => {
              const TrustIcon = TRUST_ICONS[i];
              return (
                <li key={i}>
                  <TrustIcon className="trust-icon" />
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </li>
              );
            })}
          </ul>
        </section>

        <section id="faq" className="section faq" aria-labelledby="faq-title">
          <div className="section-head">
            <p className="kicker">{t.faq.kicker}</p>
            <h2 id="faq-title">{t.faq.title}</h2>
          </div>
          <div className="accordion">
            {t.faq.items.map((item, i) => (
              <details key={i}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="help" className="band band-dark helpline" aria-labelledby="help-title">
          <div className="band-inner helpline-inner">
            <div>
              <h2 id="help-title">{t.helpBand.title}</h2>
              <p>{t.helpBand.body}</p>
              <div className="helpline-actions">
                <a className="button button-light" href="tel:1930">
                  <PhoneIcon className="button-icon" /> {t.helpBand.call}
                </a>
                <a className="button button-outline-light" href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">
                  {t.helpBand.report}
                </a>
              </div>
            </div>
            <div className="help-card">
              <HelpNow />
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <p className="brand">
            <ShieldIcon className="brand-mark" />
            ScamCheck
          </p>
          <p>{t.footer.disclaimer}</p>
          <ul className="footer-links">
            <li>
              <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">
                cybercrime.gov.in
              </a>
            </li>
            <li>
              <a href="https://sancharsaathi.gov.in/sfc/" target="_blank" rel="noreferrer">
                {t.footer.chakshu}
              </a>
            </li>
            <li>
              <a href="https://aistudio.google.com/docs/decisions-api" target="_blank" rel="noreferrer">
                Gemini Decisions API
              </a>
            </li>
          </ul>
        </div>
      </footer>
    </>
  );
}
