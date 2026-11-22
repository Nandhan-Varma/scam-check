"""In-memory rate limits so nobody can run up the Gemini bill through /api/check.

Two layers:
  - per visitor (by client IP), so one person can't use up the quota;
  - global, across everyone. This is the hard ceiling on spend: it holds even if a
    visitor spoofs X-Forwarded-For to look like many people.

State lives in this process. With several uvicorn workers or servers, each keeps
its own counters, so the real ceiling is the limit times the number of processes.
Use a shared store (Redis) or your host's rate limiting if you scale out.
"""

import os
import threading
import time
from collections import OrderedDict, deque
from dataclasses import dataclass

MINUTE = 60
DAY = 24 * 60 * 60
# Bounds memory if someone sends a different spoofed IP on every request.
MAX_TRACKED_VISITORS = 10_000


def _env_int(name: str, default: int) -> int:
    try:
        return max(0, int(os.environ.get(name, default)))
    except ValueError:
        return default


@dataclass(frozen=True)
class Limits:
    per_visitor_minute: int = 5
    per_visitor_day: int = 50
    global_minute: int = 30
    global_day: int = 500

    @classmethod
    def from_env(cls) -> "Limits":
        """0 turns a limit off."""
        return cls(
            per_visitor_minute=_env_int("RATE_LIMIT_PER_MINUTE", cls.per_visitor_minute),
            per_visitor_day=_env_int("RATE_LIMIT_PER_DAY", cls.per_visitor_day),
            global_minute=_env_int("GLOBAL_LIMIT_PER_MINUTE", cls.global_minute),
            global_day=_env_int("GLOBAL_LIMIT_PER_DAY", cls.global_day),
        )


class RateLimiter:
    def __init__(self, limits: Limits, clock=time.monotonic):
        self.limits = limits
        self._clock = clock
        self._lock = threading.Lock()
        self._visitors: OrderedDict[str, deque[float]] = OrderedDict()
        self._global: deque[float] = deque()

    @staticmethod
    def _retry_after(hits: deque[float], now: float, window: int, limit: int) -> int | None:
        """Seconds until a slot frees up, or None if under the limit."""
        if limit <= 0:
            return None
        recent = [t for t in hits if t > now - window]
        if len(recent) < limit:
            return None
        return max(1, int(recent[-limit] + window - now) + 1)

    def check(self, visitor: str) -> int | None:
        """Record a request. Returns None if allowed, else seconds to wait."""
        now = self._clock()
        lim = self.limits
        with self._lock:
            while self._global and self._global[0] <= now - DAY:
                self._global.popleft()
            hits = self._visitors.get(visitor, deque())
            while hits and hits[0] <= now - DAY:
                hits.popleft()

            waits = [
                self._retry_after(hits, now, MINUTE, lim.per_visitor_minute),
                self._retry_after(hits, now, DAY, lim.per_visitor_day),
                self._retry_after(self._global, now, MINUTE, lim.global_minute),
                self._retry_after(self._global, now, DAY, lim.global_day),
            ]
            waits = [w for w in waits if w is not None]
            if waits:
                return max(waits)

            hits.append(now)
            self._global.append(now)
            self._visitors[visitor] = hits
            self._visitors.move_to_end(visitor)
            while len(self._visitors) > MAX_TRACKED_VISITORS:
                self._visitors.popitem(last=False)
            return None


def client_ip(peer: str | None, forwarded_for: str | None, trusted_proxies: frozenset[str]) -> str:
    """The visitor's IP. X-Forwarded-For is only believed when the request comes from a
    proxy we trust (the Next.js server), and then only its last entry: the address that
    proxy actually saw. Earlier entries are whatever the client chose to send."""
    peer = peer or "unknown"
    if peer in trusted_proxies and forwarded_for:
        last = forwarded_for.split(",")[-1].strip()
        if last:
            return last
    return peer


def trusted_proxies_from_env() -> frozenset[str]:
    raw = os.environ.get("TRUSTED_PROXIES", "127.0.0.1,::1")
    return frozenset(p.strip() for p in raw.split(",") if p.strip())
