# Implementation Plan: Technical Requirements Compliance
## Addressing Gaps from Technical Audit Report

**Plan Date:** December 12, 2025  
**Priority:** High Priority Items for Production Readiness  
**Timeline:** 6-8 Weeks

---

## Overview

This document provides a detailed implementation plan to address the gaps identified in the Technical Audit Report, focusing on achieving full compliance with the Technical Product Requirements Document. The plan is organized by priority level and includes specific technical tasks, file changes, and success criteria.

---

## HIGH PRIORITY: Production Readiness Items

### 1. APR-DRG Grouper Implementation ⭐⭐⭐

**Objective:** Implement APR-DRG (All Patient Refined DRG) calculation with Severity of Illness (SOI) and Risk of Mortality (ROM) subclasses.

**Gap:** Current system only maps clinical terms to ICD codes but doesn't calculate DRG groupings.

**Impact:** 
- Enables accurate Case Mix Index (CMI) calculation
- Supports value-based care reimbursement
- Fulfills core requirement from Section 3.0 Pillar 1

#### Technical Implementation

##### 1.1 Database Schema Updates

**File:** `sql/schema.sql`

**Changes Required:**
```sql
-- Add to encounters table (after line 44)
  apr_drg_code VARCHAR(8) NULL,              -- APR-DRG code (e.g., "194")
  apr_drg_description TEXT NULL,             -- Human-readable DRG description
  severity_of_illness INTEGER NULL,          -- SOI: 1 (minor) to 4 (extreme)
  risk_of_mortality INTEGER NULL,            -- ROM: 1 (minor) to 4 (extreme)
  expected_length_of_stay NUMERIC(5,2) NULL, -- ELOS in days
  relative_weight NUMERIC(8,4) NULL,         -- DRG weight for CMI calculation

-- Update CMI calculation comment (line 42)
  case_mix_index NUMERIC(5,3) DEFAULT 0,  -- Calculated from APR-DRG relative_weight
```

**Migration Script:**
```sql
-- Create migration file: sql/migrations/001_add_apr_drg_fields.sql
ALTER TABLE encounters 
  ADD COLUMN apr_drg_code VARCHAR(8),
  ADD COLUMN apr_drg_description TEXT,
  ADD COLUMN severity_of_illness INTEGER CHECK (severity_of_illness BETWEEN 1 AND 4),
  ADD COLUMN risk_of_mortality INTEGER CHECK (risk_of_mortality BETWEEN 1 AND 4),
  ADD COLUMN expected_length_of_stay NUMERIC(5,2),
  ADD COLUMN relative_weight NUMERIC(8,4);

-- Add index for reporting
CREATE INDEX idx_encounters_apr_drg ON encounters(apr_drg_code, severity_of_illness);
```

##### 1.2 APR-DRG Grouper Module

**File:** `src/backend/apr_drg_grouper.py` (NEW)

