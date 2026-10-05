import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Trash2, X, Send, Wifi, WifiOff, Database } from 'lucide-react';
import { QueuedSibTransaction, ConnectivityStatus } from '../types/sib';
import {
  clearSyncedTransactions,
  markTransactionSynced,
  markTransactionSyncing,
  retryTransaction,
} from '../services/syncQueueService';

interface SyncQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: QueuedSibTransaction[];
  onTransactionsUpdated: () => void;
  connectivity: ConnectivityStatus;
  isFarsi: boolean;
}

export const SyncQueueDrawer: React.FC<SyncQueueDrawerProps> = ({
  isOpen,
  onClose,
  transactions,
  onTransactionsUpdated,
  connectivity,
  isFarsi,
}) => {
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  if (!isOpen) return null;

  const queuedList = transactions.filter((t) => t.status === 'QUEUED' || t.status === 'FAILED');
  const syncedList = transactions.filter((t) => t.status === 'SYNCED');

  const handleSyncAll = async () => {
    if (connectivity === 'OFFLINE') {
      alert(
        isFarsi
          ? 'دستگاه در حالت آفلاین است. لطفا وضعیت اتصال را به آنلاین تغییر دهید.'
          : 'System is currently set to OFFLINE. Switch connectivity to ONLINE to synchronize.'
      );
      return;
    }

    setIsSyncingAll(true);
    for (const tx of queuedList) {
      markTransactionSyncing(tx.id);
      onTransactionsUpdated();
      await new Promise((r) => setTimeout(r, 600));
      markTransactionSynced(tx.id);
    }
    setIsSyncingAll(false);
    onTransactionsUpdated();
  };

  const handleClearCompleted = () => {
    clearSyncedTransactions();
    onTransactionsUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-lg h-full bg-slate-900 border-l border-slate-800 p-6 flex flex-col shadow-2xl overflow-hidden">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 text-teal-400 ${isSyncingAll ? 'animate-spin' : ''}`} />
            <div>
              <h3 className="text-sm font-bold text-white">
                {isFarsi ? 'بافر هماهنگ‌سازی آفلاین سیب' : 'SIB Offline Synchronization Buffer'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isFarsi ? 'مدیریت ارسال‌های در صف در مناطق کم‌برخوردار' : 'Rural-health safe local preparation queue'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Connectivity Status Banner */}
        <div
          className={`p-3 rounded-xl border mb-4 text-xs flex items-center justify-between ${
            connectivity === 'ONLINE'
              ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
              : connectivity === 'DEGRADED'
              ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
              : 'bg-rose-950/20 border-rose-800/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {connectivity === 'ONLINE' ? (
              <Wifi className="w-4 h-4 text-emerald-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-rose-400" />
            )}
            <span className="font-semibold">
              {isFarsi ? 'وضعیت ارتباط فعلی: ' : 'Current Link: '}
              {connectivity}
            </span>
          </div>

          <div className="text-[10px] tabular-figures font-mono">
            {queuedList.length} {isFarsi ? 'تراکنش در صف' : 'pending'}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <button
            disabled={queuedList.length === 0 || isSyncingAll}
            onClick={handleSyncAll}
            className="flex-1 py-2 px-3 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
            <span>{isSyncingAll ? (isFarsi ? 'در حال هماهنگ‌سازی...' : 'Syncing...') : isFarsi ? 'هماهنگ‌سازی همه تراکنش‌ها' : 'Synchronize All Pending'}</span>
          </button>

          {syncedList.length > 0 && (
            <button
              onClick={handleClearCompleted}
              className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors flex items-center gap-1.5 border border-slate-700"
              title="Clear completed logs"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{isFarsi ? 'پاک‌سازی ثبت‌شده‌ها' : 'Clear Synced'}</span>
            </button>
          )}
        </div>

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <Database className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-60" />
              {isFarsi
                ? 'صف ارسال خالی است. تمامی اقدامات قبلی در سیب ثبت شده‌اند.'
                : 'Offline buffer is empty. All encounters are fully committed to SIB.'}
            </div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className={`p-3 rounded-xl border transition-all ${
                  tx.status === 'SYNCED'
                    ? 'bg-slate-950/40 border-slate-800 text-slate-400'
                    : tx.status === 'FAILED'
                    ? 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                    : 'bg-slate-800/60 border-slate-700/80 text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] text-teal-400 font-bold">
                    {tx.id}
                  </span>

                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded font-semibold ${
                      tx.status === 'SYNCED'
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                        : tx.status === 'FAILED'
                        ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                        : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                    }`}
                  >
                    {tx.status}
                  </span>
                </div>

                <div className="font-semibold text-xs text-white">
                  {tx.patientName}
                </div>

                <div className="text-[11px] text-slate-400 tabular-figures mt-0.5">
                  کد ملی: {tx.nationalId} · {tx.jalaliTimestamp}
                </div>

                <div className="mt-2 text-[11px] space-y-0.5 border-t border-slate-800/60 pt-1.5 text-slate-300">
                  {tx.changesSummary.map((ch, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-teal-400" />
                      <span>{ch}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Signed by: {tx.clinicianName}</span>
                  {tx.status === 'FAILED' && (
                    <button
                      onClick={() => {
                        markTransactionSyncing(tx.id);
                        setTimeout(() => retryTransaction(tx.id, true), 500);
                        onTransactionsUpdated();
                      }}
                      className="text-amber-400 hover:underline"
                    >
                      {isFarsi ? 'تلاش مجدد' : 'Retry'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
