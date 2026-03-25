import React, { useState } from "react";
import { getAccessUpgradeRequests, saveAccessUpgradeRequest } from "../store";
import type { AccessUpgradeRequest } from "../types";

interface Props {
  companyId: string;
  staffName: string;
}

export default function AccessUpgradeRequestsTab({
  companyId,
  staffName,
}: Props) {
  const [requests, setRequests] = useState<AccessUpgradeRequest[]>(() =>
    getAccessUpgradeRequests(companyId),
  );
  const reload = () => setRequests(getAccessUpgradeRequests(companyId));

  const handle = (id: string, status: "approved" | "rejected") => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    saveAccessUpgradeRequest({
      ...req,
      status,
      resolvedAt: Date.now(),
      resolvedBy: staffName,
    });
    reload();
  };

  const pending = requests.filter((r) => r.status === "pending");
  const resolved = requests.filter((r) => r.status !== "pending");

  const cardStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
  };

  const statusColor = (s: string) =>
    s === "approved" ? "#22c55e" : s === "rejected" ? "#ef4444" : "#f59e0b";
  const statusLabel = (s: string) =>
    s === "approved"
      ? "Onaylandı"
      : s === "rejected"
        ? "Reddedildi"
        : "Bekliyor";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white font-bold text-xl">
          ⬆️ Erişim Yükseltme Talepleri
        </h2>
        <p className="text-slate-400 text-sm mt-0.5">
          Aktif ziyaretçiler için geçici ek bölge erişim talepleri
        </p>
      </div>

      {pending.length === 0 && resolved.length === 0 && (
        <div
          data-ocid="erisimstalepleri.empty_state"
          className="text-center py-16 text-slate-500"
        >
          <div className="text-4xl mb-2">⬆️</div>
          <p>Bekleyen erişim yükseltme talebi yok</p>
          <p className="text-xs mt-1">
            Personel panelinden aktif ziyaretçiler için talep oluşturabilir
          </p>
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-amber-300 font-semibold text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Bekleyen Talepler ({pending.length})
          </h3>
          {pending.map((r, i) => (
            <div
              key={r.id}
              data-ocid={`erisimstalepleri.item.${i + 1}`}
              className="p-4 rounded-xl"
              style={{ ...cardStyle, border: "1px solid rgba(245,158,11,0.3)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-white font-semibold">
                      {r.visitorName}
                    </span>
                    <span className="text-xs text-slate-400">
                      talep eden: {r.requestedBy}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(r.createdAt).toLocaleString("tr-TR")}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm mt-1">
                    Gerekçe: {r.reason}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {r.zones.map((z) => (
                      <span
                        key={z}
                        className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20"
                      >
                        {z}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Süre:{" "}
                    {r.duration === "custom"
                      ? `${r.customDuration} saat`
                      : r.duration}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    data-ocid={`erisimstalepleri.confirm_button.${i + 1}`}
                    onClick={() => handle(r.id, "approved")}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{
                      background: "rgba(34,197,94,0.2)",
                      border: "1px solid rgba(34,197,94,0.4)",
                    }}
                  >
                    Onayla
                  </button>
                  <button
                    type="button"
                    data-ocid={`erisimstalepleri.delete_button.${i + 1}`}
                    onClick={() => handle(r.id, "rejected")}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-300"
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.3)",
                    }}
                  >
                    Reddet
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-slate-400 font-semibold text-sm">
            Geçmiş Talepler ({resolved.length})
          </h3>
          {resolved.map((r, _i) => (
            <div key={r.id} className="p-3 rounded-xl" style={cardStyle}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white text-sm font-medium">
                    {r.visitorName}
                  </span>
                  <span className="text-xs text-slate-500 ml-2">
                    {new Date(r.createdAt).toLocaleDateString("tr-TR")}
                  </span>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    color: statusColor(r.status),
                    background: `${statusColor(r.status)}1a`,
                    border: `1px solid ${statusColor(r.status)}44`,
                  }}
                >
                  {statusLabel(r.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
