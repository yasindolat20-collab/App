import React, { useState } from 'react';
import { Search, UserCheck, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Patient } from '../types/sib';

interface PatientSearchProps {
  patients: Patient[];
  selectedPatientId: string;
  onSelectPatient: (patient: Patient) => void;
}

export const PatientSearch: React.FC<PatientSearchProps> = ({
  patients,
  selectedPatientId,
  onSelectPatient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'CHRONIC' | 'DATA_QUALITY' | 'MATERNAL'>('ALL');

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.persianName.includes(searchTerm) ||
      p.nationalId.includes(searchTerm) ||
      p.householdNumber.includes(searchTerm);

    if (!matchesSearch) return false;

    if (filterCategory === 'CHRONIC') {
      return p.chronicConditions.length > 0;
    }
    if (filterCategory === 'DATA_QUALITY') {
      return p.dataQualityIssues.length > 0;
    }
    if (filterCategory === 'MATERNAL') {
      return p.gender === 'F' && p.age < 50;
    }
    return true;
  });

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-3">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by National ID (کد ملی 10 رقمی), Patient Name, or Household #..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800/90 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-800/80 rounded-lg border border-slate-700/60 overflow-x-auto">
          <button
            onClick={() => setFilterCategory('ALL')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filterCategory === 'ALL'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Active ({patients.length})
          </button>
          <button
            onClick={() => setFilterCategory('CHRONIC')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filterCategory === 'CHRONIC'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Chronic Care (مراقبت مزمن)
          </button>
          <button
            onClick={() => setFilterCategory('DATA_QUALITY')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${
              filterCategory === 'DATA_QUALITY'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>SIB Data Discrepancies</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          </button>
          <button
            onClick={() => setFilterCategory('MATERNAL')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filterCategory === 'MATERNAL'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Maternal / Child Care
          </button>
        </div>
      </div>

      {/* Quick Select Patient Carousel / Strip */}
      <div className="flex items-center gap-2 mt-2.5 overflow-x-auto pb-1">
        {filteredPatients.map((p) => {
          const isSelected = p.id === selectedPatientId;
          const hasCriticalQuality = p.dataQualityIssues.some((d) => d.severity === 'CRITICAL');

          return (
            <button
              key={p.id}
              onClick={() => onSelectPatient(p)}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-xs text-left transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-slate-800 border-teal-500/80 text-white shadow-sm ring-1 ring-teal-500/30'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  hasCriticalQuality ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
              />
              <div className="flex flex-col">
                <div className="font-medium flex items-center gap-1.5">
                  <span>{p.name}</span>
                  <span className="text-[11px] text-slate-400 font-normal">({p.persianName})</span>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1 tabular-figures">
                  <span>کد ملی: {p.nationalId}</span>
                  <span>·</span>
                  <span>{p.age}y</span>
                  <span>·</span>
                  <span>{p.householdNumber}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
