import React, { useState } from 'react';
import {
  ShieldAlert,
  Activity,
  HeartPulse,
  UserCheck,
  Stethoscope,
  AlertTriangle,
  FileText,
  CheckCircle2,
  PhoneCall,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  ChevronDown,
  Camera,
  Mic,
  MicOff,
  Copy,
  Check,
  Send,
  Zap,
  Baby,
  GraduationCap,
  Shield,
  HeartHandshake,
  ArrowUpRight,
} from 'lucide-react';
import { SIB_AGE_CARE_PROTOCOLS, AgeGroupProtocol } from '../data/sibAgeCareProtocols';
import { EMERGENCY_PROTOCOLS, EmergencyProtocol } from '../data/emergencyProtocols';
import { SPECIALIST_WORKUPS, SpecialistWorkup } from '../data/specialistReferralWorkups';
import { Patient, CurrentVisitDraft } from '../types/sib';

interface SibClinicalIntelligenceCenterProps {
  patient: Patient;
  draft: CurrentVisitDraft;
  onApplyDraftChanges: (updatedDraft: Partial<CurrentVisitDraft>) => void;
  isFarsi: boolean;
}

export const SibClinicalIntelligenceCenter: React.FC<SibClinicalIntelligenceCenterProps> = ({
  patient,
  draft,
  onApplyDraftChanges,
  isFarsi,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'AGE_CARE' | 'EMERGENCY' | 'SPECIALIST_WORKUP'>('AGE_CARE');

  // Age Care Engine State
  const defaultAgeGroup = SIB_AGE_CARE_PROTOCOLS.find(
    (p) => patient.age >= p.minAge && patient.age <= p.maxAge
  ) || SIB_AGE_CARE_PROTOCOLS[2];
  const [selectedAgeProtocol, setSelectedAgeProtocol] = useState<AgeGroupProtocol>(defaultAgeGroup);
  const [completedExams, setCompletedExams] = useState<Record<string, boolean>>({});

  // Emergency Engine State
  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyProtocol>(EMERGENCY_PROTOCOLS[0]);
  const [emergencyCodeAlert, setEmergencyCodeAlert] = useState<boolean>(false);
  const [isCopied115, setIsCopied115] = useState<boolean>(false);

  // Specialist Referral Engine State
  const [selectedWorkup, setSelectedWorkup] = useState<SpecialistWorkup>(SPECIALIST_WORKUPS[0]);
  const [completedLabs, setCompletedLabs] = useState<Record<string, boolean>>({});
  const [isCopiedReferral, setIsCopiedReferral] = useState<boolean>(false);

  // Multimodal Voice/Visual Simulation State
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [hasVisualSample, setHasVisualSample] = useState<boolean>(false);

  const toggleExam = (exam: string) => {
    setCompletedExams((prev) => ({ ...prev, [exam]: !prev[exam] }));
  };

  const toggleLab = (lab: string) => {
    setCompletedLabs((prev) => ({ ...prev, [lab]: !prev[lab] }));
  };

  const handleApplyCompletedExams = () => {
    const activeExams = Object.entries(completedExams)
      .filter(([_, val]) => val)
      .map(([k]) => k);

    if (activeExams.length === 0) {
      alert(isFarsi ? 'لطفاً حداقل یک معاینه انجام‌شده را علامت بزنید.' : 'Please select at least one completed examination.');
      return;
    }

    const noteAddition = `\n[معاینات دوره‌ای متناسب با سن (${selectedAgeProtocol.ageRangeFa})]:\n` + activeExams.map((e) => `✓ ${e}`).join('\n');
    onApplyDraftChanges({
      physicalFindings: (draft.physicalFindings || '') + noteAddition,
    });
    alert(isFarsi ? '✓ معاینات انجام‌شده به شرح حال بالینی اضافه گردید.' : 'Examinations added to clinical notes.');
  };

  const handleCopy115Dispatch = () => {
    const text = `برگه اعزام فوری اورژانس پیش‌بیمارستانی ۱۱۵ (کد بحرانی):
بیمار: ${patient.name} (${patient.persianName}) | کد ملی: ${patient.nationalId} | سن: ${patient.age}
کد فوریت: ${selectedEmergency.code} - ${selectedEmergency.titleFa}
علت بحران: ${selectedEmergency.triggerConditionFa}
مرکز مبدا: مرکز خدمات جامع سلامت ده‌نمک | پزشک حاضر: دکتر علوی
اقدامات حیات‌بخش اولیه انجام‌شده:
${selectedEmergency.immediateStabilizationStepsFa.map((s) => `- ${s}`).join('\n')}
داروهای تریاژ اول:
${selectedEmergency.firstLineMedicationsFa.map((m) => `- ${m}`).join('\n')}
مقصد اعزام: ${selectedEmergency.targetFacilityLevel}`;

    navigator.clipboard.writeText(text);
    setIsCopied115(true);
    setTimeout(() => setIsCopied115(false), 2000);
  };

  const handleCopySpecialistReferral = () => {
    const completedList = Object.entries(completedLabs)
      .filter(([_, v]) => v)
      .map(([k]) => k);

    const text = `برگه رسمی ارجاع تخصصی سطح ۲ وزارت بهداشت (سامانه سیب):
--------------------------------------------------------
بیمار: ${patient.name} (${patient.persianName}) | سن: ${patient.age} | کد ملی: ${patient.nationalId}
پزشک خانواده ارجاع‌دهنده: دکتر علوی (کد نظام پزشکی: ۷۴۸۹۲)
مرجع پذیرش: ${selectedWorkup.specialtyDestinationFa}
تشخیص قطعی / احتمالی: ${selectedWorkup.clinicalConditionFa} (کد آی‌سی‌دی: ${selectedWorkup.icdCode})

۱. معیارهای ارجاع تخصصی طبق گایدلاین وزارت بهداشت:
${selectedWorkup.specialistReferralCriteriaFa.map((c) => `• ${c}`).join('\n')}

۲. نتایج بررسی‌های پاراکلینیک انجام‌شده در سطح یک:
${completedList.length > 0 ? completedList.map((l) => `✓ ${l}`).join('\n') : '• بررسی‌های پاراکلینیک طبق چک‌لیست پیوست جهت ویزیت آماده است.'}

۳. رژیم درمانی فعلی تجویز شده در سطح ۱:
${selectedWorkup.suggestedLevel1PrescriptionFa.map((rx) => `- ${rx}`).join('\n')}`;

    navigator.clipboard.writeText(text);
    setIsCopiedReferral(true);
    setTimeout(() => setIsCopiedReferral(false), 2000);
  };

  const simulateVoiceDictation = () => {
    if (isRecordingVoice) {
      setIsRecordingVoice(false);
      return;
    }

    setIsRecordingVoice(true);
    setVoiceTranscript('در حال ضبط صدای پزشک و استخراج مفاهیم بالینی...');
    setTimeout(() => {
      const recognized = isFarsi
        ? 'بیمار خانم ۵۸ ساله با سابقه دیابت و فشار خون، از تاری دید خفیف و سوزش کف پا شکایت دارد. فشار خون امروز ۱۴۸ روی ۹۲ و قند ناشتا ۱۶۲ است. متفورمین روزی ۲ عدد مصرف می‌شود. نیاز به ارجاع به چشم‌پزشکی برای فوندوسکوپی و تنظیم دوز دارو.'
        : 'Patient 58yo with T2DM and HTN reports mild visual blurring and bilateral foot burning sensation. BP 148/92, FBS 162. Recommending fundoscopy referral.';
      setVoiceTranscript(recognized);
      setIsRecordingVoice(false);
      onApplyDraftChanges({
        chiefComplaint: isFarsi ? 'تاری دید خفیف، سوزش اندام تحتانی و پایش دیابت مزمن' : 'Visual blur, lower extremity paresthesias, T2DM followup',
        subjectiveNotes: (draft.subjectiveNotes || '') + '\n[متن استخراج‌شده از صوت پزشک]:\n' + recognized,
      });
    }, 2200);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Executive Header with 3 Core Engine Switches */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
            <span className="text-[11px] font-mono text-teal-400 font-semibold tracking-wide">
              SIB CLINICAL INTELLIGENCE & TRIAGE SUITE
            </span>
          </div>
          <h2 className="text-base font-bold text-white tracking-tight">
            {isFarsi
              ? 'موتور جامع معاینات سنین، اورژانس‌ها و ارجاع تخصصی سیب'
              : 'SIB Life-Cycle Care, Emergency Triage & Specialist Referral Engine'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isFarsi
              ? 'انجام کلیه محاسبات، پروتکل‌های کشوری و معاینات در همین محیط بدون نیاز به ارسال داده'
              : 'Self-contained clinical engine implementing MoH protocols, age care, and red-flag emergency triage'}
          </p>
        </div>

        {/* Engine Switcher Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 shrink-0 text-xs">
          <button
            onClick={() => setActiveSubTab('AGE_CARE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeSubTab === 'AGE_CARE'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{isFarsi ? '۱. مراقبت‌ها متناسب با سن' : 'Age-Specific Care'}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('EMERGENCY')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeSubTab === 'EMERGENCY'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-rose-400 hover:text-rose-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{isFarsi ? '۲. اورژانس‌ها و فوریت‌ها (۱۱۵)' : 'Red-Flag Emergencies'}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('SPECIALIST_WORKUP')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeSubTab === 'SPECIALIST_WORKUP'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>{isFarsi ? '۳. موتور تشخیص و ارجاع تخصصی' : 'Specialist Workup & Referral'}</span>
          </button>
        </div>
      </div>

      {/* MULTIMODAL DICTATION / CAMERA STRIP (Inspired by Google PM demonstration) */}
      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-950/80 border border-teal-500/40 flex items-center justify-center text-teal-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-white font-medium flex items-center gap-1.5">
              <span>{isFarsi ? 'دستیار چندرسانه‌ای معاینه (Voice & Vision Copilot)' : 'Multimodal Exam Copilot'}</span>
              <span className="text-[9px] font-mono text-teal-400 bg-teal-950 px-1.5 py-0.2 rounded border border-teal-800/40">
                AI CAMERA & AUDIO
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              {voiceTranscript || (isFarsi ? 'برای ضبط صوتی شرح حال یا تحلیل تصویر ضایعه کلیک کنید' : 'Click mic to dictate notes or camera to inspect lesion')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice Dictation Button */}
          <button
            type="button"
            onClick={simulateVoiceDictation}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isRecordingVoice
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-slate-900 hover:bg-slate-800 text-teal-300 border border-teal-500/30'
            }`}
          >
            {isRecordingVoice ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            <span>{isRecordingVoice ? (isFarsi ? 'در حال شنیدن...' : 'Listening...') : (isFarsi ? 'دیکته صوتی ویزیت' : 'Voice Dictate')}</span>
          </button>

          {/* Camera / Visual Inspection Simulator */}
          <button
            type="button"
            onClick={() => {
              setHasVisualSample(!hasVisualSample);
              alert(
                isFarsi
                  ? 'نمونه تصویر ضایعه پوستی/نوار قلب بیمار پردازش شد: تصویر بدون زخم باز، شواهدی از ایسکمی ST-T در ECG نوار قلب دیده نمی‌شود.'
                  : 'ECG/Lesion visual analysis: No active ST elevation, no ulcerative skin breakdown.'
              );
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Camera className="w-3.5 h-3.5 text-teal-400" />
            <span>{isFarsi ? 'تحلیل تصویری ضایعه / ECG' : 'Visual Inspect'}</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. AGE-SPECIFIC CARE & MANDATORY EXAMINATIONS ENGINE           */}
      {/* ============================================================== */}
      {activeSubTab === 'AGE_CARE' && (
        <div className="space-y-4">
          {/* Age Cohort Switcher Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {SIB_AGE_CARE_PROTOCOLS.map((proto) => {
              const isSelected = selectedAgeProtocol.id === proto.id;
              const isCurrentPatientAge = patient.age >= proto.minAge && patient.age <= proto.maxAge;

              return (
                <button
                  key={proto.id}
                  onClick={() => setSelectedAgeProtocol(proto)}
                  className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-teal-950/40 border-teal-500 shadow-sm'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-[10px] font-mono text-slate-400">
                      {proto.ageRangeFa.split(' ')[0]}
                    </span>
                    {isCurrentPatientAge && (
                      <span className="w-2 h-2 rounded-full bg-teal-400" title="گروه سنی بیمار جاری" />
                    )}
                  </div>
                  <div className="text-xs font-bold text-white leading-tight">
                    {proto.targetGroupFa}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {proto.minAge}-{proto.maxAge === 120 ? 'بالاتر' : proto.maxAge} سال
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Age Protocol Body */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-teal-400" />
                  <span>{selectedAgeProtocol.targetGroupFa} ({selectedAgeProtocol.ageRangeFa})</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  شناسه فرم سیب: {selectedAgeProtocol.sibFormCode}
                </span>
              </div>

              <button
                type="button"
                onClick={handleApplyCompletedExams}
                className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isFarsi ? 'درج معاینات انتخاب‌شده در ویزیت' : 'Stage Selected Exams'}</span>
              </button>
            </div>

            {/* Checklist of Mandatory Examinations */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-teal-300">
                {isFarsi ? 'معاینات بالینی الزامی این دوره زندگی (چک‌لیست رسمی سیب):' : 'Mandatory Life-Cycle Physical Examinations:'}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {selectedAgeProtocol.requiredExaminationsFa.map((exam, idx) => {
                  const isChecked = !!completedExams[exam];

                  return (
                    <label
                      key={idx}
                      onClick={() => toggleExam(exam)}
                      className={`p-2.5 rounded-lg border cursor-pointer flex items-start gap-2.5 transition-all ${
                        isChecked
                          ? 'bg-teal-950/40 border-teal-500/80 text-white'
                          : 'bg-slate-900 border-slate-800/90 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded border-slate-700 text-teal-500 focus:ring-0"
                      />
                      <span className="text-xs leading-relaxed">{exam}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Screenings and Supplements Strip */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5">
                <span className="text-[11px] font-semibold text-amber-300 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" />
                  <span>غربالگری‌ها و واکسیناسیون کشوری:</span>
                </span>
                <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
                  {selectedAgeProtocol.mandatoryScreeningsFa.map((scr, idx) => (
                    <li key={idx}>{scr}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5">
                <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1">
                  <HeartPulse className="w-3.5 h-3.5" />
                  <span>مکمل‌های دارویی و پیشگیرانه رایگان سیب:</span>
                </span>
                <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
                  {selectedAgeProtocol.preventiveSupplementsFa.map((sup, idx) => (
                    <li key={idx}>{sup}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. RED-FLAG EMERGENCY & 115 DISPATCH ENGINE                    */}
      {/* ============================================================== */}
      {activeSubTab === 'EMERGENCY' && (
        <div className="space-y-4">
          {/* Emergency Alert Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950 via-slate-900 to-slate-900 border border-rose-600/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-lg animate-pulse shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>سامانه تریاژ فوری و اعزام اورژانس ۱۱۵ در مراکز سطح ۱</span>
                  <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-rose-900 text-rose-200 border border-rose-600">
                    CODE RED ACTIVE
                  </span>
                </h3>
                <p className="text-xs text-rose-200/80 mt-0.5">
                  دستورالعمل ثانیه به ثانیه تثبیت علائم حیاتی و اعزام بیمار به بخش مراقبت‌های ویژه
                </p>
              </div>
            </div>

            <button
              onClick={handleCopy115Dispatch}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shrink-0"
            >
              {isCopied115 ? <Check className="w-4 h-4" /> : <PhoneCall className="w-4 h-4" />}
              <span>{isCopied115 ? 'برگه اعزام کپی شد ✓' : 'صدور و کپی برگه اعزام ۱۱۵'}</span>
            </button>
          </div>

          {/* Emergency Condition Selector Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {EMERGENCY_PROTOCOLS.map((emg) => {
              const isSelected = selectedEmergency.id === emg.id;

              return (
                <button
                  key={emg.id}
                  onClick={() => setSelectedEmergency(emg)}
                  className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-rose-950/60 border-rose-500 shadow-md text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="text-[9px] font-mono text-rose-400 font-semibold">
                    {emg.code}
                  </span>
                  <span className="text-xs font-bold mt-1 leading-snug">
                    {emg.titleFa.split('(')[0]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Emergency Details Card */}
          <div className="bg-slate-950 border border-rose-900/50 rounded-xl p-5 space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>{selectedEmergency.titleFa}</span>
                </h3>
                <span className="text-xs text-rose-300 font-medium">
                  معیار تریگر بالینی: {selectedEmergency.triggerConditionFa}
                </span>
              </div>

              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800 shrink-0">
                مقصد: {selectedEmergency.targetFacilityLevel}
              </span>
            </div>

            {/* Stabilization Steps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>اقدامات فوری حیات‌بخش در مرکز (پیش از رسیدن آمبولانس):</span>
                </span>
                <ul className="space-y-1.5 text-slate-200">
                  {selectedEmergency.immediateStabilizationStepsFa.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-mono text-rose-400 font-bold shrink-0">{idx + 1}.</span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5" />
                  <span>داروهای خط اول تریاژ اورژانس (First-line Medications):</span>
                </span>
                <ul className="space-y-1.5 text-slate-200">
                  {selectedEmergency.firstLineMedicationsFa.map((med, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{med}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-800/40 text-rose-300 flex items-center justify-between">
              <span className="text-xs font-semibold">دستور اعزام ۱۱۵: {selectedEmergency.dispatch115InstructionsFa}</span>
              <button
                type="button"
                onClick={handleCopy115Dispatch}
                className="text-xs text-white underline font-bold"
              >
                رونوشت گزارش کامل اعزام
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. DEDICATED DIAGNOSTIC & SPECIALIST REFERRAL WORKUP ENGINE    */}
      {/* ============================================================== */}
      {activeSubTab === 'SPECIALIST_WORKUP' && (
        <div className="space-y-4">
          {/* Workup Condition Switcher */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {SPECIALIST_WORKUPS.map((wk) => {
              const isSelected = selectedWorkup.id === wk.id;

              return (
                <button
                  key={wk.id}
                  onClick={() => setSelectedWorkup(wk)}
                  className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-teal-950/50 border-teal-500 shadow-sm text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="text-[10px] font-mono text-teal-400">{wk.code}</span>
                  <div className="text-xs font-bold mt-1 leading-snug">{wk.clinicalConditionFa}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{wk.specialtyDestinationFa.split('/')[0]}</div>
                </button>
              );
            })}
          </div>

          {/* Active Specialist Workup Detail */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-teal-400" />
                  <span>{selectedWorkup.clinicalConditionFa}</span>
                  <span className="text-[10px] font-mono bg-slate-900 text-teal-300 px-2 py-0.5 rounded border border-slate-800">
                    ICD: {selectedWorkup.icdCode}
                  </span>
                </h3>
                <div className="text-xs text-teal-300 font-medium mt-0.5">
                  مرجع پذیرش ارجاع: {selectedWorkup.specialtyDestinationFa}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopySpecialistReferral}
                className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
              >
                {isCopiedReferral ? <Check className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                <span>{isCopiedReferral ? 'برگه ارجاع کپی شد ✓' : 'تولید برگه رسمی ارجاع سطح ۲'}</span>
              </button>
            </div>

            {/* Mandatory Pre-Referral Labs Checklist */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-teal-300 flex items-center justify-between">
                <span>بررسی‌های تخصصی پاراکلینیک الزامی پیش از ارجاع (دستورالعمل سطح ۱ به ۲):</span>
                <span className="text-[10px] text-slate-400 font-normal">جهت ثبت نتایج تیک بزنید</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {selectedWorkup.mandatoryPreReferralLabsFa.map((lab, idx) => {
                  const isChecked = !!completedLabs[lab];

                  return (
                    <label
                      key={idx}
                      onClick={() => toggleLab(lab)}
                      className={`p-2 rounded-lg border cursor-pointer flex items-center gap-2 transition-all ${
                        isChecked
                          ? 'bg-teal-950/40 border-teal-500 text-white font-medium'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-slate-700 text-teal-500 focus:ring-0"
                      />
                      <span className="text-xs">{lab}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Imaging & Referral Criteria */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                <span className="text-xs font-bold text-amber-300">
                  معیارهای ارجاع قطعی به متخصص:
                </span>
                <ul className="space-y-1 text-[11px] text-slate-200 list-disc list-inside leading-relaxed">
                  {selectedWorkup.specialistReferralCriteriaFa.map((crit, idx) => (
                    <li key={idx}>{crit}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                <span className="text-xs font-bold text-rose-400">
                  علائم هشدار نیازمند بستری اورژانسی مستقیم:
                </span>
                <ul className="space-y-1 text-[11px] text-rose-200 list-disc list-inside leading-relaxed">
                  {selectedWorkup.redFlagImmediateHospitalizationFa.map((red, idx) => (
                    <li key={idx}>{red}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
