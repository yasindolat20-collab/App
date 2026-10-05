import { QueuedSibTransaction } from '../types/sib';

const QUEUE_STORAGE_KEY = 'omega_sib_offline_queue_v1';

export function getQueuedTransactions(): QueuedSibTransaction[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read SIB sync queue:', e);
    return [];
  }
}

export function saveQueuedTransactions(transactions: QueuedSibTransaction[]): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(transactions));
  } catch (e) {
    console.error('Failed to persist SIB sync queue:', e);
  }
}

export function enqueueSibTransaction(
  patientId: string,
  patientName: string,
  nationalId: string,
  changesSummary: string[],
  fieldsPayload: Record<string, unknown>,
  clinicianName: string,
  autoSyncIfOnline: boolean = false,
  isOnline: boolean = true
): QueuedSibTransaction {
  const currentList = getQueuedTransactions();
  const now = new Date();
  
  // Approximate Jalali date for display
  const jalaliYear = now.getFullYear() - 621;
  const jalaliMonth = String((now.getMonth() + 7) % 12 + 1).padStart(2, '0');
  const jalaliDay = String(now.getDate()).padStart(2, '0');
  const jalaliTimestamp = `${jalaliYear}/${jalaliMonth}/${jalaliDay} - ${now.toLocaleTimeString('fa-IR', { hour12: false })}`;

  const newTx: QueuedSibTransaction = {
    id: `TX-SIB-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 899 + 100)}`,
    patientId,
    patientName,
    nationalId,
    timestamp: now.toISOString(),
    jalaliTimestamp,
    changesSummary,
    fieldsPayload,
    clinicianName,
    clinicianPinConfirmed: true,
    status: isOnline && autoSyncIfOnline ? 'SYNCED' : 'QUEUED',
    retryCount: 0,
  };

  const updated = [newTx, ...currentList];
  saveQueuedTransactions(updated);
  return newTx;
}

export function markTransactionSyncing(txId: string): void {
  const list = getQueuedTransactions();
  const updated = list.map(item => (item.id === txId ? { ...item, status: 'SYNCING' as const } : item));
  saveQueuedTransactions(updated);
}

export function markTransactionSynced(txId: string): void {
  const list = getQueuedTransactions();
  const updated = list.map(item => (item.id === txId ? { ...item, status: 'SYNCED' as const } : item));
  saveQueuedTransactions(updated);
}

export function retryTransaction(txId: string, success: boolean): void {
  const list = getQueuedTransactions();
  const updated = list.map(item => {
    if (item.id !== txId) return item;
    return {
      ...item,
      status: success ? ('SYNCED' as const) : ('FAILED' as const),
      retryCount: item.retryCount + 1,
      errorMessage: success ? undefined : 'SIB Gateway connection timed out (HTTP 504 SIB_GATEWAY_TIMEOUT)',
    };
  });
  saveQueuedTransactions(updated);
}

export function clearSyncedTransactions(): void {
  const list = getQueuedTransactions();
  const unSynced = list.filter(item => item.status !== 'SYNCED');
  saveQueuedTransactions(unSynced);
}
