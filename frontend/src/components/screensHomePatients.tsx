import { useEffect, useState } from 'react'
import {
  BarChart3,
  Bot,
  CalendarPlus,
  FilePlus2,
  FlaskConical,
  RefreshCw,
  Search,
  Send,
  Stethoscope,
  UserPlus,
  Users,
} from 'lucide-react'
import { api, ApiError } from '../api'
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
  Select,
  StatusChip,
  cx,
} from './ui'
import type { DashboardSummary, PatientCreateInput, PatientSummary, Screen } from '../types'

export function HomeScreen({
  onNavigate,
  onOpenChat,
}: {
  onNavigate: (screen: Screen) => void
  onOpenChat: () => void
}) {
  const [data, setData] = useState<DashboardSummary>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = async (): Promise<void> => {
    setLoading(true)
    setError('')
    try {
      setData(await api.getReportSummary())
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'داشبورد در دسترس نیست')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
  }, [])
  if (loading) return <LoadingState label="در حال آماده‌سازی داشبورد…" />
  if (error) return <ErrorState message={error} retry={() => void load()} />
  if (!data) return <EmptyState />
  const kpis = [
    ['کل بیماران', data.patients.total, Users, 'text-teal-300'],
    ['ویزیت این ماه', data.visits.this_month, Stethoscope, 'text-sky-300'],
    ['پیش‌نویس‌های باز', data.visits.drafts_uncommitted, FilePlus2, 'text-amber-300'],
    ['ارجاع‌های باز', data.referrals.open, Send, 'text-violet-300'],
    ['خدمات در انتظار', data.services.pending, FlaskConical, 'text-sky-300'],
    ['صف همگام‌سازی', data.sync.queued, RefreshCw, 'text-teal-300'],
    ['مراقبت‌های معوق', data.care_gaps.overdue_items_total, CalendarPlus, 'text-rose-300'],
    ['بیماران با مراقبت معوق', data.care_gaps.overdue_patients, Users, 'text-rose-300'],
  ] as const
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-teal-300">{data.jalali_date || 'گزارش لحظه‌ای'}</p>
          <h2 className="mt-1 text-2xl font-bold">نمای کلی مرکز</h2>
          <p className="mt-1 text-sm text-slate-400">شاخص‌های عملیاتی و بالینی در یک نگاه</p>
        </div>
        <Button onClick={() => void load()}>
          <RefreshCw size={16} />
          به‌روزرسانی
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(([label, value, Icon, tone]) => (
          <Card key={label} className="p-4">
            <div className="flex justify-between">
              <span className={cx('rounded-lg bg-slate-950 p-2', tone)}>
                <Icon size={18} />
              </span>
              <strong className="num text-2xl">{value}</strong>
            </div>
            <p className="mt-4 text-sm text-slate-400">{label}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <PanelHeading title="توزیع خطر قلبی" />
          <div className="flex flex-wrap gap-2 p-5">
            {['GREEN', 'YELLOW', 'ORANGE', 'RED', 'UNKNOWN'].map((risk) => (
              <span
                key={risk}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/40 px-3 py-2 text-xs"
              >
                <StatusChip value={risk} />
                <strong className="num">{data.risk_distribution[risk] || 0}</strong>
              </span>
            ))}
          </div>
        </Card>
        <Card>
          <PanelHeading title="تشخیص‌های پرتکرار" />
          {data.top_diagnoses.length ? (
            <ol className="divide-y divide-slate-800">
              {data.top_diagnoses.map((item, index) => (
                <li key={item.diagnosis} className="flex gap-3 px-5 py-3">
                  <span className="num text-slate-500">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{item.diagnosis}</span>
                  <strong className="num text-teal-300">{item.count}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="تشخیصی ثبت نشده است" />
          )}
        </Card>
        <Card>
          <PanelHeading title="موارد معوق" />
          {data.care_gaps.top_overdue.length ? (
            <div className="divide-y divide-slate-800">
              {data.care_gaps.top_overdue.map((gap) => (
                <div key={gap.category} className="flex justify-between px-5 py-3 text-sm">
                  <span>{gap.category}</span>
                  <span className="num text-rose-300">{gap.patients}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="مورد معوقی نیست" />
          )}
        </Card>
      </div>
      <Card>
        <PanelHeading title="عملیات سریع" />
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              { label: 'مدیریت بیماران', icon: Users, screen: 'patients' },
              { label: 'ثبت ویزیت', icon: Stethoscope, screen: 'visits' },
              { label: 'ارجاع‌ها', icon: Send, screen: 'referrals' },
              { label: 'خدمات تشخیصی', icon: FlaskConical, screen: 'services' },
              { label: 'گزارش‌ها', icon: BarChart3, screen: 'reports' },
            ] as { label: string; icon: typeof Users; screen: Screen }[]
          ).map((action) => (
            <button
              key={action.label}
              onClick={() => onNavigate(action.screen)}
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-right hover:border-teal-500/35"
            >
              <action.icon className="text-teal-300" size={20} />
              <span className="text-sm font-semibold">{action.label}</span>
            </button>
          ))}
          <button
            onClick={onOpenChat}
            className="flex items-center gap-3 rounded-xl border border-teal-500/30 bg-teal-500/5 p-4 text-right"
          >
            <Bot className="text-teal-300" size={20} />
            <span className="text-sm font-semibold">پرسش از Ω-Chat</span>
          </button>
        </div>
      </Card>
    </div>
  )
}

export function PatientsScreen({
  onOpenPatient,
  onNotify,
}: {
  onOpenPatient: (id: string) => void
  onNotify: (message: string, tone?: 'success' | 'error') => void
}) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [data, setData] = useState<{ items: PatientSummary[]; total: number }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const load = async (): Promise<void> => {
    setLoading(true)
    setError('')
    try {
      setData(await api.listPatients(query, 25, page * 25))
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'امکان دریافت فهرست بیماران وجود ندارد',
      )
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250)
    return () => window.clearTimeout(timer)
  }, [query, page])
  const maxPage = Math.max(0, Math.ceil((data?.total || 0) / 25) - 1)
  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold">بیماران</h2>
          <p className="mt-1 text-sm text-slate-400">
            جست‌وجو با نام، کد ملی، تلفن یا شماره خانوار
          </p>
        </div>
        <Button tone="primary" onClick={() => setCreateOpen(true)}>
          <UserPlus size={17} />
          بیمار جدید
        </Button>
      </div>
      <Card>
        <div className="flex gap-3 border-b border-slate-800 p-4">
          <label className="relative block flex-1">
            <span className="sr-only">جست‌وجوی بیمار</span>
            <Search className="absolute start-3 top-3 text-slate-500" size={17} />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(0)
              }}
              placeholder="نام، کد ملی، تلفن یا شماره خانوار"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pe-3 ps-10 text-sm"
            />
          </label>
          <Button onClick={() => void load()}>
            <RefreshCw size={16} />
          </Button>
        </div>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} retry={() => void load()} />
        ) : !data?.items.length ? (
          <EmptyState title="بیماری مطابق جست‌وجو یافت نشد" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-right text-sm">
                <thead className="bg-slate-950/40 text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-3">نام</th>
                    <th>کد ملی</th>
                    <th>سن</th>
                    <th>جنسیت</th>
                    <th>آخرین ویزیت</th>
                    <th>خطر قلبی</th>
                    <th className="px-5">مشکلات باز</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data.items.map((patient) => (
                    <tr
                      key={patient.id}
                      tabIndex={0}
                      onClick={() => onOpenPatient(patient.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') onOpenPatient(patient.id)
                      }}
                      className="cursor-pointer hover:bg-slate-800/60"
                    >
                      <td className="px-5 py-3">
                        <p className="font-semibold">{patient.persian_name || patient.name}</p>
                        <p className="ltr text-xs text-slate-500">{patient.name}</p>
                      </td>
                      <td className="num">{patient.national_id}</td>
                      <td className="num">{patient.age ?? '—'}</td>
                      <td>{patient.gender === 'F' ? 'زن' : 'مرد'}</td>
                      <td className="num text-slate-400">{patient.last_visit_jalali || '—'}</td>
                      <td>
                        <StatusChip value={patient.risk_category} />
                      </td>
                      <td className="num px-5">{patient.open_issue_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-5 py-4 text-sm">
              <span className="text-slate-400">
                <span className="num">{data.total}</span> بیمار
              </span>
              <div className="flex gap-2">
                <Button disabled={page === 0} onClick={() => setPage((value) => value - 1)}>
                  قبلی
                </Button>
                <span className="num self-center">
                  {page + 1} / {maxPage + 1}
                </span>
                <Button disabled={page >= maxPage} onClick={() => setPage((value) => value + 1)}>
                  بعدی
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
      {createOpen ? (
        <PatientCreateDialog
          onClose={() => setCreateOpen(false)}
          onCreated={(patient) => {
            setCreateOpen(false)
            onNotify('پرونده بیمار ایجاد شد.', 'success')
            onOpenPatient(patient.id)
          }}
          onNotify={onNotify}
        />
      ) : null}
    </div>
  )
}

function PatientCreateDialog({
  onClose,
  onCreated,
  onNotify,
}: {
  onClose: () => void
  onCreated: (patient: PatientSummary) => void
  onNotify: (message: string, tone?: 'success' | 'error') => void
}) {
  const [form, setForm] = useState<Record<string, string | boolean>>({ gender: 'F', smoker: false })
  const [saving, setSaving] = useState(false)
  const set = (key: string, value: string | boolean): void =>
    setForm((old) => ({ ...old, [key]: value }))
  const save = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const nationalId = String(form.national_id || '')
    if (!/^\d{10}$/.test(nationalId)) {
      onNotify('کد ملی باید دقیقاً ۱۰ رقم باشد.', 'error')
      return
    }
    const body: PatientCreateInput = {
      national_id: nationalId,
      name: String(form.name || ''),
      persian_name: String(form.persian_name || ''),
      gender: form.gender === 'M' ? 'M' : 'F',
      birth_date: String(form.birth_date || '') || undefined,
      household_number: String(form.household_number || '') || undefined,
      health_center: String(form.health_center || '') || undefined,
      assigned_behvarz: String(form.assigned_behvarz || '') || undefined,
      phone: String(form.phone || '') || undefined,
      smoker: Boolean(form.smoker),
    }
    setSaving(true)
    try {
      onCreated(await api.createPatient(body))
    } catch (caught) {
      onNotify(caught instanceof ApiError ? caught.message : 'ایجاد بیمار ناموفق بود', 'error')
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal title="ثبت بیمار جدید" onClose={onClose}>
      <form onSubmit={(event) => void save(event)} className="space-y-5 p-5">
        <Notice tone="warning">
          کد ملی با قاعده رقم کنترل ایران در سرور بررسی می‌شود؛ پیام خطای سرور را اصلاح کنید.
        </Notice>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="کد ملی"
            id="p-nid"
            required
            inputMode="numeric"
            maxLength={10}
            value={String(form.national_id || '')}
            onChange={(event) => set('national_id', event.target.value)}
          />
          <Input
            label="نام فارسی"
            id="p-persian"
            required
            value={String(form.persian_name || '')}
            onChange={(event) => set('persian_name', event.target.value)}
          />
          <Input
            label="نام لاتین"
            id="p-name"
            required
            value={String(form.name || '')}
            onChange={(event) => set('name', event.target.value)}
          />
          <Select
            label="جنسیت"
            id="p-gender"
            value={String(form.gender || 'F')}
            onChange={(event) => set('gender', event.target.value)}
          >
            <option value="F">زن</option>
            <option value="M">مرد</option>
          </Select>
          <Input
            label="تاریخ تولد میلادی"
            id="p-birth"
            type="date"
            value={String(form.birth_date || '')}
            onChange={(event) => set('birth_date', event.target.value)}
          />
          <Input
            label="شماره پرونده خانوار"
            id="p-household"
            value={String(form.household_number || '')}
            onChange={(event) => set('household_number', event.target.value)}
          />
          <Input
            label="تلفن"
            id="p-phone"
            dir="ltr"
            value={String(form.phone || '')}
            onChange={(event) => set('phone', event.target.value)}
          />
          <Input
            label="مرکز سلامت"
            id="p-center"
            value={String(form.health_center || '')}
            onChange={(event) => set('health_center', event.target.value)}
          />
          <Input
            label="بهورز مسئول"
            id="p-behvarz"
            value={String(form.assigned_behvarz || '')}
            onChange={(event) => set('assigned_behvarz', event.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(form.smoker)}
            onChange={(event) => set('smoker', event.target.checked)}
            className="accent-teal-400"
          />
          مصرف‌کننده دخانیات
        </label>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>انصراف</Button>
          <Button type="submit" tone="primary" disabled={saving}>
            {saving ? 'در حال ایجاد…' : 'ایجاد پرونده'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
