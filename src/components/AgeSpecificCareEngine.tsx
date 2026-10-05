import React, { useState } from 'react';
import {
  Users,
  Baby,
  GraduationCap,
  HeartPulse,
  Activity,
  Calendar,
  CheckCircle2,
  Check,
  Plus,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';
import { AGE_CARE_PACKAGES, AgeCarePackage } from '../data/emergencyAndAgeCareData';

interface AgeSpecificCareEngineProps {
  isFarsi: boolean;
  activePatientAge?: number;
  activePatientGender?: 'F' | 'M';
  onStageExamIntoVisit?: (examText: string) => void;
}

export const AgeSpecificCareEngine: React.FC<AgeSpecificCareEngineProps> = ({
  isFarsi,
  activePatientAge = 58,
  activePatientGender = 'F',
  onStageExamIntoVisit,
}) => {
  // Determine appropriate cohort default based on patient age
  const initialCohort =
    activePatientAge < 6
      ? 'CHILD'
      : activePatientAge < 30
      ? 'YOUTH'
      : activePatientAge < 60
      ? 'ADULT'
      : 'ELDERLY';

  const [selectedCohort, setSelectedCohort] = useState<'CHILD' | 'YOUTH' | 'ADULT' | 'ELDERLY' | 'MATERNAL'>(
    initialCohort
  );
  const [checkedExams, setCheckedExams] = useState<Record<string, boolean>>({});

  const currentPkg =
    AGE_CARE_PACKAGES.find((pkg) => pkg.cohortId === selectedCohort) || AGE_CARE_PACKAGES[2];

  const handleToggleExam = (examKey: string) => {
    setCheckedExams((prev) => ({ ...prev, [examKey]: !prev[examKey] }));
  };

  const handleStageAllSelected = () => {
    const selectedList = currentPkg.mandatoryExamsFa.filter(
      (_, i) => checkedExams[`${selectedCohort}-${i}`]
    );
    if (selectedList.length === 0) {
      alert(isFarsi ? 'لطفاً حداقل یک معاینه را علامت بزنید.' : 'Please select at least one examination.');
      return;
    }
    const combined = `[معاینات دوره‌ای متناسب با سن (${currentPkg.titleFa})]:\n` + selectedList.join('؛ ');
    if (onStageExamIntoVisit) {
      onStageExamIntoVisit(combined);
      alert(
        isFarsi
          ? '✓ معاینات علامت‌خورده به بخش شرح حال ویزیت اضافه شد.'
          : '✓ Selected physical exams staged into visit notes.'
      );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-bold text-white">
              {isFarsi
                ? 'موتور مراقبت‌ها و معاینات دوره‌ای متناسب با سن (Age-Appropriate Care Packages)'
                : 'Age-Appropriate Periodic Care & Physical Examination Engine'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {isFarsi
              ? 'بسته‌های خدمت و پروتکل‌های معاینه بالینی استاندارد وزارت بهداشت تفکیک‌شده بر اساس گروه‌های سنی'
              : 'Official Ministry of Health age-specific clinical examination packages and screening protocols'}
          </p>
        </div>

        {/* Cohort Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs overflow-x-auto">
          <button
            onClick={() => setSelectedCohort('CHILD')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              selectedCohort === 'CHILD' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Baby className="w-3.5 h-3.5" />
            <span>{isFarsi ? 'کودک (۰-۵)' : 'Child'}</span>
          </button>

          <button
            onClick={() => setSelectedCohort('YOUTH')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              selectedCohort === 'YOUTH' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>{isFarsi ? 'نوجوان و جوان (۶-۲۹)' : 'Youth'}</span>
          </button>

          <button
            onClick={() => setSelectedCohort('ADULT')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              selectedCohort === 'ADULT' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>{isFarsi ? 'میانسال (۳۰-۵۹)' : 'Adult'}</span>
          </button>

          <button
            onClick={() => setSelectedCohort('ELDERLY')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              selectedCohort === 'ELDERLY' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{isFarsi ? 'سالمند (≥۶۰)' : 'Elderly'}</span>
          </button>

          <button
            onClick={() => setSelectedCohort('MATERNAL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              selectedCohort === 'MATERNAL' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isFarsi ? 'مادر باردار' : 'Maternal'}</span>
          </button>
        </div>
      </div>

      {/* Package Header Banner */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-800/40 font-bold">
              {currentPkg.ageRange}
            </span>
            <h3 className="text-sm font-bold text-white">{currentPkg.titleFa}</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isFarsi
              ? 'معاینات فیزیکی ضروری، پروتکل‌های غربالگری و آزمایش‌های استاندارد در مراکز بهداشتی'
              : 'Core physical examination checklist and screening protocols'}
          </p>
        </div>

        {onStageExamIntoVisit && (
          <button
            onClick={handleStageAllSelected}
            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isFarsi ? 'درج موارد انتخابی در ویزیت' : 'Stage Selected into Visit'}</span>
          </button>
        )}
      </div>

      {/* 2-Column Grid: Mandatory Physical Exams & Screening Protocols */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        {/* Column 1: Mandatory Physical Examinations Checklist */}
        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="font-bold text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-teal-400" />
              <span>{isFarsi ? 'معاینات بالینی الزامی (Physical Exams)' : 'Mandatory Clinical Examinations'}</span>
            </div>
            <span className="text-[10px] text-slate-400">
              {isFarsi ? 'جهت درج کلیک کنید' : 'Click to select'}
            </span>
          </div>

          <div className="space-y-2">
            {currentPkg.mandatoryExamsFa.map((exam, idx) => {
              const examKey = `${selectedCohort}-${idx}`;
              const isChecked = !!checkedExams[examKey];

              return (
                <div
                  key={idx}
                  onClick={() => handleToggleExam(examKey)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 text-xs leading-relaxed ${
                    isChecked
                      ? 'bg-teal-950/40 border-teal-600/60 text-teal-200'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                      isChecked
                        ? 'bg-teal-600 border-teal-500 text-white'
                        : 'border-slate-600 bg-slate-800'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3" />}
                  </div>
                  <span>{exam}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Screening Protocols, Routine Labs & Red-Flags */}
        <div className="space-y-4">
          {/* Screening Protocols */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2.5">
            <div className="font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>{isFarsi ? 'پروتکل‌های غربالگری کشوری' : 'National Screening Protocols'}</span>
            </div>
            <ul className="space-y-1.5 text-slate-300 text-xs">
              {currentPkg.screeningProtocolsFa.map((proto, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span>{proto}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Routine Labs & Vaccines */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2.5">
            <div className="font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>{isFarsi ? 'آزمایش‌های دوره‌ای و واکسن‌ها' : 'Routine Labs & Vaccines'}</span>
            </div>
            <div className="text-xs text-slate-300 space-y-1.5">
              <div>
                <strong className="text-slate-400">{isFarsi ? 'آزمایش‌ها: ' : 'Labs: '}</strong>
                <span>{currentPkg.routineLabsFa.join(' · ')}</span>
              </div>
              <div>
                <strong className="text-slate-400">{isFarsi ? 'واکسن‌ها: ' : 'Vaccines: '}</strong>
                <span>{currentPkg.preventiveVaccinesFa.join(' · ')}</span>
              </div>
            </div>
          </div>

          {/* Red Flag Symptoms */}
          <div className="bg-slate-950 rounded-xl p-4 border border-rose-900/40 space-y-2">
            <div className="font-bold text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>{isFarsi ? 'علائم هشدار و پرچم قرمز در این سن' : 'Age-Specific Red-Flags'}</span>
            </div>
            <ul className="space-y-1 text-rose-200/90 text-xs">
              {currentPkg.redFlagSymptomsFa.map((rf, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-rose-400">⚠️</span>
                  <span>{rf}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
