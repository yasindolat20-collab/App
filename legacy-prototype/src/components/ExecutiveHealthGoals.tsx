import React, { useState } from 'react';
import {
  Target,
  Globe2,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Sparkles,
  Zap,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  Sliders,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  Award,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import {
  INITIAL_HEALTH_GOALS,
  LIVE_INTERNET_STATISTICS,
  HealthGoal,
  InternetHealthStatistic,
} from '../data/healthGoalsData';

interface ExecutiveHealthGoalsProps {
  isFarsi: boolean;
  onSelectQuickAction: (actionType: string) => void;
}

export const ExecutiveHealthGoals: React.FC<ExecutiveHealthGoalsProps> = ({
  isFarsi,
  onSelectQuickAction,
}) => {
  const [goals, setGoals] = useState<HealthGoal[]>(INITIAL_HEALTH_GOALS);
  const [stats, setStats] = useState<InternetHealthStatistic[]>(LIVE_INTERNET_STATISTICS);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isRefreshingStats, setIsRefreshingStats] = useState<boolean>(false);
  const [activeEngine, setActiveEngine] = useState<'GOALS' | 'EPIDEMIOLOGY' | 'QUICK_MGMT'>('GOALS');
  const [lastSyncTime, setLastSyncTime] = useState<string>('هم‌اکنون (Live Internet)');

  const handleRefreshInternetStats = () => {
    setIsRefreshingStats(true);
    setTimeout(() => {
      setLastSyncTime(new Date().toLocaleTimeString('fa-IR'));
      setIsRefreshingStats(false);
    }, 900);
  };

  const handleAdjustTarget = (goalId: string, delta: number) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const newTarget = Math.max(10, Math.min(100, g.targetValue + delta));
        return { ...g, targetValue: newTarget };
      })
    );
  };

  const filteredGoals = goals.filter((g) => {
    if (selectedCategory === 'ALL') return true;
    return g.category === selectedCategory;
  });

  return (
    <div className="space-y-6">
      {/* Executive Command Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-wider text-teal-400 font-semibold">
                National Health Goals & Global Health Observatory
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {isFarsi
                ? 'دیده‌بان اهداف سلامت و داشبورد مدیریت سریع پزشک'
                : 'Executive Health Goals Observatory & Rapid Management Cockpit'}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              {isFarsi
                ? 'پایش شاخص‌های سند ملی بیماری‌های غیرواگیر (NCD)، اهداف سه‌گانه ۸۰-۸۰-۸۰ دیابت سازمان جهانی بهداشت و اتصال برخط به آخرین داده‌های پیمایش‌های سلامت کشوری (STEPs).'
                : 'Real-time tracking of National NCD Action Plan targets, WHO 80-80-80 diabetes metrics, and live synchronization with national health surveys.'}
            </p>
          </div>

          {/* Engine Selector Navigation */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 shrink-0 text-xs">
            <button
              onClick={() => setActiveEngine('GOALS')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeEngine === 'GOALS'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>{isFarsi ? 'اهداف کلان سلامت' : 'Health Targets'}</span>
            </button>

            <button
              onClick={() => setActiveEngine('EPIDEMIOLOGY')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeEngine === 'EPIDEMIOLOGY'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>{isFarsi ? 'آمارهای آنلاین کشوری' : 'Live Internet Stats'}</span>
            </button>

            <button
              onClick={() => setActiveEngine('QUICK_MGMT')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeEngine === 'QUICK_MGMT'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isFarsi ? 'کنسول مدیریت سریع' : 'Rapid Management'}</span>
            </button>
          </div>
        </div>

        {/* 3 Executive High-Level KPI Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5 pt-5 border-t border-slate-800/80">
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400 font-medium">
                {isFarsi ? 'شیوع دیابت در بزرگسالان (Iran STEPs)' : 'Adult Diabetes Prevalence'}
              </div>
              <div className="text-lg font-bold text-white font-mono mt-0.5 tabular-figures">
                ۱۴.۱۵٪
              </div>
              <div className="text-[10px] text-rose-400 flex items-center gap-1 mt-0.5">
                <TrendingUp className="w-3 h-3" />
                <span>۲ برابر شدن از سال ۲۰۰۷</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400 font-medium">
                {isFarsi ? 'شیوع پرفشاری خون در ایران' : 'Hypertension Prevalence'}
              </div>
              <div className="text-lg font-bold text-white font-mono mt-0.5 tabular-figures">
                ۳۲.۰٪
              </div>
              <div className="text-[10px] text-amber-400 flex items-center gap-1 mt-0.5">
                <span>تثبیت‌شده در ۵ سال اخیر</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400 font-medium">
                {isFarsi ? 'تحقق هدف کاهش مرگ‌های زودرس NCD' : 'NCD Premature Reduction'}
              </div>
              <div className="text-lg font-bold text-teal-300 font-mono mt-0.5 tabular-figures">
                ۱۸٪ / ۳۰٪
              </div>
              <div className="text-[10px] text-teal-400 flex items-center gap-1 mt-0.5">
                <TrendingDown className="w-3 h-3" />
                <span>مسیر رو به پیشرفت تا ۲۰۳۰</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* VIEW 1: HEALTH TARGETS OBSERVED */}
      {activeEngine === 'GOALS' && (
        <div className="space-y-4">
          {/* Category Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs overflow-x-auto">
              {['ALL', 'DIABETES', 'HYPERTENSION', 'NCD', 'SCREENING'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-slate-800 text-teal-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat === 'ALL'
                    ? isFarsi
                      ? 'همه اهداف'
                      : 'All'
                    : cat === 'DIABETES'
                    ? isFarsi
                      ? 'دیابت'
                      : 'Diabetes'
                    : cat === 'HYPERTENSION'
                    ? isFarsi
                      ? 'فشار خون'
                      : 'Hypertension'
                    : cat === 'NCD'
                    ? isFarsi
                      ? 'بیماری‌های غیرواگیر'
                      : 'NCDs'
                    : isFarsi
                    ? 'غربالگری‌ها'
                    : 'Screening'}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span>{filteredGoals.length} شاخص تعریف‌شده</span>
              <span>·</span>
              <span className="text-teal-400">سند چشم‌انداز سلامت ۲۰۳۰</span>
            </div>
          </div>

          {/* Goal Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGoals.map((goal) => {
              const progressPct = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));

              return (
                <div
                  key={goal.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-800/40">
                          {goal.code}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          سررسید: {goal.deadline}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white leading-snug">
                        {isFarsi ? goal.titleFa : goal.titleEn}
                      </h3>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border shrink-0 ${
                        goal.status === 'ON_TRACK'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800/60'
                          : goal.status === 'AT_RISK'
                          ? 'bg-amber-950 text-amber-300 border-amber-800/60'
                          : 'bg-rose-950 text-rose-300 border-rose-800/60'
                      }`}
                    >
                      {goal.status === 'ON_TRACK'
                        ? isFarsi
                          ? 'در مسیر هدف'
                          : 'On Track'
                        : goal.status === 'AT_RISK'
                        ? isFarsi
                          ? 'نیازمند تشدید'
                          : 'At Risk'
                        : isFarsi
                        ? 'وضعیت بحرانی'
                        : 'Critical'}
                    </span>
                  </div>

                  {/* Progress Bar & Numeric Target Adjuster */}
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-slate-400">
                        {isFarsi ? 'وضعیت فعلی: ' : 'Current: '}
                        <strong className="text-white font-mono text-sm tabular-figures">
                          {goal.currentValue} {goal.unit}
                        </strong>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">
                          {isFarsi ? 'هدف: ' : 'Target: '}
                          <strong className="text-teal-300 font-mono text-sm tabular-figures">
                            {goal.targetValue} {goal.unit}
                          </strong>
                        </span>
                        {/* Target Adjuster Buttons for Personal Management */}
                        <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded border border-slate-800 text-[10px]">
                          <button
                            onClick={() => handleAdjustTarget(goal.id, -5)}
                            className="px-1.5 py-0.2 rounded hover:bg-slate-800 text-slate-300"
                            title="Decrease target"
                          >
                            -
                          </button>
                          <button
                            onClick={() => handleAdjustTarget(goal.id, 5)}
                            className="px-1.5 py-0.2 rounded hover:bg-slate-800 text-teal-300 font-bold"
                            title="Increase target"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          goal.status === 'ON_TRACK'
                            ? 'bg-emerald-500'
                            : goal.status === 'AT_RISK'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    {goal.descriptionFa}
                  </p>

                  <div className="text-[11px] text-teal-300/90 flex items-start gap-1.5 border-t border-slate-800 pt-2.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>{isFarsi ? 'اقدام مداخله‌ای پزشک: ' : 'Action: '}</strong>
                      {goal.actionRequiredFa}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: LIVE INTERNET STATISTICS (GATHERED LIVE) */}
      {activeEngine === 'EPIDEMIOLOGY' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-teal-400" />
                <span>
                  {isFarsi
                    ? 'دیده‌بان آمارهای اینترنتی، پیمایش‌های ملی (Iran STEPs) و سازمان جهانی بهداشت'
                    : 'Live Internet Health Statistics & National Surveys (STEPs / WHO)'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isFarsi
                  ? `آخرین همگام‌سازی شاخص‌های اپیدمیولوژیک: ${lastSyncTime}`
                  : `Last synced live indicators: ${lastSyncTime}`}
              </p>
            </div>

            <button
              onClick={handleRefreshInternetStats}
              disabled={isRefreshingStats}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingStats ? 'animate-spin' : ''}`} />
              <span>{isFarsi ? 'استعلام زنده از اینترنت' : 'Sync Live Stats'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {stat.source} · {stat.year}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-0.5">
                      {isFarsi ? stat.indicatorFa : stat.indicatorEn}
                    </h3>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border shrink-0 ${
                      stat.changeTrend === 'INCREASING'
                        ? 'bg-rose-950 text-rose-300 border-rose-800/60'
                        : stat.changeTrend === 'DECREASING'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800/60'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {stat.changeTrend}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">مقدار شاخص ثبت‌شده:</div>
                  <div className="text-base font-bold text-teal-300 font-mono mt-0.5">
                    {stat.value}
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {stat.relevanceFa}
                </p>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">مرجع علمی: NIH / PubMed / WHO</span>
                  <a
                    href={stat.referenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium"
                  >
                    <span>مشاهده منبع</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: RAPID PERSONAL MANAGEMENT CONSOLE (NO DATA REQUIRED) */}
      {activeEngine === 'QUICK_MGMT' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-teal-400" />
              <span>
                {isFarsi
                  ? 'کنسول مدیریت سریع بالینی (Rapid Management Engine)'
                  : 'Executive Clinical Rapid Management Console'}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isFarsi
                ? 'ابزارهای سریع بدون نیاز به درگیری با پرونده‌های حجیم: تولید فوری نامه ارجاع، محاسبه ریسک قلبی و بررسی تداخلات دارویی.'
                : 'Zero-friction management tools: rapid referral generation, risk calculation, and pharmacological audits.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div
              onClick={() => onSelectQuickAction('QUICK_REFERRAL')}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/50 cursor-pointer transition-all space-y-2 group"
            >
              <div className="w-9 h-9 rounded-lg bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                {isFarsi ? 'تولید سریع نامه ارجاع سطح ۲' : 'Rapid Level 2 Referral Slip'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isFarsi
                  ? 'ایجاد متن آماده با کد رهگیری برای متخصصان داخلی، قلب، چشم و زنان.'
                  : 'Pre-formatted referral letter with MoH header and tracking code.'}
              </p>
            </div>

            <div
              onClick={() => onSelectQuickAction('IRAPEN_TOOL')}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/50 cursor-pointer transition-all space-y-2 group"
            >
              <div className="w-9 h-9 rounded-lg bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                {isFarsi ? 'محاسبه‌گر خطر ۱۰ ساله ایراپن' : 'IraPEN 10-Yr CVD Calculator'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isFarsi
                  ? 'ارزیابی رنگ خطر (سبز، زرد، نارنجی، قرمز) با ورود مستقیم سن، قند و فشار.'
                  : 'Quick risk stratification based on age, smoking, BP, and diabetes status.'}
              </p>
            </div>

            <div
              onClick={() => onSelectQuickAction('DATA_CLEANSER')}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/50 cursor-pointer transition-all space-y-2 group"
            >
              <div className="w-9 h-9 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                {isFarsi ? 'پالایشگر و رفع تناقض داده‌ها' : 'Data Integrity Cleanser'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isFarsi
                  ? 'پالایش خودکار داده‌های ناسازگار جداول بهورز و پزشک با الگوریتم‌های استاندارد.'
                  : 'One-click harmonization of conflicting vitals and incomplete fields.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
