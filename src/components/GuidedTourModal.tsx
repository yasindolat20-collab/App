import React, { useState } from 'react';
import { Sparkles, Layers, ShieldCheck, Database, CheckCircle2, ArrowRight, ArrowLeft, X, Wifi, WifiOff, Stethoscope } from 'lucide-react';

interface GuidedTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCase: (caseId: string) => void;
  isFarsi: boolean;
}

export const GuidedTourModal: React.FC<GuidedTourModalProps> = ({
  isOpen,
  onClose,
  onSelectCase,
  isFarsi,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const tourSteps = [
    {
      titleFa: 'مفهوم بنیادین: پل عملیاتی، نه جایگزین سیب',
      titleEn: 'Core Thesis: Operational Bridge, Not an EHR Replacement',
      subtitleFa: 'سامانه سیب به عنوان پایگاه داده رسمی حفظ می‌شود؛ Ω-SIB محیط کار پزشک را هوشمند می‌سازد.',
      subtitleEn: 'SIB remains the institutional record; Ω-SIB creates an actionable clinical workspace around it.',
      icon: <Layers className="w-8 h-8 text-teal-400" />,
      contentFa: [
        'در مراکز خدمات جامع سلامت و خانه‌های بهداشت روستایی، ورود تکراری اطلاعات و فرم‌های تودرتوی سیب زمان زیادی از پزشک می‌گیرد.',
        'Ω-SIB یک لایه واسط است که داده‌های نهادی سیب را به صورت پیوسته بازخوانی کرده، خطاهای ثبت را کشف نموده و محیطی ساده و متمرکز برای ویزیت فراهم می‌کند.',
        'معماری سیستم: پزشک معالج ↔ لایه هوشمند Ω-SIB ↔ پایگاه داده سامانه یکپارچه بهداشت (سیب).',
      ],
      contentEn: [
        'In rural Iranian health centers, repetitive data entry across nested SIB screens creates clinician burnout.',
        'Ω-SIB acts as an orchestration layer, reading institutional SIB tables, detecting discrepancies, and organizing visits into unified cards.',
        'Architecture: Clinician ↔ Ω-SIB Intelligence ↔ SIB Institutional Database.',
      ],
      badge: 'ARCHITECTURAL PRINCIPLE',
    },
    {
      titleFa: 'پایش کیفیت داده و کشف تکراری‌ها و تناقض‌ها',
      titleEn: 'Data Quality Auditor: Duplicates & Contradictions',
      subtitleFa: 'کشف عدم انطباق بین ماژول مراقبت بهورز، ویزیت پزشک و آزمایشگاه',
      subtitleEn: 'Cross-module integrity auditing between Behvarz logs and physician entries',
      icon: <Database className="w-8 h-8 text-cyan-400" />,
      contentFa: [
        'در پرونده خانم رستمی، دو فشار خون متناقض (۱۳۰/۸۰ در برابر ۱۵۲/۹۴) در یک روز در دو جدول مجزا ثبت شده بود.',
        'Ω-SIB این مغایرت را شناسایی کرده و به پزشک پیشنهاد تطبیق با سنجش جاری ارائه می‌دهد.',
        'نواقص پرونده (مانند فقدان تست میکروآلبومینوری یا سابقه خانوادگی ثبت‌نشده) فوراً برجسته می‌شوند.',
      ],
      contentEn: [
        'For Mrs. Rostami, conflicting BP readings (130/80 vs 152/94) were logged on the same day in separate SIB forms.',
        'Ω-SIB flags the discrepancy and prompts the clinician to reconcile it using today seated measurement.',
        'Missing fields (such as unrecorded microalbuminuria or absent CAD family history) are explicitly called out.',
      ],
      badge: 'DATA INTEGRITY',
    },
    {
      titleFa: 'اصل شفافیت و تفکیک سخت‌گیرانه منبع داده (Provenance)',
      titleEn: 'Strict Provenance Protocol: FACT vs INFERENCE',
      subtitleFa: 'عدم ارائه حدس‌های هوش مصنوعی به عنوان فکت مسلم پزشکی',
      subtitleEn: 'AI deductions are never presented as verified institutional facts',
      icon: <ShieldCheck className="w-8 h-8 text-purple-400" />,
      contentFa: [
        'تمامی اقلام موجود در داشبورد دارای برچسب صریح منبع هستند:',
        '• [FACT]: داده ثبت‌شده قطعی در پایگاه داده سیب با تاریخ و شناسه سند.',
        '• [INFERENCE]: استنتاج الگوریتمی یا ترکیب چند داده که نیازمند تایید پزشک است.',
        '• [SUGGESTION]: پیشنهاد برگرفته از دستورالعمل کشوری (مانند ایراپن یا دیابت).',
        '• [UNKNOWN]: فراخوان صریح داده‌های مفقود برای جلوگیری از سوگیری تشخیصی.',
      ],
      contentEn: [
        'Every clinical derived item is visibly distinguished:',
        '• [FACT]: Direct verified entry retrieved from institutional SIB database.',
        '• [INFERENCE]: Correlated clinical deduction requiring human sign-off.',
        '• [SUGGESTION]: Clinical guideline-informed prompt (IraPEN, MoH protocols).',
        '• [UNKNOWN]: Transparent callout of unverified or absent records.',
      ],
      badge: 'TRUST & SAFETY',
    },
    {
      titleFa: 'تاب‌آوری در مناطق روستایی و مدیریت بافر آفلاین',
      titleEn: 'Rural Resilience: Offline Buffer & Queued Synchronization',
      subtitleFa: 'تداوم کامل ویزیت در شرایط قطعی یا نوسان اینترنت در خانه‌های بهداشت',
      subtitleEn: 'Zero data loss during rural connectivity interruptions',
      icon: <WifiOff className="w-8 h-8 text-amber-400" />,
      contentFa: [
        'وضعیت ارتباط در سه حالت آنلاین (ONLINE)، کند (DEGRADED) و آفلاین (OFFLINE) شبیه‌سازی شده است.',
        'در زمان قطعی شبکه، پزشک به راحتی ویزیت را تکمیل کرده و پرونده به صورت محلی رمزگذاری و صف‌بندی می‌شود.',
        'به محض برقراری اینترنت، هماهنگ‌سازی دسته‌ای با شناسه یکتا بدون از دست رفتن اطلاعات انجام می‌گیرد.',
      ],
      contentEn: [
        'Supports 3 connectivity modes: ONLINE, DEGRADED (cached), and OFFLINE (queued).',
        'When network drops, the clinician completes the encounter locally with safe buffer encryption.',
        'Upon reconnection, the synchronization queue uploads all pending records idempotently.',
      ],
      badge: 'RURAL HEALTHCARE',
    },
    {
      titleFa: 'نظارت کامل پزشک: مرور → تایید → ارسال به سیب',
      titleEn: 'Clinician in the Loop: Review → Confirm → Send to SIB',
      subtitleFa: 'هیچ تغییری بدون امضا و کد نظام پزشکی در سیب ثبت نمی‌شود.',
      subtitleEn: 'Explicit review diff and signature required before any institutional commit.',
      icon: <Stethoscope className="w-8 h-8 text-emerald-400" />,
      contentFa: [
        'سیستم فاقد هرگونه ثبت یا ارسال خودکار و پنهانی است.',
        'پزشک پیش از ارسال، جدول مقایسه‌ای تغییرات (Diff) شامل علائم حیاتی، تشخیص‌ها، آزمایش‌ها و نسخه‌ها را بررسی می‌کند.',
        'تایید نهایی با کد نظام پزشکی و مسئولیت مستقیم پزشک معالج مهر و امضا می‌گردد.',
      ],
      contentEn: [
        'Zero silent writes, deletes, or autonomous submissions.',
        'Diff modal shows exactly which SIB tables (vitals, encounters, orders, referrals) will be updated.',
        'Final submission requires clinician Medical Council PIN confirmation.',
      ],
      badge: 'HUMAN DECISION',
    },
  ];

  const current = tourSteps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isFarsi ? 'تور معرفی معماری و اهداف بالینی سامانه Ω-SIB' : 'Ω-SIB Concept & Architectural Tour'}
              </h3>
              <p className="text-xs text-slate-400">
                {isFarsi
                  ? 'بررسی اصول کلیدی برای مسئولان نظام سلامت، پزشکان و مهندسان'
                  : 'Key principles for healthcare administrators, clinicians & engineers'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Content */}
        <div className="p-6 space-y-4 text-xs overflow-y-auto">
          {/* Progress Bar & Badges */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-800/40 font-semibold text-[10px]">
              {current.badge}
            </span>
            <div className="flex items-center gap-1">
              {tourSteps.map((_, i) => (
                <div
                  key={i}
                  className={`w-5 h-1.5 rounded-full transition-colors ${
                    i === currentStep ? 'bg-teal-400' : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-700/80 shrink-0">
              {current.icon}
            </div>

            <div>
              <h2 className="text-sm font-bold text-white">
                {isFarsi ? current.titleFa : current.titleEn}
              </h2>
              <p className="text-xs text-teal-300 font-medium mt-0.5">
                {isFarsi ? current.subtitleFa : current.subtitleEn}
              </p>
            </div>
          </div>

          <div className="space-y-2 p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 leading-relaxed text-slate-300 text-xs">
            {(isFarsi ? current.contentFa : current.contentEn).map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>

          {/* Quick Case Switcher at last step */}
          {currentStep === tourSteps.length - 1 && (
            <div className="p-3 rounded-xl bg-teal-950/30 border border-teal-800/40 space-y-2">
              <div className="font-semibold text-white text-xs">
                {isFarsi ? 'انتخاب سناریوی بالینی برای بررسی عملی:' : 'Select a clinical case scenario to explore:'}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button
                  onClick={() => {
                    onSelectCase('p-01');
                    onClose();
                  }}
                  className="p-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left text-teal-200"
                >
                  <strong className="block text-white">۱. فاطمه رستمی (۵۸ ساله)</strong>
                  <span>دیابت، فشار خون، رفع تناقض فشار خون دوگانه</span>
                </button>

                <button
                  onClick={() => {
                    onSelectCase('p-02');
                    onClose();
                  }}
                  className="p-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left text-teal-200"
                >
                  <strong className="block text-white">۲. محمد رضایی (۴۴ ساله)</strong>
                  <span>مصرف دخانیات، نقص چربی خون و ارزیابی اولیه</span>
                </button>

                <button
                  onClick={() => {
                    onSelectCase('p-03');
                    onClose();
                  }}
                  className="p-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left text-teal-200"
                >
                  <strong className="block text-white">۳. زهرا حسینی (۲۹ ساله)</strong>
                  <span>مراقبت بارداری هفته ۲۶، Rh منفی و تست OGTT</span>
                </button>

                <button
                  onClick={() => {
                    onSelectCase('p-04');
                    onClose();
                  }}
                  className="p-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left text-teal-200"
                >
                  <strong className="block text-white">۴. علی کریمی (۶۷ ساله)</strong>
                  <span>بیماری COPD، نارسایی قلبی و هشدار تداخل NSAID</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <button
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            {isFarsi ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
            <span>{isFarsi ? 'مرحله قبل' : 'Previous'}</span>
          </button>

          <span className="text-xs text-slate-400 font-mono tabular-figures">
            {currentStep + 1} / {tourSteps.length}
          </span>

          {currentStep < tourSteps.length - 1 ? (
            <button
              onClick={() => setCurrentStep((prev) => Math.min(tourSteps.length - 1, prev + 1))}
              className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>{isFarsi ? 'مرحله بعد' : 'Next'}</span>
              {isFarsi ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isFarsi ? 'شروع کار با سامانه' : 'Start Using Ω-SIB'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
