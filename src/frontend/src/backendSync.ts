/**
 * backendSync.ts
 * Manages background sync between localStorage and the Motoko backend.
 * localStorage remains the source of truth for reads; backend is written
 * fire-and-forget and read once on login to hydrate local state.
 */
import {
  AppointmentStatus,
  HostApprovalStatus,
  StaffRole,
  type backendInterface,
} from "./backend";
import type { Appointment, BlacklistEntry, Staff, Visitor } from "./types";

let _actor: backendInterface | null = null;

export function setBackendActor(actor: backendInterface | null) {
  _actor = actor;
}

// ─── Visitors ────────────────────────────────────────────────────────────────

/** Fire-and-forget: write visitor to backend */
export function syncSaveVisitor(visitor: Visitor): void {
  if (!_actor) return;
  const backendVisitor = {
    visitorId: visitor.visitorId,
    companyId: visitor.companyId,
    name: visitor.name,
    idNumber: visitor.idNumber,
    phone: visitor.phone,
    company: visitor.visitType ?? "",
    purpose: visitor.visitReason,
    category: "external" as const,
    department: "engineering" as const,
    host: visitor.hostStaffId,
    arrivalTime: BigInt(visitor.arrivalTime),
    departureTime:
      visitor.departureTime != null ? BigInt(visitor.departureTime) : undefined,
    status: (visitor.status === "departed"
      ? "departed"
      : visitor.status === "active"
        ? "active"
        : "active") as any,
    badgeQr: visitor.badgeQr,
    badgeExpired: visitor.badgeExpired ?? false,
    accessCardNumber: visitor.accessCardNumber ?? undefined,
    accessCardReturned: visitor.accessCardReturned ?? false,
    notes: visitor.notes,
    createdAt: BigInt(visitor.createdAt),
  };
  _actor.saveVisitor(backendVisitor as any).catch(() => {
    // silent — localStorage already saved
  });
}

// ─── Blacklist ────────────────────────────────────────────────────────────────

/** Fire-and-forget: add blacklist entry to backend */
export function syncAddBlacklist(entry: BlacklistEntry): void {
  if (!_actor) return;
  const backendEntry = {
    companyId: entry.companyId,
    idNumber: entry.idNumber,
    name: "",
    reason: entry.reason,
    category: entry.reasonCategory ?? "other",
    addedAt: BigInt(entry.addedAt),
    addedBy: entry.addedBy,
  };
  _actor.addBlacklistEntry(backendEntry as any).catch(() => {});
}

/** Fire-and-forget: remove blacklist entry from backend */
export function syncRemoveBlacklist(companyId: string, idNumber: string): void {
  if (!_actor) return;
  _actor.removeBlacklistEntry(companyId, idNumber).catch(() => {});
}

// ─── Staff ────────────────────────────────────────────────────────────────────

/** Fire-and-forget: write staff member to backend (called on registration) */
export function syncSaveStaff(staff: Staff): void {
  if (!_actor) return;
  const backendRole =
    staff.role === "admin" ? StaffRole.admin : StaffRole.security;
  _actor
    .registerStaff(staff.staffId, staff.companyId, staff.name, backendRole)
    .catch(() => {});
}

/** Fire-and-forget: remove staff member from backend */
export function syncRemoveStaff(staffId: string, companyId: string): void {
  if (!_actor) return;
  (_actor as any).removeStaff?.(staffId, companyId)?.catch(() => {});
}

// ─── Appointments ────────────────────────────────────────────────────────────

/** Fire-and-forget: write appointment to backend */
export function syncSaveAppointment(appt: Appointment): void {
  if (!_actor) return;
  const backendAppt = {
    id: appt.id,
    companyId: appt.companyId,
    visitorName: appt.visitorName,
    visitorId: appt.visitorId,
    hostName: appt.hostName,
    appointmentDate: BigInt(new Date(appt.appointmentDate).getTime()),
    appointmentTime: appt.appointmentTime,
    purpose: appt.purpose,
    notes: appt.notes ?? "",
    status:
      appt.status === "approved"
        ? AppointmentStatus.approved
        : appt.status === "cancelled"
          ? AppointmentStatus.cancelled
          : AppointmentStatus.pending,
    createdBy: appt.createdBy,
    createdAt: BigInt(appt.createdAt),
    hostStaffId: appt.hostStaffId ?? "",
    noShow: appt.noShow ?? false,
    hostApprovalStatus:
      appt.hostApprovalStatus === "approved"
        ? HostApprovalStatus.approved
        : appt.hostApprovalStatus === "rejected"
          ? HostApprovalStatus.rejected
          : HostApprovalStatus.pending,
    meetingRoomId: appt.meetingRoomId ?? "",
  };
  _actor.saveAppointment(backendAppt as any).catch(() => {});
}

/** Fire-and-forget: delete appointment from backend */
export function syncDeleteAppointment(companyId: string, id: string): void {
  if (!_actor) return;
  _actor.deleteAppointment(companyId, id).catch(() => {});
}

// ─── Full sync on login ───────────────────────────────────────────────────────

/**
 * Called once after successful company or staff login.
 * Pulls backend data and merges into localStorage (backend wins for overlaps).
 */
