import React, { useState } from "react";
import { toast } from "sonner";
import type { Visitor } from "../types";
import { generateId } from "../utils";

export interface DrillRecord {
  id: string;
  companyId: string;
  startedAt: number;
  endedAt?: number;
  durationMinutes?: number;
  snapshotCount: number;
  zones: { name: string; cleared: boolean }[];
  participationRate?: number;
  startedBy: string;
}

export function getDrillRecords(companyId: string): DrillRecord[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_drills_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}

export function saveDrillRecord(record: DrillRecord) {
  const list = getDrillRecords(record.companyId).filter(
    (r) => r.id !== record.id,
  );
  localStorage.setItem(
    `safentry_drills_${record.companyId}`,
    JSON.stringify([record, ...list]),
  );
}

function getActiveDrill(companyId: string): DrillRecord | null {
  try {
    const raw = localStorage.getItem(`safentry_active_drill_${companyId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setActiveDrill(companyId: string, drill: DrillRecord | null) {
  if (drill) {
    localStorage.setItem(
      `safentry_active_drill_${companyId}`,
      JSON.stringify(drill),
    );
  } else {
    localStorage.removeItem(`safentry_active_drill_${companyId}`);
  }
}

interface Props {
  companyId: string;
  visitors: Visitor[];
  staffId: string;
  reload: () => void;
}

const DEFAULT_ZONES = [
  "Zemin Kat",
  "1. Kat",
  "2. Kat",
  "3. Kat",
  "Bodrum",
  "Dış Alan",
];

export default function DrillTab({
  companyId,
  visitors,
  staffId,
  reload,
}: Props) {
  const [activeDrill, setActiveDrillState] = useState<DrillRecord | null>(() =>
    getActiveDrill(companyId),
  );
  const [drillRecords] = useState<DrillRecord[]>(() =>
    getDrillRecords(companyId),
  );
  const [customZones, setCustomZones] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const activeVisitors = visitors.filter((v) => v.status === "active");

  const startDrill = () => {
    const zones = customZones
      ? customZones
          .split(",")
          .map((z) => z.trim())
          .filter(Boolean)
      : DEFAULT_ZONES;
    const drill: DrillRecord = {
      id: generateId(),
      companyId,
      startedAt: Date.now(),
      snapshotCount: activeVisitors.length,
      zones: zones.map((name) => ({ name, cleared: false })),
      startedBy: staffId,
    };
    setActiveDrill(companyId, drill);
    setActiveDrillState(drill);
    toast.success(
      `🚨 Tatbikat başlatıldı! ${activeVisitors.length} aktif ziyaretçi snapshot'a alındı.`,
    );
  };

  const markZoneCleared = (zoneName: string) => {
    if (!activeDrill) return;
    const updated: DrillRecord = {
      ...activeDrill,
      zones: activeDrill.zones.map((z) =>
        z.name === zoneName ? { ...z, cleared: true } : z,
      ),
    };
    setActiveDrill(companyId, updated);
    setActiveDrillState(updated);
  };

  const endDrill = () => {
    if (!activeDrill) return;
    const now = Date.now();
    const durationMinutes = Math.round((now - activeDrill.startedAt) / 60000);
    const clearedCount = activeDrill.zones.filter((z) => z.cleared).length;
    const participationRate =
      activeDrill.zones.length > 0
        ? Math.round((clearedCount / activeDrill.zones.length) * 100)
        : 0;
    const finished: DrillRecord = {
      ...activeDrill,
      endedAt: now,
      durationMinutes,
      participationRate,
    };
    saveDrillRecord(finished);
    setActiveDrill(companyId, null);
    setActiveDrillState(null);
    toast.success(
      `✅ Tatbikat tamamlandı! Süre: ${durationMinutes} dk, Katılım: %${participationRate}`,
    );
    reload();
  };

  const exportDrillReport = (d: DrillRecord) => {
    const lines = [
      "SAFENTRY - ACİL TAHLIYE TATBİKAT RAPORU",
      `Tarih: ${new Date(d.startedAt).toLocaleString("tr-TR")}`,
      `Süre: ${d.durationMinutes ?? 0} dakika`,
      `Anlık Ziyaretçi Sayısı: ${d.snapshotCount}`,
      `Katılım Oranı: %${d.participationRate ?? 0}`,
      "",
      "BÖLGE DURUMU:",
      ...d.zones.map((z) => `  ${z.cleared ? "✓" : "✗"} ${z.name}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tatbikat_raporu_${new Date(d.startedAt).toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-ocid="drill.section" className="space-y-6">
      {/* Active Drill Panel */}
      {activeDrill ? (
        <div
          className="p-5 rounded-2xl"
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "2px solid rgba(239,68,68,0.4)",
            animation: "pulse 2s infinite",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-red-400 font-bold text-lg">
                🚨 TAHLİYE TATBİKATI AKTİF
              </h3>
              <p className="text-slate-300 text-sm mt-1">
                Başlangıç:{" "}
                {new Date(activeDrill.startedAt).toLocaleTimeString("tr-TR")} •
                Anlık Ziyaretçi: {activeDrill.snapshotCount}
              </p>
            </div>
            <button
              type="button"
              data-ocid="drill.end.button"
              onClick={endDrill}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}
            >
              ✅ Tatbikatı Bitir
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {activeDrill.zones.map((zone, i) => (
              <button
                key={zone.name}
                type="button"
                data-ocid={`drill.zone.item.${i + 1}`}
                onClick={() => !zone.cleared && markZoneCleared(zone.name)}
                className="p-3 rounded-xl text-sm font-medium text-left transition-all"
                style={{
                  background: zone.cleared
                    ? "rgba(34,197,94,0.15)"
                    : "rgba(255,255,255,0.05)",
                  border: zone.cleared
                    ? "1.5px solid rgba(34,197,94,0.4)"
                    : "1.5px solid rgba(255,255,255,0.12)",
                  color: zone.cleared ? "#4ade80" : "#94a3b8",
                  cursor: zone.cleared ? "default" : "pointer",
                }}
              >
                <div className="text-lg mb-1">{zone.cleared ? "✅" : "🏃"}</div>
                <div>{zone.name}</div>
                <div className="text-xs mt-1">
                  {zone.cleared ? "Tahliye Tamamlandı" : "Tahliye Bekleniyor"}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Tahliye İlerlemesi</span>
              <span>
                {activeDrill.zones.filter((z) => z.cleared).length} /{" "}
                {activeDrill.zones.length}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${(activeDrill.zones.filter((z) => z.cleared).length / Math.max(activeDrill.zones.length, 1)) * 100}%`,
                  background: "linear-gradient(90deg,#22c55e,#16a34a)",
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div
          className="p-5 rounded-2xl"
          style={{
            background: "rgba(14,165,233,0.06)",
            border: "1px solid rgba(14,165,233,0.2)",
          }}
        >
          <h3 className="text-cyan-400 font-bold text-sm mb-3">
            🚨 Acil Durum Tatbikatı
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            Tatbikat başlatıldığında mevcut aktif ziyaretçiler (
            {activeVisitors.length} kişi) anlık kayıt olarak alınır. Her
            bölgenin tahliye durumu izlenir, süre ve katılım oranı raporlanır.
          </p>
          <div className="mb-4">
            <label
              htmlFor="drill-zones"
              className="text-slate-400 text-xs block mb-1"
            >
              Özel bölge listesi (virgülle ayırın, boş bırakırsanız varsayılan
              kullanılır)
            </label>
            <input
              id="drill-zones"
              data-ocid="drill.zones.input"
              value={customZones}
              onChange={(e) => setCustomZones(e.target.value)}
              placeholder={DEFAULT_ZONES.join(", ")}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-cyan-400"
            />
          </div>
          <button
            type="button"
            data-ocid="drill.start.button"
            onClick={startDrill}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)" }}
          >
            🚨 Tatbikat Başlat
          </button>
        </div>
      )}

      {/* Drill History */}
      <div
        className="p-5 rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-sm">📋 Tatbikat Geçmişi</h3>
          <button
            type="button"
            data-ocid="drill.toggle_history.button"
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs text-cyan-400 hover:text-cyan-300"
          >
            {showHistory ? "Gizle" : "Göster"}
          </button>
        </div>
        {drillRecords.length === 0 ? (
          <div
            data-ocid="drill.empty_state"
            className="text-center py-8 text-slate-500"
          >
            <div className="text-3xl mb-2">🚨</div>
            <p className="text-sm">Henüz tatbikat yapılmadı.</p>
          </div>
        ) : showHistory ? (
          <div className="space-y-3">
            {drillRecords.map((d, i) => (
              <div
                key={d.id}
                data-ocid={`drill.history.item.${i + 1}`}
                className="p-4 rounded-xl flex items-center justify-between"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div>
                  <p className="text-white font-medium text-sm">
                    {new Date(d.startedAt).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-slate-400 text-xs">
                      ⏱ {d.durationMinutes ?? 0} dk
                    </span>
                    <span className="text-slate-400 text-xs">
                      👤 {d.snapshotCount} ziyaretçi
                    </span>
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color:
                          (d.participationRate ?? 0) >= 90
                            ? "#22c55e"
                            : (d.participationRate ?? 0) >= 70
                              ? "#f59e0b"
                              : "#ef4444",
                      }}
                    >
                      📊 %{d.participationRate ?? 0} katılım
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  data-ocid={`drill.export.${i + 1}`}
                  onClick={() => exportDrillReport(d)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-400 border border-cyan-500/30 hover:bg-cyan-900/20"
                >
                  📥 Rapor İndir
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">
            {drillRecords.length} tatbikat kaydı mevcut.
          </p>
        )}
      </div>
    </div>
  );
}
