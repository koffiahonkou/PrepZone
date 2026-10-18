import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { AuditLog } from '@/src/types';

export async function logAuditEvent(entry: Omit<AuditLog, 'id' | 'timestamp'> & { timestamp?: string }): Promise<void> {
  try {
    const colRef = collection(db, 'auditLogs');
    await addDoc(colRef, {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
    });
  } catch (error) {
    // Non-blocking for UI stability
    console.warn('Could not record audit log:', error);
  }
}
