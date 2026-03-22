import React, { useMemo, useState } from "react";

interface DocEvent {
  id: string;
  name: string;
  type: string;
  expiryDate: string; // YYYY-MM-DD
  daysLeft: number;
  status: "expired" | "soon" | "valid";
}

interface Props {
  companyId: string;
}

function getDocEvents(companyId: string): DocEvent[] {
  const events: DocEvent[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  // Work permits
  const permitsRaw = localStorage.getItem(`safentry_permits_${companyId}`);
  if (permitsRaw) {
    try {
      const permits = JSON.parse(permitsRaw);
      for (const p of permits) {
        if (!p.expiryDate) continue;
        const exp = new Date(p.expiryDate);
        exp.setHours(0, 0, 0, 0);
        const daysLeft = Math.round((exp.getTime() - todayMs) / 86400000);
        events.push({
          id: p.id,
          name: p.contractorName || p.name || "—",
          type: "İş İzni",
          expiryDate: p.expiryDate,
          daysLeft,
          status: daysLeft < 0 ? "expired" : daysLeft <= 7 ? "soon" : "valid",
        });
      }
    } catch (_) {}
  }

  // Contractor competency docs
  const docsRaw = localStorage.getItem(`safentry_contractor_docs_${companyId}`);
  if (docsRaw) {
    try {
      const docs = JSON.parse(docsRaw);
      for (const d of docs) {
        if (!d.expiryDate) continue;
        const exp = new Date(d.expiryDate);
        exp.setHours(0, 0, 0, 0);
        const daysLeft = Math.round((exp.getTime() - todayMs) / 86400000);
        events.push({
          id: d.id || d.docId || String(Math.random()),
          name: d.contractorName || d.name || "—",
          type: d.docType || "Sertifika",
          expiryDate: d.expiryDate,
          daysLeft,
          status: daysLeft < 0 ? "expired" : daysLeft <= 7 ? "soon" : "valid",
        });
      }
    } catch (_) {}
  }

  return events.sort((a, b) => a.daysLeft - b.daysLeft);
}

function calendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const offset = (firstDay + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { offset, daysInMonth };
}

export default function DocumentCalendarTab({ companyId }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const events = useMemo(() => getDocEvents(companyId), [companyId]);

  const thisWeekCount = events.filter(
    (e) => e.daysLeft >= 0 && e.daysLeft <= 7,
  ).length;
  const thisMonthCount = events.filter(
    (e) => e.daysLeft >= 0 && e.daysLeft <= 30,
  ).length;
  const expiredCount = events.filter((e) => e.status === "expired").length;

  const { offset, daysInMonth } = calendarDays(viewYear, viewMonth);

  // Build a map of day -> status (worst status wins)
  const dayStatusMap: Record<number, "expired" | "soon" | "valid"> = {};
  for (const e of events) {
    if (!e.expiryDate) continue;
    const d = new Date(e.expiryDate);
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
      const day = d.getDate();
      const prev = dayStatusMap[day];
      if (
        !prev ||
        e.status === "expired" ||
        (e.status === "soon" && prev === "valid")
      ) {
        dayStatusMap[day] = e.status;
      }
    }
  }

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  };

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    "tr-TR",
    { month: "long", year: "numeric" },
  );

  const statusColor = { expired: "#ef4444", soon: "#f59e0b", valid: "#22c55e" };
  const statusLabel = {
    expired: "Süresi Dolmuş",
    soon: "Bu Hafta Dolacak",
    valid: "Geçerli",
  };

  return (
    <div className="space-y-6" data-ocid="docscalendar.section">
      <h2 className="text-white font-bold text-lg">
        📅 Belge Geçerlilik Takvimi
      </h2>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Bu Hafta Dolacak", count: thisWeekCount, color: "#f59e0b" },
          { label: "Bu Ay Dolacak", count: thisMonthCount, color: "#0ea5e9" },
          { label: "Süresi Dolmuş", count: expiredCount, color: "#ef4444" },
        ].map((s) => (
          <div
            key={s.label}
            className="p-4 rounded-2xl text-center"
            style={{
              background: `${s.color}0d`,
              border: `1px solid ${s.color}30`,
            }}
          >
            <div className="text-2xl font-bold" style={{ color: s.color }}>
              {s.count}
            </div>
            <div className="text-slate-400 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div
        className="p-5 rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            data-ocid="docscalendar.prev_button"
            onClick={prevMonth}
            className="px-3 py-1.5 rounded-xl text-slate-300 hover:bg-white/10 transition-all text-sm"
          >
            ‹
          </button>
          <span className="text-white font-semibold capitalize">
            {monthName}
          </span>
          <button
            type="button"
            data-ocid="docscalendar.next_button"
            onClick={nextMonth}
            className="px-3 py-1.5 rounded-xl text-slate-300 hover:bg-white/10 transition-all text-sm"
          >
            ›
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-2">
          {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((d) => (
            <div
              key={d}
              className="text-center text-slate-500 text-xs py-1 font-medium"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: offset }, (_, i) => i).map((i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const status = dayStatusMap[day];
            const isToday =
              today.getFullYear() === viewYear &&
              today.getMonth() === viewMonth &&
              today.getDate() === day;
            return (
              <div
                key={day}
                className="aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-all relative"
                style={{
                  background: isToday ? "rgba(14,165,233,0.15)" : "transparent",
                  border: isToday
                    ? "1px solid rgba(14,165,233,0.4)"
                    : "1px solid transparent",
                  color: isToday ? "#0ea5e9" : "#94a3b8",
                }}
              >
                {day}
                {status && (
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-0.5"
                    style={{ background: statusColor[status] }}
                    title={statusLabel[status]}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 pt-4 border-t border-white/08">
          {Object.entries(statusColor).map(([k, color]) => (
            <div key={k} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: color }}
              />
              <span className="text-slate-500 text-xs">
                {statusLabel[k as keyof typeof statusLabel]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming expirations list */}
      <div
        className="p-5 rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <h3 className="text-slate-300 font-semibold mb-4 text-sm">
          📋 Yaklaşan Son Tarihler
        </h3>
        {events.length === 0 ? (
          <div
            data-ocid="docscalendar.empty_state"
            className="text-center py-8 text-slate-500"
          >
            <div className="text-3xl mb-2">📅</div>
            <p className="text-sm">Kayıtlı belge bulunamadı</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.slice(0, 20).map((e) => (
              <div
                key={e.id}
                data-ocid={`docscalendar.item.${e.id}`}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${statusColor[e.status]}30`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: statusColor[e.status] }}
                  />
                  <div>
                    <div className="text-white text-sm font-medium">
                      {e.name}
                    </div>
                    <div className="text-slate-500 text-xs">{e.type}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="text-xs font-medium"
                    style={{ color: statusColor[e.status] }}
                  >
                    {e.daysLeft < 0
                      ? `${Math.abs(e.daysLeft)} gün önce doldu`
                      : e.daysLeft === 0
                        ? "Bugün doluyor!"
                        : `${e.daysLeft} gün kaldı`}
                  </div>
                  <div className="text-slate-500 text-xs">{e.expiryDate}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
