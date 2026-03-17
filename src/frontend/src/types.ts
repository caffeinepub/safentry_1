export interface ScreeningQuestion {
  id: string;
  text: string;
  type: "yes_no" | "text";
  blocking: boolean;
}

export interface ExitQuestion {
  id: string;
  question: string;
  type: "rating" | "text" | "yesno";
}

export interface AlertHistoryEntry {
  id: string;
  companyId: string;
  type: "blacklist" | "capacity" | "afterhours" | "prescreening";
  timestamp: number;
  detail: string;
  personelId?: string;
}

export interface SentryNotification {
  id: string;
  companyId: string;
  type:
    | "kiosk_pending"
    | "blacklist_hit"
    | "capacity_warning"
    | "badge_expiry"
    | "permit_expiry"
    | "sla_breach"
    | "warning"
    | "info";
  message: string;
  createdAt: number;
  read: boolean;
  relatedId?: string;
}

export interface Department {
  id: string;
  companyId: string;
  name: string;
  floor: string;
  capacity: number;
}

export interface ContractorPermit {
  id: string;
  companyId: string;
  contractorName: string;
  idNumber: string;
  permitNumber: string;
  issueDate: string;
  expiryDate: string;
  insuranceInfo: string;
  createdAt: number;
}

export interface CategoryTimeRestriction {
  category: string;
  allowedStart: string; // HH:MM
  allowedEnd: string; // HH:MM
  allowedDays: number[]; // 0=Sun,1=Mon,...6=Sat
  strictMode: boolean;
}

export interface Invitation {
  token: string;
  companyId: string;
  createdBy: string;
  createdAt: number;
  visitorName: string;
  status: "pending" | "submitted" | "approved" | "rejected";
  preData?: {
    name: string;
    idNumber: string;
    phone: string;
    visitReason: string;
    hostName: string;
    department: string;
    floor: string;
  };
  rejectionReason?: string;
  hostName?: string;
}

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
  maxCapacity?: number;
  dataRetentionDays: number;
  createdAt: number;
  customCategories?: string[];
  customFields?: { id: string; label: string; required: boolean }[];
  autoCheckoutHours?: number;
  badgeValidityHours?: number;
  workingHoursStart?: number;
  workingHoursEnd?: number;
  kioskWelcomeMessage?: string;
  departments?: string[];
  floors?: string[];
  screeningQuestions?: ScreeningQuestion[];
  customExitQuestions?: ExitQuestion[];
  categoryNda?: Record<string, string>;
  badgeFields?: string[];
  parkingSpaces?: ParkingSpace[];
  slaThreshold?: number; // minutes, default 10
  categoryTimeRestrictions?: CategoryTimeRestriction[];
  categoryColors?: Record<string, string>;
  categoryMaxStay?: Record<string, number>;
  meetingTemplates?: MeetingTemplate[];
}

export interface Staff {
  staffId: string;
  companyId: string;
  name: string;
  role: "admin" | "receptionist" | "staff";
  availabilityStatus: "available" | "in_meeting" | "outside";
  createdAt: number;
  isAbsent?: boolean;
  absenceReason?: string;
  absentUntil?: string;
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
  category?: string;
  rating?: number;
  exitRating?: number;
  exitComment?: string;
  exitSurveyAnswers?: Record<string, string>;
  createdAt: number;
  customFieldValues?: Record<string, string>;
  shiftType?: "morning" | "afternoon" | "night";
  visitorPhoto?: string;
  specialNeeds?: string;
  multiDay?: boolean;
  endDate?: string;
  department?: string;
  floor?: string;
  equipment?: { type: string; id: string; assignedAt: string } | null;
  screeningAnswers?: { questionId: string; question: string; answer: string }[];
  privateNote?: string;
  parkingSpace?: string;
  groupId?: string;
}

export interface MeetingTemplate {
  id: string;
  name: string;
  dayOfWeek: number; // 0=Sun, 1=Mon, ...6=Sat
  time: string; // "HH:MM"
  hostStaffId: string;
  purpose: string;
  notes?: string;
  visitorName?: string;
}

export interface BlacklistEntry {
  companyId: string;
  idNumber: string;
  reason: string;
  addedBy: string;
  addedAt: number;
  reasonCategory?: string;
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
  inviteCode?: string;
  backupContact?: string;
  recurrence?: "none" | "weekly" | "monthly";
  recurrenceEndDate?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorId: string;
  action: string;
  details: string;
  companyId: string;
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
  | "kiosk"
  | "verify"
  | "invite"
  | "appointment-confirm";

export interface ParkingSpace {
  id: string;
  label: string;
  occupied: boolean;
  visitorId?: string;
}

export interface ApprovedVisitor {
  id: string;
  companyId: string;
  name: string;
  idNumber: string;
  phone?: string;
  visitReason?: string;
  category?: string;
  badgeValidDays?: number;
  badgeIssuedAt?: number;
}
