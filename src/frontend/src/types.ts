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
  dailyQuota?: number; // 0 = unlimited
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
  categoryFields?: Record<
    string,
    { id: string; label: string; required: boolean }[]
  >;
  wifiSSID?: string;
  wifiPassword?: string;
  vipEscortEnabled?: boolean;
  ishgEnabled?: boolean;
  ishgText?: string;
  biometricCheckEnabled?: string[];
  visitorPolicy?: string;
  visitorPolicyEnabled?: boolean;
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

export interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  base64: string;
  uploadedAt: number;
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
  badgeExpired?: boolean;
  accessCardNumber?: string;
  accessCardReturned?: boolean;
  ishgAccepted?: boolean;
  uploadedDocuments?: UploadedDocument[];
  biometricCheckResult?: "verified" | "flagged";
  emergencyContactName?: string;
  emergencyContactPhone?: string;
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

export interface BlacklistAppeal {
  id: string;
  companyId: string;
  tcNumber: string;
  appealReason: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  reviewNote?: string;
}

export interface ScheduledReport {
  id: string;
  companyId: string;
  name: string;
  frequency: "daily" | "weekly" | "monthly";
  reportType:
    | "visitors_summary"
    | "blacklist_activity"
    | "contractor_compliance";
  dayOfWeek?: number; // for weekly (0-6)
  dayOfMonth?: number; // for monthly (1-31)
  lastGeneratedAt?: number;
  enabled: boolean;
  createdAt: number;
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
  hostStaffId?: string;
  noShow?: boolean;
  noShowMarkedAt?: number;
  approvalChain?: ApprovalChainStep[];
  hostApprovalStatus?: "pending" | "approved" | "rejected";
  hostRejectionReason?: string;
  meetingRoomId?: string;
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
  | "appointment-confirm"
  | "prereg"
  | "blacklist-appeal"
  | "visitor-feedback"
  | "self-prereg";

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

export interface SecurityIncident {
  id: string;
  companyId: string;
  title: string;
  description: string;
  location?: string;
  severity: "low" | "medium" | "high" | "critical";
  loggedBy: string;
  timestamp: number;
}

export interface PreRegistration {
  token: string;
  companyId: string;
  appointmentId?: string;
  name: string;
  tc: string;
  phone: string;
  company: string;
  purpose: string;
  status: "pending" | "used";
  createdAt: number;
  uploadedDocuments?: UploadedDocument[];
  biometricCheckResult?: "verified" | "flagged";
}

export interface QueueEntry {
  queueNo: number;
  visitorId: string;
  visitorName: string;
  waitingSince: number;
  companyId: string;
}

export interface BelongingsItem {
  id: string;
  companyId: string;
  visitorId: string;
  visitorName: string;
  itemType: string;
  description?: string;
  quantity: number;
  takenAt: number;
  returnedAt?: number;
  takenBy: string;
  returnedBy?: string;
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  address: string;
  floors: number;
  capacity: number;
  isMain: boolean;
  createdAt: number;
}

export interface WorkingDay {
  enabled: boolean;
  start: string; // HH:MM
  end: string; // HH:MM
}

export interface HolidayEntry {
  id: string;
  companyId: string;
  date: string; // YYYY-MM-DD
  name: string;
}

export interface FloorRoom {
  id: string;
  companyId: string;
  branchId: string;
  name: string;
  floor: number;
  type: "office" | "meeting" | "entrance" | "exit" | "wc" | "other";
  x: number; // 0-100
  y: number; // 0-100
}

export interface GatePassLog {
  id: string;
  companyId: string;
  visitorId: string;
  visitorName: string;
  staffId: string;
  staffName: string;
  gate: string;
  passedAt: number;
  direction: "in" | "out";
}

export interface MeetingRoom {
  id: string;
  companyId: string;
  name: string;
  floor: string;
  capacity: number;
  branchId?: string;
}

export interface BadgeReprintLog {
  id: string;
  companyId: string;
  visitorId: string;
  visitorName: string;
  reason: "Kayıp" | "Hasar Gördü" | "Diğer";
  note?: string;
  reprintedBy: string;
  reprintedAt: number;
}

export interface HostReview {
  id: string;
  companyId: string;
  visitorId: string;
  visitorName: string;
  visitedAt: number;
  hostStaffId: string;
  hostStaffName: string;
  purposeAchieved: boolean;
  reinvite: boolean;
  note: string;
  createdAt: number;
}

export interface ApprovalChainStep {
  role: "host" | "security" | "hr";
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvedAt?: number;
  note?: string;
}

export interface ApprovalChainConfig {
  enabled: boolean;
  steps: ("host" | "security" | "hr")[];
}

export interface VisitorFeedback {
  id: string;
  companyId: string;
  category: "complaint" | "suggestion" | "compliment";
  message: string;
  submittedAt: number;
  isAnonymous: boolean;
  visitorName?: string;
  adminNote?: string;
  adminTagged?: "complaint" | "suggestion" | "compliment";
  status: "new" | "reviewed" | "resolved";
}

export interface StaffSession {
  id: string;
  companyId: string;
  staffId: string;
  staffName: string;
  loginTime: number;
  logoutTime?: number;
}

export interface SelfPreRegEntry {
  id: string;
  companyCode: string;
  companyId: string;
  name: string;
  tc: string;
  phone: string;
  purpose: string;
  hostName: string;
  date: string;
  time?: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: number;
}
