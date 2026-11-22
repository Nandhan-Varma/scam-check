import Checker from "./checker";
import { HelpNow } from "./help";
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

const INPUTS = [
  { icon: MessageIcon, title: "Text", body: "SMS, WhatsApp, Telegram, or email" },
  { icon: ImageIcon, title: "Screenshot", body: "Chats, payment requests, fake notices" },
  { icon: AudioIcon, title: "Call recording", body: "Calls and WhatsApp voice notes" },
  { icon: VideoIcon, title: "Video", body: "Video calls and screen recordings" },
  { icon: DocumentIcon, title: "PDF", body: "Letters, notices, offer letters" },
];

const STEPS = [
  {
    title: "Share what you received",
    body: "Paste the message, describe the call in your own words, or add a screenshot. Answer three quick questions if you can.",
  },
  {
    title: "13 focused checks at once",
    body: "Gemini Decision 1 asks what they want from you, how they push you, and who they say they are, all in one pass.",
  },
  {
    title: "Know what to do next",
    body: "A clear answer, the signs behind it, and the exact next step. When it can't tell, it tells you the one check that settles it.",
  },
];

const SIGN_GROUPS = [
  {
    title: "What they want from you",
    signs: [
      "An OTP, PIN, password, or card details",
      "Money, a payment, or a QR code to scan",
      "To install an app or share your screen",
      "Which cards you have, or your limits",
      "To open a link or download a file",
    ],
  },
  {
    title: "How they push you",
    signs: [
      "An emergency, a deadline, or a threat",
      "Keep it secret, or stay on the call",
      "A prize, refund, or job that's too good to be true",
    ],
  },
  {
    title: "Who they say they are",
    signs: [
      "Your bank, police, or a company",
      "A friend or relative on a new number",
      "Someone vouched for by another person",
    ],
  },
];

const SCAM_TYPES = [
  "Digital arrest",
  "Fake bank, KYC, or PAN message",
  "Courier or parcel",
  "UPI refund",
  "Job or task",
  "Investment or trading",
  "Lottery or prize",
  "Loan",
  "Electricity bill",
  "Fake friend or relative",
  "Sextortion",
  "Fake customer care or tech support",
];

