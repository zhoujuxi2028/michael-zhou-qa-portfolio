import os
from dataclasses import dataclass


@dataclass
class Settings:
    sso_host: str = "localhost"
    sso_port: int = 8000
    sso_secret_key: str = "test-secret-key-do-not-use-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 30
    ldap_base_dn: str = "dc=university,dc=edu"
    ldap_admin_dn: str = "cn=admin,dc=university,dc=edu"
    ldap_admin_password: str = "admin"
    krb_realm: str = "UNIVERSITY.EDU"
    krb_tgt_lifetime_hours: int = 10
    krb_st_lifetime_hours: int = 1
    warehouse_db: str = ":memory:"
    log_level: str = "INFO"

    @classmethod
    def from_env(cls):
        return cls(
            sso_host=os.getenv("SSO_HOST", "localhost"),
            sso_port=int(os.getenv("SSO_PORT", "8000")),
            sso_secret_key=os.getenv("SSO_SECRET_KEY", "test-secret-key-do-not-use-in-production"),
            jwt_algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
            jwt_expiration_minutes=int(os.getenv("JWT_EXPIRATION_MINUTES", "30")),
            ldap_base_dn=os.getenv("LDAP_BASE_DN", "dc=university,dc=edu"),
            ldap_admin_dn=os.getenv("LDAP_ADMIN_DN", "cn=admin,dc=university,dc=edu"),
            ldap_admin_password=os.getenv("LDAP_ADMIN_PASSWORD", "admin"),
            krb_realm=os.getenv("KRB_REALM", "UNIVERSITY.EDU"),
            krb_tgt_lifetime_hours=int(os.getenv("KRB_TGT_LIFETIME_HOURS", "10")),
            krb_st_lifetime_hours=int(os.getenv("KRB_ST_LIFETIME_HOURS", "1")),
            warehouse_db=os.getenv("WAREHOUSE_DB", ":memory:"),
            log_level=os.getenv("LOG_LEVEL", "INFO"),
        )


settings = Settings.from_env()
