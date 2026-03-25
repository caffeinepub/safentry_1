import React, { useState } from "react";

interface BlackoutPeriod {
  id: string;
  title: string;
  reason: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  message: string;
  active: boolean;
  createdAt: string;
}

interface Props {
  companyId: string;
}

const STORAGE_KEY = (cid: string) => `blackoutPeriods_${cid}`;

function load(companyId: string): BlackoutPeriod[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY(companyId)) || "[]");
  } catch {
    return [];
  }
}

function save(companyId: string, data: BlackoutPeriod[]) {
  localStorage.setItem(STORAGE_KEY(companyId), JSON.stringify(data));
}

const REASONS = [
  "Genel Kurul",
  "Gizli Toplantı",
  "Teknik Bakım",
  "Denetim",
  "Kapasite Dolumu",
  "Güvenlik Operasyonu",
  "Diğer",
];

export function isBlackoutActive(companyId: string): {
  active: boolean;
  period?: BlackoutPeriod;
} {
  const periods = load(companyId);
  const now = new Date();
  const activePeriod = periods.find((p) => {
    if (!p.active) return false;
    const start = new Date(
      `${p.startDate}T${p.allDay ? "00:00" : p.startTime}`,
    );
    const end = new Date(`${p.endDate}T${p.allDay ? "23:59" : p.endTime}`);
    return now >= start && now <= end;
  });
  return { active: !!activePeriod, period: activePeriod };
}

