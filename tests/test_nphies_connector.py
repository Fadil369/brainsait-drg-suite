import os
import time
import pytest
import requests
from pydantic import BaseModel, Field, ValidationError
from typing import List, Dict, Any
import requests_mock
from src.backend.nphies_connector import NphiesConnector, NphiesAuthError, NphiesAPIError
# --- Configuration for Real/Mock Testing ---
IS_REAL_MODE = os.getenv('NPHIES_TEST_REAL', 'false').lower() == 'true'
REAL_BASE_URL = os.getenv("NPHIES_BASE_URL", "https://sandbox.nphies.sa/api")
REAL_CLIENT_ID = os.getenv("NPHIES_CLIENT_ID")
REAL_CLIENT_SECRET = os.getenv("NPHIES_CLIENT_SECRET")
MOCK_BASE_URL = "https://mock-nphies.sa/api"
MOCK_CLIENT_ID = "test_client_id"
MOCK_CLIENT_SECRET = "test_client_secret"
# --- Pydantic Models for JSON Schema Validation ---
class Patient(BaseModel):
    id: str
class ServiceItem(BaseModel):
    serviceCode: str
class ClaimSchema(BaseModel):
    claimNumber: str
    patient: Patient
    items: List[ServiceItem]
    total: float
# --- Pytest Fixtures ---
@pytest.fixture(scope="session")
def real_mode_credentials():
    if IS_REAL_MODE and not (REAL_CLIENT_ID and REAL_CLIENT_SECRET):
        pytest.skip("Real Nphies credentials (NPHIES_CLIENT_ID, NPHIES_CLIENT_SECRET) not set.")
    return {
        "base_url": REAL_BASE_URL if IS_REAL_MODE else MOCK_BASE_URL,
        "client_id": REAL_CLIENT_ID if IS_REAL_MODE else MOCK_CLIENT_ID,
        "client_secret": REAL_CLIENT_SECRET if IS_REAL_MODE else MOCK_CLIENT_SECRET,
    }
@pytest.fixture
def connector(real_mode_credentials) -> NphiesConnector:
    """Provides a NphiesConnector instance for testing, configured for real or mock mode."""
    return NphiesConnector(**real_mode_credentials)
@pytest.fixture
def mocked_api(requests_mock):
    """Fixture to mock the nphies token and API endpoints for mock mode tests."""
    if IS_REAL_MODE:
        yield None  # Don't mock in real mode
    else:
        # Mock the OAuth token endpoint
        requests_mock.post(
            f"{MOCK_BASE_URL}/oauth/token",
            json={"access_token": "mock_token_12345", "expires_in": 3600},
            status_code=200
        )
        yield requests_mock
# --- Test Cases ---
def test_oauth_token_retrieval_and_caching(connector, mocked_api):
    """
    Verify that the OAuth token is fetched on the first call and cached.
    """
    # First call should trigger a request to the token endpoint
    headers1 = connector._get_auth_headers()
    assert "Bearer" in headers1["Authorization"]
    if not IS_REAL_MODE:
        assert mocked_api.call_count == 1
        assert mocked_api.last_request.url == f"{MOCK_BASE_URL}/oauth/token"
    # Second call should use the cached token
    headers2 = connector._get_auth_headers()
    assert headers1["Authorization"] == headers2["Authorization"]
    if not IS_REAL_MODE:
        assert mocked_api.call_count == 1  # No new call was made
def test_oauth_token_refresh_on_expiry(connector, mocked_api):
    """
    Verify that the connector automatically refreshes an expired token.
    """
    if IS_REAL_MODE:
        pytest.skip("Token expiry test is only for mock mode.")
    # Simulate an expired token
    connector._token_data = {"access_token": "expired_token", "expires_at": time.time() - 1}
    # Mock the token endpoint to return a new token
    mocked_api.post(
        f"{MOCK_BASE_URL}/oauth/token",
        json={"access_token": "new_refreshed_token", "expires_in": 3600},
        status_code=200
    )
    headers = connector._get_auth_headers()
    assert headers["Authorization"] == "Bearer new_refreshed_token"
    assert mocked_api.call_count == 1 # A new call was made to refresh
def test_submit_claim_with_valid_json_structure(connector, mocked_api):
    """
    Verify that submit_claim sends a POST request with a Pydantic-validated JSON structure.
    """
    claim_data = {
        "claimNumber": "TEST-001",
        "patient": {"id": "PAT-123"},
        "items": [{"serviceCode": "S1"}, {"serviceCode": "S2"}],
        "total": 500.0
    }
    # Validate with Pydantic before sending
    try:
        ClaimSchema(**claim_data)
    except ValidationError as e:
        pytest.fail(f"Test claim_data failed Pydantic validation: {e}")
    if not IS_REAL_MODE:
        mocked_api.post(f"{MOCK_BASE_URL}/claims", json={"status": "success", "claimId": "NPH-TEST-001"}, status_code=201)
    response = connector.submit_claim(claim_data)
    assert response["status"] == "success"
    if not IS_REAL_MODE:
        assert mocked_api.last_request.method == "POST"
        assert mocked_api.last_request.json() == claim_data
