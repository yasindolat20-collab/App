import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Bot,
  ClipboardPlus,
  HeartPulse,
  PencilLine,
  Plus,
  RefreshCw,
  Send,
  Stethoscope,
  Syringe,
  TriangleAlert,
} from 'lucide-react'
import { api, ApiError } from '../api'
import type { JsonObject, PatientDetail, PatientSummary, Vital } from '../types'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Modal,
  Notice,
  PanelHeading,
  ProvenanceBadge,
  StatusChip,
  cx,
} from './ui'

type ChartTab = 'overview' | 'timeline' | 'preventive' | 'quality' | 'referrals' | 'services'
interface PatientChartProps {
  patientId: string
  onBack: () => void
  onOpenVisit: (patient: PatientSummary) => void
  onOpenReferral: (patient: PatientSummary) => void
  onOpenService: (patient: PatientSummary) => void
  onOpenChat: (patient: PatientSummary) => void
  onNotify: (message: string, tone?: 'success' | 'error') => void
}
const tabList: { id: ChartTab; label: string }[] = [
  { id: 'overview', label: 'نمای کلی' },
  { id: 'timeline', label: 'خط زمانی' },
  { id: 'preventive', label: 'مراقبت پیشگیرانه' },
  { id: 'quality', label: 'نقص داده' },
  { id: 'referrals', label: 'ارجاع‌ها' },
  { id: 'services', label: 'خدمات' },
]

