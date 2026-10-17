import { Timestamp } from 'firebase/firestore';

/**
 * Formats any date value (Firestore Timestamp, Date, or string) into YYYY-MM-DD for HTML <input type="date">
 */
export function formatDateForInput(val: any): string {
  if (!val) return '';
  try {
    if (typeof val === 'object' && typeof val.toDate === 'function') {
      return val.toDate().toISOString().split('T')[0];
    }
    if (typeof val === 'object' && typeof val.seconds === 'number') {
      return new Date(val.seconds * 1000).toISOString().split('T')[0];
    }
    if (val instanceof Date) {
      return val.toISOString().split('T')[0];
    }
    if (typeof val === 'string') {
      if (val.includes('T')) return val.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
      const parsed = new Date(val);
      if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
    }
  } catch (err) {
    console.warn('Date parsing error:', err);
  }
  return '';
}

/**
 * Formats any date value for display in tables/cards
 */
export function formatDateForDisplay(val: any): string {
  const str = formatDateForInput(val);
  if (!str) return '—';
  return str;
}

/**
 * Calculates days remaining from today until target date. Returns null if invalid or empty.
 */
export function getDaysRemaining(val: any): number | null {
  if (!val) return null;
  let date: Date | null = null;
  try {
    if (typeof val === 'object' && typeof val.toDate === 'function') {
      date = val.toDate();
    } else if (typeof val === 'object' && typeof val.seconds === 'number') {
      date = new Date(val.seconds * 1000);
    } else if (val instanceof Date) {
      date = val;
    } else if (typeof val === 'string' && val.trim() !== '') {
      const parts = val.split('T')[0].split('-');
      if (parts.length === 3) {
        date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      } else {
        date = new Date(val);
      }
    }
  } catch (e) {
    return null;
  }

  if (!date || isNaN(date.getTime())) return null;

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffMs = dateStart.getTime() - todayStart.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function toFirestoreTimestamp(dateStr: string): Timestamp | null {
  if (!dateStr || !dateStr.trim()) return null;
  try {
    const cleanStr = dateStr.trim();
    const d = new Date(cleanStr.includes('T') ? cleanStr : `${cleanStr}T00:00:00`);
    if (isNaN(d.getTime())) return null;
    return Timestamp.fromDate(d);
  } catch (err) {
    console.warn('Failed to convert to Firestore Timestamp:', err);
    return null;
  }
}
