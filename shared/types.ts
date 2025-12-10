export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
// --- DEMO ENTITIES (can be removed) ---
export interface User {
  id: string;
  name: string;
}
export interface Chat {
  id: string;
  title: string;
}
export interface ChatMessage {
  id: string;
  chatId: string;
  userId: string;
  text: string;
  ts: number; // epoch millis
}
// --- SOLVENTUM DRG SUITE DOMAIN MODELS ---
export interface Patient {
  id: string;
  national_id?: string; // Saudi National ID (10 digits)
  iqama_id?: string; // Iqama ID for non-nationals (10 digits)
  given_name: string;
  family_name: string;
  date_of_birth?: string;
  sex?: 'Male' | 'Female' | 'Other';
  id_type?: 'NATIONAL_ID' | 'IQAMA_ID';
}
export interface Encounter {
  id: string;
  patient_id: string;
  encounter_type: 'INPATIENT' | 'OUTPATIENT' | 'ED';
  admission_dt: string; // ISO string
  clinical_note?: string;
  provider_cr?: string;
}
export interface Claim {
  id: string;
  encounter_id: string;
  claim_number: string;
  status: 'DRAFT' | 'SENT' | 'FC_3' | 'REJECTED' | 'NEEDS_REVIEW';
  submitted_at: string | null; // ISO string
  amount: number;
}
export interface SuggestedCode {
  code: string;
  desc: string;
  confidence: number;
  code_type?: 'ICD10' | 'APR_DRG' | 'EAPG' | 'CPT';
  drg_group?: number;
  severity_level?: number; // 1-4 for APR-DRG SOI/ROM
  case_mix_index?: number;
  pediatric_modifier?: boolean;
}
export interface CodingJob {
  id: string;
  encounter_id: string;
  suggested_codes: SuggestedCode[];
  status: 'NEEDS_REVIEW' | 'AUTO_DROP' | 'SENT_TO_NPHIES' | 'REJECTED';
  confidence_score: number;
  phase: 'CAC' | 'SEMI_AUTONOMOUS' | 'AUTONOMOUS';
  created_at: string; // ISO string
  source_text?: string;
}
export interface Nudge {
    id: string;
    encounter_id: string;
    severity: 'info' | 'warning' | 'critical';
    prompt: string;
    suggested_text?: string;
    status: 'active' | 'resolved' | 'dismissed';
    created_at: string; // ISO string
}
export interface AuditLog {
    id: string;
    actor: string;
    action: string;
    object_type: string;
    object_id: string;
    occurred_at: string; // ISO string
}
export interface Payment {
    id: string;
    claim_id: string;
    amount: number;
    currency: 'SAR';
    reconciled: boolean;
    received_at: string; // ISO string
}

// --- ENHANCED DRG AND KPI INTERFACES ---
export interface DRGGrouping {
  id: string;
  encounter_id: string;
  drg_type: 'APR_DRG' | 'EAPG';
  drg_code: string;
  drg_description: string;
  severity_of_illness: number; // 1-4 scale
  risk_of_mortality: number; // 1-4 scale
  case_mix_index: number;
  relative_weight: number;
  pediatric_adjusted: boolean;
  calculated_at: string; // ISO string
}

export interface SolventumCodeConfidence {
  overall_confidence: number;
  documentation_completeness: number;
  code_specificity: number;
  historical_accuracy: number;
  cross_validation_score: number;
  confidence_factors: {
    clinical_indicators: number;
    terminology_match: number;
    context_analysis: number;
    physician_patterns: number;
  };
}

export interface KPIMetrics {
  id: string;
  facility_id: string;
  period_start: string; // ISO string
  period_end: string; // ISO string
  case_mix_index: number;
  cmi_improvement_percentage: number; // Target: 7.4-8.6%
  avg_ar_days: number; // Target: <5 days
  ar_improvement_percentage: number;
  coder_productivity_increase: number; // Target: 55%
  query_agreement_rate: number; // Target: 80%+
  autonomous_coding_rate: number;
  semi_autonomous_rate: number;
  cac_rate: number;
  calculated_at: string; // ISO string
}

export interface CDIEngageOne {
  id: string;
  encounter_id: string;
  real_time_nudges: CDINudge[];
  documentation_score: number;
  completion_percentage: number;
  active_session: boolean;
  physician_id: string;
  ehr_integration_status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  last_activity: string; // ISO string
}

export interface CDINudge {
  id: string;
  encounter_id: string;
  severity: 'info' | 'warning' | 'critical';
  prompt: string;
  suggested_text?: string;
  status: 'active' | 'resolved' | 'dismissed';
  created_at: string; // ISO string
  nudge_type: 'SPECIFICITY' | 'LATERALITY' | 'SEVERITY' | 'ORGANISM' | 'COMPLICATION';
  clinical_context: string;
  expected_improvement: {
    cmi_impact: number;
    coding_accuracy_impact: number;
  };
}

export interface ProviderCredentials {
  id: string;
  name: string;
  cr_number: string; // Commercial Registration Number
  npi?: string;
  license_number?: string;
  specialties: string[];
  facility_affiliations: string[];
  nphies_provider_id: string;
  verification_status: 'VERIFIED' | 'PENDING' | 'FAILED';
  last_verified: string; // ISO string
}

export interface NphiesIntegration {
  connection_status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  last_successful_auth: string; // ISO string
  token_expires_at: string; // ISO string
  api_version: string;
  rate_limit_remaining: number;
  error_count_24h: number;
  success_rate_percentage: number;
}