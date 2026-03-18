import { useCallback, useEffect, useState } from "react";
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

interface Props {
  companyId: string;
}

export default function ParkingManager({ companyId }: Props) {
  const [zones, setZones] = useState<ParkingZone[]>([]);
  const [occupancy, setOccupancy] = useState<Record<string, ParkingOccupancy>>(
    {},
  );
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneSpots, setNewZoneSpots] = useState(10);

  const reload = useCallback(() => {
    setZones(getZones(companyId));
    setOccupancy(getOccupancy(companyId));
  }, [companyId]);

  useEffect(() => {
    reload();
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
