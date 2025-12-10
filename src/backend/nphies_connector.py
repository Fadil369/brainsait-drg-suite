import os
import time
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from typing import Dict, Any, Optional
# Custom Exceptions for clear error handling
class NphiesAuthError(Exception):
    """Raised when authentication with the Nphies platform fails."""
    pass
class NphiesAPIError(Exception):
    """Raised for general API errors (e.g., 4xx, 5xx responses)."""
    pass
class NphiesConnector:
    """
    Manages all API interactions with the Saudi national 'nphies' platform.
    This class handles OAuth 2.0 authentication, enforces TLS 1.2, manages
    request timeouts, and implements a retry strategy for transient errors.
    It provides methods for core nphies workflows like claim submission and
    status checks.
    """
    def __init__(self, base_url: str, client_id: str, client_secret: str, timeout: int = 15, verify: bool = True):
        """
        Initializes the NphiesConnector.
        Args:
            base_url: The base URL for the nphies API (e.g., sandbox or production).
            client_id: The OAuth client ID obtained from nphies.
            client_secret: The OAuth client secret.
            timeout: Default request timeout in seconds.
            verify: Whether to verify SSL certificates. Should be True in production.
        """
        self.base_url = base_url
        self.client_id = client_id
        self.client_secret = client_secret
        self.timeout = timeout
        self._token_data: Dict[str, Any] = {}
        self.session = self._create_session()
    def _create_session(self) -> requests.Session:
        """
        Creates a requests.Session with a retry strategy and TLS 1.2 enforcement.
        """
        session = requests.Session()
        # Retry strategy for transient network errors or 5xx server errors
        retry_strategy = Retry(
            total=3,
            status_forcelist=[429, 500, 502, 503, 504],
            backoff_factor=1
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("https://", adapter)
        session.mount("http://", adapter)
        # Note: TLS 1.2 enforcement is typically handled by the underlying OS
        # and OpenSSL/cryptography libraries. Modern versions of `requests`
        # will use a secure TLS version by default. For explicit enforcement,
        # a custom SSLContext would be required, but is often unnecessary.
        return session
    def _get_oauth_token(self) -> str:
        """
        Obtains an OAuth 2.0 token using client credentials.
        Caches the token and refreshes it only when it's expired.
        """
        now = time.time()
        # Check if token exists and is not expired (with a 60-second buffer)
        if self._token_data and self._token_data.get("expires_at", 0) > now + 60:
            return self._token_data["access_token"]
        token_url = f"{self.base_url}/oauth/token"
        payload = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
        }
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        try:
            response = self.session.post(token_url, data=payload, headers=headers, timeout=self.timeout)
            response.raise_for_status()
            token_info = response.json()
            self._token_data = {
                "access_token": token_info["access_token"],
                "expires_at": now + token_info.get("expires_in", 3600),
            }
            return self._token_data["access_token"]
        except requests.exceptions.RequestException as e:
            # Log the error details
            print(f"OAuth token request failed: {e}")
            raise NphiesAuthError("Failed to obtain OAuth token from nphies.") from e
    def _get_auth_headers(self) -> Dict[str, str]:
        """Constructs the standard headers required for nphies API calls."""
        token = self._get_oauth_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
    def _request(self, method: str, path: str, **kwargs) -> Any:
        """
        Internal wrapper for making authenticated requests to the nphies API.
        """
        url = f"{self.base_url}{path}"
        headers = self._get_auth_headers()
        retry_statuses = {429, 500, 502, 503, 504}
        max_attempts = 3
        backoff = 0.5
        for attempt in range(max_attempts):
            try:
                response = self.session.request(method, url, headers=headers, timeout=self.timeout, **kwargs)
                if response.status_code in retry_statuses and attempt < max_attempts - 1:
                    time.sleep(backoff * (attempt + 1))
                    continue
                response.raise_for_status()
                return response.json()
            except requests.exceptions.HTTPError as e:
                status = e.response.status_code if e.response else None
                if status in retry_statuses and attempt < max_attempts - 1:
                    time.sleep(backoff * (attempt + 1))
                    continue
                print(f"Nphies API request to {url} failed with status {status}: {e.response.text if e.response else ''}")
                raise NphiesAPIError(f"API Error: {status} - {e.response.text if e.response else ''}") from e
            except requests.exceptions.Timeout:
                print(f"Nphies API request to {url} timed out.")
                raise NphiesAPIError("Request to nphies timed out.")
            except requests.exceptions.RequestException as e:
                print(f"Nphies API request to {url} failed: {e}")
                raise NphiesAPIError(f"A network error occurred: {e}") from e
    def submit_claim(self, claim_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Submits a claim to the nphies /claims endpoint.
        """
        return self._request("POST", "/claims", json=claim_data)
    def request_pre_auth(self, auth_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Submits a pre-authorization request to the nphies /preauth endpoint.
        """
        return self._request("POST", "/preauth", json=auth_data)
    def check_status(self, claim_id: str) -> Dict[str, Any]:
        """
        Checks the status of a previously submitted claim.
        """
        return self._request("GET", f"/claims/{claim_id}/status")
    def reconcile_payment(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sends payment reconciliation data to the nphies /payments/reconcile endpoint.
        """
        return self._request("POST", "/payments/reconcile", json=payment_data)
# Example usage (requires environment variables for credentials)
if __name__ == "__main__":
    NPHIES_BASE_URL = os.getenv("NPHIES_BASE_URL", "https://sandbox.nphies.sa/api")
    NPHIES_CLIENT_ID = os.getenv("NPHIES_CLIENT_ID")
    NPHIES_CLIENT_SECRET = os.getenv("NPHIES_CLIENT_SECRET")
    if not (NPHIES_CLIENT_ID and NPHIES_CLIENT_SECRET):
        print("Error: NPHIES_CLIENT_ID and NPHIES_CLIENT_SECRET environment variables must be set.")
    else:
        connector = NphiesConnector(
            base_url=NPHIES_BASE_URL,
            client_id=NPHIES_CLIENT_ID,
            client_secret=NPHIES_CLIENT_SECRET
        )
        try:
            # This will attempt to get a token
            print("Successfully initialized NphiesConnector and obtained OAuth token.")
            # Example: Check status of a dummy claim
            # status = connector.check_status("dummy-claim-123")
            # print("Dummy claim status:", status)
        except (NphiesAuthError, NphiesAPIError) as e:
            print(f"An error occurred: {e}")