const FAQ = [
  {
    q: "Is ScamCheck free?",
    a: "Yes. There is no sign-up, no app to install, and nothing to pay.",
  },
  {
    q: "Is the result always right?",
    a: "No. It is an AI second opinion, not a guarantee. “Looks OK” means none of the serious checks matched; it does not guarantee the message is safe. If anything asks for money or codes, check through the official app or a number you already have.",
  },
  {
    q: "Why does it sometimes say “Can't tell”?",
    a: "Some messages look the same whether they're real or fake, like a parent asking “Can you transfer 10k?”. Instead of guessing, ScamCheck tells you the one check that settles it, usually calling them on a number you already have saved.",
  },
  {
    q: "Why does it ask whether the number is saved?",
    a: "A screenshot can't show whether a number is in your contacts or whether a request came through someone else. Those facts change the answer a lot, especially for fake-friend scams that use a real friend's photo. The questions are optional.",
  },
  {
    q: "What happens to what I upload?",
    a: "ScamCheck has no database and does not save your text or files. They are sent to Google's Gemini API to be checked. Under Google's paid API terms, Google does not use them to improve its products. Still remove OTPs, card numbers, and account numbers before pasting.",
  },
  {
    q: "Which languages work?",
    a: "English, Hindi, Telugu, Tamil, and other Indian languages, including when they're typed in English letters (Hinglish, Tenglish). Accuracy can vary by language and audio quality.",
  },
  {
    q: "Can it tell if a voice or video is a deepfake?",
    a: "No. ScamCheck judges what is being said and asked for, such as urgency, payment requests, or impersonation. It does not detect AI-generated voices or faces.",
  },
  {
    q: "I already paid or shared details. What now?",
    a: "Call the national cybercrime helpline 1930 immediately; acting within the first hours improves the chance of freezing the money. Then file a complaint at cybercrime.gov.in and inform your bank.",
  },
];

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#check">
        Skip to the checker
      </a>

      <div className="header-wrap">
        <header className="site-header">
          <a className="brand" href="#top">
            <ShieldIcon className="brand-mark" />
            ScamCheck
          </a>
          <nav aria-label="Primary" className="site-nav">
            <ul>
              <li>
                <a href="#how">How it works</a>
              </li>
              <li>
                <a href="#signs">What it checks</a>
              </li>
              <li>
                <a href="#faq">FAQ</a>
              </li>
            </ul>
          </nav>
          <a className="button button-small" href="#check">
            Check now
          </a>
        </header>
      </div>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              Free · Built with the Gemini Decisions API
            </p>
            <h1 id="hero-title">
              Got a suspicious call or message? <em>Check it before you act.</em>
            </h1>
            <p className="hero-lede">
              ScamCheck spots the warning signs of digital fraud in texts, screenshots, call recordings, videos, and
              PDFs, and tells you what to do next.
            </p>
            <div className="hero-actions">
              <a className="button" href="#check">
                Check a message
                <ArrowIcon className="button-icon" />
              </a>
              <a className="button button-ghost" href="#how">
                See how it works
              </a>
            </div>
            <ul className="trust-row">
              <li>
                <CheckIcon /> No sign-up
              </li>
              <li>
                <CheckIcon /> Nothing stored
              </li>
              <li>
                <CheckIcon /> Results in seconds
              </li>
            </ul>
          </div>

          <figure className="hero-demo">
            <div className="demo-phone">
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
                Likely a scam
              </p>
              <ul>
                <li>
                  <FlagIcon /> Asks for an OTP
                </li>
                <li>
                  <FlagIcon /> Threat: account blocked today
                </li>
                <li>
                  <FlagIcon /> Unofficial link
                </li>
              </ul>
            </div>
            <figcaption>Illustration of a typical result</figcaption>
          </figure>
        </section>

        <section className="inputs" aria-label="What you can check">
          <ul className="input-grid">
            {INPUTS.map(({ icon: InputIcon, title, body }) => (
              <li key={title}>
                <InputIcon className="input-icon" />
                <span className="input-title">{title}</span>
                <span className="input-body">{body}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="check" className="check-section" aria-labelledby="check-title">
          <div className="section-head">
            <p className="kicker">Try it</p>
            <h2 id="check-title">Check a message, call, or document</h2>
            <p>Paste text, add a file, or both. Not sure where to start? Try one of the examples.</p>
          </div>
          <Checker />
        </section>

        <section id="how" className="band band-dark" aria-labelledby="how-title">
          <div className="band-inner">
            <div className="section-head">
              <p className="kicker">How it works</p>
              <h2 id="how-title">A second opinion in three steps</h2>
            </div>
            <ol className="steps-grid">
              {STEPS.map((step, i) => (
                <li key={step.title}>
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
            <p className="kicker">What it checks</p>
            <h2 id="signs-title">The warning signs scammers can&apos;t hide</h2>
            <p>Every check looks for these signs, in three simple groups, and names the type of scam when it recognises one.</p>
          </div>
          <ul className="flag-grid">
            {SIGN_GROUPS.map((group) => (
              <li key={group.title}>
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
            <h3>Scam types it recognises</h3>
            <ul className="chip-list">
              {SCAM_TYPES.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section" aria-labelledby="trust-title">
          <div className="section-head">
            <p className="kicker">Built to be trusted</p>
            <h2 id="trust-title">Honest about what it does</h2>
          </div>
          <ul className="trust-grid">
            <li>
              <LockIcon className="trust-icon" />
              <h3>Nothing saved</h3>
              <p>No account, no history, no database. ScamCheck doesn&apos;t keep what you check.</p>
            </li>
            <li>
              <EyeIcon className="trust-icon" />
              <h3>Honest when unsure</h3>
              <p>Every answer shows the signs behind it. When it can&apos;t tell, it says so and tells you how to check.</p>
            </li>
            <li>
              <PhoneIcon className="trust-icon" />
              <h3>Points to official help</h3>
              <p>Next steps link only to government services: the 1930 helpline, cybercrime.gov.in, and Chakshu.</p>
            </li>
          </ul>
        </section>

        <section id="faq" className="section faq" aria-labelledby="faq-title">
          <div className="section-head">
            <p className="kicker">FAQ</p>
            <h2 id="faq-title">Questions people ask</h2>
          </div>
          <div className="accordion">
            {FAQ.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="help" className="band band-dark helpline" aria-labelledby="help-title">
          <div className="band-inner helpline-inner">
            <div>
              <h2 id="help-title">Already paid or shared something?</h2>
              <p>Don&apos;t panic. Tick what happened and you&apos;ll get the steps, in order. Every hour matters.</p>
              <div className="helpline-actions">
                <a className="button button-light" href="tel:1930">
                  <PhoneIcon className="button-icon" /> Call 1930
                </a>
                <a className="button button-outline-light" href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">
                  Report at cybercrime.gov.in
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
          <p>
            An AI second opinion, not a guarantee. Content you submit is sent to Google&apos;s Gemini API for analysis
            and is not stored by ScamCheck. Not affiliated with Google or the Government of India.
          </p>
          <ul className="footer-links">
            <li>
              <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">
                cybercrime.gov.in
              </a>
            </li>
            <li>
              <a href="https://sancharsaathi.gov.in/sfc/" target="_blank" rel="noreferrer">
                Chakshu (Sanchar Saathi)
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
