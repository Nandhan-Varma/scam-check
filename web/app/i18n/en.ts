// English is the source language. `Messages` is derived from this object, so Hindi and Telugu
// must have exactly the same keys and function signatures: a missing or extra string fails the build.
//
// Placeholders like {1930} or {chakshu} in a string are swapped for links by `rich()` in ./index.tsx.
//
// `server.*` and `result.reasons.*` must match the backend's English text word for word
// (backend/app/main.py and backend/app/verdict.py). The frontend uses them to recognise a
// backend message and show it in the chosen language; unknown text is shown as it arrives.

/** Length of a chosen recording, for the progress text. Null when the browser can't tell. */
export type RecordingLength = { short: boolean; minutes: number } | null;

const lengthWord = (len: NonNullable<RecordingLength>) => (len.short ? "short" : `${len.minutes}-minute`);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const TRIM_TIP = "trim it to the part where they ask for money, an OTP, or an app";

export const en = {
  name: "English",
  meta: {
    title: "ScamCheck: is this message or call a scam?",
  },

  header: {
    skip: "Skip to the checker",
    nav: "Primary",
    how: "How it works",
    signs: "What it checks",
    faq: "FAQ",
    checkNow: "Check now",
    language: "Language",
  },

  hero: {
    eyebrow: "Free · Built with the Gemini Decisions API",
    title: "Got a suspicious call or message?",
    titleEm: "Check it before you act.",
    lede: "ScamCheck spots the warning signs of digital fraud in texts, screenshots, call recordings, videos, and PDFs, and tells you what to do next.",
    cta: "Check a message",
    secondary: "See how it works",
    trust: ["No sign-up", "Nothing stored", "Results in seconds"],
    demoFlags: ["Asks for an OTP", "Threat: account blocked today", "Unofficial link"],
    demoCaption: "Illustration of a typical result",
  },

  // Same order as the icons in page.tsx: text, screenshot, recording, video, PDF.
  inputs: {
    label: "What you can check",
    items: [
      { title: "Text", body: "SMS, WhatsApp, Telegram, or email" },
      { title: "Screenshot", body: "Chats, payment requests, fake notices" },
      { title: "Call recording", body: "Calls and WhatsApp voice notes" },
      { title: "Video", body: "Video calls and screen recordings" },
      { title: "PDF", body: "Letters, notices, offer letters" },
    ],
  },

  check: {
    kicker: "Try it",
    title: "Check a message, call, or document",
    lede: "Paste text, add a file, or both. Not sure where to start? Try one of the examples.",
  },

  how: {
    kicker: "How it works",
    title: "A second opinion in three steps",
    steps: [
      {
        title: "Share what you received",
        body: "Paste the message, describe the call in your own words, or add a screenshot. Answer four quick questions if you can.",
      },
      {
        title: "13 focused checks at once",
        body: "Gemini Decision 1 asks what they want from you, how they push you, and who they say they are, all in one pass.",
      },
      {
        title: "Know what to do next",
        body: "A clear answer, the signs behind it, and the exact next step. When it can't tell, it tells you the one check that settles it.",
      },
    ],
  },

  signs: {
    kicker: "What it checks",
    title: "The warning signs scammers can't hide",
    lede: "Every check looks for these signs, in three simple groups, and names the type of scam when it recognises one.",
    groups: [
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
        signs: ["Your bank, police, or a company", "A friend or relative on a new number", "Someone vouched for by another person"],
      },
    ],
    typesTitle: "Scam types it recognises",
    types: [
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
    ],
  },

  trust: {
    kicker: "Built to be trusted",
    title: "Honest about what it does",
    items: [
      { title: "Nothing saved", body: "No account, no history, no database. ScamCheck doesn't keep what you check." },
      {
        title: "Honest when unsure",
        body: "Every answer shows the signs behind it. When it can't tell, it says so and tells you how to check.",
      },
      {
        title: "Points to official help",
        body: "Next steps link only to government services: the 1930 helpline, cybercrime.gov.in, and Chakshu.",
      },
    ],
  },

  faq: {
    kicker: "FAQ",
    title: "Questions people ask",
    items: [
      { q: "Is ScamCheck free?", a: "Yes. There is no sign-up, no app to install, and nothing to pay." },
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
    ],
  },

  helpBand: {
    title: "Already paid or shared something?",
    body: "Don't panic. Tick what happened and you'll get the steps, in order. Every hour matters.",
    call: "Call 1930",
    report: "Report at cybercrime.gov.in",
  },

  footer: {
    disclaimer:
      "An AI second opinion, not a guarantee. Content you submit is sent to Google's Gemini API for analysis and is not stored by ScamCheck. An independent project, not affiliated with or endorsed by Google, the Government of India, RBI, the police, or any bank.",
    chakshu: "Chakshu (Sanchar Saathi)",
  },

  checker: {
    formLabel: "Scam check",
    examplesLabel: "Try an example",
    // Same order as EXAMPLES in checker.tsx. The example messages themselves stay as they were received.
    examples: [
      "Bank KYC SMS",
      "Digital arrest call",
      "Friend needs your card",
      "Part-time job offer",
      "Dad asks for money",
      "Real bank OTP",
    ],
    messageLabel: "Message",
    paste: "Paste",
    placeholder: "Paste the SMS or WhatsApp message here, or describe the call in your own words",
    textHint: "Any language is fine. Remove OTPs, card numbers, and account numbers first.",
    pasteEmpty: "Nothing to paste. Copy the message first, then tap Paste.",
    pasteTruncated: (chars: string) => `Only the first ${chars} characters were pasted.`,
    pasteFailed: "Couldn't open your clipboard. Long-press the message box and choose Paste.",
    fileLabel: "Screenshot or recording",
    optional: "(optional)",
    remove: "Remove",
    dropTitle: "Add a screenshot, voice note, video, or PDF",
    dropTap: "Tap to choose",
    dropOnly: ", or drop it here",
    dropLimit: (mb: number) => `up to ${mb} MB`,
    dropTip: "Call recordings work best under 5 minutes.",
    noRecording:
      "No recording? Type what the caller said in the message box: who they said they were, and what they asked you to do.",
    quickTitle: "Quick questions",
    quickHint: "These help most when the message says it's from your bank, family, or a friend.",
    yes: "Yes",
    no: "No",
    notSure: "Not sure",
    questions: {
      sms_from: "If it's an SMS, who sent it?",
      saved_contact: "Is this number saved in your phone?",
      relayed: "Did someone else pass this request on to you?",
      confirmed_by_call: "Have you called them on a number you already had, to check?",
    },
    smsSenderName: "A name like AX-HDFCBK",
    smsPhoneNumber: "A phone number",
    submit: "Check for scam",
    checking: "Checking…",
    checkingLabel: "Checking",
    freeNote: "Free. Checked by Google's Gemini AI. ScamCheck doesn't save what you send.",
    youChecked: "You checked",
    edit: "Edit",
    checkAnother: "Check another",
    kinds: { text: "Text", image: "Screenshot", audio: "Call recording", video: "Video", pdf: "PDF" },
    mediaUnknown: "Recordings take up to a minute to check.",
    mediaTakes: (seconds: number) => `Takes about ${seconds} seconds to check.`,
    mediaLong: (couple: boolean) =>
      `This is a long recording, so the check may take ${couple ? "a couple of minutes" : "over a minute"}. For a faster answer, ${TRIM_TIP}.`,
  },

  // What the person sees while a check runs.
  stages: {
    sending: "Sending your message…",
    uploading: "Uploading your file…",
    listening: (len: RecordingLength) => `Listening to the ${len ? `${lengthWord(len)} ` : ""}recording…`,
    watching: "Watching the video…",
    reading: "Reading what it says…",
    signs: "Checking for warning signs…",
    verdict: "Working out the verdict…",
    nearly: "Still working, nearly there…",
    recordingSlow: (len: RecordingLength, seconds: number) =>
      len
        ? `Still working. A ${lengthWord(len)} recording takes about ${seconds} seconds.`
        : "Still working. Recordings can take up to a minute.",
    almost: "Almost done. Thanks for waiting.",
  },

  errors: {
    tooBigAudio: (size: string, mb: number) =>
      `That recording is ${size}. The limit is ${mb} MB. Try a shorter clip (${TRIM_TIP}), or type what the caller said.`,
    tooBigVideo: (size: string, mb: number) =>
      `That video is ${size}. The limit is ${mb} MB, so most videos are too big. Upload a screenshot instead, or type what was said.`,
    tooBigFile: (size: string, mb: number) =>
      `That file is ${size}. The limit is ${mb} MB. Try a screenshot of just the part that worries you.`,
    tooLong: (video: boolean, duration: string, minutes: number) =>
      `That ${video ? "video" : "recording"} is ${duration} long. The limit is ${minutes} minutes: ${TRIM_TIP}, or type what was said.`,
    empty: "Paste a message, describe what happened, or add a screenshot.",
    slow: "This took too long to check. Try a shorter clip (under 5 minutes works best), or try again.",
    generic: (status: number) => `Something went wrong (${status}). Try again.`,
    oldBackend: "The ScamCheck server is running an older version. Restart the backend, then check again.",
    offline: "Couldn't reach ScamCheck. Check your connection and try again.",
  },

  // Errors from the backend, recognised by their English text (backend/app/main.py).
  server: {
    noKey: "The server has no GEMINI_API_KEY configured.",
    unsupported: "Unsupported file type. Upload a screenshot, audio, video, or PDF.",
    emptyFile: "The uploaded file is empty.",
    nothing: "Paste a message or upload a file to check.",
    rateLimited: "Too many checks right now. Try again in a little while.",
    damaged:
      "We couldn't open this file. It may be damaged, or saved in a different format than its name says (common with online converters). Try the original recording or screenshot.",
    safety: "Gemini's safety filters blocked this content, so it could not be checked.",
    busy: "Too many checks right now. Try again in a minute.",
    serviceProblem: "The checking service had a problem. Try again in a minute.",
    unreachable: "Couldn't reach the Gemini API. Try again.",
    fileTooLarge: (mb: string) => `File is larger than ${mb} MB.`,
    textTooLong: (chars: string) => `Text is longer than ${chars} characters.`,
  },

  result: {
    verdicts: {
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
    },
    criticalRisk: "Critical risk",
    // "Couldn't read this" advice that fits what was uploaded.
    unclear: {
      video:
        "We couldn't see or hear a message in this video. If it's a screen recording of a chat, upload a screenshot instead, or type out what was said.",
      audio: "We couldn't hear a conversation in this recording. Check it has sound, or type out what the caller said.",
      pdf: "We couldn't find a message in this document. Try a screenshot of the part that worries you.",
      text: "We couldn't find a message in what you pasted. Paste the full message you received.",
    },
    // The one check that settles it, by who they claim to be.
    checkFirst: {
      family_or_friend:
        "Call them on the number saved in your phone and ask if they really sent this. If the message came from a new number, don't reply to it.",
      bank: "Open your bank's own app, or call the number on the back of your card. Don't use any number or link from the message.",
      government:
        "Police, courts, and government offices never ask for money or OTPs on a call or chat. Call 1930 if you're unsure.",
      company: "Open the company's official app or type its website yourself. Don't use links or numbers from the message.",
      default: "Don't reply or pay yet. Show it to someone you trust, or call 1930 to ask.",
    },
    // A fact that undercuts each scam's story.
    facts: {
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
        body: "Real couriers don't ask for fees or card details through SMS links or WhatsApp, and never hand you over to the police by phone.",
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
    },
    // Labels for what the backend returns, by key (backend/app/questions.py).
    signLabels: {
      ask_secret: "Asks for an OTP, PIN, password, or card details",
      ask_money: "Asks you to send money",
      ask_install: "Asks you to install an app or share your screen",
      ask_card_info: "Asks about your cards or payment limits",
      ask_click: "Asks you to open a link or download a file",
      rush_or_threat: "Rushes or threatens you",
      keep_secret: "Tells you to keep it secret or stay on the call",
      too_good: "Offers something too good to be true",
      fools_checker: "Tries to trick scam checkers",
      cant_verify: "New number, or no proof it's really them",
    },
    scamTypes: {
      bank_kyc: "Fake bank, KYC, or PAN message",
      courier_parcel: "Courier or parcel scam",
      digital_arrest: "Digital arrest",
      fake_friend: "Fake friend or relative",
      investment: "Investment or trading scam",
      job_task: "Job or task scam",
      loan: "Loan scam",
      lottery_prize: "Lottery or prize scam",
      other: "Other",
      sextortion: "Sextortion or blackmail",
      tech_support: "Fake customer care or tech support",
      upi_refund: "UPI refund trick",
      utility_bill: "Electricity or bill scam",
    },
    claims: {
      bank: "Says they're your bank or a payment app",
      government: "Says they're police or a government office",
      company: "Says they're a company or employer",
      family_or_friend: "Says they're someone you know",
    },
    // Notes from the backend when your quick answers changed the verdict (backend/app/verdict.py).
    reasons: {
      relayed:
        "You said someone else passed this request on. Scammers use a real friend to vouch for a fake one.",
      notSaved: "They say they're someone you know, but the number isn't saved in your phone.",
      bankPhone: "Banks send SMS from a sender name like AX-HDFCBK, never from a 10-digit phone number.",
      governmentPhone:
        "Government offices send SMS from a sender name like AX-HDFCBK, never from a 10-digit phone number.",
      senderName:
        "You said it came from their own sender name, like AX-HDFCBK, which only the real organisation can use, and it asks you for nothing.",
      confirmed:
        "You said you confirmed it by calling a number you already had, which is the best check there is.",
      tampered:
        "This message tries to trick scam checkers into calling it safe. Real messages never do this.",
      confirmedOverruled:
        "You said you confirmed it by calling a number you already had, but the message itself shows warning signs. If the number you called came from this message, that call doesn't count.",
      senderNameOverruled:
        "You said it came from their own sender name, like AX-HDFCBK, but the message itself shows warning signs. Scam texts can appear in the same thread as real bank messages.",
      savedOverruled:
        "You said this number is saved in your phone, but saved numbers can be hacked or used by someone else. Call them on that number before doing what it asks.",
    },
    serious: "Serious",
    riskScore: "Scam risk score",
    doThisCheck: "Do this one check",
    calledConfirmed: "I called them and they confirmed",
    whatToDo: "What to do now",
    steps: [
      "Don't share any OTP, PIN, CVV, or card number, not even with a friend.",
      "Don't pay, scan a QR code, or install any app they ask for.",
      "Report the number on {chakshu}.",
    ],
    chakshu: "Chakshu (Sanchar Saathi)",
    alreadyPaid: "Already paid or shared something?",
    call1930: "Call 1930",
    hideSteps: "Hide steps",
    getHelp: "Get step-by-step help",
    why: "Why we think this",
    // One plain sentence or two that sums up what the signs add up to.
    assessment: {
      likely: (signs: number, serious: number) =>
        signs
          ? `We found ${plural(signs, "warning sign")}${serious ? `, ${serious} of them serious` : ""}. Together they match how this kind of scam works.`
          : "The message as a whole matches how scams work, even without one clear warning sign.",
      suspicious: (signs: number) =>
        `We found ${plural(signs, "warning sign")}. That isn't proof of a scam, but check before you act.`,
      notSure: "The message alone doesn't settle it. Who really sent it matters more than what it says.",
      none: "None of our checks found a clear warning sign.",
    },
    signsFound: "Warning signs found",
    goodToKnow: "Good to know",
    otpRuleTitle: "Never share an OTP, UPI PIN, or CVV",
    otpRuleBody: "No bank, police officer, company, or friend needs these. Anyone who asks is trying to take money.",
    otherChecks: (n: number) => `Other checks (${n})`,
    whatWeChecked: (n: number) => `What we checked (${n})`,
    notFoundHint: "Not found in this message",
    noneFoundHint: "None of these were found",
    share: "Share with family",
    // Shares the verdict only, never the message itself.
    shareText: (verdict: string, type: string | null, score: number, advice: string, url: string) =>
      `ScamCheck says: ${verdict}${type ? ` (${type})` : ""}, risk ${score}/100. ${advice}\nCheck a message yourself: ${url}`,
    shareAdvice: {
      likely_scam: "Don't reply, pay, or share any OTP. If money has already gone, call 1930 now.",
      suspicious: "Don't pay or share any OTP until you've checked it another way.",
      not_sure: "Check with the sender on a number you already have before doing anything.",
      no_red_flags: "No warning signs found, but never share an OTP or PIN with anyone.",
      unclear: "",
    },
    techDetails: "Technical details",
    techBody: (seconds: string, tokens: string | null) =>
      `Checked by {model} in ${seconds} s${tokens ? ` · ${tokens} tokens` : ""}. Percentages show how sure the model is that each sign is present.`,
  },

  // "Already paid or shared something?" steps (help.tsx).
  help: {
    legend: "What happened? Tick everything that applies.",
    options: {
      paid: "I sent money (UPI, bank transfer, or card)",
      card: "I shared my card number, expiry, or CVV",
      otp: "I shared an OTP or PIN",
      app: "I installed an app they asked for, or shared my screen",
      id: "I shared Aadhaar, PAN, or photos of my ID",
    },
    stepsTitle: "Do these now, in this order",
    call: "Call 1930",
    steps: {
      callPaid: "Call {1930} now. Reporting in the first hours gives the best chance of freezing the money.",
      callCard: "Call {1930} if any money has already gone.",
      callOtp: "Call {1930} now if the OTP was for a payment or a bank login.",
      callApp: "Call {1930} if any money has gone.",
      bankFraud: "Call your bank's helpline and report the payment as fraud. Ask them to raise a dispute.",
      keepProof: "Keep the transaction ID (UTR), the sender's number or UPI ID, and screenshots of the chat.",
      blockCard: "Block the card now in your bank app, or call the number on the back of the card.",
      dispute: "Check recent transactions and dispute any you don't recognise. Ask the bank for a new card.",
      changePin: "Change your UPI PIN and net-banking password.",
      offline: "Turn on airplane mode right away so they lose control of your phone.",
      uninstall: "Uninstall the app they asked for (AnyDesk, TeamViewer, QuickSupport, or any APK file).",
      changePinOther: "From another phone, change your UPI PIN and banking passwords.",
      aadhaarLock: "Lock your Aadhaar biometrics on the mAadhaar app or {uidai}.",
      creditWatch: "Watch for loans or SIM cards taken in your name over the next few months.",
      complain: "File a complaint at {cybercrime} with your screenshots.",
      tellFamily: "Tell your family and friends, so they aren't the next target.",
    },
  },
};

export type Messages = typeof en;
