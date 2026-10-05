import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Database, Info, Sparkles, X } from 'lucide-react'
import type { Provenance, ProvenanceLabel } from '../types'

export const cx = (...values: Array<string | false | null | undefined>): string =>
  values.filter(Boolean).join(' ')

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'primary' | 'secondary' | 'danger' | 'ghost'
  children: ReactNode
}
export function Button({
  tone = 'secondary',
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const tones = {
    primary: 'bg-teal-400 text-slate-950 hover:bg-teal-300 border-teal-300',
    secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700 border-slate-700',
    danger: 'bg-rose-500/90 text-white hover:bg-rose-500 border-rose-400/50',
    ghost: 'bg-transparent text-slate-300 hover:bg-slate-800 border-transparent',
  }
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300',
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cx(
        'rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm shadow-black/20',
        className,
      )}
    >
      {children}
    </section>
  )
}
export function PanelHeading({
  title,
  action,
  subtitle,
}: {
  title: string
  action?: ReactNode
  subtitle?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
      <div>
        <h2 className="font-semibold text-slate-100">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}

const statuses: Record<string, string> = {
  UP_TO_DATE: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  DUE: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  OVERDUE: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  NOT_APPLICABLE: 'border-slate-600 bg-slate-700/40 text-slate-300',
  DRAFT: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  COMMITTED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  SYNCED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  FAILED: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  QUEUED: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  SYNCING: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  SENT: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  ACCEPTED: 'border-teal-500/30 bg-teal-500/10 text-teal-300',
  COMPLETED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  REJECTED: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  REQUESTED: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  SCHEDULED: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  RESULTED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  CANCELLED: 'border-slate-600 bg-slate-700/40 text-slate-300',
  EMERGENCY: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  URGENT: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  ROUTINE: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  HIGH: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  WARNING: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  INFO: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
}
export function StatusChip({
  value,
  className,
}: {
  value: string | null | undefined
  className?: string
}) {
  const safe = value || '—'
  return (
    <span
      className={cx(
        'inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-wide',
        statuses[safe] ?? 'border-slate-600 bg-slate-800 text-slate-300',
        className,
      )}
    >
      {safe.replaceAll('_', ' ')}
    </span>
  )
}

function labelOf(value: Provenance | ProvenanceLabel | undefined): ProvenanceLabel {
  if (typeof value === 'string') return value
  const raw = value?.type ?? value?.label
  return raw === 'FACT' || raw === 'INFERENCE' || raw === 'SUGGESTION' || raw === 'UNKNOWN'
    ? raw
    : 'UNKNOWN'
}
export function ProvenanceBadge({
  provenance,
  className,
}: {
  provenance: Provenance | ProvenanceLabel | undefined
  className?: string
}) {
  const label = labelOf(provenance)
  const styles: Record<ProvenanceLabel, string> = {
    FACT: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    INFERENCE: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    SUGGESTION: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    UNKNOWN: 'border-slate-600 bg-slate-700/40 text-slate-300',
  }
  const details =
    typeof provenance === 'object'
      ? [
          provenance.sourceSystem,
          provenance.sourceText,
          provenance.confidence !== undefined
            ? `${Math.round(provenance.confidence * 100)}%`
            : undefined,
        ]
          .filter(Boolean)
          .join(' · ')
      : ''
  return (
    <span
      title={details || label}
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold',
        styles[label],
        className,
      )}
    >
      <Sparkles size={11} aria-hidden />
      {label}
    </span>
  )
}

export function LoadingState({ label = 'در حال بارگذاری…' }: { label?: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-400">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-teal-400" />
      {label}
    </div>
  )
}
export function EmptyState({
  title = 'موردی برای نمایش وجود ندارد',
  detail,
}: {
  title?: string
  detail?: string
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center p-8 text-center">
      <Database className="mb-3 text-slate-600" size={28} />
      <p className="font-medium text-slate-300">{title}</p>
      {detail ? <p className="mt-1 max-w-md text-sm text-slate-500">{detail}</p> : null}
    </div>
  )
}
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div
      role="alert"
      className="m-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 shrink-0" size={17} />
        <div>
          <p className="font-semibold">خطا در دریافت اطلاعات</p>
          <p className="mt-1 text-rose-200/80">{message}</p>
          {retry ? (
            <Button className="mt-3" onClick={retry}>
              تلاش مجدد
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function Modal({
  title,
  children,
  onClose,
  className,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  className?: string
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
    >
      <div
        className={cx(
          'max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl',
          className,
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-4">
          <h2 className="font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="بستن"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Notice({
  children,
  tone = 'info',
}: {
  children: ReactNode
  tone?: 'info' | 'success' | 'warning'
}) {
  const config = {
    info: { icon: Info, style: 'border-sky-500/30 bg-sky-500/10 text-sky-100' },
    success: {
      icon: CheckCircle2,
      style: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
    },
    warning: { icon: AlertCircle, style: 'border-amber-500/30 bg-amber-500/10 text-amber-100' },
  }[tone]
  const Icon = config.icon
  return (
    <div className={cx('flex items-start gap-2 rounded-lg border p-3 text-sm', config.style)}>
      <Icon className="mt-0.5 shrink-0" size={16} />
      {children}
    </div>
  )
}

export function Input({
  label,
  id,
  hint,
  className,
  ...props
}: { label: string; id: string; hint?: string } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'className'
> & { className?: string }) {
  return (
    <label htmlFor={id} className={cx('block text-sm text-slate-300', className)}>
      <span className="mb-1.5 block font-medium">{label}</span>
      <input
        id={id}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 placeholder:text-slate-600"
        {...props}
      />
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  )
}
export function Select({
  label,
  id,
  children,
  className,
  ...props
}: { label: string; id: string; children: ReactNode } & Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'className'
> & { className?: string }) {
  return (
    <label htmlFor={id} className={cx('block text-sm text-slate-300', className)}>
      <span className="mb-1.5 block font-medium">{label}</span>
      <select
        id={id}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100"
        {...props}
      >
        {children}
      </select>
    </label>
  )
}
export function Textarea({
  label,
  id,
  className,
  ...props
}: { label: string; id: string } & Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'className'
> & { className?: string }) {
  return (
    <label htmlFor={id} className={cx('block text-sm text-slate-300', className)}>
      <span className="mb-1.5 block font-medium">{label}</span>
      <textarea
        id={id}
        className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 placeholder:text-slate-600"
        {...props}
      />
    </label>
  )
}
