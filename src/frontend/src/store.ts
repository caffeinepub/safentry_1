import type {
  Announcement,
  Appointment,
  BlacklistEntry,
  Company,
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

export function getCustomCategories(companyId: string): string[] {
  const company = findCompanyById(companyId);
  if (company?.customCategories && company.customCategories.length > 0) {
    return company.customCategories;
  }
  return DEFAULT_CATEGORIES;
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
