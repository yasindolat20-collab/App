import type {
  AiAction,
  AiChatResponse,
  AiExecuteResponse,
  AuditEntry,
  CareGap,
  DashboardSummary,
  DataQualityReport,
  Encounter,
  EncounterInput,
  JsonObject,
  LoginResponse,
  Page,
  PatientCreateInput,
  PatientDetail,
  PatientSummary,
  PreventiveCare,
  QualityIssue,
  Referral,
  ReferralSlip,
  ServiceCatalog,
  ServiceRequest,
  SyncTransaction,
  User,
  Vital,
} from './types'

const baseUrl = import.meta.env.VITE_API_BASE ?? ''
const tokenKey = 'omega_sib_token'
let unauthorizedHandler: (() => void) | null = null

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
export const setUnauthorizedHandler = (handler: (() => void) | null): void => {
  unauthorizedHandler = handler
}
export const getToken = (): string | null => localStorage.getItem(tokenKey)
export const clearToken = (): void => localStorage.removeItem(tokenKey)

function errorText(detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail))
    return detail
      .map((item) =>
        typeof item === 'object' && item !== null && 'msg' in item
          ? String(item.msg)
          : String(item),
      )
      .join(' · ')
  return 'خطای غیرمنتظره در ارتباط با سامانه'
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, { ...init, headers })
  } catch {
    throw new ApiError('ارتباط با سرور برقرار نشد', 0)
  }
  if (response.status === 401) {
    clearToken()
    unauthorizedHandler?.()
  }
  if (!response.ok) {
    let body: { detail?: unknown } = {}
    try {
      body = (await response.json()) as { detail?: unknown }
    } catch {
      /* safely use fallback */
    }
    throw new ApiError(errorText(body.detail), response.status)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

const query = (params: Record<string, string | number | boolean | undefined>): string => {
  const values = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') values.set(key, String(value))
  })
  const result = values.toString()
  return result ? `?${result}` : ''
}