```python
"""
APR-DRG Grouper Module
Implements All Patient Refined DRG classification with SOI/ROM
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import json

@dataclass
class DRGResult:
    """Result of DRG grouping calculation"""
    apr_drg_code: str
    description: str
    severity_of_illness: int  # 1-4
    risk_of_mortality: int    # 1-4
    relative_weight: float
    expected_los: float
    mdc: str  # Major Diagnostic Category

class APRDRGGrouper:
    """
    APR-DRG Grouper implementation
    
    This is a simplified implementation. In production, this should integrate
    with the official Solventum APR-DRG Grouper software or API.
    """
    
    def __init__(self, drg_table_path: str = None):
        """
        Initialize grouper with DRG reference table
        
        Args:
            drg_table_path: Path to APR-DRG reference data JSON
        """
        self.drg_table = self._load_drg_table(drg_table_path)
        
    def _load_drg_table(self, path: Optional[str]) -> Dict:
        """Load APR-DRG reference data"""
        # In production: Load from Solventum-provided reference files
        # For now: Return mock structure
        return {
            "PNEUMONIA": {
                "base_drg": "139",
                "description": "Pneumonia & Pleurisy",
                "mdc": "04",
                "weights": {1: 0.5427, 2: 0.7842, 3: 1.2156, 4: 2.1453}
            },
            "MI": {
                "base_drg": "190",
                "description": "Acute Myocardial Infarction",
                "mdc": "05",
                "weights": {1: 0.8234, 2: 1.2456, 3: 1.8934, 4: 3.4521}
            },
            "APPENDICITIS": {
                "base_drg": "338",
                "description": "Appendectomy",
                "mdc": "06",
                "weights": {1: 0.6123, 2: 0.8456, 3: 1.3421, 4: 2.1234}
            },
            "DIABETES": {
                "base_drg": "420",
                "description": "Diabetes",
                "mdc": "10",
                "weights": {1: 0.4521, 2: 0.6234, 3: 0.9456, 4: 1.5678}
            },
            "FRACTURE": {
                "base_drg": "564",
                "description": "Fracture of Lower Limb",
                "mdc": "08",
                "weights": {1: 0.5678, 2: 0.8123, 3: 1.2345, 4: 2.0123}
            }
        }
    
    def group(
        self, 
        principal_diagnosis: str,
        secondary_diagnoses: List[str],
        procedures: List[str],
        age: int,
        patient_type: str,
        discharge_status: str = "01"
    ) -> DRGResult:
        """
        Perform APR-DRG grouping
        
        Args:
            principal_diagnosis: Primary ICD-10 code
            secondary_diagnoses: List of secondary ICD-10 codes
            procedures: List of procedure codes
            age: Patient age in years
            patient_type: "INPATIENT" or "OUTPATIENT"
            discharge_status: UB-04 discharge status code
            
        Returns:
            DRGResult with assigned DRG and subclasses
        """
        # Step 1: Determine base DRG from principal diagnosis
        base_drg_info = self._get_base_drg(principal_diagnosis)
        
        # Step 2: Calculate SOI based on secondary diagnoses
        soi = self._calculate_soi(
            principal_diagnosis, 
            secondary_diagnoses, 
            age, 
            patient_type
        )
        
        # Step 3: Calculate ROM based on diagnosis severity and age
        rom = self._calculate_rom(
            principal_diagnosis,
            secondary_diagnoses,
            age,
            discharge_status
        )
        
        # Step 4: Get relative weight based on DRG and SOI
        relative_weight = base_drg_info["weights"].get(soi, 1.0)
        
        # Step 5: Calculate expected LOS
        expected_los = self._calculate_expected_los(
            base_drg_info["base_drg"],
            soi,
            age
        )
        
        return DRGResult(
            apr_drg_code=base_drg_info["base_drg"],
            description=base_drg_info["description"],
            severity_of_illness=soi,
            risk_of_mortality=rom,
            relative_weight=relative_weight,
            expected_los=expected_los,
            mdc=base_drg_info["mdc"]
        )
    
    def _get_base_drg(self, principal_dx: str) -> Dict:
        """Map principal diagnosis to base DRG"""
        # Simplified mapping - production would use full ICD-10 to DRG table
        code_prefix = principal_dx[:3]
        
        mappings = {
            "J18": "PNEUMONIA",  # Pneumonia
            "I21": "MI",         # Myocardial Infarction
            "K37": "APPENDICITIS",
            "E11": "DIABETES",
            "E10": "DIABETES",
            "S82": "FRACTURE",
        }
        
        category = mappings.get(code_prefix, "PNEUMONIA")  # Default
        return self.drg_table.get(category, self.drg_table["PNEUMONIA"])
    
    def _calculate_soi(
        self, 
        principal_dx: str, 
        secondary_dx: List[str],
        age: int,
        patient_type: str
    ) -> int:
        """
        Calculate Severity of Illness (1-4)
        
        Factors:
        - Number and type of comorbidities
        - Age-based adjustments
        - Interaction between diagnoses
        """
        base_severity = 1
        
        # Age adjustments
        if age < 1:
            base_severity += 1  # Neonates are higher severity
        elif age > 75:
            base_severity += 1  # Elderly are higher severity
        
        # Comorbidity count
        major_cc_count = self._count_major_ccs(secondary_dx)
        if major_cc_count >= 3:
            base_severity += 2
        elif major_cc_count >= 1:
            base_severity += 1
        
        # Cap at 4
        return min(base_severity, 4)
    
    def _calculate_rom(
        self,
        principal_dx: str,
        secondary_dx: List[str],
        age: int,
        discharge_status: str
    ) -> int:
        """
        Calculate Risk of Mortality (1-4)
        
        Factors:
        - Disease severity
        - Age
        - Discharge status (expired = higher ROM)
        """
        base_rom = 1
        
        # Check for life-threatening conditions
        high_risk_conditions = ["I21", "I63", "J96"]  # MI, Stroke, Respiratory failure
        if any(principal_dx.startswith(code) for code in high_risk_conditions):
            base_rom += 1
        
        # Age adjustments
        if age < 1 or age > 80:
            base_rom += 1
        
        # Secondary diagnosis severity
        major_cc_count = self._count_major_ccs(secondary_dx)
        if major_cc_count >= 2:
            base_rom += 1
        
        # Discharge status
        if discharge_status == "20":  # Expired
            base_rom = 4
        
        return min(base_rom, 4)
    
    def _count_major_ccs(self, secondary_dx: List[str]) -> int:
        """Count Major Complications/Comorbidities (MCC)"""
        # Simplified - production would use full CC/MCC table
        mcc_prefixes = [
            "I50",   # Heart failure
            "N18",   # Chronic kidney disease
            "E11.2", # Diabetes with kidney complications
            "J96",   # Respiratory failure
            "R65",   # Severe sepsis
        ]
        
        count = 0
        for dx in secondary_dx:
            if any(dx.startswith(prefix) for prefix in mcc_prefixes):
                count += 1
        
        return count
    
    def _calculate_expected_los(
        self, 
        drg_code: str, 
        soi: int, 
        age: int
    ) -> float:
        """Calculate Expected Length of Stay in days"""
        # Base ELOS from DRG
        base_los_map = {
            "139": 3.5,  # Pneumonia
            "190": 4.2,  # MI
            "338": 2.8,  # Appendicitis
            "420": 2.1,  # Diabetes
            "564": 4.5,  # Fracture
        }
        
        base_los = base_los_map.get(drg_code, 3.0)
        
        # Adjust for SOI
        soi_multiplier = {1: 0.7, 2: 1.0, 3: 1.4, 4: 2.0}
        
        # Adjust for age
        age_adjustment = 1.0
        if age > 75:
            age_adjustment = 1.2
        elif age < 1:
            age_adjustment = 1.3
        
        return base_los * soi_multiplier[soi] * age_adjustment


def calculate_cmi(encounters: List[Dict]) -> float:
    """
    Calculate Case Mix Index for a set of encounters
    
    CMI = Sum of all DRG weights / Number of encounters
    """
    if not encounters:
        return 0.0
    
    total_weight = sum(enc.get("relative_weight", 0) for enc in encounters)
    return round(total_weight / len(encounters), 3)


# Example usage
if __name__ == "__main__":
    grouper = APRDRGGrouper()
    
    # Test case: Elderly patient with pneumonia and heart failure
    result = grouper.group(
        principal_diagnosis="J18.9",
        secondary_diagnoses=["I50.9", "E11.9"],  # Heart failure, diabetes
        procedures=[],
        age=82,
        patient_type="INPATIENT"
    )
    
    print(f"APR-DRG: {result.apr_drg_code} - {result.description}")
    print(f"SOI: {result.severity_of_illness} / ROM: {result.risk_of_mortality}")
    print(f"Relative Weight: {result.relative_weight}")
    print(f"Expected LOS: {result.expected_los} days")
    print(f"MDC: {result.mdc}")
```

