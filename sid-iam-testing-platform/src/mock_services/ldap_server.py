import copy
import logging
import re
import threading
import uuid
from datetime import datetime, timezone

from src.config import settings

logger = logging.getLogger(__name__)


class LDAPError(Exception):
    pass


class LDAPAuthError(LDAPError):
    pass


class LDAPSearchError(LDAPError):
    pass


class LDAPInjectionError(LDAPError):
    pass


INJECTION_PATTERNS = [
    r"[*)(|\\]",
    r"(?:^|\s)(?:AND|OR|NOT)\s*\(",
]


def _check_injection(value):
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, value, re.IGNORECASE):
            raise LDAPInjectionError(f"Potential LDAP injection detected: {value}")


class MockLDAPServer:
    def __init__(self, base_dn=None, admin_dn=None, admin_password=None):
        self.base_dn = base_dn or settings.ldap_base_dn
        self.admin_dn = admin_dn or settings.ldap_admin_dn
        self.admin_password = admin_password or settings.ldap_admin_password
        self._directory = {}
        self._bound_connections = {}
        self._connection_pool = {}
        self._pool_lock = threading.Lock()
        self._max_pool_size = 10
        self._tls_enabled = False
        self._allow_anonymous = False
        self._seed_directory()

    def _seed_directory(self):
        self._directory = {
            self.admin_dn: {
                "cn": "admin",
                "userPassword": self.admin_password,
                "objectClass": ["top", "person", "organizationalPerson"],
            },
            f"ou=students,{self.base_dn}": {
                "ou": "students",
                "objectClass": ["top", "organizationalUnit"],
            },
            f"ou=teachers,{self.base_dn}": {
                "ou": "teachers",
                "objectClass": ["top", "organizationalUnit"],
            },
            f"ou=departments,{self.base_dn}": {
                "ou": "departments",
                "objectClass": ["top", "organizationalUnit"],
            },
            f"uid=student001,ou=students,{self.base_dn}": {
                "uid": "student001",
                "cn": "Test Student",
                "mail": "student001@university.edu",
                "userPassword": "pass123",
                "objectClass": ["top", "person", "inetOrgPerson"],
                "memberOf": [f"cn=cs101,ou=courses,{self.base_dn}"],
            },
            f"uid=student002,ou=students,{self.base_dn}": {
                "uid": "student002",
                "cn": "Second Student",
                "mail": "student002@university.edu",
                "userPassword": "pass456",
                "objectClass": ["top", "person", "inetOrgPerson"],
                "memberOf": [],
            },
            f"uid=teacher001,ou=teachers,{self.base_dn}": {
                "uid": "teacher001",
                "cn": "Test Teacher",
                "mail": "teacher001@university.edu",
                "userPassword": "teach123",
                "objectClass": ["top", "person", "inetOrgPerson"],
                "title": "Professor",
            },
            f"cn=cs,ou=departments,{self.base_dn}": {
                "cn": "cs",
                "description": "Computer Science Department",
                "objectClass": ["top", "organizationalUnit"],
            },
            f"cn=math,ou=departments,{self.base_dn}": {
                "cn": "math",
                "description": "Mathematics Department",
                "objectClass": ["top", "organizationalUnit"],
            },
        }

    def reset(self):
        self._directory.clear()
        self._bound_connections.clear()
        self._connection_pool.clear()
        self._seed_directory()

    def bind(self, dn, password):
        logger.info(f"LDAP bind attempt: dn={dn}")
        if not dn and not password:
            if not self._allow_anonymous:
                raise LDAPAuthError("Anonymous bind not allowed")
            conn_id = str(uuid.uuid4())
            self._bound_connections[conn_id] = {"dn": None, "anonymous": True}
            return conn_id
        entry = self._directory.get(dn)
        if not entry:
            raise LDAPAuthError(f"Invalid DN: {dn}")
        if entry.get("userPassword") != password:
            raise LDAPAuthError("Invalid credentials")
        conn_id = str(uuid.uuid4())
        self._bound_connections[conn_id] = {"dn": dn, "anonymous": False}
        return conn_id

    def _check_bound(self, conn_id):
        conn = self._bound_connections.get(conn_id)
        if not conn:
            raise LDAPAuthError("Not bound")
        if conn.get("anonymous"):
            raise LDAPAuthError("Anonymous bind: read-only limited access")
        return conn

    def search(self, conn_id, base_dn, filter_str, scope="subtree", page_size=0, page_cookie=None):
        logger.info(f"LDAP search: base={base_dn}, filter={filter_str}")
        conn = self._bound_connections.get(conn_id)
        if not conn:
            raise LDAPAuthError("Not bound")
        _check_injection(filter_str)
        results = []
        for dn, entry in self._directory.items():
            if scope == "subtree" and not dn.endswith(base_dn):
                continue
            if scope == "onelevel":
                parent = ",".join(dn.split(",")[1:])
                if parent != base_dn:
                    continue
            if self._match_filter(entry, filter_str):
                results.append({"dn": dn, "attributes": copy.deepcopy(entry)})

        if page_size > 0:
            start = 0
            if page_cookie:
                start = int(page_cookie)
            end = start + page_size
            page = results[start:end]
            next_cookie = str(end) if end < len(results) else None
            return {"results": page, "cookie": next_cookie, "total": len(results)}
        return {"results": results, "cookie": None, "total": len(results)}

    def _match_filter(self, entry, filter_str):
        filter_str = filter_str.strip()
        if filter_str.startswith("(") and filter_str.endswith(")"):
            filter_str = filter_str[1:-1]
        if "=" not in filter_str:
            return True
        attr, value = filter_str.split("=", 1)
        attr = attr.strip()
        value = value.strip()
        entry_value = entry.get(attr)
        if entry_value is None:
            return False
        if isinstance(entry_value, list):
            return value in entry_value
        return str(entry_value) == value

    def modify(self, conn_id, dn, changes):
        logger.info(f"LDAP modify: dn={dn}")
        self._check_bound(conn_id)
        entry = self._directory.get(dn)
        if not entry:
            raise LDAPSearchError(f"Entry not found: {dn}")
        for attr, value in changes.items():
            if attr == "userPassword":
                entry[attr] = value
            else:
                entry[attr] = value
        return True

    def add_entry(self, conn_id, dn, attributes):
        self._check_bound(conn_id)
        if dn in self._directory:
            raise LDAPError(f"Entry already exists: {dn}")
        self._directory[dn] = copy.deepcopy(attributes)
        return True

    def delete_entry(self, conn_id, dn):
        self._check_bound(conn_id)
        if dn not in self._directory:
            raise LDAPSearchError(f"Entry not found: {dn}")
        del self._directory[dn]
        return True

    def get_connection(self):
        with self._pool_lock:
            if len(self._connection_pool) >= self._max_pool_size:
                raise LDAPError("Connection pool exhausted")
            conn_id = self.bind(self.admin_dn, self.admin_password)
            self._connection_pool[conn_id] = {
                "created_at": datetime.now(timezone.utc),
                "in_use": True,
            }
            return conn_id

    def release_connection(self, conn_id):
        with self._pool_lock:
            if conn_id in self._connection_pool:
                self._connection_pool[conn_id]["in_use"] = False

    def pool_size(self):
        with self._pool_lock:
            return len(self._connection_pool)

    def enable_tls(self):
        self._tls_enabled = True
        logger.info("TLS enabled for LDAP server")

    def is_tls_enabled(self):
        return self._tls_enabled

    def set_anonymous_access(self, allowed):
        self._allow_anonymous = allowed
