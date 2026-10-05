import { useEffect, useState } from 'react'
import { Bot, RefreshCw, RotateCw, ServerCog, Trash2 } from 'lucide-react'
import { api, ApiError } from '../api'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
  PanelHeading,
  StatusChip,
} from './ui'
import type { AuditEntry, JsonObject, SyncTransaction, User } from '../types'

interface SettingsData {
  user: User
  ai: {
    engine: string
    llm_configured: boolean
    model: string | null
    action_catalogue: string[]
    requires_confirmation: boolean
  }
  bridge: JsonObject
  queue: { items: SyncTransaction[]; adapter: string; counts: Record<string, number> }
  audit: AuditEntry[]
}
export function SettingsScreen({
  onNotify,
}: {
  onNotify: (message: string, tone?: 'success' | 'error') => void
}) {
  const [data, setData] = useState<SettingsData>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = async (): Promise<void> => {
    setLoading(true)
    setError('')
    try {
      const [user, ai, bridge, queue, audit] = await Promise.all([
        api.me(),
        api.aiStatus(),
        api.getSyncStatus(),
        api.getSyncQueue(),
        api.getAudit(50),
      ])
      setData({ user, ai, bridge, queue, audit: audit.items })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'دریافت تنظیمات ناموفق بود')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
  }, [])
  const retry = async (id: string): Promise<void> => {
    setBusy(true)
    try {
      await api.retryTransaction(id)
      onNotify('تراکنش برای تلاش مجدد ارسال شد.', 'success')
      await load()
    } catch (caught) {
      onNotify(caught instanceof ApiError ? caught.message : 'تلاش مجدد ناموفق بود', 'error')
    } finally {
      setBusy(false)
    }
  }
  const flush = async (): Promise<void> => {
    setBusy(true)
    try {
      const result = await api.flushQueue()
      onNotify(`صف تخلیه شد: ${String(result.synced ?? 0)} همگام‌سازی.`, 'success')
      await load()
    } catch (caught) {
      onNotify(caught instanceof ApiError ? caught.message : 'تخلیه صف ناموفق بود', 'error')
    } finally {
      setBusy(false)
    }
  }
  if (loading) return <LoadingState label="در حال دریافت تنظیمات عملیاتی…" />
  if (error) return <ErrorState message={error} retry={() => void load()} />
  if (!data) return <EmptyState />
  const bridgeValue = (key: string): string => {
    const value = data.bridge[key]
    return value === null || value === undefined ? '—' : String(value)
  }
  return (
    <div className="space-y-5">
      <div className="flex justify-between">
        <div>
          <h2 className="text-2xl font-bold">تنظیمات و عملیات</h2>
          <p className="mt-1 text-sm text-slate-400">
            نمایه درمانگر، موتور تصمیم‌یار و پل همگام‌سازی
          </p>
        </div>
        <Button onClick={() => void load()}>
          <RefreshCw size={16} />
          به‌روزرسانی
        </Button>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <PanelHeading title="نمایه درمانگر" />
          <dl className="space-y-3 p-5 text-sm">
            <div>
              <dt className="text-slate-500">نام</dt>
              <dd className="mt-1 font-semibold">{data.user.full_name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">نقش</dt>
              <dd className="mt-1">
                <StatusChip value={data.user.role} />
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">شماره نظام پزشکی</dt>
              <dd className="ltr mt-1">{data.user.medical_council_no || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">محل خدمت</dt>
              <dd className="mt-1">{data.user.facility || '—'}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <PanelHeading title="موتور Ω-Chat" />
          <div className="space-y-3 p-5">
            <div className="flex items-center gap-3">
              <Bot className="text-teal-300" size={21} />
              <div>
                <p className="font-semibold">{data.ai.engine}</p>
                <p className="text-xs text-slate-500">
                  {data.ai.model ? `مدل: ${data.ai.model}` : 'موتور قواعد قطعی آفلاین'}
                </p>
              </div>
            </div>
            <Notice tone="warning">
              تمام اقدام‌های هوش مصنوعی نیازمند بازبینی و تأیید درمانگر هستند.
            </Notice>
            <p className="text-xs text-slate-500">
              {data.ai.action_catalogue.length} نوع اقدام مجاز از سرور دریافت شد.
            </p>
          </div>
        </Card>
        <Card>
          <PanelHeading title="پل SIB" />
          <div className="space-y-3 p-5">
            <div className="flex items-center gap-3">
              <ServerCog className="text-sky-300" size={21} />
              <div>
                <p className="font-semibold">{bridgeValue('adapter')}</p>
                <p className="text-xs text-slate-500">
                  پیکربندی: {bridgeValue('configured_adapter')}
                </p>
              </div>
            </div>
            <dl className="text-sm">
              <div className="flex justify-between py-1">
                <dt className="text-slate-500">صف</dt>
                <dd className="num">{data.queue.counts.queued || 0}</dd>
              </div>
              <div className="flex justify-between py-1">
                <dt className="text-slate-500">ناموفق</dt>
                <dd className="num text-rose-300">{data.queue.counts.failed || 0}</dd>
              </div>
            </dl>
          </div>
        </Card>
      </div>
      <Card>
        <PanelHeading
          title="صف همگام‌سازی SIB"
          subtitle={`Adapter: ${data.queue.adapter}`}
          action={
            <Button tone="primary" onClick={() => void flush()} disabled={busy}>
              <Trash2 size={15} />
              تخلیه صف
            </Button>
          }
        />
        {data.queue.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-right text-sm">
              <thead className="bg-slate-950/40 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3">نوع</th>
                  <th>وضعیت</th>
                  <th>خلاصه</th>
                  <th>تلاش</th>
                  <th>خطا</th>
                  <th className="px-5">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.queue.items.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium">{transaction.kind}</p>
                      <p className="num text-xs text-slate-500">{transaction.id}</p>
                    </td>
                    <td>
                      <StatusChip value={transaction.status} />
                    </td>
                    <td className="max-w-sm text-xs text-slate-400">
                      {transaction.summary.map(String).join(' · ')}
                    </td>
                    <td className="num">{transaction.retry_count}</td>
                    <td className="max-w-xs text-xs text-rose-300">
                      {transaction.error_message || '—'}
                    </td>
                    <td className="px-5">
                      <Button disabled={busy} onClick={() => void retry(transaction.id)}>
                        <RotateCw size={15} />
                        تلاش مجدد
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="صف همگام‌سازی خالی است" />
        )}
      </Card>
      <Card>
        <PanelHeading title="رد حسابرسی" subtitle="۵۰ رویداد اخیر مجاز" />
        {data.audit.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-right text-sm">
              <thead className="bg-slate-950/40 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3">زمان</th>
                  <th>کاربر</th>
                  <th>اقدام</th>
                  <th>موجودیت</th>
                  <th className="px-5">جزئیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.audit.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-5 py-3 text-xs text-slate-400">{entry.at}</td>
                    <td>{entry.actor}</td>
                    <td>
                      <code className="text-xs text-teal-300">{entry.action}</code>
                    </td>
                    <td className="text-slate-400">
                      {entry.entity_type || '—'} {entry.entity_id || ''}
                    </td>
                    <td className="max-w-sm break-all px-5 font-mono text-[10px] text-slate-500">
                      {JSON.stringify(entry.detail)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="رویداد حسابرسی قابل‌نمایش نیست" />
        )}
      </Card>
    </div>
  )
}
