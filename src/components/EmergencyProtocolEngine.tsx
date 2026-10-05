import React, { useState } from 'react';
import {
  AlertOctagon,
  ShieldAlert,
  PhoneCall,
  Pill,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  ChevronRight,
  Flame,
  Activity,
  HeartPulse,
  Syringe,
  X,
  Printer,
} from 'lucide-react';
import { EMERGENCY_PROTOCOLS, EmergencyProtocol } from '../data/emergencyAndAgeCareData';

interface EmergencyProtocolEngineProps {
  isOpen: boolean;
  onClose: () => void;
  isFarsi: boolean;
  activePatientName?: string;
}

export const EmergencyProtocolEngine: React.FC<EmergencyProtocolEngineProps> = ({
  isOpen,
  onClose,
  isFarsi,
  activePatientName = 'بیمار تحت معاینه',
}) => {
  const [selectedProtocolId, setSelectedProtocolId] = useState<string>(EMERGENCY_PROTOCOLS[0].id);
  const [copiedSlip, setCopiedSlip] = useState<boolean>(false);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const currentProtocol =
    EMERGENCY_PROTOCOLS.find((p) => p.id === selectedProtocolId) || EMERGENCY_PROTOCOLS[0];

  const handleToggleStep = (stepKey: string) => {
    setCompletedSteps((prev) => ({ ...prev, [stepKey]: !prev[stepKey] }));
  };

  const handleCopyDispatchSlip = () => {
    const slipText = isFarsi
      ? `🚨 برگه تریاژ فوری و انتقال اورژانس ۱۱۵
---------------------------------------------
بیمار: ${activePatientName} | تاریخ و ساعت: ${new Date().toLocaleDateString('fa-IR')} - ${new Date().toLocaleTimeString('fa-IR')}
مرکز ارجاع‌دهنده: مرکز خدمات جامع سلامت ده‌نمک | پزشک حاضر: دکتر علوی

تشخیص حاد و کد اورژانس: ${currentProtocol.nameFa} (${currentProtocol.code})
معیار بحران: ${currentProtocol.triggerCriteriaFa}

اقدامات پایدارسازی اولیه در مرکز:
${currentProtocol.stabilizationStepsFa.map((s, i) => `${i + 1}. ${s}`).join('\n')}

داروهای خط اول تزریق/تجویزشده:
${currentProtocol.firstLineDrugsFa.map((d) => `- ${d}`).join('\n')}

نیازمندی‌های اعزام:
${currentProtocol.dispatchRequirementsFa.join(' - ')}`
      : `🚨 115 EMS Emergency Dispatch Triage Slip
Patient: ${activePatientName} | Time: ${new Date().toLocaleTimeString()}
Center: Deh Namak Comprehensive Health Center | Physician: Dr. N. Alavi
Emergency Protocol: ${currentProtocol.nameEn} (${currentProtocol.code})
Actions & Drugs Administered:
${currentProtocol.firstLineDrugsFa.join(', ')}`;

    navigator.clipboard.writeText(slipText);
    setCopiedSlip(true);
    setTimeout(() => setCopiedSlip(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-slate-900 border border-rose-600/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Emergency Red Banner */}
        <div className="p-4 bg-gradient-to-r from-rose-950 via-slate-900 to-slate-900 border-b border-rose-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-lg animate-pulse">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide">
                  {isFarsi ? 'موتور تریاژ و پروتکل‌های اورژانس بالینی (کد قرمز)' : 'Clinical Emergency & Code Red Protocols'}
                </h2>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-900 text-rose-200 border border-rose-600/60 font-semibold animate-pulse">
                  CRITICAL
                </span>
              </div>
              <p className="text-[11px] text-rose-300/80">
                {isFarsi
                  ? 'دستورالعمل اقدامات نجات‌بخش، پایدارسازی فوری در مرکز و هماهنگی با اورژانس ۱۱۵'
                  : 'Life-saving stabilization protocols, first-line medications & 115 EMS dispatch'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Protocol Selector Pills Bar */}
        <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs">
          {EMERGENCY_PROTOCOLS.map((p) => {
            const isSelected = p.id === selectedProtocolId;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedProtocolId(p.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-rose-900/60 text-rose-200 border border-rose-500/60 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Flame className={`w-3 h-3 ${isSelected ? 'text-rose-400' : 'text-slate-500'}`} />
                <span>{isFarsi ? p.nameFa.split('(')[0] : p.nameEn}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Trigger Alert Box */}
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-700/50 space-y-1.5">
            <div className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>{isFarsi ? 'معیار بالینی ورود به پروتکل اورژانس: ' : 'Emergency Trigger Criteria: '}</span>
            </div>
            <p className="text-xs text-rose-100 leading-relaxed font-medium">
              {currentProtocol.triggerCriteriaFa}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: First Line Rescue Medications */}
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <Pill className="w-4 h-4 text-teal-400" />
                <h3 className="font-bold text-white text-xs">
                  {isFarsi ? 'داروهای خط اول و نجات‌بخش در مرکز' : 'First-Line Medications'}
                </h3>
              </div>

              <ul className="space-y-2">
                {currentProtocol.firstLineDrugsFa.map((drug, i) => (
                  <li
                    key={i}
                    className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 flex items-start gap-2 text-slate-200 text-xs leading-relaxed"
                  >
                    <Syringe className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                    <span>{drug}</span>
                  </li>
                ))}
              </ul>

              {currentProtocol.contraindicationsFa.length > 0 && (
                <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300">
                  <strong>{isFarsi ? 'موارد منع مصرف قطعی: ' : 'Contraindications: '}</strong>
                  <span>{currentProtocol.contraindicationsFa.join(' ')}</span>
                </div>
              )}
            </div>

            {/* Box 2: Immediate Stabilization Checklist */}
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <HeartPulse className="w-4 h-4 text-rose-400" />
                <h3 className="font-bold text-white text-xs">
                  {isFarsi ? 'چک‌لیست اقدامات فوری پایدارسازی' : 'Stabilization Checklist'}
                </h3>
              </div>

              <div className="space-y-2">
                {currentProtocol.stabilizationStepsFa.map((step, idx) => {
                  const stepKey = `${currentProtocol.id}-step-${idx}`;
                  const isDone = completedSteps[stepKey];

                  return (
                    <div
                      key={idx}
                      onClick={() => handleToggleStep(stepKey)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-colors flex items-start gap-2.5 text-xs ${
                        isDone
                          ? 'bg-emerald-950/30 border-emerald-700/60 text-emerald-200'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                          isDone
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'border-slate-600 bg-slate-800'
                        }`}
                      >
                        {isDone && <Check className="w-3 h-3" />}
                      </div>
                      <span className={isDone ? 'line-through opacity-80' : ''}>{step}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 115 EMS Dispatch Section */}
          <div className="p-4 rounded-xl bg-slate-950 border border-rose-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-white text-xs flex items-center gap-2">
                  <span>{isFarsi ? 'هماهنگی اعزام اورژانس پیش‌بیمارستانی ۱۱۵' : 'EMS 115 Dispatch Dispatcher'}</span>
                  <span className="font-mono text-rose-400 bg-rose-950 px-1.5 py-0.2 rounded border border-rose-800/40 text-[10px]">
                    CODE RED
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {currentProtocol.dispatchRequirementsFa.join(' · ')}
                </div>
              </div>
            </div>

            <button
              onClick={handleCopyDispatchSlip}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shrink-0"
            >
              {copiedSlip ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{isFarsi ? 'برگه تریاژ کپی شد ✓' : 'Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isFarsi ? 'کپی برگه تریاژ و اعزام' : 'Copy Triage Slip'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-teal-400" />
            <span>پروتکل رسمی مدیریت فوریت‌های کشوری وزارت بهداشت (ED-MoH)</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            {isFarsi ? 'بستن پنجره اورژانس' : 'Close Protocol'}
          </button>
        </div>
      </div>
    </div>
  );
};
