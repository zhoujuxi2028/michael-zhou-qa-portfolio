import logging

from src.helpers.token_factory import verify_jwt, verify_saml_assertion

logger = logging.getLogger(__name__)


class AuthClient:
    def __init__(
        self,
        sso_client=None,
        ldap_server=None,
        kerberos_kdc=None,
        zero_trust_engine=None,
        session_manager=None,
        mfa_provider=None,
    ):
        self.sso = sso_client
        self.ldap = ldap_server
        self.kdc = kerberos_kdc
        self.zt = zero_trust_engine
        self.sessions = session_manager
        self.mfa = mfa_provider

    # --- SSO ---
    def saml_login(self, username, password, sp_entity_id="https://sp.university.edu", tenant="default"):
        resp = self.sso.post(
            "/saml/sso",
            json={
                "username": username,
                "password": password,
                "sp_entity_id": sp_entity_id,
                "tenant": tenant,
            },
        )
        return (
            resp.json()
            if resp.status_code == 200
            else {"status": "error", "code": resp.status_code, "detail": resp.json().get("detail", "")}
        )

    def oidc_login(self, username, password, client_id="test-client", tenant="default"):
        resp = self.sso.post(
            "/oidc/token",
            json={
                "grant_type": "authorization_code",
                "username": username,
                "password": password,
                "client_id": client_id,
                "tenant": tenant,
            },
        )
        return (
            resp.json()
            if resp.status_code == 200
            else {"status": "error", "code": resp.status_code, "detail": resp.json().get("detail", "")}
        )

    def oidc_refresh(self, refresh_token, client_id="test-client"):
        resp = self.sso.post(
            "/oidc/refresh",
            json={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": client_id,
            },
        )
        return (
            resp.json()
            if resp.status_code == 200
            else {"status": "error", "code": resp.status_code, "detail": resp.json().get("detail", "")}
        )

    def saml_logout(self, username, session_id=""):
        resp = self.sso.post("/saml/slo", json={"username": username, "session_id": session_id})
        return resp.json()

    def get_userinfo(self, access_token):
        resp = self.sso.get("/oidc/userinfo", params={"authorization": f"Bearer {access_token}"})
        if resp.status_code == 200:
            return resp.json()
        return {"status": "error", "code": resp.status_code, "detail": resp.json().get("detail", "")}

    def get_idp_metadata(self):
        resp = self.sso.get("/idp/metadata")
        return resp.json()

    def check_replay(self, assertion_id):
        resp = self.sso.post("/saml/sso/replay", params={"assertion_id": assertion_id})
        if resp.status_code == 200:
            return {"status": "success"}
        return {"status": "error", "code": resp.status_code, "detail": resp.json().get("detail", "")}

    def verify_saml(self, assertion_data):
        return verify_saml_assertion(assertion_data)

    def verify_token(self, token):
        return verify_jwt(token)

    # --- LDAP ---
    def ldap_bind(self, dn, password):
        return self.ldap.bind(dn, password)

    def ldap_search(self, conn_id, base_dn, filter_str, scope="subtree", page_size=0, page_cookie=None):
        return self.ldap.search(conn_id, base_dn, filter_str, scope=scope, page_size=page_size, page_cookie=page_cookie)

    def ldap_modify(self, conn_id, dn, changes):
        return self.ldap.modify(conn_id, dn, changes)

    def ldap_get_connection(self):
        return self.ldap.get_connection()

    def ldap_release_connection(self, conn_id):
        return self.ldap.release_connection(conn_id)

    # --- Kerberos ---
    def request_tgt(self, principal, password):
        if not self.kdc:
            raise NotImplementedError("Kerberos KDC not configured")
        return self.kdc.request_tgt(principal, password)

    def request_service_ticket(self, tgt, service_principal):
        if not self.kdc:
            raise NotImplementedError("Kerberos KDC not configured")
        return self.kdc.request_service_ticket(tgt, service_principal)

    def validate_ticket(self, ticket):
        if not self.kdc:
            raise NotImplementedError("Kerberos KDC not configured")
        return self.kdc.validate_ticket(ticket)

    def renew_ticket(self, ticket):
        if not self.kdc:
            raise NotImplementedError("Kerberos KDC not configured")
        return self.kdc.renew_ticket(ticket)

    # --- Zero Trust ---
    def evaluate_device(self, device_info):
        if not self.zt:
            raise NotImplementedError("Zero Trust engine not configured")
        return self.zt.evaluate_device(device_info)

    def evaluate_access(self, context):
        if not self.zt:
            raise NotImplementedError("Zero Trust engine not configured")
        return self.zt.evaluate_access(context)

    def calculate_risk_score(self, context):
        if not self.zt:
            raise NotImplementedError("Zero Trust engine not configured")
        return self.zt.calculate_risk_score(context)

    # --- Session ---
    def create_session(self, user_id, metadata=None):
        if not self.sessions:
            raise NotImplementedError("Session manager not configured")
        return self.sessions.create_session(user_id, metadata)

    def validate_session(self, session_id):
        if not self.sessions:
            raise NotImplementedError("Session manager not configured")
        return self.sessions.validate_session(session_id)

    def invalidate_session(self, session_id):
        if not self.sessions:
            raise NotImplementedError("Session manager not configured")
        return self.sessions.invalidate_session(session_id)

    # --- MFA ---
    def mfa_register(self, user_id):
        if not self.mfa:
            raise NotImplementedError("MFA provider not configured")
        return self.mfa.register(user_id)

    def mfa_verify(self, user_id, code):
        if not self.mfa:
            raise NotImplementedError("MFA provider not configured")
        return self.mfa.verify(user_id, code)

    def mfa_recovery(self, user_id, recovery_code):
        if not self.mfa:
            raise NotImplementedError("MFA provider not configured")
        return self.mfa.use_recovery_code(user_id, recovery_code)
