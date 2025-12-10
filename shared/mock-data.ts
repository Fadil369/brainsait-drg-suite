import type { User, Chat, ChatMessage, Patient, Claim, CodingJob, Encounter, Nudge, AuditLog, Payment, DRGGrouping, SolventumCodeConfidence, KPIMetrics, CDIEngageOne, CDINudge, ProviderCredentials, NphiesIntegration } from './types';
export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'User A' },
  { id: 'u2', name: 'User B' }
];
export const MOCK_CHATS: Chat[] = [
  { id: 'c1', title: 'General' },
];
export const MOCK_CHAT_MESSAGES: ChatMessage[] = [
  { id: 'm1', chatId: 'c1', userId: 'u1', text: 'Hello', ts: Date.now() },
];
// --- SOLVENTUM MOCK DATA ---
export const MOCK_CLINICAL_NOTES: string[] = [
    "Patient with sukari symptoms, no complications noted.",
    "High blood pressure diagnosed, ضغط دم مرتفع controlled with medication.",
    "Appendix pain and inflammation, suspected appendicitis.",
    "Left leg fracture after fall, كسر in tibia.",
    "Low-complexity outpatient visit for fever and cough.",
    "Pneumonia with bacterial organism suspected. سعال شديد reported.",
    "UTI with catheter association.",
    "Myocardial infarction STEMI confirmed.",
    "Hypertension crisis, I10 code needed.",
    "Diabetes type 2, E11.9 unspecified.",
    "Patient presents with classic signs of acute myocardial infarction. EKG confirms.",
    "Diagnosis of appendicitis confirmed by imaging. ألم الزائدة is severe.",
    "Patient complains of cough and fever. Suspected pneumonia.",
    "Patient is a known diabetic and presents for routine checkup.",
    "Routine check for high blood pressure."
];
export const MOCK_PATIENTS: Patient[] = [
  { id: 'p1', national_id: '1012345678', given_name: 'Fatima', family_name: 'Al-Fahad', date_of_birth: '1985-03-15', sex: 'Female', id_type: 'NATIONAL_ID' },
  { id: 'p2', iqama_id: '2023456789', given_name: 'Mohammed', family_name: 'Al-Ghamdi', date_of_birth: '1978-11-22', sex: 'Male', id_type: 'IQAMA_ID' },
  { id: 'p3', national_id: '1034567890', given_name: 'Aisha', family_name: 'Al-Qahtani', date_of_birth: '1992-07-08', sex: 'Female', id_type: 'NATIONAL_ID' },
  { id: 'p4', national_id: '1045678901', given_name: 'Khaled', family_name: 'Al-Mutairi', date_of_birth: '1965-12-03', sex: 'Male', id_type: 'NATIONAL_ID' },
  { id: 'p5', iqama_id: '2056789012', given_name: 'Noura', family_name: 'Al-Dosari', date_of_birth: '1990-09-18', sex: 'Female', id_type: 'IQAMA_ID' },
];
export const MOCK_ENCOUNTERS: Encounter[] = [
    { id: 'e1', patient_id: 'p1', encounter_type: 'INPATIENT', admission_dt: new Date('2024-08-01T10:00:00Z').toISOString() },
    { id: 'e2', patient_id: 'p2', encounter_type: 'OUTPATIENT', admission_dt: new Date('2024-08-02T11:30:00Z').toISOString() },
    { id: 'e3', patient_id: 'p3', encounter_type: 'ED', admission_dt: new Date('2024-08-03T14:00:00Z').toISOString() },
    { id: 'e4', patient_id: 'p4', encounter_type: 'INPATIENT', admission_dt: new Date('2024-08-04T09:00:00Z').toISOString() },
    { id: 'e5', patient_id: 'p5', encounter_type: 'INPATIENT', admission_dt: new Date('2024-08-05T18:00:00Z').toISOString() },
];
export const MOCK_CLAIMS: Claim[] = [
  { id: 'cl1', encounter_id: 'e1', claim_number: 'CLM-2024-001', status: 'FC_3', submitted_at: new Date('2024-08-02T10:00:00Z').toISOString(), amount: 12500.50 },
  { id: 'cl2', encounter_id: 'e2', claim_number: 'CLM-2024-002', status: 'SENT', submitted_at: new Date('2024-08-03T11:30:00Z').toISOString(), amount: 850.00 },
  { id: 'cl3', encounter_id: 'e3', claim_number: 'CLM-2024-003', status: 'REJECTED', submitted_at: new Date('2024-08-04T14:00:00Z').toISOString(), amount: 1200.75 },
  { id: 'cl4', encounter_id: 'e4', claim_number: 'CLM-2024-004', status: 'NEEDS_REVIEW', submitted_at: null, amount: 25000.00 },
  { id: 'cl5', encounter_id: 'e5', claim_number: 'CLM-2024-005', status: 'DRAFT', submitted_at: null, amount: 18000.00 },
  { id: 'cl6', encounter_id: 'e1', claim_number: 'CLM-2024-006', status: 'DRAFT', submitted_at: null, amount: 9500.00 },
  { id: 'cl7', encounter_id: 'e2', claim_number: 'CLM-2024-007', status: 'FC_3', submitted_at: new Date('2024-08-05T12:00:00Z').toISOString(), amount: 450.25 },
  { id: 'cl8', encounter_id: 'e3', claim_number: 'CLM-2024-008', status: 'SENT', submitted_at: new Date('2024-08-06T15:00:00Z').toISOString(), amount: 1500.00 },
  { id: 'cl9', encounter_id: 'e4', claim_number: 'CLM-2024-009', status: 'NEEDS_REVIEW', submitted_at: null, amount: 32000.00 },
  { id: 'cl10', encounter_id: 'e5', claim_number: 'CLM-2024-010', status: 'DRAFT', submitted_at: null, amount: 21000.00 },
];
export const MOCK_CODING_JOBS: CodingJob[] = [
  { id: 'job1', encounter_id: 'e1', suggested_codes: [{ code: 'J18.9', desc: 'Pneumonia, unspecified', confidence: 0.85 }], status: 'NEEDS_REVIEW', confidence_score: 0.85, phase: 'CAC', created_at: new Date().toISOString() },
  { id: 'job2', encounter_id: 'e2', suggested_codes: [{ code: 'I21.9', desc: 'Acute MI, unspecified', confidence: 0.99 }], status: 'SENT_TO_NPHIES', confidence_score: 0.99, phase: 'AUTONOMOUS', created_at: new Date().toISOString() },
  { id: 'job3', encounter_id: 'e3', suggested_codes: [{ code: 'K37', desc: 'Unspecified appendicitis', confidence: 0.92 }], status: 'AUTO_DROP', confidence_score: 0.92, phase: 'SEMI_AUTONOMOUS', created_at: new Date().toISOString() },
  { id: 'job4', encounter_id: 'e4', suggested_codes: [{ code: 'S82.90XA', desc: 'Unspecified fracture of lower leg', confidence: 0.78 }], status: 'NEEDS_REVIEW', confidence_score: 0.78, phase: 'CAC', created_at: new Date().toISOString() },
  { id: 'job5', encounter_id: 'e5', suggested_codes: [{ code: 'N39.0', desc: 'UTI, site not specified', confidence: 0.81 }], status: 'NEEDS_REVIEW', confidence_score: 0.81, phase: 'CAC', created_at: new Date().toISOString() },
  { id: 'job6', encounter_id: 'e1', suggested_codes: [], status: 'NEEDS_REVIEW', confidence_score: 0, phase: 'CAC', created_at: new Date().toISOString() },
  { id: 'job7', encounter_id: 'e2', suggested_codes: [{ code: 'R05', desc: 'Cough', confidence: 0.95 }], status: 'AUTO_DROP', confidence_score: 0.95, phase: 'SEMI_AUTONOMOUS', created_at: new Date().toISOString() },
  { id: 'job8', encounter_id: 'e3', suggested_codes: [{ code: 'R50.9', desc: 'Fever, unspecified', confidence: 0.98 }], status: 'AUTO_DROP', confidence_score: 0.98, phase: 'SEMI_AUTONOMOUS', created_at: new Date().toISOString() },
  { id: 'job9', encounter_id: 'e1', suggested_codes: [{code: 'E11.9', desc: 'Type 2 diabetes mellitus without complications', confidence: 0.92}], status: 'AUTO_DROP', confidence_score: 0.92, phase: 'SEMI_AUTONOMOUS', created_at: new Date().toISOString() },
  { id: 'job10', encounter_id: 'e2', suggested_codes: [{code: 'I10', desc: 'Essential hypertension', confidence: 0.99}], status: 'SENT_TO_NPHIES', confidence_score: 0.99, phase: 'AUTONOMOUS', created_at: new Date().toISOString() },
  { id: 'job11', encounter_id: 'e3', suggested_codes: [{code: 'K37', desc: 'Unspecified appendicitis', confidence: 0.94}], status: 'AUTO_DROP', confidence_score: 0.94, phase: 'SEMI_AUTONOMOUS', created_at: new Date().toISOString() },
  { id: 'job12', encounter_id: 'e4', suggested_codes: [{code: 'S82.90XA', desc: 'Unspecified fracture of lower leg, check laterality', confidence: 0.75}], status: 'NEEDS_REVIEW', confidence_score: 0.75, phase: 'CAC', created_at: new Date().toISOString() },
  { id: 'job13', encounter_id: 'e5', suggested_codes: [{code: 'E11.9', desc: 'Type 2 diabetes mellitus without complications', confidence: 0.88}, {code: 'I10', desc: 'Essential (primary) hypertension', confidence: 0.91}], status: 'AUTO_DROP', confidence_score: 0.90, phase: 'SEMI_AUTONOMOUS', created_at: new Date().toISOString() },
  { id: 'job14', encounter_id: 'e1', suggested_codes: [{code: 'J18.9', desc: 'Pneumonia, unspecified organism', confidence: 0.82}], status: 'NEEDS_REVIEW', confidence_score: 0.82, phase: 'CAC', created_at: new Date().toISOString() },
  { id: 'job15', encounter_id: 'e2', suggested_codes: [{code: 'N39.0', desc: 'Urinary tract infection, site not specified', confidence: 0.84}], status: 'NEEDS_REVIEW', confidence_score: 0.84, phase: 'CAC', created_at: new Date().toISOString() },
];
export const MOCK_NUDGES: Nudge[] = [
    { id: 'n1', encounter_id: 'e1', severity: 'warning', prompt: "Specify the causative organism for 'pneumonia' if known.", status: 'active', created_at: new Date().toISOString() },
    { id: 'n2', encounter_id: 'e4', severity: 'critical', prompt: "Specify laterality (left, right) for the diagnosed 'fracture'.", status: 'active', created_at: new Date().toISOString() },
    { id: 'n3', encounter_id: 'e5', severity: 'info', prompt: "Consider documenting if UTI is catheter-associated.", status: 'active', created_at: new Date().toISOString() },
    { id: 'n4', encounter_id: 'e2', severity: 'warning', prompt: "Specify type of Myocardial Infarction (e.g., STEMI, NSTEMI).", status: 'resolved', created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 'n5', encounter_id: 'e3', severity: 'warning', prompt: "Clarify if appendicitis is with or without perforation.", status: 'dismissed', created_at: new Date(Date.now() - 172800000).toISOString() },
];
export const MOCK_AUDIT_LOGS: AuditLog[] = [
    { id: 'al1', actor: 'system', action: 'claim.submitted', object_type: 'claim', object_id: 'cl2', occurred_at: new Date().toISOString() },
    { id: 'al2', actor: 'user:coder@hospital.sa', action: 'coding_job.reviewed', object_type: 'coding_job', object_id: 'job1', occurred_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 'al3', actor: 'system', action: 'nphies.token_refreshed', object_type: 'integration', object_id: 'nphies', occurred_at: new Date(Date.now() - 7200000).toISOString() },
    { id: 'al4', actor: 'system', action: 'claim.status_updated', object_type: 'claim', object_id: 'cl3', occurred_at: new Date(Date.now() - 10800000).toISOString() },
    { id: 'al5', actor: 'user:admin@solventum.sa', action: 'user.login', object_type: 'user', object_id: 'admin@solventum.sa', occurred_at: new Date(Date.now() - 14400000).toISOString() },
];
export const MOCK_PAYMENTS: Payment[] = [
    { id: 'pay1', claim_id: 'cl1', amount: 12500.50, currency: 'SAR', reconciled: true, received_at: new Date().toISOString() },
    { id: 'pay2', claim_id: 'cl7', amount: 450.25, currency: 'SAR', reconciled: true, received_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 'pay3', claim_id: 'cl2', amount: 850.00, currency: 'SAR', reconciled: false, received_at: new Date(Date.now() - 172800000).toISOString() },
    { id: 'pay4', claim_id: 'cl8', amount: 1500.00, currency: 'SAR', reconciled: false, received_at: new Date(Date.now() - 259200000).toISOString() },
];

