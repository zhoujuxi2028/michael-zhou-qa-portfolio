import base64
import hashlib
import logging
import uuid
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)


class SessionError(Exception):
    pass


class SessionManager:
    def __init__(self, absolute_timeout=3600, idle_timeout=1800, max_concurrent=5):
        self._sessions = {}
        self._user_sessions = {}
        self.absolute_timeout = absolute_timeout
        self.idle_timeout = idle_timeout
        self.max_concurrent = max_concurrent
        self._encryption_key = "session-encryption-key"

    def reset(self):
        self._sessions.clear()
        self._user_sessions.clear()

    def create_session(self, user_id, metadata=None):
        logger.info(f"Creating session for user={user_id}")
        user_active = self._user_sessions.get(user_id, [])
        active_count = sum(1 for sid in user_active if sid in self._sessions and self._sessions[sid]["valid"])
        if active_count >= self.max_concurrent:
            raise SessionError(f"Max concurrent sessions ({self.max_concurrent}) reached for user {user_id}")
        session_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        session = {
            "session_id": session_id,
            "user_id": user_id,
            "created_at": now.isoformat(),
            "last_activity": now.isoformat(),
            "expires_at": (now + timedelta(seconds=self.absolute_timeout)).isoformat(),
            "valid": True,
            "metadata": self._encrypt_data(metadata or {}),
            "device": (metadata or {}).get("device", "unknown"),
        }
        self._sessions[session_id] = session
        self._user_sessions.setdefault(user_id, []).append(session_id)
        return session

    def validate_session(self, session_id):
        session = self._sessions.get(session_id)
        if not session:
            raise SessionError("Session not found")
        if not session["valid"]:
            raise SessionError("Session invalidated")
        now = datetime.now(timezone.utc)
        if now > datetime.fromisoformat(session["expires_at"]):
            session["valid"] = False
            raise SessionError("Session expired (absolute timeout)")
        last_activity = datetime.fromisoformat(session["last_activity"])
        if (now - last_activity).total_seconds() > self.idle_timeout:
            session["valid"] = False
            raise SessionError("Session expired (idle timeout)")
        session["last_activity"] = now.isoformat()
        return session

    def invalidate_session(self, session_id):
        session = self._sessions.get(session_id)
        if not session:
            raise SessionError("Session not found")
        session["valid"] = False
        return True

    def regenerate_session_id(self, old_session_id):
        old_session = self._sessions.get(old_session_id)
        if not old_session:
            raise SessionError("Session not found")
        new_session_id = str(uuid.uuid4())
        old_session["valid"] = False
        new_session = {**old_session, "session_id": new_session_id, "valid": True}
        self._sessions[new_session_id] = new_session
        user_id = old_session["user_id"]
        if user_id in self._user_sessions:
            sessions = self._user_sessions[user_id]
            if old_session_id in sessions:
                sessions.remove(old_session_id)
            sessions.append(new_session_id)
        return new_session

    def get_user_sessions(self, user_id):
        session_ids = self._user_sessions.get(user_id, [])
        return [self._sessions[sid] for sid in session_ids if sid in self._sessions and self._sessions[sid]["valid"]]

    def invalidate_all_user_sessions(self, user_id):
        session_ids = self._user_sessions.get(user_id, [])
        for sid in session_ids:
            if sid in self._sessions:
                self._sessions[sid]["valid"] = False
        return len(session_ids)

    def renew_session(self, session_id):
        session = self._sessions.get(session_id)
        if not session or not session["valid"]:
            raise SessionError("Invalid session")
        now = datetime.now(timezone.utc)
        session["expires_at"] = (now + timedelta(seconds=self.absolute_timeout)).isoformat()
        session["last_activity"] = now.isoformat()
        return session

    def get_session_data(self, session_id):
        session = self._sessions.get(session_id)
        if not session:
            raise SessionError("Session not found")
        return self._decrypt_data(session["metadata"])

    def _encrypt_data(self, data):
        raw = str(data).encode()
        encoded = base64.b64encode(raw).decode()
        tag = hashlib.sha256(f"{self._encryption_key}:{encoded}".encode()).hexdigest()[:16]
        return f"{tag}:{encoded}"

    def _decrypt_data(self, encrypted):
        if ":" not in encrypted:
            return encrypted
        tag, encoded = encrypted.split(":", 1)
        expected = hashlib.sha256(f"{self._encryption_key}:{encoded}".encode()).hexdigest()[:16]
        if tag != expected:
            raise SessionError("Session data integrity check failed")
        return base64.b64decode(encoded).decode()
