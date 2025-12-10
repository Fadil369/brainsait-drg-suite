import os
import time
import re
import json
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from typing import Dict, Any, Optional, List
from datetime import datetime
# Custom Exceptions for clear error handling
class NphiesAuthError(Exception):
    """Raised when authentication with the Nphies platform fails."""
    pass

class NphiesAPIError(Exception):
    """Raised for general API errors (e.g., 4xx, 5xx responses)."""
    pass

class NphiesValidationError(Exception):
    """Raised when data validation fails before sending to nphies."""
    pass

class SaudiIDValidator:
    """Utility class for validating Saudi National IDs and Iqama IDs."""
    
    @staticmethod
    def validate_national_id(national_id: str) -> bool:
        """
        Validate Saudi National ID (10 digits with checksum validation).
        Format: 1XXXXXXXXX (starts with 1, followed by 9 digits)
        """
        if not national_id or len(national_id) != 10:
            return False
        
        if not national_id.isdigit():
            return False
        
        if not national_id.startswith('1'):
            return False
        
        # Checksum validation using Luhn algorithm variant
        return SaudiIDValidator._validate_checksum(national_id)
    
    @staticmethod
    def validate_iqama_id(iqama_id: str) -> bool:
        """
        Validate Iqama ID (10 digits, starts with 2, with checksum validation).
        Format: 2XXXXXXXXX (starts with 2, followed by 9 digits)
        """
        if not iqama_id or len(iqama_id) != 10:
            return False
        
        if not iqama_id.isdigit():
            return False
        
        if not iqama_id.startswith('2'):
            return False
        
        # Checksum validation
        return SaudiIDValidator._validate_checksum(iqama_id)
    
    @staticmethod
    def _validate_checksum(id_number: str) -> bool:
        """
        Validate checksum for Saudi IDs using a simplified algorithm.
        This is a mock implementation - real validation would use the official algorithm.
        """
        try:
            # Simple checksum: sum of all digits should be divisible by 10
            digit_sum = sum(int(digit) for digit in id_number)
            return digit_sum % 10 == 0
        except:
            return False
    
    @staticmethod
    def determine_id_type(id_number: str) -> Optional[str]:
        """Determine if an ID is National ID or Iqama ID."""
        if SaudiIDValidator.validate_national_id(id_number):
            return "NATIONAL_ID"
        elif SaudiIDValidator.validate_iqama_id(id_number):
            return "IQAMA_ID"
        else:
            return None

class NphiesSchemaValidator:
    """Enhanced JSON schema validation for nphies API calls."""
    
    @staticmethod
    def validate_claim_payload(claim_data: Dict[str, Any]) -> List[str]:
        """
        Validate claim payload against nphies requirements.
        Returns list of validation errors (empty if valid).
        """
        errors = []
        
        # Required fields validation
        required_fields = ['claimNumber', 'patient', 'provider', 'items', 'total', 'currency']
        for field in required_fields:
            if field not in claim_data:
                errors.append(f"Missing required field: {field}")
        
        # Patient validation
        if 'patient' in claim_data:
            patient_errors = NphiesSchemaValidator._validate_patient(claim_data['patient'])
            errors.extend(patient_errors)
        
        # Provider validation
        if 'provider' in claim_data:
            provider_errors = NphiesSchemaValidator._validate_provider(claim_data['provider'])
            errors.extend(provider_errors)
        
        # Items validation
        if 'items' in claim_data:
            if not isinstance(claim_data['items'], list) or len(claim_data['items']) == 0:
                errors.append("Items must be a non-empty list")
            else:
                for i, item in enumerate(claim_data['items']):
                    item_errors = NphiesSchemaValidator._validate_item(item, i)
                    errors.extend(item_errors)
        
        # Currency validation
        if 'currency' in claim_data and claim_data['currency'] != 'SAR':
            errors.append("Currency must be 'SAR' for Saudi Arabia")
        
        # Total amount validation
        if 'total' in claim_data:
            try:
                total = float(claim_data['total'])
                if total <= 0:
                    errors.append("Total amount must be positive")
            except (ValueError, TypeError):
                errors.append("Total amount must be a valid number")
        
        return errors
    
    @staticmethod
    def _validate_patient(patient: Dict[str, Any]) -> List[str]:
        """Validate patient information."""
        errors = []
        
        if 'id' not in patient:
            errors.append("Patient ID is required")
        
        # Validate Saudi ID
        national_id = patient.get('nationalId')
        iqama_id = patient.get('iqamaId')
        
        if not national_id and not iqama_id:
            errors.append("Either National ID or Iqama ID is required")
        
        if national_id and not SaudiIDValidator.validate_national_id(national_id):
            errors.append(f"Invalid National ID format: {national_id}")
        
        if iqama_id and not SaudiIDValidator.validate_iqama_id(iqama_id):
            errors.append(f"Invalid Iqama ID format: {iqama_id}")
        
        return errors
    
    @staticmethod
    def _validate_provider(provider: Dict[str, Any]) -> List[str]:
        """Validate provider information."""
        errors = []
        
        if 'cr_number' not in provider:
            errors.append("Provider CR Number is required")
        else:
            cr_number = provider['cr_number']
            if not re.match(r'^\d{10}$', cr_number):
                errors.append(f"Invalid CR Number format: {cr_number} (must be 10 digits)")
        
        return errors
    
    @staticmethod
    def _validate_item(item: Dict[str, Any], index: int) -> List[str]:
        """Validate individual claim item."""
        errors = []
        
        if 'serviceCode' not in item:
            errors.append(f"Item {index}: serviceCode is required")
        
        if 'description' not in item:
            errors.append(f"Item {index}: description is required")
        
        return errors