// --- ENHANCED DRG AND KPI MOCK DATA ---
export const MOCK_DRG_GROUPINGS: DRGGrouping[] = [
  { 
    id: 'drg1', 
    encounter_id: 'e1', 
    drg_type: 'APR_DRG', 
    drg_code: '194', 
    drg_description: 'Simple pneumonia & pleurisy w CC', 
    severity_of_illness: 2, 
    risk_of_mortality: 2, 
    case_mix_index: 1.2456, 
    relative_weight: 1.2456, 
    pediatric_adjusted: false, 
    calculated_at: new Date().toISOString() 
  },
  { 
    id: 'drg2', 
    encounter_id: 'e2', 
    drg_type: 'EAPG', 
    drg_code: '0012', 
    drg_description: 'Level II Cardiac Procedures', 
    severity_of_illness: 1, 
    risk_of_mortality: 1, 
    case_mix_index: 0.8934, 
    relative_weight: 0.8934, 
    pediatric_adjusted: false, 
    calculated_at: new Date().toISOString() 
  },
  { 
    id: 'drg3', 
    encounter_id: 'e4', 
    drg_type: 'APR_DRG', 
    drg_code: '540', 
    drg_description: 'Fractures of hip & pelvis w/o CC/MCC', 
    severity_of_illness: 1, 
    risk_of_mortality: 1, 
    case_mix_index: 0.9876, 
    relative_weight: 0.9876, 
    pediatric_adjusted: false, 
    calculated_at: new Date().toISOString() 
  },
];

