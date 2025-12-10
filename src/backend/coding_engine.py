import re
import math
from datetime import datetime, date
from typing import Dict, Any, List, TypedDict, Optional, Tuple
# Mock NphiesConnector for demonstration without real API calls
class MockNphiesConnector:
    def submit_claim(self, claim_data: Dict[str, Any]) -> Dict[str, Any]:
        print(f"--- [MOCK NPHIES] Submitting claim: {claim_data.get('claimNumber')} ---")
        return {"status": "SUBMITTED", "nphiesClaimId": f"NPH-{claim_data.get('claimNumber')}"}
# Type definitions for clarity
class SuggestedCode(TypedDict):
    code: str
    desc: str
    confidence: float
    code_type: str  # 'ICD10' | 'APR_DRG' | 'EAPG' | 'CPT'
    drg_group: Optional[int]
    severity_level: Optional[int]  # 1-4 for APR-DRG SOI/ROM
    case_mix_index: Optional[float]
    pediatric_modifier: Optional[bool]

class SolventumConfidence(TypedDict):
    overall_confidence: float
    documentation_completeness: float
    code_specificity: float
    historical_accuracy: float
    cross_validation_score: float
    confidence_factors: Dict[str, float]

class DRGGrouping(TypedDict):
    drg_type: str  # 'APR_DRG' | 'EAPG'
    drg_code: str
    drg_description: str
    severity_of_illness: int
    risk_of_mortality: int
    case_mix_index: float
    relative_weight: float
    pediatric_adjusted: bool
class CodingResult(TypedDict):
    engine_version: str
    source_text: str
    suggested_codes: List[SuggestedCode]
    final_codes: List[SuggestedCode]
    status: str
    confidence_score: float
    phase: str
    drg_grouping: Optional[DRGGrouping]
    solventum_confidence: Optional[SolventumConfidence]

