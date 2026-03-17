import type {
  Announcement,
  Appointment,
  BlacklistEntry,
  CategoryTimeRestriction,
  Company,
  ContractorPermit,
  Department,
  Invitation,
  ScreeningQuestion,
  SentryNotification,
  Session,
  Staff,
  Visitor,
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
}
export function findStaffById(staffId: string): Staff | null {
  return getAllStaff().find((s) => s.staffId === staffId) ?? null;
}
export function removeStaff(staffId: string) {
  const list = getAllStaff().filter((s) => s.staffId !== staffId);
  localStorage.setItem("safentry_staff", JSON.stringify(list));
}
export function resetStaffCode(staffId: string): string {
  const newCode = Math.floor(10000000 + Math.random() * 90000000).toString();
  const s = findStaffById(staffId);
  if (!s) return newCode;
  const list = getAllStaff().filter((x) => x.staffId !== staffId);
  const updated: Staff = { ...s, staffId: newCode };
  localStorage.setItem("safentry_staff", JSON.stringify([...list, updated]));
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
}
export function removeFromBlacklist(companyId: string, idNumber: string) {
  const list = getBlacklist(companyId).filter((x) => x.idNumber !== idNumber);
  localStorage.setItem(`safentry_bl_${companyId}`, JSON.stringify(list));
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
}
export function deleteAppointment(companyId: string, id: string) {
  const list = getAppointments(companyId).filter((x) => x.id !== id);
  localStorage.setItem(
    `safentry_appointments_${companyId}`,
    JSON.stringify(list),
  );
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
