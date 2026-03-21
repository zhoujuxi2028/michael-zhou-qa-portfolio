"""
SSO Provider API Contracts

Consumer-Driven Contracts between AuthClient (consumer) and SSO Provider (provider).
Each contract defines: the interaction name, request format, and expected response schema.

This mirrors the Pact workflow:
  1. Consumer (AuthClient) defines what it expects
  2. Contract file captures the agreement
  3. Provider (SSO Provider) verifies it meets the contract
"""

# --- SAML SSO Login Contract ---

SAML_LOGIN_SUCCESS = {
    "interaction": "SAML SSO login with valid credentials",
    "request": {
        "method": "POST",
        "path": "/saml/sso",
        "body": {
            "username": "student001",
            "password": "pass123",
            "sp_entity_id": "https://sp.university.edu",
            "tenant": "default",
        },
    },
    "expected_response": {
        "status_code": 200,
        "schema": {
            "type": "object",
            "required": ["status", "saml_response", "session_id", "relay_state"],
            "properties": {
                "status": {"type": "string", "enum": ["success"]},
                "saml_response": {"type": "string", "minLength": 1},
                "session_id": {"type": "string", "minLength": 1},
                "relay_state": {"type": "string"},
            },
            "additionalProperties": False,
        },
    },
}

SAML_LOGIN_INVALID_CREDENTIALS = {
    "interaction": "SAML SSO login with invalid credentials",
    "request": {
        "method": "POST",
        "path": "/saml/sso",
        "body": {
            "username": "student001",
            "password": "wrong_password",
            "sp_entity_id": "https://sp.university.edu",
            "tenant": "default",
        },
    },
    "expected_response": {
        "status_code": 401,
        "schema": {
            "type": "object",
            "required": ["detail"],
            "properties": {
                "detail": {"type": "string"},
            },
        },
    },
}

SAML_LOGIN_TENANT_MISMATCH = {
    "interaction": "SAML SSO login with wrong tenant",
    "request": {
        "method": "POST",
        "path": "/saml/sso",
        "body": {
            "username": "student001",
            "password": "pass123",
            "sp_entity_id": "https://sp.university.edu",
            "tenant": "wrong_tenant",
        },
    },
    "expected_response": {
        "status_code": 403,
        "schema": {
            "type": "object",
            "required": ["detail"],
            "properties": {
                "detail": {"type": "string"},
            },
        },
    },
}


# --- OIDC Token Contract ---

OIDC_TOKEN_SUCCESS = {
    "interaction": "OIDC token request with valid credentials",
    "request": {
        "method": "POST",
        "path": "/oidc/token",
        "body": {
            "grant_type": "authorization_code",
            "username": "student001",
            "password": "pass123",
            "client_id": "test-client",
            "tenant": "default",
        },
    },
    "expected_response": {
        "status_code": 200,
        "schema": {
            "type": "object",
            "required": [
                "status",
                "access_token",
                "id_token",
                "refresh_token",
                "token_type",
                "expires_in",
                "session_id",
            ],
            "properties": {
                "status": {"type": "string", "enum": ["success"]},
                "access_token": {"type": "string", "minLength": 1},
                "id_token": {"type": "string", "minLength": 1},
                "refresh_token": {"type": "string", "minLength": 1},
                "token_type": {"type": "string", "enum": ["Bearer"]},
                "expires_in": {"type": "integer", "minimum": 1},
                "session_id": {"type": "string", "minLength": 1},
            },
            "additionalProperties": False,
        },
    },
}

OIDC_TOKEN_INVALID_CREDENTIALS = {
    "interaction": "OIDC token request with invalid credentials",
    "request": {
        "method": "POST",
        "path": "/oidc/token",
        "body": {
            "grant_type": "authorization_code",
            "username": "student001",
            "password": "wrong_password",
            "client_id": "test-client",
            "tenant": "default",
        },
    },
    "expected_response": {
        "status_code": 401,
        "schema": {
            "type": "object",
            "required": ["detail"],
            "properties": {
                "detail": {"type": "string"},
            },
        },
    },
}


# --- OIDC Userinfo Contract ---

OIDC_USERINFO_SUCCESS = {
    "interaction": "OIDC userinfo with valid token",
    "request": {
        "method": "GET",
        "path": "/oidc/userinfo",
        "headers": {"authorization": "Bearer {valid_token}"},
    },
    "expected_response": {
        "status_code": 200,
        "schema": {
            "type": "object",
            "required": ["sub", "email", "name", "roles", "tenant"],
            "properties": {
                "sub": {"type": "string"},
                "email": {"type": "string", "format": "email"},
                "name": {"type": "string"},
                "roles": {"type": "array", "items": {"type": "string"}},
                "tenant": {"type": "string"},
            },
            "additionalProperties": False,
        },
    },
}

OIDC_USERINFO_NO_TOKEN = {
    "interaction": "OIDC userinfo without bearer token",
    "request": {
        "method": "GET",
        "path": "/oidc/userinfo",
        "headers": {"authorization": ""},
    },
    "expected_response": {
        "status_code": 401,
        "schema": {
            "type": "object",
            "required": ["detail"],
            "properties": {
                "detail": {"type": "string"},
            },
        },
    },
}


# --- SAML SLO Contract ---

SAML_SLO_SUCCESS = {
    "interaction": "SAML Single Logout",
    "request": {
        "method": "POST",
        "path": "/saml/slo",
        "body": {
            "username": "student001",
            "session_id": "{valid_session_id}",
        },
    },
    "expected_response": {
        "status_code": 200,
        "schema": {
            "type": "object",
            "required": ["status", "message"],
            "properties": {
                "status": {"type": "string", "enum": ["success"]},
                "message": {"type": "string"},
            },
            "additionalProperties": False,
        },
    },
}


# --- IdP Metadata Contract ---

IDP_METADATA = {
    "interaction": "Get IdP metadata",
    "request": {
        "method": "GET",
        "path": "/idp/metadata",
    },
    "expected_response": {
        "status_code": 200,
        "schema": {
            "type": "object",
            "required": [
                "issuer",
                "sso_url",
                "slo_url",
                "oidc_token_url",
                "oidc_userinfo_url",
                "supported_bindings",
                "signing_algorithm",
                "certificate",
            ],
            "properties": {
                "issuer": {"type": "string"},
                "sso_url": {"type": "string"},
                "slo_url": {"type": "string"},
                "oidc_token_url": {"type": "string"},
                "oidc_userinfo_url": {"type": "string"},
                "supported_bindings": {
                    "type": "array",
                    "items": {"type": "string"},
                },
                "signing_algorithm": {"type": "string"},
                "certificate": {"type": "string"},
            },
            "additionalProperties": False,
        },
    },
}
