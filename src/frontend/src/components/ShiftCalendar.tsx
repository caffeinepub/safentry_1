import { useState } from "react";
import { toast } from "sonner";
import type { Staff } from "../types";

export interface ShiftSlot {
  staffId: string;
  staffName: string;
  role: string;
}

export interface ShiftData {
  [dayKey: string]: {
    morning: ShiftSlot[];
    afternoon: ShiftSlot[];
    evening: ShiftSlot[];
  };
}

const DAYS = ["Pzt", "Sal", "\u00c7ar", "Per", "Cum", "Cmt", "Paz"];
const SHIFTS: {
  key: "morning" | "afternoon" | "evening";
  label: string;
  color: string;
  icon: string;
}[] = [
  {
    key: "morning",
    label: "Sabah (06-14)",
    color: "#f59e0b",
    icon: "\ud83c\udf05",
  },
  {
    key: "afternoon",
    label: "\u00d6\u011fle (14-22)",
    color: "#0ea5e9",
    icon: "\u2600\ufe0f",
  },
  {
    key: "evening",
    label: "Gece (22-06)",
    color: "#8b5cf6",
    icon: "\ud83c\udf19",
  },
];

function getWeekKey(): string {
  const d = new Date();
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return monday.toISOString().split("T")[0];
}

function getDayDates(): string[] {
  const monday = new Date(getWeekKey());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  });
}

interface Props {
  companyId: string;
  staffList: Staff[];
}

export default function ShiftCalendar({ companyId, staffList }: Props) {
  const storageKey = `safentry_shifts_${companyId}`;
  const load = (): ShiftData => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "{}");
    } catch {
      return {};
    }
  };

  const [shifts, setShifts] = useState<ShiftData>(load);
  const [selecting, setSelecting] = useState<{
    day: number;
    shift: "morning" | "afternoon" | "evening";
  } | null>(null);

  const save = (next: ShiftData) => {
    setShifts(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const weekKey = getWeekKey();
  const dayDates = getDayDates();

  const getSlots = (
    day: number,
    shift: "morning" | "afternoon" | "evening",
  ): ShiftSlot[] => {
    return shifts[`${weekKey}_${day}`]?.[shift] ?? [];
  };

  const addToSlot = (
    day: number,
    shift: "morning" | "afternoon" | "evening",
    staff: Staff,
  ) => {
    const key = `${weekKey}_${day}`;
    const dayData = shifts[key] ?? { morning: [], afternoon: [], evening: [] };
    const existing = dayData[shift];
    if (existing.find((s) => s.staffId === staff.staffId)) return;
    const next: ShiftData = {
      ...shifts,
      [key]: {
        ...dayData,
        [shift]: [
          ...existing,
          { staffId: staff.staffId, staffName: staff.name, role: staff.role },
        ],
      },
    };
    save(next);
    setSelecting(null);
    toast.success(
      `${staff.name} ${
        shift === "morning"
          ? "sabah"
          : shift === "afternoon"
            ? "\u00f6\u011fle"
            : "gece"
      } vardiyasına eklendi`,
    );
  };

  const removeFromSlot = (
    day: number,
    shift: "morning" | "afternoon" | "evening",
    staffId: string,
  ) => {
    const key = `${weekKey}_${day}`;
    const dayData = shifts[key] ?? { morning: [], afternoon: [], evening: [] };
    const next: ShiftData = {
      ...shifts,
      [key]: {
        ...dayData,
        [shift]: dayData[shift].filter((s) => s.staffId !== staffId),
      },
    };
    save(next);
  };

  return (
    <div data-ocid="shifts.panel">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold text-base">
          \ud83d\udcc5 Haftalık Vardiya Planı
        </h3>
        <span className="text-slate-400 text-xs">{weekKey} haftası</span>
      </div>
      <div className="overflow-x-auto">
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: "120px repeat(7, 1fr)",
            minWidth: "800px",
          }}
        >
          {/* Header */}
          <div />
          {DAYS.map((d, i) => (
            <div key={d} className="text-center">
              <div className="text-slate-300 font-medium text-sm">{d}</div>
              <div className="text-slate-500 text-xs">{dayDates[i]}</div>
            </div>
          ))}

          {/* Shift rows */}
          {SHIFTS.map(({ key: shiftKey, label, color, icon }) => (
            <div key={shiftKey} className="contents">
              <div className="flex items-center gap-2 py-2">
                <span>{icon}</span>
                <span className="text-xs font-medium" style={{ color }}>
                  {label}
                </span>
              </div>
              {Array.from({ length: 7 }, (_, dayIdx) => (
                <div
                  key={`slot_${shiftKey}_${dayDates[dayIdx] ?? dayIdx}`}
                  className="rounded-xl p-2 min-h-[70px] flex flex-col gap-1"
                  style={{
                    background: `${color}08`,
                    border: `1px solid ${color}20`,
                  }}
                >
                  {getSlots(dayIdx, shiftKey).map((slot) => (
                    <div
                      key={slot.staffId}
                      className="flex items-center justify-between gap-1 px-2 py-1 rounded-lg text-xs"
                      style={{
                        background: `${color}20`,
                        border: `1px solid ${color}40`,
                      }}
                    >
                      <span className="text-white truncate">
                        {slot.staffName}
                      </span>
                      <button
                        type="button"
                        data-ocid="shifts.remove.button"
                        onClick={() =>
                          removeFromSlot(dayIdx, shiftKey, slot.staffId)
                        }
                        className="text-slate-400 hover:text-red-400 flex-shrink-0"
                      >
                        \u2715
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    data-ocid="shifts.add.button"
                    onClick={() =>
                      setSelecting({ day: dayIdx, shift: shiftKey })
                    }
                    className="mt-auto w-full py-1 rounded-lg text-xs text-slate-500 hover:text-white transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px dashed rgba(255,255,255,0.15)",
                    }}
                  >
                    + Ekle
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Staff picker modal */}
      {selecting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="w-80 rounded-2xl p-6"
            style={{
              background: "#111827",
              border: "1.5px solid rgba(14,165,233,0.3)",
            }}
          >
            <h4 className="text-white font-bold mb-4">
              Personel Se\u00e7in \u2014 {DAYS[selecting.day]}{" "}
              {SHIFTS.find((s) => s.key === selecting.shift)?.label}
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {staffList.map((s) => (
                <button
                  key={s.staffId}
                  type="button"
                  data-ocid="shifts.staff_select.button"
                  onClick={() => addToSlot(selecting.day, selecting.shift, s)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:opacity-80"
                  style={{
                    background: "rgba(14,165,233,0.08)",
                    border: "1px solid rgba(14,165,233,0.2)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{
                      background: "rgba(14,165,233,0.2)",
                      color: "#0ea5e9",
                    }}
                  >
                    {s.name[0]}
                  </div>
                  <div>
                    <div className="text-white text-sm font-medium">
                      {s.name}
                    </div>
                    <div className="text-slate-400 text-xs">{s.role}</div>
                  </div>
                </button>
              ))}
              {staffList.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-4">
                  Personel bulunamadı
                </p>
              )}
            </div>
            <button
              type="button"
              data-ocid="shifts.cancel.button"
              onClick={() => setSelecting(null)}
              className="mt-4 w-full py-2 rounded-xl text-slate-400 hover:text-white transition-colors text-sm"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              \u0130ptal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