export function PatientChart({
  patientId,
  onBack,
  onOpenVisit,
  onOpenReferral,
  onOpenService,
  onOpenChat,
  onNotify,
}: PatientChartProps) {
  const [patient, setPatient] = useState<PatientDetail>()
  const [activeTab, setActiveTab] = useState<ChartTab>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [vitalsOpen, setVitalsOpen] = useState(false)
  const load = async (): Promise<void> => {
    setLoading(true)
    setError('')
    try {
      setPatient(await api.getPatient(patientId))
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'امکان دریافت پرونده وجود ندارد')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
  }, [patientId])
  if (loading) return <LoadingState label="در حال دریافت پرونده بیمار…" />
  if (error) return <ErrorState message={error} retry={() => void load()} />
  if (!patient) return <EmptyState title="پرونده بیمار یافت نشد" />
  const riskPercentage =
    typeof patient.risk?.percentage === 'number' ? patient.risk.percentage : null
  const riskCategory =
    typeof patient.risk?.colorCategory === 'string'
      ? patient.risk.colorCategory
      : patient.risk_category
  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-teal-300"
      >
        <ArrowRight size={17} />
        بازگشت به فهرست بیماران
      </button>
      <Card className="overflow-hidden">
        <div className="border-b border-teal-500/20 bg-gradient-to-l from-teal-500/10 via-slate-900 to-slate-900 px-5 py-5">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold">{patient.persian_name || patient.name}</h1>
                <span className="ltr text-sm text-slate-400">{patient.name}</span>
                <StatusChip value={riskCategory} />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
                <span>
                  کد ملی: <bdi className="num text-slate-200">{patient.national_id}</bdi>
                </span>
                <span>
                  سن: <bdi className="num text-slate-200">{patient.age ?? '—'}</bdi>
                </span>
                <span>
                  جنسیت:{' '}
                  <bdi className="text-slate-200">
                    {patient.gender === 'F'
                      ? 'زن'
                      : patient.gender === 'M'
                        ? 'مرد'
                        : patient.gender}
                  </bdi>
                </span>
                <span>
                  پرونده خانوار:{' '}
                  <bdi className="num text-slate-200">{patient.household_number || '—'}</bdi>
                </span>
                <span>
                  بیمه: <bdi className="text-slate-200">{patient.insurance_type || '—'}</bdi>
                </span>
                <span className="ltr">{patient.phone || '—'}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                <span>بهورز: {patient.assigned_behvarz || '—'}</span>
                <span>مرکز سلامت: {patient.health_center || '—'}</span>
                {patient.smoker ? (
                  <span className="font-semibold text-amber-300">سیگاری</span>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3">
              <span className="text-xs text-slate-400">خطر قلبی</span>
              <strong className="num text-xl text-teal-300">
                {riskPercentage === null ? '—' : `${riskPercentage}%`}
              </strong>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-5 py-3">
          <Button onClick={() => setVitalsOpen(true)}>
            <HeartPulse size={16} />
            ثبت علائم حیاتی
          </Button>
          <Button onClick={() => onOpenVisit(patient)}>
            <Stethoscope size={16} />
            ویزیت جدید
          </Button>
          <Button onClick={() => onOpenReferral(patient)}>
            <Send size={16} />
            ارجاع جدید
          </Button>
          <Button onClick={() => onOpenService(patient)}>
            <Syringe size={16} />
            درخواست خدمت
          </Button>
          <Button tone="primary" onClick={() => onOpenChat(patient)}>
            <Bot size={16} />
            پیشنویس با هوش مصنوعی
          </Button>
        </div>
      </Card>
      <div className="scrollbar-thin flex overflow-x-auto border-b border-slate-800">
        {tabList.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cx(
              'whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors',
              activeTab === tab.id
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'overview' ? <Overview patient={patient} /> : null}
      {activeTab === 'timeline' ? <Timeline patient={patient} /> : null}
      {activeTab === 'preventive' ? <Preventive patient={patient} /> : null}
      {activeTab === 'quality' ? (
        <Quality patient={patient} reload={load} onNotify={onNotify} />
      ) : null}
      {activeTab === 'referrals' ? <Referrals patient={patient} /> : null}
      {activeTab === 'services' ? <Services patient={patient} /> : null}
      {vitalsOpen ? (
        <VitalsDialog
          patientId={patient.id}
          onClose={() => setVitalsOpen(false)}
          onSaved={() => {
            setVitalsOpen(false)
            onNotify('علائم حیاتی ثبت شد.', 'success')
            void load()
          }}
          onNotify={onNotify}
        />
      ) : null}
    </div>
  )
}

function Overview({ patient }: { patient: PatientDetail }) {
  const latest: Vital | undefined = patient.vitals[0]
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <div className="space-y-5 xl:col-span-2">
        <Card>
          <PanelHeading
            title="شرایط مزمن"
            subtitle={`${patient.conditions.filter((item) => item.active).length} مورد فعال`}
          />
          {patient.conditions.length ? (
            <div className="divide-y divide-slate-800">
              {patient.conditions.map((condition) => (
                <div
                  key={condition.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div>
                    <p className="font-medium">{condition.persian_name || condition.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      از {condition.since_jalali || '—'}
                    </p>
                  </div>
                  <StatusChip value={condition.control_status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="شرط مزمن ثبت نشده است" />
          )}
        </Card>
        <Card>
          <PanelHeading title="داروهای فعال" />
          {patient.medications.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-950/40 text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-3">دارو</th>
                    <th className="px-3 py-3">دوز / تناوب</th>
                    <th className="px-3 py-3">اندیکاسیون</th>
                    <th className="px-5 py-3">پایبندی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {patient.medications.map((medicine) => (
                    <tr key={medicine.id}>
                      <td className="px-5 py-3 font-medium">{medicine.name}</td>
                      <td className="px-3 py-3 text-slate-400">
                        {medicine.dosage || '—'} · {medicine.frequency || '—'}
                      </td>
                      <td className="px-3 py-3 text-slate-400">{medicine.indication || '—'}</td>
                      <td className="px-5 py-3">
                        <StatusChip value={medicine.compliance_reported} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="دارویی ثبت نشده است" />
          )}
        </Card>
      </div>
      <div className="space-y-5">
        <Card>
          <PanelHeading title="آخرین علائم حیاتی" subtitle={latest?.jalali_date || 'بدون ثبت'} />
          {latest ? (
            <div className="grid grid-cols-2 gap-3 p-4">
              <Metric
                label="فشار خون"
                value={
                  latest.bp_systolic && latest.bp_diastolic
                    ? `${latest.bp_systolic}/${latest.bp_diastolic}`
                    : '—'
                }
                unit="mmHg"
              />
              <Metric label="نبض" value={latest.heart_rate ?? '—'} unit="bpm" />
              <Metric label="BMI" value={latest.bmi ?? '—'} />
              <Metric label="HbA1c" value={latest.hba1c ?? '—'} unit="%" />
              <Metric label="قند ناشتا" value={latest.fasting_blood_sugar ?? '—'} unit="mg/dL" />
              <Metric label="وزن" value={latest.weight_kg ?? '—'} unit="kg" />
            </div>
          ) : (
            <EmptyState title="علائم حیاتی موجود نیست" />
          )}
        </Card>
        <Card>
          <PanelHeading title="هشدارهای دارویی" />
          {patient.alerts.length ? (
            <div className="space-y-2 p-4">
              {patient.alerts.map((alert, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3"
                >
                  <div className="flex items-start gap-2">
                    <TriangleAlert size={16} className="mt-0.5 text-amber-300" />
                    <div>
                      <p className="text-sm font-medium">
                        {alert.title || alert.message || 'هشدار دارویی'}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        {alert.recommendation || 'بازبینی بالینی توصیه می‌شود.'}
                      </p>
                      <ProvenanceBadge className="mt-2" provenance={alert.provenance} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="هشدار دارویی فعالی وجود ندارد" />
          )}
        </Card>
      </div>
      <Card className="xl:col-span-3">
        <PanelHeading
          title="پیشنهادهای اولویت‌دار بالینی"
          subtitle="تصمیم‌یار؛ نیازمند قضاوت و تأیید پزشک"
        />
        {patient.suggestions.length ? (
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {patient.suggestions.map((suggestion, index) => (
              <div key={index} className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip value={suggestion.priority || suggestion.kind || 'SUGGESTION'} />
                  {suggestion.actionType ? (
                    <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                      {String(suggestion.actionType).replaceAll('_', ' ')}
                    </span>
                  ) : null}
                  <ProvenanceBadge provenance={suggestion.provenance} />
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-100">
                  {suggestion.title || suggestion.message || 'پیشنهاد بالینی'}
                </p>
                {suggestion.rationale ? (
                  <p className="mt-1.5 text-xs leading-5 text-slate-400">{suggestion.rationale}</p>
                ) : null}
                {suggestion.draftValue || suggestion.recommendation ? (
                  <p className="mt-2 rounded-lg border border-teal-500/20 bg-teal-500/5 px-3 py-2 text-xs leading-5 text-teal-200">
                    {suggestion.draftValue || suggestion.recommendation}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="پیشنهاد فعالی برای این پرونده نیست" />
        )}
      </Card>
    </div>
  )
}
function Metric({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-1 num text-lg font-bold text-slate-100">
        {value}
        <span className="ms-1 text-[10px] font-normal text-slate-500">{unit}</span>
      </p>
    </div>
  )
}
function Timeline({ patient }: { patient: PatientDetail }) {
  return (
    <Card>
      <PanelHeading title="خط زمانی ویزیت‌ها" subtitle="تاریخ‌های جلالی ثبت‌شده در سامانه" />
      {patient.encounters.length ? (
        <div className="divide-y divide-slate-800">
          {patient.encounters.map((encounter) => (
            <article
              key={encounter.id}
              className="grid gap-3 px-5 py-4 md:grid-cols-[9rem_1fr_auto]"
            >
              <div>
                <p className="num text-sm text-teal-300">{encounter.jalali_date || '—'}</p>
                <p className="mt-1 text-xs text-slate-500">{encounter.clinician_role}</p>
              </div>
              <div>
                <p className="font-medium">
                  {encounter.chief_complaint || 'ویزیت بدون شکایت ثبت‌شده'}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  ارزیابی:{' '}
                  {encounter.assessment.length ? encounter.assessment.map(String).join('، ') : '—'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  طرح: {encounter.plan.length ? encounter.plan.map(String).join('، ') : '—'}
                </p>
              </div>
              <StatusChip value={encounter.status} />
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="ویزیتی ثبت نشده است" />
      )}
    </Card>
  )
}
function Preventive({ patient }: { patient: PatientDetail }) {
  return (
    <Card>
      <PanelHeading title="برنامه مراقبت پیشگیرانه" subtitle="اولویت بر اساس وضعیت هر مراقبت" />
      {patient.preventive_care.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-right text-sm">
            <thead className="bg-slate-950/40 text-xs text-slate-500">
              <tr>
                <th className="px-5 py-3">مراقبت</th>
                <th className="px-3 py-3">وضعیت</th>
                <th className="px-3 py-3">آخرین انجام</th>
                <th className="px-3 py-3">سررسید بعدی</th>
                <th className="px-5 py-3">راهنما</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {patient.preventive_care.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3 font-medium">
                    {item.persian_category || item.category}
                  </td>
                  <td className="px-3 py-3">
                    <StatusChip value={item.status} />
                  </td>
                  <td className="num px-3 py-3 text-slate-400">{item.last_done_jalali || '—'}</td>
                  <td className="num px-3 py-3 text-slate-400">{item.next_due_jalali || '—'}</td>
                  <td className="max-w-sm px-5 py-3 text-xs leading-5 text-slate-400">
                    {item.guideline || item.details || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="برنامه مراقبت پیشگیرانه ندارد" />
      )}
    </Card>
  )
}
function Quality({
  patient,
  reload,
  onNotify,
}: {
  patient: PatientDetail
  reload: () => Promise<void>
  onNotify: (message: string, tone?: 'success' | 'error') => void
}) {
  const [busy, setBusy] = useState(false)
  const resolve = async (issueId: string): Promise<void> => {
    setBusy(true)
    try {
      await api.resolveQualityIssue(patient.id, issueId)
      onNotify('مورد به‌عنوان رسیدگی‌شده ثبت شد.', 'success')
      await reload()
    } catch (caught) {
      onNotify(caught instanceof ApiError ? caught.message : 'عملیات ناموفق بود', 'error')
    } finally {
      setBusy(false)
    }
  }
  const audit = async (): Promise<void> => {
    setBusy(true)
    try {
      const data = await api.runQualityAudit(patient.id)
      onNotify(`${data.created} مورد جدید در بازبینی ثبت شد.`, 'success')
      await reload()
    } catch (caught) {
      onNotify(caught instanceof ApiError ? caught.message : 'بازبینی ناموفق بود', 'error')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card>
      <PanelHeading
        title="نقص‌ها و کیفیت داده"
        action={
          <Button onClick={() => void audit()} disabled={busy}>
            <RefreshCw size={15} />
            اجرای بازبینی
          </Button>
        }
      />
      {patient.quality_issues.filter((issue) => !issue.resolved).length ? (
        <div className="divide-y divide-slate-800">
          {patient.quality_issues
            .filter((issue) => !issue.resolved)
            .map((issue) => (
              <div
                key={issue.id}
                className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-start lg:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{issue.title}</h3>
                    <StatusChip value={issue.severity} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{issue.description}</p>
                  <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">محل در سیب</dt>
                      <dd className="mt-0.5 text-slate-300">{issue.sib_location || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">اصلاح پیشنهادی</dt>
                      <dd className="mt-0.5 text-slate-300">{issue.suggested_correction || '—'}</dd>
                    </div>
                  </dl>
                </div>
                <Button onClick={() => void resolve(issue.id)} disabled={busy}>
                  <PencilLine size={15} />
                  رسیدگی شد
                </Button>
              </div>
            ))}
        </div>
      ) : (
        <EmptyState
          title="نقص داده بازی باقی نمانده است"
          detail="برای بررسی دوباره از دکمه اجرای بازبینی استفاده کنید."
        />
      )}
    </Card>
  )
}
function Referrals({ patient }: { patient: PatientDetail }) {
  return (
    <Card>
      <PanelHeading title="ارجاع‌های بیمار" />
      {patient.referrals.length ? (
        <div className="divide-y divide-slate-800">
          {patient.referrals.map((referral) => (
            <div
              key={referral.id}
              className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row"
            >
              <div>
                <p className="font-medium">{referral.persian_specialty || referral.specialty}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {referral.reason || 'بدون علت ثبت‌شده'}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {referral.target_facility || 'مرکز مقصد ثبت نشده'} ·{' '}
                  {referral.workup.map(String).join('، ') || 'بدون چک‌لیست'}
                </p>
              </div>
              <div className="flex gap-2 self-start">
                <StatusChip value={referral.urgency} />
                <StatusChip value={referral.status} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="ارجاعی برای این بیمار ثبت نشده است" />
      )}
    </Card>
  )
}
function Services({ patient }: { patient: PatientDetail }) {
  return (
    <Card>
      <PanelHeading title="درخواست‌های خدمت" />
      {patient.service_requests.length ? (
        <div className="divide-y divide-slate-800">
          {patient.service_requests.map((request) => (
            <div
              key={request.id}
              className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row"
            >
              <div>
                <p className="font-medium">
                  {request.service_persian_name ||
                    request.service_name ||
                    `خدمت #${request.service_id}`}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  درخواست: {request.requested_at} · {request.notes || 'بدون یادداشت'}
                </p>
                {request.result_summary ? (
                  <p className="mt-1 text-sm text-slate-300">نتیجه: {request.result_summary}</p>
                ) : null}
              </div>
              <StatusChip value={request.status} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="درخواست خدمتی ثبت نشده است" />
      )}
    </Card>
  )
}
function VitalsDialog({
  patientId,
  onClose,
  onSaved,
  onNotify,
}: {
  patientId: string
  onClose: () => void
  onSaved: () => void
  onNotify: (message: string, tone?: 'success' | 'error') => void
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const set = (key: string, value: string): void => setValues((old) => ({ ...old, [key]: value }))
  const save = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const body: JsonObject = {}
    ;[
      'bp_systolic',
      'bp_diastolic',
      'heart_rate',
      'weight_kg',
      'height_cm',
      'fasting_blood_sugar',
      'hba1c',
      'total_cholesterol',
    ].forEach((key) => {
      const raw = values[key]
      if (raw) body[key] = Number(raw)
    })
    setSaving(true)
    try {
      await api.createVitals(patientId, body)
      onSaved()
    } catch (caught) {
      onNotify(caught instanceof ApiError ? caught.message : 'ثبت علائم حیاتی ناموفق بود', 'error')
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal title="ثبت علائم حیاتی" onClose={onClose}>
      <form onSubmit={(event) => void save(event)} className="space-y-5 p-5">
        <Notice tone="info">تاریخ جلالی پس از ثبت از سامانه دریافت می‌شود.</Notice>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="فشار سیستولیک"
            id="v-sys"
            type="number"
            value={values.bp_systolic || ''}
            onChange={(event) => set('bp_systolic', event.target.value)}
          />
          <Input
            label="فشار دیاستولیک"
            id="v-dia"
            type="number"
            value={values.bp_diastolic || ''}
            onChange={(event) => set('bp_diastolic', event.target.value)}
          />
          <Input
            label="نبض"
            id="v-hr"
            type="number"
            value={values.heart_rate || ''}
            onChange={(event) => set('heart_rate', event.target.value)}
          />
          <Input
            label="وزن (کیلوگرم)"
            id="v-weight"
            type="number"
            step="0.1"
            value={values.weight_kg || ''}
            onChange={(event) => set('weight_kg', event.target.value)}
          />
          <Input
            label="قد (سانتی‌متر)"
            id="v-height"
            type="number"
            step="0.1"
            value={values.height_cm || ''}
            onChange={(event) => set('height_cm', event.target.value)}
          />
          <Input
            label="قند ناشتا"
            id="v-fbs"
            type="number"
            step="0.1"
            value={values.fasting_blood_sugar || ''}
            onChange={(event) => set('fasting_blood_sugar', event.target.value)}
          />
          <Input
            label="HbA1c"
            id="v-hba"
            type="number"
            step="0.1"
            value={values.hba1c || ''}
            onChange={(event) => set('hba1c', event.target.value)}
          />
          <Input
            label="کلسترول تام"
            id="v-chol"
            type="number"
            step="0.1"
            value={values.total_cholesterol || ''}
            onChange={(event) => set('total_cholesterol', event.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>انصراف</Button>
          <Button type="submit" tone="primary" disabled={saving}>
            <Plus size={16} />
            {saving ? 'در حال ثبت…' : 'ثبت علائم'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
