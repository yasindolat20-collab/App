export type ProvenanceType = 'FACT' | 'INFERENCE' | 'SUGGESTION' | 'UNKNOWN';

export type ConnectivityStatus = 'ONLINE' | 'DEGRADED' | 'OFFLINE';

export interface ProvenanceBadge {
  type: ProvenanceType;
  sourceText: string;
  confidence?: number;
  timestamp?: string;
  sourceSystem?: string; // e.g. "SIB v2.4 Form-302", "IraPEN Cardiovascular Module", "Behvarz Register"
  requiresConfirmation?: boolean;
}

export interface VitalRecord {
  date: string;
  jalaliDate: string;
  bloodPressureSys: number;
  bloodPressureDia: number;
  heartRate: number;
  weightKg: number;
  heightCm: number;
  bmi: number;
  fastingBloodSugar?: number;
  hba1c?: number;
  measuredBy: string;
  recordedIn: string; // SIB module name
}

export interface EncounterHistory {
  id: string;
  date: string;
  jalaliDate: string;
  facility: string;
  clinician: string;
  role: 'Family Physician' | 'Behvarz' | 'Midwife' | 'Specialist';
  complaint: string;
  diagnosis: string;
  icdCode: string;
  vitals?: Partial<VitalRecord>;
  actionsTaken: string[];
  sibModule: string;
}

export interface PreventiveCareStatus {
  category: string;
  persianCategory: string;
  status: 'UP_TO_DATE' | 'DUE' | 'OVERDUE' | 'NOT_APPLICABLE';
  lastDone?: string;
  lastDoneJalali?: string;
  nextDue?: string;
  nextDueJalali?: string;
  details: string;
  provenance: ProvenanceBadge;
}

export interface DataQualityIssue {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'NOTICE';
  type: 'MISSING_FIELD' | 'DUPLICATE_RECORD' | 'CONTRADICTION' | 'OUTDATED_SCREENING';
  title: string;
  description: string;
  sibLocation: string;
  suggestedCorrection?: string;
  provenance: ProvenanceBadge;
  resolved?: boolean;
}

export interface ClinicalSuggestion {
  id: string;
  priority: 'HIGH' | 'MEDIUM' | 'ROUTINE';
  provenance: ProvenanceBadge;
  title: string;
  rationale: string;
  actionType: 'LAB_ORDER' | 'MEDICATION_ADJUSTMENT' | 'REFERRAL' | 'PREVENTIVE_SCREENING' | 'LIFESTYLE';
  accepted?: boolean;
  rejected?: boolean;
  draftValue?: string;
}

export interface Patient {
  id: string;
  nationalId: string; // 10-digit Iranian National ID
  name: string;
  persianName: string;
  age: number;
  gender: 'F' | 'M';
  birthDate: string;
  birthDateJalali: string;
  householdNumber: string; // پرونده خانوار
  healthCenter: string;
  healthHouse: string; // خانه بهداشت
  assignedBehvarz: string;
  phone: string;
  insuranceType: string;
  bloodType: string;
  chronicConditions: Array<{
    name: string;
    persianName: string;
    sinceJalali: string;
    controlStatus: 'OPTIMAL' | 'SUBOPTIMAL' | 'UNCONTROLLED';
  }>;
  currentMedications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    complianceReported: 'REGULAR' | 'IRREGULAR' | 'UNKNOWN';
    indication?: string;
    startDateJalali?: string;
    lastDispensedJalali?: string;
    refillsCount?: number;
    monitoringNotes?: string;
    prescribedBy?: string;
  }>;
  encounters: EncounterHistory[];
  vitalsHistory: VitalRecord[];
  preventiveCare: PreventiveCareStatus[];
  dataQualityIssues: DataQualityIssue[];
  suggestions: ClinicalSuggestion[];
  irapenRiskScore?: {
    percentage: number;
    colorCategory: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
    calculatedDateJalali: string;
    nextAssessmentDueJalali: string;
  };
  rawSibPayloadSnippet: Record<string, unknown>;
}

export interface QueuedSibTransaction {
  id: string;
  patientId: string;
  patientName: string;
  nationalId: string;
  timestamp: string;
  jalaliTimestamp: string;
  changesSummary: string[];
  fieldsPayload: Record<string, unknown>;
  clinicianName: string;
  clinicianPinConfirmed: boolean;
  status: 'QUEUED' | 'SYNCING' | 'SYNCED' | 'FAILED';
  retryCount: number;
  errorMessage?: string;
}

export interface CurrentVisitDraft {
  patientId: string;
  chiefComplaint: string;
  subjectiveNotes: string;
  bloodPressureSys: string;
  bloodPressureDia: string;
  heartRate: string;
  weightKg: string;
  bloodGlucose: string;
  physicalFindings: string;
  clinicalNotes?: string;
  diagnoses: string[];
  newPrescriptions: string[];
  labOrders: string[];
  referralRequested: boolean;
  referralTarget: string;
  acceptedSuggestions: string[];
  resolvedQualityIssueIds: string[];
}
