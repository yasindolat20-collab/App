import { useEffect, useState } from 'react'
import {
  BarChart3,
  Bot,
  Home,
  Languages,
  LogOut,
  Menu,
  MessageSquareText,
  Send,
  Settings,
  Stethoscope,
  Syringe,
  Users,
  X,
} from 'lucide-react'
import { api, clearToken, getToken, setUnauthorizedHandler } from './api'
import { ChatPanel } from './components/ChatPanel'
import { LoginScreen } from './components/LoginScreen'
import { PatientChart } from './components/PatientChart'
import { Button, cx } from './components/ui'
import { screenLabel, t } from './i18n'
import {
  HomeScreen,
  PatientsScreen,
  ReferralsScreen,
  ReportsScreen,
  ServicesScreen,
  SettingsScreen,
  VisitsScreen,
} from './components/screens'
import type { Language, PatientSummary, Screen, User } from './types'

type Toast = { message: string; tone: 'success' | 'error' } | null
const navItems: { screen: Screen; icon: typeof Home }[] = [
  { screen: 'home', icon: Home },
  { screen: 'patients', icon: Users },
  { screen: 'visits', icon: Stethoscope },
  { screen: 'services', icon: Syringe },
  { screen: 'referrals', icon: Send },
  { screen: 'reports', icon: BarChart3 },
  { screen: 'settings', icon: Settings },
]

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [screen, setScreen] = useState<Screen>('home')
  const [language, setLanguage] = useState<Language>('fa')
  const [chatOpen, setChatOpen] = useState(false)
  const [chatPatient, setChatPatient] = useState<PatientSummary | null>(null)
  const [toast, setToast] = useState<Toast>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [workflowPatient, setWorkflowPatient] = useState<PatientSummary | null>(null)
  const notify = (message: string, tone: 'success' | 'error' = 'success'): void => {
    setToast({ message, tone })
    window.setTimeout(() => setToast(null), 4500)
  }

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr'
  }, [language])
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      setSelectedPatientId(null)
      notify('نشست شما منقضی شده است؛ دوباره وارد شوید.', 'error')
    })
    if (getToken())
      void api
        .me()
        .then(setUser)
        .catch(() => undefined)
    return () => setUnauthorizedHandler(null)
  }, [])

  const navigate = (destination: Screen): void => {
    setScreen(destination)
    setSelectedPatientId(null)
    setSidebarOpen(false)
  }
  const startWorkflow = (
    destination: 'visits' | 'referrals' | 'services',
    patient: PatientSummary,
  ): void => {
    setWorkflowPatient(patient)
    navigate(destination)
  }
  const openChat = (patient?: PatientSummary | null): void => {
    setChatPatient(patient ?? null)
    setChatOpen(true)
  }
  const logout = (): void => {
    clearToken()
    setUser(null)
    setSelectedPatientId(null)
    setChatOpen(false)
  }

  if (!user)
    return (
      <LoginScreen
        onLogin={(loggedIn) => {
          setUser(loggedIn)
          setScreen('home')
        }}
      />
    )
  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100"
      dir={language === 'fa' ? 'rtl' : 'ltr'}
    >
      <div className="flex min-h-screen">
        <Sidebar
          user={user}
          screen={screen}
          language={language}
          open={sidebarOpen}
          onNavigate={navigate}
          onLogout={logout}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="min-w-0 flex-1">
          <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 backdrop-blur lg:px-7">
            <div className="flex items-center gap-3">
              <button
                aria-label="باز کردن منو"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={21} />
              </button>
              <div>
                <p className="text-xs text-slate-500">{t(language, 'clinicalWorkspace')}</p>
                <h1 className="text-sm font-bold">{screenLabel(language, screen)}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLanguage((current) => (current === 'fa' ? 'en' : 'fa'))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-2 text-xs font-semibold text-slate-300 hover:border-teal-500/40"
              >
                <Languages size={15} />
                {language === 'fa' ? 'EN' : 'فا'}
              </button>
              <button
                onClick={() => openChat(chatPatient)}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-400 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-teal-300"
              >
                <MessageSquareText size={17} />
                <span className="hidden sm:inline">Ω-Chat</span>
              </button>
            </div>
          </header>
          <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-7">
            {selectedPatientId ? (
              <PatientChart
                patientId={selectedPatientId}
                onBack={() => setSelectedPatientId(null)}
                onOpenVisit={(patient) => startWorkflow('visits', patient)}
                onOpenReferral={(patient) => startWorkflow('referrals', patient)}
                onOpenService={(patient) => startWorkflow('services', patient)}
                onOpenChat={openChat}
                onNotify={notify}
              />
            ) : (
              <Workspace
                screen={screen}
                workflowPatient={workflowPatient}
                clearWorkflow={() => setWorkflowPatient(null)}
                onOpenPatient={setSelectedPatientId}
                onNavigate={navigate}
                onOpenChat={openChat}
                onNotify={notify}
              />
            )}
          </div>
        </main>
      </div>
      <ChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        patient={chatPatient}
        onNotify={notify}
      />
      {toast ? (
        <div
          role="status"
          className={cx(
            'no-print fixed bottom-5 start-5 z-[60] max-w-sm rounded-xl border px-4 py-3 text-sm shadow-xl',
            toast.tone === 'success'
              ? 'border-emerald-500/30 bg-emerald-950 text-emerald-100'
              : 'border-rose-500/30 bg-rose-950 text-rose-100',
          )}
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  )
}

