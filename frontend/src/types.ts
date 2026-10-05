export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[]
export interface JsonObject {
  [key: string]: JsonValue
}

export type Language = 'fa' | 'en'
export type Screen =
  | 'home'
  | 'patients'
  | 'visits'
  | 'services'
  | 'referrals'
  | 'reports'
  | 'settings'
export type ProvenanceLabel = 'FACT' | 'INFERENCE' | 'SUGGESTION' | 'UNKNOWN'

export interface User {
  id: number
  username: string
  full_name: string
  role: string
  medical_council_no: string | null
  facility: string | null
}
export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in_minutes: number
  user: User
}
export interface Page<T> {
  items: T[]
  total: number
  limit?: number
  offset?: number
}

export interface PatientSummary {
  id: string
  national_id: string
  name: string
  persian_name: string
  gender: string
  age: number | null
  birth_date_jalali: string | null
  household_number: string | null
  health_center: string | null
  health_house: string | null
  assigned_behvarz: string | null
  phone: string | null
  insurance_type: string | null
  blood_type: string | null
  smoker: boolean
  last_visit_jalali: string | null
  last_visit_at: string | null
  condition_count: number
  open_issue_count: number
  risk_category: string | null
}
export interface Condition {
  id: number
  name: string
  persian_name: string
  since_jalali: string | null
  control_status: string
  active: boolean
}
export interface Medication {
  id: number
  name: string
  dosage: string | null
  frequency: string | null
  compliance_reported: string
  indication: string | null
  last_dispensed_jalali: string | null
  refills_count: number | null
  monitoring_notes: string | null
  prescribed_by: string | null
  active: boolean
}
export interface Vital {
  id: number
  measured_at: string
  jalali_date: string | null
  bp_systolic: number | null
  bp_diastolic: number | null
  heart_rate: number | null
  weight_kg: number | null
  height_cm: number | null
  bmi: number | null
  fasting_blood_sugar: number | null
  hba1c: number | null
  total_cholesterol: number | null
  measured_by: string | null
  recorded_in: string | null
}
export interface Encounter {
  id: string
  patient_id: string
  occurred_at: string
  jalali_date: string | null
  facility: string | null
  clinician_role: string
  chief_complaint: string | null
  subjective: string | null
  objective: string | null
  physical_findings: string | null
  assessment: JsonValue[]
  icd_codes: JsonValue[]
  plan: JsonValue[]
  prescriptions: JsonValue[]
  lab_orders: JsonValue[]
  vitals_snapshot: JsonObject
  referral_requested: boolean
  referral_specialty: string | null
  follow_up_days: number | null
  sib_module: string
  status: string
  committed_at: string | null
  sib_transaction_id: string | null
  created_at: string
}
export interface PreventiveCare {
  id: number
  category: string
  persian_category: string
  status: string
  last_done_jalali: string | null
  next_due_jalali: string | null
  interval_months: number | null
  details: string | null
  guideline: string | null
  /** "schedule" = owned by the Ω-SIB rules engine, "recorded" = legacy SIB record. */
  source?: string
}
export interface QualityIssue {
  id: string
  severity: string
  type: string
  title: string
  description: string
  sib_location: string | null
  suggested_correction: string | null
  resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
}
export interface Referral {
  id: string
  patient_id: string
  encounter_id: string | null
  specialty: string
  persian_specialty: string
  urgency: string
  reason: string
  workup: JsonValue[]
  target_facility: string | null
  status: string
  created_at: string
  sent_at: string | null
  outcome: string | null
  notes: string | null
  sync_transaction_id?: string | null
}
export interface ServiceRequest {
  id: string
  patient_id: string
  encounter_id: string | null
  service_id: number
  status: string
  requested_at: string
  scheduled_for: string | null
  result_summary: string | null
  resulted_at: string | null
  requested_by: string | null
  notes: string | null
  service_name: string | null
  service_persian_name: string | null
  instructions?: string | null
  requires_fasting?: boolean
  turnaround_days?: number
}
export interface Risk {
  available?: boolean
  percentage?: number
  colorCategory?: string
  category?: string
  provenance?: ProvenanceLabel | Provenance
  [key: string]: JsonValue | Provenance | undefined
}
export interface ClinicalSuggestion {
  id?: string
  kind?: string
  message?: string
  title?: string
  rationale?: string
  actionType?: string
  draftValue?: string
  recommendation?: string
  priority?: string
  provenance?: ProvenanceLabel | Provenance
  [key: string]: JsonValue | Provenance | undefined
}
export interface DrugAlert {
  title?: string
  message?: string
  recommendation?: string
  severity?: string
  provenance?: ProvenanceLabel | Provenance
  [key: string]: JsonValue | Provenance | undefined
}
export interface PatientDetail extends PatientSummary {
  conditions: Condition[]
  medications: Medication[]
  vitals: Vital[]
  encounters: Encounter[]
  preventive_care: PreventiveCare[]
  quality_issues: QualityIssue[]
  referrals: Referral[]
  service_requests: ServiceRequest[]
  risk: Risk | null
  suggestions: ClinicalSuggestion[]
  alerts: DrugAlert[]
}

