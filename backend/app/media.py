"""Work out what an uploaded file really is from its first bytes.

The browser's MIME type comes from the file name, and names lie: online
"YouTube to MP3" converters often save M4A or WebM audio as ".mp3", and a
failed download can leave a file of a few bytes. Gemini rejects both with a
decode error, so fix the type when the bytes say otherwise, and stop clearly
broken files before they use up a check.
"""

# Containers that hold either sound or pictures. When the person uploaded audio,
# send the audio spelling so the API decodes it as a recording.
_AUDIO_SPELLING = {"video/mp4": "audio/m4a", "video/mov": "audio/m4a", "video/3gpp": "audio/m4a", "video/webm": "audio/webm"}
_HEIF_BRANDS = {b"heic", b"heix", b"hevc", b"heim", b"heis", b"hevm", b"hevs", b"mif1", b"msf1"}

# Audio or video this small can't hold a message; a real voice note is tens of KB.
MIN_MEDIA_BYTES = 1024


def detect(data: bytes) -> str | None:
    """The MIME type the bytes belong to, or None when the signature is unknown."""
    head = data[:16]
    if head.startswith(b"%PDF"):
        return "application/pdf"
    if head.startswith(b"\x89PNG"):
        return "image/png"
    if head.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if head.startswith(b"GIF8"):
        return "image/gif"
    if head.startswith((b"II*\x00", b"MM\x00*")):
        return "image/tiff"
    if head.startswith(b"RIFF") and len(head) >= 12:
        return {b"WEBP": "image/webp", b"WAVE": "audio/wav", b"AVI ": "video/avi"}.get(head[8:12])
    if head[4:8] == b"ftyp":
        brand = head[8:12]
        if brand in _HEIF_BRANDS:
            return "image/heic"
        if brand.startswith(b"M4"):  # M4A, M4B, M4P
            return "audio/m4a"
        if brand == b"qt  ":
            return "video/mov"
        if brand.startswith(b"3g"):
            return "video/3gpp"
        return "video/mp4"
    if head.startswith(b"\x1a\x45\xdf\xa3"):
        return "video/webm"
    if head.startswith(b"OggS"):
        return "audio/ogg"
    if head.startswith(b"fLaC"):
        return "audio/flac"
    if head.startswith(b"FORM") and head[8:12] in (b"AIFF", b"AIFC"):
        return "audio/aiff"
    if head.startswith(b"ID3"):
        return "audio/mp3"
    if len(head) >= 2 and head[0] == 0xFF:
        if head[1] & 0xF6 == 0xF0:  # ADTS frame header
            return "audio/aac"
        if head[1] & 0xE0 == 0xE0:  # MPEG audio frame sync
            return "audio/mp3"
    if head.startswith((b"\x00\x00\x01\xba", b"\x00\x00\x01\xb3")):
        return "video/mpeg"
    if head.startswith(b"FLV"):
        return "video/x-flv"
    if head.startswith(b"\x30\x26\xb2\x75"):
        return "video/wmv"
    if head.startswith(b"BM"):
        return "image/bmp"
    return None


def actual_mime(declared: str, kind: str, data: bytes) -> str | None:
    """The MIME type to send for an upload declared as `declared` (input block type `kind`).

    Returns None when the file is clearly broken: audio or video too small to hold
    anything and in no format we recognise.
    """
    found = detect(data)
    if found is None:
        if kind in ("audio", "video") and len(data) < MIN_MEDIA_BYTES:
            return None
        return declared  # unknown signature: let the API try
    if found == declared:
        return declared
    if kind == "audio" and found in _AUDIO_SPELLING:
        return _AUDIO_SPELLING[found]
    if found == "audio/ogg" and declared == "audio/opus":
        return declared
    if found == "image/heic" and declared == "image/heif":
        return declared
    return found
