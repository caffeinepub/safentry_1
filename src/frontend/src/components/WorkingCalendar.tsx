import { useState } from "react";
import { toast } from "sonner";
import {
  deleteHoliday,
  getHolidays,
  getWorkingDays,
  saveHoliday,
  saveWorkingDays,
} from "../store";
import type { HolidayEntry, WorkingDay } from "../types";
import { generateId } from "../utils";

interface Props {
  companyId: string;
}

const DAY_LABELS = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];

const PRESET_HOLIDAYS = [
  { date: "", name: "1 Ocak Yılbaşı", dd: "01-01" },
  { date: "", name: "23 Nisan Ulusal Egemenlik", dd: "04-23" },
  { date: "", name: "1 Mayıs İşçi Bayramı", dd: "05-01" },
  { date: "", name: "19 Mayıs Atatürk'ü Anma", dd: "05-19" },
  { date: "", name: "15 Temmuz Demokrasi Bayramı", dd: "07-15" },
  { date: "", name: "30 Ağustos Zafer Bayramı", dd: "08-30" },
  { date: "", name: "29 Ekim Cumhuriyet Bayramı", dd: "10-29" },
];

export default function WorkingCalendar({ companyId }: Props) {
  const year = new Date().getFullYear();
  const [days, setDays] = useState<WorkingDay[]>(() =>
    getWorkingDays(companyId),
  );
  const [holidays, setHolidays] = useState<HolidayEntry[]>(() =>
    getHolidays(companyId),
  );
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");
  const [saved, setSaved] = useState(false);

  const reloadHolidays = () => setHolidays(getHolidays(companyId));

  const updateDay = (
    idx: number,
    field: keyof WorkingDay,
    value: string | boolean,
  ) => {
    setDays((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
    setSaved(false);
  };

  const saveDays = () => {
    saveWorkingDays(companyId, days);
    setSaved(true);
    toast.success("Çalışma saatleri kaydedildi.");
  };

  const addHoliday = () => {
    if (!newHolidayDate) {
      toast.error("Tarih seçin.");
      return;
    }
    if (!newHolidayName.trim()) {
      toast.error("Tatil adı girin.");
      return;
    }
    const h: HolidayEntry = {
      id: generateId(),
      companyId,
      date: newHolidayDate,
      name: newHolidayName.trim(),
    };
    saveHoliday(h);
    reloadHolidays();
    setNewHolidayDate("");
    setNewHolidayName("");
    toast.success("Tatil eklendi.");
  };

  const removeHoliday = (id: string) => {
    deleteHoliday(companyId, id);
    reloadHolidays();
    toast.success("Tatil silindi.");
  };

  const addPreset = (dd: string, name: string) => {
    const date = `${year}-${dd}`;
    if (holidays.find((h) => h.date === date)) {
      toast.error("Bu tatil zaten ekli.");
      return;
    }
    const h: HolidayEntry = { id: generateId(), companyId, date, name };
    saveHoliday(h);
    reloadHolidays();
    toast.success(`${name} eklendi.`);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-white font-bold text-xl mb-1">
          📅 Çalışma Takvimi
        </h2>
        <p className="text-slate-400 text-sm">
          Haftalık çalışma saatleri ve resmi tatiller
        </p>
      </div>

      {/* Working days */}
      <div
        className="p-6 rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <h3 className="text-white font-semibold mb-4">
          ⏰ Haftalık Çalışma Saatleri
        </h3>
        <div className="space-y-3">
          {days.map((day, i) => (
            <div
              key={DAY_LABELS[i]}
              data-ocid={`workcal.day.${i + 1}`}
              className="flex items-center gap-3 flex-wrap"
            >
              <button
                type="button"
                onClick={() => updateDay(i, "enabled", !day.enabled)}
                className="relative w-10 h-5 rounded-full transition-colors shrink-0"
                style={{
                  background: day.enabled
                    ? "#0ea5e9"
                    : "rgba(255,255,255,0.15)",
                }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-transform"
                  style={{
                    transform: day.enabled
                      ? "translateX(1.25rem)"
                      : "translateX(0.125rem)",
                  }}
                />
              </button>
              <span
                className="text-sm w-24 shrink-0"
                style={{ color: day.enabled ? "#e2e8f0" : "#475569" }}
              >
                {DAY_LABELS[i]}
              </span>
              {day.enabled ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={day.start}
                    onChange={(e) => updateDay(i, "start", e.target.value)}
                    className="px-2 py-1.5 rounded-lg text-white text-sm outline-none"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                  />
                  <span className="text-slate-500 text-sm">–</span>
                  <input
                    type="time"
                    value={day.end}
                    onChange={(e) => updateDay(i, "end", e.target.value)}
                    className="px-2 py-1.5 rounded-lg text-white text-sm outline-none"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                  />
                </div>
              ) : (
                <span className="text-slate-600 text-xs">Kapalı</span>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          data-ocid="workcal.save_button"
          onClick={saveDays}
          className="mt-5 px-5 py-2 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-80"
          style={{
            background: saved
              ? "rgba(34,197,94,0.3)"
              : "linear-gradient(135deg,#0ea5e9,#0284c7)",
          }}
        >
          {saved ? "✓ Kaydedildi" : "Kaydet"}
        </button>
      </div>

      {/* Holidays */}
      <div
        className="p-6 rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <h3 className="text-white font-semibold mb-4">
          🗓️ Resmi Tatil ve Bayram Günleri
        </h3>

        {/* Quick-add presets */}
        <div className="mb-4">
          <p className="text-slate-500 text-xs mb-2">Hızlı Ekle ({year}):</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_HOLIDAYS.map((p) => (
              <button
                key={p.dd}
                type="button"
                onClick={() => addPreset(p.dd, p.name)}
                className="px-2.5 py-1 rounded-lg text-xs transition-all hover:opacity-80"
                style={{
                  background: holidays.find((h) => h.date === `${year}-${p.dd}`)
                    ? "rgba(34,197,94,0.2)"
                    : "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: holidays.find((h) => h.date === `${year}-${p.dd}`)
                    ? "#4ade80"
                    : "#94a3b8",
                }}
              >
                {holidays.find((h) => h.date === `${year}-${p.dd}`)
                  ? "✓ "
                  : "+ "}
                {p.name.split(" ").slice(0, 2).join(" ")}
              </button>
            ))}
          </div>
        </div>

        {/* Add custom */}
        <div className="flex gap-2 flex-wrap mb-4">
          <input
            data-ocid="holiday.date.input"
            type="date"
            value={newHolidayDate}
            onChange={(e) => setNewHolidayDate(e.target.value)}
            className="px-3 py-2 rounded-xl text-white text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          />
          <input
            data-ocid="holiday.input"
            type="text"
            value={newHolidayName}
            onChange={(e) => setNewHolidayName(e.target.value)}
            placeholder="Tatil adı..."
            className="flex-1 min-w-36 px-3 py-2 rounded-xl text-white text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          />
          <button
            type="button"
            data-ocid="holiday.add_button"
            onClick={addHoliday}
            className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
            style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
          >
            Ekle
          </button>
        </div>

        {/* Holiday list */}
        {holidays.length === 0 ? (
          <p
            className="text-slate-600 text-sm"
            data-ocid="holidays.empty_state"
          >
            Tatil eklenmemiş.
          </p>
        ) : (
          <div className="space-y-2">
            {holidays
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((h, i) => (
                <div
                  key={h.id}
                  data-ocid={`holidays.item.${i + 1}`}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{
                    background: "rgba(245,158,11,0.08)",
                    border: "1px solid rgba(245,158,11,0.2)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-amber-400 font-mono text-sm">
                      {new Date(`${h.date}T12:00`).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-white text-sm">{h.name}</span>
                  </div>
                  <button
                    type="button"
                    data-ocid={`holidays.delete_button.${i + 1}`}
                    onClick={() => removeHoliday(h.id)}
                    className="px-2.5 py-1 rounded-lg text-xs"
                    style={{
                      background: "rgba(239,68,68,0.15)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "#ef4444",
                    }}
                  >
                    🗑️
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
