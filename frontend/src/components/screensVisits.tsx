import { useEffect, useState } from 'react'
import { FilePlus2, Plus, RefreshCw, ShieldCheck } from 'lucide-react'
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
import type { Encounter, EncounterInput, JsonObject, PatientSummary } from '../types'

function usePatientOptions(): { patients: PatientSummary[]; loading: boolean } {
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    void api
      .listPatients('', 200, 0)
      .then((result) => setPatients(result.items))
      .catch(() => setPatients([]))
      .finally(() => setLoading(false))
  }, [])
  return { patients, loading }
}
export function VisitsScreen({
  initialPatient,
  onClearInitial,
  onNotify,
}: {
  initialPatient: PatientSummary | null
  onClearInitial: () => void
  onNotify: (message: string, tone?: 'success' | 'error') => void
}) {
  const [filter, setFilter] = useState('')
  const [items, setItems] = useState<Encounter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const load = async (): Promise<void> => {
    setLoading(true)
    setError('')
    try {
      setItems((await api.listEncounters({ status: filter || undefined, limit: 50 })).items)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'امکان دریافت ویزیت‌ها وجود ندارد')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
  }, [filter])
  useEffect(() => {
    if (initialPatient) setOpen(true)
  }, [initialPatient])
  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold">ویزیت‌ها</h2>
          <p className="mt-1 text-sm text-slate-400">
            پیش‌نویس را بازبینی و سپس به سیب ارسال کنید.
          </p>
        </div>
        <Button tone="primary" onClick={() => setOpen(true)}>
          <Plus size={17} />
          ویزیت جدید
        </Button>
      </div>
      <Card>
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <Select
            label="فیلتر وضعیت"
            id="visit-filter"
            className="w-44"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="">همه</option>
            <option value="DRAFT">DRAFT</option>
            <option value="COMMITTED">COMMITTED</option>
          </Select>
          <Button onClick={() => void load()}>
            <RefreshCw size={16} />
          </Button>
        </div>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} retry={() => void load()} />
        ) : !items.length ? (
          <EmptyState title="ویزیتی مطابق فیلتر وجود ندارد" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-right text-sm">
              <thead className="bg-slate-950/40 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3">تاریخ</th>
                  <th>شکایت</th>
                  <th>ارزیابی</th>
                  <th>پیگیری</th>
                  <th className="px-5">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {items.map((visit) => (
                  <tr key={visit.id}>
                    <td className="num px-5 py-3 text-teal-300">{visit.jalali_date || '—'}</td>
                    <td>{visit.chief_complaint || '—'}</td>
                    <td className="text-slate-400">
                      {visit.assessment.map(String).join('، ') || '—'}
                    </td>
                    <td className="num text-slate-400">
                      {visit.follow_up_days ? `${visit.follow_up_days} روز` : '—'}
                    </td>
                    <td className="px-5">
                      <StatusChip value={visit.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {open ? (
        <VisitForm
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
    </div>
  )
}
function ListEditor({
  label,
  values,
  setValues,
  placeholder,
}: {
  label: string
  values: string[]
  setValues: (values: string[]) => void
  placeholder: string
}) {
  const [text, setText] = useState('')
  const add = (): void => {
    if (text.trim()) {
      setValues([...values, text.trim()])
      setText('')
    }
  }
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-300">{label}</label>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        />
        <Button onClick={add} aria-label={`افزودن ${label}`}>
          <Plus size={16} />
        </Button>
      </div>
      {values.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map((value, index) => (
            <button
              key={`${value}-${index}`}
              onClick={() => setValues(values.filter((_, position) => position !== index))}
              className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            >
              {value} ×
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
function VisitForm({
  initialPatient,
  onClose,
  onSaved,
  onNotify,
}: {
  initialPatient: PatientSummary | null
  onClose: () => void
  onSaved: () => void
  onNotify: (message: string, tone?: 'success' | 'error') => void
}) {
  const { patients, loading } = usePatientOptions()
  const [patientId, setPatientId] = useState(initialPatient?.id || '')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [assessment, setAssessment] = useState<string[]>([])
  const [plan, setPlan] = useState<string[]>([])
  const [labs, setLabs] = useState<string[]>([])
  const [prescriptions, setPrescriptions] = useState<
    { drug: string; dose: string; frequency: string; duration: string }[]
  >([])
  const [referral, setReferral] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const set = (key: string, value: string): void => setFields((old) => ({ ...old, [key]: value }))
  const build = (commit: boolean, pin?: string): EncounterInput => {
    const vitals: JsonObject = {}
    ;[
      'bp_systolic',
      'bp_diastolic',
      'heart_rate',
      'weight_kg',
      'height_cm',
      'fasting_blood_sugar',
      'hba1c',
    ].forEach((key) => {
      if (fields[key]) vitals[key] = Number(fields[key])
    })
    return {
      patient_id: patientId,
      chief_complaint: fields.chief_complaint || undefined,
      subjective: fields.subjective || undefined,
      objective: fields.objective || undefined,
      physical_findings: fields.physical_findings || undefined,
      assessment,
      plan,
      prescriptions: prescriptions
        .filter((item) => item.drug)
        .map((item) => ({
          drug: item.drug,
          dose: item.dose,
          frequency: item.frequency,
          duration: item.duration,
        })),
      lab_orders: labs,
      referral_requested: referral,
      referral_specialty: fields.referral_specialty || undefined,
      follow_up_days: fields.follow_up_days ? Number(fields.follow_up_days) : undefined,
      vitals: Object.keys(vitals).length ? vitals : undefined,
      commit,
      pin,
    }
  }
  const submit = async (commit: boolean, pin?: string): Promise<void> => {
    if (!patientId) {
      onNotify('بیمار را انتخاب کنید.', 'error')
      return
    }
    setSaving(true)
    try {
      await api.createEncounter(build(commit, pin))
      onNotify(commit ? 'ویزیت تأیید و برای سیب ارسال شد.' : 'پیش‌نویس ویزیت ذخیره شد.', 'success')
      onSaved()
    } catch (caught) {
      if (commit && caught instanceof ApiError && caught.status === 403) {
        setPinOpen(true)
        onNotify(caught.message, 'error')
      } else onNotify(caught instanceof ApiError ? caught.message : 'ثبت ویزیت ناموفق بود', 'error')
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal title="ویزیت جدید" onClose={onClose} className="max-w-5xl">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit(false)
        }}
        className="space-y-5 p-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="بیمار"
            id="visit-patient"
            required
            value={patientId}
            disabled={loading}
            onChange={(event) => setPatientId(event.target.value)}
          >
            <option value="">{loading ? 'در حال دریافت…' : 'انتخاب بیمار'}</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.persian_name || patient.name} — {patient.national_id}
              </option>
            ))}
          </Select>
          <Input
            label="شکایت اصلی"
            id="visit-complaint"
            value={fields.chief_complaint || ''}
            onChange={(event) => set('chief_complaint', event.target.value)}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Textarea
            label="شرح حال (Subjective)"
            id="visit-subjective"
            rows={3}
            value={fields.subjective || ''}
            onChange={(event) => set('subjective', event.target.value)}
          />
          <Textarea
            label="یافته‌های عینی (Objective)"
            id="visit-objective"
            rows={3}
            value={fields.objective || ''}
            onChange={(event) => set('objective', event.target.value)}
          />
          <Textarea
            label="معاینه فیزیکی"
            id="visit-physical"
            rows={3}
            value={fields.physical_findings || ''}
            onChange={(event) => set('physical_findings', event.target.value)}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ListEditor
            label="ارزیابی"
            values={assessment}
            setValues={setAssessment}
            placeholder="تشخیص یا ارزیابی"
          />
          <ListEditor
            label="طرح درمان"
            values={plan}
            setValues={setPlan}
            placeholder="اقدام یا توصیه"
          />
          <ListEditor
            label="آزمایش‌ها / خدمات"
            values={labs}
            setValues={setLabs}
            placeholder="LAB-HBA1C یا متن آزاد"
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium">نسخه‌ها</label>
            {prescriptions.map((item, index) => (
              <div key={index} className="mb-2 grid grid-cols-5 gap-2">
                <input
                  aria-label="نام دارو"
                  value={item.drug}
                  onChange={(event) =>
                    setPrescriptions(
                      prescriptions.map((row, position) =>
                        position === index ? { ...row, drug: event.target.value } : row,
                      ),
                    )
                  }
                  placeholder="دارو"
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-xs"
                />
                <input
                  aria-label="دوز"
                  value={item.dose}
                  onChange={(event) =>
                    setPrescriptions(
                      prescriptions.map((row, position) =>
                        position === index ? { ...row, dose: event.target.value } : row,
                      ),
                    )
                  }
                  placeholder="دوز"
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-xs"
                />
                <input
                  aria-label="تناوب"
                  value={item.frequency}
                  onChange={(event) =>
                    setPrescriptions(
                      prescriptions.map((row, position) =>
                        position === index ? { ...row, frequency: event.target.value } : row,
                      ),
                    )
                  }
                  placeholder="تناوب"
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-xs"
                />
                <input
                  aria-label="مدت"
                  value={item.duration}
                  onChange={(event) =>
                    setPrescriptions(
                      prescriptions.map((row, position) =>
                        position === index ? { ...row, duration: event.target.value } : row,
                      ),
                    )
                  }
                  placeholder="مدت"
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-xs"
                />
                <button
                  type="button"
                  aria-label="حذف نسخه"
                  onClick={() =>
                    setPrescriptions(prescriptions.filter((_, position) => position !== index))
                  }
                  className="rounded border border-rose-500/30 text-rose-300"
                >
                  ×
                </button>
              </div>
            ))}
            <Button
              onClick={() =>
                setPrescriptions([
                  ...prescriptions,
                  { drug: '', dose: '', frequency: '', duration: '' },
                ])
              }
            >
              <Plus size={15} />
              افزودن نسخه
            </Button>
          </div>
        </div>
        <fieldset className="rounded-lg border border-slate-800 p-4">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={referral}
              onChange={(event) => setReferral(event.target.checked)}
              className="accent-teal-400"
            />
            نیازمند ارجاع
          </label>
          {referral ? (
            <Input
              className="mt-3"
              label="تخصص مورد نیاز"
              id="visit-specialty"
              value={fields.referral_specialty || ''}
              onChange={(event) => set('referral_specialty', event.target.value)}
            />
          ) : null}
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-4">
          <Input
            label="پیگیری (روز)"
            id="visit-follow"
            type="number"
            value={fields.follow_up_days || ''}
            onChange={(event) => set('follow_up_days', event.target.value)}
          />
          <Input
            label="فشار سیستولیک"
            id="visit-sys"
            type="number"
            value={fields.bp_systolic || ''}
            onChange={(event) => set('bp_systolic', event.target.value)}
          />
          <Input
            label="فشار دیاستولیک"
            id="visit-dia"
            type="number"
            value={fields.bp_diastolic || ''}
            onChange={(event) => set('bp_diastolic', event.target.value)}
          />
          <Input
            label="نبض"
            id="visit-hr"
            type="number"
            value={fields.heart_rate || ''}
            onChange={(event) => set('heart_rate', event.target.value)}
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 pt-5">
          <Button onClick={onClose}>انصراف</Button>
          <Button type="submit" disabled={saving}>
            <FilePlus2 size={16} />
            ذخیره پیشنویس
          </Button>
          <Button tone="primary" onClick={() => void submit(true)} disabled={saving}>
            <ShieldCheck size={16} />
            تأیید و ارسال به سیب
          </Button>
        </div>
      </form>
      {pinOpen ? (
        <PinDialog
          onClose={() => setPinOpen(false)}
          onSubmit={(pin) => {
            setPinOpen(false)
            void submit(true, pin)
          }}
        />
      ) : null}
    </Modal>
  )
}
function PinDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (pin: string) => void
}) {
  const [pin, setPin] = useState('')
  return (
    <Modal title="امضای الکترونیک بالینی" onClose={onClose}>
      <div className="space-y-4 p-5">
        <Notice tone="warning">برای تأیید و ارسال این ویزیت، PIN بالینی پزشک لازم است.</Notice>
        <Input
          label="PIN بالینی"
          id="clinical-pin"
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>انصراف</Button>
          <Button tone="primary" onClick={() => onSubmit(pin)} disabled={!pin}>
            تأیید PIN
          </Button>
        </div>
      </div>
    </Modal>
  )
}
