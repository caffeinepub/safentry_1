import { useCallback, useEffect, useState } from "react";
import { getAutoParkingEnabled, setAutoParkingEnabled } from "../store";
import { generateId } from "../utils";

interface ParkingZone {
  id: string;
  name: string;
  spotCount: number;
}

interface ParkingOccupancy {
  visitorId: string;
  plate: string;
  visitorName: string;
  since: number;
}

function getZones(companyId: string): ParkingZone[] {
  try {
    return JSON.parse(
      localStorage.getItem(`parkingZones_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}

function saveZones(companyId: string, zones: ParkingZone[]) {
  localStorage.setItem(`parkingZones_${companyId}`, JSON.stringify(zones));
}

function getOccupancy(companyId: string): Record<string, ParkingOccupancy> {
  try {
    return JSON.parse(
      localStorage.getItem(`parkingOccupancy_${companyId}`) || "{}",
    );
  } catch {
    return {};
  }
}

function saveOccupancy(
  companyId: string,
  occ: Record<string, ParkingOccupancy>,
) {
  localStorage.setItem(`parkingOccupancy_${companyId}`, JSON.stringify(occ));
}

interface ParkingVehicle {
  id: string;
  plate: string;
  vehicleType: "Araba" | "Minibüs" | "Kamyon" | "Motosiklet";
  spotLabel: string;
  visitorName: string;
  entryTime: number;
  exitTime?: number;
}

function getVehicles(companyId: string): ParkingVehicle[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_parking_vehicles_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}

function saveVehicles(companyId: string, vehicles: ParkingVehicle[]) {
  localStorage.setItem(
    `safentry_parking_vehicles_${companyId}`,
    JSON.stringify(vehicles),
  );
}

interface Props {
  companyId: string;
}

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  if (hours > 0) return `${hours} sa ${remainMins} dk`;
  return `${mins} dk`;
}

export default function ParkingManager({ companyId }: Props) {
  const [zones, setZones] = useState<ParkingZone[]>([]);
  const [occupancy, setOccupancy] = useState<Record<string, ParkingOccupancy>>(
    {},
  );
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneSpots, setNewZoneSpots] = useState(10);
  const [vehicles, setVehicles] = useState<ParkingVehicle[]>([]);
  const [vehicleForm, setVehicleForm] = useState({
    plate: "",
    vehicleType: "Araba" as ParkingVehicle["vehicleType"],
    spotLabel: "",
    visitorName: "",
  });
  const [autoParking, setAutoParking] = useState(() =>
    getAutoParkingEnabled(companyId),
  );

  const toggleAutoParking = (val: boolean) => {
    setAutoParkingEnabled(companyId, val);
    setAutoParking(val);
  };
  const [vehicleTab, setVehicleTab] = useState<"active" | "add">("active");
  const [, setVehicleTick] = useState(0);

  const reload = useCallback(() => {
    setZones(getZones(companyId));
    setOccupancy(getOccupancy(companyId));
    setVehicles(getVehicles(companyId));
  }, [companyId]);

  useEffect(() => {
    reload();
    const interval = setInterval(() => setVehicleTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, [reload]);

  const addZone = () => {
    if (!newZoneName.trim()) return;
    const zone: ParkingZone = {
      id: generateId(),
      name: newZoneName.trim(),
      spotCount: Math.max(1, newZoneSpots),
    };
    const updated = [...zones, zone];
    saveZones(companyId, updated);
    setZones(updated);
    setNewZoneName("");
    setNewZoneSpots(10);
  };

  const removeZone = (id: string) => {
    const updated = zones.filter((z) => z.id !== id);
    saveZones(companyId, updated);
    // Clear occupancy for this zone
    const newOcc = { ...occupancy };
    for (let i = 1; i <= 200; i++) {
      delete newOcc[`${id}_${i}`];
    }
    saveOccupancy(companyId, newOcc);
    reload();
  };

  const clearSpot = (spotKey: string) => {
    const newOcc = { ...occupancy };
    delete newOcc[spotKey];
    saveOccupancy(companyId, newOcc);
    setOccupancy(newOcc);
  };

  const totalSpots = zones.reduce((s, z) => s + z.spotCount, 0);
  const occupiedCount = Object.keys(occupancy).length;

  return (
    <div className="space-y-6" data-ocid="parking.section">
      {/* Auto-Assign Toggle */}
      <div
        className="p-4 rounded-2xl flex items-center justify-between"
        style={{
          background: "rgba(20,184,166,0.06)",
          border: "1px solid rgba(20,184,166,0.25)",
        }}
      >
        <div>
          <p className="text-white font-semibold text-sm">
            ⚡ Otomatik Spot Atama
          </p>
          <p className="text-slate-400 text-xs mt-0.5">
            Yeni ziyaretçi kaydında ilk boş spot otomatik atanır
          </p>
        </div>
        <button
          type="button"
          data-ocid="parking.auto_assign.toggle"
          onClick={() => toggleAutoParking(!autoParking)}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: autoParking
              ? "rgba(20,184,166,0.2)"
              : "rgba(255,255,255,0.07)",
            border: autoParking
              ? "1px solid rgba(20,184,166,0.5)"
              : "1px solid rgba(255,255,255,0.15)",
            color: autoParking ? "#14b8a6" : "#94a3b8",
          }}
        >
          {autoParking ? "✓ Aktif" : "Pasif"}
        </button>
      </div>
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Toplam Kapasite", value: totalSpots, color: "#00d4aa" },
          { label: "Dolu", value: occupiedCount, color: "#ef4444" },
          {
            label: "Bos",
            value: Math.max(0, totalSpots - occupiedCount),
            color: "#22c55e",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="p-4 rounded-2xl text-center"
            style={{
              background: `${s.color}12`,
              border: `1.5px solid ${s.color}30`,
            }}
          >
            <div className="text-2xl font-bold" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-xs text-slate-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Add zone */}
      <div
        className="p-4 rounded-2xl"
        style={{
          background: "rgba(0,212,170,0.06)",
          border: "1px solid rgba(0,212,170,0.2)",
        }}
      >
        <h3 className="text-white font-semibold text-sm mb-3">
          + Yeni Otopark Bolgesi Ekle
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            data-ocid="parking.zone_name.input"
            placeholder="Bolge adi (orn. A Blok)"
            value={newZoneName}
            onChange={(e) => setNewZoneName(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl text-sm text-white"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              outline: "none",
            }}
          />
          <input
            type="number"
            data-ocid="parking.spot_count.input"
            min={1}
            max={200}
            value={newZoneSpots}
            onChange={(e) => setNewZoneSpots(Number(e.target.value))}
            className="w-20 px-3 py-2 rounded-xl text-sm text-white text-center"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              outline: "none",
            }}
          />
          <button
            type="button"
            data-ocid="parking.add_zone.button"
            onClick={addZone}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #00d4aa 0%, #00a88a 100%)",
            }}
          >
            Ekle
          </button>
        </div>
      </div>

      {/* Vehicle Tracking Section */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-sm">
              🚗 Araç Takibi
            </span>
            {(() => {
              const activeVehicles = vehicles.filter((v) => !v.exitTime);
              return activeVehicles.length > 0 ? (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{
                    background: "rgba(239,68,68,0.2)",
                    color: "#f87171",
                  }}
                >
                  {activeVehicles.length} Araç İçeride
                </span>
              ) : null;
            })()}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setVehicleTab("active")}
              className="text-xs px-3 py-1 rounded-lg transition-all"
              style={{
                background:
                  vehicleTab === "active"
                    ? "rgba(0,212,170,0.2)"
                    : "rgba(255,255,255,0.06)",
                color: vehicleTab === "active" ? "#00d4aa" : "#94a3b8",
              }}
            >
              Aktif
            </button>
            <button
              type="button"
              onClick={() => setVehicleTab("add")}
              className="text-xs px-3 py-1 rounded-lg transition-all"
              style={{
                background:
                  vehicleTab === "add"
                    ? "rgba(0,212,170,0.2)"
                    : "rgba(255,255,255,0.06)",
                color: vehicleTab === "add" ? "#00d4aa" : "#94a3b8",
              }}
            >
              + Araç Girişi
            </button>
          </div>
        </div>

        <div className="p-4">
          {vehicleTab === "add" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  data-ocid="parking.plate.input"
                  value={vehicleForm.plate}
                  onChange={(e) =>
                    setVehicleForm((f) => ({
                      ...f,
                      plate: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="Plaka (34 ABC 1234)"
                  className="px-3 py-2 rounded-xl text-sm text-white"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    outline: "none",
                  }}
                />
                <select
                  data-ocid="parking.vehicle_type.select"
                  value={vehicleForm.vehicleType}
                  onChange={(e) =>
                    setVehicleForm((f) => ({
                      ...f,
                      vehicleType: e.target
                        .value as ParkingVehicle["vehicleType"],
                    }))
                  }
                  className="px-3 py-2 rounded-xl text-sm text-white"
                  style={{
                    background: "#0d1424",
                    border: "1px solid rgba(255,255,255,0.12)",
                    outline: "none",
                  }}
                >
                  <option value="Araba">🚗 Araba</option>
                  <option value="Minibüs">🚐 Minibüs</option>
                  <option value="Kamyon">🚚 Kamyon</option>
                  <option value="Motosiklet">🏍️ Motosiklet</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  data-ocid="parking.spot_label.input"
                  value={vehicleForm.spotLabel}
                  onChange={(e) =>
                    setVehicleForm((f) => ({ ...f, spotLabel: e.target.value }))
                  }
                  placeholder="Spot (A-12)"
                  className="px-3 py-2 rounded-xl text-sm text-white"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    outline: "none",
                  }}
                />
                <input
                  data-ocid="parking.visitor_name.input"
                  value={vehicleForm.visitorName}
                  onChange={(e) =>
                    setVehicleForm((f) => ({
                      ...f,
                      visitorName: e.target.value,
                    }))
                  }
                  placeholder="Ziyaretçi adı (opsiyonel)"
                  className="px-3 py-2 rounded-xl text-sm text-white"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    outline: "none",
                  }}
                />
              </div>
              <button
                type="button"
                data-ocid="parking.vehicle_entry.button"
                onClick={() => {
                  if (!vehicleForm.plate.trim()) return;
                  const vehicle: ParkingVehicle = {
                    id: `v_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                    plate: vehicleForm.plate.trim(),
                    vehicleType: vehicleForm.vehicleType,
                    spotLabel: vehicleForm.spotLabel.trim() || "Belirsiz",
                    visitorName: vehicleForm.visitorName.trim(),
                    entryTime: Date.now(),
                  };
                  const updated = [...vehicles, vehicle];
                  saveVehicles(companyId, updated);
                  setVehicles(updated);
                  setVehicleForm({
                    plate: "",
                    vehicleType: "Araba",
                    spotLabel: "",
                    visitorName: "",
                  });
                  setVehicleTab("active");
                }}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
                style={{
                  background: "linear-gradient(135deg,#00d4aa,#0ea5e9)",
                }}
              >
                ✅ Araç Girişini Kaydet
              </button>
            </div>
          )}

          {vehicleTab === "active" &&
            (() => {
              const activeVehicles = vehicles.filter((v) => !v.exitTime);
              if (activeVehicles.length === 0) {
                return (
                  <div
                    data-ocid="parking.vehicles.empty_state"
                    className="text-center py-8 text-slate-500 text-sm"
                  >
                    🅿️ İçeride araç yok
                  </div>
                );
              }
              return (
                <div className="space-y-3" data-ocid="parking.vehicles.list">
                  {activeVehicles.map((v, i) => (
                    <div
                      key={v.id}
                      data-ocid={`parking.vehicle.item.${i + 1}`}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-sm font-mono">
                            {v.plate}
                          </span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{
                              background: "rgba(255,255,255,0.08)",
                              color: "#94a3b8",
                            }}
                          >
                            {v.vehicleType}
                          </span>
                          <span className="text-xs text-teal-400">
                            📍 {v.spotLabel}
                          </span>
                        </div>
                        {v.visitorName && (
                          <p className="text-slate-500 text-xs mt-0.5">
                            👤 {v.visitorName}
                          </p>
                        )}
                        <p className="text-amber-400 text-xs mt-0.5">
                          ⏱ {formatDuration(Date.now() - v.entryTime)}
                        </p>
                      </div>
                      <button
                        type="button"
                        data-ocid={`parking.vehicle_exit.button.${i + 1}`}
                        onClick={() => {
                          const updated = vehicles.map((x) =>
                            x.id === v.id ? { ...x, exitTime: Date.now() } : x,
                          );
                          saveVehicles(companyId, updated);
                          setVehicles(updated);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                        style={{
                          background: "linear-gradient(135deg,#ef4444,#dc2626)",
                        }}
                      >
                        Çıkış
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}
        </div>
      </div>

      {/* Zones */}
      {zones.length === 0 ? (
        <div
          data-ocid="parking.empty_state"
          className="text-center py-12 text-slate-500"
        >
          <div className="text-4xl mb-3">P</div>
          <div className="text-sm">Henuz otopark bolgesi tanimlanmamis.</div>
          <div className="text-xs mt-1 text-slate-600">
            Yukaridan bolge ekleyin.
          </div>
        </div>
      ) : (
        zones.map((zone) => (
          <ZoneGrid
            key={zone.id}
            zone={zone}
            occupancy={occupancy}
            onClearSpot={clearSpot}
            onRemoveZone={removeZone}
          />
        ))
      )}
    </div>
  );
}

function ZoneGrid({
  zone,
  occupancy,
  onClearSpot,
  onRemoveZone,
}: {
  zone: ParkingZone;
  occupancy: Record<string, ParkingOccupancy>;
  onClearSpot: (key: string) => void;
  onRemoveZone: (id: string) => void;
}) {
  const spots = Array.from({ length: zone.spotCount }, (_, i) => i + 1);
  const zoneOccupied = spots.filter((n) => occupancy[`${zone.id}_${n}`]).length;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold">P {zone.name}</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              background:
                zoneOccupied >= zone.spotCount
                  ? "rgba(239,68,68,0.2)"
                  : "rgba(34,197,94,0.15)",
              color: zoneOccupied >= zone.spotCount ? "#f87171" : "#4ade80",
            }}
          >
            {zoneOccupied}/{zone.spotCount} dolu
          </span>
        </div>
        <button
          type="button"
          data-ocid="parking.zone.delete_button"
          onClick={() => onRemoveZone(zone.id)}
          className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded-lg transition-colors"
          style={{ background: "rgba(239,68,68,0.08)" }}
        >
          Sil
        </button>
      </div>

      <div className="p-4">
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))",
          }}
        >
          {spots.map((n) => {
            const key = `${zone.id}_${n}`;
            const occ = occupancy[key];
            return (
              <div
                key={n}
                title={occ ? `${occ.visitorName} - ${occ.plate}` : "Bos"}
                className="relative rounded-xl p-2 text-center cursor-default"
                style={{
                  background: occ
                    ? "rgba(239,68,68,0.15)"
                    : "rgba(34,197,94,0.1)",
                  border: `1.5px solid ${occ ? "rgba(239,68,68,0.4)" : "rgba(34,197,94,0.3)"}`,
                  minHeight: "56px",
                }}
              >
                <div
                  className="text-xs font-bold"
                  style={{ color: occ ? "#f87171" : "#4ade80" }}
                >
                  {zone.name.slice(0, 1)}-{n}
                </div>
                {occ ? (
                  <>
                    <div
                      className="text-slate-300 text-xs truncate mt-0.5"
                      style={{ fontSize: "9px" }}
                    >
                      {occ.plate || occ.visitorName.split(" ")[0]}
                    </div>
                    <button
                      type="button"
                      data-ocid="parking.clear_spot.button"
                      onClick={() => onClearSpot(key)}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white flex items-center justify-center"
                      style={{ background: "#ef4444", fontSize: "10px" }}
                    >
                      x
                    </button>
                  </>
                ) : (
                  <div
                    className="text-emerald-500 text-xs mt-0.5"
                    style={{ fontSize: "9px" }}
                  >
                    Bos
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