export const api = {
  login: (username: string, password: string, pin?: string) =>
    request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, pin: pin || undefined }),
    }),
  me: () => request<User>('/api/auth/me'),
  listPatients: (search = '', limit = 25, offset = 0) =>
    request<Page<PatientSummary>>(`/api/patients${query({ query: search, limit, offset })}`),
  getPatient: (id: string) => request<PatientDetail>(`/api/patients/${encodeURIComponent(id)}`),
  createPatient: (body: PatientCreateInput) =>
    request<PatientDetail>('/api/patients', { method: 'POST', body: JSON.stringify(body) }),
  updatePatient: (id: string, body: JsonObject) =>
    request<PatientDetail>(`/api/patients/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  listVitals: (id: string) =>
    request<{ items: Vital[]; total: number }>(`/api/patients/${encodeURIComponent(id)}/vitals`),
  createVitals: (id: string, body: JsonObject) =>
    request<{ id: number; jalali_date?: string; bmi?: number; risk?: JsonObject }>(
      `/api/patients/${encodeURIComponent(id)}/vitals`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  getPreventiveCare: (id: string) =>
    request<{ items: PreventiveCare[]; summary: JsonObject }>(
      `/api/patients/${encodeURIComponent(id)}/preventive-care`,
    ),
  getQualityIssues: (id: string) =>
    request<{ items: QualityIssue[]; total: number }>(
      `/api/patients/${encodeURIComponent(id)}/quality-issues`,
    ),
  resolveQualityIssue: (patientId: string, issueId: string) =>
    request<{ id: string; resolved: boolean }>(
      `/api/patients/${encodeURIComponent(patientId)}/quality-issues/${encodeURIComponent(issueId)}/resolve`,
      { method: 'POST', body: '{}' },
    ),
  runQualityAudit: (id: string) =>
    request<{ created: number; total: number }>(
      `/api/patients/${encodeURIComponent(id)}/quality-issues/audit`,
      { method: 'POST', body: '{}' },
    ),
  getRisk: (id: string) => request<JsonObject>(`/api/patients/${encodeURIComponent(id)}/risk`),
  getSuggestions: (id: string) =>
    request<{ items: JsonObject[]; alerts: JsonObject[] }>(
      `/api/patients/${encodeURIComponent(id)}/suggestions`,
    ),
  listEncounters: (
    params: { patient_id?: string; status?: string; limit?: number; offset?: number } = {},
  ) => request<Page<Encounter>>(`/api/encounters${query(params)}`),
  createEncounter: (body: EncounterInput) =>
    request<Encounter | { encounter: Encounter; transaction: JsonObject; synced: boolean }>(
      '/api/encounters',
      { method: 'POST', body: JSON.stringify(body) },
    ),
  commitEncounter: (id: string, pin?: string) =>
    request<{ encounter: Encounter; transaction: JsonObject; synced: boolean }>(
      `/api/encounters/${encodeURIComponent(id)}/commit`,
      { method: 'POST', body: JSON.stringify({ pin: pin || undefined }) },
    ),
  listReferrals: (
    params: {
      patient_id?: string
      status?: string
      specialty?: string
      limit?: number
      offset?: number
    } = {},
  ) => request<Page<Referral>>(`/api/referrals${query(params)}`),
  createReferral: (body: JsonObject) =>
    request<Referral>('/api/referrals', { method: 'POST', body: JSON.stringify(body) }),
  updateReferral: (id: string, body: JsonObject) =>
    request<Referral>(`/api/referrals/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  getReferralSlip: (id: string) =>
    request<ReferralSlip>(`/api/referrals/${encodeURIComponent(id)}/slip`),
  listServices: (category?: string, q?: string) =>
    request<ServiceCatalog[]>(`/api/services${query({ category, q })}`),
  listServiceRequests: (params: { patient_id?: string; status?: string; limit?: number } = {}) =>
    request<{ items: ServiceRequest[]; total: number }>(`/api/service-requests${query(params)}`),
  createServiceRequest: (body: JsonObject) =>
    request<ServiceRequest>('/api/service-requests', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateServiceRequest: (id: string, body: JsonObject) =>
    request<ServiceRequest>(`/api/service-requests/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  getReportSummary: () => request<DashboardSummary>('/api/reports/summary'),
  getCareGaps: () =>
    request<{ items: CareGap[]; total: number; overdue: number }>('/api/reports/care-gaps'),
  getDataQuality: () => request<DataQualityReport>('/api/reports/data-quality'),
  getSyncQueue: () =>
    request<{
      items: SyncTransaction[]
      total: number
      adapter: string
      counts: Record<string, number>
    }>('/api/sync/queue'),
  getSyncStatus: () => request<JsonObject>('/api/sync/status'),
  retryTransaction: (id: string) =>
    request<JsonObject>(`/api/sync/queue/${encodeURIComponent(id)}/retry`, {
      method: 'POST',
      body: '{}',
    }),
  flushQueue: () => request<JsonObject>('/api/sync/flush', { method: 'POST', body: '{}' }),
  getAudit: (limit = 50) =>
    request<{ items: AuditEntry[]; total: number }>(`/api/audit${query({ limit })}`),
  aiChat: (body: {
    message: string
    patient_id?: string
    session_id?: string
    history: { role: string; content: string }[]
  }) => request<AiChatResponse>('/api/ai/chat', { method: 'POST', body: JSON.stringify(body) }),
  aiExecute: (body: {
    patient_id?: string
    session_id?: string
    actions: AiAction[]
    pin?: string
  }) =>
    request<AiExecuteResponse>('/api/ai/execute', { method: 'POST', body: JSON.stringify(body) }),
  aiStatus: () =>
    request<{
      engine: string
      llm_configured: boolean
      model: string | null
      action_catalogue: string[]
      requires_confirmation: boolean
    }>('/api/ai/status'),
  aiActions: () => request<Record<string, JsonObject>>('/api/ai/actions'),
}