##### 1.3 Integration with Coding Engine

**File:** `src/backend/coding_engine.py`

**Changes Required:**

```python
# Add import at top
from apr_drg_grouper import APRDRGGrouper, DRGResult, calculate_cmi

class CodingEngine:
    def __init__(self, nphies_connector: Any = None):
        self.nphies_connector = nphies_connector or MockNphiesConnector()
        self.apr_drg_grouper = APRDRGGrouper()  # Add grouper
    
    def run_coding_job(self, clinical_note: str, encounter_meta: Dict[str, Any]) -> CodingResult:
        """Executes the full coding logic flow including DRG grouping"""
        suggested_codes = self._placeholder_nlp(clinical_note)
        
        if not suggested_codes:
            confidence_score = 0.0
        else:
            confidence_score = sum(c['confidence'] for c in suggested_codes) / len(suggested_codes)
        
        # NEW: Perform APR-DRG grouping
        drg_result = None
        if suggested_codes and encounter_meta.get("encounter_type") == "INPATIENT":
            drg_result = self._perform_drg_grouping(
                suggested_codes, 
                encounter_meta
            )
        
        visit_complexity = encounter_meta.get("visit_complexity", "standard")
        
        # Include DRG result in output
        result = {
            "engine_version": self.ENGINE_VERSION,
            "source_text": clinical_note,
            "suggested_codes": suggested_codes,
            "final_codes": [],
            "confidence_score": round(confidence_score, 2),
            "phase": self._determine_phase(confidence_score, visit_complexity),
            "status": self._determine_status(confidence_score, visit_complexity)
        }
        
        if drg_result:
            result["apr_drg"] = {
                "code": drg_result.apr_drg_code,
                "description": drg_result.description,
                "soi": drg_result.severity_of_illness,
                "rom": drg_result.risk_of_mortality,
                "weight": drg_result.relative_weight,
                "expected_los": drg_result.expected_los
            }
        
        return result
    
    def _perform_drg_grouping(
        self, 
        codes: List[SuggestedCode],
        encounter_meta: Dict[str, Any]
    ) -> DRGResult:
        """Perform APR-DRG grouping on suggested codes"""
        # Extract principal diagnosis (first code with highest confidence)
        principal_dx = max(codes, key=lambda x: x['confidence'])['code']
        
        # Secondary diagnoses (all other codes)
        secondary_dx = [c['code'] for c in codes if c['code'] != principal_dx]
        
        # Get patient demographics from encounter metadata
        age = encounter_meta.get("patient_age", 45)  # Default if not provided
        patient_type = encounter_meta.get("encounter_type", "INPATIENT")
        
        # Perform grouping
        return self.apr_drg_grouper.group(
            principal_diagnosis=principal_dx,
            secondary_diagnoses=secondary_dx,
            procedures=[],  # Would be extracted from procedures in full implementation
            age=age,
            patient_type=patient_type
        )
```

##### 1.4 Type Definitions Update

**File:** `shared/types.ts`

```typescript
// Add to existing types
export interface APRDRGResult {
  code: string;
  description: string;
  soi: 1 | 2 | 3 | 4;  // Severity of Illness
  rom: 1 | 2 | 3 | 4;  // Risk of Mortality
  weight: number;
  expected_los: number;
}

export interface CodingJob {
  id: string;
  encounter_id: string;
  suggested_codes: SuggestedCode[];
  status: 'NEEDS_REVIEW' | 'AUTO_DROP' | 'SENT_TO_NPHIES' | 'REJECTED';
  confidence_score: number;
  phase: 'CAC' | 'SEMI_AUTONOMOUS' | 'AUTONOMOUS';
  created_at: string;
  source_text?: string;
  apr_drg?: APRDRGResult;  // Add APR-DRG result
}
```

**Success Criteria:**
- ✅ APR-DRG code calculated for all inpatient encounters
- ✅ SOI and ROM subclasses assigned (1-4 scale)
- ✅ CMI accurately calculated from DRG weights
- ✅ Unit tests achieve >90% code coverage
- ✅ Performance: <100ms for DRG grouping operation

**Timeline:** 2-3 weeks

---

### 2. EAPG Methodology for Outpatient ⭐⭐⭐

**Objective:** Implement Enhanced Ambulatory Patient Groups for outpatient encounter classification.

**Gap:** No EAPG grouping for outpatient/ambulatory visits.