export interface ServiceCatalog {
  id: number
  code: string
  name: string
  persian_name: string
  category: string
  turnaround_days: number
  requires_fasting: boolean
  instructions: string | null
  active: boolean
}
export interface SyncTransaction {
  id: string
  patient_id: string | null
  encounter_id: string | null
  kind: string
  summary: JsonValue[]
  payload: JsonObject
  clinician_name: string | null
  pin_confirmed: boolean
  status: string
  retry_count: number
  error_message: string | null
  created_at: string
  synced_at: string | null
}
export interface AuditEntry {
  id: number
  at: string
  actor: string
  actor_role: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  detail: JsonObject
  source_ip: string | null
}

export interface DashboardSummary {
  generated_at: string
  jalali_date?: string
  patients: { total: number; with_chronic_condition: number; smokers: number }
  visits: { total: number; this_month: number; drafts_uncommitted: number; committed: number }
  referrals: {
    total: number
    open: number
    by_status: Record<string, number>
    by_specialty: Record<string, number>
  }
  services: { total: number; pending: number; by_category: Record<string, number> }
  sync: { queued: number; synced: number; failed: number }
  risk_distribution: Record<string, number>
  care_gaps: {
    overdue_patients: number
    overdue_items_total: number
    top_overdue: { category: string; patients: number }[]
  }
  top_diagnoses: { diagnosis: string; count: number }[]
}
export interface CareGap {
  patient_id: string
  patient: string
  national_id: string
  category: string
  persian_category: string
  status: string
  last_done_jalali: string | null
  next_due_jalali: string | null
  guideline: string | null
}
export interface DataQualityReport {
  stored_issues: { total: number; open: number; by_severity: Record<string, number> }
  live_findings: {
    total: number
    by_severity: Record<string, number>
    items: {
      patient_id: string
      patient: string
      severity: string
      type: string
      title: string
      suggested_correction: string | null
    }[]
  }
  identity: {
    duplicate_national_ids: { national_id: string; count: number }[]
    invalid_national_ids: { patient_id: string; patient: string; national_id: string }[]
  }
  completeness: {
    missing_phone: number
    missing_household_number: number
    missing_birth_date: number
    without_any_vitals: number
  }
}

export interface Provenance {
  /** The API names the label `type`; `label` is tolerated for compatibility. */
  type?: ProvenanceLabel
  label?: ProvenanceLabel
  sourceText?: string
  sourceSystem?: string
  confidence?: number
  requiresConfirmation?: boolean
  timestamp?: string
}
export interface AiAction {
  type: string
  description: string
  params: JsonObject
  provenance: Provenance
}
export interface AiChatResponse {
  session_id: string
  reply: string
  intent: string
  engine: string
  draft_plan: { summary: string; actions: AiAction[] }
  provenance: Provenance
  requires_confirmation: boolean
  patient_id: string | null
  evidence: {
    kind?: string
    label?: string
    detail?: string
    provenance?: ProvenanceLabel | Provenance
  }[]
}
export interface AiExecuteResponse {
  executed: number
  results: { type?: string; ok?: boolean; message?: string; data?: JsonValue }[]
  audit_id: number | null
}
export interface ReferralSlip {
  slip_number: string
  issued_jalali: string
  urgency: string
  specialty: string
  persian_specialty: string
  target_facility: string | null
  reason: string
  workup_checklist: JsonValue[]
  patient: {
    id: string
    name: string
    national_id: string
    age: number | null
    gender: string
    household_number: string | null
    insurance: string | null
    phone: string | null
  } | null
  referring_clinician: string | null
  visit: {
    id: string
    jalali_date: string | null
    chief_complaint: string | null
    assessment: JsonValue[]
    vitals: JsonObject
  } | null
  status: string
}

export interface EncounterInput {
  patient_id: string
  chief_complaint?: string
  subjective?: string
  objective?: string
  physical_findings?: string
  assessment: string[]
  plan: string[]
  prescriptions: JsonObject[]
  lab_orders: string[]
  referral_requested: boolean
  referral_specialty?: string
  follow_up_days?: number
  vitals?: JsonObject
  commit: boolean
  pin?: string
}
export interface PatientCreateInput {
  national_id: string
  name: string
  persian_name?: string
  gender: 'F' | 'M'
  birth_date?: string
  household_number?: string
  health_center?: string
  health_house?: string
  assigned_behvarz?: string
  phone?: string
  smoker: boolean
}
