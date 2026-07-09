# ============================================================
#  detector.py
#  Role : Rule-based detection engine for CAN Bus attacks
# ============================================================
#
#  WHAT IS RULE-BASED DETECTION? (plain English)
#  -----------------------------------------------
#  Rule-based IDS works like a set of "if this, then alert" rules.
#  It's the simplest form of intrusion detection. No machine learning,
#  no statistics — just clear, auditable rules.
#
#  Think of it like airport security rules:
#    "If a bag weighs more than 32kg → flag it"
#    "If liquid > 100ml → flag it"
#  Our rules are the same idea but for CAN messages.
#
#  OUR THREE DETECTION RULES:
#  ---------------------------
#  RULE 1 — FLOOD DETECTION
#    "If more than FLOOD_THRESHOLD messages arrive within
#     FLOOD_WINDOW seconds from the same CAN ID → FLOOD ALERT"
#
#    Why it works: A normal ECU sends ~2 messages/sec (500ms interval).
#    A flood attack sends 50+ messages almost instantly.
#    We count messages in a sliding time window and trip the alert.
#
#  RULE 2 — REPLAY DETECTION
#    "If we see the exact same (CAN_ID, counter, data) combination
#     we have already seen before → REPLAY ALERT"
#
#    Why it works: Every legitimate message has a counter that
#    increments with each send. If counter never changes, someone
#    is replaying old messages.
#
#    We also check: if a message has the same data but a counter
#    that is impossibly far behind → REPLAY ALERT.
#
#  RULE 3 — SPOOF DETECTION
#    "If a message arrives with CAN ID 0x100 (Node 1's ID)
#     but bytes 4-7 are NOT the valid auth token → SPOOF ALERT"
#
#    Why it works: Only Node 1 knows the secret token.
#    An attacker using Node 1's CAN ID but wrong token is caught.
#    This rule works together with authenticator.py.
#
# ============================================================

import time
from collections import deque     # deque = double-ended queue
                                   # efficient for sliding window counting
from authenticator import Authenticator


# ============================================================
#  DETECTION THRESHOLDS
#  You can tune these values to make the IDS more or less sensitive.
# ============================================================

# FLOOD rule: more than this many messages in FLOOD_WINDOW seconds = flood
FLOOD_THRESHOLD = 10          # 10 messages...
FLOOD_WINDOW    = 1.0         # ...within 1 second = alert
#                               Normal rate is 2/sec, so 10/sec is clearly anomalous

# REPLAY rule: how many last-seen counters to remember per CAN ID
REPLAY_MEMORY   = 500         # Remember last 500 counters per ID

# REPLAY rule: if new counter < last counter by more than this → suspicious
COUNTER_JUMP_THRESHOLD = 100  # Counter going backward by 100+ = old replayed message


class DetectionResult:
    """
    A simple container to hold the result of checking one CAN message.

    Instead of returning a confusing mix of variables, every detection
    check returns one DetectionResult object with clear fields.
    """

    def __init__(self):
        self.attack_detected = False    # Was any attack detected?
        self.attack_type     = None     # 'FLOOD', 'REPLAY', 'SPOOF', or None
        self.confidence      = 'LOW'    # 'LOW', 'MEDIUM', 'HIGH'
        self.details         = ''       # Human-readable explanation

    def set_attack(self, attack_type: str, confidence: str, details: str):
        """Mark this result as an attack detection."""
        self.attack_detected = True
        self.attack_type     = attack_type
        self.confidence      = confidence
        self.details         = details

    def __repr__(self):
        if self.attack_detected:
            return f"[{self.attack_type}] {self.confidence} confidence — {self.details}"
        return "[CLEAN] No attack detected"