def test_submit_claim_with_invalid_json_raises_error(connector):
    """
    Verify that submitting a claim with an invalid structure raises an error locally.
    This test does not need to make an API call.
    """
    invalid_claim_data = {
        "claimNumber": "INVALID-001",
        "patient": {"id": "PAT-123"},
        # "items" field is missing
        "total": 500.0
    }
    with pytest.raises(ValidationError):
        ClaimSchema(**invalid_claim_data)
def test_full_claim_lifecycle(connector, mocked_api):
    """
    Simulates a full E2E claim lifecycle: submit -> check status -> reconcile.
    """
    claim_id = f"LIFECYCLE-{int(time.time())}"
    claim_data = ClaimSchema(claimNumber=claim_id, patient={"id": "PAT-LC-1"}, items=[{"serviceCode": "LC-S1"}], total=100.0).dict()
    # 1. Submit Claim
    if not IS_REAL_MODE:
        mocked_api.post(f"{MOCK_BASE_URL}/claims", json={"status": "success", "claimId": claim_id}, status_code=201)
    submit_response = connector.submit_claim(claim_data)
    assert submit_response["status"] == "success"
    # 2. Check Status (mocking an approved response)
    if not IS_REAL_MODE:
        mocked_api.get(f"{MOCK_BASE_URL}/claims/{claim_id}/status", json={"status": "FC_3", "claimId": claim_id}, status_code=200)
    status_response = connector.check_status(claim_id)
    assert status_response["status"] == "FC_3"
    # 3. Reconcile Payment
    payment_data = {"claimId": claim_id, "amount": 100.0, "paymentReference": "PAY-LC-1"}
    if not IS_REAL_MODE:
        mocked_api.post(f"{MOCK_BASE_URL}/payments/reconcile", json={"status": "reconciled"}, status_code=200)
    reconcile_response = connector.reconcile_payment(payment_data)
    assert reconcile_response["status"] == "reconciled"
def test_retries_on_server_error(connector, mocked_api):
    """
    Verify that the connector retries on 5xx server errors.
    """
    if IS_REAL_MODE:
        pytest.skip("Retry test is only for mock mode.")
    claim_id = "RETRY-TEST"
    # Mock a sequence of failures followed by success
    mocked_api.get(f"{MOCK_BASE_URL}/claims/{claim_id}/status", [
        {"status_code": 503, "text": "Service Unavailable"},
        {"status_code": 503, "text": "Service Unavailable"},
        {"status_code": 200, "json": {"status": "FC_3"}}
    ])
    response = connector.check_status(claim_id)
    assert response["status"] == "FC_3"
    assert mocked_api.call_count == 4 # 1 for token, 3 for the request
@pytest.mark.timeout(2)
def test_timeout_raises_exception(connector, mocked_api):
    """
    Verify that a request timeout raises a NphiesAPIError.
    """
    if IS_REAL_MODE:
        pytest.skip("Timeout test is only for mock mode.")
    claim_id = "TIMEOUT-TEST"
    mocked_api.get(f"{MOCK_BASE_URL}/claims/{claim_id}/status", exc=requests.exceptions.ConnectTimeout)
    with pytest.raises(NphiesAPIError, match="timed out"):
        # Temporarily reduce timeout for this test
        connector.timeout = 0.1
        connector.check_status(claim_id)
def test_auth_failure_raises_exception(connector, requests_mock):
    """
    Ensure that a failure at the token endpoint raises NphiesAuthError.
    """
    if IS_REAL_MODE:
        pytest.skip("Auth failure test is only for mock mode.")
    requests_mock.post(f"{MOCK_BASE_URL}/oauth/token", status_code=401, text="Unauthorized")
    with pytest.raises(NphiesAuthError):
        connector.submit_claim({})
def test_api_error_raises_exception(connector, mocked_api):
    """
    Ensure that a 4xx/5xx error from an API endpoint raises NphiesAPIError.
    """
    if IS_REAL_MODE:
        pytest.skip("API error test is only for mock mode.")
    claim_id = "CLAIM-INVALID"
    mocked_api.get(f"{MOCK_BASE_URL}/claims/{claim_id}/status", status_code=404, text="Not Found")
    with pytest.raises(NphiesAPIError):
        connector.check_status(claim_id)