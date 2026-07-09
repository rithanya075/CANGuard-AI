# ============================================================
#  authenticator.py
#  Role : Checks whether a CAN message carries a valid
#         authentication token (AES-128 simplified demo)
# ============================================================
#
#  HOW THIS WORKS (plain English):
#  --------------------------------
#  In real automotive security (ISO 21434 / SAE J3061),
#  each ECU signs its messages using a cryptographic MAC
#  (Message Authentication Code). Only ECUs that know the
#  secret key can produce a valid signature.
#
#  For this project we simulate this with a simpler approach:
#
#  Step 1 — We have a shared 16-byte AES-128 key.
#            Both the IDS (this file) and Node 1 (Arduino)
#            know this key. Node 2 (attacker) does NOT.
#
#  Step 2 — We use the key to compute an "expected token":
#            a 4-byte value derived from the CAN ID + counter.
#            This makes every message's token unique.
#
#  Step 3 — We compare the expected token to bytes 4-7
#            of the incoming CAN message. Match = authentic.
#            Mismatch = spoofed or tampered.
#
#  WHY AES-128?
#  ------------
#  AES (Advanced Encryption Standard) with a 128-bit key is
#  the industry standard for automotive message authentication.
#  Python's pycryptodome library handles all the math for us.
#
#  INSTALL REQUIRED:
#  -----------------
#  pip install pycryptodome
#
# ============================================================

from Crypto.Cipher import AES   # AES encryption from pycryptodome
import struct                   # for packing integers into bytes


# --- SHARED SECRET KEY ---
# This must match the AUTH_TOKEN logic in the Arduino sketches.
# In a real system this would be stored securely (HSM / secure element).
# For our demo: a fixed 16-byte key both sides know.
#
# We derive the expected 4-byte token by:
#   1. Encrypting [CAN_ID (2 bytes) + counter (2 bytes) + 12 zero bytes]
#      using AES-128 in ECB mode.
#   2. Taking the first 4 bytes of the AES output as the token.
#
# BUT — because the Arduino just hard-codes {0xDE, 0xAD, 0xBE, 0xEF}
# for simplicity, we handle BOTH modes here:
#   Mode A (demo / Arduino) : compare bytes 4-7 against STATIC_TOKEN
#   Mode B (full AES)       : compute token dynamically and compare
#
# This lets the project work even if you don't modify the Arduino code.

AES_KEY = b'\x2b\x7e\x15\x16\x28\xae\xd2\xa6'  \
          b'\xab\xf7\x15\x88\x09\xcf\x4f\x3c'
# ^^ This is the first AES-128 example key from the NIST standard.
#    16 bytes = 128 bits. In production you'd generate this randomly.

# The static token the Arduino hard-codes (bytes 4-7 of every message)
STATIC_TOKEN = bytes([0xDE, 0xAD, 0xBE, 0xEF])

# Known legitimate CAN IDs (Node 1's address)
LEGITIMATE_CAN_IDS = {0x100}


class Authenticator:
    """
    Validates CAN message authenticity.

    Two checks run for every message:
      1. Token check  — are bytes 4-7 the expected auth token?
      2. ID check     — is the CAN ID one we recognise as legitimate?
    """

    def __init__(self, use_static_token: bool = True):
        """
        Parameters
        ----------
        use_static_token : bool
            True  → compare against STATIC_TOKEN (0xDEADBEEF).
                     Use this while Arduino firmware uses hard-coded token.
            False → compute token dynamically with AES-128.
                     Use this if you update the Arduino to do real AES.
        """
        self.use_static_token = use_static_token

    # ------------------------------------------------------------------
    #  PUBLIC METHOD — call this from main.py
    # ------------------------------------------------------------------
    def is_authentic(self, can_id: int, counter: int, data_bytes: list) -> dict:
        """
        Check if a CAN message is authentic.

        Parameters
        ----------
        can_id      : int   — the CAN message ID (e.g. 0x100)
        counter     : int   — the message sequence number
        data_bytes  : list  — the 8 data bytes as integers (0-255 each)

        Returns
        -------
        dict with keys:
          'valid'   : bool   — True if authentic, False if not
          'reason'  : str    — human-readable explanation
          'token_received' : str  — hex of the token we received
          'token_expected' : str  — hex of the token we expected
        """

        # Sanity check — we need at least 8 bytes
        if len(data_bytes) < 8:
            return {
                'valid': False,
                'reason': 'Message too short (need 8 bytes)',
                'token_received': 'N/A',
                'token_expected': 'N/A'
            }

        # --- EXTRACT RECEIVED TOKEN (bytes 4-7) ---
        received_token = bytes(data_bytes[4:8])

        # --- COMPUTE OR LOOK UP EXPECTED TOKEN ---
        if self.use_static_token:
            expected_token = STATIC_TOKEN
        else:
            expected_token = self._compute_aes_token(can_id, counter)

        # Format as hex strings for display/logging
        received_hex = received_token.hex().upper()
        expected_hex = expected_token.hex().upper()

        # --- TOKEN COMPARISON ---
        if received_token != expected_token:
            return {
                'valid': False,
                'reason': f'Auth token mismatch',
                'token_received': received_hex,
                'token_expected': expected_hex
            }

        # If token matches, message is authentic
        return {
            'valid': True,
            'reason': 'Token verified',
            'token_received': received_hex,
            'token_expected': expected_hex
        }

    def is_known_id(self, can_id: int) -> bool:
        """
        Returns True if can_id belongs to a known legitimate ECU.
        Returns False if the CAN ID is unrecognised (possible spoof).
        """
        return can_id in LEGITIMATE_CAN_IDS

    # ------------------------------------------------------------------
    #  PRIVATE METHOD — AES token computation (full mode)
    # ------------------------------------------------------------------
    def _compute_aes_token(self, can_id: int, counter: int) -> bytes:
        """
        Compute the expected 4-byte token for a given CAN ID + counter.

        Process:
          1. Build a 16-byte plaintext: [CAN_ID(2)] + [counter(2)] + [zeros(12)]
          2. Encrypt with AES-128 ECB using our shared key
          3. Return first 4 bytes of ciphertext as the token

        This means every (CAN_ID, counter) pair produces a unique token.
        An attacker who doesn't know AES_KEY can't forge the token.
        """
        # Pack CAN ID (2 bytes, big-endian) + counter (2 bytes) + 12 zero bytes
        # struct.pack('>HH', a, b) = pack two unsigned shorts, big-endian
        plaintext = struct.pack('>HH', can_id, counter) + b'\x00' * 12
        # plaintext is exactly 16 bytes = one AES block

        # Encrypt using AES-128 ECB mode
        # ECB = Electronic Codebook — simple block encryption, no IV needed
        cipher = AES.new(AES_KEY, AES.MODE_ECB)
        ciphertext = cipher.encrypt(plaintext)

        # Return first 4 bytes as our token
        return ciphertext[:4]