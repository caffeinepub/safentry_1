import React, { useState } from "react";
import { toast } from "sonner";

interface VehicleEntry {
  id: string;
  plate: string;
  driverName: string;
  vehicleType: string;
  entryTime: number;
  exitTime: number | null;
  securityNote: string;
  registeredBy: string;
}

const VEHICLE_TYPES = ["Otomobil", "Kamyon", "Minibüs", "Motosiklet", "Diğer"];

function getVehicleLog(companyId: string): VehicleEntry[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_vehicle_log_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}

function saveVehicleLog(companyId: string, entries: VehicleEntry[]) {
  localStorage.setItem(
    `safentry_vehicle_log_${companyId}`,
    JSON.stringify(entries),
  );
}

function formatDT(ts: number) {
  return new Date(ts).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  companyId: string;
  currentUser: string | undefined;
}

export default function VehicleLogTab({ companyId, currentUser }: Props) {
  const [entries, setEntries] = useState<VehicleEntry[]>(() =>
    getVehicleLog(companyId),
  );
  const [filter, setFilter] = useState<"all" | "active" | "departed">("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    plate: "",
    driverName: "",
    vehicleType: "Otomobil",
    securityNote: "",
  });

  const filtered = entries.filter((e) => {
    if (filter === "active") return e.exitTime === null;
    if (filter === "departed") return e.exitTime !== null;
    return true;
  });

  const handleAdd = () => {
    if (!form.plate.trim() || !form.driverName.trim()) {
      toast.error("Plaka ve sürücü adı zorunludur");
      return;
    }
    const newEntry: VehicleEntry = {
      id: `veh_${Date.now()}`,
      plate: form.plate.trim().toUpperCase(),
      driverName: form.driverName.trim(),
      vehicleType: form.vehicleType,
      entryTime: Date.now(),
      exitTime: null,
      securityNote: form.securityNote.trim(),
      registeredBy: currentUser ?? "Sistem",
    };
    const updated = [newEntry, ...entries];
    saveVehicleLog(companyId, updated);
    setEntries(updated);
    setForm({
      plate: "",
      driverName: "",
      vehicleType: "Otomobil",
      securityNote: "",
    });
    setShowForm(false);
    toast.success(`🚗 ${newEntry.plate} plaka giriş kaydedildi`);
  };

  const handleExit = (id: string) => {
    const updated = entries.map((e) =>
      e.id === id ? { ...e, exitTime: Date.now() } : e,
    );
    saveVehicleLog(companyId, updated);
    setEntries(updated);
    const e = entries.find((x) => x.id === id);
    toast.success(`🚗 ${e?.plate} araç çıkışı kaydedildi`);
  };

  const activeCount = entries.filter((e) => e.exitTime === null).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-white font-bold text-lg">
            🚗 Araç Giriş/Çıkış Logu
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Şu an içeride:{" "}
            <span className="text-emerald-400 font-semibold">
              {activeCount}
            </span>{" "}
            araç
          </p>
        </div>
        <button
          type="button"
          data-ocid="vehicle.add_button"
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-2 transition-all"
          style={{
            background: "rgba(14,165,233,0.15)",
            border: "1px solid rgba(14,165,233,0.4)",
          }}
        >
          + Araç Ekle
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div
          data-ocid="vehicle.modal"
          className="p-5 rounded-2xl space-y-4"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(14,165,233,0.2)",
          }}
        >
          <h3 className="text-white font-semibold">Yeni Araç Girişi</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-slate-300 text-xs mb-1">Plaka *</p>
              <input
                data-ocid="vehicle.plate.input"
                value={form.plate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, plate: e.target.value }))
                }
                placeholder="34 ABC 1234"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-mono uppercase focus:outline-none focus:border-[#0ea5e9]"
              />
            </div>
            <div>
              <p className="text-slate-300 text-xs mb-1">Sürücü Adı *</p>
              <input
                data-ocid="vehicle.driver.input"
                value={form.driverName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, driverName: e.target.value }))
                }
                placeholder="Ad Soyad"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9]"
              />
            </div>
            <div>
              <p className="text-slate-300 text-xs mb-1">Araç Tipi</p>
              <select
                data-ocid="vehicle.type.select"
                value={form.vehicleType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, vehicleType: e.target.value }))
                }
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9]"
              >
                {VEHICLE_TYPES.map((t) => (
                  <option key={t} value={t} style={{ background: "#1e293b" }}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-slate-300 text-xs mb-1">Güvenlik Notu</p>
              <input
                data-ocid="vehicle.note.input"
                value={form.securityNote}
                onChange={(e) =>
                  setForm((f) => ({ ...f, securityNote: e.target.value }))
                }
                placeholder="İsteğe bağlı not..."
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9]"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              data-ocid="vehicle.submit_button"
              onClick={handleAdd}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
            >
              Giriş Kaydet
            </button>
            <button
              type="button"
              data-ocid="vehicle.cancel_button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {(["all", "active", "departed"] as const).map((f) => {
          const labels = { all: "Tümü", active: "İçeride", departed: "Çıktı" };
          const count =
            f === "all"
              ? entries.length
              : f === "active"
                ? entries.filter((e) => !e.exitTime).length
                : entries.filter((e) => e.exitTime).length;
          return (
            <button
              type="button"
              key={f}
              data-ocid={`vehicle.${f}.tab`}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={
                filter === f
                  ? {
                      background: "rgba(14,165,233,0.25)",
                      border: "1px solid rgba(14,165,233,0.5)",
                      color: "#fff",
                    }
                  : {
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#94a3b8",
                    }
              }
            >
              {labels[f]} ({count})
            </button>
          );
        })}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div
          data-ocid="vehicle.empty_state"
          className="text-center py-16 text-slate-500"
        >
          <div className="text-5xl mb-3">🚗</div>
          <p className="text-sm">Araç kaydı bulunamadı</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry, idx) => (
            <div
              key={entry.id}
              data-ocid={`vehicle.item.${idx + 1}`}
              className="p-4 rounded-xl flex flex-wrap items-center justify-between gap-3"
              style={{
                background: entry.exitTime
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(14,165,233,0.06)",
                border: `1px solid ${entry.exitTime ? "rgba(255,255,255,0.08)" : "rgba(14,165,233,0.2)"}`,
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ background: "rgba(14,165,233,0.1)" }}
                >
                  🚗
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold font-mono text-sm">
                      {entry.plate}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        background: entry.exitTime
                          ? "rgba(148,163,184,0.15)"
                          : "rgba(34,197,94,0.15)",
                        color: entry.exitTime ? "#94a3b8" : "#4ade80",
                        border: `1px solid ${entry.exitTime ? "rgba(148,163,184,0.3)" : "rgba(34,197,94,0.3)"}`,
                      }}
                    >
                      {entry.exitTime ? "Çıktı" : "İçeride"}
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs mt-0.5">
                    {entry.driverName} • {entry.vehicleType}
                  </p>
                  <p className="text-slate-500 text-xs">
                    Giriş: {formatDT(entry.entryTime)}
                  </p>
                  {entry.exitTime && (
                    <p className="text-slate-500 text-xs">
                      Çıkış: {formatDT(entry.exitTime)}
                    </p>
                  )}
                  {entry.securityNote && (
                    <p className="text-amber-400/70 text-xs mt-0.5">
                      📝 {entry.securityNote}
                    </p>
                  )}
                </div>
              </div>
              {!entry.exitTime && (
                <button
                  type="button"
                  data-ocid={`vehicle.exit.button.${idx + 1}`}
                  onClick={() => handleExit(entry.id)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-80"
                  style={{
                    background: "rgba(245,158,11,0.2)",
                    border: "1px solid rgba(245,158,11,0.4)",
                    color: "#fbbf24",
                  }}
                >
                  🚪 Çıkış Yaptır
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
