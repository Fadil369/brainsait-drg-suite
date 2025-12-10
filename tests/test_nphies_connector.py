import pytest
import requests_mock
from src.backend.nphies_connector import NphiesConnector, NphiesAuthError, NphiesAPIError
MOCK_BASE_URL = "https://mock-nphies.sa/api"
CLIENT_ID = "test_client_id"
CLIENT_SECRET = "test_client_secret"
@pytest.fixture
def connector() -> NphiesConnector:
    """Provides a NphiesConnector instance for testing."""
    return NphiesConnector(MOCK_BASE_URL, CLIENT_ID, CLIENT_SECRET)
@pytest.fixture
def mocked_api(requests_mock):
    """Fixture to mock the nphies token and API endpoints."""
    # Mock the OAuth token endpoint
    requests_mock.post(
        f"{MOCK_BASE_URL}/oauth/token",
        json={"access_token": "mock_token_12345", "expires_in": 3600},
        status_code=200
    )
    return requests_mock
def test_oauth_token_retrieval_and_caching(connector, mocked_api):
    """
    Test 1: Verify that the OAuth token is fetched on the first call
    and cached for subsequent calls.
    """
    # First call should trigger a POST to the token endpoint
    headers1 = connector._get_auth_headers()
    assert headers1["Authorization"] == "Bearer mock_token_12345"
    assert mocked_api.call_count == 1
    assert mocked_api.last_request.url == f"{MOCK_BASE_URL}/oauth/token"
    # Second call should use the cached token, not make a new request
    headers2 = connector._get_auth_headers()
    assert headers2["Authorization"] == "Bearer mock_token_12345"
    assert mocked_api.call_count == 1 # No new call was made
def test_submit_claim_json_structure(connector, mocked_api):
    """
    Test 2: Verify that submit_claim sends a POST request with the correct
    JSON structure and authorization headers.
    """
    mocked_api.post(f"{MOCK_BASE_URL}/claims", json={"status": "success"}, status_code=201)
    claim_data = {
        "claimNumber": "TEST-001",
        "patient": {"id": "PAT-123"},
        "items": [{"serviceCode": "S1"}, {"serviceCode": "S2"}],
        "total": 500.0
    }
    response = connector.submit_claim(claim_data)
    assert response == {"status": "success"}
    assert mocked_api.last_request.method == "POST"
    assert mocked_api.last_request.url == f"{MOCK_BASE_URL}/claims"
    assert mocked_api.last_request.json() == claim_data
    assert "Authorization" in mocked_api.last_request.headers
    assert mocked_api.last_request.headers["Authorization"] == "Bearer mock_token_12345"
def test_check_status_approved_fc3(connector, mocked_api):
    """
    Test 3: Simulate a response where the claim status is 'FC_3' (Approved)
    and ensure the connector returns the correct data.
    """
    claim_id = "CLAIM-XYZ-789"
    mock_response = {
        "claimId": claim_id,
        "status": "FC_3",
        "statusDescription": "Claim Approved",
        "adjudicationDate": "2024-01-15T10:00:00Z"
    }
    mocked_api.get(f"{MOCK_BASE_URL}/claims/{claim_id}/status", json=mock_response, status_code=200)
    status = connector.check_status(claim_id)
    assert status["status"] == "FC_3"
    assert status["claimId"] == claim_id
    # In a real application, you would now use this response to update your local DB.
    # This test just verifies the connector correctly parses and returns the data.
def test_auth_failure_raises_exception(connector, requests_mock):
    """
    Test 4: Ensure that a failure at the token endpoint raises NphiesAuthError.
    """
    requests_mock.post(f"{MOCK_BASE_URL}/oauth/token", status_code=401, text="Unauthorized")
    with pytest.raises(NphiesAuthError):
        connector.submit_claim({}) # Any API call will trigger token fetch
def test_api_error_raises_exception(connector, mocked_api):
    """
    Test 5: Ensure that a 4xx/5xx error from an API endpoint raises NphiesAPIError.
    """
    claim_id = "CLAIM-INVALID"
    mocked_api.get(f"{MOCK_BASE_URL}/claims/{claim_id}/status", status_code=404, text="Not Found")
    with pytest.raises(NphiesAPIError):
        connector.check_status(claim_id)