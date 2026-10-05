import React, { useState } from 'react';
import {
  Clock,
  Calendar,
  Activity,
  Pill,
  Stethoscope,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  RefreshCw,
  ShieldAlert,
  FileText,
  Building2,
  Check,
} from 'lucide-react';
import { Patient, EncounterHistory } from '../types/sib';
import { ProvenanceBadge } from './ProvenanceBadge';

interface LongitudinalTimelineProps {
  patient: Patient;
  onSelectEncounter?: (enc: EncounterHistory) => void;
  onRenewMedication?: (medName: string, dosage: string, frequency: string) => void;
}

export const LongitudinalTimeline: React.FC<LongitudinalTimelineProps> = ({
  patient,
  onSelectEncounter,
  onRenewMedication,
}) => {
  const [expandedEncId, setExpandedEncId] = useState<string | null>(patient.encounters[0]?.id || null);
  const [isMedicationHistoryExpanded, setIsMedicationHistoryExpanded] = useState<boolean>(true);
  const [selectedMedFilter, setSelectedMedFilter] = useState<'ALL' | 'IRREGULAR' | 'CHRONIC'>('ALL');

  const lastEncounter = patient.encounters[0];
  const overduePreventive = patient.preventiveCare.filter((p) => p.status === 'OVERDUE');
  const duePreventive = patient.preventiveCare.filter((p) => p.status === 'DUE');

  // Filtered medications
  const filteredMeds = patient.currentMedications.filter((med) => {
    if (selectedMedFilter === 'IRREGULAR') return med.complianceReported === 'IRREGULAR';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* 4 Concise Metric / Status Cards as specified */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Card 1: Last Documented Visit */}
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
            <span>Last Documented Visit</span>
            <Clock className="w-3.5 h-3.5 text-teal-400" />
          </div>
          {lastEncounter ? (
            <div className="mt-1">
              <div className="text-sm font-semibold text-white tabular-figures">
                {lastEncounter.jalaliDate}
              </div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                {lastEncounter.clinician} · {lastEncounter.facility}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 mt-1">No prior visit logged</div>
          )}
        </div>

        {/* Card 2: 3 Important Historical Items */}
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
            <span>Historical Milestones</span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-1">
            <div className="text-sm font-semibold text-cyan-300 tabular-figures">
              {patient.encounters.length} SIB Encounters
            </div>
            <div className="text-[11px] text-slate-400 truncate mt-0.5">
              Earliest registered: {patient.encounters[patient.encounters.length - 1]?.jalaliDate || 'N/A'}
            </div>
          </div>
        </div>

        {/* Card 3: Preventive Care Status */}
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
            <span>Preventive Care Status</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-1">
            <div className="text-sm font-semibold flex items-center gap-1.5">
              {overduePreventive.length > 0 ? (
                <span className="text-rose-400 font-semibold tabular-figures">
                  {overduePreventive.length} Overdue
                </span>
              ) : duePreventive.length > 0 ? (
                <span className="text-amber-400 font-semibold tabular-figures">
                  {duePreventive.length} Due Today
                </span>
              ) : (
                <span className="text-emerald-400 font-semibold">Up to Date</span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 truncate mt-0.5">
              IraPEN & Screening Protocols
            </div>
          </div>
        </div>

        {/* Card 4: Active Regimen & Adherence (Clickable toggle) */}
        <div
          onClick={() => setIsMedicationHistoryExpanded(!isMedicationHistoryExpanded)}
          className={`p-3 border rounded-xl cursor-pointer transition-all ${
            isMedicationHistoryExpanded
              ? 'bg-slate-850 border-teal-500/80 shadow-xs'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
          title="Click to expand/collapse longitudinal medication view"
        >
          <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span>Active SIB Regimen</span>
              <span className="text-[9px] text-teal-400">▼</span>
            </span>
            <Pill className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="mt-1">
            <div className="text-sm font-semibold text-white tabular-figures flex items-center justify-between">
              <span>{patient.currentMedications.length} Prescriptions</span>
              <span className="text-[10px] text-teal-300 font-normal">
                {isMedicationHistoryExpanded ? 'Collapse' : 'Expand'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 truncate mt-0.5">
              {patient.currentMedications.some((m) => m.complianceReported === 'IRREGULAR') ? (
                <span className="text-amber-400">Reported irregular intake</span>
              ) : (
                <span className="text-emerald-400">Reported regular</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DEDICATED EXPANDABLE MEDICATION HISTORY VIEW */}
      {isMedicationHistoryExpanded && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <Pill className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>سوابق دارویی و نسخه‌های الکترونیک سیب</span>
                  <span className="text-slate-400 font-normal">/</span>
                  <span className="text-slate-300 font-normal text-[11px]">
                    Longitudinal Medication History & SIB Prescriptions
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400">
                  متصل به پایگاه داده نسخه الکترونیک بیمه سلامت و پرونده بیماری‌های مزمن
                </p>
              </div>
            </div>

            {/* Sub-filter tabs */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px]">
              <button
                onClick={() => setSelectedMedFilter('ALL')}
                className={`px-2.5 py-0.5 rounded font-medium transition-colors ${
                  selectedMedFilter === 'ALL'
                    ? 'bg-slate-800 text-teal-300 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Active ({patient.currentMedications.length})
              </button>

              <button
                onClick={() => setSelectedMedFilter('IRREGULAR')}
                className={`px-2.5 py-0.5 rounded font-medium transition-colors flex items-center gap-1 ${
                  selectedMedFilter === 'IRREGULAR'
                    ? 'bg-slate-800 text-amber-300 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Compliance Alert</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              </button>
            </div>
          </div>

          {/* List of Medications */}
          {filteredMeds.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-xs">
              No medications matching selected filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMeds.map((med, idx) => {
                const isIrregular = med.complianceReported === 'IRREGULAR';

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs transition-all ${
                      isIrregular
                        ? 'bg-amber-950/20 border-amber-800/40 hover:border-amber-700'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isIrregular
                              ? 'bg-amber-900/40 text-amber-300 border border-amber-600/40'
                              : 'bg-teal-950 text-teal-300 border border-teal-800/40'
                          }`}
                        >
                          Rx
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-white text-sm">{med.name}</span>
                            <span className="font-mono text-teal-400 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800 text-[11px]">
                              {med.dosage}
                            </span>
                            <span
                              className={`px-2 py-0.2 rounded text-[10px] font-medium font-mono border ${
                                isIrregular
                                  ? 'bg-amber-950 text-amber-300 border-amber-700'
                                  : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                              }`}
                            >
                              {isIrregular ? '⚠️ مصرف نامنظم / قطع شده' : '✓ مصرف منظم'}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-300 mt-0.5">
                            {med.frequency}
                          </div>
                        </div>
                      </div>

                      {/* 1-Click Renew in Active Visit Button */}
                      {onRenewMedication && (
                        <button
                          type="button"
                          onClick={() => onRenewMedication(med.name, med.dosage, med.frequency)}
                          className="px-2.5 py-1 rounded bg-teal-900/60 hover:bg-teal-800 border border-teal-500/40 text-teal-200 text-[11px] font-semibold transition-colors flex items-center gap-1 shrink-0"
                          title="Stage this prescription into today consultation draft"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>تمدید در ویزیت امروز</span>
                        </button>
                      )}
                    </div>

                    {/* SIB Administrative & Clinical Linkage Strip */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[10px]">
                          بیماری مزمن مرتبط (Indication):
                        </span>
                        <span className="text-slate-200 font-medium">
                          {med.indication || 'Chronic Disease Registry'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-[10px]">
                          تاریخ شروع و سابقه در سیب:
                        </span>
                        <span className="text-slate-300 tabular-figures">
                          از {med.startDateJalali || 'ثبت پرونده اولیه'}
                          {med.refillsCount && ` · ${med.refillsCount} دوره دریافت`}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-[10px]">
                          پزشک تجویزکننده اولیه:
                        </span>
                        <span className="text-slate-300">
                          {med.prescribedBy || 'پزشک خانواده مرکز'}
                        </span>
                      </div>
                    </div>

                    {/* Safety & Monitoring Notice */}
                    {med.monitoringNotes && (
                      <div className="mt-2 p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-teal-300 flex items-start gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-300 font-semibold">پایش بالینی: </strong>
                          <span>{med.monitoringNotes}</span>
                        </div>
                      </div>
                    )}

                    {/* Provenance Badge */}
                    <div className="mt-2 flex items-center justify-between border-t border-slate-800/60 pt-1.5 text-[10px] text-slate-400">
                      <ProvenanceBadge
                        badge={{
                          type: 'FACT',
                          sourceText: 'سامانه نسخه الکترونیک بیمه سلامت و پرونده الکترونیک سیب (Form-Rx)',
                          sourceSystem: 'SIB e-Prescription Module',
                        }}
                      />
                      <span className="tabular-figures">
                        آخرین دریافت داروخانه: {med.lastDispensedJalali || '۱۴۰۵/۰۴'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Recent Measurements Trend Strip */}
      <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-teal-400" />
            <span>Longitudinal Measurement Trends (SIB Vitals Registry)</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Source: Cross-module physician & Behvarz tables
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {/* BP History */}
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 font-medium">Blood Pressure Trend (mmHg)</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-base font-bold font-mono text-white tabular-figures">
                {patient.vitalsHistory[0]?.bloodPressureSys}/{patient.vitalsHistory[0]?.bloodPressureDia}
              </span>
              <span className="text-[11px] text-rose-400 font-medium">Elevated</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 tabular-figures">
              Prev: {patient.vitalsHistory[1]?.bloodPressureSys}/{patient.vitalsHistory[1]?.bloodPressureDia} ({patient.vitalsHistory[1]?.jalaliDate})
            </div>
          </div>

          {/* Glycemia History */}
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 font-medium">Glycemic Control (FBS / HbA1c)</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-base font-bold font-mono text-white tabular-figures">
                {patient.vitalsHistory[0]?.fastingBloodSugar || '—'} mg/dL
              </span>
              {patient.vitalsHistory[0]?.hba1c && (
                <span className="text-xs font-mono text-amber-300 tabular-figures">
                  HbA1c: {patient.vitalsHistory[0].hba1c}%
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 tabular-figures">
              Target: FBS &lt; 130 mg/dL, HbA1c &lt; 7.0%
            </div>
          </div>

          {/* BMI & Weight */}
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 font-medium">BMI & Body Weight</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-base font-bold font-mono text-white tabular-figures">
                {patient.vitalsHistory[0]?.bmi || '—'} kg/m²
              </span>
              <span className="text-[11px] text-slate-300 tabular-figures">
                ({patient.vitalsHistory[0]?.weightKg} kg)
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Classification: Overweight (Class I)
            </div>
          </div>
        </div>
      </div>

      {/* Longitudinal Encounter Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-white">
              Chronological Encounter Timeline (تاریخچه مراقبت‌ها در سامانه سیب)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {patient.encounters.length} recorded events
          </span>
        </div>

        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {patient.encounters.map((enc) => {
            const isExpanded = expandedEncId === enc.id;

            return (
              <div key={enc.id} className="relative">
                {/* Timeline node marker */}
                <div
                  className={`absolute -left-6 top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center bg-slate-900 ${
                    enc.role === 'Family Physician'
                      ? 'border-teal-500'
                      : enc.role === 'Behvarz'
                      ? 'border-emerald-500'
                      : 'border-cyan-500'
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      enc.role === 'Family Physician'
                        ? 'bg-teal-400'
                        : enc.role === 'Behvarz'
                        ? 'bg-emerald-400'
                        : 'bg-cyan-400'
                    }`}
                  />
                </div>

                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 hover:border-slate-600 transition-colors">
                  <div
                    onClick={() => setExpandedEncId(isExpanded ? null : enc.id)}
                    className="flex items-start justify-between cursor-pointer gap-2"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-white font-mono tabular-figures">
                          {enc.jalaliDate}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          ({enc.date})
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs font-medium text-teal-300">
                          {enc.clinician}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          [{enc.role}]
                        </span>
                      </div>

                      <div className="text-xs text-slate-200 mt-1 font-medium">
                        {enc.complaint}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                        {enc.icdCode}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-700/60 text-xs text-slate-300 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400">Facility / Module:</span>{' '}
                          <span className="text-slate-200">{enc.facility} · {enc.sibModule}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Diagnosis:</span>{' '}
                          <span className="text-slate-200 font-medium">{enc.diagnosis}</span>
                        </div>
                      </div>

                      {enc.vitals && Object.keys(enc.vitals).length > 0 && (
                        <div className="p-2 rounded bg-slate-900/60 border border-slate-800 text-[11px] flex flex-wrap gap-3 font-mono tabular-figures">
                          {enc.vitals.bloodPressureSys && (
                            <span>BP: {enc.vitals.bloodPressureSys}/{enc.vitals.bloodPressureDia} mmHg</span>
                          )}
                          {enc.vitals.fastingBloodSugar && (
                            <span>FBS: {enc.vitals.fastingBloodSugar} mg/dL</span>
                          )}
                          {enc.vitals.weightKg && <span>Weight: {enc.vitals.weightKg} kg</span>}
                        </div>
                      )}

                      <div>
                        <div className="text-[11px] text-slate-400 mb-1">Actions Taken in SIB:</div>
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-300">
                          {enc.actionsTaken.map((act, i) => (
                            <li key={i}>{act}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-1">
                        <ProvenanceBadge
                          badge={{
                            type: 'FACT',
                            sourceText: `Direct retrieval from ${enc.sibModule} [Encounter ID: ${enc.id}]`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