export const MOCK_SOLVENTUM_CONFIDENCE: SolventumCodeConfidence[] = [
  {
    overall_confidence: 0.92,
    documentation_completeness: 0.88,
    code_specificity: 0.95,
    historical_accuracy: 0.91,
    cross_validation_score: 0.94,
    confidence_factors: {
      clinical_indicators: 0.89,
      terminology_match: 0.96,
      context_analysis: 0.87,
      physician_patterns: 0.93
    }
  },
  {
    overall_confidence: 0.76,
    documentation_completeness: 0.72,
    code_specificity: 0.81,
    historical_accuracy: 0.74,
    cross_validation_score: 0.78,
    confidence_factors: {
      clinical_indicators: 0.75,
      terminology_match: 0.82,
      context_analysis: 0.69,
      physician_patterns: 0.78
    }
  }
];

export const MOCK_KPI_METRICS: KPIMetrics[] = [
  {
    id: 'kpi1',
    facility_id: 'facility_001',
    period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    period_end: new Date().toISOString(),
    case_mix_index: 1.4567,
    cmi_improvement_percentage: 8.2, // Target achieved: 7.4-8.6%
    avg_ar_days: 4.3, // Target achieved: <5 days
    ar_improvement_percentage: 52.3, // Improvement from 9+ days
    coder_productivity_increase: 58.7, // Target exceeded: 55%
    query_agreement_rate: 83.4, // Target achieved: 80%+
    autonomous_coding_rate: 15.2,
    semi_autonomous_rate: 42.8,
    cac_rate: 42.0,
    calculated_at: new Date().toISOString()
  },
  {
    id: 'kpi2',
    facility_id: 'facility_002',
    period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    period_end: new Date().toISOString(),
    case_mix_index: 1.3245,
    cmi_improvement_percentage: 7.8, // Target achieved
    avg_ar_days: 4.8, // Target achieved
    ar_improvement_percentage: 46.7,
    coder_productivity_increase: 61.2, // Target exceeded
    query_agreement_rate: 81.7, // Target achieved
    autonomous_coding_rate: 12.4,
    semi_autonomous_rate: 38.9,
    cac_rate: 48.7,
    calculated_at: new Date().toISOString()
  }
];

