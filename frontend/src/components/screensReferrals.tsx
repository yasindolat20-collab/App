import { useEffect, useState } from 'react'
import { FileCheck2, FileSearch, Plus, Send } from 'lucide-react'
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
  Textarea,
} from './ui'
import type { PatientSummary, Referral, ReferralSlip } from '../types'

const specialties = [
  { name: 'Cardiology', fa: 'قلب و عروق' },
  { name: 'Endocrinology', fa: 'غدد' },
  { name: 'Ophthalmology', fa: 'چشم‌پزشکی' },
  { name: 'Nephrology', fa: 'کلیه' },
  { name: 'Orthopedics', fa: 'ارتوپدی' },
  { name: 'Psychiatry', fa: 'روان‌پزشکی' },
  { name: 'Pulmonology', fa: 'ریه' },
  { name: 'Gastroenterology', fa: 'گوارش' },
  { name: 'Dermatology', fa: 'پوست' },
  { name: 'Neurology', fa: 'مغز و اعصاب' },
]
function usePatients(): PatientSummary[] {
  const [patients, setPatients] = useState<PatientSummary[]>([])
  useEffect(() => {
    void api
      .listPatients('', 200, 0)
      .then((result) => setPatients(result.items))
      .catch(() => setPatients([]))
  }, [])
  return patients
}
export function ReferralsScreen({
  initialPatient,
  onClearInitial,
  onNotify,
}: {
  initialPatient: PatientSummary | null
  onClearInitial: () => void
  onNotify: (message: string, tone?: 'success' | 'error') => void
}) {
  const patients = usePatients()
  const [items, setItems] = useState<Referral[]>([])
  const [status, setStatus] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [slip, setSlip] = useState<ReferralSlip>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = async (): Promise<void> => {
    setLoading(true)
    setError('')
    try {
      setItems(
        (
          await api.listReferrals({
            status: status || undefined,
            specialty: specialtyFilter || undefined,
            limit: 50,
          })
        ).items,
      )
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'امکان دریافت ارجاع‌ها وجود ندارد')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
  }, [status, specialtyFilter])
  useEffect(() => {
    if (initialPatient) setOpen(true)
  }, [initialPatient])
  const update = async (referral: Referral, newStatus: string): Promise<void> => {
    try {
      await api.updateReferral(referral.id, { status: newStatus })
      onNotify('وضعیت ارجاع به‌روزرسانی شد.', 'success')
      await load()
    } catch (caught) {
      onNotify(caught instanceof ApiError ? caught.message : 'به‌روزرسانی ناموفق بود', 'error')
    }
  }
  const preview = async (id: string): Promise<void> => {
    try {
      setSlip(await api.getReferralSlip(id))
    } catch (caught) {
      onNotify(
        caught instanceof ApiError ? caught.message : 'امکان دریافت برگه ارجاع نیست',
        'error',
      )
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold">ارجاع‌ها</h2>
          <p className="mt-1 text-sm text-slate-400">ارجاع بالینی، چک‌لیست آمادگی و برگه چاپی</p>
        </div>
        <Button tone="primary" onClick={() => setOpen(true)}>
          <Plus size={17} />
          ارجاع جدید
        </Button>
      </div>
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-800 p-4">
          <Select
            label="وضعیت"
            id="ref-status"
            className="w-44"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">همه</option>
            {['DRAFT', 'SENT', 'ACCEPTED', 'COMPLETED', 'REJECTED'].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          <Input
            label="تخصص"
            id="ref-specialty"
            className="w-52"
            value={specialtyFilter}
            onChange={(event) => setSpecialtyFilter(event.target.value)}
            placeholder="مثلاً Cardiology"
          />
        </div>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} retry={() => void load()} />
        ) : items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-right text-sm">
              <thead className="bg-slate-950/40 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3">تخصص / فوریت</th>
                  <th>علت</th>
                  <th>مقصد</th>
                  <th>وضعیت</th>
                  <th className="px-5">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {items.map((referral) => (
                  <tr key={referral.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium">
                        {referral.persian_specialty || referral.specialty}
                      </p>
                      <StatusChip value={referral.urgency} />
                    </td>
                    <td className="max-w-sm text-slate-400">{referral.reason || '—'}</td>
                    <td className="text-slate-400">{referral.target_facility || '—'}</td>
                    <td>
                      <StatusChip value={referral.status} />
                    </td>
                    <td className="px-5">
                      <div className="flex gap-2">
                        <Button onClick={() => void preview(referral.id)}>
                          <FileSearch size={15} />
                          برگه
                        </Button>
                        <select
                          aria-label="تغییر وضعیت ارجاع"
                          value=""
                          onChange={(event) => {
                            if (event.target.value) void update(referral, event.target.value)
                          }}
                          className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                        >
                          <option value="">وضعیت…</option>
                          {referral.status === 'DRAFT' ? <option value="SENT">SENT</option> : null}
                          {referral.status === 'SENT' ? (
                            <option value="ACCEPTED">ACCEPTED</option>
                          ) : null}
                          {referral.status === 'ACCEPTED' ? (
                            <option value="COMPLETED">COMPLETED</option>
                          ) : null}
                          {!['COMPLETED', 'REJECTED'].includes(referral.status) ? (
                            <option value="REJECTED">REJECTED</option>
                          ) : null}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="ارجاعی مطابق فیلتر وجود ندارد" />
        )}
      </Card>
      {open ? (
        <ReferralForm
          patients={patients}
          initialPatient={initialPatient}
          onClose={() => {
            setOpen(false)
            onClearInitial()
          }}
          onSaved={() => {
            setOpen(false)
            onClearInitial()
            void load()
          }}
          onNotify={onNotify}
        />
      ) : null}
      {slip ? <SlipModal slip={slip} onClose={() => setSlip(undefined)} /> : null}
    </div>
  )
}
function ReferralForm({
  patients,
  initialPatient,
  onClose,
  onSaved,
  onNotify,
}: {
  patients: PatientSummary[]
  initialPatient: PatientSummary | null
  onClose: () => void
  onSaved: () => void
  onNotify: (message: string, tone?: 'success' | 'error') => void
}) {
  const [patientId, setPatientId] = useState(initialPatient?.id || '')
  const [specialty, setSpecialty] = useState('Cardiology')
  const [urgency, setUrgency] = useState('ROUTINE')
  const [reason, setReason] = useState('')
  const [facility, setFacility] = useState('')
  const [sendNow, setSendNow] = useState(false)
  const [workup, setWorkup] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const selected = specialties.find((item) => item.name === specialty)
  const save = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (!patientId) {
      onNotify('بیمار را انتخاب کنید.', 'error')
      return
    }
    setSaving(true)
    try {
      const created = await api.createReferral({
        patient_id: patientId,
        specialty,
        persian_specialty: selected?.fa || '',
        urgency,
        reason,
        target_facility: facility || undefined,
        workup,
        send: sendNow,
      })
      setWorkup(created.workup.map(String))
      onNotify(`ارجاع ${sendNow ? 'ارسال' : 'به‌صورت پیش‌نویس ثبت'} شد.`, 'success')
      onSaved()
    } catch (caught) {
      onNotify(caught instanceof ApiError ? caught.message : 'ثبت ارجاع ناموفق بود', 'error')
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal title="ارجاع جدید" onClose={onClose}>
      <form onSubmit={(event) => void save(event)} className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="بیمار"
            id="new-ref-patient"
            value={patientId}
            onChange={(event) => setPatientId(event.target.value)}
          >
            <option value="">انتخاب بیمار</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.persian_name || patient.name}
              </option>
            ))}
          </Select>
          <Select
            label="تخصص"
            id="new-ref-specialty"
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
          >
            {specialties.map((item) => (
              <option key={item.name} value={item.name}>
                {item.fa} — {item.name}
              </option>
            ))}
          </Select>
          <Select
            label="فوریت"
            id="new-ref-urgency"
            value={urgency}
            onChange={(event) => setUrgency(event.target.value)}
          >
            {['ROUTINE', 'URGENT', 'EMERGENCY'].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          <Input
            label="مرکز مقصد"
            id="new-ref-facility"
            value={facility}
            onChange={(event) => setFacility(event.target.value)}
          />
        </div>
        <Textarea
          label="علت ارجاع"
          id="new-ref-reason"
          required
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <div>
          <p className="mb-2 text-sm font-medium">چک‌لیست بررسی اولیه</p>
          {workup.length ? (
            <div className="space-y-2 rounded-lg border border-slate-800 p-3">
              {workup.map((item, index) => (
                <label key={`${item}-${index}`} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" defaultChecked className="accent-teal-400" />
                  {item}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              پس از ایجاد، چک‌لیست استاندارد تخصص در پاسخ سرور بازگردانده می‌شود.
            </p>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={sendNow}
            onChange={(event) => setSendNow(event.target.checked)}
            className="accent-teal-400"
          />
          ارسال به سیب پس از ایجاد
        </label>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>انصراف</Button>
          <Button tone="primary" type="submit" disabled={saving}>
            <Send size={16} />
            {saving ? 'در حال ثبت…' : 'ثبت ارجاع'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
function SlipModal({ slip, onClose }: { slip: ReferralSlip; onClose: () => void }) {
  return (
    <Modal title="برگه ارجاع" onClose={onClose} className="max-w-3xl">
      <article className="print-card space-y-5 p-6">
        <div className="flex justify-between gap-4 border-b border-slate-700 pb-4">
          <div>
            <p className="text-xl font-bold">Ω-SIB · برگه ارجاع</p>
            <p className="mt-1 text-sm text-slate-400">
              شماره: <span className="num">{slip.slip_number}</span> · تاریخ: {slip.issued_jalali}
            </p>
          </div>
          <StatusChip value={slip.urgency} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-bold text-slate-500">بیمار</h3>
            <p className="mt-1 font-semibold">{slip.patient?.name || '—'}</p>
            <p className="text-sm text-slate-400">
              کد ملی: <span className="num">{slip.patient?.national_id || '—'}</span> · سن:{' '}
              {slip.patient?.age ?? '—'}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-500">ارجاع</h3>
            <p className="mt-1 font-semibold">{slip.persian_specialty || slip.specialty}</p>
            <p className="text-sm text-slate-400">مقصد: {slip.target_facility || '—'}</p>
          </div>
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-500">علت ارجاع</h3>
          <p className="mt-1 text-sm">{slip.reason || '—'}</p>
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-500">چک‌لیست آمادگی</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {slip.workup_checklist.map((item, index) => (
              <li key={index}>□ {String(item)}</li>
            ))}
          </ul>
        </div>
        <div className="no-print flex justify-end">
          <Button tone="primary" onClick={() => window.print()}>
            <FileCheck2 size={16} />
            چاپ برگه
          </Button>
        </div>
      </article>
    </Modal>
  )
}
