import React, { useState } from "react";
import type { Appointment } from "../types";

interface Props {
  companyId: string;
  appointments: Appointment[];
  onSave: (appt: Appointment) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  approved: "#22c55e",
  cancelled: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Bekliyor",
  approved: "Onaylı",
  cancelled: "İptal",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}

export default function AppointmentCalendarTab({
  companyId: _companyId,
  appointments,
  onSave,
}: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOffset = getFirstDayOfMonth(viewYear, viewMonth);

  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const monthAppts = appointments.filter((a) =>
    a.appointmentDate.startsWith(monthStr),
  );

  const apptsByDay: Record<string, Appointment[]> = {};
  for (const a of monthAppts) {
    if (!apptsByDay[a.appointmentDate]) apptsByDay[a.appointmentDate] = [];
    apptsByDay[a.appointmentDate].push(a);
  }

  const dayNames = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

  const monthNames = [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ];

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
    setSelectedDay(null);
  };

  const todayStr = today.toISOString().slice(0, 10);
  const selectedDayAppts = selectedDay ? (apptsByDay[selectedDay] ?? []) : [];

  const allSorted = [...appointments]
    .filter((a) => a.status !== "cancelled")
    .sort(
      (a, b) =>
        a.appointmentDate.localeCompare(b.appointmentDate) ||
        a.appointmentTime.localeCompare(b.appointmentTime),
    );

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-white">📅 Randevu Takvimi</h2>
        <div className="flex gap-2">
          <button
            type="button"
            data-ocid="randevular.calendar.tab"
            onClick={() => setView("calendar")}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={
              view === "calendar"
                ? {
                    background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                    color: "#fff",
                  }
                : { background: "rgba(255,255,255,0.05)", color: "#94a3b8" }
            }
          >
            📅 Takvim
          </button>
          <button
            type="button"
            data-ocid="randevular.list.tab"
            onClick={() => setView("list")}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={
              view === "list"
                ? {
                    background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                    color: "#fff",
                  }
                : { background: "rgba(255,255,255,0.05)", color: "#94a3b8" }
            }
          >
            📋 Liste
          </button>
        </div>
      </div>

      {view === "calendar" && (
        <>
          <div
            className="p-5 rounded-2xl mb-4"
            style={{
              background: "rgba(14,165,233,0.06)",
              border: "1.5px solid rgba(14,165,233,0.18)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                data-ocid="randevular.pagination_prev"
                onClick={prevMonth}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-teal-400 font-bold hover:bg-teal-500/10 transition-colors"
              >
                ◀
              </button>
              <span className="text-white font-bold text-lg">
                {monthNames[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                data-ocid="randevular.pagination_next"
                onClick={nextMonth}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-teal-400 font-bold hover:bg-teal-500/10 transition-colors"
              >
                ▶
              </button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {dayNames.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs text-slate-500 font-semibold py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: empty spacers
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayAppts = apptsByDay[dateStr] ?? [];
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDay;

                return (
                  <button
                    key={day}
                    type="button"
                    data-ocid="randevular.day.button"
                    onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                    className="relative p-1.5 rounded-xl min-h-[56px] flex flex-col items-center gap-0.5 transition-all hover:brightness-110"
                    style={{
                      background: isSelected
                        ? "rgba(14,165,233,0.2)"
                        : isToday
                          ? "rgba(14,165,233,0.08)"
                          : "rgba(255,255,255,0.02)",
                      border: isSelected
                        ? "1.5px solid rgba(14,165,233,0.6)"
                        : isToday
                          ? "1.5px solid rgba(14,165,233,0.3)"
                          : "1.5px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <span
                      className="text-xs font-semibold"
                      style={{ color: isToday ? "#38bdf8" : "#e2e8f0" }}
                    >
                      {day}
                    </span>
                    {dayAppts.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 justify-center">
                        {dayAppts.slice(0, 3).map((a) => (
                          <span
                            key={a.id}
                            className="w-2 h-2 rounded-full"
                            style={{
                              background: STATUS_COLORS[a.status] ?? "#64748b",
                            }}
                            title={`${a.visitorName} — ${a.appointmentTime}`}
                          />
                        ))}
                        {dayAppts.length > 3 && (
                          <span className="text-[9px] text-slate-400">
                            +{dayAppts.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-3 justify-end">
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: STATUS_COLORS[k] }}
                  />
                  <span className="text-xs text-slate-400">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected day panel */}
          {selectedDay && (
            <div
              data-ocid="randevular.day.panel"
              className="p-5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <h3 className="text-white font-bold mb-3">
                📋{" "}
                {new Date(`${selectedDay}T12:00:00`).toLocaleDateString(
                  "tr-TR",
                  { weekday: "long", day: "numeric", month: "long" },
                )}
              </h3>
              {selectedDayAppts.length === 0 ? (
                <p className="text-slate-500 text-sm">
                  Bu gün için randevu yok
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedDayAppts.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      data-ocid="randevular.appointment.button"
                      onClick={() => setSelectedAppt(a)}
                      className="w-full text-left p-3 rounded-xl flex items-center justify-between gap-3 hover:brightness-110 transition-all"
                      style={{
                        background: "rgba(14,165,233,0.07)",
                        border: "1px solid rgba(14,165,233,0.2)",
                      }}
                    >
                      <div>
                        <span className="text-white font-semibold text-sm">
                          {a.visitorName}
                        </span>
                        <span className="text-slate-400 text-xs ml-2">
                          {a.purpose ?? ""}{" "}
                          {a.hostName ? `→ ${a.hostName}` : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            background: `${STATUS_COLORS[a.status]}22`,
                            color: STATUS_COLORS[a.status],
                          }}
                        >
                          {STATUS_LABELS[a.status]}
                        </span>
                        <span className="text-teal-400 font-mono text-sm">
                          {a.appointmentTime}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {view === "list" && (
        <div className="space-y-2">
          {allSorted.length === 0 ? (
            <div
              data-ocid="randevular.empty_state"
              className="text-center py-12 text-slate-500"
            >
              Henüz randevu yok
            </div>
          ) : (
            allSorted.map((a, i) => (
              <button
                key={a.id}
                type="button"
                data-ocid={`randevular.item.${i + 1}`}
                onClick={() => setSelectedAppt(a)}
                className="w-full text-left p-4 rounded-2xl flex items-center justify-between gap-3 hover:brightness-110 transition-all"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div>
                  <span className="text-white font-semibold">
                    {a.visitorName}
                  </span>
                  <span className="text-slate-400 text-sm ml-2">
                    {a.appointmentDate} {a.appointmentTime}
                  </span>
                  {a.hostName && (
                    <span className="text-slate-500 text-xs ml-2">
                      → {a.hostName}
                    </span>
                  )}
                </div>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold shrink-0"
                  style={{
                    background: `${STATUS_COLORS[a.status]}22`,
                    color: STATUS_COLORS[a.status],
                  }}
                >
                  {STATUS_LABELS[a.status]}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Appointment detail modal */}
      {selectedAppt && (
        <div
          data-ocid="randevular.dialog"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setSelectedAppt(null)}
          onKeyDown={(e) => e.key === "Escape" && setSelectedAppt(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{
              background: "#0f172a",
              border: "1.5px solid rgba(14,165,233,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >
            <div className="flex items-start justify-between">
              <h3 className="text-white font-bold text-lg">
                {selectedAppt.visitorName}
              </h3>
              <button
                type="button"
                data-ocid="randevular.close_button"
                onClick={() => setSelectedAppt(null)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Tarih:</span>
                <span className="text-white">
                  {selectedAppt.appointmentDate} {selectedAppt.appointmentTime}
                </span>
              </div>
              {selectedAppt.hostName && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Ev Sahibi:</span>
                  <span className="text-white">{selectedAppt.hostName}</span>
                </div>
              )}
              {selectedAppt.purpose && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Amaç:</span>
                  <span className="text-white">{selectedAppt.purpose}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Durum:</span>
                <span
                  style={{ color: STATUS_COLORS[selectedAppt.status] }}
                  className="font-semibold"
                >
                  {STATUS_LABELS[selectedAppt.status]}
                </span>
              </div>
              {selectedAppt.notes && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Not:</span>
                  <span className="text-white">{selectedAppt.notes}</span>
                </div>
              )}
            </div>
            {selectedAppt.status === "pending" && (
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  data-ocid="randevular.confirm_button"
                  onClick={() => {
                    onSave({ ...selectedAppt, status: "approved" });
                    setSelectedAppt(null);
                  }}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{
                    background: "rgba(34,197,94,0.25)",
                    border: "1px solid rgba(34,197,94,0.4)",
                  }}
                >
                  ✅ Onayla
                </button>
                <button
                  type="button"
                  data-ocid="randevular.cancel_button"
                  onClick={() => {
                    onSave({ ...selectedAppt, status: "cancelled" });
                    setSelectedAppt(null);
                  }}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-red-400"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.3)",
                  }}
                >
                  ❌ İptal Et
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