class Detector:
    """
    The main detection engine.

    Call check_message() for every CAN frame that arrives.
    It runs all three rules and returns a DetectionResult.

    Internal state is kept in dictionaries keyed by CAN ID,
    so we track each "sender" independently.
    """

    def __init__(self):
        # --- STATE FOR FLOOD DETECTION ---
        # For each CAN ID, keep a deque of timestamps.
        # A deque is like a list but we can efficiently pop from both ends.
        # We'll store the time.time() of each message arrival.
        # Key: CAN ID (int), Value: deque of floats (timestamps)
        self.message_timestamps = {}     # { can_id: deque([t1, t2, t3...]) }

        # --- STATE FOR REPLAY DETECTION ---
        # For each CAN ID, keep a set of (counter, data_hash) tuples we've seen.
        # Key: CAN ID (int), Value: set of (counter, data_hash) tuples
        self.seen_messages = {}          # { can_id: set((counter, data_bytes_tuple)) }

        # Track the last counter value seen per CAN ID
        # Key: CAN ID (int), Value: last counter (int)
        self.last_counter = {}           # { can_id: int }

        # --- AUTHENTICATOR (for spoof detection) ---
        self.auth = Authenticator(use_static_token=True)

        # --- FLOOD BURST TRACKING ---
        # After we alert on a flood, we don't want to spam 50 alerts.
        # This tracks the last time we alerted per CAN ID.
        self.last_flood_alert_time = {}  # { can_id: float (timestamp) }
        self.flood_alert_cooldown  = 2.0 # seconds between flood alerts

    # ==================================================================
    #  PUBLIC METHOD — call this from main.py for every message
    # ==================================================================
    def check_message(self, can_id: int, counter: int, data_bytes: list,
                      source_node: str = 'UNKNOWN') -> DetectionResult:
        """
        Run all detection rules on one incoming CAN message.

        Parameters
        ----------
        can_id      : int   — CAN message ID (e.g. 256 for 0x100)
        counter     : int   — message sequence number from bytes 0-1
        data_bytes  : list  — all 8 data bytes as integers
        source_node : str   — 'NODE1', 'NODE2', or 'UNKNOWN'

        Returns
        -------
        DetectionResult — contains attack_detected, attack_type, details
        """

        result = DetectionResult()

        # Run rules in priority order.
        # If a higher-priority rule triggers, we return immediately.
        # (One alert per message is enough — avoid double-reporting.)

        # Rule 1: Flood check
        flood_result = self._check_flood(can_id)
        if flood_result.attack_detected:
            return flood_result

        # Rule 2: Replay check
        replay_result = self._check_replay(can_id, counter, data_bytes)
        if replay_result.attack_detected:
            return replay_result

        # Rule 3: Spoof check (uses authenticator)
        spoof_result = self._check_spoof(can_id, counter, data_bytes)
        if spoof_result.attack_detected:
            return spoof_result

        # No attack detected — return clean result
        return result

    # ==================================================================
    #  RULE 1: FLOOD DETECTION
    # ==================================================================
    def _check_flood(self, can_id: int) -> DetectionResult:
        """
        Sliding window rate check.

        We keep a deque of timestamps for each CAN ID.
        On each call:
          1. Add current timestamp to the deque.
          2. Remove timestamps older than FLOOD_WINDOW seconds from the front.
          3. Count how many timestamps remain.
          4. If count > FLOOD_THRESHOLD → flood alert.

        Example:
          Normal: 2 messages in 1 second → count=2 → no alert
          Attack: 50 messages in 0.1 seconds → count=50 → ALERT
        """
        result = DetectionResult()
        now = time.time()

        # Initialize deque for this CAN ID if we haven't seen it before
        if can_id not in self.message_timestamps:
            self.message_timestamps[can_id] = deque()

        timestamps = self.message_timestamps[can_id]

        # Step 1: Record this message's arrival time
        timestamps.append(now)

        # Step 2: Remove timestamps that are outside our window
        # We keep removing from the LEFT (oldest) until the oldest one
        # is within our time window.
        while timestamps and (now - timestamps[0]) > FLOOD_WINDOW:
            timestamps.popleft()

        # Step 3: Count messages in the current window
        message_count = len(timestamps)

        # Step 4: Compare against threshold
        if message_count > FLOOD_THRESHOLD:
            # Check cooldown — don't alert again too soon for the same ID
            last_alert = self.last_flood_alert_time.get(can_id, 0)
            if (now - last_alert) > self.flood_alert_cooldown:
                self.last_flood_alert_time[can_id] = now
                result.set_attack(
                    attack_type = 'FLOOD',
                    confidence  = 'HIGH',
                    details     = (
                        f"{message_count} messages from CAN_ID=0x{can_id:03X} "
                        f"in {FLOOD_WINDOW}s (threshold={FLOOD_THRESHOLD})"
                    )
                )

        return result

    # ==================================================================
    #  RULE 2: REPLAY DETECTION
    # ==================================================================
    def _check_replay(self, can_id: int, counter: int,
                      data_bytes: list) -> DetectionResult:
        """
        Detect replayed messages using two sub-checks:

        Sub-check A — Exact duplicate:
          If we have already seen the exact (counter, data) pair
          from this CAN ID → definite replay.

        Sub-check B — Counter regression:
          If the new counter is MORE than COUNTER_JUMP_THRESHOLD
          behind the last counter we saw → suspicious.
          (A counter should only go up, never suddenly jump backward.)

        After checking, we record this message so we can detect
        future replays of it.
        """
        result = DetectionResult()

        # Initialize state for this CAN ID
        if can_id not in self.seen_messages:
            self.seen_messages[can_id] = set()
        if can_id not in self.last_counter:
            self.last_counter[can_id] = -1   # -1 means "not seen yet"

        # --- SUB-CHECK A: Exact duplicate check ---
        # Build a tuple we can put in a set.
        # We convert data_bytes list to a tuple (lists aren't hashable).
        message_fingerprint = (counter, tuple(data_bytes))

        if message_fingerprint in self.seen_messages[can_id]:
            result.set_attack(
                attack_type = 'REPLAY',
                confidence  = 'HIGH',
                details     = (
                    f"Exact duplicate message from CAN_ID=0x{can_id:03X}. "
                    f"Counter={counter} with identical data seen before."
                )
            )
            # Still update state even on attack detection
            self._update_replay_state(can_id, counter, message_fingerprint)
            return result

        # --- SUB-CHECK B: Counter regression check ---
        last = self.last_counter[can_id]
        if last >= 0:   # Skip this check on the very first message
            # Normal: counter should be >= last (usually last + 1)
            # Suspicious: counter is much smaller than last
            if last - counter > COUNTER_JUMP_THRESHOLD:
                result.set_attack(
                    attack_type = 'REPLAY',
                    confidence  = 'MEDIUM',
                    details     = (
                        f"Counter regression on CAN_ID=0x{can_id:03X}. "
                        f"Last counter={last}, new counter={counter}. "
                        f"Gap of {last - counter} exceeds threshold={COUNTER_JUMP_THRESHOLD}."
                    )
                )
                self._update_replay_state(can_id, counter, message_fingerprint)
                return result

        # No replay detected — update state and return clean
        self._update_replay_state(can_id, counter, message_fingerprint)
        return result

    def _update_replay_state(self, can_id: int, counter: int,
                             fingerprint: tuple):
        """
        Record a message so we can detect future replays of it.
        Also updates the last_counter for this CAN ID.

        We limit the seen_messages set to REPLAY_MEMORY entries to
        avoid using too much RAM over a long run.
        """
        seen = self.seen_messages[can_id]

        # If we've stored too many fingerprints, clear the oldest half.
        # (Sets don't have ordering, so we just clear everything —
        # this is fine for a demo; a production system would use a
        # time-based cache like TTLCache.)
        if len(seen) >= REPLAY_MEMORY:
            seen.clear()

        seen.add(fingerprint)
        self.last_counter[can_id] = counter

    # ==================================================================
    #  RULE 3: SPOOF DETECTION
    # ==================================================================
    def _check_spoof(self, can_id: int, counter: int,
                     data_bytes: list) -> DetectionResult:
        """
        Detect spoofed messages using two sub-checks:

        Sub-check A — Unknown CAN ID:
          If the CAN ID is not in our list of known legitimate IDs → alert.
          Node 2's flood/replay uses ID 0x101, which we don't know → SPOOF.

        Sub-check B — Invalid auth token:
          If the CAN ID IS recognised (e.g. 0x100) but the auth token
          in bytes 4-7 is wrong → attacker is impersonating Node 1.

        Note: Both checks use the Authenticator class from authenticator.py.
        """
        result = DetectionResult()

        # --- SUB-CHECK A: Known ID check ---
        if not self.auth.is_known_id(can_id):
            result.set_attack(
                attack_type = 'SPOOF',
                confidence  = 'MEDIUM',
                details     = (
                    f"Message from unknown CAN_ID=0x{can_id:03X}. "
                    f"Not in whitelist of legitimate ECU IDs."
                )
            )
            return result

        # --- SUB-CHECK B: Auth token check ---
        auth_result = self.auth.is_authentic(can_id, counter, data_bytes)
        if not auth_result['valid']:
            result.set_attack(
                attack_type = 'SPOOF',
                confidence  = 'HIGH',
                details     = (
                    f"Auth token mismatch on CAN_ID=0x{can_id:03X}. "
                    f"Received={auth_result['token_received']}, "
                    f"Expected={auth_result['token_expected']}. "
                    f"Possible identity spoofing."
                )
            )
            return result

        return result

    # ==================================================================
    #  UTILITY
    # ==================================================================
    def reset(self):
        """Clear all internal state. Useful for testing."""
        self.message_timestamps.clear()
        self.seen_messages.clear()
        self.last_counter.clear()
        self.last_flood_alert_time.clear()