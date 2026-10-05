import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { api, ApiError } from '../api'
import { Button, Card, EmptyState, ErrorState, LoadingState, PanelHeading, StatusChip } from './ui'
import type { CareGap, DashboardSummary, DataQualityReport } from '../types'

export function ReportsScreen({ onOpenPatient }: { onOpenPatient: (id: string) => void }) {
  const [summary, setSummary] = useState<DashboardSummary>()
  const [gaps, setGaps] = useState<CareGap[]>([])
  const [quality, setQuality] = useState<DataQualityReport>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = async (): Promise<void> => {
    setLoading(true)
    setError('')
    try {
      const [report, care, dq] = await Promise.all([
        api.getReportSummary(),
        api.getCareGaps(),
        api.getDataQuality(),
      ])
      setSummary(report)
      setGaps(care.items)
      setQuality(dq)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'دریافت گزارش‌ها ناموفق بود')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
  }, [])
  if (loading) return <LoadingState label="در حال تولید گزارش‌ها…" />
  if (error) return <ErrorState message={error} retry={() => void load()} />
  if (!summary || !quality) return <EmptyState />
  return (
    <div className="space-y-5">
      <div className="flex justify-between">
        <div>
          <h2 className="text-2xl font-bold">گزارش‌ها</h2>
          <p className="mt-1 text-sm text-slate-400">کاربرگ اقدام بالینی و کنترل کیفیت داده</p>
        </div>
        <Button onClick={() => void load()}>
          <RefreshCw size={16} />
          به‌روزرسانی
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReportNumber label="کل بیماران" value={summary.patients.total} />
        <ReportNumber label="ویزیت تعهدنشده" value={summary.visits.drafts_uncommitted} />
        <ReportNumber
          label="آیتم مراقبتی معوق"
          value={summary.care_gaps.overdue_items_total}
          tone="rose"
        />
        <ReportNumber label="نقص باز ثبت‌شده" value={quality.stored_issues.open} tone="amber" />
      </div>
      <Card>
        <PanelHeading title="کاربرگ مراقبت پیشگیرانه" subtitle="مرتب‌شده با اولویت OVERDUE" />
        {gaps.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-right text-sm">
              <thead className="bg-slate-950/40 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3">بیمار</th>
                  <th>مراقبت</th>
                  <th>وضعیت</th>
                  <th>آخرین انجام</th>
                  <th>سررسید</th>
                  <th className="px-5">راهنما</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {gaps.map((gap) => (
                  <tr
                    key={`${gap.patient_id}-${gap.category}`}
                    className="cursor-pointer hover:bg-slate-800/60"
                    onClick={() => onOpenPatient(gap.patient_id)}
                  >
                    <td className="px-5 py-3 font-medium">{gap.patient}</td>
                    <td>{gap.persian_category || gap.category}</td>
                    <td>
                      <StatusChip value={gap.status} />
                    </td>
                    <td className="num text-slate-400">{gap.last_done_jalali || '—'}</td>
                    <td className="num text-slate-400">{gap.next_due_jalali || '—'}</td>
                    <td className="max-w-sm px-5 text-xs text-slate-400">{gap.guideline || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="مورد DUE یا OVERDUE وجود ندارد" />
        )}
      </Card>
      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <PanelHeading title="شدت نقص‌های داده" />
          <div className="space-y-3 p-5">
            {Object.entries(quality.stored_issues.by_severity).map(([severity, count]) => (
              <div key={severity} className="flex justify-between">
                <StatusChip value={severity} />
                <strong className="num">{count}</strong>
              </div>
            ))}
            <div className="border-t border-slate-800 pt-3 text-sm text-slate-400">
              موارد ذخیره‌شده:{' '}
              <span className="num text-slate-100">{quality.stored_issues.total}</span>
            </div>
          </div>
        </Card>
        <Card>
          <PanelHeading title="شناسه‌های ملی" />
          <div className="space-y-4 p-5 text-sm">
            <div>
              <p className="text-slate-500">شناسه تکراری</p>
              {quality.identity.duplicate_national_ids.length ? (
                quality.identity.duplicate_national_ids.map((item) => (
                  <p key={item.national_id} className="num mt-1 text-rose-300">
                    {item.national_id} × {item.count}
                  </p>
                ))
              ) : (
                <p className="mt-1 text-emerald-300">موردی نیست</p>
              )}
            </div>
            <div>
              <p className="text-slate-500">شناسه نامعتبر</p>
              {quality.identity.invalid_national_ids.length ? (
                quality.identity.invalid_national_ids.map((item) => (
                  <button
                    key={item.patient_id}
                    onClick={() => onOpenPatient(item.patient_id)}
                    className="num mt-1 block text-rose-300"
                  >
                    {item.national_id}
                  </button>
                ))
              ) : (
                <p className="mt-1 text-emerald-300">موردی نیست</p>
              )}
            </div>
          </div>
        </Card>
        <Card>
          <PanelHeading title="شکاف کامل‌بودن اطلاعات" />
          <dl className="divide-y divide-slate-800 p-5 text-sm">
            {[
              ['بدون تلفن', quality.completeness.missing_phone],
              ['بدون شماره خانوار', quality.completeness.missing_household_number],
              ['بدون تاریخ تولد', quality.completeness.missing_birth_date],
              ['بدون علائم حیاتی', quality.completeness.without_any_vitals],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between py-2">
                <dt className="text-slate-400">{label}</dt>
                <dd className="num">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
      <Card>
        <PanelHeading title="یافته‌های زنده کنترل کیفیت" />
        <div className="divide-y divide-slate-800">
          {quality.live_findings.items.length ? (
            quality.live_findings.items.map((item, index) => (
              <button
                key={`${item.patient_id}-${index}`}
                onClick={() => onOpenPatient(item.patient_id)}
                className="flex w-full items-start gap-3 px-5 py-3 text-right hover:bg-slate-800/60"
              >
                <StatusChip value={item.severity} />
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.patient} · {item.suggested_correction || 'اصلاح پیشنهادی ثبت نشده'}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <EmptyState title="یافته زنده‌ای نیست" />
          )}
        </div>
      </Card>
    </div>
  )
}
function ReportNumber({
  label,
  value,
  tone = 'teal',
}: {
  label: string
  value: number
  tone?: 'teal' | 'rose' | 'amber'
}) {
  const colors = { teal: 'text-teal-300', rose: 'text-rose-300', amber: 'text-amber-300' }
  return (
    <Card className="p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`num mt-3 text-3xl font-bold ${colors[tone]}`}>{value}</p>
    </Card>
  )
}
