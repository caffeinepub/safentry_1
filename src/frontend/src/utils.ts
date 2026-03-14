export function generateCompanyId(): string {
  return Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join(
    "",
  );
}

export function generateLoginCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from(
    { length: 12 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

export function generateStaffId(): string {
  return Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join(
    "",
  );
}

export function generateVisitorId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return `V${Array.from(
    { length: 7 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("")}`;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("tr-TR");
}

export function hoursSince(ts: number): number {
  return (Date.now() - ts) / 3600000;
}

export function durationLabel(start: number, end?: number): string {
  const ms = (end ?? Date.now()) - start;
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} dk`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}s ${rem}dk`;
}
