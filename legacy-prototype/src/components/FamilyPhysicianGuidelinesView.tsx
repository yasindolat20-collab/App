import React, { useState } from 'react';
import { BookOpen, Search, ShieldCheck, CheckCircle2, ChevronDown, ChevronRight, FileText, Sparkles, Filter, ExternalLink } from 'lucide-react';
import { MOH_FAMILY_PHYSICIAN_PROTOCOLS, FamilyPhysicianProtocol } from '../data/familyPhysicianProtocols';
import { Patient, CurrentVisitDraft } from '../types/sib';

interface FamilyPhysicianGuidelinesViewProps {
  patient: Patient;
  onApplyGuidelineAction: (actionText: string) => void;
  isFarsi: boolean;
}

export const FamilyPhysicianGuidelinesView: React.FC<FamilyPhysicianGuidelinesViewProps> = ({
  patient,
  onApplyGuidelineAction,
  isFarsi,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedProtocolId, setExpandedProtocolId] = useState<string | null>(
    MOH_FAMILY_PHYSICIAN_PROTOCOLS[0].id
  );

  const filteredProtocols = MOH_FAMILY_PHYSICIAN_PROTOCOLS.filter((p) => {
    const matchesSearch =
      p.titleFa.includes(searchTerm) ||
      p.titleEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.targetGroupFa.includes(searchTerm) ||
      p.keyActionsFa.some((a) => a.includes(searchTerm));

    if (!matchesSearch) return false;
    if (selectedCategory === 'ALL') return true;
    return p.category === selectedCategory;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white">
              {isFarsi
                ? 'دستورالعمل‌های بالینی پزشک خانواده و بسته‌های خدمت سامانه سیب'
                : 'Iranian Family Physician Clinical Practice Guidelines & SIB Service Packages'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isFarsi
              ? 'مستند به دستورالعمل نسخه ۰۳ پزشک خانواده و نظام ارجاع وزارت بهداشت، درمان و آموزش پزشکی'
              : 'Referenced from Version 03 Family Physician & Referral Network Guidelines (Ministry of Health)'}
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-teal-300">
          MoH-PrimaryCare-Standard-v3
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              isFarsi
                ? 'جستجو در پروتکل‌های دیابت، فشار خون، ایراپن، مادران، سرطان، ارجاع...'
                : 'Search protocols by disease, target group, or action...'
            }
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-teal-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isFarsi ? 'همه پروتکل‌ها' : 'All'}
          </button>

          <button
            onClick={() => setSelectedCategory('CHRONIC_NCD')}
            className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'CHRONIC_NCD'
                ? 'bg-teal-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isFarsi ? 'بیماری‌های غیرواگیر (NCD)' : 'Chronic NCD'}
          </button>

          <button
            onClick={() => setSelectedCategory('MATERNAL_CHILD')}
            className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'MATERNAL_CHILD'
                ? 'bg-teal-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isFarsi ? 'سلامت مادر و کودک' : 'Maternal & Child'}
          </button>

          <button
            onClick={() => setSelectedCategory('SCREENING_CANCER')}
            className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'SCREENING_CANCER'
                ? 'bg-teal-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isFarsi ? 'غربالگری سرطان‌ها' : 'Cancer Screening'}
          </button>

          <button
            onClick={() => setSelectedCategory('REFERRAL_SYSTEM')}
            className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'REFERRAL_SYSTEM'
                ? 'bg-teal-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isFarsi ? 'نظام ارجاع و پس‌خوراند' : 'Referral & Feedback'}
          </button>
        </div>
      </div>

      {/* Protocols List */}
      <div className="space-y-4">
        {filteredProtocols.map((proto) => {
          const isExpanded = expandedProtocolId === proto.id;

          return (
            <div
              key={proto.id}
              className={`rounded-xl border transition-all overflow-hidden ${
                isExpanded
                  ? 'bg-slate-950/80 border-teal-500/70 shadow-md ring-1 ring-teal-500/20'
                  : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div
                onClick={() => setExpandedProtocolId(isExpanded ? null : proto.id)}
                className="p-4 flex items-start justify-between cursor-pointer gap-3"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-teal-950 text-teal-300 border border-teal-800/40">
                      {proto.category}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {proto.sibFormCode}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">
                    {isFarsi ? proto.titleFa : proto.titleEn}
                  </h3>

                  <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                    <span>
                      <strong className="text-slate-300">{isFarsi ? 'جامعه هدف: ' : 'Target: '}</strong>
                      {isFarsi ? proto.targetGroupFa : proto.targetGroup}
                    </span>
                    <span>·</span>
                    <span>
                      <strong className="text-slate-300">{isFarsi ? 'توالی مراقبت: ' : 'Schedule: '}</strong>
                      {proto.frequencyFa}
                    </span>
                  </div>
                </div>

                <div className="p-1 text-slate-400 hover:text-white shrink-0">
                  {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 border-t border-slate-800/80 space-y-3.5 text-xs text-slate-300 bg-slate-900/50">
                  <div>
                    <div className="font-semibold text-teal-300 mb-2 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-teal-400" />
                      <span>{isFarsi ? 'اقدامات کلیدی پزشک خانواده و بهورز در سامانه سیب:' : 'Mandatory Clinical Actions in SIB:'}</span>
                    </div>

                    <div className="space-y-2">
                      {proto.keyActionsFa.map((act, i) => (
                        <div
                          key={i}
                          className="flex items-start justify-between gap-3 p-2 rounded-lg bg-slate-950 border border-slate-800/80 hover:border-slate-700"
                        >
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                            <span className="text-slate-200 leading-relaxed">{act}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => onApplyGuidelineAction(act)}
                            className="px-2.5 py-1 rounded bg-teal-900/60 hover:bg-teal-800 text-teal-200 text-[10px] font-semibold border border-teal-500/30 whitespace-nowrap transition-colors shrink-0"
                            title="Insert this action into the active patient consultation draft"
                          >
                            {isFarsi ? 'درج در ویزیت' : 'Stage in Draft'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Clinical Pearls */}
                  <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-amber-200 text-xs">
                    <span className="font-bold">{isFarsi ? 'نکته کاربردی دستورالعمل: ' : 'Guideline Pearl: '}</span>
                    <span>{proto.clinicalPearlsFa}</span>
                  </div>

                  {/* Source Reference */}
                  <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-2 flex items-center justify-between">
                    <span>
                      <strong className="text-slate-400">{isFarsi ? 'مرجع رسمی: ' : 'MoH Reference: '}</strong>
                      {proto.mohGuidelineRef}
                    </span>
                    <span className="font-mono text-teal-400">{proto.sibFormCode}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
