import React, { useState } from 'react';
import { Stethoscope, Activity, Sparkles, Plus, Trash2, ArrowRight, Pill, FlaskConical, FileText, Send, CheckCircle2 } from 'lucide-react';
import { CurrentVisitDraft, Patient } from '../types/sib';
import { parseUnstructuredVisitNote } from '../services/geminiService';

interface CurrentVisitFormProps {
  patient: Patient;
  draft: CurrentVisitDraft;
  onChangeDraft: (draft: CurrentVisitDraft) => void;
  onInitiateReview: () => void;
  onOpenReferralSlip?: () => void;
  isFarsi: boolean;
}

export const CurrentVisitForm: React.FC<CurrentVisitFormProps> = ({
  patient,
  draft,
  onChangeDraft,
  onInitiateReview,
  onOpenReferralSlip,
  isFarsi,
}) => {
  const [isParsing, setIsParsing] = useState(false);
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [newOrder, setNewOrder] = useState('');
  const [newRx, setNewRx] = useState('');

  // Context-aware clinical scenario presets
  const scenarioPresets: Record<string, string> = {
    'p-01': 'بیمار سردرد خفیف صبحگاهی داشت. فشار خون ۱۴۸ روی ۹۲ اندازه گرفته شد. قند ناشتا ۱۶۵ بود. لوزارتان را منظم می‌خورد اما آتورواستاتین را قطع کرده. توصیه به آزمایش مجدد چربی، قند HbA1c و نسبت آلبومین به کراتینین ادرار UACR شد.',
    'p-02': 'بیمار جهت گواهی سلامت مراجعه کرد. فشار خون ۱۵۴ روی ۹۶ ثبت شد. روزی ۲۰ نخ سیگار می‌کشد و سابقه خانوادگی سکته قلبی در پدر قبل از ۵۰ سالگی دارد. آزمایش پروفایل چربی و پانل فشار خون تجویز شد.',
    'p-03': 'مراقبت بارداری هفته ۲۶. مادر با گروه خونی O منفی. غربالگری دیابت بارداری OGTT و آزمایش کومبس غیرمستقیم ثبت گردید تا برای تزریق روگام در هفته ۲۸ آماده شود.',
    'p-04': 'بیمار COPD با تنگی نفس فعالیتی و ادم مچ پا. مصرف خودسرانه ناپروکسن متوقف شد. سطح الکترولیت‌های سرم پتاسیم و سدیم و کراتینین جهت پایش نارسایی قلبی و ریوی درخواست شد.',
  };

  const activePreset = scenarioPresets[patient.id] || scenarioPresets['p-01'];

  const handleRunAiParser = async () => {
    if (!draft.subjectiveNotes) return;
    setIsParsing(true);
    try {
      const parsed = await parseUnstructuredVisitNote(
        draft.subjectiveNotes,
        patient.name,
        patient.chronicConditions.map((c) => c.name)
      );

      onChangeDraft({
        ...draft,
        chiefComplaint: draft.chiefComplaint || parsed.chiefComplaint,
        bloodPressureSys: parsed.bloodPressureSys ? String(parsed.bloodPressureSys) : draft.bloodPressureSys,
        bloodPressureDia: parsed.bloodPressureDia ? String(parsed.bloodPressureDia) : draft.bloodPressureDia,
        bloodGlucose: parsed.bloodGlucose ? String(parsed.bloodGlucose) : draft.bloodGlucose,
        heartRate: parsed.heartRate ? String(parsed.heartRate) : draft.heartRate,
        weightKg: parsed.weightKg ? String(parsed.weightKg) : draft.weightKg,
        diagnoses: Array.from(new Set([...draft.diagnoses, ...parsed.suggestedDiagnoses])),
        labOrders: Array.from(new Set([...draft.labOrders, ...parsed.recommendedOrders])),
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleAddDiagnosis = () => {
    if (!newDiagnosis.trim()) return;
    onChangeDraft({
      ...draft,
      diagnoses: [...draft.diagnoses, newDiagnosis.trim()],
    });
    setNewDiagnosis('');
  };

  const handleRemoveDiagnosis = (idx: number) => {
    onChangeDraft({
      ...draft,
      diagnoses: draft.diagnoses.filter((_, i) => i !== idx),
    });
  };

  const handleAddLabOrder = () => {
    if (!newOrder.trim()) return;
    onChangeDraft({
      ...draft,
      labOrders: [...draft.labOrders, newOrder.trim()],
    });
    setNewOrder('');
  };

  const handleRemoveLabOrder = (idx: number) => {
    onChangeDraft({
      ...draft,
      labOrders: draft.labOrders.filter((_, i) => i !== idx),
    });
  };

  const handleAddRx = () => {
    if (!newRx.trim()) return;
    onChangeDraft({
      ...draft,
      newPrescriptions: [...draft.newPrescriptions, newRx.trim()],
    });
    setNewRx('');
  };

  const handleRemoveRx = (idx: number) => {
    onChangeDraft({
      ...draft,
      newPrescriptions: draft.newPrescriptions.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-teal-400" />
          <h2 className="text-sm font-semibold text-white">
            {isFarsi ? 'ویزیت جاری و فرم آماده‌سازی سیب' : "Today's Clinical Visit Workspace"}
          </h2>
        </div>
        <span className="text-[11px] text-slate-400">
          {isFarsi ? 'آماده‌سازی بدون ارسال مستقیم' : 'Clinician-in-the-loop Workspace'}
        </span>
      </div>

      {/* Structured Vitals Input Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
          <label className="text-[10px] text-slate-400 font-medium block">
            {isFarsi ? 'فشار سیستول (mmHg)' : 'Systolic BP'}
          </label>
          <input
            type="number"
            value={draft.bloodPressureSys}
            onChange={(e) => onChangeDraft({ ...draft, bloodPressureSys: e.target.value })}
            placeholder="145"
            className="w-full mt-1 bg-transparent text-white font-mono text-sm font-semibold focus:outline-none"
          />
        </div>

        <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
          <label className="text-[10px] text-slate-400 font-medium block">
            {isFarsi ? 'فشار دیاستول (mmHg)' : 'Diastolic BP'}
          </label>
          <input
            type="number"
            value={draft.bloodPressureDia}
            onChange={(e) => onChangeDraft({ ...draft, bloodPressureDia: e.target.value })}
            placeholder="90"
            className="w-full mt-1 bg-transparent text-white font-mono text-sm font-semibold focus:outline-none"
          />
        </div>

        <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
          <label className="text-[10px] text-slate-400 font-medium block">
            {isFarsi ? 'قند ناشتا (mg/dL)' : 'FBS (mg/dL)'}
          </label>
          <input
            type="number"
            value={draft.bloodGlucose}
            onChange={(e) => onChangeDraft({ ...draft, bloodGlucose: e.target.value })}
            placeholder="165"
            className="w-full mt-1 bg-transparent text-white font-mono text-sm font-semibold focus:outline-none"
          />
        </div>

        <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
          <label className="text-[10px] text-slate-400 font-medium block">
            {isFarsi ? 'ضربان قلب (bpm)' : 'Heart Rate'}
          </label>
          <input
            type="number"
            value={draft.heartRate}
            onChange={(e) => onChangeDraft({ ...draft, heartRate: e.target.value })}
            placeholder="78"
            className="w-full mt-1 bg-transparent text-white font-mono text-sm font-semibold focus:outline-none"
          />
        </div>

        <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 col-span-2 sm:col-span-1">
          <label className="text-[10px] text-slate-400 font-medium block">
            {isFarsi ? 'وزن (کیلوگرم)' : 'Weight (kg)'}
          </label>
          <input
            type="number"
            value={draft.weightKg}
            onChange={(e) => onChangeDraft({ ...draft, weightKg: e.target.value })}
            placeholder="74"
            className="w-full mt-1 bg-transparent text-white font-mono text-sm font-semibold focus:outline-none"
          />
        </div>
      </div>

      {/* Chief Complaint */}
      <div className="text-xs">
        <label className="text-[11px] text-slate-400 font-medium block mb-1">
          {isFarsi ? 'علت اصلی مراجعه (Chief Complaint)' : 'Chief Complaint (علت مراجعه)'}
        </label>
        <input
          type="text"
          value={draft.chiefComplaint}
          onChange={(e) => onChangeDraft({ ...draft, chiefComplaint: e.target.value })}
          placeholder={isFarsi ? 'مثال: پیگیری فصلی فشار خون و قند، سردرد خفیف...' : 'e.g. Follow-up for HTN and glycemic control...'}
          className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-teal-500"
        />
      </div>

      {/* Unstructured Clinical Notes with AI Structurer */}
      <div className="text-xs">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {isFarsi
                ? 'شرح حال و یادداشت سریع پزشک (متن آزاد فارسی یا انگلیسی)'
                : 'Free-text Consultation & Objective Notes'}
            </span>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChangeDraft({ ...draft, subjectiveNotes: activePreset })}
              className="text-[10px] text-teal-300 hover:text-teal-200 underline font-medium"
            >
              {isFarsi ? 'درج یادداشت بالینی نمونه این بیمار' : 'Load Patient Case Notes'}
            </button>

            <button
              type="button"
              disabled={isParsing || !draft.subjectiveNotes}
              onClick={handleRunAiParser}
              className="px-2.5 py-1 rounded bg-teal-900/60 hover:bg-teal-800 border border-teal-500/40 text-teal-200 text-[11px] font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>{isParsing ? (isFarsi ? 'در حال استخراج...' : 'Extracting...') : isFarsi ? 'استخراج خودکار فیلدهای سیب' : 'Extract SIB Fields'}</span>
            </button>
          </div>
        </div>

        <textarea
          rows={3}
          value={draft.subjectiveNotes}
          onChange={(e) => onChangeDraft({ ...draft, subjectiveNotes: e.target.value })}
          placeholder={isFarsi ? 'یادداشت بالینی یا مکالمه بیمار را وارد کنید؛ مدل هوشمند فیلدهای استاندارد سیب را استخراج و آماده می‌کند...' : 'Enter unstructured clinician notes; Ω-SIB extracts vitals, diagnoses, and lab orders...'}
          className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-white text-xs leading-relaxed focus:outline-none focus:border-teal-500"
        />
      </div>

      {/* Diagnoses and Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Diagnoses */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="text-[11px] font-medium text-slate-300 mb-2 flex items-center justify-between">
            <span>{isFarsi ? 'تشخیص‌های ثبت شده برای سیب' : 'Active Diagnoses (ICD-10)'}</span>
            <span className="text-[10px] text-slate-400 tabular-figures">
              {draft.diagnoses.length} item(s)
            </span>
          </div>

          <div className="space-y-1.5 mb-2.5 max-h-28 overflow-y-auto">
            {draft.diagnoses.map((diag, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-200"
              >
                <span>{diag}</span>
                <button
                  onClick={() => handleRemoveDiagnosis(i)}
                  className="text-slate-500 hover:text-rose-400 ml-2"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-1.5">
            <input
              type="text"
              value={newDiagnosis}
              onChange={(e) => setNewDiagnosis(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddDiagnosis()}
              placeholder={isFarsi ? 'افزودن تشخیص جدید...' : 'Add diagnosis...'}
              className="flex-1 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none"
            />
            <button
              onClick={handleAddDiagnosis}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs border border-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Lab & Paraclinical Orders */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="text-[11px] font-medium text-slate-300 mb-2 flex items-center justify-between">
            <span>{isFarsi ? 'دستورات پاراکلینیک و آزمایشگاه' : 'Paraclinical & Lab Orders'}</span>
            <span className="text-[10px] text-slate-400 tabular-figures">
              {draft.labOrders.length} item(s)
            </span>
          </div>

          <div className="space-y-1.5 mb-2.5 max-h-28 overflow-y-auto">
            {draft.labOrders.map((ord, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-200"
              >
                <span className="flex items-center gap-1.5">
                  <FlaskConical className="w-3 h-3 text-cyan-400" />
                  <span>{ord}</span>
                </span>
                <button
                  onClick={() => handleRemoveLabOrder(i)}
                  className="text-slate-500 hover:text-rose-400 ml-2"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-1.5">
            <input
              type="text"
              value={newOrder}
              onChange={(e) => setNewOrder(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLabOrder()}
              placeholder={isFarsi ? 'افزودن آزمایش (FBS, UACR, Cr)...' : 'Add lab order...'}
              className="flex-1 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none"
            />
            <button
              onClick={handleAddLabOrder}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs border border-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Prescriptions and Referral */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Prescriptions */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="text-[11px] font-medium text-slate-300 mb-2 flex items-center justify-between">
            <span>{isFarsi ? 'اقلام دارویی نسخه جدید' : 'New Medication Prescriptions'}</span>
            <span className="text-[10px] text-slate-400 tabular-figures">
              {draft.newPrescriptions.length} item(s)
            </span>
          </div>

          <div className="space-y-1.5 mb-2.5 max-h-24 overflow-y-auto">
            {draft.newPrescriptions.map((rx, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-200"
              >
                <span className="flex items-center gap-1.5">
                  <Pill className="w-3 h-3 text-teal-400" />
                  <span>{rx}</span>
                </span>
                <button
                  onClick={() => handleRemoveRx(i)}
                  className="text-slate-500 hover:text-rose-400 ml-2"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-1.5">
            <input
              type="text"
              value={newRx}
              onChange={(e) => setNewRx(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddRx()}
              placeholder={isFarsi ? 'مثال: Losartan 50mg روزی یک عدد...' : 'e.g. Losartan 50mg daily...'}
              className="flex-1 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none"
            />
            <button
              onClick={handleAddRx}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs border border-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* SIB Referral Level 1 -> Level 2 */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-300 mb-2 flex items-center justify-between">
              <span>{isFarsi ? 'سیستم ارجاع الکترونیک سطح ۱ به ۲' : 'SIB Electronic Referral (Level 1 → 2)'}</span>
              <span className="text-[10px] text-teal-400 font-mono">سامانه ارجاع کشوری</span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={draft.referralRequested}
                onChange={(e) => onChangeDraft({ ...draft, referralRequested: e.target.checked })}
                className="rounded border-slate-700 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-xs text-slate-200 font-medium">
                {isFarsi ? 'نیاز به ارجاع به متخصص تخصصی دارد' : 'Issue Level 2 Specialist Referral'}
              </span>
            </label>

            {draft.referralRequested && (
              <div className="mt-2.5 space-y-2">
                <input
                  type="text"
                  value={draft.referralTarget}
                  onChange={(e) => onChangeDraft({ ...draft, referralTarget: e.target.value })}
                  placeholder={isFarsi ? 'تخصص مقصد (مثال: چشم‌پزشکی جهت فوندوسکوپی)...' : 'Target specialty (e.g. Ophthalmology)...'}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none"
                />

                {onOpenReferralSlip && (
                  <button
                    type="button"
                    onClick={onOpenReferralSlip}
                    className="w-full py-1 px-2.5 rounded bg-teal-950 hover:bg-teal-900 border border-teal-500/40 text-teal-300 text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{isFarsi ? 'پیش‌نمایش و چاپ برگه ارجاع سیب' : 'Preview Official SIB Referral Slip'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
            {isFarsi ? 'کد رهگیری ارجاع پس از تایید توسط سیب صادر می‌شود.' : 'Referral tracking code generated upon SIB sync.'}
          </div>
        </div>
      </div>
    </div>
  );
};
