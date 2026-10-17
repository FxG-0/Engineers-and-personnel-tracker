import { LocationType, Engineer } from '../types';
import { formatDateForInput, getDaysRemaining } from './dateUtils';

export const LOCATION_TYPE_OPTIONS: LocationType[] = ['Rig', 'Home', 'Office', 'Available', 'SNOC', 'Other'];

export function parseLocationData(data: any): {
  locationType: LocationType;
  rigName: string;
  status: string;
  locationDisplay: string;
} {
  let locationType: LocationType = 'Other';
  let rigName = '';

  if (data.locationType && LOCATION_TYPE_OPTIONS.includes(data.locationType as LocationType)) {
    locationType = data.locationType as LocationType;
    rigName = locationType === 'Rig' ? (data.rigName || '') : '';
  } else if (data.location && typeof data.location === 'string' && data.location.trim() !== '') {
    // Migration logic: If existing document has old 'location' string, migrate to locationType='Rig' & rigName=old location
    locationType = 'Rig';
    rigName = data.location.trim();
  } else {
    locationType = 'Other';
    rigName = '';
  }

  const status = locationType === 'Rig' ? 'On Rig' : 'Off Rig';
  const locationDisplay = locationType === 'Rig' ? (rigName ? `Rig (${rigName})` : 'Rig') : locationType;

  return { locationType, rigName, status, locationDisplay };
}

/**
 * Formats any date into a clean format e.g. 9-Jan-2027
 */
export function formatDateNice(val: any): string {
  if (!val) return 'N/A';
  const inputStr = formatDateForInput(val);
  if (!inputStr) return 'N/A';
  const parts = inputStr.split('-');
  if (parts.length !== 3) return inputStr;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d}-${months[m - 1]}-${y}`;
}

export const EXPIRY_FIELDS_CONFIG: { key: keyof Engineer; label: string }[] = [
  { key: 'optimaExpiry', label: 'Optima Expiry' },
  { key: 'h2sExpiry', label: 'H2S Safety Expiry' },
  { key: 'tbosietExpiry', label: 'TBOSIET Expiry' },
  { key: 'visaExpiry', label: 'Visa Expiry' },
  { key: 'customerMedicalExpiry', label: 'Customer Medical Expiry' },
  { key: 'passportExpiry', label: 'Passport Expiry' },
  { key: 'eidExpiry', label: 'Emirates ID (EID) Expiry' },
  { key: 'onshoreSecurityPassExpiry', label: 'Onshore Security Pass Expiry' },
  { key: 'offshoreSecurityPassExpiry', label: 'Offshore Security Pass Expiry' },
  { key: 'wmsExpiry', label: 'WMS Expiry' },
];

export interface CriticalExpiry {
  key: keyof Engineer;
  label: string;
  days: number;
  dateNice: string;
  rawVal: any;
  message: string;
}

/**
 * Returns array of expiries that are <= 30 days or already expired for an engineer record
 */
export function getEngineerCriticalExpiries(engineer: Partial<Engineer>): CriticalExpiry[] {
  const result: CriticalExpiry[] = [];
  for (const field of EXPIRY_FIELDS_CONFIG) {
    const val = engineer[field.key];
    if (val) {
      const days = getDaysRemaining(val);
      if (days !== null && days <= 30) {
        const dateNice = formatDateNice(val);
        let message = '';
        if (days < 0) {
          message = `Your ${field.label} expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago (${dateNice})`;
        } else if (days === 0) {
          message = `Your ${field.label} expires today (${dateNice})`;
        } else {
          message = `Your ${field.label} is in ${days} day${days === 1 ? '' : 's'} (${dateNice})`;
        }
        result.push({
          key: field.key,
          label: field.label,
          days,
          dateNice,
          rawVal: val,
          message,
        });
      }
    }
  }
  return result;
}

