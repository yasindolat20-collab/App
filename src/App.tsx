/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MOCK_PATIENTS } from './data/mockPatients';
import { Patient, ConnectivityStatus, CurrentVisitDraft, QueuedSibTransaction } from './types/sib';
import { PatientSearch } from './components/PatientSearch';
import { PatientBanner } from './components/PatientBanner';
import { LongitudinalTimeline } from './components/LongitudinalTimeline';
import { DataQualityAuditor } from './components/DataQualityAuditor';
import { CurrentVisitForm } from './components/CurrentVisitForm';
import { SibBridgeInspector } from './components/SibBridgeInspector';
import { SibCommitModal } from './components/SibCommitModal';
import { SyncQueueDrawer } from './components/SyncQueueDrawer';
import { IraPenModal } from './components/IraPenModal';
import { SibReferralSlipModal } from './components/SibReferralSlipModal';
import { FamilyPhysicianGuidelinesView } from './components/FamilyPhysicianGuidelinesView';
import { GuidedTourModal } from './components/GuidedTourModal';
import { SibClinicalAgent } from './components/SibClinicalAgent';
import { ExecutiveHealthGoals } from './components/ExecutiveHealthGoals';
import { Header, MainTabType } from './components/Header';
import {
  getQueuedTransactions,
  enqueueSibTransaction,
} from './services/syncQueueService';
import {
  Database,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Send,
  Sparkles,
  Wifi,
  WifiOff,
  RefreshCw,
  Globe,
  FileText,
  HeartPulse,
} from 'lucide-react';

