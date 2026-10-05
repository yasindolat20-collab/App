import { useState } from 'react'
import { Activity, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react'
import { api, ApiError } from '../api'
import type { User } from '../types'
import { Button, Input, Notice } from './ui'

export function LoginScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await api.login(username, password)
      localStorage.setItem('omega_sib_token', result.access_token)
      onLogin(result.user)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'ورود به سامانه ناموفق بود')
    } finally {
      setLoading(false)
    }
  }
  const fill = (user: string, pass: string): void => {
    setUsername(user)
    setPassword(pass)
    setError('')
  }
  return (
    <main
      className="relative grid min-h-screen overflow-hidden bg-slate-950 lg:grid-cols-2"
      dir="rtl"
    >
      <div className="absolute -end-48 -top-48 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />
      <div className="absolute -bottom-60 start-1/4 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
      <section className="relative flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-teal-400 text-2xl font-bold text-slate-950 shadow-lg shadow-teal-400/20">
              Ω
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Ω-SIB</h1>
              <p className="mt-1 text-sm text-slate-400">سامانه یکپارچه بهداشت</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/25">
            <div className="mb-6">
              <h2 className="text-xl font-bold">ورود به فضای کار بالینی</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                با حساب کاربری خود وارد شوید. دسترسی‌ها بر پایه نقش حرفه‌ای شما اعمال می‌شود.
              </p>
            </div>
            {error ? (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200"
              >
                {error}
              </div>
            ) : null}
            <form onSubmit={(event) => void submit(event)} className="space-y-4">
              <Input
                label="نام کاربری"
                id="username"
                autoComplete="username"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="مثلاً dr.alavi"
              />
              <div className="relative">
                <Input
                  label="گذرواژه"
                  id="password"
                  autoComplete="current-password"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="گذرواژه"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'پنهان کردن گذرواژه' : 'نمایش گذرواژه'}
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute end-3 top-9 rounded p-1 text-slate-500 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <Button type="submit" tone="primary" className="w-full py-3" disabled={loading}>
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-slate-950" />
                ) : (
                  <LockKeyhole size={17} />
                )}
                {loading ? 'در حال ورود…' : 'ورود امن'}
              </Button>
            </form>
            <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck size={15} className="text-emerald-400" />
              نشست شما با توکن دسترسی محافظت می‌شود.
            </div>
          </div>
        </div>
      </section>
      <section className="relative hidden border-e border-slate-800 bg-slate-900/35 p-10 lg:flex lg:flex-col lg:justify-center">
        <div className="max-w-xl">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-1 text-sm text-teal-200">
            <Activity size={16} />
            پایگاه کار خانواده و سلامت جامعه
          </div>
          <h2 className="text-4xl font-bold leading-tight">
            ثبت دقیق، تصمیم‌گیری آرام، مراقبت پیوسته.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-8 text-slate-400">
            Ω-SIB جریان کاری سامانه سیب را برای پزشک خانواده، بهورز و ماما با مراقبت پیشگیرانه، صف
            همگام‌سازی و دستیار بالینی گرد هم می‌آورد.
          </p>
          <div className="mt-10 rounded-xl border border-slate-700 bg-slate-950/40 p-5">
            <div className="flex items-center gap-2">
              <UserRound className="text-teal-400" size={18} />
              <h3 className="font-semibold">حساب‌های نمایشی محلی</h3>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              فقط برای داده‌های seed محلی؛ در محیط عملیاتی حذف یا تغییر داده شوند.
            </p>
            <div className="mt-4 space-y-2">
              <DemoCredential label="مدیر" username="admin" password="admin123" onClick={fill} />
              <DemoCredential
                label="پزشک خانواده · PIN بالینی 2468"
                username="dr.alavi"
                password="doctor123"
                onClick={fill}
              />
              <DemoCredential
                label="بهورز"
                username="behvarz.karimi"
                password="behvarz123"
                onClick={fill}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
function DemoCredential({
  label,
  username,
  password,
  onClick,
}: {
  label: string
  username: string
  password: string
  onClick: (username: string, password: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(username, password)}
      className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-right transition-colors hover:border-teal-500/40 hover:bg-slate-800"
    >
      <span className="text-xs text-slate-300">{label}</span>
      <code className="ltr text-xs text-teal-300">
        {username} / {password}
      </code>
    </button>
  )
}