**Impact:**
- Accurate reimbursement for outpatient services
- Complete coverage of all encounter types
- Fulfills Section 3.0 Pillar 1 requirement

#### Technical Implementation

##### 2.1 EAPG Grouper Module

**File:** `src/backend/eapg_grouper.py` (NEW)

```python
"""
EAPG (Enhanced Ambulatory Patient Groups) Grouper
For outpatient encounter classification
"""

from typing import Dict, List
from dataclasses import dataclass

@dataclass
class EAPGResult:
    """Result of EAPG grouping"""
    eapg_code: str
    description: str
    significant_procedure: bool
    ancillary_weight: float
    relative_weight: float

class EAPGGrouper:
    """
    Enhanced Ambulatory Patient Groups grouper
    
    Classifies outpatient visits based on:
    - Primary procedure (CPT/HCPCS codes)
    - Diagnoses (ICD-10)
    - Ancillary services
    """
    
    def __init__(self):
        self.eapg_table = self._load_eapg_table()
    
    def _load_eapg_table(self) -> Dict:
        """Load EAPG reference data"""
        # Simplified reference table
        return {
            "OFFICE_VISIT": {
                "code": "0010",
                "description": "Office/Outpatient Visit, Est Patient",
                "base_weight": 0.12
            },
            "ER_VISIT": {
                "code": "0620",
                "description": "Emergency Room Visit",
                "base_weight": 0.45
            },
            "PREVENTIVE": {
                "code": "0150",
                "description": "Preventive Care Visit",
                "base_weight": 0.18
            },
            "MINOR_PROCEDURE": {
                "code": "0450",
                "description": "Minor Procedure",
                "base_weight": 0.35
            }
        }
    
    def group(
        self,
        primary_procedure: str,
        diagnoses: List[str],
        ancillary_services: List[str],
        encounter_type: str
    ) -> EAPGResult:
        """
        Perform EAPG grouping
        
        Args:
            primary_procedure: CPT/HCPCS code for primary service
            diagnoses: List of ICD-10 diagnosis codes
            ancillary_services: List of ancillary CPT codes (labs, imaging)
            encounter_type: ED, OUTPATIENT, or AMBULATORY
        """
        # Determine base EAPG
        if encounter_type == "ED":
            base_eapg = self.eapg_table["ER_VISIT"]
        elif self._is_preventive(diagnoses):
            base_eapg = self.eapg_table["PREVENTIVE"]
        elif self._is_procedure(primary_procedure):
            base_eapg = self.eapg_table["MINOR_PROCEDURE"]
        else:
            base_eapg = self.eapg_table["OFFICE_VISIT"]
        
        # Calculate ancillary weight
        ancillary_weight = len(ancillary_services) * 0.05
        
        # Significant procedure flag
        significant_procedure = self._is_significant_procedure(primary_procedure)
        
        # Total weight
        relative_weight = base_eapg["base_weight"] + ancillary_weight
        
        return EAPGResult(
            eapg_code=base_eapg["code"],
            description=base_eapg["description"],
            significant_procedure=significant_procedure,
            ancillary_weight=ancillary_weight,
            relative_weight=round(relative_weight, 4)
        )
    
    def _is_preventive(self, diagnoses: List[str]) -> bool:
        """Check if visit is preventive care"""
        preventive_codes = ["Z00", "Z01", "Z12", "Z13"]
        return any(dx.startswith(code) for code in preventive_codes for dx in diagnoses)
    
    def _is_procedure(self, cpt_code: str) -> bool:
        """Check if CPT is a procedure"""
        # Simplified - procedure codes typically 10000-69999
        if not cpt_code:
            return False
        try:
            code_num = int(cpt_code[:5])
            return 10000 <= code_num <= 69999
        except ValueError:
            return False
    
    def _is_significant_procedure(self, cpt_code: str) -> bool:
        """Check if procedure is significant (affects payment)"""
        # Simplified - would use official significant procedure list
        significant_ranges = [(10000, 29999), (30000, 49999)]
        if not cpt_code:
            return False
        try:
            code_num = int(cpt_code[:5])
            return any(start <= code_num <= end for start, end in significant_ranges)
        except ValueError:
            return False


# Example usage
if __name__ == "__main__":
    grouper = EAPGGrouper()
    
    result = grouper.group(
        primary_procedure="99213",  # Office visit CPT
        diagnoses=["E11.9", "I10"],
        ancillary_services=["80053", "36415"],  # Lab panel, venipuncture
        encounter_type="OUTPATIENT"
    )
    
    print(f"EAPG: {result.eapg_code} - {result.description}")
    print(f"Significant Procedure: {result.significant_procedure}")
    print(f"Relative Weight: {result.relative_weight}")
```

##### 2.2 Integration with Coding Engine

**File:** `src/backend/coding_engine.py`

