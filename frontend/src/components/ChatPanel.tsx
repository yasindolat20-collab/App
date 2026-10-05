import { useEffect, useRef, useState } from 'react'
import { Bot, Check, ChevronDown, ChevronUp, Send, ShieldAlert, X } from 'lucide-react'
import { api, ApiError } from '../api'
import type { AiAction, AiChatResponse, AiExecuteResponse, PatientSummary } from '../types'
import { Button, Notice, ProvenanceBadge, StatusChip, cx } from './ui'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  response?: AiChatResponse
}
interface ChatPanelProps {
  open: boolean
  onClose: () => void
  patient?: PatientSummary | null
  onNotify: (message: string, tone?: 'success' | 'error') => void
}

export function ChatPanel({ open, onClose, patient, onNotify }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [message, setMessage] = useState('')
  const [sessionId, setSessionId] = useState<string>()
  const [sending, setSending] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [executing, setExecuting] = useState(false)
  const [results, setResults] = useState<AiExecuteResponse>()
  const tail = useRef<HTMLDivElement>(null)

  useEffect(() => {
    tail.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open, results])
  useEffect(() => {
    setResults(undefined)
    setSelected(new Set())
  }, [patient?.id])

  const send = async (): Promise<void> => {
    const clean = message.trim()
    if (!clean || sending) return
    const history = messages.map((entry) => ({ role: entry.role, content: entry.content }))
    setMessage('')
    setSending(true)
    setMessages((items) => [...items, { role: 'user', content: clean }])
    try {
      const response = await api.aiChat({
        message: clean,
        patient_id: patient?.id,
        session_id: sessionId,
        history,
      })
      setSessionId(response.session_id)
      setMessages((items) => [...items, { role: 'assistant', content: response.reply, response }])
      setSelected(new Set(response.draft_plan.actions.map((_, index) => index)))
      setResults(undefined)
    } catch (error) {
      onNotify(
        error instanceof ApiError ? error.message : 'امکان دریافت پاسخ دستیار وجود ندارد',
        'error',
      )
    } finally {
      setSending(false)
    }
  }
  const selectAction = (index: number): void =>
    setSelected((old) => {
      const next = new Set(old)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })
  const execute = async (response: AiChatResponse): Promise<void> => {
    const actions: AiAction[] = response.draft_plan.actions.filter((_, index) =>
      selected.has(index),
    )
    if (!actions.length) {
      onNotify('حداقل یک اقدام را برای اجرا انتخاب کنید.', 'error')
      return
    }
    setExecuting(true)
    try {
      const outcome = await api.aiExecute({
        patient_id: response.patient_id ?? patient?.id,
        session_id: response.session_id,
        actions,
      })
      setResults(outcome)
      onNotify(`${outcome.executed} اقدام با ثبت در حسابرسی اجرا شد.`, 'success')
    } catch (error) {
      onNotify(error instanceof ApiError ? error.message : 'اجرای اقدامات ناموفق بود', 'error')
    } finally {
      setExecuting(false)
    }
  }

  return (
    <aside
      className={cx(
        'no-print fixed inset-y-0 z-40 flex w-full max-w-md flex-col border-slate-700 bg-slate-900 shadow-2xl transition-transform duration-300 sm:w-[28rem]',
        open ? 'end-0 border-s' : '-end-full',
      )}
      dir="rtl"
    >
      <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-400 text-slate-950">
            <Bot size={20} />
          </span>
          <div>
            <h2 className="font-bold">Ω-Chat</h2>
            <p className="text-xs text-slate-400">دستیار تصمیم‌یار بالینی</p>
          </div>
        </div>
        <button
          aria-label="بستن گفتگو"
          onClick={onClose}
          className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
        >
          <X size={19} />
        </button>
      </header>
      {patient ? (
        <div className="border-b border-slate-800 bg-slate-950/40 px-5 py-3 text-sm">
          <span className="text-slate-500">زمینه بیمار: </span>
          <span className="font-semibold">{patient.persian_name || patient.name}</span>
          <span className="mx-2 text-slate-600">•</span>
          <span className="num text-xs text-slate-400">{patient.national_id}</span>
        </div>
      ) : (
        <div className="border-b border-slate-800 bg-slate-950/40 px-5 py-3 text-xs text-slate-400">
          بدون زمینه بیمار — پرسش‌های عمومی یا جست‌وجوی بیمار قابل انجام است.
        </div>
      )}
      <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-4">
        {!messages.length ? (
          <div className="mt-12 text-center">
            <Bot className="mx-auto mb-3 text-teal-400" size={30} />
            <p className="font-medium text-slate-200">برای مرور وضعیت یا ساخت پیشنویس کمک بگیرید</p>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">
              پاسخ‌ها تصمیم‌یار هستند؛ هیچ تغییری تا تأیید شما در پرونده ثبت نمی‌شود.
            </p>
          </div>
        ) : null}
        {messages.map((entry, messageIndex) => (
          <div
            key={`${entry.role}-${messageIndex}`}
            className={
              entry.role === 'user'
                ? 'ms-8 rounded-xl rounded-se-sm bg-teal-400 px-3 py-2.5 text-sm text-slate-950'
                : 'me-3'
            }
          >
            {entry.role === 'user' ? (
              entry.content
            ) : (
              <AssistantResponse
                response={entry.response}
                fallback={entry.content}
                selected={selected}
                onSelect={selectAction}
                onExecute={execute}
                executing={executing}
                results={results}
              />
            )}
          </div>
        ))}
        {sending ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-teal-400" />
            دستیار در حال بررسی است…
          </div>
        ) : null}
        <div ref={tail} />
      </div>
      <div className="border-t border-slate-800 p-4">
        <Notice tone="warning">
          <span className="text-xs leading-5">
            هیچ اقدامی تا زمانی که پزشک پیشنهادها را انتخاب و «تأیید و اجرا» را بزند، ثبت نمی‌شود.
          </span>
        </Notice>
        <div className="mt-3 flex gap-2">
          <textarea
            aria-label="پیام برای Ω-Chat"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void send()
              }
            }}
            placeholder="مثلاً: موارد مراقبت پیشگیرانه را مرور کن"
            rows={2}
            className="min-w-0 flex-1 resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm placeholder:text-slate-600"
          />
          <Button
            tone="primary"
            aria-label="ارسال پیام"
            onClick={() => void send()}
            disabled={sending || !message.trim()}
          >
            <Send size={17} />
          </Button>
        </div>
      </div>
    </aside>
  )
}

