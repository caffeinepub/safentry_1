import type { AuditLog } from "./types";
import { generateId } from "./utils";

export function getAuditLogs(companyId: string): AuditLog[] {
  try {
    return JSON.parse(localStorage.getItem(`auditLogs_${companyId}`) || "[]");
  } catch {
    return [];
  }
}

export function addAuditLog(
  companyId: string,
  actorName: string,
  actorId: string,
  action: string,
  details: string,
) {
  const log: AuditLog = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    actorName,
    actorId,
    action,
    details,
    companyId,
  };
  const list = getAuditLogs(companyId);
  localStorage.setItem(
    `auditLogs_${companyId}`,
    JSON.stringify([log, ...list].slice(0, 500)),
  );
}