```python
# Add import
from eapg_grouper import EAPGGrouper, EAPGResult

class CodingEngine:
    def __init__(self, nphies_connector: Any = None):
        self.nphies_connector = nphies_connector or MockNphiesConnector()
        self.apr_drg_grouper = APRDRGGrouper()
        self.eapg_grouper = EAPGGrouper()  # Add EAPG grouper
    
    def run_coding_job(self, clinical_note: str, encounter_meta: Dict[str, Any]) -> CodingResult:
        # ... existing code ...
        
        # Determine which grouper to use based on encounter type
        encounter_type = encounter_meta.get("encounter_type", "INPATIENT")
        
        if encounter_type == "INPATIENT":
            drg_result = self._perform_drg_grouping(suggested_codes, encounter_meta)
            if drg_result:
                result["apr_drg"] = { ... }
        else:
            # Use EAPG for outpatient/ED/ambulatory
            eapg_result = self._perform_eapg_grouping(suggested_codes, encounter_meta)
            if eapg_result:
                result["eapg"] = {
                    "code": eapg_result.eapg_code,
                    "description": eapg_result.description,
                    "weight": eapg_result.relative_weight,
                    "significant_procedure": eapg_result.significant_procedure
                }
        
        return result
    
    def _perform_eapg_grouping(
        self,
        codes: List[SuggestedCode],
        encounter_meta: Dict[str, Any]
    ) -> EAPGResult:
        """Perform EAPG grouping for outpatient visits"""
        diagnoses = [c['code'] for c in codes]
        
        return self.eapg_grouper.group(
            primary_procedure=encounter_meta.get("primary_procedure", ""),
            diagnoses=diagnoses,
            ancillary_services=encounter_meta.get("ancillary_services", []),
            encounter_type=encounter_meta.get("encounter_type", "OUTPATIENT")
        )
```

**Success Criteria:**
- ✅ EAPG classification for all outpatient encounters
- ✅ Significant procedure flag calculated correctly
- ✅ Ancillary service weight adjustment working
- ✅ Unit tests with >85% coverage

**Timeline:** 1-2 weeks

---

### 3. Production Configuration Management ⭐⭐⭐

**Objective:** Replace mock nphies connector with production-ready AWS Secrets Manager integration.

**Gap:** Credentials currently loaded from environment variables; needs secure secrets management.

#### Technical Implementation

##### 3.1 AWS Secrets Manager Integration

**File:** `src/backend/nphies_connector.py`

```python
# Add imports
import boto3
from botocore.exceptions import ClientError
import json

class NphiesConnector:
    # ... existing code ...
    
    @classmethod
    def from_secrets_manager(
        cls,
        secret_name: str,
        region_name: str = "me-south-1",  # AWS Bahrain region for Saudi
        base_url: str = None
    ) -> 'NphiesConnector':
        """
        Factory method to create connector using AWS Secrets Manager
        
        Args:
            secret_name: Name of secret in Secrets Manager
            region_name: AWS region (default: me-south-1 for Bahrain/Saudi)
            base_url: Optional override for nphies base URL
        
        Returns:
            Configured NphiesConnector instance
        
        Raises:
            NphiesAuthError: If secret retrieval fails
        """
        try:
            # Create Secrets Manager client
            session = boto3.session.Session()
            client = session.client(
                service_name='secretsmanager',
                region_name=region_name
            )
            
            # Retrieve secret
            response = client.get_secret_value(SecretId=secret_name)
            
            # Parse secret JSON
            if 'SecretString' in response:
                secret = json.loads(response['SecretString'])
            else:
                # Binary secrets not supported for this use case
                raise NphiesAuthError("Binary secrets not supported")
            
            # Extract credentials
            client_id = secret.get('NPHIES_CLIENT_ID')
            client_secret = secret.get('NPHIES_CLIENT_SECRET')
            nphies_url = base_url or secret.get('NPHIES_BASE_URL')
            
            if not (client_id and client_secret and nphies_url):
                raise NphiesAuthError(
                    "Secret must contain NPHIES_CLIENT_ID, NPHIES_CLIENT_SECRET, "
                    "and NPHIES_BASE_URL"
                )
            
            return cls(
                base_url=nphies_url,
                client_id=client_id,
                client_secret=client_secret
            )
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'ResourceNotFoundException':
                raise NphiesAuthError(f"Secret '{secret_name}' not found") from e
            elif error_code == 'InvalidRequestException':
                raise NphiesAuthError(f"Invalid secret request: {e}") from e
            elif error_code == 'InvalidParameterException':
                raise NphiesAuthError(f"Invalid parameter: {e}") from e
            else:
                raise NphiesAuthError(f"Failed to retrieve secret: {e}") from e
        except json.JSONDecodeError as e:
            raise NphiesAuthError(f"Secret is not valid JSON: {e}") from e
        except Exception as e:
            raise NphiesAuthError(f"Unexpected error retrieving secret: {e}") from e


# Update main example
if __name__ == "__main__":
    # Production usage with Secrets Manager
    connector = NphiesConnector.from_secrets_manager(
        secret_name="brainsait/nphies/credentials",
        region_name="me-south-1"
    )
    
    try:
        print("Successfully initialized NphiesConnector from Secrets Manager")
        # Example API call
        # status = connector.check_status("test-claim-123")
    except (NphiesAuthError, NphiesAPIError) as e:
        print(f"Error: {e}")
```

##### 3.2 Requirements Update

