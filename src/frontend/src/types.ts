export interface Company {
  companyId: string;
  loginCode: string;
  name: string;
  sector: string;
  address: string;
  authorizedPerson: string;
  logoUrl?: string;
  workingHours?: string;
  maxConcurrentVisitors: number;
  dataRetentionDays: number;
  createdAt: number;
}

export interface Staff {
  staffId: string;
  companyId: string;
  name: string;
  role: "admin" | "receptionist" | "staff";
  availabilityStatus: "available" | "in_meeting" | "outside";
  createdAt: number;
}

export interface Visitor {
  visitorId: string;
  companyId: string;
  registeredBy: string;
  name: string;
  idNumber: string;
  phone: string;
  hostStaffId: string;
  arrivalTime: number;
  departureTime?: number;
  visitReason: string;
  visitType: string;
  ndaAccepted: boolean;
  signatureData: string;
  vehiclePlate?: string;
  label: "normal" | "vip" | "attention" | "restricted";
  status: "active" | "departed" | "preregistered";
  badgeQr: string;
  notes: string;
  rating?: number;
  exitRating?: number;
  exitComment?: string;
  createdAt: number;
}

export interface BlacklistEntry {
  companyId: string;
  idNumber: string;
  reason: string;
  addedBy: string;
  addedAt: number;
}

export interface Announcement {
  id: string;
  companyId: string;
  message: string;
  createdBy: string;
  createdAt: number;
}

export interface Appointment {
  id: string;
  companyId: string;
  visitorName: string;
  visitorId: string;
  hostName: string;
  appointmentDate: string;
  appointmentTime: string;
  purpose: string;
  notes?: string;
  status: "pending" | "approved" | "cancelled";
  createdBy: string;
  createdAt: number;
}

export interface Session {
  type: "company" | "staff";
  companyId: string;
  staffId?: string;
  staffRole?: string;
  expiresAt: number;
}

export type AppScreen =
  | "language"
  | "welcome"
  | "company-register"
  | "staff-register"
  | "company-login"
  | "staff-login"
  | "company-dashboard"
  | "staff-dashboard"
  | "verify";
