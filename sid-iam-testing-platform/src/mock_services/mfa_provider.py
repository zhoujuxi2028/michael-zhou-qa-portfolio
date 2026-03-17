import hashlib
import hmac
import logging
import struct
import time
import uuid

logger = logging.getLogger(__name__)


class MFAError(Exception):
    pass


class MFAProvider:
    def __init__(self, time_step=30, window=1):
        self._users = {}
        self.time_step = time_step
        self.window = window

    def reset(self):
        self._users.clear()

    def register(self, user_id):
        logger.info(f"MFA registration for user={user_id}")
        secret = hashlib.sha256(f"mfa-secret-{user_id}-{uuid.uuid4().hex}".encode()).hexdigest()[:32]
        recovery_codes = [uuid.uuid4().hex[:8] for _ in range(8)]
        self._users[user_id] = {
            "secret": secret,
            "recovery_codes": set(recovery_codes),
            "enabled": True,
            "registered_at": time.time(),
        }
        return {"secret": secret, "recovery_codes": list(recovery_codes)}

    def generate_totp(self, secret, timestamp=None):
        if timestamp is None:
            timestamp = time.time()
        counter = int(timestamp) // self.time_step
        return self._hotp(secret, counter)

    def verify(self, user_id, code):
        logger.info(f"MFA verify for user={user_id}")
        user = self._users.get(user_id)
        if not user:
            raise MFAError("User not registered for MFA")
        if not user["enabled"]:
            raise MFAError("MFA not enabled")
        now = time.time()
        for offset in range(-self.window, self.window + 1):
            ts = now + offset * self.time_step
            expected = self.generate_totp(user["secret"], ts)
            if str(code) == str(expected):
                return True
        raise MFAError("Invalid TOTP code")

    def use_recovery_code(self, user_id, code):
        logger.info(f"MFA recovery code used for user={user_id}")
        user = self._users.get(user_id)
        if not user:
            raise MFAError("User not registered for MFA")
        if code not in user["recovery_codes"]:
            raise MFAError("Invalid recovery code")
        user["recovery_codes"].discard(code)
        return {"remaining_codes": len(user["recovery_codes"])}

    def check_bypass_attempt(self, user_id, request_headers=None):
        user = self._users.get(user_id)
        if not user or not user["enabled"]:
            return {"bypass_detected": False}
        headers = request_headers or {}
        bypass_indicators = [
            headers.get("X-Skip-MFA") == "true",
            headers.get("X-MFA-Bypass") is not None,
            headers.get("X-Debug-Mode") == "true",
        ]
        if any(bypass_indicators):
            return {"bypass_detected": True, "reason": "Suspicious MFA bypass headers detected"}
        return {"bypass_detected": False}

    def get_user_secret(self, user_id):
        user = self._users.get(user_id)
        if not user:
            raise MFAError("User not registered for MFA")
        return user["secret"]

    def _hotp(self, secret, counter):
        key = secret.encode()
        msg = struct.pack(">Q", counter)
        h = hmac.new(key, msg, hashlib.sha1).digest()
        offset = h[-1] & 0x0F
        code = struct.unpack(">I", h[offset:offset + 4])[0] & 0x7FFFFFFF
        return str(code % 10**6).zfill(6)

    def is_registered(self, user_id):
        return user_id in self._users and self._users[user_id]["enabled"]
