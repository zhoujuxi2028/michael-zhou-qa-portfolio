import base64
import hashlib
import hmac
import json
import uuid
from datetime import datetime, timedelta, timezone

import jwt

from src.config import settings


def create_jwt(payload, secret=None, algorithm=None, expires_minutes=None):
    secret = secret or settings.sso_secret_key
    algorithm = algorithm or settings.jwt_algorithm
    expires_minutes = expires_minutes or settings.jwt_expiration_minutes
    now = datetime.now(timezone.utc)
    token_payload = {
        **payload,
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(token_payload, secret, algorithm=algorithm)


def verify_jwt(token, secret=None, algorithm=None):
    secret = secret or settings.sso_secret_key
    algorithm = algorithm or settings.jwt_algorithm
    return jwt.decode(token, secret, algorithms=[algorithm])


def create_saml_assertion(user, issuer="https://idp.university.edu", audience="https://sp.university.edu", sign=True):
    assertion_id = f"_saml_{uuid.uuid4().hex}"
    now = datetime.now(timezone.utc)
    assertion = {
        "id": assertion_id,
        "issuer": issuer,
        "audience": audience,
        "subject": user.get("uid", user.get("username", "unknown")),
        "attributes": {
            "email": user.get("email", ""),
            "displayName": user.get("display_name", ""),
            "roles": user.get("roles", []),
            "tenant": user.get("tenant", "default"),
        },
        "conditions": {
            "not_before": now.isoformat(),
            "not_on_or_after": (now + timedelta(minutes=5)).isoformat(),
        },
        "issue_instant": now.isoformat(),
    }
    encoded = base64.b64encode(json.dumps(assertion).encode()).decode()
    if sign:
        sig = hmac.new(settings.sso_secret_key.encode(), encoded.encode(), hashlib.sha256).hexdigest()
        return {"assertion": encoded, "signature": sig}
    return {"assertion": encoded, "signature": None}


def verify_saml_assertion(assertion_data, secret=None):
    secret = secret or settings.sso_secret_key
    encoded = assertion_data["assertion"]
    signature = assertion_data.get("signature")
    if not signature:
        raise ValueError("Missing SAML assertion signature")
    expected = hmac.new(secret.encode(), encoded.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise ValueError("Invalid SAML assertion signature")
    decoded = json.loads(base64.b64decode(encoded))
    not_on_or_after = datetime.fromisoformat(decoded["conditions"]["not_on_or_after"])
    if datetime.now(timezone.utc) > not_on_or_after:
        raise ValueError("SAML assertion expired")
    return decoded


def create_expired_jwt(payload, secret=None, algorithm=None):
    secret = secret or settings.sso_secret_key
    algorithm = algorithm or settings.jwt_algorithm
    past = datetime.now(timezone.utc) - timedelta(hours=1)
    token_payload = {
        **payload,
        "iat": past - timedelta(hours=1),
        "exp": past,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(token_payload, secret, algorithm=algorithm)
