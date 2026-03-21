"""
SSO Provider Contract Tests

Consumer-Driven Contract Testing: AuthClient (consumer) ↔ SSO Provider (provider)

These tests verify that the SSO Provider's actual HTTP responses conform to
the contracts defined by the AuthClient consumer. If the provider changes its
API in a breaking way, these tests fail — catching the issue before deployment.

Test flow (mirrors Pact):
  1. Load contract (consumer's expectations)
  2. Send real request to provider
  3. Validate response matches contract schema
"""

import pytest

from .contracts.sso_contracts import (
    IDP_METADATA,
    OIDC_TOKEN_INVALID_CREDENTIALS,
    OIDC_TOKEN_SUCCESS,
    OIDC_USERINFO_NO_TOKEN,
    OIDC_USERINFO_SUCCESS,
    SAML_LOGIN_INVALID_CREDENTIALS,
    SAML_LOGIN_SUCCESS,
    SAML_LOGIN_TENANT_MISMATCH,
    SAML_SLO_SUCCESS,
)


@pytest.mark.contract
class TestSSOProviderContracts:
    """Verify SSO Provider meets AuthClient's contract expectations."""

    # --- SAML Contracts ---

    def test_saml_login_success_contract(self, sso_provider, contract_validator):
        """Contract: SAML SSO login returns assertion + session_id."""
        contract = SAML_LOGIN_SUCCESS
        resp = sso_provider.post(contract["request"]["path"], json=contract["request"]["body"])
        contract_validator.validate_response(contract, resp.status_code, resp.json())

    def test_saml_login_invalid_credentials_contract(self, sso_provider, contract_validator):
        """Contract: Invalid credentials return 401 with detail message."""
        contract = SAML_LOGIN_INVALID_CREDENTIALS
        resp = sso_provider.post(contract["request"]["path"], json=contract["request"]["body"])
        contract_validator.validate_response(contract, resp.status_code, resp.json())

    def test_saml_login_tenant_mismatch_contract(self, sso_provider, contract_validator):
        """Contract: Tenant mismatch returns 403."""
        contract = SAML_LOGIN_TENANT_MISMATCH
        resp = sso_provider.post(contract["request"]["path"], json=contract["request"]["body"])
        contract_validator.validate_response(contract, resp.status_code, resp.json())

    def test_saml_slo_contract(self, sso_provider, contract_validator):
        """Contract: SAML SLO returns success status."""
        # First login to create a session
        login_resp = sso_provider.post("/saml/sso", json=SAML_LOGIN_SUCCESS["request"]["body"])
        session_id = login_resp.json()["session_id"]

        contract = SAML_SLO_SUCCESS
        resp = sso_provider.post(
            contract["request"]["path"],
            json={"username": "student001", "session_id": session_id},
        )
        contract_validator.validate_response(contract, resp.status_code, resp.json())

    # --- OIDC Contracts ---

    def test_oidc_token_success_contract(self, sso_provider, contract_validator):
        """Contract: OIDC token returns access_token + id_token + refresh_token."""
        contract = OIDC_TOKEN_SUCCESS
        resp = sso_provider.post(contract["request"]["path"], json=contract["request"]["body"])
        contract_validator.validate_response(contract, resp.status_code, resp.json())

    def test_oidc_token_invalid_credentials_contract(self, sso_provider, contract_validator):
        """Contract: Invalid OIDC credentials return 401."""
        contract = OIDC_TOKEN_INVALID_CREDENTIALS
        resp = sso_provider.post(contract["request"]["path"], json=contract["request"]["body"])
        contract_validator.validate_response(contract, resp.status_code, resp.json())

    def test_oidc_userinfo_success_contract(self, sso_provider, contract_validator, valid_user_token):
        """Contract: Userinfo returns sub + email + name + roles + tenant."""
        contract = OIDC_USERINFO_SUCCESS
        resp = sso_provider.get(
            contract["request"]["path"],
            headers={"authorization": f"Bearer {valid_user_token}"},
        )
        contract_validator.validate_response(contract, resp.status_code, resp.json())

    def test_oidc_userinfo_no_token_contract(self, sso_provider, contract_validator):
        """Contract: Missing token returns 401."""
        contract = OIDC_USERINFO_NO_TOKEN
        resp = sso_provider.get(
            contract["request"]["path"],
            headers={"authorization": ""},
        )
        contract_validator.validate_response(contract, resp.status_code, resp.json())

    # --- Metadata Contract ---

    def test_idp_metadata_contract(self, sso_provider, contract_validator):
        """Contract: IdP metadata returns all required endpoint URLs."""
        contract = IDP_METADATA
        resp = sso_provider.get(contract["request"]["path"])
        contract_validator.validate_response(contract, resp.status_code, resp.json())


@pytest.mark.contract
class TestSSOContractBackwardCompatibility:
    """Verify that provider changes don't break existing consumer expectations.

    These tests simulate what happens when a provider evolves:
    - Adding new fields should NOT break consumers (open for extension)
    - Removing required fields SHOULD break (contract violation)
    - Changing field types SHOULD break (contract violation)
    """

    def test_saml_response_contains_all_consumer_required_fields(self, sso_provider):
        """Consumer depends on: status, saml_response, session_id, relay_state."""
        resp = sso_provider.post("/saml/sso", json=SAML_LOGIN_SUCCESS["request"]["body"])
        body = resp.json()
        required_fields = {"status", "saml_response", "session_id", "relay_state"}
        assert required_fields.issubset(
            body.keys()
        ), f"Missing consumer-required fields: {required_fields - body.keys()}"

    def test_oidc_token_response_contains_all_consumer_required_fields(self, sso_provider):
        """Consumer depends on: access_token, id_token, refresh_token, token_type, expires_in."""
        resp = sso_provider.post("/oidc/token", json=OIDC_TOKEN_SUCCESS["request"]["body"])
        body = resp.json()
        required_fields = {
            "status",
            "access_token",
            "id_token",
            "refresh_token",
            "token_type",
            "expires_in",
            "session_id",
        }
        assert required_fields.issubset(
            body.keys()
        ), f"Missing consumer-required fields: {required_fields - body.keys()}"

    def test_token_type_is_always_bearer(self, sso_provider):
        """Consumer hardcodes Bearer token handling — type must not change."""
        resp = sso_provider.post("/oidc/token", json=OIDC_TOKEN_SUCCESS["request"]["body"])
        assert resp.json()["token_type"] == "Bearer"

    def test_expires_in_is_positive_integer(self, sso_provider):
        """Consumer uses expires_in for token refresh scheduling."""
        resp = sso_provider.post("/oidc/token", json=OIDC_TOKEN_SUCCESS["request"]["body"])
        expires_in = resp.json()["expires_in"]
        assert isinstance(expires_in, int) and expires_in > 0