export default function App() {
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(MOCK_PATIENTS[0].id);
  const [currentTab, setCurrentTab] = useState<MainTabType>('executive-goals');
  const [connectivity, setConnectivity] = useState<ConnectivityStatus>('ONLINE');
  const [isFarsi, setIsFarsi] = useState<boolean>(true); // default to authentic Persian for SIB

  // Sync buffer
  const [transactions, setTransactions] = useState<QueuedSibTransaction[]>([]);
  const [isSyncDrawerOpen, setIsSyncDrawerOpen] = useState(false);

  // Commit and IraPEN modals
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
  const [isIraPenModalOpen, setIsIraPenModalOpen] = useState(false);
  const [isRawSibOpen, setIsRawSibOpen] = useState(false);
  const [isReferralSlipOpen, setIsReferralSlipOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [doctorAdmissionGranted, setDoctorAdmissionGranted] = useState(true); // Doctor authorized

  // Active patient
  const activePatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  // Visit draft per patient
  const [visitDraft, setVisitDraft] = useState<CurrentVisitDraft>({
    patientId: activePatient.id,
    chiefComplaint: '',
    subjectiveNotes: '',
    bloodPressureSys: String(activePatient.vitalsHistory[0]?.bloodPressureSys || ''),
    bloodPressureDia: String(activePatient.vitalsHistory[0]?.bloodPressureDia || ''),
    heartRate: String(activePatient.vitalsHistory[0]?.heartRate || '76'),
    weightKg: String(activePatient.vitalsHistory[0]?.weightKg || ''),
    bloodGlucose: String(activePatient.vitalsHistory[0]?.fastingBloodSugar || ''),
    physicalFindings: '',
    diagnoses: activePatient.chronicConditions.map((c) => `${c.name} (${c.persianName})`),
    newPrescriptions: [],
    labOrders: [],
    referralRequested: false,
    referralTarget: '',
    acceptedSuggestions: [],
    resolvedQualityIssueIds: [],
  });

  // Re-sync draft when patient changes
  useEffect(() => {
    setVisitDraft({
      patientId: activePatient.id,
      chiefComplaint: '',
      subjectiveNotes: '',
      bloodPressureSys: String(activePatient.vitalsHistory[0]?.bloodPressureSys || ''),
      bloodPressureDia: String(activePatient.vitalsHistory[0]?.bloodPressureDia || ''),
      heartRate: String(activePatient.vitalsHistory[0]?.heartRate || '76'),
      weightKg: String(activePatient.vitalsHistory[0]?.weightKg || ''),
      bloodGlucose: String(activePatient.vitalsHistory[0]?.fastingBloodSugar || ''),
      physicalFindings: '',
      diagnoses: activePatient.chronicConditions.map((c) => `${c.name} (${c.persianName})`),
      newPrescriptions: [],
      labOrders: [],
      referralRequested: false,
      referralTarget: '',
      acceptedSuggestions: [],
      resolvedQualityIssueIds: [],
    });
  }, [selectedPatientId]);

  // Load sync queue on mount
  useEffect(() => {
    setTransactions(getQueuedTransactions());
  }, []);

  const handleTransactionsUpdated = () => {
    setTransactions(getQueuedTransactions());
  };

  const handleResolveQualityIssue = (issueId: string) => {
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== selectedPatientId) return p;
        return {
          ...p,
          dataQualityIssues: p.dataQualityIssues.map((issue) =>
            issue.id === issueId ? { ...issue, resolved: true } : issue
          ),
        };
      })
    );
    setVisitDraft((prev) => ({
      ...prev,
      resolvedQualityIssueIds: [...prev.resolvedQualityIssueIds, issueId],
    }));
  };

  const handleToggleSuggestion = (sugId: string, accepted: boolean) => {
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== selectedPatientId) return p;
        return {
          ...p,
          suggestions: p.suggestions.map((sug) => {
            if (sug.id !== sugId) return sug;
            return {
              ...sug,
              accepted: accepted,
              rejected: !accepted,
            };
          }),
        };
      })
    );

    const suggestion = activePatient.suggestions.find((s) => s.id === sugId);
    if (accepted && suggestion && suggestion.draftValue) {
      if (suggestion.actionType === 'LAB_ORDER') {
        setVisitDraft((prev) => ({
          ...prev,
          labOrders: Array.from(new Set([...prev.labOrders, suggestion.draftValue!])),
          acceptedSuggestions: Array.from(new Set([...prev.acceptedSuggestions, sugId])),
        }));
      } else if (suggestion.actionType === 'MEDICATION_ADJUSTMENT') {
        setVisitDraft((prev) => ({
          ...prev,
          newPrescriptions: Array.from(new Set([...prev.newPrescriptions, suggestion.draftValue!])),
          acceptedSuggestions: Array.from(new Set([...prev.acceptedSuggestions, sugId])),
        }));
      } else if (suggestion.actionType === 'REFERRAL') {
        setVisitDraft((prev) => ({
          ...prev,
          referralRequested: true,
          referralTarget: suggestion.draftValue!,
          acceptedSuggestions: Array.from(new Set([...prev.acceptedSuggestions, sugId])),
        }));
      }
    }
  };

  const handleApplyIraPenScore = (score: {
    percentage: number;
    colorCategory: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  }) => {
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== selectedPatientId) return p;
        return {
          ...p,
          irapenRiskScore: {
            percentage: score.percentage,
            colorCategory: score.colorCategory,
            calculatedDateJalali: '1405/07/14 (Today)',
            nextAssessmentDueJalali: '1406/07/14',
          },
        };
      })
    );
  };

  // Final commit to SIB
  const handleConfirmCommit = (pin: string) => {
    const changesSummary: string[] = [
      `Encounter logged: ${visitDraft.chiefComplaint || 'Consultation follow-up'}`,
      `Vitals: BP ${visitDraft.bloodPressureSys}/${visitDraft.bloodPressureDia} mmHg, FBS ${visitDraft.bloodGlucose || 'N/A'} mg/dL`,
    ];
    if (visitDraft.labOrders.length > 0) {
      changesSummary.push(`Ordered ${visitDraft.labOrders.length} paraclinical test(s) in SIB lab subform`);
    }
    if (visitDraft.newPrescriptions.length > 0) {
      changesSummary.push(`Prescribed ${visitDraft.newPrescriptions.length} medication(s) via electronic Rx`);
    }
    if (visitDraft.referralRequested) {
      changesSummary.push(`SIB Level 2 Referral to ${visitDraft.referralTarget}`);
    }

    const payload = {
      cod_meli: activePatient.nationalId,
      parvandeh_khanewadeh: activePatient.householdNumber,
      pin_nezam_pezeshki: pin,
      draft: visitDraft,
    };

    enqueueSibTransaction(
      activePatient.id,
      activePatient.name,
      activePatient.nationalId,
      changesSummary,
      payload,
      'Dr. N. Alavi (نظام پزشکی: 74892)',
      true,
      connectivity === 'ONLINE'
    );

    handleTransactionsUpdated();
    setIsCommitModalOpen(false);

    // Give visual feedback
    alert(
      isFarsi
        ? connectivity === 'ONLINE'
          ? '✓ اطلاعات با موفقیت در سامانه سیب ثبت و پرونده بیمار به‌روزرسانی شد.'
          : '✓ ارتباط با سرور سیب برقرار نبود؛ تغییرات به صورت امن در بافر محلی ذخیره و در صف ارسال قرار گرفت.'
        : connectivity === 'ONLINE'
        ? '✓ Records successfully committed and synchronized with official SIB database.'
        : '✓ Link unavailable; encounter staged safely in local offline buffer queue.'
    );
  };

  const queuedCount = transactions.filter((t) => t.status === 'QUEUED').length;

  return (
    <div
      dir={isFarsi ? 'rtl' : 'ltr'}
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-20 selection:bg-teal-500/20 selection:text-teal-200 ${
        isFarsi ? 'text-right' : 'text-left'
      }`}
    >
      {/* Primary Top Bar */}
      <Header
        currentTab={currentTab}
        onSelectTab={(t) => setCurrentTab(t)}
        connectivity={connectivity}
        onChangeConnectivity={(c) => setConnectivity(c)}
        queuedCount={queuedCount}
        onOpenSyncDrawer={() => setIsSyncDrawerOpen(true)}
      />

      {/* Language & SIB Context Banner Strip */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-6 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-teal-400" />
          <span>
            {isFarsi
              ? 'لایه هوشمند عملیاتی Ω-SIB متصل به سامانه یکپارچه بهداشت (SIB) — وزارت بهداشت، درمان و آموزش پزشکی'
              : 'Ω-SIB Intelligent Operational Layer — Ministry of Health Integrated Health System (SIB)'}
          </span>
          {doctorAdmissionGranted && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>
                {isFarsi
                  ? 'پزشک معالج: ورود مجاز و اختیار ثبت قطعی فعال است'
                  : 'Attending Physician: Session Authorized for Entry & SIB Commit'}
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Guided Tour Modal Trigger */}
          <button
            onClick={() => setIsTourOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-teal-950/80 hover:bg-teal-900 border border-teal-500/40 text-teal-300 text-[11px] font-semibold transition-colors"
          >
            <Sparkles className="w-3 h-3 text-teal-400" />
            <span>{isFarsi ? 'تور معرفی معماری سامانه' : 'System Concept Tour'}</span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setIsFarsi(!isFarsi)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors border border-slate-700"
          >
            <Globe className="w-3 h-3 text-teal-400" />
            <span>{isFarsi ? 'English Mode' : 'نمای فارسی (RTL)'}</span>
          </button>

          {/* SIB Bridge button */}
          <button
            onClick={() => setCurrentTab('bridge-view')}
            className="text-[11px] text-teal-400 hover:text-teal-300 underline font-medium"
          >
            {isFarsi ? 'مشاهده پل معماری سیب' : 'View SIB Bridge'}
          </button>
        </div>
      </div>

      {/* Tab 0: Executive Health Goals & Live Observatory */}
      {currentTab === 'executive-goals' && (
        <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6">
          <ExecutiveHealthGoals
            isFarsi={isFarsi}
            onSelectQuickAction={(actionType) => {
              if (actionType === 'QUICK_REFERRAL') {
                setIsReferralSlipOpen(true);
              } else if (actionType === 'IRAPEN_TOOL') {
                setIsIraPenModalOpen(true);
              } else if (actionType === 'DATA_CLEANSER') {
                setCurrentTab('command-center');
              }
            }}
          />
        </main>
      )}

      {/* Tab 1: Patient Command Center (The Main Interaction) */}
      {currentTab === 'command-center' && (
        <div className="flex-1 flex flex-col">
          {/* Patient Quick Search and Switcher Carousel */}
          <PatientSearch
            patients={patients}
            selectedPatientId={selectedPatientId}
            onSelectPatient={(p) => setSelectedPatientId(p.id)}
          />

          {/* Persistent Patient Identity & SIB Household Banner */}
          <PatientBanner
            patient={activePatient}
            onOpenSibRecord={() => setIsRawSibOpen(true)}
          />

          {/* Main 2-Column Clinical Cockpit */}
          <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left / Main Column (6 cols): Patient Identity, Current Visit, Problems, Timeline */}
              <div className="lg:col-span-6 space-y-5">
                {/* 1. Current Clinical Visit Workspace */}
                <CurrentVisitForm
                  patient={activePatient}
                  draft={visitDraft}
                  onChangeDraft={setVisitDraft}
                  onInitiateReview={() => setIsCommitModalOpen(true)}
                  onOpenReferralSlip={() => setIsReferralSlipOpen(true)}
                  isFarsi={isFarsi}
                />

                {/* 2. Longitudinal Timeline & Trends (SIB History) with Expandable Medication History */}
                <LongitudinalTimeline
                  patient={activePatient}
                  onRenewMedication={(name, dosage, freq) => {
                    const rxString = `${name} (${dosage}) - ${freq}`;
                    setVisitDraft((prev) => ({
                      ...prev,
                      newPrescriptions: Array.from(new Set([...prev.newPrescriptions, rxString])),
                    }));
                    alert(
                      isFarsi
                        ? `✓ داروی "${name}" به نسخه ویزیت امروز اضافه شد.`
                        : `✓ Medication "${name}" staged into today's visit prescription list.`
                    );
                  }}
                />
              </div>

              {/* Right Column (6 cols): Clinical Copilot Agent & Integrity Tools */}
              <div className="lg:col-span-6 space-y-5">
                {/* 1. THE CLINICAL COPILOT AGENT (Sitting right alongside the physician) */}
                <SibClinicalAgent
                  patient={activePatient}
                  draft={visitDraft}
                  onApplyDraftChanges={(updated) => setVisitDraft((prev) => ({ ...prev, ...updated }))}
                  isFarsi={isFarsi}
                />

                {/* 2. IraPEN CVD Risk Card with 1-Click Protocol Tool */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-rose-400" />
                      <h3 className="text-xs font-semibold text-white">
                        {isFarsi
                          ? 'بسته خطرسنجی ۱۰ ساله بیماری‌های قلبی عروقی (ایراپن)'
                          : 'IraPEN Cardiovascular 10-Yr Risk Module'}
                      </h3>
                    </div>

                    <button
                      onClick={() => setIsIraPenModalOpen(true)}
                      className="px-2.5 py-1 text-[11px] font-medium text-teal-300 bg-teal-950/60 hover:bg-teal-900 border border-teal-500/30 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-teal-400" />
                      <span>{isFarsi ? 'محاسبه مجدد ایراپن' : 'Recalculate'}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {isFarsi
                      ? 'پروتکل کشوری ایراپن در مراکز بهداشتی روستایی نیازمند بازسنجی سالیانه برای افراد بالای ۴۰ سال یا مبتلا به دیابت/فشار خون است.'
                      : 'National IraPEN protocol requires annual risk stratifying for adults ≥40yo or with diabetes/HTN.'}
                  </p>

                  {activePatient.irapenRiskScore && (
                    <div className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400">
                          {isFarsi ? 'رنگ خطر فعلی: ' : 'Stratification: '}
                        </span>
                        <span className="font-bold text-amber-400">
                          {activePatient.irapenRiskScore.colorCategory} (
                          {activePatient.irapenRiskScore.percentage}%)
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {isFarsi ? 'تاریخ آخرین ثبت: ' : 'Calculated: '}
                        {activePatient.irapenRiskScore.calculatedDateJalali}
                      </span>
                    </div>
                  )}
                </div>

                {/* 3. SIB Data Quality & AI Suggestions Auditor */}
                <DataQualityAuditor
                  issues={activePatient.dataQualityIssues}
                  suggestions={activePatient.suggestions}
                  onResolveIssue={handleResolveQualityIssue}
                  onToggleSuggestion={handleToggleSuggestion}
                  isFarsi={isFarsi}
                />

                {/* 4. Rural Offline Sync Status Box */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    {connectivity === 'ONLINE' ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    ) : connectivity === 'DEGRADED' ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    )}
                    <div>
                      <div className="font-medium text-white">
                        {isFarsi ? 'وضعیت اتصال به درگاه سیب: ' : 'SIB Gateway: '}
                        <span className="font-mono">{connectivity}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {queuedCount > 0
                          ? isFarsi
                            ? `${queuedCount} پرونده در صف ذخیره محلی`
                            : `${queuedCount} encounter(s) in local buffer`
                          : isFarsi
                          ? 'تمام پرونده‌ها همگام هستند'
                          : 'All local records synchronized'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsSyncDrawerOpen(true)}
                    className="px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-[11px] transition-colors"
                  >
                    {isFarsi ? 'مشاهده بافر' : 'Inspect Buffer'}
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* Tab 2: SIB Bridge Architecture View */}
      {currentTab === 'bridge-view' && (
        <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6">
          <SibBridgeInspector patient={activePatient} isFarsi={isFarsi} />
        </main>
      )}

      {/* Tab 3: Offline Queue Management View */}
      {currentTab === 'sync-queue' && (
        <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-white">
                  {isFarsi
                    ? 'مدیریت بافر و صف هماهنگ‌سازی آفلاین سیب'
                    : 'SIB Offline Synchronization Queue Manager'}
                </h2>
                <p className="text-xs text-slate-400">
                  {isFarsi
                    ? 'طراحی شده برای مناطق روستایی با قطع و وصل مداوم اینترنت'
                    : 'Designed for rural health centers with intermittent connectivity'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSyncDrawerOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold"
                >
                  {isFarsi ? 'باز کردن پنل سریع هماهنگ‌سازی' : 'Open Sync Drawer'}
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-3">
              <div className="font-semibold text-slate-300">
                {isFarsi ? 'اصول کاری در شرایط قطعی اینترنت:' : 'Rural Offline Mode Working Principles:'}
              </div>
              <ul className="list-disc list-inside space-y-1.5 text-slate-400 text-[11px] leading-relaxed">
                <li>
                  {isFarsi
                    ? 'تمامی اقدامات ویزیت بدون نیاز به اتصال دائم، در حافظه محلی ایمن رمزگذاری می‌شوند.'
                    : 'All clinical entries are encrypted locally; clinician continues routine consultation.'}
                </li>
                <li>
                  {isFarsi
                    ? 'به هیچ عنوان داده‌ای بدون تایید مستقیم پزشک به صف اضافه نمی‌شود.'
                    : 'No automated background writes. Explicit review step always applies.'}
                </li>
                <li>
                  {isFarsi
                    ? 'به محض اتصال پایدار به اینترنت، بافر هماهنگ‌سازی امکان ارسال دسته‌ای با کلیدهای اختصاصی را دارد.'
                    : 'When online link resumes, queued records sync idempotently to SIB.'}
                </li>
              </ul>
            </div>
          </div>
        </main>
      )}

      {/* Tab 4: Guidelines and IraPEN Reference */}
      {currentTab === 'guidelines' && (
        <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6">
          <FamilyPhysicianGuidelinesView
            patient={activePatient}
            onApplyGuidelineAction={(actionText) => {
              setVisitDraft((prev) => ({
                ...prev,
                labOrders: Array.from(new Set([...prev.labOrders, actionText])),
              }));
              alert(
                isFarsi
                  ? `✓ اقدام بالینی "${actionText}" در پیش‌نویس ویزیت بیمار درج شد.`
                  : `✓ Action "${actionText}" staged into patient consultation draft.`
              );
            }}
            isFarsi={isFarsi}
          />
        </main>
      )}

      {/* Pinned Bottom Bar: Review → Confirm → Send to SIB (The Core Action) */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 bg-slate-900/95 border-t border-slate-800 backdrop-blur-md px-6 py-3 shadow-2xl">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left Info: Status Summary */}
          <div className="flex items-center gap-3 text-xs text-slate-300">
            <span className="font-semibold text-white">
              {activePatient.name} ({activePatient.persianName})
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400 font-mono tabular-figures">
              کد ملی: {activePatient.nationalId}
            </span>
            <span className="text-slate-600 hidden md:inline">·</span>
            <span className="text-teal-400 hidden md:inline">
              {visitDraft.diagnoses.length} {isFarsi ? 'تشخیص' : 'diagnoses'} ·{' '}
              {visitDraft.labOrders.length} {isFarsi ? 'آزمایش' : 'labs'} ·{' '}
              {visitDraft.newPrescriptions.length} {isFarsi ? 'دارو' : 'prescriptions'}
            </span>
          </div>

          {/* Right Action: Explicit Review & Commit Button */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => setIsCommitModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 ring-1 ring-teal-400/40"
            >
              <span>
                {isFarsi
                  ? 'مرور نهایی و ارسال به سامانه سیب'
                  : 'Review → Confirm → Send to SIB'}
              </span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <SibCommitModal
        isOpen={isCommitModalOpen}
        onClose={() => setIsCommitModalOpen(false)}
        patient={activePatient}
        draft={visitDraft}
        connectivity={connectivity}
        onConfirmCommit={handleConfirmCommit}
        isFarsi={isFarsi}
      />

      <SyncQueueDrawer
        isOpen={isSyncDrawerOpen}
        onClose={() => setIsSyncDrawerOpen(false)}
        transactions={transactions}
        onTransactionsUpdated={handleTransactionsUpdated}
        connectivity={connectivity}
        isFarsi={isFarsi}
      />

      <IraPenModal
        isOpen={isIraPenModalOpen}
        onClose={() => setIsIraPenModalOpen(false)}
        patient={activePatient}
        onApplyScore={handleApplyIraPenScore}
        isFarsi={isFarsi}
      />

      <SibReferralSlipModal
        isOpen={isReferralSlipOpen}
        onClose={() => setIsReferralSlipOpen(false)}
        patient={activePatient}
        draft={visitDraft}
        isFarsi={isFarsi}
      />

      <GuidedTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onSelectCase={(caseId) => setSelectedPatientId(caseId)}
        isFarsi={isFarsi}
      />

      {/* Raw SIB Record Drawer */}
      {isRawSibOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  {isFarsi ? 'پرونده خام در پایگاه داده سیب' : 'Raw Institutional SIB Record Tables'}
                </h3>
              </div>
              <button
                onClick={() => setIsRawSibOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
            <pre className="flex-1 overflow-y-auto text-[10px] font-mono p-3 rounded-lg bg-slate-950 text-slate-300 border border-slate-800">
              {JSON.stringify(activePatient.rawSibPayloadSnippet, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