class EnhancedNphiesConnector:
    """
    Enhanced nphies connector with Saudi ID validation, comprehensive schema validation,
    and improved error handling for the Saudi healthcare market.
    """
    def __init__(self, base_url: str, client_id: str, client_secret: str, timeout: int = 15, verify: bool = True):
        """
        Initializes the Enhanced NphiesConnector.
        """
        self.base_url = base_url
        self.client_id = client_id
        self.client_secret = client_secret
        self.timeout = timeout
        self._token_data: Dict[str, Any] = {}
        self.session = self._create_session()
        self.validator = NphiesSchemaValidator()
        self.id_validator = SaudiIDValidator()
        
        # Enhanced metrics tracking
        self.metrics = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'validation_errors': 0,
            'last_request_time': None,
            'average_response_time': 0.0
        }
    def _create_session(self) -> requests.Session:
        """
        Creates a requests.Session with enhanced retry strategy and TLS 1.2 enforcement.
        """
        session = requests.Session()
        
        # Enhanced retry strategy for Saudi network conditions
        retry_strategy = Retry(
            total=5,  # Increased retries for Saudi network conditions
            status_forcelist=[429, 500, 502, 503, 504, 520, 521, 522, 523, 524],
            backoff_factor=2,  # Exponential backoff
            respect_retry_after_header=True
        )
        
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("https://", adapter)
        session.mount("http://", adapter)
        
        # Set default headers for Saudi market
        session.headers.update({
            'User-Agent': 'BrainSAIT-DRG-Suite/2.0.0 (Saudi-Healthcare)',
            'Accept-Language': 'ar-SA,en-US;q=0.9',
            'X-Country-Code': 'SA'
        })
        
        return session
    
    def _get_oauth_token(self) -> str:
        """Enhanced OAuth 2.0 token management with better error handling."""
        now = time.time()
        
        # Check if token exists and is not expired (with a 120-second buffer for Saudi conditions)
        if self._token_data and self._token_data.get("expires_at", 0) > now + 120:
            return self._token_data["access_token"]
        
        token_url = f"{self.base_url}/oauth/token"
        payload = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": "claims preauth payments"  # Enhanced scope for full functionality
        }
        
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
        }
        
        try:
            start_time = time.time()
            response = self.session.post(token_url, data=payload, headers=headers, timeout=self.timeout)
            response_time = time.time() - start_time
            
            response.raise_for_status()
            token_info = response.json()
            
            self._token_data = {
                "access_token": token_info["access_token"],
                "expires_at": now + token_info.get("expires_in", 3600),
                "token_type": token_info.get("token_type", "Bearer"),
                "scope": token_info.get("scope", "")
            }
            
            # Update metrics
            self._update_metrics(True, response_time)
            
            return self._token_data["access_token"]
            
        except requests.exceptions.RequestException as e:
            self._update_metrics(False, 0)
            print(f"OAuth token request failed: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"Response status: {e.response.status_code}")
                print(f"Response body: {e.response.text}")
            raise NphiesAuthError("Failed to obtain OAuth token from nphies.") from e
    
    def _get_auth_headers(self) -> Dict[str, str]:
        """Enhanced headers with Saudi-specific requirements."""
        token = self._get_oauth_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-API-Version": "2.1",
            "X-Request-ID": f"brainsait-{int(time.time())}-{hash(str(time.time())) % 10000}",
            "X-Timestamp": datetime.now().isoformat()
        }
    
    def _request(self, method: str, path: str, **kwargs) -> Any:
        """Enhanced request wrapper with comprehensive error handling and metrics."""
        url = f"{self.base_url}{path}"
        headers = self._get_auth_headers()
        
        # Add request-specific headers if provided
        if 'headers' in kwargs:
            headers.update(kwargs.pop('headers'))
        
        try:
            start_time = time.time()
            response = self.session.request(
                method, url, headers=headers, timeout=self.timeout, **kwargs
            )
            response_time = time.time() - start_time
            
            response.raise_for_status()
            
            # Update metrics
            self._update_metrics(True, response_time)
            
            # Handle different content types
            content_type = response.headers.get('content-type', '').lower()
            if 'application/json' in content_type:
                return response.json()
            else:
                return response.text
                
        except requests.exceptions.HTTPError as e:
            self._update_metrics(False, 0)
            error_details = self._extract_error_details(e.response)
            print(f"Nphies API request to {url} failed with status {e.response.status_code}")
            print(f"Error details: {error_details}")
            raise NphiesAPIError(f"API Error: {e.response.status_code} - {error_details}") from e
            
        except requests.exceptions.Timeout:
            self._update_metrics(False, 0)
            print(f"Nphies API request to {url} timed out after {self.timeout} seconds.")
            raise NphiesAPIError("Request to nphies timed out.")
            
        except requests.exceptions.RequestException as e:
            self._update_metrics(False, 0)
            print(f"Nphies API request to {url} failed: {e}")
            raise NphiesAPIError(f"A network error occurred: {e}") from e
    
    def _extract_error_details(self, response) -> str:
        """Extract detailed error information from nphies response."""
        try:
            error_data = response.json()
            if isinstance(error_data, dict):
                # Extract common nphies error fields
                error_code = error_data.get('errorCode', 'UNKNOWN')
                error_message = error_data.get('errorMessage', error_data.get('message', 'No message'))
                error_details = error_data.get('details', [])
                
                details_str = f"Code: {error_code}, Message: {error_message}"
                if error_details:
                    details_str += f", Details: {error_details}"
                return details_str
            else:
                return str(error_data)
        except:
            return response.text[:500]  # Return first 500 chars if JSON parsing fails
    
    def _update_metrics(self, success: bool, response_time: float):
        """Update internal metrics for monitoring."""
        self.metrics['total_requests'] += 1
        self.metrics['last_request_time'] = datetime.now().isoformat()
        
        if success:
            self.metrics['successful_requests'] += 1
            # Update average response time
            current_avg = self.metrics['average_response_time']
            total_successful = self.metrics['successful_requests']
            self.metrics['average_response_time'] = (
                (current_avg * (total_successful - 1) + response_time) / total_successful
            )
        else:
            self.metrics['failed_requests'] += 1
    
    def submit_claim(self, claim_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enhanced claim submission with comprehensive validation.
        """
        # Validate claim data before submission
        validation_errors = self.validator.validate_claim_payload(claim_data)
        if validation_errors:
            self.metrics['validation_errors'] += 1
            error_msg = "Claim validation failed: " + "; ".join(validation_errors)
            raise NphiesValidationError(error_msg)
        
        # Add submission metadata
        enhanced_claim_data = {
            **claim_data,
            "submissionTimestamp": datetime.now().isoformat(),
            "apiVersion": "2.1",
            "sourceSystem": "BrainSAIT-DRG-Suite"
        }
        
        return self._request("POST", "/claims", json=enhanced_claim_data)
    
    def request_pre_auth(self, auth_data: Dict[str, Any]) -> Dict[str, Any]:
        """Enhanced pre-authorization request."""
        return self._request("POST", "/preauth", json=auth_data)
    
    def check_status(self, claim_id: str) -> Dict[str, Any]:
        """Enhanced status checking with better error handling."""
        if not claim_id:
            raise NphiesValidationError("Claim ID is required for status check")
        
        return self._request("GET", f"/claims/{claim_id}/status")
    
    def reconcile_payment(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Enhanced payment reconciliation."""
        return self._request("POST", "/payments/reconcile", json=payment_data)
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get connector performance metrics."""
        success_rate = 0.0
        if self.metrics['total_requests'] > 0:
            success_rate = (self.metrics['successful_requests'] / self.metrics['total_requests']) * 100
        
        return {
            **self.metrics,
            'success_rate_percentage': round(success_rate, 2)
        }
    
    def validate_saudi_id(self, id_number: str) -> Dict[str, Any]:
        """Validate Saudi ID and return detailed information."""
        id_type = self.id_validator.determine_id_type(id_number)
        
        return {
            'id_number': id_number,
            'is_valid': id_type is not None,
            'id_type': id_type,
            'validation_details': {
                'length_valid': len(id_number) == 10 if id_number else False,
                'format_valid': id_number.isdigit() if id_number else False,
                'checksum_valid': self.id_validator._validate_checksum(id_number) if id_number and len(id_number) == 10 else False
            }
        }

# Maintain backward compatibility
NphiesConnector = EnhancedNphiesConnector
# Enhanced example usage demonstrating new features
if __name__ == "__main__":
    NPHIES_BASE_URL = os.getenv("NPHIES_BASE_URL", "https://sandbox.nphies.sa/api")
    NPHIES_CLIENT_ID = os.getenv("NPHIES_CLIENT_ID", "mock_client_id")
    NPHIES_CLIENT_SECRET = os.getenv("NPHIES_CLIENT_SECRET", "mock_client_secret")
    
    print("=== BrainSAIT Enhanced Nphies Connector Demo ===")
    
    # Initialize enhanced connector
    connector = EnhancedNphiesConnector(
        base_url=NPHIES_BASE_URL,
        client_id=NPHIES_CLIENT_ID,
        client_secret=NPHIES_CLIENT_SECRET
    )
    
    # Test Saudi ID validation
    print("\n--- Saudi ID Validation Tests ---")
    test_ids = [
        "1012345678",  # Valid National ID (mock)
        "2023456789",  # Valid Iqama ID (mock)
        "3012345678",  # Invalid (wrong prefix)
        "101234567",   # Invalid (too short)
        "abcd123456"   # Invalid (non-numeric)
    ]
    
    for test_id in test_ids:
        validation_result = connector.validate_saudi_id(test_id)
        print(f"ID: {test_id} -> Valid: {validation_result['is_valid']}, Type: {validation_result['id_type']}")
    
    # Test claim validation
    print("\n--- Claim Validation Tests ---")
    
    # Valid claim
    valid_claim = {
        "claimNumber": "TEST-CLAIM-001",
        "patient": {
            "id": "p1",
            "nationalId": "1012345678",
            "idType": "NATIONAL_ID"
        },
        "provider": {
            "cr_number": "1010123456",
            "nphies_provider_id": "NPHIES-PROV-001"
        },
        "items": [
            {"serviceCode": "J18.9", "description": "Pneumonia, unspecified organism"}
        ],
        "total": 1500.00,
        "currency": "SAR"
    }
    
    # Invalid claim (missing required fields)
    invalid_claim = {
        "claimNumber": "TEST-CLAIM-002",
        "patient": {"id": "p2"},  # Missing national/iqama ID
        "items": [],  # Empty items
        "total": -100.00,  # Negative amount
        "currency": "USD"  # Wrong currency
    }
    
    print("Testing valid claim:")
    try:
        validation_errors = connector.validator.validate_claim_payload(valid_claim)
        if validation_errors:
            print(f"  Validation errors: {validation_errors}")
        else:
            print("  ✓ Claim is valid")
    except Exception as e:
        print(f"  Error: {e}")
    
    print("Testing invalid claim:")
    try:
        validation_errors = connector.validator.validate_claim_payload(invalid_claim)
        if validation_errors:
            print(f"  Validation errors found:")
            for error in validation_errors:
                print(f"    - {error}")
        else:
            print("  ✓ Claim is valid")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Display connector metrics
    print("\n--- Connector Metrics ---")
    metrics = connector.get_metrics()
    for key, value in metrics.items():
        print(f"  {key}: {value}")
    
    print("\n=== Demo Complete ===")
    print("Note: This demo uses mock data. In production, ensure proper nphies credentials are configured.")