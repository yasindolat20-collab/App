import React, { useState } from 'react';
import { Database, Layers, ArrowRight, UserCheck, ShieldCheck, CheckCircle2, GitBranch, RefreshCw, FileText, Check } from 'lucide-react';
import { Patient } from '../types/sib';

interface SibBridgeInspectorProps {
  patient: Patient;
  isFarsi: boolean;
}

export const SibBridgeInspector: React.FC<SibBridgeInspectorProps> = ({ patient, isFarsi }) => {
  const [selectedPipelineStep, setSelectedPipelineStep] = useState<number>(2);

  const steps = [
    {
      step: 1,
      title: isFarsi ? '۱. داده‌های نهادی سیب' : '1. Institutional SIB Data',
      subtitle: isFarsi ? 'سامانه یکپارچه بهداشت (مرجع رسمی)' : 'Raw Ministry of Health Database',
      description: isFarsi
        ? 'داده‌های پراکنده در ده‌ها جدول، فرم‌های مراقبت بهورز، سیستم ارجاع و آزمایشگاه.'
        : 'Dispersed across 12+ legacy subforms, Behvarz logs, referral registries, and lab tables.',
      badge: 'SOURCE OF TRUTH',
      badgeColor: 'text-cyan-300 bg-cyan-950/60 border-cyan-800/40',
    },
    {
      step: 2,
      title: isFarsi ? '۲. لایه هوشمند Ω-SIB' : '2. Ω-SIB Intelligence Layer',
      subtitle: isFarsi ? 'بازسازی زمینه و پایش کیفیت داده' : 'Context Reconstruction & Integrity Audit',
      description: isFarsi
        ? 'تشخیص تکراری‌ها، کشف فیلدهای مفقود، اولویت‌بندی وظایف بالینی با حفظ شفافیت منبع.'
        : 'Detects duplicates, flags missing clinical fields, aligns chronological timeline with provenance.',
      badge: 'ORCHESTRATION',
      badgeColor: 'text-purple-300 bg-purple-950/60 border-purple-800/40',
    },
    {
      step: 3,
      title: isFarsi ? '۳. میز کار پزشک و تصمیم انسانی' : '3. Clinician Action & Sign-off',
      subtitle: isFarsi ? 'پزشک خانواده / بهورز در مرکز تصمیم' : 'Human-in-the-Loop Decision Workspace',
      description: isFarsi
        ? 'کارت‌های فشرده و گویا، آماده‌سازی ساختاریافته، تایید نهایی قبل از ارسال.'
        : 'High-density scannable workspace, editable structured fields, explicit sign-before-write.',
      badge: 'HUMAN DECISION',
      badgeColor: 'text-teal-300 bg-teal-950/60 border-teal-800/40',
    },
    {
      step: 4,
      title: isFarsi ? '۴. ثبت قطعی در سیب' : '4. Verified SIB Record',
      subtitle: isFarsi ? 'به‌روزرسانی امن و قانونی پرونده' : 'Synchronized Institutional Record',
      description: isFarsi
        ? 'انتقال رمزگذاری‌شده به جداول رسمی سیب و صدور کدهای ارجاع و نسخ الکترونیک.'
        : 'Encrypted transfer back to official SIB relational tables with audit stamp.',
      badge: 'COMMITTED',
      badgeColor: 'text-emerald-300 bg-emerald-950/60 border-emerald-800/40',
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Top Banner with Architecture Image */}
      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
        <div className="h-44 sm:h-52 w-full overflow-hidden relative">
          <img
            src="/src/assets/images/sib_bridge_diagram_1791203807797.jpg"
            alt="SIB to Ω-SIB Architectural Bridge"
            className="w-full h-full object-cover opacity-85 hover:scale-105 transition-transform duration-700"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          <div className="absolute bottom-4 left-6 right-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-2">
            <div>
              <div className="text-[11px] font-mono text-teal-400 font-semibold tracking-wider uppercase">
                {isFarsi ? 'معماری پل ارتباطی سامانه سیب' : 'ARCHITECTURAL PRINCIPLE'}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {isFarsi
                  ? 'سیب پرونده نهادی را حفظ می‌کند؛ Ω-SIB آن را به محیط اقدام بالینی تبدیل می‌کند.'
                  : 'SIB Holds the Institutional Record. Ω-SIB Turns it into an Actionable Clinical Workspace.'}
              </h2>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-xs font-mono text-slate-300 shrink-0">
              Clinician ↔ Ω-SIB ↔ SIB
            </div>
          </div>
        </div>
      </div>

      {/* 4-Step Interactive Pipeline Bridge */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((st) => {
          const isSelected = selectedPipelineStep === st.step;

          return (
            <div
              key={st.step}
              onClick={() => setSelectedPipelineStep(st.step)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-slate-800/90 border-teal-500/80 shadow-md ring-1 ring-teal-500/30'
                  : 'bg-slate-950/50 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold border ${st.badgeColor}`}>
                  {st.badge}
                </span>
                <span className="text-xs font-mono text-slate-400">Step {st.step}</span>
              </div>

              <h4 className="text-xs font-bold text-white mb-0.5">{st.title}</h4>
              <div className="text-[11px] text-teal-300 font-medium mb-1.5">{st.subtitle}</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{st.description}</p>
            </div>
          );
        })}
      </div>

      {/* Deep Dive Transformation Inspector */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-semibold text-white">
              {isFarsi
                ? 'مقایسه داده خام سیب در برابر فضای ساختاریافته Ω-SIB'
                : 'Raw SIB Database Record vs. Ω-SIB Reconstructed Workspace'}
            </h3>
          </div>
          <span className="text-[10px] text-slate-400">
            Patient: {patient.name} ({patient.nationalId})
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          {/* Left: Raw SIB Payload Representation */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <div className="text-[11px] font-sans font-semibold text-slate-400 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>Raw SIB Backend JSON/Tables</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Unstructured/Scattered</span>
            </div>
            <pre className="text-[10px] text-slate-300 overflow-x-auto p-2 rounded bg-slate-950 border border-slate-800/80 max-h-56">
              {JSON.stringify(
                {
                  institutional_gateway: 'SIB-MOHE-IR-PRODUCTION',
                  cod_meli: patient.nationalId,
                  parvandeh_khanewadeh: patient.householdNumber,
                  raw_encounters_count: patient.encounters.length,
                  vitals_tables: patient.vitalsHistory.map((v) => ({
                    shamsi: v.jalaliDate,
                    sys: v.bloodPressureSys,
                    dia: v.bloodPressureDia,
                    glc: v.fastingBloodSugar,
                    tbl: v.recordedIn,
                  })),
                  data_conflicts_unresolved: patient.dataQualityIssues.map((i) => i.id),
                },
                null,
                2
              )}
            </pre>
          </div>

          {/* Right: Ω-SIB Transformed Operational Layer */}
          <div className="p-3 rounded-lg bg-slate-900 border border-teal-800/50">
            <div className="text-[11px] font-sans font-semibold text-teal-300 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-400" />
                <span>Ω-SIB Actionable Clinical Workspace</span>
              </span>
              <span className="text-[10px] text-teal-400 font-mono">Clinician Ready</span>
            </div>

            <div className="space-y-2 text-[11px] font-sans text-slate-300">
              <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400">Context:</span>{' '}
                  <span className="text-white font-medium">58yo F, 2 Chronic Diseases (T2DM, HTN)</span>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                  FACT
                </span>
              </div>

              <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400">Discrepancy:</span>{' '}
                  <span className="text-amber-300">Conflicting BP resolved to 152/94 mmHg</span>
                </div>
                <span className="text-[10px] font-mono text-purple-400 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/40">
                  INFERENCE
                </span>
              </div>

              <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400">Prioritized Action:</span>{' '}
                  <span className="text-teal-300">Order UACR & Recalculate IraPEN 10-Yr Risk</span>
                </div>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
                  SUGGESTION
                </span>
              </div>

              <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400">Missing Record:</span>{' '}
                  <span className="text-slate-300">Dietary sodium intake unverified</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                  UNKNOWN
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
