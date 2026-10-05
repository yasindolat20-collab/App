import React from 'react';
import { User, Phone, MapPin, Building2, HeartPulse, ShieldAlert, Activity, FileText } from 'lucide-react';
import { Patient } from '../types/sib';

interface PatientBannerProps {
  patient: Patient;
  onOpenSibRecord: () => void;
}

export const PatientBanner: React.FC<PatientBannerProps> = ({
  patient,
  onOpenSibRecord,
}) => {
  const getIraPenColor = (cat?: string) => {
    switch (cat) {
      case 'RED':
        return 'text-rose-400 bg-rose-950/60 border-rose-500/40';
      case 'ORANGE':
        return 'text-amber-400 bg-amber-950/60 border-amber-500/40';
      case 'YELLOW':
        return 'text-yellow-300 bg-yellow-950/60 border-yellow-500/40';
      default:
        return 'text-emerald-300 bg-emerald-950/60 border-emerald-500/40';
    }
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-6 py-4">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        {/* Patient Identity & SIB Meta */}
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-teal-400 font-bold text-lg shadow-inner shrink-0">
            {patient.gender === 'F' ? '♀' : '♂'}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">
                {patient.name}
              </h1>
              <span className="text-sm font-medium text-teal-300">
                {patient.persianName}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-300 tabular-figures">
                {patient.age} years old ({patient.gender === 'F' ? 'زن' : 'مرد'})
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-400">
                متولد {patient.birthDateJalali}
              </span>
            </div>

            {/* SIB Administrative Metadata */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <span className="text-slate-500">National ID (کد ملی):</span>
                <span className="font-mono text-slate-200 font-medium tracking-wider tabular-figures">
                  {patient.nationalId}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-slate-500">SIB Household:</span>
                <span className="font-mono text-teal-300 font-medium">
                  {patient.householdNumber}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-300">{patient.healthHouse}</span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-slate-500">Assigned Behvarz:</span>
                <span className="text-slate-300">{patient.assignedBehvarz}</span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-slate-500">Insurance:</span>
                <span className="text-slate-300">{patient.insuranceType}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Snapshot Tags & IraPEN CVD Risk */}
        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-start xl:justify-end">
          {/* IraPEN Score Card */}
          {patient.irapenRiskScore && (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${getIraPenColor(
                patient.irapenRiskScore.colorCategory
              )}`}
              title="IraPEN Cardiovascular 10-Year Risk Chart"
            >
              <HeartPulse className="w-4 h-4 shrink-0" />
              <div>
                <div className="font-semibold flex items-center gap-1 tabular-figures">
                  <span>IraPEN 10-Yr CVD Risk:</span>
                  <span>{patient.irapenRiskScore.percentage}%</span>
                  <span className="text-[10px] uppercase font-bold">
                    ({patient.irapenRiskScore.colorCategory})
                  </span>
                </div>
                <div className="text-[10px] opacity-80">
                  Last: {patient.irapenRiskScore.calculatedDateJalali} · Recalculation Due
                </div>
              </div>
            </div>
          )}

          {/* Chronic Care Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {patient.chronicConditions.map((cond, idx) => (
              <div
                key={idx}
                className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-200 flex items-center gap-1.5"
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    cond.controlStatus === 'OPTIMAL'
                      ? 'bg-emerald-400'
                      : cond.controlStatus === 'SUBOPTIMAL'
                      ? 'bg-amber-400'
                      : 'bg-rose-400'
                  }`}
                />
                <span className="font-medium">{cond.name}</span>
                <span className="text-[10px] text-slate-400">({cond.persianName})</span>
              </div>
            ))}
          </div>

          {/* SIB Raw View Button */}
          <button
            onClick={onOpenSibRecord}
            className="px-3 py-1.5 text-xs text-teal-300 bg-teal-950/40 hover:bg-teal-900/60 border border-teal-500/30 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Inspect SIB Record</span>
          </button>
        </div>
      </div>
    </div>
  );
};