function Workspace({
  screen,
  workflowPatient,
  clearWorkflow,
  onOpenPatient,
  onNavigate,
  onOpenChat,
  onNotify,
}: {
  screen: Screen
  workflowPatient: PatientSummary | null
  clearWorkflow: () => void
  onOpenPatient: (id: string) => void
  onNavigate: (screen: Screen) => void
  onOpenChat: (patient?: PatientSummary | null) => void
  onNotify: (message: string, tone?: 'success' | 'error') => void
}) {
  if (screen === 'home')
    return <HomeScreen onNavigate={onNavigate} onOpenChat={() => onOpenChat()} />
  if (screen === 'patients')
    return <PatientsScreen onOpenPatient={onOpenPatient} onNotify={onNotify} />
  if (screen === 'visits')
    return (
      <VisitsScreen
        initialPatient={workflowPatient}
        onClearInitial={clearWorkflow}
        onNotify={onNotify}
      />
    )
  if (screen === 'services')
    return (
      <ServicesScreen
        initialPatient={workflowPatient}
        onClearInitial={clearWorkflow}
        onNotify={onNotify}
      />
    )
  if (screen === 'referrals')
    return (
      <ReferralsScreen
        initialPatient={workflowPatient}
        onClearInitial={clearWorkflow}
        onNotify={onNotify}
      />
    )
  if (screen === 'reports') return <ReportsScreen onOpenPatient={onOpenPatient} />
  return <SettingsScreen onNotify={onNotify} />
}

function Sidebar({
  user,
  screen,
  language,
  open,
  onNavigate,
  onLogout,
  onClose,
}: {
  user: User
  screen: Screen
  language: Language
  open: boolean
  onNavigate: (screen: Screen) => void
  onLogout: () => void
  onClose: () => void
}) {
  return (
    <>
      <div
        className={cx('fixed inset-0 z-40 bg-slate-950/70 lg:hidden', open ? 'block' : 'hidden')}
        onClick={onClose}
      />
      <aside
        className={cx(
          'no-print fixed inset-y-0 z-50 flex w-72 flex-col border-slate-800 bg-slate-900 transition-transform lg:static lg:translate-x-0',
          language === 'fa' ? 'right-0 border-s' : 'left-0 border-e',
          open ? 'translate-x-0' : language === 'fa' ? 'translate-x-full' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-400 font-bold text-slate-950">
              Ω
            </span>
            <div>
              <p className="font-bold">Ω-SIB</p>
              <p className="text-[10px] text-slate-500">Integrated Health System</p>
            </div>
          </div>
          <button
            aria-label="بستن منو"
            className="rounded p-1 text-slate-500 hover:bg-slate-800 lg:hidden"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ screen: key, icon: Icon }) => (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className={cx(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-right text-sm font-semibold transition-colors',
                screen === key
                  ? 'bg-teal-400 text-slate-950'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
              )}
            >
              <Icon size={18} />
              {screenLabel(language, key)}
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-3">
          <div className="mb-3 rounded-lg bg-slate-950/50 p-3">
            <p className="truncate text-sm font-semibold">{user.full_name}</p>
            <p className="mt-1 truncate text-xs text-slate-500">
              {user.role} · {user.facility || 'Ω-SIB'}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"
          >
            <LogOut size={18} />
            {t(language, 'logout')}
          </button>
        </div>
      </aside>
    </>
  )
}
