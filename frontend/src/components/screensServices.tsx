import { useEffect, useState } from 'react'
import { RefreshCw, Search, Syringe } from 'lucide-react'
import { api, ApiError } from '../api'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  PanelHeading,
  Select,
  StatusChip,
  Textarea,
  cx,
} from './ui'
import type { PatientSummary, ServiceCatalog, ServiceRequest } from '../types'

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
export function ServicesScreen({
  initialPatient,
  onClearInitial,
  onNotify,
}: {
  initialPatient: PatientSummary | null
  onClearInitial: () => void
  onNotify: (message: string, tone?: 'success' | 'error') => void
}) {
  const patients = usePatients()
  const [catalogue, setCatalogue] = useState<ServiceCatalog[]>([])
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [patientId, setPatientId] = useState(initialPatient?.id || '')
  const [serviceCode, setServiceCode] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = async (): Promise<void> => {
    setLoading(true)
    setError('')
    try {
      const [catalogueResult, requestsResult] = await Promise.all([
        api.listServices(category || undefined, search || undefined),
        api.listServiceRequests({ limit: 50 }),
      ])
      setCatalogue(catalogueResult)
      setRequests(requestsResult.items)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'امکان دریافت خدمات وجود ندارد')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 220)
    return () => window.clearTimeout(timer)
  }, [category, search])
  useEffect(() => {
    if (initialPatient) setPatientId(initialPatient.id)
  }, [initialPatient])
  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (!patientId || !serviceCode) {
      onNotify('بیمار و کد خدمت را انتخاب کنید.', 'error')
      return
    }
    try {
      const result = await api.createServiceRequest({
        patient_id: patientId,
        service_code: serviceCode,
        notes,
      })
      onNotify(
        `${result.service_persian_name || 'خدمت'} درخواست شد.${result.requires_fasting ? ' بیمار باید ناشتا باشد.' : ''}`,
        'success',
      )
      setNotes('')
      setServiceCode('')
      onClearInitial()
      await load()
    } catch (caught) {
      onNotify(caught instanceof ApiError ? caught.message : 'ثبت درخواست ناموفق بود', 'error')
    }
  }
  const transition = async (request: ServiceRequest, status: string): Promise<void> => {
    try {
      await api.updateServiceRequest(request.id, { status })
      onNotify('وضعیت درخواست به‌روزرسانی شد.', 'success')
      await load()
    } catch (caught) {
      onNotify(caught instanceof ApiError ? caught.message : 'به‌روزرسانی ناموفق بود', 'error')
    }
  }
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">خدمات تشخیصی و درمانی</h2>
        <p className="mt-1 text-sm text-slate-400">کاتالوگ ملی، درخواست و پیگیری وضعیت خدمات</p>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <PanelHeading title="کاتالوگ خدمات" />
          <div className="flex flex-col gap-3 border-b border-slate-800 p-4 sm:flex-row">
            <Select
              label="دسته"
              id="service-category"
              className="sm:w-44"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">همه دسته‌ها</option>
              {['LAB', 'IMAGING', 'SCREENING', 'PROCEDURE', 'CONSULT'].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
            <label className="relative block flex-1">
              <span className="mb-1.5 block text-sm font-medium text-slate-300">جست‌وجو</span>
              <Search className="absolute start-3 bottom-3 text-slate-500" size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="نام یا کد خدمت"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pe-3 ps-10 text-sm"
              />
            </label>
          </div>
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} retry={() => void load()} />
          ) : catalogue.length ? (
            <div className="divide-y divide-slate-800">
              {catalogue.map((service) => (
                <button
                  key={service.id}
                  onClick={() => setServiceCode(service.code)}
                  className={cx(
                    'flex w-full items-start justify-between gap-4 px-5 py-4 text-right hover:bg-slate-800/60',
                    serviceCode === service.code && 'bg-teal-500/5',
                  )}
                >
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <p className="font-semibold">{service.persian_name || service.name}</p>
                      <code className="ltr text-xs text-teal-300">{service.code}</code>
                      <StatusChip value={service.category} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      پاسخ: {service.turnaround_days} روز{' '}
                      {service.requires_fasting ? '· ناشتا' : ''}{' '}
                      {service.instructions ? `· ${service.instructions}` : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="خدمتی یافت نشد" />
          )}
        </Card>
        <Card className="h-fit">
          <PanelHeading title="درخواست خدمت" subtitle="ابتدا خدمت را از کاتالوگ انتخاب کنید" />
          <form onSubmit={(event) => void submit(event)} className="space-y-4 p-5">
            <Select
              label="بیمار"
              id="service-patient"
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
            <Input
              label="کد خدمت"
              id="service-code"
              value={serviceCode}
              onChange={(event) => setServiceCode(event.target.value.toUpperCase())}
              placeholder="LAB-FBS"
            />
            <Textarea
              label="یادداشت"
              id="service-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
            <Button tone="primary" className="w-full" type="submit">
              <Syringe size={16} />
              ثبت درخواست
            </Button>
          </form>
        </Card>
      </div>
      <Card>
        <PanelHeading
          title="درخواست‌های اخیر"
          action={
            <Button onClick={() => void load()}>
              <RefreshCw size={15} />
            </Button>
          }
        />
        {requests.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-right text-sm">
              <thead className="bg-slate-950/40 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3">خدمت</th>
                  <th>وضعیت</th>
                  <th>تاریخ</th>
                  <th>یادداشت</th>
                  <th className="px-5">انتقال</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-5 py-3 font-medium">
                      {request.service_persian_name ||
                        request.service_name ||
                        `#${request.service_id}`}
                    </td>
                    <td>
                      <StatusChip value={request.status} />
                    </td>
                    <td className="text-xs text-slate-400">{request.requested_at}</td>
                    <td className="text-xs text-slate-400">{request.notes || '—'}</td>
                    <td className="px-5">
                      <select
                        aria-label="تغییر وضعیت خدمت"
                        value=""
                        onChange={(event) => {
                          if (event.target.value) void transition(request, event.target.value)
                        }}
                        className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                      >
                        <option value="">تغییر وضعیت</option>
                        {request.status === 'REQUESTED' ? (
                          <option value="SCHEDULED">SCHEDULED</option>
                        ) : null}
                        {['REQUESTED', 'SCHEDULED'].includes(request.status) ? (
                          <option value="RESULTED">RESULTED</option>
                        ) : null}
                        {['REQUESTED', 'SCHEDULED'].includes(request.status) ? (
                          <option value="CANCELLED">CANCELLED</option>
                        ) : null}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="درخواستی ثبت نشده است" />
        )}
      </Card>
    </div>
  )
}
