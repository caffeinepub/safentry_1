import type React from "react";
import { useMemo, useState } from "react";
import type { Staff, Visitor } from "../types";

// ─── Shared Styles ────────────────────────────────────────────────────────────
const card = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "14px",
  padding: "18px",
};

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: "8px",
  padding: "8px 12px",
  color: "white",
  width: "100%",
  fontSize: "14px",
};

const btnPrimary: React.CSSProperties = {
  background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
  border: "none",
  borderRadius: "8px",
  color: "white",
  padding: "8px 16px",
  fontSize: "14px",
  cursor: "pointer",
  fontWeight: 600,
};

const btnDanger: React.CSSProperties = {
  background: "rgba(239,68,68,0.15)",
  border: "1px solid rgba(239,68,68,0.4)",
  borderRadius: "8px",
  color: "#f87171",
  padding: "6px 12px",
  fontSize: "13px",
  cursor: "pointer",
};

const sectionTitle = "text-white font-bold text-lg mb-3";
const labelCls = "text-slate-400 text-xs block mb-1";

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 1: Dual Approval Areas (Hassas Alan Çift Onay)
// ─────────────────────────────────────────────────────────────────────────────

interface DualApprovalArea {
  id: string;
  name: string;
  description: string;
}

interface DualApprovalRequest {
  id: string;
  areaId: string;
  areaName: string;
  visitorName: string;
  visitorId: string;
  requestedAt: number;
  requestedBy: string;
  approvals: { approverName: string; approvedAt: number }[];
  rejectedBy?: string;
  rejectedAt?: number;
  status: "pending" | "approved" | "rejected";
}

