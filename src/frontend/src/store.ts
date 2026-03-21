import {
  syncAddBlacklist,
  syncDeleteAppointment,
  syncRemoveBlacklist,
  syncRemoveStaff,
  syncSaveAppointment,
  syncSaveStaff,
  syncSaveVisitor,
} from "./backendSync";
import type {
  Announcement,
  Appointment,
  BelongingsItem,
  BlacklistEntry,
  Branch,
  CategoryTimeRestriction,
  Company,
  ContractorPermit,
  Department,
  FloorRoom,
  HolidayEntry,
  HostReview,
  Invitation,
  ScreeningQuestion,
  SentryNotification,
  Session,
  Staff,
  Visitor,
  WorkingDay,
} from "./types";

export function getCompanies(): Company[] {
  try {
    return JSON.parse(localStorage.getItem("safentry_companies") || "[]");
  } catch {
    return [];
  }
}
export function saveCompany(c: Company) {
  const list = getCompanies().filter((x) => x.companyId !== c.companyId);
  localStorage.setItem("safentry_companies", JSON.stringify([...list, c]));
}
export function findCompanyByLoginCode(code: string): Company | null {
  return getCompanies().find((c) => c.loginCode === code) ?? null;
}
export function findCompanyById(id: string): Company | null {
  return getCompanies().find((c) => c.companyId === id) ?? null;
}

const DEFAULT_CATEGORIES = [
  "Misafir",
  "Müteahhit",
  "Teslimat",
  "Mülakat",
  "Tedarikçi",
  "Diğer",
];

const DEFAULT_DEPARTMENTS = [
  "Yönetim",
  "İK",
  "Muhasebe",
  "IT",
  "Satış",
  "Üretim",
  "Güvenlik",
];

const DEFAULT_FLOORS = [
  "Zemin",
  "1. Kat",
  "2. Kat",
  "3. Kat",
  "4. Kat",
  "5. Kat",
];

const DEFAULT_SCREENING_QUESTIONS: ScreeningQuestion[] = [
  {
    id: "sq_default_1",
    text: "Ateşiniz veya hastalık belirtiniz var mı?",
    type: "yes_no",
    blocking: false,
  },
  {
    id: "sq_default_2",
    text: "Son 14 gün içinde yurt dışına çıktınız mı?",
    type: "yes_no",
    blocking: false,
  },
  {
    id: "sq_default_3",
    text: "Randevunuz var mı?",
    type: "yes_no",
    blocking: false,
  },
];

export function getDefaultScreeningQuestions(): ScreeningQuestion[] {
  return DEFAULT_SCREENING_QUESTIONS;
}

export function getCustomCategories(companyId: string): string[] {
  const company = findCompanyById(companyId);
  if (company?.customCategories && company.customCategories.length > 0) {
    return company.customCategories;
  }
  return DEFAULT_CATEGORIES;
}

export function getCompanyDepartments(companyId: string): string[] {
  const company = findCompanyById(companyId);
  if (company?.departments && company.departments.length > 0) {
    return company.departments;
  }
  return DEFAULT_DEPARTMENTS;
}

export function getCompanyFloors(companyId: string): string[] {
  const company = findCompanyById(companyId);
  if (company?.floors && company.floors.length > 0) {
    return company.floors;
  }
  return DEFAULT_FLOORS;
}

export function getAllStaff(): Staff[] {
  try {
    return JSON.parse(localStorage.getItem("safentry_staff") || "[]");
  } catch {
    return [];
  }
}
export function getStaffByCompany(companyId: string): Staff[] {
  return getAllStaff().filter((s) => s.companyId === companyId);
}
export function saveStaff(s: Staff) {
  const list = getAllStaff().filter((x) => x.staffId !== s.staffId);
  localStorage.setItem("safentry_staff", JSON.stringify([...list, s]));
  syncSaveStaff(s);
}
export function findStaffById(staffId: string): Staff | null {
  return getAllStaff().find((s) => s.staffId === staffId) ?? null;
}
export function removeStaff(staffId: string) {
  const s = findStaffById(staffId);
  const list = getAllStaff().filter((s) => s.staffId !== staffId);
  localStorage.setItem("safentry_staff", JSON.stringify(list));
  if (s) syncRemoveStaff(staffId, s.companyId);
}
export function resetStaffCode(staffId: string): string {
  const newCode = Math.floor(10000000 + Math.random() * 90000000).toString();
  const s = findStaffById(staffId);
  if (!s) return newCode;
  const list = getAllStaff().filter((x) => x.staffId !== staffId);
  const updated: Staff = { ...s, staffId: newCode };
  localStorage.setItem("safentry_staff", JSON.stringify([...list, updated]));
  syncSaveStaff(updated);
  return newCode;
}