**File:** `docker/requirements.txt` (NEW if doesn't exist)

```
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
requests==2.31.0
boto3==1.29.7
botocore==1.32.7
```

##### 3.3 Dockerfile Update

**File:** `docker/dev.Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY docker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/backend /app/backend

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV AWS_DEFAULT_REGION=me-south-1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run application
CMD ["uvicorn", "backend.cdi_api:app", "--host", "0.0.0.0", "--port", "8000"]
```

##### 3.4 Deployment Documentation

**File:** `README.md` (Update deployment section)

```markdown
### Production Deployment to AWS

#### Prerequisites
1. AWS Account with appropriate permissions
2. AWS CLI configured
3. Docker installed
4. Terraform or AWS CDK (optional for IaC)

#### Step 1: Create Secrets in Secrets Manager

```bash
# Create secret
aws secretsmanager create-secret \
    --name brainsait/nphies/credentials \
    --description "nphies API credentials for BrainSAIT" \
    --secret-string '{
        "NPHIES_CLIENT_ID":"your-client-id",
        "NPHIES_CLIENT_SECRET":"your-client-secret",
        "NPHIES_BASE_URL":"https://prod.nphies.sa/api"
    }' \
    --region me-south-1
```

#### Step 2: Create IAM Role for ECS Tasks

```bash
# Create IAM policy document
cat > ecs-task-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:me-south-1:*:secret:brainsait/nphies/*"
    }
  ]
}
EOF

# Create policy
aws iam create-policy \
    --policy-name BrainSAIT-SecretsAccess \
    --policy-document file://ecs-task-policy.json
```

#### Step 3: Deploy Container to ECS

```bash
# Build and push to ECR
aws ecr get-login-password --region me-south-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.me-south-1.amazonaws.com

docker build -f docker/dev.Dockerfile -t brainsait-backend .
docker tag brainsait-backend:latest YOUR_ACCOUNT_ID.dkr.ecr.me-south-1.amazonaws.com/brainsait-backend:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.me-south-1.amazonaws.com/brainsait-backend:latest

# Create ECS task definition with Secrets Manager reference
# (See AWS documentation for full ECS setup)
```
```

**Success Criteria:**
- ✅ Secrets successfully retrieved from AWS Secrets Manager
- ✅ No credentials stored in code or environment variables
- ✅ Production deployment documented
- ✅ IAM roles configured with least privilege
- ✅ Integration tests pass with secrets from Secrets Manager

**Timeline:** 1 week

---

## MEDIUM PRIORITY: Functionality Enhancements

### 4. KPI Measurement and Reporting

**Objective:** Implement calculation and reporting for key performance indicators.

**Impact:** Enable data-driven decision making and track success metrics

#### Implementation

**File:** `src/backend/kpi_calculator.py` (NEW)

```python
"""
KPI Calculator Module
Calculates key performance indicators for revenue cycle management
"""

from typing import Dict, List
from datetime import datetime, timedelta
from dataclasses import dataclass

@dataclass
class KPIMetrics:
    """Key Performance Indicators"""
    # Revenue Cycle Efficiency
    avg_ar_days: float
    dnfb_rate: float
    dnfb_amount: float
    
    # Coding Accuracy
    clean_claim_rate: float
    denial_rate: float
    coding_accuracy: float
    
    # Case Mix Index
    current_cmi: float
    baseline_cmi: float
    cmi_improvement: float
    
    # Productivity
    avg_coding_time_inpatient: float  # minutes
    avg_coding_time_outpatient: float
    automation_rate: float
    
    # CDI Effectiveness
    query_agreement_rate: float
    cc_mcc_capture_rate: float


class KPICalculator:
    """Calculate KPIs from encounter and claim data"""
    
    def calculate_ar_days(self, claims: List[Dict]) -> float:
        """
        Calculate average Accounts Receivable days
        
        AR Days = Average time from claim submission to payment
        """
        paid_claims = [c for c in claims if c.get('status') == 'FC_3' and c.get('payment_date')]
        
        if not paid_claims:
            return 0.0
        
        total_days = 0
        for claim in paid_claims:
            submitted = datetime.fromisoformat(claim['submitted_at'])
            paid = datetime.fromisoformat(claim['payment_date'])
            days = (paid - submitted).days
            total_days += days
        
        return round(total_days / len(paid_claims), 2)
    
    def calculate_dnfb(self, encounters: List[Dict]) -> Dict[str, float]:
        """
        Calculate Discharged Not Final Billed rate and amount
        
        DNFB = Encounters discharged but not yet billed
        """
        discharged = [e for e in encounters if e.get('discharge_dt')]
        
        if not discharged:
            return {"rate": 0.0, "amount": 0.0}
        
        # Count encounters discharged >48 hours ago without final bill
        dnfb_threshold = datetime.now() - timedelta(hours=48)
        dnfb_encounters = [
            e for e in discharged 
            if datetime.fromisoformat(e['discharge_dt']) < dnfb_threshold
            and not e.get('claim_submitted')
        ]
        
        dnfb_rate = len(dnfb_encounters) / len(discharged) * 100
        dnfb_amount = sum(e.get('estimated_revenue', 0) for e in dnfb_encounters)
        
        return {
            "rate": round(dnfb_rate, 2),
            "amount": round(dnfb_amount, 2)
        }
    
    def calculate_clean_claim_rate(self, claims: List[Dict]) -> float:
        """
        Calculate clean claim rate
        
        Clean Claim Rate = % of claims accepted on first submission
        """
        if not claims:
            return 0.0
        
        clean_claims = [c for c in claims if c.get('status') == 'FC_3' and c.get('revision_count', 0) == 0]
        
        return round(len(clean_claims) / len(claims) * 100, 2)
    
    def calculate_cmi(self, encounters: List[Dict]) -> Dict[str, float]:
        """
        Calculate Case Mix Index and improvement
        
        CMI = Average DRG weight across all encounters
        """
        inpatient = [e for e in encounters if e.get('encounter_type') == 'INPATIENT']
        
        if not inpatient:
            return {"current": 0.0, "baseline": 0.0, "improvement": 0.0}
        
        # Calculate current CMI
        current_weights = [e.get('relative_weight', 0) for e in inpatient]
        current_cmi = sum(current_weights) / len(current_weights)
        
        # Baseline CMI (from historical data or default)
        baseline_cmi = 1.0  # Would load from configuration
        
        # Improvement percentage
        improvement = ((current_cmi - baseline_cmi) / baseline_cmi) * 100
        
        return {
            "current": round(current_cmi, 3),
            "baseline": baseline_cmi,
            "improvement": round(improvement, 2)
        }
    
    def calculate_automation_rate(self, coding_jobs: List[Dict]) -> float:
        """
        Calculate percentage of encounters coded autonomously or semi-autonomously
        """
        if not coding_jobs:
            return 0.0
        
        automated = [
            j for j in coding_jobs 
            if j.get('phase') in ['AUTONOMOUS', 'SEMI_AUTONOMOUS']
        ]
        
        return round(len(automated) / len(coding_jobs) * 100, 2)
    
    def calculate_all_kpis(
        self,
        encounters: List[Dict],
        claims: List[Dict],
        coding_jobs: List[Dict]
    ) -> KPIMetrics:
        """Calculate all KPIs from available data"""
        ar_days = self.calculate_ar_days(claims)
        dnfb = self.calculate_dnfb(encounters)
        clean_claim_rate = self.calculate_clean_claim_rate(claims)
        cmi = self.calculate_cmi(encounters)
        automation_rate = self.calculate_automation_rate(coding_jobs)
        
        return KPIMetrics(
            avg_ar_days=ar_days,
            dnfb_rate=dnfb["rate"],
            dnfb_amount=dnfb["amount"],
            clean_claim_rate=clean_claim_rate,
            denial_rate=100 - clean_claim_rate,  # Simplified
            coding_accuracy=95.0,  # Would calculate from audit data
            current_cmi=cmi["current"],
            baseline_cmi=cmi["baseline"],
            cmi_improvement=cmi["improvement"],
            avg_coding_time_inpatient=0.0,  # Would calculate from time tracking
            avg_coding_time_outpatient=0.0,
            automation_rate=automation_rate,
            query_agreement_rate=85.0,  # Would calculate from CDI data
            cc_mcc_capture_rate=92.0  # Would calculate from coding data
        )


# Example usage
if __name__ == "__main__":
    calculator = KPICalculator()
    
    # Mock data for testing
    test_encounters = [...]
    test_claims = [...]
    test_jobs = [...]
    
    kpis = calculator.calculate_all_kpis(test_encounters, test_claims, test_jobs)
    
    print(f"Average A/R Days: {kpis.avg_ar_days}")
    print(f"DNFB Rate: {kpis.dnfb_rate}%")
    print(f"Clean Claim Rate: {kpis.clean_claim_rate}%")
    print(f"Current CMI: {kpis.current_cmi} (Improvement: {kpis.cmi_improvement}%)")
    print(f"Automation Rate: {kpis.automation_rate}%")
```

**Success Criteria:**
- ✅ All KPIs calculate correctly
- ✅ API endpoints expose KPI data
- ✅ Dashboard displays KPIs in real-time
- ✅ Historical trending available

**Timeline:** 1-2 weeks

---

### 5. Worklist Prioritization Algorithm

**Objective:** Implement intelligent worklist sorting based on opportunity score

**File:** `src/backend/worklist_prioritizer.py` (NEW)

```python
"""
Worklist Prioritization Algorithm
Scores and sorts coding jobs by opportunity impact
"""

from typing import List, Dict
from datetime import datetime
import math

def calculate_opportunity_score(
    coding_job: Dict,
    encounter: Dict,
    current_cmi: float = 1.0
) -> float:
    """
    Calculate opportunity score for a coding job
    
    Factors:
    1. Confidence Gap (30%): Lower confidence needs review
    2. CMI Impact (40%): Potential to improve Case Mix Index
    3. Revenue at Risk (20%): High-value encounters
    4. Aging (10%): Time since admission
    
    Returns:
        Score from 0-100, higher = higher priority
    """
    # Factor 1: Confidence Gap (inverse - lower confidence = higher priority)
    confidence_score = coding_job.get('confidence_score', 0)
    confidence_gap = (1.0 - confidence_score) * 30
    
    # Factor 2: CMI Impact Potential
    # Encounters with multiple diagnoses have higher CMI improvement potential
    suggested_codes = coding_job.get('suggested_codes', [])
    potential_cmi_impact = min(len(suggested_codes) / 5, 1.0) * 40
    
    # Factor 3: Revenue at Risk
    # Normalize revenue to 0-20 scale (assuming max $100K per encounter)
    estimated_revenue = encounter.get('estimated_revenue', 0)
    revenue_factor = min(estimated_revenue / 100000, 1.0) * 20
    
    # Factor 4: Aging (days since admission)
    admission_dt = encounter.get('admission_dt')
    if admission_dt:
        days_old = (datetime.now() - datetime.fromisoformat(admission_dt)).days
        # Use logarithmic scale to avoid over-penalizing very old encounters
        aging_factor = min(math.log10(days_old + 1) / math.log10(31), 1.0) * 10
    else:
        aging_factor = 0
    
    total_score = confidence_gap + potential_cmi_impact + revenue_factor + aging_factor
    
    return round(total_score, 2)


def prioritize_worklist(
    coding_jobs: List[Dict],
    encounters: Dict[str, Dict]
) -> List[Dict]:
    """
    Sort coding jobs by opportunity score (descending)
    
    Args:
        coding_jobs: List of coding job dictionaries
        encounters: Dictionary mapping encounter_id to encounter data
    
    Returns:
        Sorted list of coding jobs with opportunity_score added
    """
    # Calculate scores
    for job in coding_jobs:
        encounter_id = job.get('encounter_id')
        encounter = encounters.get(encounter_id, {})
        
        job['opportunity_score'] = calculate_opportunity_score(job, encounter)
    
    # Sort by opportunity score (descending)
    sorted_jobs = sorted(
        coding_jobs,
        key=lambda x: x['opportunity_score'],
        reverse=True
    )
    
    return sorted_jobs


# Example usage
if __name__ == "__main__":
    mock_jobs = [
        {
            "id": "job1",
            "encounter_id": "e1",
            "confidence_score": 0.65,
            "suggested_codes": [{"code": "J18.9"}]
        },
        {
            "id": "job2",
            "encounter_id": "e2",
            "confidence_score": 0.95,
            "suggested_codes": [{"code": "I21.9"}, {"code": "I50.9"}]
        }
    ]
    
    mock_encounters = {
        "e1": {
            "estimated_revenue": 25000,
            "admission_dt": "2024-08-01T10:00:00"
        },
        "e2": {
            "estimated_revenue": 75000,
            "admission_dt": "2024-08-10T14:00:00"
        }
    }
    
    prioritized = prioritize_worklist(mock_jobs, mock_encounters)
    
    for job in prioritized:
        print(f"Job {job['id']}: Score {job['opportunity_score']}")
```

**Success Criteria:**
- ✅ Opportunity scores calculate correctly
- ✅ Worklist sorted by priority
- ✅ Coders report improved workflow efficiency
- ✅ High-impact cases reviewed first

**Timeline:** 1 week

---

## LOW PRIORITY: Future Enhancements

### 6. Nudge Persistence (Database Storage)
### 7. Pediatric Population Support
### 8. Multi-Language UI Localization
### 9. Machine Learning Model Integration

(Details omitted for brevity - can be expanded in future planning cycles)

---

## Implementation Timeline Summary

| Item | Priority | Timeline | Dependencies |
|------|----------|----------|--------------|
| APR-DRG Grouper | High | 2-3 weeks | None |
| EAPG Methodology | High | 1-2 weeks | APR-DRG |
| AWS Secrets Manager | High | 1 week | None |
| KPI Reporting | Medium | 1-2 weeks | APR-DRG |
| Worklist Prioritization | Medium | 1 week | KPI Reporting |
| Nudge Persistence | Low | 1 week | None |
| ML Integration | Low | 4-6 weeks | APR-DRG, EAPG |

**Total Estimated Timeline: 6-8 weeks for High Priority items**

---

## Testing Strategy

### Unit Tests
- APR-DRG grouper: 20+ test cases covering all MDCs
- EAPG grouper: 15+ test cases for outpatient scenarios
- KPI calculator: 10+ test cases for each metric
- Secrets Manager: Mock boto3 for offline testing

### Integration Tests
- nphies sandbox environment testing
- AWS Secrets Manager retrieval in staging
- End-to-end coding workflow validation

### Performance Tests
- DRG grouping: <100ms per operation
- EAPG grouping: <50ms per operation
- Worklist prioritization: <200ms for 1000 jobs

### User Acceptance Testing
- Pilot program with 2-3 facilities
- Coder feedback on worklist prioritization
- CDI specialist validation of nudge accuracy
- Revenue cycle team CMI verification

---

## Success Metrics

### Technical Metrics
- ✅ Unit test coverage >90%
- ✅ Integration test pass rate 100%
- ✅ Zero critical security vulnerabilities
- ✅ API response time <500ms p95

### Business Metrics
- ✅ CMI improvement >5% within 3 months
- ✅ A/R days reduction >20% within 6 months
- ✅ Clean claim rate >95%
- ✅ Automation rate >60% of encounters

---

## Risk Mitigation

### Risk 1: APR-DRG Licensing
**Mitigation:** Engage Solventum for licensing discussion early; use mock implementation for pilot

### Risk 2: nphies API Changes
**Mitigation:** Version API requests; implement adapter pattern for easy updates

### Risk 3: Performance at Scale
**Mitigation:** Load testing with 10K+ encounters; implement caching strategy

### Risk 4: Data Quality
**Mitigation:** Implement data validation layers; provide data quality dashboard

---

## Conclusion

This implementation plan addresses all High Priority gaps identified in the Technical Audit Report, enabling the BrainSAIT DRG Suite to achieve full compliance with the Technical Product Requirements Document. The phased approach allows for iterative development, testing, and validation while maintaining system stability.

**Recommended Next Steps:**
1. Review and approve this implementation plan
2. Begin APR-DRG grouper development (Week 1-3)
3. Parallel track: AWS Secrets Manager integration (Week 2)
4. EAPG implementation (Week 4-5)
5. KPI reporting and prioritization (Week 6-7)
6. Integration testing and UAT preparation (Week 8)

**Expected Outcome:** Production-ready system with complete DRG/EAPG classification, secure configuration, and KPI tracking, ready for pilot program deployment.