export const DualApprovalTab: React.FC<{
  companyId: string;
  staffList: Staff[];
  currentStaffName: string;
}> = ({ companyId, currentStaffName }) => {
  const AREAS_KEY = `safentry_dual_approval_areas_${companyId}`;
  const REQS_KEY = `safentry_dual_approvals_${companyId}`;

  const [areas, setAreas] = useState<DualApprovalArea[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(AREAS_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const [requests, setRequests] = useState<DualApprovalRequest[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(REQS_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const [newArea, setNewArea] = useState({ name: "", description: "" });
  const [newReq, setNewReq] = useState({
    visitorName: "",
    visitorId: "",
    areaId: "",
  });
  const [activeView, setActiveView] = useState<"areas" | "requests">(
    "requests",
  );

  const saveAreas = (updated: DualApprovalArea[]) => {
    setAreas(updated);
    localStorage.setItem(AREAS_KEY, JSON.stringify(updated));
  };

  const saveRequests = (updated: DualApprovalRequest[]) => {
    setRequests(updated);
    localStorage.setItem(REQS_KEY, JSON.stringify(updated));
  };

  const addArea = () => {
    if (!newArea.name.trim()) return;
    const area: DualApprovalArea = {
      id: `area_${Date.now()}`,
      name: newArea.name.trim(),
      description: newArea.description.trim(),
    };
    saveAreas([...areas, area]);
    setNewArea({ name: "", description: "" });
  };

  const deleteArea = (id: string) => {
    saveAreas(areas.filter((a) => a.id !== id));
  };

  const createRequest = () => {
    if (!newReq.visitorName.trim() || !newReq.areaId) return;
    const area = areas.find((a) => a.id === newReq.areaId);
    if (!area) return;
    const req: DualApprovalRequest = {
      id: `req_${Date.now()}`,
      areaId: newReq.areaId,
      areaName: area.name,
      visitorName: newReq.visitorName.trim(),
      visitorId: newReq.visitorId.trim(),
      requestedAt: Date.now(),
      requestedBy: currentStaffName,
      approvals: [],
      status: "pending",
    };
    saveRequests([...requests, req]);
    setNewReq({ visitorName: "", visitorId: "", areaId: "" });
  };

  const approve = (reqId: string) => {
    const updated = requests.map((r) => {
      if (r.id !== reqId || r.status !== "pending") return r;
      // Check if this person already approved
      if (r.approvals.some((a) => a.approverName === currentStaffName))
        return r;
      const newApprovals = [
        ...r.approvals,
        { approverName: currentStaffName, approvedAt: Date.now() },
      ];
      return {
        ...r,
        approvals: newApprovals,
        status:
          newApprovals.length >= 2
            ? ("approved" as const)
            : ("pending" as const),
      };
    });
    saveRequests(updated);
  };

  const reject = (reqId: string) => {
    const updated = requests.map((r) =>
      r.id === reqId && r.status === "pending"
        ? {
            ...r,
            status: "rejected" as const,
            rejectedBy: currentStaffName,
            rejectedAt: Date.now(),
          }
        : r,
    );
    saveRequests(updated);
  };

  const pendingReqs = requests.filter((r) => r.status === "pending");
  const resolvedReqs = requests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      <h2 className={sectionTitle}>🔐 Hassas Alan Çift Onay Sistemi</h2>
      <p className="text-slate-400 text-sm">
        Yüksek güvenlikli alanlara giriş için iki ayrı personelin onayı
        gereklidir.
      </p>

      {/* View toggle */}
      <div className="flex gap-2">
        {(["requests", "areas"] as const).map((v) => (
          <button
            key={v}
            type="button"
            data-ocid={`dualapproval.${v}.tab`}
            onClick={() => setActiveView(v)}
            style={{
              ...btnPrimary,
              background:
                activeView === v
                  ? "linear-gradient(135deg,#0ea5e9,#0284c7)"
                  : "rgba(255,255,255,0.08)",
              border:
                activeView === v ? "none" : "1px solid rgba(255,255,255,0.12)",
            }}
          >
            {v === "requests"
              ? `📋 Onay Talepleri (${pendingReqs.length})`
              : "🏢 Alan Yönetimi"}
          </button>
        ))}
      </div>

      {activeView === "areas" && (
        <div className="space-y-4">
          {/* Add area form */}
          <div style={card}>
            <p className="text-white font-semibold mb-3">
              Yeni Hassas Alan Ekle
            </p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <span className={labelCls}>Alan Adı *</span>
                <input
                  style={inputStyle}
                  placeholder="Sunucu Odası"
                  value={newArea.name}
                  onChange={(e) =>
                    setNewArea((p) => ({ ...p, name: e.target.value }))
                  }
                  data-ocid="dualapproval.area_name.input"
                />
              </div>
              <div>
                <span className={labelCls}>Açıklama</span>
                <input
                  style={inputStyle}
                  placeholder="Kritik altyapı erişimi"
                  value={newArea.description}
                  onChange={(e) =>
                    setNewArea((p) => ({ ...p, description: e.target.value }))
                  }
                  data-ocid="dualapproval.area_desc.input"
                />
              </div>
            </div>
            <button
              type="button"
              style={btnPrimary}
              onClick={addArea}
              data-ocid="dualapproval.add_area.button"
            >
              + Alan Ekle
            </button>
          </div>

          {/* Area list */}
          {areas.length === 0 ? (
            <div
              data-ocid="dualapproval.areas.empty_state"
              className="text-center py-10 text-slate-500"
            >
              <div className="text-4xl mb-2">🏢</div>
              <p>Henüz hassas alan tanımlanmadı</p>
            </div>
          ) : (
            <div className="space-y-2" data-ocid="dualapproval.areas.list">
              {areas.map((area, i) => (
                <div
                  key={area.id}
                  data-ocid={`dualapproval.area.item.${i + 1}`}
                  className="flex items-center justify-between p-4 rounded-xl"
                  style={card}
                >
                  <div>
                    <p className="text-white font-medium">{area.name}</p>
                    {area.description && (
                      <p className="text-slate-400 text-xs mt-0.5">
                        {area.description}
                      </p>
                    )}
                    <span
                      className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block"
                      style={{
                        background: "rgba(239,68,68,0.15)",
                        color: "#f87171",
                        border: "1px solid rgba(239,68,68,0.3)",
                      }}
                    >
                      2 onay gerekli
                    </span>
                  </div>
                  <button
                    type="button"
                    style={btnDanger}
                    onClick={() => deleteArea(area.id)}
                    data-ocid={`dualapproval.area.delete_button.${i + 1}`}
                  >
                    Sil
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === "requests" && (
        <div className="space-y-4">
          {/* Create request form */}
          {areas.length > 0 && (
            <div style={card}>
              <p className="text-white font-semibold mb-3">
                Yeni Onay Talebi Oluştur
              </p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <span className={labelCls}>Ziyaretçi Adı *</span>
                  <input
                    style={inputStyle}
                    placeholder="Ad Soyad"
                    value={newReq.visitorName}
                    onChange={(e) =>
                      setNewReq((p) => ({ ...p, visitorName: e.target.value }))
                    }
                    data-ocid="dualapproval.visitor_name.input"
                  />
                </div>
                <div>
                  <span className={labelCls}>TC / Pasaport</span>
                  <input
                    style={inputStyle}
                    placeholder="12345678901"
                    value={newReq.visitorId}
                    onChange={(e) =>
                      setNewReq((p) => ({ ...p, visitorId: e.target.value }))
                    }
                    data-ocid="dualapproval.visitor_id.input"
                  />
                </div>
                <div>
                  <span className={labelCls}>Alan *</span>
                  <select
                    style={inputStyle}
                    value={newReq.areaId}
                    onChange={(e) =>
                      setNewReq((p) => ({ ...p, areaId: e.target.value }))
                    }
                    data-ocid="dualapproval.area.select"
                  >
                    <option value="">Alan seçin...</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                style={btnPrimary}
                onClick={createRequest}
                data-ocid="dualapproval.create_request.button"
              >
                Onay Talebi Oluştur
              </button>
            </div>
          )}
          {areas.length === 0 && (
            <div
              className="p-4 rounded-xl text-amber-400 text-sm"
              style={{
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.3)",
              }}
            >
              ⚠️ Önce "Alan Yönetimi" sekmesinden en az bir hassas alan
              tanımlayın.
            </div>
          )}

          {/* Pending requests */}
          <div>
            <p className="text-slate-300 font-semibold mb-2">
              Bekleyen Talepler ({pendingReqs.length})
            </p>
            {pendingReqs.length === 0 ? (
              <div
                data-ocid="dualapproval.pending.empty_state"
                className="text-center py-8 text-slate-500"
              >
                <div className="text-3xl mb-2">✅</div>
                <p>Bekleyen onay talebi yok</p>
              </div>
            ) : (
              <div className="space-y-3" data-ocid="dualapproval.pending.list">
                {pendingReqs.map((req, i) => {
                  const alreadyApproved = req.approvals.some(
                    (a) => a.approverName === currentStaffName,
                  );
                  return (
                    <div
                      key={req.id}
                      data-ocid={`dualapproval.pending.item.${i + 1}`}
                      style={{
                        ...card,
                        border: "1px solid rgba(14,165,233,0.3)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-semibold">
                              {req.visitorName}
                            </span>
                            {req.visitorId && (
                              <span className="text-slate-400 text-xs">
                                {req.visitorId}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400 text-xs">
                            📍 {req.areaName} · Talep eden: {req.requestedBy} ·{" "}
                            {new Date(req.requestedAt).toLocaleString("tr-TR")}
                          </p>
                          <div className="flex gap-2 mt-2">
                            {[0, 1].map((slot) => (
                              <span
                                key={slot}
                                className="text-xs px-2 py-1 rounded-full"
                                style={{
                                  background: req.approvals[slot]
                                    ? "rgba(34,197,94,0.15)"
                                    : "rgba(255,255,255,0.06)",
                                  border: req.approvals[slot]
                                    ? "1px solid rgba(34,197,94,0.4)"
                                    : "1px solid rgba(255,255,255,0.12)",
                                  color: req.approvals[slot]
                                    ? "#4ade80"
                                    : "#94a3b8",
                                }}
                              >
                                {req.approvals[slot]
                                  ? `✓ ${req.approvals[slot].approverName}`
                                  : `${slot + 1}. onay bekleniyor`}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            style={{
                              ...btnPrimary,
                              opacity: alreadyApproved ? 0.5 : 1,
                              cursor: alreadyApproved
                                ? "not-allowed"
                                : "pointer",
                            }}
                            onClick={() => !alreadyApproved && approve(req.id)}
                            title={
                              alreadyApproved ? "Zaten onayladınız" : "Onayla"
                            }
                            data-ocid={`dualapproval.approve.button.${i + 1}`}
                          >
                            ✓ Onayla
                          </button>
                          <button
                            type="button"
                            style={btnDanger}
                            onClick={() => reject(req.id)}
                            data-ocid={`dualapproval.reject.button.${i + 1}`}
                          >
                            ✗ Reddet
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resolved requests */}
          {resolvedReqs.length > 0 && (
            <div>
              <p className="text-slate-300 font-semibold mb-2">
                Tamamlanan Talepler
              </p>
              <div className="space-y-2">
                {resolvedReqs
                  .slice(-10)
                  .reverse()
                  .map((req, i) => (
                    <div
                      key={req.id}
                      data-ocid={`dualapproval.resolved.item.${i + 1}`}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={card}
                    >
                      <div>
                        <span className="text-white text-sm font-medium">
                          {req.visitorName}
                        </span>
                        <span className="text-slate-400 text-xs ml-2">
                          📍 {req.areaName}
                        </span>
                      </div>
                      <span
                        className="text-xs px-3 py-1 rounded-full font-medium"
                        style={{
                          background:
                            req.status === "approved"
                              ? "rgba(34,197,94,0.15)"
                              : "rgba(239,68,68,0.15)",
                          border:
                            req.status === "approved"
                              ? "1px solid rgba(34,197,94,0.4)"
                              : "1px solid rgba(239,68,68,0.4)",
                          color:
                            req.status === "approved" ? "#4ade80" : "#f87171",
                        }}
                      >
                        {req.status === "approved"
                          ? "✓ Onaylandı"
                          : "✗ Reddedildi"}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 2: Re-entry Cooldown (Yeniden Giriş Soğuma Süresi)
// ─────────────────────────────────────────────────────────────────────────────

interface CooldownConfig {
  minutes: number;
  enabled: boolean;
}

interface CooldownOverride {
  id: string;
  visitorName: string;
  idNumber: string;
  reason: string;
  overriddenBy: string;
  overriddenAt: number;
  minutesWaited: number;
  configuredMinutes: number;
}

export const CooldownTab: React.FC<{
  companyId: string;
  visitors: Visitor[];
}> = ({ companyId, visitors }) => {
  const CONFIG_KEY = `safentry_cooldown_config_${companyId}`;
  const OVERRIDE_KEY = `safentry_cooldown_overrides_${companyId}`;

  const [config, setConfig] = useState<CooldownConfig>(() => {
    try {
      return JSON.parse(
        localStorage.getItem(CONFIG_KEY) ||
          JSON.stringify({ minutes: 120, enabled: false }),
      );
    } catch {
      return { minutes: 120, enabled: false };
    }
  });

  const [overrides] = useState<CooldownOverride[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(OVERRIDE_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const [editMinutes, setEditMinutes] = useState(String(config.minutes));
  const [saved, setSaved] = useState(false);

  const saveConfig = (updated: CooldownConfig) => {
    setConfig(updated);
    localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Find visitors who recently exited (departed within cooldown window)
  const now = Date.now();
  const cooldownMs = config.minutes * 60 * 1000;

  const recentlyExited = useMemo(() => {
    if (!config.enabled) return [];
    return visitors.filter((v) => {
      if (v.status !== "departed" || !v.departureTime) return false;
      const elapsed = now - v.departureTime;
      return elapsed < cooldownMs;
    });
  }, [visitors, config, cooldownMs, now]);

  return (
    <div className="space-y-6">
      <h2 className={sectionTitle}>⏳ Yeniden Giriş Soğuma Süresi</h2>
      <p className="text-slate-400 text-sm">
        Çıkış yapan ziyaretçilerin belirli bir süre geçmeden yeniden giriş
        yapmasını engelleyin.
      </p>

      {/* Config card */}
      <div style={card}>
        <p className="text-white font-semibold mb-4">
          ⚙️ Soğuma Süresi Ayarları
        </p>
        <div className="flex items-end gap-4 mb-4">
          <div className="flex-1">
            <span className={labelCls}>Soğuma Süresi (dakika)</span>
            <input
              type="number"
              min="1"
              max="1440"
              style={{ ...inputStyle, maxWidth: "200px" }}
              value={editMinutes}
              onChange={(e) => setEditMinutes(e.target.value)}
              data-ocid="cooldown.minutes.input"
            />
            <p className="text-slate-500 text-xs mt-1">
              {Number(editMinutes) >= 60
                ? `${Math.floor(Number(editMinutes) / 60)} saat ${Number(editMinutes) % 60 > 0 ? `${Number(editMinutes) % 60} dakika` : ""}`
                : `${editMinutes} dakika`}
            </p>
          </div>
          <div>
            <span className={labelCls}>Durum</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-ocid="cooldown.toggle.switch"
                onClick={() =>
                  saveConfig({ ...config, enabled: !config.enabled })
                }
                style={{
                  width: "44px",
                  height: "24px",
                  borderRadius: "12px",
                  border: "none",
                  cursor: "pointer",
                  position: "relative",
                  background: config.enabled
                    ? "#0ea5e9"
                    : "rgba(255,255,255,0.15)",
                  transition: "background 0.2s",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "3px",
                    left: config.enabled ? "22px" : "3px",
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: "white",
                    transition: "left 0.2s",
                  }}
                />
              </button>
              <span
                className="text-sm"
                style={{ color: config.enabled ? "#4ade80" : "#94a3b8" }}
              >
                {config.enabled ? "Aktif" : "Pasif"}
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          style={btnPrimary}
          data-ocid="cooldown.save.button"
          onClick={() =>
            saveConfig({ ...config, minutes: Number(editMinutes) || 120 })
          }
        >
          {saved ? "✓ Kaydedildi" : "💾 Kaydet"}
        </button>
      </div>

      {/* Currently blocked visitors */}
      {config.enabled && (
        <div>
          <p className="text-slate-300 font-semibold mb-3">
            🚫 Soğuma Süresindeki Ziyaretçiler ({recentlyExited.length})
          </p>
          {recentlyExited.length === 0 ? (
            <div
              data-ocid="cooldown.blocked.empty_state"
              className="text-center py-8 text-slate-500"
            >
              <div className="text-3xl mb-2">✅</div>
              <p>Şu an soğuma süresinde ziyaretçi yok</p>
            </div>
          ) : (
            <div className="space-y-2" data-ocid="cooldown.blocked.list">
              {recentlyExited.map((v, i) => {
                const elapsed = Math.floor(
                  (now - (v.departureTime ?? 0)) / 60000,
                );
                const remaining = config.minutes - elapsed;
                return (
                  <div
                    key={v.visitorId}
                    data-ocid={`cooldown.blocked.item.${i + 1}`}
                    className="p-4 rounded-xl"
                    style={{
                      ...card,
                      border: "1px solid rgba(245,158,11,0.35)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{v.name}</p>
                        <p className="text-slate-400 text-xs">
                          {v.idNumber} · {elapsed} dk önce çıkış yaptı
                        </p>
                      </div>
                      <span
                        className="text-xs px-3 py-1.5 rounded-full font-semibold"
                        style={{
                          background: "rgba(245,158,11,0.15)",
                          border: "1px solid rgba(245,158,11,0.4)",
                          color: "#fbbf24",
                        }}
                      >
                        ⏳ {remaining} dk kaldı
                      </span>
                    </div>
                    <div
                      className="mt-2 p-2 rounded-lg text-xs"
                      style={{
                        background: "rgba(245,158,11,0.08)",
                        color: "#fbbf24",
                      }}
                    >
                      Bu ziyaretçi {elapsed} dakika önce çıkış yaptı. Yeniden
                      giriş için {remaining} dakika beklenmeli.
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Override log */}
      {overrides.length > 0 && (
        <div>
          <p className="text-slate-300 font-semibold mb-3">
            📋 Override Geçmişi
          </p>
          <div className="space-y-2">
            {overrides
              .slice(-10)
              .reverse()
              .map((ov, i) => (
                <div
                  key={ov.id}
                  data-ocid={`cooldown.override.item.${i + 1}`}
                  className="p-3 rounded-xl"
                  style={card}
                >
                  <p className="text-white text-sm">
                    <span className="font-medium">{ov.visitorName}</span>
                    <span className="text-slate-400 text-xs ml-2">
                      {ov.idNumber}
                    </span>
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Override eden: {ov.overriddenBy} ·{" "}
                    {new Date(ov.overriddenAt).toLocaleString("tr-TR")}
                  </p>
                  <p className="text-amber-400 text-xs mt-0.5">
                    Gerekçe: {ov.reason}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {!config.enabled && (
        <div
          className="p-4 rounded-xl text-slate-400 text-sm text-center"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px dashed rgba(255,255,255,0.15)",
          }}
        >
          Soğuma süresi özelliği şu an pasif. Yukarıdan etkinleştirin.
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 3: Daily Task List (Personel Günlük Görev Listesi)
// ─────────────────────────────────────────────────────────────────────────────

interface DailyTask {
  id: string;
  timeSlot: string;
  description: string;
  priority: "Normal" | "Acil";
  assignedTo: string; // staffId
  assignedToName: string;
  createdBy: string;
  date: string; // YYYY-MM-DD
  done: boolean;
  doneAt?: number;
  companyId: string;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export const DailyTasksTab: React.FC<{
  companyId: string;
  staffId: string | undefined;
  staffName: string;
  isAdmin: boolean;
  staffList: Staff[];
}> = ({ companyId, staffId, staffName, isAdmin, staffList }) => {
  const today = todayStr();
  const TASK_KEY = (date: string) =>
    `safentry_daily_tasks_${companyId}_${staffId ?? "unknown"}_${date}`;
  const ALL_TASK_KEY = (date: string) =>
    `safentry_daily_tasks_${companyId}_all_${date}`;

  const [selectedDate, setSelectedDate] = useState(today);
  const [tasks, setTasks] = useState<DailyTask[]>(() => {
    // Load tasks for this staff on selected date
    const myTasks: DailyTask[] = JSON.parse(
      localStorage.getItem(TASK_KEY(today)) ?? "[]",
    );
    const allTasks: DailyTask[] = isAdmin
      ? JSON.parse(localStorage.getItem(ALL_TASK_KEY(today)) ?? "[]")
      : [];
    const merged = [...myTasks];
    for (const t of allTasks) {
      if (!merged.find((m) => m.id === t.id)) merged.push(t);
    }
    return merged;
  });

  const [newTask, setNewTask] = useState({
    timeSlot: "",
    description: "",
    priority: "Normal" as "Normal" | "Acil",
    assignedToId: staffId,
  });

  const loadTasks = (date: string) => {
    const myTasks: DailyTask[] = JSON.parse(
      localStorage.getItem(TASK_KEY(date)) ?? "[]",
    );
    const allTasks: DailyTask[] = isAdmin
      ? JSON.parse(localStorage.getItem(ALL_TASK_KEY(date)) ?? "[]")
      : [];
    const merged = [...myTasks];
    for (const t of allTasks) {
      if (!merged.find((m) => m.id === t.id)) merged.push(t);
    }
    setTasks(merged);
  };

  const changeDate = (date: string) => {
    setSelectedDate(date);
    loadTasks(date);
  };

  const persistTask = (task: DailyTask, updated: DailyTask[]) => {
    // Always save to the assigned staff's key
    const assigneeKey = `safentry_daily_tasks_${companyId}_${task.assignedTo}_${task.date}`;
    const existing: DailyTask[] = JSON.parse(
      localStorage.getItem(assigneeKey) ?? "[]",
    );
    const idx = existing.findIndex((t) => t.id === task.id);
    if (idx >= 0) existing[idx] = task;
    else existing.push(task);
    localStorage.setItem(assigneeKey, JSON.stringify(existing));
    // If admin, also save to all-tasks pool
    if (isAdmin) {
      const allKey = ALL_TASK_KEY(task.date);
      const allExisting: DailyTask[] = JSON.parse(
        localStorage.getItem(allKey) ?? "[]",
      );
      const ai = allExisting.findIndex((t) => t.id === task.id);
      if (ai >= 0) allExisting[ai] = task;
      else allExisting.push(task);
      localStorage.setItem(allKey, JSON.stringify(allExisting));
    }
    setTasks(updated);
  };

  const addTask = () => {
    if (!newTask.description.trim()) return;
    const assignee = staffList.find((s) => s.staffId === newTask.assignedToId);
    const task: DailyTask = {
      id: `task_${Date.now()}`,
      timeSlot: newTask.timeSlot.trim(),
      description: newTask.description.trim(),
      priority: newTask.priority,
      assignedTo: newTask.assignedToId ?? "",
      assignedToName: assignee?.name ?? staffName,
      createdBy: staffName,
      date: today,
      done: false,
      companyId,
    };
    const updated = [...tasks, task];
    persistTask(task, updated);
    setNewTask({
      timeSlot: "",
      description: "",
      priority: "Normal",
      assignedToId: staffId,
    });
  };

  const toggleDone = (taskId: string) => {
    const updated = tasks.map((t) => {
      if (t.id !== taskId) return t;
      const toggled = {
        ...t,
        done: !t.done,
        doneAt: !t.done ? Date.now() : undefined,
      };
      persistTask(
        toggled,
        tasks.map((x) => (x.id === taskId ? toggled : x)),
      );
      return toggled;
    });
    setTasks(updated);
  };

  const deleteTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const updated = tasks.filter((t) => t.id !== taskId);
    setTasks(updated);
    // Remove from storage
    const assigneeKey = `safentry_daily_tasks_${companyId}_${task.assignedTo}_${task.date}`;
    const existing: DailyTask[] = JSON.parse(
      localStorage.getItem(assigneeKey) ?? "[]",
    );
    localStorage.setItem(
      assigneeKey,
      JSON.stringify(existing.filter((t) => t.id !== taskId)),
    );
    if (isAdmin) {
      const allKey = ALL_TASK_KEY(task.date);
      const allExisting: DailyTask[] = JSON.parse(
        localStorage.getItem(allKey) ?? "[]",
      );
      localStorage.setItem(
        allKey,
        JSON.stringify(allExisting.filter((t) => t.id !== taskId)),
      );
    }
  };

  const doneTasks = tasks.filter((t) => t.done);
  const pendingTasks = tasks.filter((t) => !t.done);
  const completion =
    tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.priority !== b.priority) return a.priority === "Acil" ? -1 : 1;
    return (a.timeSlot || "99:99").localeCompare(b.timeSlot || "99:99");
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className={sectionTitle}>📋 Günlük Görev Listesi</h2>
        <input
          type="date"
          style={{ ...inputStyle, width: "auto", fontSize: "13px" }}
          value={selectedDate}
          onChange={(e) => changeDate(e.target.value)}
          data-ocid="dailytasks.date.input"
        />
      </div>

      {/* Completion bar */}
      <div style={card}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-300 text-sm font-medium">
            Tamamlanma Oranı
          </span>
          <span className="text-white font-bold">{completion}%</span>
        </div>
        <div
          style={{
            height: "8px",
            borderRadius: "4px",
            background: "rgba(255,255,255,0.1)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: "4px",
              width: `${completion}%`,
              background:
                completion === 100
                  ? "#4ade80"
                  : "linear-gradient(90deg,#0ea5e9,#0284c7)",
              transition: "width 0.4s ease",
            }}
          />
        </div>
        <div className="flex gap-4 mt-2 text-xs text-slate-400">
          <span>✅ {doneTasks.length} tamamlandı</span>
          <span>⏳ {pendingTasks.length} bekliyor</span>
          <span>📋 Toplam: {tasks.length}</span>
        </div>
      </div>

      {/* Add task form */}
      <div style={card}>
        <p className="text-white font-semibold mb-3">+ Yeni Görev Ekle</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <span className={labelCls}>Saat Dilimi</span>
            <input
              type="time"
              style={inputStyle}
              value={newTask.timeSlot}
              onChange={(e) =>
                setNewTask((p) => ({ ...p, timeSlot: e.target.value }))
              }
              data-ocid="dailytasks.timeslot.input"
            />
          </div>
          <div>
            <span className={labelCls}>Öncelik</span>
            <select
              style={inputStyle}
              value={newTask.priority}
              onChange={(e) =>
                setNewTask((p) => ({
                  ...p,
                  priority: e.target.value as "Normal" | "Acil",
                }))
              }
              data-ocid="dailytasks.priority.select"
            >
              <option value="Normal">Normal</option>
              <option value="Acil">🚨 Acil</option>
            </select>
          </div>
        </div>
        {isAdmin && staffList.length > 0 && (
          <div className="mb-3">
            <span className={labelCls}>Atanan Personel</span>
            <select
              style={inputStyle}
              value={newTask.assignedToId}
              onChange={(e) =>
                setNewTask((p) => ({ ...p, assignedToId: e.target.value }))
              }
              data-ocid="dailytasks.assignee.select"
            >
              {staffList.map((s) => (
                <option key={s.staffId} value={s.staffId}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="mb-3">
          <span className={labelCls}>Görev Açıklaması *</span>
          <input
            style={inputStyle}
            placeholder="Görevin ne olduğunu yazın..."
            value={newTask.description}
            onChange={(e) =>
              setNewTask((p) => ({ ...p, description: e.target.value }))
            }
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            data-ocid="dailytasks.description.input"
          />
        </div>
        <button
          type="button"
          style={btnPrimary}
          onClick={addTask}
          data-ocid="dailytasks.add.button"
        >
          + Görev Ekle
        </button>
      </div>

      {/* Task list */}
      {sortedTasks.length === 0 ? (
        <div
          data-ocid="dailytasks.empty_state"
          className="text-center py-12 text-slate-500"
        >
          <div className="text-5xl mb-3">📋</div>
          <p className="text-lg font-medium text-slate-400">
            Bu gün için görev yok
          </p>
          <p className="text-sm mt-1">Yukarıdan yeni görev ekleyin</p>
        </div>
      ) : (
        <div className="space-y-2" data-ocid="dailytasks.list">
          {sortedTasks.map((task, i) => (
            <div
              key={task.id}
              data-ocid={`dailytasks.item.${i + 1}`}
              className="flex items-start gap-3 p-4 rounded-xl transition-all"
              style={{
                ...card,
                border:
                  task.priority === "Acil" && !task.done
                    ? "1px solid rgba(239,68,68,0.4)"
                    : task.done
                      ? "1px solid rgba(34,197,94,0.2)"
                      : "1px solid rgba(255,255,255,0.1)",
                opacity: task.done ? 0.65 : 1,
              }}
            >
              <button
                type="button"
                data-ocid={`dailytasks.checkbox.${i + 1}`}
                onClick={() => toggleDone(task.id)}
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "6px",
                  border: task.done
                    ? "none"
                    : "2px solid rgba(255,255,255,0.3)",
                  background: task.done ? "#4ade80" : "transparent",
                  cursor: "pointer",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  marginTop: "2px",
                }}
              >
                {task.done ? "✓" : ""}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {task.timeSlot && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-mono"
                      style={{
                        background: "rgba(14,165,233,0.15)",
                        color: "#38bdf8",
                        border: "1px solid rgba(14,165,233,0.2)",
                      }}
                    >
                      {task.timeSlot}
                    </span>
                  )}
                  {task.priority === "Acil" && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-semibold"
                      style={{
                        background: "rgba(239,68,68,0.15)",
                        color: "#f87171",
                        border: "1px solid rgba(239,68,68,0.3)",
                      }}
                    >
                      🚨 Acil
                    </span>
                  )}
                  <span
                    className="text-white text-sm"
                    style={{
                      textDecoration: task.done ? "line-through" : "none",
                    }}
                  >
                    {task.description}
                  </span>
                </div>
                {task.assignedToName !== staffName && (
                  <p className="text-slate-500 text-xs mt-0.5">
                    👤 {task.assignedToName}
                  </p>
                )}
                {task.done && task.doneAt && (
                  <p className="text-slate-500 text-xs mt-0.5">
                    ✅{" "}
                    {new Date(task.doneAt).toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    tamamlandı
                  </p>
                )}
              </div>
              <button
                type="button"
                style={{ ...btnDanger, padding: "4px 8px", fontSize: "12px" }}
                onClick={() => deleteTask(task.id)}
                data-ocid={`dailytasks.delete_button.${i + 1}`}
                title="Görevi sil"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Incomplete tasks notice */}
      {pendingTasks.length > 0 && selectedDate === today && (
        <div
          className="p-4 rounded-xl text-sm"
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.25)",
          }}
        >
          <p className="text-amber-400 font-semibold mb-1">
            ⚠️ Tamamlanmamış Görevler ({pendingTasks.length})
          </p>
          <p className="text-slate-400">
            Vardiya devir-teslim raporuna otomatik olarak eklenir.
          </p>
          <ul className="mt-2 space-y-1">
            {pendingTasks.slice(0, 3).map((t) => (
              <li key={t.id} className="text-slate-300 text-xs">
                • {t.timeSlot && `[${t.timeSlot}] `}
                {t.description}
              </li>
            ))}
            {pendingTasks.length > 3 && (
              <li className="text-slate-500 text-xs">
                ...ve {pendingTasks.length - 3} görev daha
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
