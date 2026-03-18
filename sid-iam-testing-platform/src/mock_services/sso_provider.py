import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from src.config import settings
from src.constants.test_users import ALL_USERS
from src.helpers.token_factory import create_jwt, create_saml_assertion, verify_jwt

logger = logging.getLogger(__name__)

app = FastAPI(title="Mock SSO Provider")

# In-memory stores
_used_assertion_ids = set()
_refresh_tokens = {}
_sessions = {}  # user_id -> list of session_ids
_tenant_configs = {}


class SAMLRequest(BaseModel):
    username: str
    password: str
    sp_entity_id: str = "https://sp.university.edu"
    tenant: str = "default"


class OIDCTokenRequest(BaseModel):
    grant_type: str = "authorization_code"
    code: str = ""
    client_id: str = "test-client"
    client_secret: str = "test-secret"
    redirect_uri: str = "https://sp.university.edu/callback"
    username: str = ""
    password: str = ""
    tenant: str = "default"


class OIDCRefreshRequest(BaseModel):
    grant_type: str = "refresh_token"
    refresh_token: str = ""
    client_id: str = "test-client"


class SLORequest(BaseModel):
    session_id: str = ""
    username: str = ""


USERS = ALL_USERS


def reset():
    _used_assertion_ids.clear()
    _refresh_tokens.clear()
    _sessions.clear()
    _tenant_configs.clear()


def _authenticate(username, password):
    user = USERS.get(username)
    if not user or user["password"] != password:
        return None
    return user


@app.post("/saml/sso")
def saml_sso(req: SAMLRequest):
    logger.info(f"SAML SSO request for user={req.username}, tenant={req.tenant}")
    user = _authenticate(req.username, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if req.tenant != "default" and user.get("tenant") != req.tenant:
        raise HTTPException(status_code=403, detail="Tenant mismatch")
    assertion_data = create_saml_assertion(user, audience=req.sp_entity_id)
    assertion_id = f"_saml_{uuid.uuid4().hex}"
    _used_assertion_ids.add(assertion_id)
    session_id = str(uuid.uuid4())
    _sessions.setdefault(user["uid"], []).append(session_id)
    return {
        "status": "success",
        "saml_response": assertion_data,
        "session_id": session_id,
        "relay_state": req.sp_entity_id,
    }


@app.post("/saml/sso/replay")
def saml_sso_replay(assertion_id: str = ""):
    if assertion_id in _used_assertion_ids:
        raise HTTPException(status_code=403, detail="Replay attack detected")
    _used_assertion_ids.add(assertion_id)
    return {"status": "success"}


@app.post("/oidc/token")
def oidc_token(req: OIDCTokenRequest):
    logger.info(f"OIDC token request grant_type={req.grant_type}, user={req.username}")
    if req.grant_type == "authorization_code":
        user = _authenticate(req.username, req.password)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if req.tenant != "default" and user.get("tenant") != req.tenant:
            raise HTTPException(status_code=403, detail="Tenant mismatch")
        id_token = create_jwt(
            {
                "sub": user["uid"],
                "email": user["email"],
                "name": user["display_name"],
                "roles": user["roles"],
                "tenant": user.get("tenant", "default"),
                "iss": "https://idp.university.edu",
                "aud": req.client_id,
            }
        )
        access_token = create_jwt(
            {"sub": user["uid"], "scope": "openid profile email", "tenant": user.get("tenant", "default")}
        )
        refresh_token = str(uuid.uuid4())
        _refresh_tokens[refresh_token] = {
            "user": user,
            "client_id": req.client_id,
            "created_at": datetime.now(timezone.utc),
        }
        session_id = str(uuid.uuid4())
        _sessions.setdefault(user["uid"], []).append(session_id)
        return {
            "status": "success",
            "access_token": access_token,
            "id_token": id_token,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
            "expires_in": settings.jwt_expiration_minutes * 60,
            "session_id": session_id,
        }
    raise HTTPException(status_code=400, detail=f"Unsupported grant_type: {req.grant_type}")


@app.post("/oidc/refresh")
def oidc_refresh(req: OIDCRefreshRequest):
    logger.info("OIDC refresh request")
    rt_data = _refresh_tokens.get(req.refresh_token)
    if not rt_data:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    age = datetime.now(timezone.utc) - rt_data["created_at"]
    if age > timedelta(hours=24):
        _refresh_tokens.pop(req.refresh_token, None)
        raise HTTPException(status_code=401, detail="Refresh token expired")
    user = rt_data["user"]
    new_access = create_jwt(
        {"sub": user["uid"], "scope": "openid profile email", "tenant": user.get("tenant", "default")}
    )
    new_id = create_jwt(
        {
            "sub": user["uid"],
            "email": user["email"],
            "name": user["display_name"],
            "roles": user["roles"],
            "tenant": user.get("tenant", "default"),
            "iss": "https://idp.university.edu",
            "aud": req.client_id,
        }
    )
    new_refresh = str(uuid.uuid4())
    _refresh_tokens.pop(req.refresh_token)
    _refresh_tokens[new_refresh] = {
        "user": user,
        "client_id": req.client_id,
        "created_at": datetime.now(timezone.utc),
    }
    return {
        "status": "success",
        "access_token": new_access,
        "id_token": new_id,
        "refresh_token": new_refresh,
        "token_type": "Bearer",
        "expires_in": settings.jwt_expiration_minutes * 60,
    }


@app.post("/saml/slo")
def saml_slo(req: SLORequest):
    logger.info(f"SAML SLO request user={req.username}")
    user_sessions = _sessions.get(req.username, [])
    if req.session_id and req.session_id in user_sessions:
        user_sessions.remove(req.session_id)
    elif req.username in _sessions:
        _sessions[req.username] = []
    return {"status": "success", "message": "Logged out"}


@app.get("/oidc/userinfo")
def oidc_userinfo(authorization: str = ""):
    logger.info("OIDC userinfo request")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization[7:]
    try:
        decoded = verify_jwt(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}") from e
    uid = decoded.get("sub")
    user = USERS.get(uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "sub": user["uid"],
        "email": user["email"],
        "name": user["display_name"],
        "roles": user["roles"],
        "tenant": user.get("tenant", "default"),
    }


@app.get("/idp/metadata")
def idp_metadata():
    return {
        "issuer": "https://idp.university.edu",
        "sso_url": "/saml/sso",
        "slo_url": "/saml/slo",
        "oidc_token_url": "/oidc/token",
        "oidc_userinfo_url": "/oidc/userinfo",
        "supported_bindings": ["urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"],
        "signing_algorithm": "RSA-SHA256",
        "certificate": "MIIC...mock-cert-data...==",
    }


def get_active_sessions(username):
    return _sessions.get(username, [])
