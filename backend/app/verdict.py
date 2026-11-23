"""Turn Decisions API answers, plus what the person told us, into one verdict.

Verdicts, from most to least worrying:
  likely_scam   - stop
  suspicious    - warning signs; check before acting
  not_sure      - the model can't tell; one specific check settles it
  no_red_flags  - nothing matched (not a guarantee)
  unclear       - nothing readable to judge

Thresholds are starting values; tune them against labelled messages.
The API clamps yes/no probabilities to 0.01-0.99.
"""

from dataclasses import dataclass, field

from .questions import CLAIMS_TO_BE_LABELS, GROUPS, SCAM_TYPES, SIGNS

READABLE_MIN = 0.5  # below this there is nothing to judge
SCAM_P = 0.75  # is_scam at or above this, with any warning sign present, means "likely scam"
SCAM_WITH_SIGNS_P = 0.5  # ...or this, when two or more high-risk signs are present
NOT_SURE_P = 0.30  # between this and SCAM_P the model is unsure
SIGN_P = 0.60  # a warning sign counts as present at or above this
SCAM_TYPE_MIN = 0.40  # name the scam type only when the model is at least this sure
CLAIM_MIN = 0.50  # show "claims to be" only when the model is at least this sure

HIGH_RISK = frozenset(key for key, sign in SIGNS.items() if sign["high_risk"])
RISKY_ASKS = frozenset({"ask_money", "ask_secret", "ask_card_info"})


# Banks and government offices send SMS only from a registered sender name (DLT header) like
# AX-HDFCBK or JD-SBICRD, never from a 10-digit mobile number.
OFFICIAL_SENDERS = frozenset({"bank", "government"})
SMS_FROM_VALUES = ("sender_name", "phone_number")


@dataclass(frozen=True)
class Context:
    """The optional questions in the form. None means not answered."""

    saved_contact: str | None = None  # Is this number saved in your phone? yes / no
    relayed: str | None = None  # Did someone else pass this request on to you? yes / no
    confirmed_by_call: str | None = None  # Have you called them on a number you already had to confirm? yes / no
    sms_from: str | None = None  # Who sent the SMS? sender_name (like AX-HDFCBK) / phone_number

    def as_dict(self) -> dict:
        return {k: v for k, v in vars(self).items() if v is not None}


@dataclass(frozen=True)
class Answers:
    readable: float
    is_scam: float
    claims_to_be: str
    claims_to_be_p: float
    signs: dict[str, float]  # sign key -> P(yes)
    scam_type: str
    scam_type_p: float
    context: Context = field(default_factory=Context)


def _sign(key: str, p: float) -> dict:
    sign = SIGNS[key]
    return {
        "key": key,
        "label": sign["label"],
        "group": sign["group"],
        "probability": p,
        "high_risk": key in HIGH_RISK,
        "present": p >= SIGN_P,
    }


def decide(a: Answers) -> dict:
    checks = [_sign(key, p) for key, p in sorted(a.signs.items(), key=lambda kv: kv[1], reverse=True)]
    claims = (
        {"key": a.claims_to_be, "label": CLAIMS_TO_BE_LABELS[a.claims_to_be]}
        if a.claims_to_be in CLAIMS_TO_BE_LABELS and a.claims_to_be_p >= CLAIM_MIN
        else None
    )
    base = {
        "scam_probability": a.is_scam,
        "claims_to_be": claims,
        "groups": GROUPS,
        "checks": checks,
        "context": a.context.as_dict(),
    }
    present = [c for c in checks if c["present"]]
    keys = {c["key"] for c in present}
    high_count = len(keys & HIGH_RISK)

    # "Couldn't read this" shows no warning, so it must never hide a scam the model did see.
    # Text inside a message can claim "this input is blank"; the other answers still judge it.
    if a.readable < READABLE_MIN and a.is_scam < NOT_SURE_P and not high_count:
        return {**base, "verdict": "unclear", "signs": [], "scam_type": None, "reasons": []}

    # 1. What the model sees. "Likely a scam" needs at least one warning sign to show: a high
    # is_scam with nothing to point at (e.g. a genuine "Not you? Call <bank helpline>" alert)
    # is "not sure", whose advice is to check on a number you already have.
    if (a.is_scam >= SCAM_P and present) or (a.is_scam >= SCAM_WITH_SIGNS_P and high_count >= 2):
        verdict = "likely_scam"
    elif a.is_scam >= NOT_SURE_P:
        verdict = "not_sure"
    elif high_count or len(present) >= 2:
        verdict = "suspicious"
    else:
        verdict = "no_red_flags"

    # 2. What the person told us. These are facts the model can't see in a screenshot.
    ctx = a.context
    reasons: list[str] = []
    risky_ask = bool(keys & RISKY_ASKS)
    if risky_ask and verdict in ("not_sure", "suspicious"):
        if ctx.relayed == "yes":
            verdict = "likely_scam"
            reasons.append(
                "You said someone else passed this request on. Scammers use a real friend to vouch for a fake one."
            )
        elif ctx.saved_contact == "no" and a.claims_to_be == "family_or_friend":
            verdict = "likely_scam"
            reasons.append("They say they're someone you know, but the number isn't saved in your phone.")
    official_claim = a.claims_to_be in OFFICIAL_SENDERS and a.claims_to_be_p >= CLAIM_MIN
    if official_claim and ctx.sms_from == "phone_number":
        who = "Banks" if a.claims_to_be == "bank" else "Government offices"
        note = f"{who} send SMS from a sender name like AX-HDFCBK, never from a 10-digit phone number."
        if verdict in ("not_sure", "suspicious"):
            verdict = "likely_scam"
            reasons.append(note)
        elif verdict == "no_red_flags":
            verdict = "suspicious"
            reasons.append(note)
    elif official_claim and ctx.sms_from == "sender_name" and verdict == "not_sure" and not present:
        # Only a registered business can send from a sender name, and nothing else looked wrong.
        verdict = "no_red_flags"
        reasons.append(
            "You said it came from their own sender name, like AX-HDFCBK, which only the real "
            "organisation can use, and it asks you for nothing."
        )
    if ctx.confirmed_by_call == "yes" and high_count <= 1 and a.is_scam < 0.9:
        # Calling a number you already had is the check we'd tell them to do, so don't ask again.
        confirmed_note = "You said you confirmed it by calling a number you already had, which is the best check there is."
        if verdict == "likely_scam":
            verdict = "suspicious"
            reasons.append(confirmed_note)
        elif verdict == "not_sure":
            verdict = "no_red_flags"
            reasons.append(confirmed_note)

    scam_type = None
    if verdict in ("likely_scam", "suspicious") and a.is_scam >= NOT_SURE_P and a.scam_type != "other" and a.scam_type_p >= SCAM_TYPE_MIN:
        scam_type = {"key": a.scam_type, "label": SCAM_TYPES[a.scam_type][0], "probability": a.scam_type_p}

    return {**base, "verdict": verdict, "signs": present, "scam_type": scam_type, "reasons": reasons}