export default function BlackoutPeriodsTab({ companyId }: Props) {
  const [periods, setPeriods] = useState<BlackoutPeriod[]>(() =>
    load(companyId),
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    reason: REASONS[0],
    startDate: "",
    endDate: "",
    startTime: "09:00",
    endTime: "18:00",
    allDay: false,
    message:
      "Bu süreçte ziyaret kabul edilememektedir. Lütfen randevunuzu değiştiriniz.",
  });

  const today = new Date().toISOString().split("T")[0];

  function addPeriod() {
    if (!form.title.trim() || !form.startDate || !form.endDate) return;
    const newP: BlackoutPeriod = {
      id: Date.now().toString(),
      ...form,
      active: true,
      createdAt: new Date().toISOString(),
    };
    const updated = [newP, ...periods];
    setPeriods(updated);
    save(companyId, updated);
    setShowForm(false);
    setForm({
      title: "",
      reason: REASONS[0],
      startDate: "",
      endDate: "",
      startTime: "09:00",
      endTime: "18:00",
      allDay: false,
      message:
        "Bu süreçte ziyaret kabul edilememektedir. Lütfen randevunuzu değiştiriniz.",
    });
  }

  function toggle(id: string) {
    const updated = periods.map((p) =>
      p.id === id ? { ...p, active: !p.active } : p,
    );
    setPeriods(updated);
    save(companyId, updated);
  }

  function remove(id: string) {
    const updated = periods.filter((p) => p.id !== id);
    setPeriods(updated);
    save(companyId, updated);
  }

  function isCurrentlyActive(p: BlackoutPeriod) {
    if (!p.active) return false;
    const now = new Date();
    const start = new Date(
      `${p.startDate}T${p.allDay ? "00:00" : p.startTime}`,
    );
    const end = new Date(`${p.endDate}T${p.allDay ? "23:59" : p.endTime}`);
    return now >= start && now <= end;
  }

  const activeNow = periods.filter(isCurrentlyActive);
  const upcoming = periods.filter(
    (p) =>
      p.active &&
      !isCurrentlyActive(p) &&
      new Date(`${p.startDate}T00:00`) > new Date(),
  );
  const past = periods.filter(
    (p) => !isCurrentlyActive(p) && new Date(`${p.endDate}T23:59`) < new Date(),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">
            🚫 Ziyaret Yasak Dönemleri
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Belirli tarih/saat aralığında ziyareti kapatın; kiosk'ta özel mesaj
            gösterilir
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl text-sm font-medium"
          style={{
            background: "linear-gradient(135deg,#ef4444,#f97316)",
            color: "#fff",
          }}
        >
          + Yasak Dönem Ekle
        </button>
      </div>

      {activeNow.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "rgba(239,68,68,0.12)",
            border: "2px solid rgba(239,68,68,0.5)",
          }}
        >
          <p className="text-red-400 font-semibold text-sm">
            ⛔ ŞU AN AKTİF YASAK DÖNEM
          </p>
          {activeNow.map((p) => (
            <div key={p.id} className="mt-2">
              <p className="text-white font-medium">{p.title}</p>
              <p className="text-red-300 text-sm mt-1">"{p.message}"</p>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)",
          }}
        >
          <p className="text-white font-medium">Yeni Yasak Dönemi</p>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Dönem adı * (ör. Q3 Genel Kurul)"
            className="w-full px-3 py-2 rounded-lg text-sm text-white"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          />
          <select
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm text-white"
            style={{
              background: "#1e293b",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            {REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-slate-400 text-xs mb-1">Başlangıç Tarihi</p>
              <input
                type="date"
                min={today}
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg text-sm text-white"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              />
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Bitiş Tarihi</p>
              <input
                type="date"
                min={form.startDate || today}
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm text-white"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.allDay}
              onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
              className="accent-red-500"
            />
            <span className="text-slate-300 text-sm">Tüm gün</span>
          </label>
          {!form.allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-slate-400 text-xs mb-1">Başlangıç Saati</p>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) =>
                    setForm({ ...form, startTime: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm text-white"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                />
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Bitiş Saati</p>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) =>
                    setForm({ ...form, endTime: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm text-white"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                />
              </div>
            </div>
          )}
          <div>
            <p className="text-slate-400 text-xs mb-1">
              Kiosk'ta gösterilecek mesaj
            </p>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm text-white resize-none"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addPeriod}
              className="flex-1 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white"
            >
              Ekle
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {upcoming.length > 0 && (
          <div>
            <p className="text-amber-400 text-sm font-medium mb-2">
              📅 Yaklaşan ({upcoming.length})
            </p>
            {upcoming.map((p) => (
              <PeriodCard
                key={p.id}
                p={p}
                onToggle={toggle}
                onDelete={remove}
              />
            ))}
          </div>
        )}
        {activeNow.length > 0 && (
          <div>
            <p className="text-red-400 text-sm font-medium mb-2">
              🔴 Şu An Aktif ({activeNow.length})
            </p>
            {activeNow.map((p) => (
              <PeriodCard
                key={p.id}
                p={p}
                onToggle={toggle}
                onDelete={remove}
              />
            ))}
          </div>
        )}
        {past.length > 0 && (
          <div>
            <p className="text-slate-500 text-sm font-medium mb-2">
              ⏱️ Geçmiş ({past.length})
            </p>
            {past.slice(0, 5).map((p) => (
              <PeriodCard
                key={p.id}
                p={p}
                onToggle={toggle}
                onDelete={remove}
                isPast
              />
            ))}
          </div>
        )}
        {periods.length === 0 && (
          <p className="text-slate-500 text-sm">
            Henüz yasak dönemi tanımlanmamış
          </p>
        )}
      </div>
    </div>
  );
}

function PeriodCard({
  p,
  onToggle,
  onDelete,
  isPast,
}: {
  p: BlackoutPeriod;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  isPast?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 ${isPast ? "opacity-50" : ""}`}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{p.title}</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-orange-900/40 text-orange-300 border border-orange-700/50">
              {p.reason}
            </span>
            {!p.active && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-500 border border-slate-700">
                Pasif
              </span>
            )}
          </div>
          <p className="text-slate-400 text-xs">
            {new Date(p.startDate).toLocaleDateString("tr-TR")}{" "}
            {p.allDay ? "(Tüm gün)" : p.startTime}
            {" → "}
            {new Date(p.endDate).toLocaleDateString("tr-TR")}{" "}
            {p.allDay ? "" : p.endTime}
          </p>
          <p className="text-slate-400 text-xs italic">"{p.message}"</p>
        </div>
        {!isPast && (
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onToggle(p.id)}
              className={`px-2 py-1 rounded text-xs ${p.active ? "bg-amber-900/40 text-amber-400" : "bg-emerald-900/40 text-emerald-400"}`}
            >
              {p.active ? "Pasifleştir" : "Aktifleştir"}
            </button>
            <button
              type="button"
              onClick={() => onDelete(p.id)}
              className="px-2 py-1 rounded text-xs bg-red-900/40 text-red-400"
            >
              Sil
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
