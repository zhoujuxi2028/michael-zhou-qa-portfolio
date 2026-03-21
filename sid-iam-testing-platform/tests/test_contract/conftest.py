import json
import os

import pytest
from jsonschema import validate

from src.helpers.token_factory import create_jwt


CONTRACTS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "contracts", "generated")


@pytest.fixture
def valid_user_token():
    """Generate a valid JWT token for contract testing."""
    return create_jwt(
        {
            "sub": "student001",
            "email": "student001@university.edu",
            "name": "Student One",
            "roles": ["student"],
            "tenant": "default",
            "scope": "openid profile email",
        }
    )


@pytest.fixture
def contract_validator():
    """Utility to validate response against contract schema and record results."""
    results = []

    class Validator:
        def validate_response(self, contract, actual_status, actual_body):
            """Validate an actual response against a contract definition."""
            expected = contract["expected_response"]

            # Validate status code
            assert actual_status == expected["status_code"], (
                f"Contract '{contract['interaction']}' violated: "
                f"expected status {expected['status_code']}, got {actual_status}"
            )

            # Validate response body against JSON schema
            validate(instance=actual_body, schema=expected["schema"])

            results.append(
                {
                    "interaction": contract["interaction"],
                    "status": "PASSED",
                    "expected_status": expected["status_code"],
                    "actual_status": actual_status,
                }
            )

        def validate_output(self, contract, actual_output):
            """Validate a method's return value against contract schema."""
            schema = contract["expected_output"]["schema"]

            if schema.get("type") == "string":
                assert isinstance(actual_output, str), (
                    f"Contract '{contract['interaction']}' violated: "
                    f"expected string, got {type(actual_output).__name__}"
                )
            else:
                # Convert sets to lists for JSON schema validation
                serializable = _make_serializable(actual_output)
                validate(instance=serializable, schema=schema)

            results.append(
                {
                    "interaction": contract["interaction"],
                    "status": "PASSED",
                }
            )

        def get_results(self):
            return results

    return Validator()


@pytest.fixture
def save_contract_report(contract_validator, tmp_path):
    """Save contract verification report after tests complete."""
    yield
    results = contract_validator.get_results()
    if results:
        report_path = tmp_path / "contract-report.json"
        report_path.write_text(json.dumps(results, indent=2))


def _make_serializable(obj):
    """Convert non-JSON-serializable types (sets, etc.) for schema validation."""
    if isinstance(obj, dict):
        return {k: _make_serializable(v) for k, v in obj.items()}
    if isinstance(obj, set):
        return list(obj)
    if isinstance(obj, list):
        return [_make_serializable(item) for item in obj]
    return obj
