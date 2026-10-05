import React from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Layers,
  ShieldCheck,
  Database,
  Target,
  Stethoscope,
  Users,
  AlertOctagon,
} from 'lucide-react';
import { ConnectivityStatus } from '../types/sib';

export type MainTabType =
  | 'executive-goals'
  | 'clinical-intelligence'
  | 'command-center'
  | 'diagnostic-referral'
  | 'age-care'
  | 'guidelines'
  | 'bridge-view'
  | 'sync-queue';

interface HeaderProps {
  currentTab: MainTabType;
  onSelectTab: (tab: MainTabType) => void;
  connectivity: ConnectivityStatus;
  onChangeConnectivity: (status: ConnectivityStatus) => void;
  queuedCount: number;
  onOpenSyncDrawer: () => void;
  onOpenEmergencyModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  connectivity,
  onChangeConnectivity,
  queuedCount,
  onOpenSyncDrawer,
  onOpenEmergencyModal,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-2.5 bg-slate-950/95 border-b border-slate-800 text-slate-100 shadow-xl backdrop-blur-md">
      {/* Brand & Context */}
      <div className="flex items-center gap-3">
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('executive-goals');
          }}
          className="text-base font-bold tracking-tight text-white flex items-center gap-2 group"
        >
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-teal-600 text-white font-mono text-sm font-semibold shadow-inner group-hover:bg-teal-500 transition-colors">
            Ω
          </span>
          <span className="tracking-wide">Ω-SIB</span>
        </a>
        <div className="hidden 2xl:flex items-center gap-2 text-xs text-slate-400 border-l border-slate-800 pl-3">
          <Database className="w-3.5 h-3.5 text-teal-400" />
          <span>لایه هوشمند بالینی و دیده‌بان سلامت</span>
        </div>
      </div>

      {/* Main Navigation Links */}
      <nav className="hidden md:flex items-center gap-4 text-xs font-medium">
        <button
          onClick={() => onSelectTab('executive-goals')}
          className={`transition-all py-1 border-b-2 flex items-center gap-1.5 ${
            currentTab === 'executive-goals'
              ? 'border-teal-400 text-teal-300 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Health Goals & Live Stats</span>
        </button>

        <button
          onClick={() => onSelectTab('command-center')}
          className={`transition-all py-1 border-b-2 flex items-center gap-1.5 ${
            currentTab === 'command-center'
              ? 'border-teal-400 text-teal-300 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Patient Cockpit & Agent</span>
        </button>

        <button
          onClick={() => onSelectTab('diagnostic-referral')}
          className={`transition-all py-1 border-b-2 flex items-center gap-1.5 ${
            currentTab === 'diagnostic-referral'
              ? 'border-teal-400 text-teal-300 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Stethoscope className="w-3.5 h-3.5" />
          <span>Diagnosis & Referral</span>
        </button>

        <button
          onClick={() => onSelectTab('age-care')}
          className={`transition-all py-1 border-b-2 flex items-center gap-1.5 ${
            currentTab === 'age-care'
              ? 'border-teal-400 text-teal-300 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Age-Specific Care</span>
        </button>

        <button
          onClick={() => onSelectTab('guidelines')}
          className={`transition-all py-1 border-b-2 flex items-center gap-1.5 ${
            currentTab === 'guidelines'
              ? 'border-teal-400 text-teal-300 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Guidelines</span>
        </button>

        <button
          onClick={() => onSelectTab('bridge-view')}
          className={`transition-all py-1 border-b-2 flex items-center gap-1.5 ${
            currentTab === 'bridge-view'
              ? 'border-teal-400 text-teal-300 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Architecture</span>
        </button>
      </nav>

      {/* Emergency Button, Connectivity & Physician Session */}
      <div className="flex items-center gap-3">
        {/* Instant Emergency Red Flag Trigger */}
        {onOpenEmergencyModal && (
          <button
            onClick={onOpenEmergencyModal}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all animate-pulse shrink-0"
            title="Open Emergency Triage & Rescue Protocol"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">پروتکل اورژانس</span>
          </button>
        )}

        {/* Connectivity Selector */}
        <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs">
          <button
            onClick={() => onChangeConnectivity('ONLINE')}
            title="Direct low-latency connection to national SIB gateway"
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors ${
              connectivity === 'ONLINE'
                ? 'bg-slate-800 text-emerald-400 font-medium'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span className="hidden xl:inline text-[11px]">ONLINE</span>
          </button>

          <button
            onClick={() => onChangeConnectivity('DEGRADED')}
            title="Intermittent or high-latency link; responses cached"
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors ${
              connectivity === 'DEGRADED'
                ? 'bg-slate-800 text-amber-400 font-medium'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <RefreshCw className="w-3 h-3 text-amber-400" />
            <span className="hidden xl:inline text-[11px]">DEGRADED</span>
          </button>

          <button
            onClick={() => onChangeConnectivity('OFFLINE')}
            title="Local offline workspace; actions queued safely"
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors ${
              connectivity === 'OFFLINE'
                ? 'bg-slate-800 text-rose-400 font-medium'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <WifiOff className="w-3 h-3 text-rose-400" />
            <span className="hidden xl:inline text-[11px]">QUEUED</span>
          </button>
        </div>

        {/* Sync Buffer Drawer Trigger */}
        <button
          onClick={onOpenSyncDrawer}
          className="relative px-2 py-1 text-xs text-slate-300 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg transition-colors flex items-center gap-1"
          title="Open SIB Synchronization Buffer"
        >
          <RefreshCw className="w-3 h-3 text-slate-400" />
          <span className="hidden lg:inline text-[11px] font-mono text-slate-300">Buffer</span>
          {queuedCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
        </button>

        {/* Clinician Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-7 h-7 rounded-lg bg-teal-900/60 border border-teal-500/40 flex items-center justify-center text-xs font-bold text-teal-300">
            NA
          </div>
          <div className="hidden sm:block text-left leading-none">
            <div className="text-xs font-semibold text-white">Dr. N. Alavi, MD</div>
            <div className="text-[10px] text-slate-400 mt-0.5">پزشک خانواده</div>
          </div>
        </div>
      </div>
    </header>
  );
};