export const MOCK_CDI_ENGAGE_ONE: CDIEngageOne[] = [
  {
    id: 'cdi1',
    encounter_id: 'e1',
    real_time_nudges: [],
    documentation_score: 87.5,
    completion_percentage: 92.3,
    active_session: true,
    physician_id: 'dr_001',
    ehr_integration_status: 'CONNECTED',
    last_activity: new Date(Date.now() - 300000).toISOString() // 5 minutes ago
  },
  {
    id: 'cdi2',
    encounter_id: 'e2',
    real_time_nudges: [],
    documentation_score: 76.2,
    completion_percentage: 84.1,
    active_session: false,
    physician_id: 'dr_002',
    ehr_integration_status: 'CONNECTED',
    last_activity: new Date(Date.now() - 1800000).toISOString() // 30 minutes ago
  }
];

export const MOCK_CDI_NUDGES: CDINudge[] = [
  {
    id: 'cdn1',
    encounter_id: 'e1',
    severity: 'warning',
    prompt: "Consider specifying the causative organism for pneumonia to improve coding specificity and CMI.",
    suggested_text: "Pneumonia due to Streptococcus pneumoniae",
    status: 'active',
    created_at: new Date().toISOString(),
    nudge_type: 'ORGANISM',
    clinical_context: "Patient diagnosed with pneumonia",
    expected_improvement: {
      cmi_impact: 0.15,
      coding_accuracy_impact: 0.12
    }
  },
  {
    id: 'cdn2',
    encounter_id: 'e4',
    severity: 'critical',
    prompt: "Specify laterality (left/right) for fracture diagnosis to ensure accurate DRG assignment.",
    suggested_text: "Left femoral neck fracture",
    status: 'active',
    created_at: new Date().toISOString(),
    nudge_type: 'LATERALITY',
    clinical_context: "Patient with hip fracture",
    expected_improvement: {
      cmi_impact: 0.08,
      coding_accuracy_impact: 0.25
    }
  }
];

