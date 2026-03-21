import React, { useState } from "react";
import { toast } from "sonner";
import { generateId } from "../utils";

export interface Zone {
  id: string;
  name: string;
  description?: string;
  color: string;
  companyId: string;
}

const ZONE_COLORS = [
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export function getZones(companyId: string): Zone[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_zones_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}

export function saveZones(companyId: string, zones: Zone[]) {
  localStorage.setItem(`safentry_zones_${companyId}`, JSON.stringify(zones));
}

interface Props {
  companyId: string;
  visitors: import("../types").Visitor[];
  reload: () => void;
}

export default function ZoneControlTab({ companyId, visitors, reload }: Props) {
  const [zones, setZones] = useState<Zone[]>(() => getZones(companyId));
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneDesc, setNewZoneDesc] = useState("");
  const [newZoneColor, setNewZoneColor] = useState(ZONE_COLORS[0]);
  const [showForm, setShowForm] = useState(false);
  const [editZone, setEditZone] = useState<Zone | null>(null);
  const [alertZone, setAlertZone] = useState<string | null>(null);

  const activeVisitors = visitors.filter((v) => v.status === "active");

  const saveZone = () => {
    if (!newZoneName.trim()) {
      toast.error("Bölge adı gereklidir.");
      return;
    }
    const updated = editZone
      ? zones.map((z) =>
          z.id === editZone.id
            ? {
                ...z,
                name: newZoneName,
                description: newZoneDesc,
                color: newZoneColor,
              }
            : z,
        )
      : [
          ...zones,
          {
            id: generateId(),
            companyId,
            name: newZoneName,
            description: newZoneDesc,
            color: newZoneColor,
          },
        ];
    setZones(updated);
    saveZones(companyId, updated);
    setNewZoneName("");
    setNewZoneDesc("");
    setNewZoneColor(ZONE_COLORS[0]);
    setShowForm(false);
    setEditZone(null);
    toast.success(editZone ? "Bölge güncellendi." : "Bölge eklendi.");
    reload();
  };

  const deleteZone = (id: string) => {
    const updated = zones.filter((z) => z.id !== id);
    setZones(updated);
    saveZones(companyId, updated);
    toast.success("Bölge silindi.");
    reload();
  };

  const startEdit = (z: Zone) => {
    setEditZone(z);
    setNewZoneName(z.name);
    setNewZoneDesc(z.description ?? "");
    setNewZoneColor(z.color);
    setShowForm(true);
  };

  return (
    <div data-ocid="zone_control.section" className="space-y-6">
      {/* Unauthorized Zone Alert Banner */}
      {alertZone && (
        <div
          className="p-4 rounded-2xl flex items-center justify-between"
          style={{
            background: "rgba(239,68,68,0.12)",
            border: "1.5px solid rgba(239,68,68,0.4)",
          }}
        >
          <div>
            <p className="text-red-400 font-bold text-sm">
              ⚠️ Yetkisiz Bölge Uyarısı
            </p>
            <p className="text-slate-300 text-xs mt-1">
              <strong>{alertZone}</strong> bölgesinde yetkisiz erişim tespit
              edildi. Güvenlik birimini bilgilendirin.
            </p>
          </div>
          <button
            type="button"
            data-ocid="zone_control.dismiss_alert.button"
            onClick={() => setAlertZone(null)}
            className="text-slate-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>
      )}

      {/* Zone Management */}
      <div
        className="p-5 rounded-2xl"
        style={{
          background: "rgba(14,165,233,0.06)",
          border: "1px solid rgba(14,165,233,0.2)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-cyan-400 font-bold text-sm">
            🏢 Tanımlı Bölgeler
          </h3>
          <button
            type="button"
            data-ocid="zone_control.add.button"
            onClick={() => {
              setShowForm(true);
              setEditZone(null);
              setNewZoneName("");
              setNewZoneDesc("");
              setNewZoneColor(ZONE_COLORS[0]);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
            style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
          >
            ➕ Bölge Ekle
          </button>
        </div>

        {showForm && (
          <div
            data-ocid="zone_control.dialog"
            className="mb-4 p-4 rounded-xl space-y-3"
            style={{
              background: "rgba(14,165,233,0.08)",
              border: "1px solid rgba(14,165,233,0.25)",
            }}
          >
            <h4 className="text-white font-semibold text-sm">
              {editZone ? "✏️ Bölge Düzenle" : "➕ Yeni Bölge"}
            </h4>
            <input
              data-ocid="zone_control.name.input"
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              placeholder="Bölge adı (ör. Üretim Alanı)"
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-cyan-400"
            />
            <input
              data-ocid="zone_control.desc.input"
              value={newZoneDesc}
              onChange={(e) => setNewZoneDesc(e.target.value)}
              placeholder="Açıklama (opsiyonel)"
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-cyan-400"
            />
            <div>
              <p className="text-slate-400 text-xs mb-2">Renk seç:</p>
              <div className="flex gap-2 flex-wrap">
                {ZONE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewZoneColor(c)}
                    className="w-7 h-7 rounded-full transition-transform"
                    style={{
                      background: c,
                      transform:
                        newZoneColor === c ? "scale(1.25)" : "scale(1)",
                      outline: newZoneColor === c ? `2px solid ${c}` : "none",
                      outlineOffset: "2px",
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                data-ocid="zone_control.save.button"
                onClick={saveZone}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                }}
              >
                Kaydet
              </button>
              <button
                type="button"
                data-ocid="zone_control.cancel.button"
                onClick={() => {
                  setShowForm(false);
                  setEditZone(null);
                }}
                className="px-4 py-2 rounded-xl text-sm text-slate-400 border border-white/15 hover:bg-white/5"
              >
                İptal
              </button>
            </div>
          </div>
        )}

        {zones.length === 0 ? (
          <div
            data-ocid="zone_control.empty_state"
            className="text-center py-8 text-slate-500"
          >
            <div className="text-3xl mb-2">🏢</div>
            <p className="text-sm">Henüz bölge tanımlanmadı.</p>
            <p className="text-xs mt-1">
              Bölge ekleyerek ziyaretçi erişimlerini yönetin.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {zones.map((z, i) => {
              const zoneVisitors = activeVisitors.filter(
                (v) =>
                  v.notes?.includes(`[zone:${z.id}]`) ||
                  ((v as unknown as Record<string, unknown>).zonePermissions &&
                    Array.isArray(
                      (v as unknown as Record<string, string[]>)
                        .zonePermissions,
                    ) &&
                    (
                      v as unknown as Record<string, string[]>
                    ).zonePermissions.includes(z.id)),
              );
              return (
                <div
                  key={z.id}
                  data-ocid={`zone_control.item.${i + 1}`}
                  className="p-4 rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${z.color}30`,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: z.color }}
                      />
                      <span className="text-white font-semibold text-sm">
                        {z.name}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        data-ocid={`zone_control.edit.${i + 1}`}
                        onClick={() => startEdit(z)}
                        className="text-xs px-2 py-1 rounded text-slate-400 hover:text-cyan-400"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        data-ocid={`zone_control.delete.${i + 1}`}
                        onClick={() => deleteZone(z.id)}
                        className="text-xs px-2 py-1 rounded text-slate-400 hover:text-red-400"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  {z.description && (
                    <p className="text-slate-400 text-xs mb-2">
                      {z.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs">
                      {zoneVisitors.length > 0
                        ? `${zoneVisitors.length} aktif ziyaretçi`
                        : "Aktif ziyaretçi yok"}
                    </span>
                    <button
                      type="button"
                      data-ocid={`zone_control.alert.${i + 1}`}
                      onClick={() => setAlertZone(z.name)}
                      className="text-xs px-2 py-1 rounded text-amber-400 border border-amber-500/30 hover:bg-amber-900/20"
                    >
                      ⚠️ Uyarı Ver
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Visitors by Zone */}
      <div
        className="p-5 rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <h3 className="text-white font-bold text-sm mb-4">
          👥 Aktif Ziyaretçiler &amp; Bölge Erişimi
        </h3>
        {activeVisitors.length === 0 ? (
          <div
            data-ocid="zone_control.visitors_empty_state"
            className="text-center py-8 text-slate-500"
          >
            <div className="text-3xl mb-2">👤</div>
            <p className="text-sm">Şu an aktif ziyaretçi yok.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeVisitors.map((v, i) => {
              const vZones: string[] =
                (v as unknown as Record<string, string[]>).zonePermissions ??
                [];
              return (
                <div
                  key={v.visitorId}
                  data-ocid={`zone_control.visitor.item.${i + 1}`}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div>
                    <p className="text-white text-sm font-medium">{v.name}</p>
                    <p className="text-slate-400 text-xs">
                      {v.category || v.visitType}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {vZones.length === 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-xs text-slate-500 bg-white/5">
                        Bölge tanımsız
                      </span>
                    ) : (
                      vZones.map((zid) => {
                        const zone = zones.find((z) => z.id === zid);
                        return zone ? (
                          <span
                            key={zid}
                            className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{
                              background: `${zone.color}33`,
                              border: `1px solid ${zone.color}66`,
                              color: zone.color,
                            }}
                          >
                            {zone.name}
                          </span>
                        ) : null;
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
