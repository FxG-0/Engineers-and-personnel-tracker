export type UserRole = 'user' | 'admin';

export interface UserDoc {
  role: UserRole;
  personId?: string;
  autoLinked?: boolean;
  email?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  role: UserRole;
  personId?: string;
}

export interface UserRecord {
  uid: string;
  email: string;
  role: UserRole;
  personId: string;
  autoLinked?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Engineer {
  id: string; // Document ID (keyed by personId e.g. "H287330")
  name: string;
  sapNumber: string;
  optimaNumber: string;
  optimaExpiry?: any; // Firestore Timestamp or Date/string
  h2sExpiry?: any;
  tbosietExpiry?: any;
  visaExpiry?: any;
  customerMedicalExpiry?: any;
  passportExpiry?: any;
  eidExpiry?: any;
  onshoreSecurityPassExpiry?: any;
  offshoreSecurityPassExpiry?: any;
  wmsExpiry?: any;
  uaeHomeContact: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PersonnelCategory = 'Consultant' | 'Commuter' | 'PRL' | 'Loan';

export type LocationType = 'Rig' | 'Home' | 'Office' | 'Available' | 'SNOC' | 'Other';

export interface Personnel {
  id: string; // Document ID (keyed by personId e.g. "H287330")
  name: string;
  hitchDays: number;
  dateArrivedAUH?: any; // Firestore Timestamp or Date/string
  dateTraveledHome?: any; // Firestore Timestamp or Date/string
  daysOff: number;
  category: PersonnelCategory;
  locationType: LocationType;
  rigName: string;
  location?: string; // Legacy fallback
  status: string;
  dateReturn?: any; // Firestore Timestamp or Date/string
  comments: string;
  createdAt?: string;
  updatedAt?: string;
}

