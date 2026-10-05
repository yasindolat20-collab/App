import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, Lock, ArrowRight, X, Database, Wifi, WifiOff, FileText } from 'lucide-react';
import { CurrentVisitDraft, Patient, ConnectivityStatus } from '../types/sib';

interface SibCommitModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  draft: CurrentVisitDraft;
  connectivity: ConnectivityStatus;
  onConfirmCommit: (medicalCouncilPin: string) => void;
  isFarsi: boolean;
}

export const SibCommitModal: React.FC<SibCommitModalProps> = ({
  isOpen,
  onClose,
  patient,
  draft,
  connectivity,
  onConfirmCommit,
  isFarsi,
}) => {
  const [pin, setPin] = useState('74892'); // default sample Iranian Medical Council ID
  const [termsAgreed, setTermsAgreed] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAgreed || !pin) return;
    onConfirmCommit(pin);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-300">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isFarsi ? 'تایید نهایی و ارسال به سامانه سیب' : 'Final Review & SIB Institutional Commit'}
              </h3>
              <p className="text-xs text-slate-400">
                {isFarsi
                  ? 'بررسی تغییرات آماده‌شده قبل از درج در پرونده رسمی الکترونیک سلامت'
                  : 'Explicit review step: Ω-SIB never silently commits without clinician signature'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Patient Context Confirmation Bar */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] text-slate-400">Target Patient (بیمار مقصد):</div>
              <div className="font-semibold text-white text-sm">
                {patient.name} ({patient.persianName})
              </div>
            </div>

            <div className="text-right tabular-figures">
              <div className="text-[10px] text-slate-400">National ID (کد ملی):</div>
              <div className="font-mono text-teal-300 font-bold">{patient.nationalId}</div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-slate-400">Household # (پرونده خانوار):</div>
              <div className="font-mono text-slate-300">{patient.householdNumber}</div>
            </div>
          </div>

          {/* Connection Destination Banner */}
          <div
            className={`p-3 rounded-xl border flex items-center gap-3 ${
              connectivity === 'ONLINE'
                ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                : connectivity === 'DEGRADED'
                ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                : 'bg-rose-950/20 border-rose-800/40 text-rose-200'
            }`}
          >
            {connectivity === 'ONLINE' ? (
              <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : connectivity === 'DEGRADED' ? (
              <Wifi className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <WifiOff className="w-4 h-4 text-rose-400 shrink-0" />
            )}

            <div className="text-[11px] leading-tight">
              <span className="font-semibold">
                {connectivity === 'ONLINE'
                  ? isFarsi
                    ? 'ارسال آنلاین به سرور مرکزی سامانه سیب'
                    : 'Online Direct SIB Gateway Sync'
                  : connectivity === 'DEGRADED'
                  ? isFarsi
                    ? 'ارسال با وضعیت شبکه ضعیف (ذخیره موقت در صورت تاخیر)'
                    : 'Degraded Mode: sync attempted with automatic local fallback'
                  : isFarsi
                  ? 'حالت آفلاین: ذخیره امن در بافر محلی و ارسال خودکار پس از اتصال'
                  : 'Offline Mode: records queued locally in secure sync buffer'}
              </span>
              <p className="opacity-80 mt-0.5">
                {connectivity === 'OFFLINE'
                  ? isFarsi
                    ? 'هیچ داده‌ای از دست نخواهد رفت؛ شناسه تراکنش محلی صادر خواهد شد.'
                    : 'Zero data loss. Transaction assigned local cryptographic ID and queued.'
                  : isFarsi
                  ? 'داده‌ها به جداول ویزیت پزشک، مراقبت و ارجاع منتقل می‌شوند.'
                  : 'Fields staged directly to official SIB tables.'}
              </p>
            </div>
          </div>

          {/* Field-by-Field Diff Summary */}
          <div className="space-y-2">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-teal-400" />
              <span>{isFarsi ? 'خلاصه فیلدهای آماده درج در سامانه سیب' : 'Structured SIB Fields Staged for Commit'}</span>
            </div>

            <div className="rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800 bg-slate-950/40">
              {/* Row 1: Vitals */}
              <div className="p-2.5 flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-slate-300">
                    {isFarsi ? 'علائم حیاتی و سنجش‌ها (tbl_vitals)' : 'Vitals & Measurements'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    BP: {draft.bloodPressureSys || '—'}/{draft.bloodPressureDia || '—'} mmHg · FBS:{' '}
                    {draft.bloodGlucose || '—'} mg/dL · Weight: {draft.weightKg || '—'} kg
                  </div>
                </div>
                <span className="text-[10px] font-mono text-teal-400 bg-teal-950/60 border border-teal-800/40 px-2 py-0.5 rounded">
                  NEW RECORD
                </span>
              </div>

              {/* Row 2: Chief Complaint & Notes */}
              <div className="p-2.5 flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-slate-300">
                    {isFarsi ? 'علت مراجعه و شرح حال (tbl_encounter)' : 'Encounter & Chief Complaint'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {draft.chiefComplaint || 'Routine chronic follow-up'}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-teal-400 bg-teal-950/60 border border-teal-800/40 px-2 py-0.5 rounded">
                  OUTPATIENT
                </span>
              </div>

              {/* Row 3: Diagnoses */}
              <div className="p-2.5 flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-slate-300">
                    {isFarsi ? 'تشخیص‌های بالینی (tbl_diagnoses)' : 'Diagnoses (ICD-10)'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {draft.diagnoses.length > 0 ? draft.diagnoses.join(', ') : 'None specified'}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400 tabular-figures">
                  {draft.diagnoses.length} item(s)
                </span>
              </div>

              {/* Row 4: Lab & Rx Orders */}
              <div className="p-2.5 flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-slate-300">
                    {isFarsi ? 'دستورات دارویی و آزمایشگاه (tbl_orders)' : 'Orders & Electronic Prescriptions'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Labs: {draft.labOrders.length > 0 ? draft.labOrders.join('; ') : 'None'}
                    {draft.newPrescriptions.length > 0 && (
                      <span className="block mt-0.5">
                        Rx: {draft.newPrescriptions.join('; ')}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400 tabular-figures">
                  {draft.labOrders.length + draft.newPrescriptions.length} item(s)
                </span>
              </div>

              {/* Row 5: Referral */}
              {draft.referralRequested && (
                <div className="p-2.5 flex items-start justify-between gap-4 bg-teal-950/10">
                  <div>
                    <div className="font-medium text-teal-300">
                      {isFarsi ? 'ارجاع الکترونیک سطح ۱ به ۲' : 'Level 1 → Level 2 Referral'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Destination: {draft.referralTarget || 'Specialty Polyclinic'}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded">
                    REFERRAL QUEUED
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Clinician Responsibility Declaration */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 space-y-2">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>
                {isFarsi
                  ? 'تعهد مسئولیت حرفه‌ای پزشک بالینی'
                  : 'Clinician Verification & Legal Responsibility'}
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {isFarsi
                ? 'اینجانب به عنوان پزشک خانواده مسئول، صحت اطلاعات بالینی ثبت شده فوق را بررسی و تایید می‌نمایم. پیشنهادات هوشمند سامانه تحت نظارت بالینی من اعمال شده است.'
                : 'I confirm that all clinical findings, vitals, and orders have been verified by me. Ω-SIB has acted purely as an assistive interface.'}
            </p>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="rounded border-slate-700 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-slate-200 font-medium text-xs">
                {isFarsi
                  ? 'صحت اطلاعات فوق را تایید می‌نمایم.'
                  : 'I verify the clinical accuracy of these staged records.'}
              </span>
            </label>
          </div>

          {/* Clinician Medical Council PIN */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-400" />
              <label className="text-xs text-slate-300 font-medium">
                {isFarsi ? 'کد نظام پزشکی پزشک امضاکننده:' : 'Medical Council PIN / Reg #:'}
              </label>
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="74892"
                className="w-28 px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-center text-xs font-mono font-bold text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                {isFarsi ? 'انصراف' : 'Cancel'}
              </button>

              <button
                type="button"
                disabled={!termsAgreed || !pin}
                onClick={handleSubmit}
                className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 rounded-lg transition-colors shadow-md flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {connectivity === 'OFFLINE'
                    ? isFarsi
                      ? 'امضا و ذخیره در بافر آفلاین'
                      : 'Sign & Queue Offline'
                    : isFarsi
                    ? 'امضا و ارسال قطعی به سامانه سیب'
                    : 'Sign & Commit to SIB'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
