/**
 * backendSync.ts
 * Manages background sync between localStorage and the Motoko backend.
 * localStorage remains the source of truth for reads; backend is written
 * fire-and-forget and read once on login to hydrate local state.
 */
import { StaffRole, type backendInterface } from "./backend";
import type { BlacklistEntry, Staff, Visitor } from "./types";

let _actor: backendInterface | null = null;

export function setBackendActor(actor: backendInterface | null) {
  _actor = actor;
}

// ─── Visitors ────────────────────────────────────────────────────────────────

/** Fire-and-forget: write visitor to backend */
export function syncSaveVisitor(visitor: Visitor): void {
  if (!_actor) return;
  // Generate a numeric id from the visitorId string
  const numericId = BigInt(
    visitor.visitorId.replace(/\D/g, "").slice(0, 15) || "1",
  );
  const backendVisitor = {
    visitorId: numericId,
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
  _actor.addVisitor(backendVisitor as any).catch(() => {
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
    const [backendVisitors, backendBlacklist, backendStaff] = await Promise.all(
      [
        actor.getVisitorsByCompany(companyId),
        actor.getBlacklistEntries(companyId),
        actor.getStaffByCompanyId(companyId),
      ],
    );

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
  } catch {
    // silent failure — app works from localStorage
  }
}
