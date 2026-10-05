import React, { useState } from 'react';
import {
  Stethoscope,
  Sparkles,
  Search,
  FileText,
  AlertCircle,
  ArrowRight,
  Copy,
  Check,
  CheckCircle2,
  Share2,
  Building2,
  Clock,
  Printer,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { CLINICAL_PRESENTATIONS, ClinicalPresentation } from '../data/emergencyAndAgeCareData';

interface DiagnosticReferralEngineProps {
  isFarsi: boolean;
  activePatientName?: string;
  activePatientId?: string;
  onOpenReferralSlipModal?: () => void;
}

export const DiagnosticReferralEngine: React.FC<DiagnosticReferralEngineProps> = ({
  isFarsi,
  activePatientName = 'فاطمه رستمی',
  activePatientId = 'p-01',
  onOpenReferralSlipModal,
}) => {
  const [selectedPresentationId, setSelectedPresentationId] = useState<string>(
    CLINICAL_PRESENTATIONS[0].id
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLetter, setCopiedLetter] = useState(false);

  const currentPresentation =
    CLINICAL_PRESENTATIONS.find((p) => p.id === selectedPresentationId) ||
    CLINICAL_PRESENTATIONS[0];

  const filteredPresentations = CLINICAL_PRESENTATIONS.filter((p) => {
    if (!searchQuery.trim()) return true;
    return (
      p.chiefComplaintFa.includes(searchQuery) ||
      p.chiefComplaintEn.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleCopyReferralLetter = () => {
    const letter = isFarsi
      ? `بسمه‌تعالی
برگه ارجاع تخصصی بیماران نظام ارجاع (سطح ۱ به سطح ۲)
--------------------------------------------------------
بیمار: ${activePatientName} | شماره پرونده سیب: ${activePatientId}
مرکز ارجاع‌دهنده: مرکز خدمات جامع سلامت ده‌نمک | پزشک خانواده: دکتر علوی (کد نظام: ۷۴۸۹۲)

شکایت اصلی: ${currentPresentation.chiefComplaintFa}
تخصص مقصد: ${currentPresentation.referralDestination.specialtyFa} (درجه فوریت: ${
        currentPresentation.referralDestination.urgency === 'IMMEDIATE'
          ? 'اورژانسی / فوری'
          : currentPresentation.referralDestination.urgency === 'URGENT_24_TO_48H'
          ? 'فوری طی ۲۴ تا ۴۸ ساعت'
          : 'عادی'
      })

تشخیص‌های افتراقی مطرح‌شده در سطح یک:
${currentPresentation.differentials
  .map((d) => `- ${d.diagnosisFa} [کد ICD-10: ${d.icd10}] (احتمال: ${d.probability})`)
  .join('\n')}

بررسی‌ها و اقدامات انجام‌شده در سطح یک:
${currentPresentation.essentialPrimaryWorkupFa.map((w) => `• ${w}`).join('\n')}

علت ارجاع و درخواست از همکار محترم متخصص:
${currentPresentation.referralDestination.referralIndicationsFa}

مدارک و نتایج پیوست‌شده:
${currentPresentation.referralDestination.mandatoryDocumentsFa.join(' - ')}`
      : `Official Level 2 Clinical Referral Slip
Patient: ${activePatientName} | ID: ${activePatientId}
Referring Physician: Dr. N. Alavi | Specialty Target: ${currentPresentation.referralDestination.specialtyFa}
Chief Complaint: ${currentPresentation.chiefComplaintEn}
Differentials:
${currentPresentation.differentials.map((d) => `${d.diagnosisEn} (${d.icd10})`).join('\n')}`;

    navigator.clipboard.writeText(letter);
    setCopiedLetter(true);
    setTimeout(() => setCopiedLetter(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-bold text-white">
              {isFarsi
                ? 'موتور اختصاصی تشخیص افتراقی، بررسی‌های تکمیلی و ارجاع تخصصی'
                : 'Dedicated Differential Diagnosis, Workup & Referral Engine'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {isFarsi
              ? 'تحلیل شکایت اصلی، اولویت‌بندی احتمالات تشخیصی، تعیین آزمایش‌های ضروری سطح ۱ و تدوین نامه ارجاع استاندارد'
              : 'Algorithmic chief complaint analysis, prioritized differential diagnosis, and Level 2 referral synthesis'}
          </p>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isFarsi ? 'جستجوی شکایت بالینی...' : 'Search presentation...'}
            className="w-full pr-8 pl-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Presentations Quick Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {filteredPresentations.map((p) => {
          const isSelected = p.id === selectedPresentationId;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedPresentationId(p.id)}
              className={`px-3 py-2 rounded-xl whitespace-nowrap font-medium transition-all text-right flex items-center gap-2 border ${
                isSelected
                  ? 'bg-teal-950 text-teal-200 border-teal-500/50 shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isSelected ? 'bg-teal-400 animate-pulse' : 'bg-slate-700'
                }`}
              />
              <span>{isFarsi ? p.chiefComplaintFa : p.chiefComplaintEn}</span>
            </button>
          );
        })}
      </div>

      {/* Main Analysis Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
        {/* Left / Differentials (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-400" />
                <span>{isFarsi ? 'تشخیص‌های افتراقی اولویت‌بندی‌شده (ICD-10)' : 'Prioritized Differentials'}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {currentPresentation.differentials.length} Differentials
              </span>
            </div>

            <div className="space-y-2.5">
              {currentPresentation.differentials.map((diff, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{diff.diagnosisFa}</span>
                      <span className="font-mono text-[10px] text-teal-300 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                        {diff.icd10}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.2 rounded text-[10px] font-mono font-medium border ${
                        diff.probability === 'HIGH'
                          ? 'bg-rose-950 text-rose-300 border-rose-800/60'
                          : diff.probability === 'RULE_OUT'
                          ? 'bg-amber-950 text-amber-300 border-amber-800/60'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {diff.probability}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    <strong>{isFarsi ? 'شواهد بالینی کلیدی: ' : 'Clues: '}</strong>
                    {diff.clinicalCluesFa}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Primary Workup Box */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2.5">
            <div className="font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>{isFarsi ? 'بررسی‌های تشخیصی ضروری سطح ۱ (Primary Workup)' : 'Essential Primary Workup'}</span>
            </div>

            <ul className="space-y-1.5 text-slate-300 text-xs">
              {currentPresentation.essentialPrimaryWorkupFa.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right / Referral Decision & Output (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-4">
            <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
              <div className="font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>{isFarsi ? 'معیار و تخصص ارجاع (سطح ۲)' : 'Specialist Referral'}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                  currentPresentation.referralDestination.urgency === 'IMMEDIATE'
                    ? 'bg-rose-950 text-rose-300 border-rose-800/60'
                    : currentPresentation.referralDestination.urgency === 'URGENT_24_TO_48H'
                    ? 'bg-amber-950 text-amber-300 border-amber-800/60'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-800/60'
                }`}
              >
                {currentPresentation.referralDestination.urgency}
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-slate-400 text-[11px]">{isFarsi ? 'تخصص مقصد: ' : 'Specialty: '}</div>
              <div className="font-bold text-teal-300 text-sm">
                {currentPresentation.referralDestination.specialtyFa}
              </div>
            </div>

            <div className="space-y-1.5 p-3 rounded-lg bg-slate-900 border border-slate-800/80">
              <div className="text-slate-400 text-[10px] font-medium">
                {isFarsi ? 'علت و اندیکاسیون رسمی ارجاع: ' : 'Indication: '}
              </div>
              <p className="text-slate-200 text-xs leading-relaxed">
                {currentPresentation.referralDestination.referralIndicationsFa}
              </p>
            </div>

            <div className="space-y-1 text-slate-300 text-[11px]">
              <strong className="text-slate-400 block">{isFarsi ? 'مدارک و نتایج الزامی همراه: ' : 'Documents: '}</strong>
              <div className="text-slate-300">
                {currentPresentation.referralDestination.mandatoryDocumentsFa.join(' · ')}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
              <button
                onClick={handleCopyReferralLetter}
                className="w-full py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                {copiedLetter ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{isFarsi ? 'نامه ارجاع کپی شد ✓' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{isFarsi ? 'رونوشت برگه ارجاع استاندارد' : 'Copy Referral Letter'}</span>
                  </>
                )}
              </button>

              {onOpenReferralSlipModal && (
                <button
                  onClick={onOpenReferralSlipModal}
                  className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-teal-400" />
                  <span>{isFarsi ? 'مشاهده و چاپ سربرگ رسمی وزارت بهداشت' : 'Open Printable Slip'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
