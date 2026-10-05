import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Check, X, Sparkles, HelpCircle, FileCheck } from 'lucide-react';
import { DataQualityIssue, ClinicalSuggestion } from '../types/sib';
import { ProvenanceBadge } from './ProvenanceBadge';

interface DataQualityAuditorProps {
  issues: DataQualityIssue[];
  suggestions: ClinicalSuggestion[];
  onResolveIssue: (id: string) => void;
  onToggleSuggestion: (id: string, accepted: boolean) => void;
  isFarsi: boolean;
}

export const DataQualityAuditor: React.FC<DataQualityAuditorProps> = ({
  issues,
  suggestions,
  onResolveIssue,
  onToggleSuggestion,
  isFarsi,
}) => {
  const [activeTab, setActiveTab] = useState<'ISSUES' | 'SUGGESTIONS'>('ISSUES');

  const unresolvedIssues = issues.filter((i) => !i.resolved);
  const criticalCount = unresolvedIssues.filter((i) => i.severity === 'CRITICAL').length;
  const warningCount = unresolvedIssues.filter((i) => i.severity === 'WARNING').length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full shadow-sm">
      {/* Tab Header */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 p-2.5">
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('ISSUES')}
            className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'ISSUES'
                ? 'bg-slate-800 text-teal-300 shadow-xs border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{isFarsi ? 'کیفیت داده سیب' : 'SIB Data Quality'}</span>
            {unresolvedIssues.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 tabular-figures">
                {unresolvedIssues.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('SUGGESTIONS')}
            className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'SUGGESTIONS'
                ? 'bg-slate-800 text-teal-300 shadow-xs border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{isFarsi ? 'پیشنهادات بالینی هوشمند' : 'AI Suggestions'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-teal-500/20 text-teal-300 border border-teal-500/30 tabular-figures">
              {suggestions.length}
            </span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 hidden sm:block">
          {isFarsi ? 'تفکیک دقیق فکت از استنتاج' : 'Strict Provenance Protocol'}
        </div>
      </div>

      {/* Tab 1: SIB Data Quality Issues (Duplicates, Missing Data, Contradictions) */}
      {activeTab === 'ISSUES' && (
        <div className="p-3.5 space-y-3 overflow-y-auto max-h-[520px]">
          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px]">
            <div className="flex items-center gap-1 text-rose-400">
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="font-semibold tabular-figures">{criticalCount}</span>
              <span>{isFarsi ? 'تناقض/تکراری بحرانی' : 'Critical/Duplicates'}</span>
            </div>
            <span className="text-slate-700">·</span>
            <div className="flex items-center gap-1 text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="font-semibold tabular-figures">{warningCount}</span>
              <span>{isFarsi ? 'نقص فیلد ضروری' : 'Missing Fields'}</span>
            </div>
          </div>

          {unresolvedIssues.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              {isFarsi
                ? 'داده‌های این پرونده در سامانه سیب بدون تناقض و یکپارچه است.'
                : 'All SIB records for this patient are verified and consistent.'}
            </div>
          ) : (
            unresolvedIssues.map((issue) => (
              <div
                key={issue.id}
                className={`p-3 rounded-xl border text-xs transition-all ${
                  issue.severity === 'CRITICAL'
                    ? 'bg-rose-950/20 border-rose-800/50 text-rose-200'
                    : issue.severity === 'WARNING'
                    ? 'bg-amber-950/20 border-amber-800/50 text-amber-200'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-semibold text-white">
                    {issue.severity === 'CRITICAL' ? (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span>{issue.title}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
                    {issue.type.replace('_', ' ')}
                  </span>
                </div>

                <p className="mt-1 text-[11px] text-slate-300 leading-relaxed">
                  {issue.description}
                </p>

                <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                  <span className="text-slate-500">SIB Module:</span>
                  <span className="font-mono text-slate-300">{issue.sibLocation}</span>
                </div>

                {issue.suggestedCorrection && (
                  <div className="mt-2 p-2 rounded bg-slate-900/80 border border-slate-800 text-[11px] text-teal-300">
                    <span className="font-semibold text-slate-300">
                      {isFarsi ? 'راهکار پیشنهادی: ' : 'Suggested resolution: '}
                    </span>
                    {issue.suggestedCorrection}
                  </div>
                )}

                <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <ProvenanceBadge badge={issue.provenance} compact />

                  <button
                    onClick={() => onResolveIssue(issue.id)}
                    className="px-2.5 py-1 rounded bg-teal-900/60 hover:bg-teal-800/80 border border-teal-500/40 text-teal-200 text-[10px] font-medium transition-colors flex items-center gap-1 whitespace-nowrap"
                  >
                    <Check className="w-3 h-3" />
                    <span>{isFarsi ? 'تطبیق و رفع مغایرت' : 'Reconcile & Resolve'}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: AI Suggestions with Strict Provenance */}
      {activeTab === 'SUGGESTIONS' && (
        <div className="p-3.5 space-y-3 overflow-y-auto max-h-[520px]">
          <div className="p-2.5 rounded-lg bg-teal-950/30 border border-teal-800/40 text-[11px] text-teal-300 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">
                {isFarsi ? 'اصول اعتماد و ایمنی بالینی: ' : 'Trust & Safety Principle: '}
              </span>
              <span>
                {isFarsi
                  ? 'تمامی پیشنهادات مشروط به تایید پزشک بوده و هیچ داده‌ای بدون تایید مستقیم به سیب منتقل نمی‌شود.'
                  : 'Suggestions assist workflow. Clinician retains full clinical authority before submission.'}
              </span>
            </div>
          </div>

          {suggestions.map((sug) => {
            const isAccepted = sug.accepted;
            const isRejected = sug.rejected;

            return (
              <div
                key={sug.id}
                className={`p-3 rounded-xl border text-xs transition-all ${
                  isAccepted
                    ? 'bg-emerald-950/20 border-emerald-500/50'
                    : isRejected
                    ? 'bg-slate-900/40 border-slate-800 opacity-60'
                    : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                    <span>{sug.title}</span>
                  </div>

                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                      sug.priority === 'HIGH'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : sug.priority === 'MEDIUM'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {sug.priority}
                  </span>
                </div>

                <p className="mt-1 text-[11px] text-slate-300 leading-relaxed">
                  {sug.rationale}
                </p>

                {sug.draftValue && (
                  <div className="mt-2 p-1.5 rounded bg-slate-950/70 border border-slate-800 text-[11px] font-mono text-teal-300">
                    <span className="text-slate-500 font-sans text-[10px] mr-1">
                      {isFarsi ? 'مقدار پیش‌نویس سیب: ' : 'Draft SIB Value: '}
                    </span>
                    {sug.draftValue}
                  </div>
                )}

                {/* Provenance Badge */}
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <ProvenanceBadge badge={sug.provenance} />

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onToggleSuggestion(sug.id, false)}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
                        isRejected
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-500/50'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                      }`}
                      title="Reject or dismiss this suggestion"
                    >
                      <X className="w-3 h-3" />
                      <span>{isFarsi ? 'رد' : 'Dismiss'}</span>
                    </button>

                    <button
                      onClick={() => onToggleSuggestion(sug.id, true)}
                      className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
                        isAccepted
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-teal-900/60 hover:bg-teal-800/80 border border-teal-500/40 text-teal-200'
                      }`}
                      title="Accept and stage into current visit for SIB submission"
                    >
                      <Check className="w-3 h-3" />
                      <span>
                        {isAccepted
                          ? isFarsi
                            ? 'پذیرفته شد ✓'
                            : 'Staged ✓'
                          : isFarsi
                          ? 'تایید و درج در ویزیت'
                          : 'Accept & Stage'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
