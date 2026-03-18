import { useEffect, useState } from "react";
import { getIncidents, getPermits } from "../store";
import type { Appointment, Visitor } from "../types";

interface Props {
  companyId: string;
  visitors: Visitor[];
  appointments: Appointment[];
  onDismiss: () => void;
}

export default function DailyBriefing({
  companyId,
  visitors,
  appointments,
  onDismiss,
}: Props) {
  const [lockdownActive, setLockdownActive] = useState(false);

  useEffect(() => {
    try {
      const ld = localStorage.getItem(`safentry_lockdown_${companyId}`);
      setLockdownActive(ld === "active");
    } catch {
      // ignore
    }
  }, [companyId]);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Appointment counts
  const todayAppts = appointments.filter(
    (a) => a.appointmentDate === todayStr && a.status !== "cancelled",
  );
  const vipCount = visitors.filter(
    (v) => v.label === "vip" || v.category === "VIP",
  ).length;
  const contractorCount = visitors.filter(
    (v) => v.category === "Müteahhit" || v.label === "restricted",
  ).length;

  // Contractor permits expiring this week
  const permits = getPermits(companyId);
  const weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  const expiringPermits = permits.filter((p) => {
    const exp = new Date(p.expiryDate);
    return exp >= today && exp <= weekFromNow;
  });

  // Incidents this week
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const incidents = getIncidents(companyId).filter(
    (i) => i.timestamp >= weekAgo,
  );

  const hasWarnings =
    lockdownActive || expiringPermits.length > 0 || incidents.length > 0;

  return (
    <div
      data-ocid="briefing.modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div
        className="w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: "#0d1b2e",
          border: "1.5px solid rgba(0,212,170,0.35)",
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{
            background:
              "linear-gradient(135deg, rgba(0,212,170,0.2) 0%, rgba(0,150,120,0.1) 100%)",
            borderBottom: "1px solid rgba(0,212,170,0.2)",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <h2 className="text-white font-bold text-lg">
                Vardiya Brifing Özeti
              </h2>
              <p className="text-slate-400 text-xs">
                {today.toLocaleDateString("tr-TR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-ocid="briefing.close_button"
            onClick={onDismiss}
            className="text-slate-400 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            style={{ background: "rgba(255,255,255,0.07)" }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Emergency alert */}
          {lockdownActive && (
            <div
              data-ocid="briefing.emergency.panel"
              className="p-3 rounded-xl flex items-center gap-3"
              style={{
                background: "rgba(239,68,68,0.15)",
                border: "1.5px solid rgba(239,68,68,0.5)",
              }}
            >
              <span className="text-xl">🚨</span>
              <span className="text-red-400 font-bold text-sm">
                ACİL DURUM / KİLİTLEME MODU AKTİF
              </span>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon="📅"
              label="Bugün Randevu"
              value={todayAppts.length}
              color="#00d4aa"
            />
            <StatCard
              icon="⭐"
              label="VIP Ziyaretçi"
              value={vipCount}
              color="#f59e0b"
              highlight={vipCount > 0}
            />
            <StatCard
              icon="🔧"
              label="Müteahhit"
              value={contractorCount}
              color="#f97316"
            />
            <StatCard
              icon="👥"
              label="Şu An İçeride"
              value={visitors.filter((v) => v.status === "active").length}
              color="#22c55e"
            />
          </div>

          {/* Warnings */}
          {expiringPermits.length > 0 && (
            <div
              className="p-3 rounded-xl"
              style={{
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.3)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span>⚠️</span>
                <span className="text-amber-400 font-semibold text-sm">
                  Bu Hafta Dolacak İzinler ({expiringPermits.length})
                </span>
              </div>
              {expiringPermits.slice(0, 3).map((p) => (
                <div key={p.id} className="text-slate-300 text-xs ml-6">
                  • {p.contractorName} — {p.expiryDate}
                </div>
              ))}
            </div>
          )}

          {incidents.length > 0 && (
            <div
              className="p-3 rounded-xl"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
              }}
            >
              <div className="flex items-center gap-2">
                <span>🚧</span>
                <span className="text-red-400 font-semibold text-sm">
                  Son 7 Günde {incidents.length} Güvenlik Olayı Kaydedildi
                </span>
              </div>
            </div>
          )}

          {!hasWarnings && (
            <div
              className="p-3 rounded-xl flex items-center gap-3"
              style={{
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >
              <span className="text-xl">✅</span>
              <span className="text-emerald-400 text-sm">
                Aktif uyarı bulunmuyor. İyi vardiyalar!
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <button
            type="button"
            data-ocid="briefing.dismiss_button"
            onClick={onDismiss}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #00d4aa 0%, #00a88a 100%)",
            }}
          >
            Anladım, Vardiyaya Başla
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  highlight = false,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="p-3 rounded-xl"
      style={{
        background: `${color}12`,
        border: `1px solid ${color}${highlight ? "50" : "25"}`,
      }}
    >
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-2xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}