function AssistantResponse({
  response,
  fallback,
  selected,
  onSelect,
  onExecute,
  executing,
  results,
}: {
  response?: AiChatResponse
  fallback: string
  selected: Set<number>
  onSelect: (index: number) => void
  onExecute: (response: AiChatResponse) => Promise<void>
  executing: boolean
  results?: AiExecuteResponse
}) {
  const [expanded, setExpanded] = useState(true)
  if (!response)
    return (
      <p className="whitespace-pre-wrap rounded-xl rounded-es-sm bg-slate-800 p-3 text-sm leading-6 text-slate-200">
        {fallback}
      </p>
    )
  return (
    <div className="space-y-3">
      <div className="rounded-xl rounded-es-sm bg-slate-800 p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <StatusChip value={response.intent} />
          <StatusChip value={response.engine} />
          <ProvenanceBadge provenance={response.provenance} />
        </div>
        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{response.reply}</p>
      </div>
      {response.evidence.length ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <p className="mb-2 text-xs font-bold text-slate-400">شواهد و زمینه</p>
          <ul className="space-y-2">
            {response.evidence.map((item, index) => (
              <li key={`${item.label}-${index}`} className="text-xs text-slate-300">
                <span className="font-semibold">{item.label || 'شاهد'}</span>
                {item.detail ? <span className="text-slate-500"> — {item.detail}</span> : null}
                {item.provenance ? (
                  <ProvenanceBadge className="ms-2" provenance={item.provenance} />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {response.draft_plan.actions.length ? (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5">
          <button
            onClick={() => setExpanded((value) => !value)}
            className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold text-amber-100"
          >
            پیش‌نویس اقدام ({response.draft_plan.actions.length}){' '}
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {expanded ? (
            <div className="space-y-2 border-t border-amber-500/20 p-3">
              <p className="text-xs text-amber-100/80">{response.draft_plan.summary}</p>
              {response.draft_plan.actions.map((action, index) => (
                <label
                  key={`${action.type}-${index}`}
                  className="flex cursor-pointer gap-3 rounded-lg border border-slate-700 bg-slate-900 p-3"
                >
                  <input
                    aria-label={`انتخاب ${action.type}`}
                    type="checkbox"
                    checked={selected.has(index)}
                    onChange={() => onSelect(index)}
                    className="mt-1 accent-teal-400"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <code className="text-xs text-teal-300">{action.type}</code>
                      <ProvenanceBadge provenance={action.provenance} />
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-300">
                      {action.description}
                    </span>
                    <span className="mt-2 block space-y-1 rounded-md border border-slate-800 bg-slate-950/60 p-2">
                      {Object.entries(action.params ?? {})
                        .filter(([, value]) => value !== null && value !== '')
                        .map(([key, value]) => (
                          <span key={key} className="flex gap-2 text-[10px] leading-4">
                            <code className="shrink-0 text-slate-500">{key}</code>
                            <span className="min-w-0 break-words text-slate-300">
                              {Array.isArray(value)
                                ? value.map((item) => String(item)).join(' · ')
                                : typeof value === 'object' && value !== null
                                  ? JSON.stringify(value)
                                  : String(value)}
                            </span>
                          </span>
                        ))}
                    </span>
                  </span>
                </label>
              ))}
              <Button
                tone="primary"
                className="w-full"
                onClick={() => void onExecute(response)}
                disabled={executing}
              >
                <Check size={16} />
                {executing ? 'در حال اجرا…' : 'تأیید و اجرا'}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      {results ? (
        <div className="rounded-lg border border-teal-500/25 bg-teal-500/5 p-3">
          <p className="text-xs font-bold text-teal-200">
            نتیجه اجرا · شناسه حسابرسی <span className="num">{results.audit_id ?? '—'}</span>
          </p>
          {results.results.map((result, index) => (
            <p key={`${result.type}-${index}`} className="mt-2 text-xs text-slate-300">
              <span className={result.ok ? 'text-emerald-300' : 'text-rose-300'}>
                {result.ok ? '✓' : '×'}
              </span>{' '}
              {result.type || 'اقدام'}: {result.message || 'بدون پیام'}
            </p>
          ))}
        </div>
      ) : null}
      {response.requires_confirmation ? (
        <div className="flex items-center gap-1 text-[11px] text-amber-300">
          <ShieldAlert size={13} />
          نیازمند بازبینی و تأیید بالینی
        </div>
      ) : null}
    </div>
  )
}
