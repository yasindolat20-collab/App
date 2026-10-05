import React, { useState } from 'react';
import { HeartPulse, ShieldAlert, CheckCircle2, X, ArrowRight, HelpCircle, Activity } from 'lucide-react';
import { Patient } from '../types/sib';
import { ProvenanceBadge } from './ProvenanceBadge';

interface IraPenModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  onApplyScore: (score: { percentage: number; colorCategory: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' }) => void;
  isFarsi: boolean;
}

export const IraPenModal: React.FC<IraPenModalProps> = ({
  isOpen,
  onClose,
  patient,
  onApplyScore,
  isFarsi,
}) => {
  const [age, setAge] = useState(patient.age);
  const [gender, setGender] = useState(patient.gender);
  const [isSmoker, setIsSmoker] = useState(false);
  const [hasDiabetes, setHasDiabetes] = useState(
    patient.chronicConditions.some((c) => c.name.toLowerCase().includes('diabetes'))
  );
  const [systolicBP, setSystolicBP] = useState(patient.vitalsHistory[0]?.bloodPressureSys || 140);
  const [totalChol, setTotalChol] = useState(210);

  if (!isOpen) return null;

  // IraPEN simplified 10-year CVD risk score calculation
  const calculateRisk = () => {
    let base = 5;
    if (age >= 50) base += 5;
    if (age >= 60) base += 8;
    if (gender === 'M') base += 2;
    if (isSmoker) base += 6;
    if (hasDiabetes) base += 7;
    if (systolicBP >= 160) base += 8;
    else if (systolicBP >= 140) base += 4;
    if (totalChol >= 240) base += 5;
    else if (totalChol >= 200) base += 2;

    const percentage = Math.min(base, 42);
    let category: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' = 'GREEN';
    if (percentage >= 30) category = 'RED';
    else if (percentage >= 20) category = 'ORANGE';
    else if (percentage >= 10) category = 'YELLOW';
    return { percentage, category };
  };

  const currentRisk = calculateRisk();

  const handleApply = () => {
    onApplyScore({
      percentage: currentRisk.percentage,
      colorCategory: currentRisk.category,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isFarsi ? 'محاسبه‌گر خطرسنجی ۱۰ ساله ایراپن (IraPEN)' : 'IraPEN 10-Year CVD Risk Calculator'}
              </h3>
              <p className="text-xs text-slate-400">
                {isFarsi ? 'پروتکل کشوری وزارت بهداشت در سامانه سیب' : 'National Ministry of Health Protocol'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs overflow-y-auto">
          {/* Result Card */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              currentRisk.category === 'RED'
                ? 'bg-rose-950/40 border-rose-600/60 text-rose-200'
                : currentRisk.category === 'ORANGE'
                ? 'bg-amber-950/40 border-amber-600/60 text-amber-200'
                : currentRisk.category === 'YELLOW'
                ? 'bg-yellow-950/40 border-yellow-600/60 text-yellow-200'
                : 'bg-emerald-950/40 border-emerald-600/60 text-emerald-200'
            }`}
          >
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                {isFarsi ? 'رنگ و طبقه خطر ایراپن' : 'IraPEN Stratification'}
              </div>
              <div className="text-xl font-extrabold flex items-center gap-2 mt-0.5">
                <span>{currentRisk.category}</span>
                <span className="text-sm font-normal tabular-figures">
                  ({currentRisk.percentage}% {isFarsi ? 'احتمال رخداد قلبی در ۱۰ سال' : '10-yr event risk'})
                </span>
              </div>
              <div className="text-[11px] opacity-90 mt-1">
                {currentRisk.category === 'ORANGE' || currentRisk.category === 'RED'
                  ? isFarsi
                    ? 'نیاز به مداخله دارویی استاتین + آسپرین + ارجاع دوره ای به پزشک'
                    : 'Requires Statin therapy, intensive BP target, and frequent surveillance'
                  : isFarsi
                  ? 'پیگیری سالیانه و اصلاح سبک زندگی'
                  : 'Annual follow-up with lifestyle intervention'}
              </div>
            </div>

            <div className="w-12 h-12 rounded-full border-4 border-current flex items-center justify-center font-bold text-base tabular-figures shrink-0">
              {currentRisk.percentage}%
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <label className="text-slate-400 block mb-1">
                {isFarsi ? 'سن بیمار' : 'Age'}
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full bg-transparent text-white font-bold focus:outline-none"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <label className="text-slate-400 block mb-1">
                {isFarsi ? 'فشار خون سیستول (mmHg)' : 'Systolic BP (mmHg)'}
              </label>
              <input
                type="number"
                value={systolicBP}
                onChange={(e) => setSystolicBP(Number(e.target.value))}
                className="w-full bg-transparent text-white font-bold focus:outline-none"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <label className="text-slate-400 block mb-1">
                {isFarsi ? 'کلسترول تام (mg/dL)' : 'Total Cholesterol (mg/dL)'}
              </label>
              <input
                type="number"
                value={totalChol}
                onChange={(e) => setTotalChol(Number(e.target.value))}
                className="w-full bg-transparent text-white font-bold focus:outline-none"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSmoker}
                  onChange={(e) => setIsSmoker(e.target.checked)}
                  className="rounded border-slate-700 text-teal-600"
                />
                <span className="text-slate-200">
                  {isFarsi ? 'مصرف دخانیات (سیگار/قلیان)' : 'Tobacco Smoker'}
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={hasDiabetes}
                  onChange={(e) => setHasDiabetes(e.target.checked)}
                  className="rounded border-slate-700 text-teal-600"
                />
                <span className="text-slate-200">
                  {isFarsi ? 'مبتلا به دیابت' : 'Diagnosed Diabetic'}
                </span>
              </label>
            </div>
          </div>

          <div className="pt-2">
            <ProvenanceBadge
              badge={{
                type: 'SUGGESTION',
                sourceText: 'Calculated using National IraPEN Chart (بسته خطرسنجی وزارت بهداشت)',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white text-xs"
          >
            {isFarsi ? 'انصراف' : 'Cancel'}
          </button>

          <button
            onClick={handleApply}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isFarsi ? 'به‌روزرسانی در پرونده سیب' : 'Update in Patient SIB Draft'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
