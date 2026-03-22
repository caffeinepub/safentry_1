import React, { useState } from "react";
import { toast } from "sonner";
import type { Staff } from "../types";

interface Floor {
  floorId: string;
  name: string;
  wardenStaffId: string;
  capacity: number;
}

interface DrillStatus {
  active: boolean;
  startedAt?: number;
  finishedAt?: number;
  floorStatuses: Record<string, "ongoing" | "completed" | "missing">;
}

interface Props {
  companyId: string;
  staffList: Staff[];
}

function getFloors(companyId: string): Floor[] {
  try {
    const raw = localStorage.getItem(`safentry_floors_${companyId}`);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

function saveFloors(companyId: string, floors: Floor[]) {
  localStorage.setItem(`safentry_floors_${companyId}`, JSON.stringify(floors));
}

function getDrillStatus(companyId: string): DrillStatus {
  try {
    const raw = localStorage.getItem(`safentry_evacuation_drill_${companyId}`);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return { active: false, floorStatuses: {} };
}

function saveDrillStatus(companyId: string, status: DrillStatus) {
  localStorage.setItem(
    `safentry_evacuation_drill_${companyId}`,
    JSON.stringify(status),
  );
}

export default function EvacCoordTab({ companyId, staffList }: Props) {
  const [floors, setFloors] = useState<Floor[]>(() => getFloors(companyId));
  const [drill, setDrill] = useState<DrillStatus>(() =>
    getDrillStatus(companyId),
  );
  const [showAddFloor, setShowAddFloor] = useState(false);
  const [newFloor, setNewFloor] = useState({
    name: "",
    wardenStaffId: "",
    capacity: "50",
  });

  const saveAndSetFloors = (updated: Floor[]) => {
    saveFloors(companyId, updated);
    setFloors(updated);
  };

  const saveAndSetDrill = (updated: DrillStatus) => {
    saveDrillStatus(companyId, updated);
    setDrill(updated);
  };

  const addFloor = () => {
    if (!newFloor.name.trim()) {
      toast.error("Kat adı gerekli");
      return;
    }
    const f: Floor = {
      floorId: `floor_${Date.now()}`,
      name: newFloor.name.trim(),
      wardenStaffId: newFloor.wardenStaffId,
      capacity: Number.parseInt(newFloor.capacity) || 50,
    };
    saveAndSetFloors([...floors, f]);
    setNewFloor({ name: "", wardenStaffId: "", capacity: "50" });
    setShowAddFloor(false);
    toast.success("Kat eklendi");
  };

  const removeFloor = (floorId: string) => {
    saveAndSetFloors(floors.filter((f) => f.floorId !== floorId));
  };

  const startDrill = () => {
    const updated: DrillStatus = {
      active: true,
      startedAt: Date.now(),
      floorStatuses: {},
    };
    saveAndSetDrill(updated);
    toast.success("🚨 Tahliye tatbikatı başlatıldı!");
  };

  const endDrill = () => {
    const updated: DrillStatus = {
      ...drill,
      active: false,
      finishedAt: Date.now(),
    };
    saveAndSetDrill(updated);
    toast.success("✅ Tatbikat tamamlandı");
  };

  const setFloorStatus = (
    floorId: string,
    status: "ongoing" | "completed" | "missing",
  ) => {
    const updated: DrillStatus = {
      ...drill,
      floorStatuses: { ...drill.floorStatuses, [floorId]: status },
    };
    saveAndSetDrill(updated);
  };

  const printReport = () => {
    const now = new Date().toLocaleString("tr-TR");
    const startTime = drill.startedAt
      ? new Date(drill.startedAt).toLocaleString("tr-TR")
      : "—";
    const duration =
      drill.startedAt && drill.finishedAt
        ? `${Math.round((drill.finishedAt - drill.startedAt) / 60000)} dk`
        : "—";
    const lines = floors
      .map((f) => {
        const warden = staffList.find((s) => s.staffId === f.wardenStaffId);
        const st = drill.floorStatuses[f.floorId];
        const stLabel =
          st === "completed"
            ? "✅ Tamamlandı"
            : st === "missing"
              ? "⚠️ Kayıp Kişi Var"
              : st === "ongoing"
                ? "🔄 Devam Ediyor"
                : "—";
        return `${f.name} | Kat Sorumlusu: ${warden?.name ?? "Atanmad\u0131"} | Durum: ${stLabel}`;
      })
      .join("\n");

    const completed = floors.filter(
      (f) => drill.floorStatuses[f.floorId] === "completed",
    ).length;
    const content = `SAFENTRY TAHLİYE RAPORU\n${"-".repeat(50)}\nRapor Tarihi: ${now}\nTatbikat Başlangıcı: ${startTime}\nSüre: ${duration}\n\n${"-".repeat(50)}\nKAT DURUMU\n${lines}\n\n${"-".repeat(50)}\nÖZET: ${completed}/${floors.length} kat tahliyesi tamamlandı`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tahliye-raporu-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Rapor indirildi");
  };

  const completedCount = floors.filter(
    (f) => drill.floorStatuses[f.floorId] === "completed",
  ).length;
  const missingCount = floors.filter(
    (f) => drill.floorStatuses[f.floorId] === "missing",
  ).length;
  const ongoingCount = floors.filter(
    (f) => drill.floorStatuses[f.floorId] === "ongoing",
  ).length;

  const floorStatusConfig = {
    ongoing: {
      label: "Devam Ediyor",
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.15)",
    },
    completed: {
      label: "Tamamlandı",
      color: "#22c55e",
      bg: "rgba(34,197,94,0.15)",
    },
    missing: {
      label: "⚠️ Kayıp Kişi Var",
      color: "#ef4444",
      bg: "rgba(239,68,68,0.15)",
    },
  };

  return (
    <div className="space-y-6" data-ocid="evaccoord.section">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-white font-bold text-lg">
          🏢 Kat Bazlı Tahliye Koordinasyon Panosu
        </h2>
        <div className="flex items-center gap-2">
          {!drill.active ? (
            <button
              type="button"
              data-ocid="evaccoord.start_drill.button"
              onClick={startDrill}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)" }}
            >
              🚨 Tahliye Başlat
            </button>
          ) : (
            <>
              <span
                className="px-3 py-1.5 rounded-full text-xs font-bold animate-pulse"
                style={{
                  background: "rgba(239,68,68,0.2)",
                  border: "1px solid rgba(239,68,68,0.4)",
                  color: "#ef4444",
                }}
              >
                🚨 TAHLİYE AKTİF
              </span>
              <button
                type="button"
                data-ocid="evaccoord.end_drill.button"
                onClick={endDrill}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                style={{
                  background: "linear-gradient(135deg,#22c55e,#16a34a)",
                }}
              >
                ✅ Tahliye Tamamlandı
              </button>
            </>
          )}
          <button
            type="button"
            data-ocid="evaccoord.pdf_report.button"
            onClick={printReport}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/10 transition-all"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            📄 PDF Raporu
          </button>
        </div>
      </div>

      {/* Summary when drill active */}
      {drill.active && floors.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Tamamlandı", count: completedCount, color: "#22c55e" },
            { label: "Devam Ediyor", count: ongoingCount, color: "#f59e0b" },
            { label: "Kayıp Kişi", count: missingCount, color: "#ef4444" },
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
                {s.count}/{floors.length}
              </div>
              <div className="text-slate-400 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Add floor form */}
      {showAddFloor && (
        <div
          data-ocid="evaccoord.add_floor.dialog"
          className="p-5 rounded-2xl space-y-3"
          style={{
            background: "rgba(20,184,166,0.06)",
            border: "1px solid rgba(20,184,166,0.25)",
          }}
        >
          <h3 className="text-teal-300 font-semibold text-sm">
            ➕ Yeni Kat Ekle
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              data-ocid="evaccoord.floor_name.input"
              placeholder="Kat adı (ör. 1. Kat)"
              value={newFloor.name}
              onChange={(e) =>
                setNewFloor((prev) => ({ ...prev, name: e.target.value }))
              }
              className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-teal-500"
            />
            <select
              data-ocid="evaccoord.floor_warden.select"
              value={newFloor.wardenStaffId}
              onChange={(e) =>
                setNewFloor((prev) => ({
                  ...prev,
                  wardenStaffId: e.target.value,
                }))
              }
              className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
            >
              <option value="" className="bg-[#0f1729]">
                Kat Sorumlusu Seçin
              </option>
              {staffList.map((s) => (
                <option
                  key={s.staffId}
                  value={s.staffId}
                  className="bg-[#0f1729]"
                >
                  {s.name}
                </option>
              ))}
            </select>
            <input
              data-ocid="evaccoord.floor_capacity.input"
              type="number"
              placeholder="Kapasite"
              value={newFloor.capacity}
              onChange={(e) =>
                setNewFloor((prev) => ({ ...prev, capacity: e.target.value }))
              }
              className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              data-ocid="evaccoord.add_floor.save_button"
              onClick={addFloor}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#14b8a6,#0d9488)" }}
            >
              Kaydet
            </button>
            <button
              type="button"
              data-ocid="evaccoord.add_floor.cancel_button"
              onClick={() => setShowAddFloor(false)}
              className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:bg-white/10 transition-all"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Floor list */}
      {floors.length === 0 ? (
        <div
          data-ocid="evaccoord.empty_state"
          className="text-center py-16 text-slate-500"
        >
          <div className="text-5xl mb-4">🏢</div>
          <p className="font-semibold text-slate-400">Henüz kat tanımlanmadı</p>
          <p className="text-sm mt-2">
            Kat ekleyerek tahliye koordinasyonu başlatın
          </p>
          <button
            type="button"
            onClick={() => setShowAddFloor(true)}
            className="mt-4 px-5 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg,#14b8a6,#0d9488)" }}
          >
            ➕ Kat Ekle
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-300 font-semibold text-sm">
              Katlar ({floors.length})
            </h3>
            <button
              type="button"
              data-ocid="evaccoord.add_floor.open_modal_button"
              onClick={() => setShowAddFloor(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-teal-300"
              style={{
                background: "rgba(20,184,166,0.1)",
                border: "1px solid rgba(20,184,166,0.3)",
              }}
            >
              ➕ Kat Ekle
            </button>
          </div>
          {floors.map((f, idx) => {
            const warden = staffList.find((s) => s.staffId === f.wardenStaffId);
            const floorSt = drill.floorStatuses[f.floorId];

            return (
              <div
                key={f.floorId}
                data-ocid={`evaccoord.floor.item.${idx + 1}`}
                className="p-4 rounded-2xl flex items-center justify-between gap-3 flex-wrap"
                style={{
                  background:
                    drill.active && floorSt
                      ? floorStatusConfig[floorSt].bg
                      : "rgba(255,255,255,0.03)",
                  border:
                    drill.active && floorSt
                      ? `1px solid ${floorStatusConfig[floorSt].color}50`
                      : "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                    style={{
                      background: "rgba(14,165,233,0.15)",
                      color: "#0ea5e9",
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">
                      {f.name}
                    </div>
                    <div className="text-slate-500 text-xs">
                      Kat Sorumlusu: {warden?.name ?? "Atanmadı"} • Kapasite:{" "}
                      {f.capacity}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {drill.active && (
                    <div className="flex gap-1">
                      {(["ongoing", "completed", "missing"] as const).map(
                        (st) => (
                          <button
                            key={st}
                            type="button"
                            data-ocid={`evaccoord.floor_status_${st}.${idx + 1}`}
                            onClick={() => setFloorStatus(f.floorId, st)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                            style={{
                              background:
                                floorSt === st
                                  ? floorStatusConfig[st].bg
                                  : "rgba(255,255,255,0.06)",
                              border: `1px solid ${floorSt === st ? `${floorStatusConfig[st].color}60` : "rgba(255,255,255,0.1)"}`,
                              color:
                                floorSt === st
                                  ? floorStatusConfig[st].color
                                  : "#94a3b8",
                            }}
                          >
                            {floorStatusConfig[st].label}
                          </button>
                        ),
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    data-ocid={`evaccoord.floor.delete_button.${idx + 1}`}
                    onClick={() => removeFloor(f.floorId)}
                    className="px-2.5 py-1 rounded-lg text-xs text-red-400 hover:bg-red-900/20 transition-all"
                    style={{ border: "1px solid rgba(239,68,68,0.2)" }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