export async function syncFromBackend(
  actor: backendInterface,
  companyId: string,
): Promise<void> {
  try {
    const backendVisitors = await actor.getVisitors(companyId);
    const backendBlacklist = await actor.getBlacklist(companyId);
    const backendStaff = await actor.getStaffByCompanyId(companyId);

    // ── Merge visitors ──────────────────────────────────────────────
    if (backendVisitors.length > 0) {
      const localRaw = localStorage.getItem(`safentry_visitors_${companyId}`);
      const localVisitors: Visitor[] = localRaw ? JSON.parse(localRaw) : [];
      const localMap = new Map(localVisitors.map((v) => [v.visitorId, v]));

      for (const bv of backendVisitors) {
        const bvIdStr = String(bv.visitorId);
        const existing = localMap.get(bvIdStr);
        if (existing) {
          localMap.set(bvIdStr, {
            ...existing,
            name: bv.name,
            idNumber: bv.idNumber,
            phone: bv.phone,
            visitType: bv.company,
            visitReason: bv.purpose,
            hostStaffId: bv.host,
            arrivalTime: Number(bv.arrivalTime),
            departureTime:
              bv.departureTime != null ? Number(bv.departureTime) : undefined,
            status: bv.status as "active" | "departed" | "preregistered",
            badgeQr: bv.badgeQr,
            badgeExpired: bv.badgeExpired,
            notes: bv.notes,
            accessCardNumber: bv.accessCardNumber ?? undefined,
            accessCardReturned: bv.accessCardReturned,
            createdAt: Number(bv.createdAt),
          });
        } else {
          const newV: Visitor = {
            visitorId: bvIdStr,
            companyId: bv.companyId,
            registeredBy: "",
            name: bv.name,
            idNumber: bv.idNumber,
            phone: bv.phone,
            hostStaffId: bv.host,
            arrivalTime: Number(bv.arrivalTime),
            departureTime:
              bv.departureTime != null ? Number(bv.departureTime) : undefined,
            visitReason: bv.purpose,
            visitType: bv.company,
            ndaAccepted: false,
            signatureData: "",
            label: "normal",
            status: bv.status as "active" | "departed" | "preregistered",
            badgeQr: bv.badgeQr,
            badgeExpired: bv.badgeExpired,
            notes: bv.notes,
            category: String(bv.category),
            department: String(bv.department),
            accessCardNumber: bv.accessCardNumber ?? undefined,
            accessCardReturned: bv.accessCardReturned,
            createdAt: Number(bv.createdAt),
          };
          localMap.set(bvIdStr, newV);
        }
      }
      localStorage.setItem(
        `safentry_visitors_${companyId}`,
        JSON.stringify(Array.from(localMap.values())),
      );
    }

    // ── Merge blacklist ─────────────────────────────────────────────
    if (backendBlacklist.length > 0) {
      const localRaw = localStorage.getItem(`safentry_bl_${companyId}`);
      const localBl: BlacklistEntry[] = localRaw ? JSON.parse(localRaw) : [];
      const localMap = new Map(localBl.map((e) => [e.idNumber, e]));

      for (const be of backendBlacklist) {
        if (!localMap.has(be.idNumber)) {
          localMap.set(be.idNumber, {
            companyId: be.companyId,
            idNumber: be.idNumber,
            reason: be.reason,
            reasonCategory: be.category || undefined,
            addedBy: be.addedBy,
            addedAt: Number(be.addedAt),
          });
        }
      }
      localStorage.setItem(
        `safentry_bl_${companyId}`,
        JSON.stringify(Array.from(localMap.values())),
      );
    }

    // ── Merge staff ─────────────────────────────────────────────────
    if (backendStaff.length > 0) {
      const localRaw = localStorage.getItem("safentry_staff");
      const localStaff: Staff[] = localRaw ? JSON.parse(localRaw) : [];
      const localMap = new Map(localStaff.map((s) => [s.staffId, s]));

      for (const bs of backendStaff) {
        if (!localMap.has(bs.staffId)) {
          const newS: Staff = {
            staffId: bs.staffId,
            companyId: bs.companyId,
            name: bs.name,
            role: bs.role === StaffRole.admin ? "admin" : "staff",
            availabilityStatus: "available",
            createdAt: Number(bs.createdAt),
          };
          localMap.set(bs.staffId, newS);
        }
      }
      localStorage.setItem(
        "safentry_staff",
        JSON.stringify(Array.from(localMap.values())),
      );
    }

    // ── Merge appointments ──────────────────────────────────────────
    const backendAppointments = await actor.getAppointments(companyId);
    if (backendAppointments.length > 0) {
      const localRaw = localStorage.getItem(
        `safentry_appointments_${companyId}`,
      );
      const localAppts: any[] = localRaw ? JSON.parse(localRaw) : [];
      const localMap = new Map(localAppts.map((a) => [a.id, a]));

      for (const ba of backendAppointments) {
        if (!localMap.has(ba.id)) {
          localMap.set(ba.id, {
            id: ba.id,
            companyId: ba.companyId,
            visitorName: ba.visitorName,
            visitorId: ba.visitorId,
            hostName: ba.hostName,
            appointmentDate: new Date(Number(ba.appointmentDate))
              .toISOString()
              .split("T")[0],
            appointmentTime: ba.appointmentTime,
            purpose: ba.purpose,
            notes: ba.notes || undefined,
            status: ba.status,
            createdBy: ba.createdBy,
            createdAt: Number(ba.createdAt),
            hostStaffId: ba.hostStaffId || undefined,
            noShow: ba.noShow,
            hostApprovalStatus: ba.hostApprovalStatus || undefined,
            meetingRoomId: ba.meetingRoomId || undefined,
          });
        }
      }
      localStorage.setItem(
        `safentry_appointments_${companyId}`,
        JSON.stringify(Array.from(localMap.values())),
      );
    }
  } catch {
    // silent failure — app works from localStorage
  }
}