export function getVisitors(companyId: string): Visitor[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_visitors_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveVisitor(v: Visitor) {
  const list = getVisitors(v.companyId).filter(
    (x) => x.visitorId !== v.visitorId,
  );
  localStorage.setItem(
    `safentry_visitors_${v.companyId}`,
    JSON.stringify([...list, v]),
  );
  syncSaveVisitor(v);
}
export function findVisitorByCode(
  code: string,
  companyId: string,
): Visitor | null {
  return (
    getVisitors(companyId).find(
      (v) => v.visitorId === code || v.badgeQr === code,
    ) ?? null
  );
}
export function findVisitorByCodeGlobal(code: string): Visitor | null {
  const companies = getCompanies();
  for (const c of companies) {
    const v = findVisitorByCode(code, c.companyId);
    if (v) return v;
  }
  return null;
}

export function purgeExpiredVisitors(companyId: string): number {
  const company = findCompanyById(companyId);
  if (!company) return 0;
  const cutoff = Date.now() - company.dataRetentionDays * 24 * 60 * 60 * 1000;
  const visitors = getVisitors(companyId);
  const remaining = visitors.filter((v) => v.createdAt > cutoff);
  localStorage.setItem(
    `safentry_visitors_${companyId}`,
    JSON.stringify(remaining),
  );
  return visitors.length - remaining.length;
}

export function getBlacklist(companyId: string): BlacklistEntry[] {
  try {
    return JSON.parse(localStorage.getItem(`safentry_bl_${companyId}`) || "[]");
  } catch {
    return [];
  }
}
export function addToBlacklist(entry: BlacklistEntry) {
  const list = getBlacklist(entry.companyId).filter(
    (x) => x.idNumber !== entry.idNumber,
  );
  localStorage.setItem(
    `safentry_bl_${entry.companyId}`,
    JSON.stringify([...list, entry]),
  );
  syncAddBlacklist(entry);
}
export function removeFromBlacklist(companyId: string, idNumber: string) {
  const list = getBlacklist(companyId).filter((x) => x.idNumber !== idNumber);
  localStorage.setItem(`safentry_bl_${companyId}`, JSON.stringify(list));
  syncRemoveBlacklist(companyId, idNumber);
}
export function isBlacklisted(companyId: string, idNumber: string): boolean {
  return getBlacklist(companyId).some((x) => x.idNumber === idNumber);
}

export function getAnnouncements(companyId: string): Announcement[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_ann_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveAnnouncement(a: Announcement) {
  const list = getAnnouncements(a.companyId);
  localStorage.setItem(
    `safentry_ann_${a.companyId}`,
    JSON.stringify([a, ...list].slice(0, 50)),
  );
}

export function getAppointments(companyId: string): Appointment[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_appointments_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveAppointment(a: Appointment) {
  const list = getAppointments(a.companyId).filter((x) => x.id !== a.id);
  localStorage.setItem(
    `safentry_appointments_${a.companyId}`,
    JSON.stringify([...list, a]),
  );
  syncSaveAppointment(a);
}
export function deleteAppointment(companyId: string, id: string) {
  const list = getAppointments(companyId).filter((x) => x.id !== id);
  localStorage.setItem(
    `safentry_appointments_${companyId}`,
    JSON.stringify(list),
  );
  syncDeleteAppointment(companyId, id);
}

export function getSession(): Session | null {
  try {
    const s = JSON.parse(
      localStorage.getItem("safentry_session") || "null",
    ) as Session | null;
    if (!s) return null;
    if (Date.now() > s.expiresAt) {
      clearSession();
      return null;
    }
    return s;
  } catch {
    return null;
  }
}
export function saveSession(s: Session) {
  localStorage.setItem("safentry_session", JSON.stringify(s));
}
export function clearSession() {
  localStorage.removeItem("safentry_session");
}
export function refreshSession() {
  const s = getSession();
  if (s) saveSession({ ...s, expiresAt: Date.now() + 30 * 60 * 1000 });
}

export function saveInviteCode(code: string, companyId: string) {
  const codes: Record<string, string> = JSON.parse(
    localStorage.getItem("safentry_invites") || "{}",
  );
  codes[code] = companyId;
  localStorage.setItem("safentry_invites", JSON.stringify(codes));
}
export function lookupInviteCode(code: string): string | null {
  const codes: Record<string, string> = JSON.parse(
    localStorage.getItem("safentry_invites") || "{}",
  );
  return codes[code] ?? null;
}

// Invitation (guest self-registration) functions
export function getInvitations(companyId: string): Invitation[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_invitations_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveInvitation(inv: Invitation) {
  const list = getInvitations(inv.companyId).filter(
    (x) => x.token !== inv.token,
  );
  localStorage.setItem(
    `safentry_invitations_${inv.companyId}`,
    JSON.stringify([...list, inv]),
  );
}
export function findInvitationByToken(token: string): Invitation | null {
  const companies = getCompanies();
  for (const c of companies) {
    const inv = getInvitations(c.companyId).find((i) => i.token === token);
    if (inv) return inv;
  }
  return null;
}

// Alert History
export function getAlertHistory(
  companyId: string,
): import("./types").AlertHistoryEntry[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_alerts_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function addAlertHistory(entry: import("./types").AlertHistoryEntry) {
  const list = getAlertHistory(entry.companyId);
  localStorage.setItem(
    `safentry_alerts_${entry.companyId}`,
    JSON.stringify([entry, ...list].slice(0, 500)),
  );
}

// Lockdown mode
export function getLockdown(companyId: string): boolean {
  return localStorage.getItem(`safentry_lockdown_${companyId}`) === "true";
}
export function setLockdown(companyId: string, active: boolean) {
  if (active) {
    localStorage.setItem(`safentry_lockdown_${companyId}`, "true");
  } else {
    localStorage.removeItem(`safentry_lockdown_${companyId}`);
  }
}

// Approved Visitors
export function getApprovedVisitors(
  companyId: string,
): import("./types").ApprovedVisitor[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_approved_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveApprovedVisitor(av: import("./types").ApprovedVisitor) {
  const list = getApprovedVisitors(av.companyId).filter((x) => x.id !== av.id);
  localStorage.setItem(
    `safentry_approved_${av.companyId}`,
    JSON.stringify([...list, av]),
  );
}
export function deleteApprovedVisitor(companyId: string, id: string) {
  const list = getApprovedVisitors(companyId).filter((x) => x.id !== id);
  localStorage.setItem(`safentry_approved_${companyId}`, JSON.stringify(list));
}
export function findApprovedByIdNumber(
  companyId: string,
  idNumber: string,
): import("./types").ApprovedVisitor | null {
  return (
    getApprovedVisitors(companyId).find((x) => x.idNumber === idNumber) ?? null
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────
export function getNotifications(companyId: string): SentryNotification[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_notifications_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function addNotification(n: SentryNotification) {
  const list = getNotifications(n.companyId);
  localStorage.setItem(
    `safentry_notifications_${n.companyId}`,
    JSON.stringify([n, ...list].slice(0, 200)),
  );
}
export function markAllNotificationsRead(companyId: string) {
  const list = getNotifications(companyId).map((n) => ({ ...n, read: true }));
  localStorage.setItem(
    `safentry_notifications_${companyId}`,
    JSON.stringify(list),
  );
}
export function dismissNotification(companyId: string, id: string) {
  const list = getNotifications(companyId).filter((n) => n.id !== id);
  localStorage.setItem(
    `safentry_notifications_${companyId}`,
    JSON.stringify(list),
  );
}

// ─── Departments (full objects with floor+capacity) ────────────────────────────
export function getDepartments(companyId: string): Department[] {
  try {
    const stored = localStorage.getItem(`safentry_departments_${companyId}`);
    if (stored) return JSON.parse(stored);
  } catch {
    /* empty */
  }
  // Default departments
  return [
    { id: "dept_1", companyId, name: "Yönetim", floor: "1. Kat", capacity: 20 },
    {
      id: "dept_2",
      companyId,
      name: "İnsan Kaynakları",
      floor: "2. Kat",
      capacity: 15,
    },
    {
      id: "dept_3",
      companyId,
      name: "Bilgi İşlem",
      floor: "3. Kat",
      capacity: 30,
    },
    {
      id: "dept_4",
      companyId,
      name: "Muhasebe",
      floor: "2. Kat",
      capacity: 10,
    },
    {
      id: "dept_5",
      companyId,
      name: "Güvenlik",
      floor: "Zemin Kat",
      capacity: 8,
    },
  ];
}
export function saveDepartment(d: Department) {
  const list = getDepartments(d.companyId).filter((x) => x.id !== d.id);
  localStorage.setItem(
    `safentry_departments_${d.companyId}`,
    JSON.stringify([...list, d]),
  );
}
export function deleteDepartment(companyId: string, id: string) {
  const list = getDepartments(companyId).filter((x) => x.id !== id);
  localStorage.setItem(
    `safentry_departments_${companyId}`,
    JSON.stringify(list),
  );
}

// ─── Contractor Permits ────────────────────────────────────────────────────────
export function getPermits(companyId: string): ContractorPermit[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_permits_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function savePermit(p: ContractorPermit) {
  const list = getPermits(p.companyId).filter((x) => x.id !== p.id);
  localStorage.setItem(
    `safentry_permits_${p.companyId}`,
    JSON.stringify([...list, p]),
  );
}
export function deletePermit(companyId: string, id: string) {
  const list = getPermits(companyId).filter((x) => x.id !== id);
  localStorage.setItem(`safentry_permits_${companyId}`, JSON.stringify(list));
}
export function findPermitByIdNumber(
  companyId: string,
  idNumber: string,
): ContractorPermit | null {
  return getPermits(companyId).find((p) => p.idNumber === idNumber) ?? null;
}

// ─── Category Time Restrictions ───────────────────────────────────────────────
export function getCategoryTimeRestrictions(
  companyId: string,
): CategoryTimeRestriction[] {
  const company = findCompanyById(companyId);
  return company?.categoryTimeRestrictions ?? [];
}
export function saveCategoryTimeRestriction(
  companyId: string,
  restriction: CategoryTimeRestriction,
) {
  const company = findCompanyById(companyId);
  if (!company) return;
  const list = (company.categoryTimeRestrictions ?? []).filter(
    (r) => r.category !== restriction.category,
  );
  saveCompany({
    ...company,
    categoryTimeRestrictions: [...list, restriction],
  });
}
export function removeCategoryTimeRestriction(
  companyId: string,
  category: string,
) {
  const company = findCompanyById(companyId);
  if (!company) return;
  saveCompany({
    ...company,
    categoryTimeRestrictions: (company.categoryTimeRestrictions ?? []).filter(
      (r) => r.category !== category,
    ),
  });
}

// ─── Visitor PINs ──────────────────────────────────────────────────────────────
export function getVisitorPins(companyId: string): Record<string, string> {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_visitor_pins_${companyId}`) || "{}",
    );
  } catch {
    return {};
  }
}
export function saveVisitorPin(companyId: string, tc: string, pin: string) {
  const pins = getVisitorPins(companyId);
  pins[tc] = pin;
  localStorage.setItem(
    `safentry_visitor_pins_${companyId}`,
    JSON.stringify(pins),
  );
}
export function removeVisitorPin(companyId: string, tc: string) {
  const pins = getVisitorPins(companyId);
  delete pins[tc];
  localStorage.setItem(
    `safentry_visitor_pins_${companyId}`,
    JSON.stringify(pins),
  );
}

// ─── Kiosk Content ────────────────────────────────────────────────────────────
export interface KioskContent {
  welcomeTitle?: string;
  subtitle?: string;
  visitorNameLabel?: string;
  companyLabel?: string;
  visitReasonLabel?: string;
}
export function getKioskContent(
  companyId: string,
): Record<string, KioskContent> {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_kiosk_content_${companyId}`) || "{}",
    );
  } catch {
    return {};
  }
}
export function saveKioskContent(
  companyId: string,
  lang: string,
  content: KioskContent,
) {
  const all = getKioskContent(companyId);
  all[lang] = content;
  localStorage.setItem(
    `safentry_kiosk_content_${companyId}`,
    JSON.stringify(all),
  );
}

// ─── Staff Messages ────────────────────────────────────────────────────────────
export interface StaffMessage {
  id: string;
  authorName: string;
  authorId: string;
  content: string;
  createdAt: number;
  companyId: string;
}

export function getStaffMessages(companyId: string): StaffMessage[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_staff_messages_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}

export function saveStaffMessage(msg: StaffMessage) {
  const list = getStaffMessages(msg.companyId);
  localStorage.setItem(
    `safentry_staff_messages_${msg.companyId}`,
    JSON.stringify([...list, msg].slice(-500)),
  );
}

// ─── Security Incidents ────────────────────────────────────────────────────────
export function getIncidents(
  companyId: string,
): import("./types").SecurityIncident[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_incidents_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveIncident(inc: import("./types").SecurityIncident) {
  const list = getIncidents(inc.companyId).filter((x) => x.id !== inc.id);
  localStorage.setItem(
    `safentry_incidents_${inc.companyId}`,
    JSON.stringify([inc, ...list]),
  );
}
export function deleteIncident(companyId: string, id: string) {
  const list = getIncidents(companyId).filter((x) => x.id !== id);
  localStorage.setItem(`safentry_incidents_${companyId}`, JSON.stringify(list));
}

// ─── Pre-Registrations ─────────────────────────────────────────────────────────
export function getPreRegs(
  companyId: string,
): import("./types").PreRegistration[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_preregs_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function savePreReg(pr: import("./types").PreRegistration) {
  const list = getPreRegs(pr.companyId).filter((x) => x.token !== pr.token);
  localStorage.setItem(
    `safentry_preregs_${pr.companyId}`,
    JSON.stringify([...list, pr]),
  );
}
export function findPreRegByToken(
  token: string,
): import("./types").PreRegistration | null {
  const companies = getCompanies();
  for (const c of companies) {
    const pr = getPreRegs(c.companyId).find((p) => p.token === token);
    if (pr) return pr;
  }
  return null;
}

// ─── Queue ─────────────────────────────────────────────────────────────────────
function getTodayQueueKey(companyId: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `safentry_queue_${companyId}_${today}`;
}
export function getQueue(companyId: string): import("./types").QueueEntry[] {
  try {
    return JSON.parse(
      localStorage.getItem(getTodayQueueKey(companyId)) || "[]",
    );
  } catch {
    return [];
  }
}
export function addToQueue(entry: import("./types").QueueEntry) {
  const list = getQueue(entry.companyId);
  localStorage.setItem(
    getTodayQueueKey(entry.companyId),
    JSON.stringify([...list, entry]),
  );
}
export function removeFromQueue(companyId: string, visitorId: string) {
  const list = getQueue(companyId).filter((x) => x.visitorId !== visitorId);
  localStorage.setItem(getTodayQueueKey(companyId), JSON.stringify(list));
}
export function getNextQueueNo(companyId: string): number {
  const list = getQueue(companyId);
  return list.length === 0 ? 1 : Math.max(...list.map((x) => x.queueNo)) + 1;
}

// ─── Kiosk Approval Status ─────────────────────────────────────────────────────
export function setKioskApprovalStatus(
  visitorId: string,
  status: "approved" | "rejected",
  reason?: string,
) {
  const key = `safentry_kiosk_status_${visitorId}`;
  localStorage.setItem(key, JSON.stringify({ status, reason: reason ?? "" }));
  // auto-cleanup after 5 minutes
  setTimeout(() => localStorage.removeItem(key), 5 * 60 * 1000);
}
export function getKioskApprovalStatus(
  visitorId: string,
): { status: "approved" | "rejected"; reason: string } | null {
  try {
    const raw = localStorage.getItem(`safentry_kiosk_status_${visitorId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── Department Quota Check ────────────────────────────────────────────────────
export function getDeptTodayVisitorCount(
  companyId: string,
  deptName: string,
): number {
  const today = new Date();
  return getVisitors(companyId).filter((v) => {
    if (v.department !== deptName) return false;
    if (v.status === "departed") return false;
    const vd = new Date(v.arrivalTime);
    return (
      vd.getFullYear() === today.getFullYear() &&
      vd.getMonth() === today.getMonth() &&
      vd.getDate() === today.getDate()
    );
  }).length;
}

// ─── Belongings ────────────────────────────────────────────────────────────────
export function getBelongings(companyId: string): BelongingsItem[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_belongings_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveBelonging(b: BelongingsItem) {
  const list = getBelongings(b.companyId).filter((x) => x.id !== b.id);
  localStorage.setItem(
    `safentry_belongings_${b.companyId}`,
    JSON.stringify([...list, b]),
  );
}
export function getVisitorBelongings(
  companyId: string,
  visitorId: string,
): BelongingsItem[] {
  return getBelongings(companyId).filter((b) => b.visitorId === visitorId);
}

// ─── Branches ─────────────────────────────────────────────────────────────────

export function getBranches(companyId: string): Branch[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_branches_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveBranch(b: Branch) {
  const list = getBranches(b.companyId).filter((x) => x.id !== b.id);
  localStorage.setItem(
    `safentry_branches_${b.companyId}`,
    JSON.stringify([...list, b]),
  );
}
export function deleteBranch(companyId: string, id: string) {
  const list = getBranches(companyId).filter((x) => x.id !== id);
  localStorage.setItem(`safentry_branches_${companyId}`, JSON.stringify(list));
}

// ─── Working Hours ─────────────────────────────────────────────────────────────
const DEFAULT_WORK_DAYS: WorkingDay[] = [
  { enabled: true, start: "09:00", end: "18:00" }, // Mon
  { enabled: true, start: "09:00", end: "18:00" }, // Tue
  { enabled: true, start: "09:00", end: "18:00" }, // Wed
  { enabled: true, start: "09:00", end: "18:00" }, // Thu
  { enabled: true, start: "09:00", end: "18:00" }, // Fri
  { enabled: false, start: "09:00", end: "13:00" }, // Sat
  { enabled: false, start: "09:00", end: "13:00" }, // Sun
];
export function getWorkingDays(companyId: string): WorkingDay[] {
  try {
    const raw = localStorage.getItem(`safentry_workhours_${companyId}`);
    return raw ? JSON.parse(raw) : DEFAULT_WORK_DAYS;
  } catch {
    return DEFAULT_WORK_DAYS;
  }
}
export function saveWorkingDays(companyId: string, days: WorkingDay[]) {
  localStorage.setItem(`safentry_workhours_${companyId}`, JSON.stringify(days));
}

// ─── Holidays ─────────────────────────────────────────────────────────────────
export function getHolidays(companyId: string): HolidayEntry[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_holidays_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveHoliday(h: HolidayEntry) {
  const list = getHolidays(h.companyId).filter((x) => x.id !== h.id);
  localStorage.setItem(
    `safentry_holidays_${h.companyId}`,
    JSON.stringify([...list, h]),
  );
}
export function deleteHoliday(companyId: string, id: string) {
  const list = getHolidays(companyId).filter((x) => x.id !== id);
  localStorage.setItem(`safentry_holidays_${companyId}`, JSON.stringify(list));
}

// ─── Floor Rooms ───────────────────────────────────────────────────────────────
export function getFloorRooms(
  companyId: string,
  branchId: string,
): FloorRoom[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_floorplan_${companyId}_${branchId}`) ||
        "[]",
    );
  } catch {
    return [];
  }
}
export function saveFloorRoom(r: FloorRoom) {
  const list = getFloorRooms(r.companyId, r.branchId).filter(
    (x) => x.id !== r.id,
  );
  localStorage.setItem(
    `safentry_floorplan_${r.companyId}_${r.branchId}`,
    JSON.stringify([...list, r]),
  );
}
export function deleteFloorRoom(
  companyId: string,
  branchId: string,
  id: string,
) {
  const list = getFloorRooms(companyId, branchId).filter((x) => x.id !== id);
  localStorage.setItem(
    `safentry_floorplan_${companyId}_${branchId}`,
    JSON.stringify(list),
  );
}

// ─── Staff Photo ───────────────────────────────────────────────────────────────
export function getStaffPhoto(staffCode: string): string {
  return localStorage.getItem(`safentry_staffphoto_${staffCode}`) ?? "";
}
export function saveStaffPhoto(staffCode: string, base64: string) {
  localStorage.setItem(`safentry_staffphoto_${staffCode}`, base64);
}

// ─── Working Hours Checker ─────────────────────────────────────────────────────
export function isDateTimeOutsideWorkHours(
  companyId: string,
  dateStr: string,
  timeStr: string,
): { outside: boolean; reason: string } {
  const holidays = getHolidays(companyId);
  const holiday = holidays.find((h) => h.date === dateStr);
  if (holiday) return { outside: true, reason: `Resmi tatil: ${holiday.name}` };

  const days = getWorkingDays(companyId);
  const d = new Date(`${dateStr}T${timeStr}`);
  // getDay() returns 0=Sun...6=Sat; we use Mon=0 index
  const dow = (d.getDay() + 6) % 7;
  const day = days[dow];
  if (!day.enabled) return { outside: true, reason: "Kapalı gün" };

  const [sh, sm] = day.start.split(":").map(Number);
  const [eh, em] = day.end.split(":").map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const nowMins = d.getHours() * 60 + d.getMinutes();
  if (nowMins < startMins || nowMins >= endMins) {
    return {
      outside: true,
      reason: `Çalışma saatleri dışında (${day.start}–${day.end})`,
    };
  }
  return { outside: false, reason: "" };
}

// ─── Gate Pass Logs ────────────────────────────────────────────────────────────
export function getGatePassLogs(
  companyId: string,
): import("./types").GatePassLog[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_gatelog_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function addGatePassLog(log: import("./types").GatePassLog) {
  const list = getGatePassLogs(log.companyId);
  localStorage.setItem(
    `safentry_gatelog_${log.companyId}`,
    JSON.stringify([log, ...list].slice(0, 1000)),
  );
}

// ─── Meeting Rooms ─────────────────────────────────────────────────────────────
export function getMeetingRooms(
  companyId: string,
): import("./types").MeetingRoom[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_meetingrooms_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveMeetingRoom(r: import("./types").MeetingRoom) {
  const list = getMeetingRooms(r.companyId).filter((x) => x.id !== r.id);
  localStorage.setItem(
    `safentry_meetingrooms_${r.companyId}`,
    JSON.stringify([...list, r]),
  );
}
export function deleteMeetingRoom(companyId: string, id: string) {
  const list = getMeetingRooms(companyId).filter((x) => x.id !== id);
  localStorage.setItem(
    `safentry_meetingrooms_${companyId}`,
    JSON.stringify(list),
  );
}

// ─── Badge Reprint Logs ────────────────────────────────────────────────────────
export function getBadgeReprintLogs(
  companyId: string,
): import("./types").BadgeReprintLog[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_badgereprint_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function addBadgeReprintLog(log: import("./types").BadgeReprintLog) {
  const list = getBadgeReprintLogs(log.companyId);
  localStorage.setItem(
    `safentry_badgereprint_${log.companyId}`,
    JSON.stringify([log, ...list].slice(0, 500)),
  );
}

// ─── Unreturned Access Cards ───────────────────────────────────────────────────
export function getUnreturnedCards(companyId: string): Visitor[] {
  return getVisitors(companyId).filter(
    (v) =>
      v.accessCardNumber &&
      v.accessCardReturned !== true &&
      v.status !== "departed",
  );
}

// ─── Host Reviews ──────────────────────────────────────────────────────────────
export function getHostReviews(companyId: string): HostReview[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_hostreviews_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveHostReview(r: HostReview) {
  const list = getHostReviews(r.companyId).filter((x) => x.id !== r.id);
  localStorage.setItem(
    `safentry_hostreviews_${r.companyId}`,
    JSON.stringify([r, ...list].slice(0, 1000)),
  );
}

// ─── Visitor Trust Score ────────────────────────────────────────────────────
export function computeVisitorTrustScore(
  companyId: string,
  idNumber: string,
): number {
  if (isBlacklisted(companyId, idNumber)) return 0;
  const visits = getVisitors(companyId).filter(
    (v) => v.idNumber === idNumber && v.status === "departed",
  );
  const appointments = getAppointments(companyId).filter(
    (a) => a.visitorId === idNumber && a.status === "cancelled",
  );
  let score = 80;
  // On-time completions
  const onTime = visits.filter(
    (v) => v.departureTime && v.departureTime > 0,
  ).length;
  score += Math.min(onTime * 2, 20);
  // Late exits (stay > 1.5x expected 4h)
  const lateExits = visits.filter((v) => {
    if (!v.departureTime) return false;
    const stayMs = v.departureTime - v.arrivalTime;
    return stayMs > 1.5 * 4 * 60 * 60 * 1000;
  }).length;
  score -= lateExits * 5;
  // No-shows (cancelled appointments)
  score -= appointments.length * 10;
  // Explicit no-shows marked by staff
  const noShowAppts = getAppointments(companyId).filter(
    (a) => a.visitorId === idNumber && a.noShow === true,
  );
  score -= noShowAppts.length * 15;
  return Math.max(0, Math.min(100, score));
}

// ─── Blacklist Appeals ─────────────────────────────────────────────────────
export function getBlacklistAppeals(
  companyId: string,
): import("./types").BlacklistAppeal[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_bl_appeals_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveBlacklistAppeal(a: import("./types").BlacklistAppeal) {
  const list = getBlacklistAppeals(a.companyId).filter((x) => x.id !== a.id);
  localStorage.setItem(
    `safentry_bl_appeals_${a.companyId}`,
    JSON.stringify([a, ...list]),
  );
}
export function updateBlacklistAppeal(a: import("./types").BlacklistAppeal) {
  saveBlacklistAppeal(a);
}

// ─── Scheduled Reports ─────────────────────────────────────────────────────
export function getScheduledReports(
  companyId: string,
): import("./types").ScheduledReport[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_scheduled_reports_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveScheduledReport(r: import("./types").ScheduledReport) {
  const list = getScheduledReports(r.companyId).filter((x) => x.id !== r.id);
  localStorage.setItem(
    `safentry_scheduled_reports_${r.companyId}`,
    JSON.stringify([...list, r]),
  );
}
export function deleteScheduledReport(companyId: string, id: string) {
  const list = getScheduledReports(companyId).filter((x) => x.id !== id);
  localStorage.setItem(
    `safentry_scheduled_reports_${companyId}`,
    JSON.stringify(list),
  );
}

// ─── Approval Chain Config ─────────────────────────────────────────────────
export function getApprovalChainConfig(
  companyId: string,
): import("./types").ApprovalChainConfig {
  try {
    const raw = localStorage.getItem(`safentry_approval_chain_${companyId}`);
    return raw
      ? JSON.parse(raw)
      : { enabled: false, steps: ["host", "security", "hr"] };
  } catch {
    return { enabled: false, steps: ["host", "security", "hr"] };
  }
}
export function saveApprovalChainConfig(
  companyId: string,
  config: import("./types").ApprovalChainConfig,
) {
  localStorage.setItem(
    `safentry_approval_chain_${companyId}`,
    JSON.stringify(config),
  );
}

// ─── Biometric Check ──────────────────────────────────────────────────────────
export function isBiometricRequired(
  companyId: string,
  category?: string,
): boolean {
  if (!category) return false;
  const company = findCompanyById(companyId);
  const defaults = ["VIP", "VVIP", "Müteahhit"];
  const enabled = company?.biometricCheckEnabled ?? defaults;
  return enabled.includes(category);
}

// ─── Visitor Feedback ─────────────────────────────────────────────────────────
export function getVisitorFeedback(
  companyId: string,
): import("./types").VisitorFeedback[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_feedback_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveVisitorFeedback(f: import("./types").VisitorFeedback) {
  const list = getVisitorFeedback(f.companyId).filter((x) => x.id !== f.id);
  localStorage.setItem(
    `safentry_feedback_${f.companyId}`,
    JSON.stringify([f, ...list].slice(0, 500)),
  );
}
export function updateVisitorFeedback(f: import("./types").VisitorFeedback) {
  saveVisitorFeedback(f);
}

// Staff session tracking for working hours
export function getStaffSessions(
  companyId: string,
): import("./types").StaffSession[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_staff_sessions_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}

export function addStaffSession(s: import("./types").StaffSession): void {
  const list = getStaffSessions(s.companyId);
  localStorage.setItem(
    `safentry_staff_sessions_${s.companyId}`,
    JSON.stringify([s, ...list].slice(0, 2000)),
  );
}

export function updateStaffSessionLogout(
  companyId: string,
  sessionId: string,
): void {
  const list = getStaffSessions(companyId);
  const updated = list.map((s) =>
    s.id === sessionId ? { ...s, logoutTime: Date.now() } : s,
  );
  localStorage.setItem(
    `safentry_staff_sessions_${companyId}`,
    JSON.stringify(updated),
  );
}

// ─── Bulk Visitor Save ─────────────────────────────────────────────────────────
export function bulkSaveVisitors(visitors: import("./types").Visitor[]): void {
  if (visitors.length === 0) return;
  const companyId = visitors[0].companyId;
  const existing = getVisitors(companyId);
  const existingIds = new Set(existing.map((v) => v.visitorId));
  const newOnes = visitors.filter((v) => !existingIds.has(v.visitorId));
  localStorage.setItem(
    `safentry_visitors_${companyId}`,
    JSON.stringify([...existing, ...newOnes]),
  );
}

// ─── Self Pre-Registration ─────────────────────────────────────────────────────
export function getSelfPreRegEntries(
  companyCode: string,
): import("./types").SelfPreRegEntry[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_self_prereg_${companyCode}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveSelfPreRegEntry(entry: import("./types").SelfPreRegEntry) {
  const list = getSelfPreRegEntries(entry.companyCode).filter(
    (x) => x.id !== entry.id,
  );
  localStorage.setItem(
    `safentry_self_prereg_${entry.companyCode}`,
    JSON.stringify([entry, ...list]),
  );
}
export function deleteSelfPreRegEntry(id: string, companyCode: string) {
  const list = getSelfPreRegEntries(companyCode).filter((x) => x.id !== id);
  localStorage.setItem(
    `safentry_self_prereg_${companyCode}`,
    JSON.stringify(list),
  );
}
export function getSelfPreRegEntriesByCompanyId(
  companyId: string,
): import("./types").SelfPreRegEntry[] {
  const company = findCompanyById(companyId);
  if (!company) return [];
  return getSelfPreRegEntries(company.loginCode);
}

// ─── Escorts ────────────────────────────────────────────────────────────────
export interface EscortAssignment {
  id: string;
  companyId: string;
  visitorId: string;
  visitorName: string;
  staffId: string;
  staffName: string;
  status: "assigned" | "active" | "completed";
  assignedAt: number;
  takenAt?: number;
  handedAt?: number;
  notes?: string;
}
export function getEscorts(companyId: string): EscortAssignment[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_escorts_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveEscort(e: EscortAssignment) {
  const list = getEscorts(e.companyId).filter((x) => x.id !== e.id);
  localStorage.setItem(
    `safentry_escorts_${e.companyId}`,
    JSON.stringify([e, ...list]),
  );
}
export function deleteEscort(companyId: string, id: string) {
  const list = getEscorts(companyId).filter((x) => x.id !== id);
  localStorage.setItem(`safentry_escorts_${companyId}`, JSON.stringify(list));
}

// ─── Permit Renewals ─────────────────────────────────────────────────────────
export interface PermitRenewal {
  id: string;
  companyId: string;
  permitId: string;
  contractorName: string;
  requestedAt: number;
  status: "pending" | "approved" | "rejected";
  reviewedAt?: number;
  reviewedBy?: string;
}
export function getPermitRenewals(companyId: string): PermitRenewal[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_permit_renewals_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function savePermitRenewal(r: PermitRenewal) {
  const list = getPermitRenewals(r.companyId).filter((x) => x.id !== r.id);
  localStorage.setItem(
    `safentry_permit_renewals_${r.companyId}`,
    JSON.stringify([r, ...list]),
  );
}

// ─── Patrol Logs ──────────────────────────────────────────────────────────────
export interface PatrolEntry {
  id: string;
  companyId: string;
  staffId: string;
  staffName: string;
  checkpoint: string;
  notes: string;
  loggedAt: number;
}
export function getPatrols(companyId: string): PatrolEntry[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_patrols_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function savePatrol(p: PatrolEntry) {
  const list = getPatrols(p.companyId);
  localStorage.setItem(
    `safentry_patrols_${p.companyId}`,
    JSON.stringify([p, ...list].slice(0, 1000)),
  );
}
export function deletePatrol(companyId: string, id: string) {
  const list = getPatrols(companyId).filter((x) => x.id !== id);
  localStorage.setItem(`safentry_patrols_${companyId}`, JSON.stringify(list));
}

// ─── Lost & Found ─────────────────────────────────────────────────────────────
export interface LostFoundItem {
  id: string;
  companyId: string;
  description: string;
  foundLocation: string;
  foundDate: string;
  finderName: string;
  status: "found" | "claimed";
  claimantName?: string;
  claimedAt?: number;
}
export function getLostFound(companyId: string): LostFoundItem[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_lostfound_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveLostFound(item: LostFoundItem) {
  const list = getLostFound(item.companyId).filter((x) => x.id !== item.id);
  localStorage.setItem(
    `safentry_lostfound_${item.companyId}`,
    JSON.stringify([item, ...list]),
  );
}
export function deleteLostFound(companyId: string, id: string) {
  const list = getLostFound(companyId).filter((x) => x.id !== id);
  localStorage.setItem(`safentry_lostfound_${companyId}`, JSON.stringify(list));
}

// ─── Survey Templates ─────────────────────────────────────────────────────────
export function getSurveyTemplates(
  companyId: string,
): import("./types").SurveyTemplate[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_survey_templates_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveSurveyTemplate(t: import("./types").SurveyTemplate) {
  const list = getSurveyTemplates(t.companyId).filter((x) => x.id !== t.id);
  localStorage.setItem(
    `safentry_survey_templates_${t.companyId}`,
    JSON.stringify([...list, t]),
  );
}
export function deleteSurveyTemplate(id: string, companyId: string) {
  const list = getSurveyTemplates(companyId).filter((x) => x.id !== id);
  localStorage.setItem(
    `safentry_survey_templates_${companyId}`,
    JSON.stringify(list),
  );
}

// ─── Document Templates ───────────────────────────────────────────────────────
export function getDocumentTemplates(
  companyId: string,
): import("./types").DocumentTemplate[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_doc_templates_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveDocumentTemplate(t: import("./types").DocumentTemplate) {
  const list = getDocumentTemplates(t.companyId).filter((x) => x.id !== t.id);
  localStorage.setItem(
    `safentry_doc_templates_${t.companyId}`,
    JSON.stringify([...list, t]),
  );
}
export function deleteDocumentTemplate(id: string, companyId: string) {
  const list = getDocumentTemplates(companyId).filter((x) => x.id !== id);
  localStorage.setItem(
    `safentry_doc_templates_${companyId}`,
    JSON.stringify(list),
  );
}

// ─── Notification Rules ───────────────────────────────────────────────────────
export function getNotificationRules(
  companyId: string,
): import("./types").NotificationRule[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_notif_rules_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveNotificationRule(r: import("./types").NotificationRule) {
  const list = getNotificationRules(r.companyId).filter((x) => x.id !== r.id);
  localStorage.setItem(
    `safentry_notif_rules_${r.companyId}`,
    JSON.stringify([...list, r]),
  );
}
export function deleteNotificationRule(id: string, companyId: string) {
  const list = getNotificationRules(companyId).filter((x) => x.id !== id);
  localStorage.setItem(
    `safentry_notif_rules_${companyId}`,
    JSON.stringify(list),
  );
}

// ─── Dashboard Widget Config ──────────────────────────────────────────────────
export function getDashboardWidgetConfig(
  companyId: string,
): import("./types").DashboardWidgetConfig {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_widget_config_${companyId}`) ||
        '{"hiddenWidgets":[]}',
    );
  } catch {
    return { hiddenWidgets: [] };
  }
}
export function saveDashboardWidgetConfig(
  companyId: string,
  config: import("./types").DashboardWidgetConfig,
) {
  localStorage.setItem(
    `safentry_widget_config_${companyId}`,
    JSON.stringify(config),
  );
}

// ─── Staff Leaves ─────────────────────────────────────────────────────────────
export function getStaffLeaves(
  companyId: string,
): import("./types").StaffLeave[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_staff_leaves_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveStaffLeave(
  companyId: string,
  leave: import("./types").StaffLeave,
): void {
  const list = getStaffLeaves(companyId).filter(
    (l) => l.leaveId !== leave.leaveId,
  );
  localStorage.setItem(
    `safentry_staff_leaves_${companyId}`,
    JSON.stringify([...list, leave]),
  );
}
export function deleteStaffLeave(companyId: string, leaveId: string): void {
  const list = getStaffLeaves(companyId).filter((l) => l.leaveId !== leaveId);
  localStorage.setItem(
    `safentry_staff_leaves_${companyId}`,
    JSON.stringify(list),
  );
}
export function isPersonnelOnLeave(
  companyId: string,
  personnelId: string,
  date: string,
): boolean {
  return getStaffLeaves(companyId).some(
    (l) =>
      l.personnelId === personnelId && l.startDate <= date && l.endDate >= date,
  );
}

// ─── Visitor Passes ───────────────────────────────────────────────────────────
export function getVisitorPasses(
  companyId: string,
): import("./types").VisitorPass[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_visitor_passes_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveVisitorPass(
  companyId: string,
  pass: import("./types").VisitorPass,
): void {
  const list = getVisitorPasses(companyId).filter(
    (p) => p.passId !== pass.passId,
  );
  localStorage.setItem(
    `safentry_visitor_passes_${companyId}`,
    JSON.stringify([...list, pass]),
  );
}
export function revokeVisitorPass(companyId: string, passId: string): void {
  const list = getVisitorPasses(companyId).map((p) =>
    p.passId === passId ? { ...p, isActive: false } : p,
  );
  localStorage.setItem(
    `safentry_visitor_passes_${companyId}`,
    JSON.stringify(list),
  );
}
export function findActivePassByTC(
  companyId: string,
  tc: string,
): import("./types").VisitorPass | null {
  const now = Date.now();
  return (
    getVisitorPasses(companyId).find(
      (p) => p.visitorTC === tc && p.isActive && p.expiresAt > now,
    ) ?? null
  );
}
export function findActivePassByQrCode(
  companyId: string,
  qrCode: string,
): import("./types").VisitorPass | null {
  const now = Date.now();
  return (
    getVisitorPasses(companyId).find(
      (p) => p.qrCode === qrCode && p.isActive && p.expiresAt > now,
    ) ?? null
  );
}

// ─── Entry Points ─────────────────────────────────────────────────────────────
export function getEntryPoints(
  companyId: string,
): import("./types").EntryPoint[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_entry_points_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveEntryPoints(
  companyId: string,
  points: import("./types").EntryPoint[],
): void {
  localStorage.setItem(
    `safentry_entry_points_${companyId}`,
    JSON.stringify(points),
  );
}
export function findEntryPointForCategory(
  companyId: string,
  category: string,
): import("./types").EntryPoint | null {
  return (
    getEntryPoints(companyId).find(
      (ep) => ep.categories.length === 0 || ep.categories.includes(category),
    ) ?? null
  );
}

// ─── SLA Rules ────────────────────────────────────────────────────────────────
export function getSlaRules(companyId: string): import("./types").SlaRule[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_sla_rules_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveSlaRule(r: import("./types").SlaRule): void {
  const list = getSlaRules(r.companyId).filter((x) => x.id !== r.id);
  localStorage.setItem(
    `safentry_sla_rules_${r.companyId}`,
    JSON.stringify([...list, r]),
  );
}
export function deleteSlaRule(companyId: string, id: string): void {
  const list = getSlaRules(companyId).filter((x) => x.id !== id);
  localStorage.setItem(`safentry_sla_rules_${companyId}`, JSON.stringify(list));
}

export function getSlaViolations(
  companyId: string,
): import("./types").SlaViolation[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_sla_violations_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveSlaViolation(v: import("./types").SlaViolation): void {
  const list = getSlaViolations(v.companyId).filter((x) => x.id !== v.id);
  localStorage.setItem(
    `safentry_sla_violations_${v.companyId}`,
    JSON.stringify([...list, v]),
  );
}

// ─── Maintenance Requests ─────────────────────────────────────────────────────
export function getMaintenanceRequests(
  companyId: string,
): import("./types").MaintenanceRequest[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_maintenance_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveMaintenanceRequest(
  r: import("./types").MaintenanceRequest,
): void {
  const list = getMaintenanceRequests(r.companyId).filter((x) => x.id !== r.id);
  localStorage.setItem(
    `safentry_maintenance_${r.companyId}`,
    JSON.stringify([...list, r]),
  );
}
