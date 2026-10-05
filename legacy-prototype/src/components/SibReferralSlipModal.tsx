import React from 'react';
import { FileText, Printer, CheckCircle2, Building2, User, X, QrCode } from 'lucide-react';
import { Patient, CurrentVisitDraft } from '../types/sib';

interface SibReferralSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  draft: CurrentVisitDraft;
  isFarsi: boolean;
}

export const SibReferralSlipModal: React.FC<SibReferralSlipModalProps> = ({
  isOpen,
  onClose,
  patient,
  draft,
  isFarsi,
}) => {
  if (!isOpen) return null;

  const trackingCode = `REF-SIB-${patient.nationalId.slice(0, 4)}-${Math.floor(Math.random() * 89999 + 10000)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-300">
        {/* Header Action Bar */}
        <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700">
          <div className="flex items-center gap-2 font-semibold">
            <FileText className="w-4 h-4 text-teal-700" />
            <span>
              {isFarsi
                ? 'برگه ارجاع الکترونیک سطح ۱ به سطح ۲ (سامانه سیب)'
                : 'SIB Level 1 → Level 2 Electronic Referral Slip'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-medium flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isFarsi ? 'چاپ برگه ارجاع' : 'Print'}</span>
            </button>

            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Referral Sheet Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans leading-relaxed text-slate-800">
          {/* Institutional MoH Header */}
          <div className="text-center border-b border-slate-300 pb-3">
            <div className="text-xs font-bold text-slate-600">
              {isFarsi
                ? 'جمهوری اسلامی ایران — وزارت بهداشت، درمان و آموزش پزشکی'
                : 'Islamic Republic of Iran — Ministry of Health & Medical Education'}
            </div>
            <div className="text-sm font-extrabold text-slate-900 mt-0.5">
              {isFarsi
                ? 'فرم ارجاع بیمار در نظام شبکه بهداشت و درمان (پزشک خانواده)'
                : 'Family Physician Electronic Patient Referral Form'}
            </div>
            <div className="text-[11px] text-teal-800 font-mono font-semibold mt-1">
              {isFarsi ? 'کد رهگیری سامانه سیب: ' : 'SIB Tracking Code: '}
              {trackingCode}
            </div>
          </div>

          {/* Patient Demographic Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px]">
                {isFarsi ? 'نام و نام خانوادگی:' : 'Patient Name:'}
              </span>
              <span className="font-bold text-slate-900">
                {patient.name} ({patient.persianName})
              </span>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px]">
                {isFarsi ? 'کد ملی (۱۰ رقم):' : 'National ID:'}
              </span>
              <span className="font-mono font-bold text-slate-900">{patient.nationalId}</span>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px]">
                {isFarsi ? 'شماره پرونده خانوار:' : 'Household #:'}
              </span>
              <span className="font-mono text-slate-900">{patient.householdNumber}</span>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px]">
                {isFarsi ? 'نوع بیمه پایه:' : 'Insurance:'}
              </span>
              <span className="text-slate-900 font-medium">{patient.insuranceType}</span>
            </div>
          </div>

          {/* Referral Route */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-teal-50/60 border border-teal-200">
            <div>
              <span className="text-teal-900 font-bold block text-[11px]">
                {isFarsi ? 'واحد ارجاع دهنده (سطح ۱):' : 'Originating Facility (Level 1):'}
              </span>
              <div className="text-slate-800 mt-0.5">{patient.healthCenter}</div>
              <div className="text-[11px] text-slate-600">
                {isFarsi ? 'پزشک خانواده: دکتر علوی (کد نظام: ۷۴۸۹۲)' : 'Physician: Dr. N. Alavi (Reg: 74892)'}
              </div>
            </div>

            <div>
              <span className="text-teal-900 font-bold block text-[11px]">
                {isFarsi ? 'واحد مقصد ارجاع (سطح ۲):' : 'Target Destination (Level 2):'}
              </span>
              <div className="text-slate-900 font-bold mt-0.5">
                {draft.referralTarget || (isFarsi ? 'کلینیک تخصصی داخلی / چشم‌پزشکی' : 'Specialty Clinic')}
              </div>
              <div className="text-[11px] text-slate-600">
                {isFarsi ? 'نوع ارجاع: الکتیو / اولویت‌دار' : 'Type: Elective / Priority Follow-up'}
              </div>
            </div>
          </div>

          {/* Clinical Summary & Vitals */}
          <div className="space-y-2">
            <div className="font-bold text-slate-900 border-b border-slate-200 pb-1">
              {isFarsi ? 'خلاصه وضعیت بالینی و علت ارجاع:' : 'Clinical Summary & Reason for Referral:'}
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
              <div>
                <span className="font-semibold text-slate-700">
                  {isFarsi ? 'شکایت عمده: ' : 'Chief Complaint: '}
                </span>
                <span>{draft.chiefComplaint || 'Consultation referral'}</span>
              </div>

              <div>
                <span className="font-semibold text-slate-700">
                  {isFarsi ? 'علائم حیاتی ثبت شده در ویزیت: ' : 'Vitals Recorded: '}
                </span>
                <span className="font-mono">
                  BP: {draft.bloodPressureSys || '—'}/{draft.bloodPressureDia || '—'} mmHg · FBS:{' '}
                  {draft.bloodGlucose || '—'} mg/dL · Weight: {draft.weightKg || '—'} kg
                </span>
              </div>

              <div>
                <span className="font-semibold text-slate-700">
                  {isFarsi ? 'تشخیص‌های سطح ۱: ' : 'Level 1 Diagnoses: '}
                </span>
                <span>{draft.diagnoses.join(', ') || 'Under evaluation'}</span>
              </div>

              {draft.subjectiveNotes && (
                <div>
                  <span className="font-semibold text-slate-700">
                    {isFarsi ? 'یادداشت پزشک برای متخصص: ' : 'Clinician Note for Specialist: '}
                  </span>
                  <span className="text-slate-600">{draft.subjectiveNotes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Legal Stamp & Verification */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                {isFarsi
                  ? 'ثبت شده توسط سامانه هوشمند Ω-SIB با تایید مستقیم پزشک خانواده'
                  : 'Digitally verified via Ω-SIB Clinical Layer'}
              </span>
            </div>

            <div className="font-mono text-[10px] text-slate-400">
              TIMESTAMP: 1405/07/14 — HASH: {patient.nationalId.slice(0, 6)}X9
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