export const MOCK_PROVIDER_CREDENTIALS: ProviderCredentials[] = [
  {
    id: 'prov1',
    name: 'King Fahd Medical City',
    cr_number: '1010123456',
    npi: 'NPI123456789',
    license_number: 'LIC-RIYADH-001',
    specialties: ['Internal Medicine', 'Cardiology', 'Emergency Medicine'],
    facility_affiliations: ['KFMC Main', 'KFMC Cardiac Center'],
    nphies_provider_id: 'NPHIES-PROV-001',
    verification_status: 'VERIFIED',
    last_verified: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'prov2',
    name: 'National Guard Health Affairs',
    cr_number: '1010234567',
    npi: 'NPI234567890',
    license_number: 'LIC-RIYADH-002',
    specialties: ['Surgery', 'Orthopedics', 'Trauma'],
    facility_affiliations: ['NGHA Main', 'NGHA Trauma Center'],
    nphies_provider_id: 'NPHIES-PROV-002',
    verification_status: 'VERIFIED',
    last_verified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const MOCK_NPHIES_INTEGRATION: NphiesIntegration = {
  connection_status: 'CONNECTED',
  last_successful_auth: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
  token_expires_at: new Date(Date.now() + 1800000).toISOString(), // 30 minutes from now
  api_version: 'v2.1',
  rate_limit_remaining: 4850,
  error_count_24h: 3,
  success_rate_percentage: 99.2
};