class EnhancedCodingEngine:
    """
    Enhanced coding engine supporting APR-DRGs for inpatient cases (including pediatric)
    and EAPGs for outpatient visits. Implements Solventum Code Confidence scoring
    and three-phase automation logic with Saudi healthcare market specifics.
    """
    ENGINE_VERSION = "2.0.0-enhanced-drg"
    
    # Enhanced mapping with DRG grouping support
    ENHANCED_TERM_MAP = {
        # Pneumonia - APR-DRG 194 (Inpatient)
        "pneumonia": {
            "icd10": {"code": "J18.9", "desc": "Pneumonia, unspecified organism", "confidence": 0.85},
            "apr_drg": {"code": "194", "desc": "Simple pneumonia & pleurisy", "base_cmi": 1.2456, "soi_range": (1, 3)},
            "eapg": {"code": "0194", "desc": "Pneumonia treatment - outpatient", "base_cmi": 0.8934}
        },
        # Myocardial Infarction - APR-DRG 174-175
        "myocardial infarction": {
            "icd10": {"code": "I21.9", "desc": "Acute myocardial infarction, unspecified", "confidence": 0.99},
            "apr_drg": {"code": "174", "desc": "AMI w/o invasive cardiac procedure", "base_cmi": 2.1234, "soi_range": (2, 4)},
            "eapg": {"code": "0174", "desc": "Cardiac evaluation - outpatient", "base_cmi": 1.1234}
        },
        # Appendicitis - APR-DRG 338
        "appendicitis": {
            "icd10": {"code": "K37", "desc": "Unspecified appendicitis", "confidence": 0.95},
            "apr_drg": {"code": "338", "desc": "Appendectomy w/o complicated principal diagnosis", "base_cmi": 1.5678, "soi_range": (1, 3)},
            "eapg": {"code": "0338", "desc": "Appendicitis evaluation - outpatient", "base_cmi": 0.7890}
        },
        # UTI - APR-DRG 463
        "uti": {
            "icd10": {"code": "N39.0", "desc": "Urinary tract infection, site not specified", "confidence": 0.80},
            "apr_drg": {"code": "463", "desc": "Kidney & urinary tract infections", "base_cmi": 0.9876, "soi_range": (1, 2)},
            "eapg": {"code": "0463", "desc": "UTI treatment - outpatient", "base_cmi": 0.5432}
        },
        # Fracture - APR-DRG 540
        "fracture": {
            "icd10": {"code": "S82.90XA", "desc": "Unspecified fracture of lower leg, initial encounter", "confidence": 0.75},
            "apr_drg": {"code": "540", "desc": "Fractures of hip & pelvis", "base_cmi": 1.3456, "soi_range": (1, 3)},
            "eapg": {"code": "0540", "desc": "Fracture evaluation - outpatient", "base_cmi": 0.8765}
        },
        # Diabetes - APR-DRG 420
        "diabetes": {
            "icd10": {"code": "E11.9", "desc": "Type 2 diabetes mellitus without complications", "confidence": 0.92},
            "apr_drg": {"code": "420", "desc": "Diabetes", "base_cmi": 0.8765, "soi_range": (1, 2)},
            "eapg": {"code": "0420", "desc": "Diabetes management - outpatient", "base_cmi": 0.6543}
        },
        # Hypertension - APR-DRG 194 (often secondary)
        "hypertension": {
            "icd10": {"code": "I10", "desc": "Essential (primary) hypertension", "confidence": 0.98},
            "apr_drg": {"code": "194", "desc": "Hypertensive diseases", "base_cmi": 0.7654, "soi_range": (1, 2)},
            "eapg": {"code": "0194", "desc": "Hypertension management - outpatient", "base_cmi": 0.4321}
        }
    }
    
    # Pediatric age threshold (under 18 years)
    PEDIATRIC_AGE_THRESHOLD = 18
    
    # Confidence thresholds for automation phases
    CONFIDENCE_THRESHOLDS = {
        'AUTONOMOUS': 0.95,      # High confidence for autonomous coding
        'SEMI_AUTONOMOUS': 0.75, # Medium confidence for semi-autonomous
        'CAC': 0.0              # All others go to CAC
    }
    def __init__(self, nphies_connector: Any = None):
        self.nphies_connector = nphies_connector or MockNphiesConnector()
    
    def _calculate_patient_age(self, date_of_birth: str) -> int:
        """Calculate patient age from date of birth string."""
        try:
            if isinstance(date_of_birth, str):
                birth_date = datetime.fromisoformat(date_of_birth.replace('Z', '+00:00')).date()
            else:
                birth_date = date_of_birth
            today = date.today()
            return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        except:
            return 25  # Default adult age if parsing fails
    
    def _is_pediatric_case(self, patient_meta: Dict[str, Any]) -> bool:
        """Determine if this is a pediatric case."""
        if 'date_of_birth' in patient_meta:
            age = self._calculate_patient_age(patient_meta['date_of_birth'])
            return age < self.PEDIATRIC_AGE_THRESHOLD
        return False
    
    def _calculate_solventum_confidence(self, clinical_note: str, suggested_codes: List[SuggestedCode], 
                                      encounter_meta: Dict[str, Any]) -> SolventumConfidence:
        """
        Calculate Solventum Code Confidence using multiple factors.
        This is a sophisticated scoring system that considers various aspects of coding accuracy.
        """
        # Documentation completeness (0-1 scale)
        note_length = len(clinical_note.split())
        completeness_score = min(1.0, note_length / 100)  # Normalize based on expected note length
        
        # Code specificity (higher for more specific codes)
        specificity_scores = []
        for code in suggested_codes:
            # More specific codes (longer, with modifiers) get higher scores
            code_specificity = min(1.0, len(code['code']) / 10)
            if '.' in code['code']:  # ICD-10 with decimal specificity
                code_specificity += 0.1
            specificity_scores.append(code_specificity)
        
        code_specificity = sum(specificity_scores) / len(specificity_scores) if specificity_scores else 0.5
        
        # Historical accuracy (simulated based on code confidence)
        historical_accuracy = sum(code['confidence'] for code in suggested_codes) / len(suggested_codes) if suggested_codes else 0.5
        
        # Cross-validation score (simulated)
        cross_validation = min(1.0, len(suggested_codes) * 0.2 + 0.6)  # More codes = better validation
        
        # Confidence factors
        clinical_indicators = self._assess_clinical_indicators(clinical_note)
        terminology_match = self._assess_terminology_match(clinical_note, suggested_codes)
        context_analysis = self._assess_context_analysis(clinical_note, encounter_meta)
        physician_patterns = 0.85  # Simulated physician consistency score
        
        # Overall confidence calculation
        overall_confidence = (
            completeness_score * 0.2 +
            code_specificity * 0.25 +
            historical_accuracy * 0.25 +
            cross_validation * 0.15 +
            clinical_indicators * 0.15
        )
        
        return {
            'overall_confidence': round(overall_confidence, 3),
            'documentation_completeness': round(completeness_score, 3),
            'code_specificity': round(code_specificity, 3),
            'historical_accuracy': round(historical_accuracy, 3),
            'cross_validation_score': round(cross_validation, 3),
            'confidence_factors': {
                'clinical_indicators': round(clinical_indicators, 3),
                'terminology_match': round(terminology_match, 3),
                'context_analysis': round(context_analysis, 3),
                'physician_patterns': round(physician_patterns, 3)
            }
        }
    
    def _assess_clinical_indicators(self, clinical_note: str) -> float:
        """Assess the presence of clinical indicators in the note."""
        indicators = ['diagnosis', 'symptoms', 'treatment', 'medication', 'procedure', 'vital signs']
        note_lower = clinical_note.lower()
        found_indicators = sum(1 for indicator in indicators if indicator in note_lower)
        return min(1.0, found_indicators / len(indicators))
    
    def _assess_terminology_match(self, clinical_note: str, suggested_codes: List[SuggestedCode]) -> float:
        """Assess how well the terminology matches the suggested codes."""
        if not suggested_codes:
            return 0.5
        
        note_lower = clinical_note.lower()
        matches = 0
        for code in suggested_codes:
            # Check if code description terms appear in the note
            desc_words = code['desc'].lower().split()
            for word in desc_words:
                if len(word) > 3 and word in note_lower:  # Skip short words
                    matches += 1
                    break
        
        return min(1.0, matches / len(suggested_codes))
    
    def _assess_context_analysis(self, clinical_note: str, encounter_meta: Dict[str, Any]) -> float:
        """Assess contextual appropriateness of the coding."""
        encounter_type = encounter_meta.get('encounter_type', 'OUTPATIENT')
        note_lower = clinical_note.lower()
        
        # Context indicators based on encounter type
        if encounter_type == 'INPATIENT':
            inpatient_indicators = ['admission', 'discharge', 'hospital', 'ward', 'length of stay']
            found = sum(1 for indicator in inpatient_indicators if indicator in note_lower)
            return min(1.0, found / len(inpatient_indicators) + 0.3)
        elif encounter_type == 'OUTPATIENT':
            outpatient_indicators = ['clinic', 'visit', 'follow-up', 'appointment', 'routine']
            found = sum(1 for indicator in outpatient_indicators if indicator in note_lower)
            return min(1.0, found / len(outpatient_indicators) + 0.3)
        else:
            return 0.7  # Default for ED or other types
    
    def _determine_drg_grouping(self, suggested_codes: List[SuggestedCode], encounter_meta: Dict[str, Any], 
                               patient_meta: Dict[str, Any]) -> Optional[DRGGrouping]:
        """
        Determine appropriate DRG grouping (APR-DRG for inpatient, EAPG for outpatient).
        """
        encounter_type = encounter_meta.get('encounter_type', 'OUTPATIENT')
        is_pediatric = self._is_pediatric_case(patient_meta)
        
        # Find the primary diagnosis code
        primary_code = None
        for code in suggested_codes:
            if code.get('code_type') == 'ICD10':
                primary_code = code
                break
        
        if not primary_code:
            return None
        
        # Find matching DRG information from our enhanced term map
        drg_info = None
        for term, mapping in self.ENHANCED_TERM_MAP.items():
            if mapping['icd10']['code'] == primary_code['code']:
                drg_info = mapping
                break
        
        if not drg_info:
            return None
        
        # Determine DRG type based on encounter type
        if encounter_type == 'INPATIENT':
            drg_type = 'APR_DRG'
            drg_data = drg_info['apr_drg']
        else:
            drg_type = 'EAPG'
            drg_data = drg_info['eapg']
        
        # Calculate severity of illness and risk of mortality
        soi = self._calculate_severity_of_illness(encounter_meta, patient_meta)
        rom = self._calculate_risk_of_mortality(encounter_meta, patient_meta, soi)
        
        # Adjust CMI for pediatric cases
        base_cmi = drg_data['base_cmi']
        if is_pediatric and drg_type == 'APR_DRG':
            base_cmi *= 1.15  # 15% increase for pediatric complexity
        
        # Adjust CMI based on severity
        severity_multiplier = 1.0 + (soi - 1) * 0.25  # 25% increase per severity level
        final_cmi = base_cmi * severity_multiplier
        
        return {
            'drg_type': drg_type,
            'drg_code': drg_data['code'],
            'drg_description': drg_data['desc'],
            'severity_of_illness': soi,
            'risk_of_mortality': rom,
            'case_mix_index': round(final_cmi, 4),
            'relative_weight': round(final_cmi, 4),
            'pediatric_adjusted': is_pediatric
        }
    
    def _calculate_severity_of_illness(self, encounter_meta: Dict[str, Any], patient_meta: Dict[str, Any]) -> int:
        """Calculate Severity of Illness (SOI) on a 1-4 scale."""
        base_soi = 1
        
        # Age factor
        if 'date_of_birth' in patient_meta:
            age = self._calculate_patient_age(patient_meta['date_of_birth'])
            if age > 65:
                base_soi += 1
            elif age < 1:  # Neonates
                base_soi += 2
        
        # Encounter complexity
        visit_complexity = encounter_meta.get('visit_complexity', 'standard')
        if 'high-complexity' in visit_complexity:
            base_soi += 2
        elif 'moderate-complexity' in visit_complexity:
            base_soi += 1
        
        return min(4, base_soi)
    
    def _calculate_risk_of_mortality(self, encounter_meta: Dict[str, Any], patient_meta: Dict[str, Any], soi: int) -> int:
        """Calculate Risk of Mortality (ROM) on a 1-4 scale."""
        # ROM is typically correlated with SOI but can be different
        base_rom = max(1, soi - 1)
        
        # Additional risk factors
        if encounter_meta.get('encounter_type') == 'ED':
            base_rom += 1  # Emergency cases have higher mortality risk
        
        return min(4, base_rom)
    
    def _enhanced_nlp_analysis(self, text: str, encounter_meta: Dict[str, Any]) -> List[SuggestedCode]:
        """
        Enhanced NLP analysis that generates both ICD-10 codes and appropriate DRG codes.
        """
        suggestions = []
        text_lower = text.lower()
        encounter_type = encounter_meta.get('encounter_type', 'OUTPATIENT')
        
        # Process each term in our enhanced mapping
        for term, mapping in self.ENHANCED_TERM_MAP.items():
            # Check for term matches (including Arabic terms)
            term_patterns = [term]
            if term == 'pneumonia':
                term_patterns.extend(['سعال شديد', 'pneumonitis'])
            elif term == 'appendicitis':
                term_patterns.extend(['ألم الزائدة', 'appendix pain'])
            elif term == 'fracture':
                term_patterns.extend(['كسر', 'broken bone'])
            elif term == 'diabetes':
                term_patterns.extend(['sukari', 'diabetic'])
            elif term == 'hypertension':
                term_patterns.extend(['ضغط دم مرتفع', 'high blood pressure'])
            
            for pattern in term_patterns:
                if re.search(r'\b' + re.escape(pattern) + r'\b', text_lower):
                    # Add ICD-10 code
                    icd_info = mapping['icd10']
                    suggestions.append({
                        'code': icd_info['code'],
                        'desc': icd_info['desc'],
                        'confidence': icd_info['confidence'],
                        'code_type': 'ICD10',
                        'drg_group': None,
                        'severity_level': None,
                        'case_mix_index': None,
                        'pediatric_modifier': False
                    })
                    
                    # Add appropriate DRG code based on encounter type
                    if encounter_type == 'INPATIENT':
                        drg_info = mapping['apr_drg']
                        suggestions.append({
                            'code': drg_info['code'],
                            'desc': drg_info['desc'],
                            'confidence': icd_info['confidence'] * 0.95,  # Slightly lower for DRG
                            'code_type': 'APR_DRG',
                            'drg_group': int(drg_info['code']),
                            'severity_level': 2,  # Default, will be recalculated
                            'case_mix_index': drg_info['base_cmi'],
                            'pediatric_modifier': False
                        })
                    else:
                        eapg_info = mapping['eapg']
                        suggestions.append({
                            'code': eapg_info['code'],
                            'desc': eapg_info['desc'],
                            'confidence': icd_info['confidence'] * 0.90,  # Lower for outpatient
                            'code_type': 'EAPG',
                            'drg_group': int(eapg_info['code']),
                            'severity_level': 1,  # Outpatient typically lower severity
                            'case_mix_index': eapg_info['base_cmi'],
                            'pediatric_modifier': False
                        })
                    break
        
        return suggestions
    
    def run_coding_job(self, clinical_note: str, encounter_meta: Dict[str, Any], 
                      patient_meta: Dict[str, Any] = None) -> CodingResult:
        """
        Executes the enhanced coding logic flow with APR-DRG/EAPG support and Solventum confidence.
        """
        if patient_meta is None:
            patient_meta = {}
        
        # Enhanced NLP analysis
        suggested_codes = self._enhanced_nlp_analysis(clinical_note, encounter_meta)
        
        if not suggested_codes:
            suggested_codes = [{
                'code': 'Z00.00',
                'desc': 'General medical examination, unspecified',
                'confidence': 0.50,
                'code_type': 'ICD10',
                'drg_group': None,
                'severity_level': None,
                'case_mix_index': None,
                'pediatric_modifier': False
            }]
        
        # Calculate Solventum Code Confidence
        solventum_confidence = self._calculate_solventum_confidence(clinical_note, suggested_codes, encounter_meta)
        overall_confidence = solventum_confidence['overall_confidence']
        
        # Determine DRG grouping
        drg_grouping = self._determine_drg_grouping(suggested_codes, encounter_meta, patient_meta)
        
        # Determine automation phase
        visit_complexity = encounter_meta.get("visit_complexity", "standard")
        encounter_type = encounter_meta.get("encounter_type", "OUTPATIENT")
        
        # Phase 3: Autonomous Coding
        if (overall_confidence >= self.CONFIDENCE_THRESHOLDS['AUTONOMOUS'] and 
            visit_complexity == 'low-complexity outpatient' and 
            encounter_type == 'OUTPATIENT'):
            
            claim_payload = self._create_enhanced_claim_payload(encounter_meta, patient_meta, suggested_codes, drg_grouping)
            self.nphies_connector.submit_claim(claim_payload)
            
            return {
                "engine_version": self.ENGINE_VERSION,
                "source_text": clinical_note,
                "suggested_codes": suggested_codes,
                "final_codes": suggested_codes,
                "status": "SENT_TO_NPHIES",
                "confidence_score": round(overall_confidence, 3),
                "phase": "AUTONOMOUS",
                "drg_grouping": drg_grouping,
                "solventum_confidence": solventum_confidence
            }
        
        # Phase 2: Semi-Autonomous Coding
        elif overall_confidence >= self.CONFIDENCE_THRESHOLDS['SEMI_AUTONOMOUS']:
            return {
                "engine_version": self.ENGINE_VERSION,
                "source_text": clinical_note,
                "suggested_codes": suggested_codes,
                "final_codes": [],
                "status": "AUTO_DROP",
                "confidence_score": round(overall_confidence, 3),
                "phase": "SEMI_AUTONOMOUS",
                "drg_grouping": drg_grouping,
                "solventum_confidence": solventum_confidence
            }
        
        # Phase 1: Computer-Assisted Coding (CAC) - Default
        else:
            return {
                "engine_version": self.ENGINE_VERSION,
                "source_text": clinical_note,
                "suggested_codes": suggested_codes,
                "final_codes": [],
                "status": "NEEDS_REVIEW",
                "confidence_score": round(overall_confidence, 3),
                "phase": "CAC",
                "drg_grouping": drg_grouping,
                "solventum_confidence": solventum_confidence
            }
    
    def _create_enhanced_claim_payload(self, encounter: Dict[str, Any], patient: Dict[str, Any], 
                                     codes: List[SuggestedCode], drg_grouping: Optional[DRGGrouping]) -> Dict[str, Any]:
        """Creates an enhanced claim payload with DRG information for nphies submission."""
        
        base_amount = 1000.00
        if drg_grouping:
            total_amount = base_amount * drg_grouping['case_mix_index']
        else:
            total_amount = base_amount
        
        icd_codes = [c for c in codes if c.get('code_type') == 'ICD10']
        
        payload = {
            "claimNumber": f"CLAIM-{encounter.get('id', 'UNKNOWN')}",
            "patient": {
                "id": patient.get("id", encounter.get("patient_id")),
                "nationalId": patient.get("national_id"),
                "iqamaId": patient.get("iqama_id"),
                "idType": patient.get("id_type", "NATIONAL_ID")
            },
            "provider": {
                "cr_number": encounter.get("provider_cr", "1010123456"),
                "nphies_provider_id": "NPHIES-PROV-001"
            },
            "drg_information": drg_grouping,
            "items": [{"serviceCode": c["code"], "description": c["desc"]} for c in codes],
            "total": round(total_amount, 2),
            "currency": "SAR"
        }
        
        return payload

# Maintain backward compatibility
CodingEngine = EnhancedCodingEngine
