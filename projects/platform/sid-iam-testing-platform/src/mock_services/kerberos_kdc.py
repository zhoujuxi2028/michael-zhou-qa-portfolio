import hashlib
import logging
import uuid
from datetime import datetime, timedelta, timezone

from src.config import settings
from src.constants.test_users import ADMIN_001, STUDENT_001, TEACHER_001

logger = logging.getLogger(__name__)


class KerberosError(Exception):
    pass


class MockKerberosKDC:
    def __init__(self, realm=None):
        self.realm = realm or settings.krb_realm
        self._principals = {}
        self._tickets = {}
        self._used_timestamps = set()
        self._key_version = 1
        self._ticket_cache = {}
        self._cross_realm_trusts = {}
        self._seed_principals()

    def _seed_principals(self):
        self._principals = {
            f"{STUDENT_001['uid']}@{self.realm}": {"password": STUDENT_001["password"], "roles": ["student"]},
            f"{TEACHER_001['uid']}@{self.realm}": {"password": TEACHER_001["password"], "roles": ["teacher"]},
            f"{ADMIN_001['uid']}@{self.realm}": {"password": ADMIN_001["password"], "roles": ["admin"]},
            f"krbtgt/{self.realm}@{self.realm}": {"password": "krbtgt-secret", "roles": ["service"]},
            f"HTTP/webapp.{self.realm.lower()}@{self.realm}": {"password": "http-secret", "roles": ["service"]},
        }

    def reset(self):
        self._tickets.clear()
        self._used_timestamps.clear()
        self._ticket_cache.clear()
        self._key_version = 1
        self._cross_realm_trusts.clear()
        self._seed_principals()

    def request_tgt(self, principal, password):
        logger.info(f"TGT request for principal={principal}")
        princ_data = self._principals.get(principal)
        if not princ_data or princ_data["password"] != password:
            raise KerberosError("Invalid principal or password")
        now = datetime.now(timezone.utc)
        tgt_id = str(uuid.uuid4())
        tgt = {
            "ticket_id": tgt_id,
            "type": "TGT",
            "principal": principal,
            "realm": self.realm,
            "issued_at": now.isoformat(),
            "expires_at": (now + timedelta(hours=settings.krb_tgt_lifetime_hours)).isoformat(),
            "renewable_until": (now + timedelta(days=7)).isoformat(),
            "key_version": self._key_version,
            "session_key": hashlib.sha256(f"{tgt_id}-{now.isoformat()}".encode()).hexdigest()[:32],
        }
        self._tickets[tgt_id] = tgt
        self._ticket_cache.setdefault(principal, []).append(tgt_id)
        return tgt

    def request_service_ticket(self, tgt, service_principal):
        logger.info(f"ST request for service={service_principal}")
        if isinstance(tgt, dict):
            tgt_id = tgt["ticket_id"]
        else:
            tgt_id = tgt
        stored_tgt = self._tickets.get(tgt_id)
        if not stored_tgt or stored_tgt["type"] != "TGT":
            raise KerberosError("Invalid TGT")
        now = datetime.now(timezone.utc)
        if now > datetime.fromisoformat(stored_tgt["expires_at"]):
            raise KerberosError("TGT expired")
        realm = service_principal.split("@")[-1] if "@" in service_principal else self.realm
        if realm != self.realm and realm not in self._cross_realm_trusts:
            raise KerberosError(f"No trust relationship with realm {realm}")
        st_id = str(uuid.uuid4())
        st = {
            "ticket_id": st_id,
            "type": "ST",
            "principal": stored_tgt["principal"],
            "service": service_principal,
            "realm": realm,
            "issued_at": now.isoformat(),
            "expires_at": (now + timedelta(hours=settings.krb_st_lifetime_hours)).isoformat(),
            "key_version": self._key_version,
            "session_key": hashlib.sha256(f"{st_id}-{now.isoformat()}".encode()).hexdigest()[:32],
        }
        self._tickets[st_id] = st
        return st

    def validate_ticket(self, ticket):
        if isinstance(ticket, dict):
            ticket_id = ticket["ticket_id"]
        else:
            ticket_id = ticket
        stored = self._tickets.get(ticket_id)
        if not stored:
            raise KerberosError("Invalid ticket")
        now = datetime.now(timezone.utc)
        if now > datetime.fromisoformat(stored["expires_at"]):
            raise KerberosError("Ticket expired")
        return stored

    def check_replay(self, ticket_id, timestamp):
        key = f"{ticket_id}:{timestamp}"
        if key in self._used_timestamps:
            raise KerberosError("Replay attack detected")
        self._used_timestamps.add(key)
        return True

    def renew_ticket(self, ticket):
        if isinstance(ticket, dict):
            ticket_id = ticket["ticket_id"]
        else:
            ticket_id = ticket
        stored = self._tickets.get(ticket_id)
        if not stored:
            raise KerberosError("Invalid ticket")
        now = datetime.now(timezone.utc)
        renewable_until = datetime.fromisoformat(stored["renewable_until"]) if "renewable_until" in stored else now
        if now > renewable_until:
            raise KerberosError("Ticket no longer renewable")
        if stored["type"] == "TGT":
            lifetime = timedelta(hours=settings.krb_tgt_lifetime_hours)
        else:
            lifetime = timedelta(hours=settings.krb_st_lifetime_hours)
        stored["issued_at"] = now.isoformat()
        stored["expires_at"] = (now + lifetime).isoformat()
        return stored

    def rotate_keys(self):
        self._key_version += 1
        logger.info(f"Key rotated to version {self._key_version}")
        return self._key_version

    def add_cross_realm_trust(self, remote_realm, trust_key="shared-secret"):
        self._cross_realm_trusts[remote_realm] = trust_key

    def get_ticket_cache(self, principal):
        ticket_ids = self._ticket_cache.get(principal, [])
        return [self._tickets[tid] for tid in ticket_ids if tid in self._tickets]

    def invalidate_ticket(self, ticket_id):
        self._tickets.pop(ticket_id, None)
