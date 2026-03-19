import React, { useState, useEffect } from "react";
import { getBlacklist, getStaffByCompany, getVisitors } from "../store";

interface SystemHealthPanelProps {
  companyId: string;
  hasBackend: boolean;
}

function sizeStr(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function estimateLocalStorageSize(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i) ?? "";
    const val = localStorage.getItem(key) ?? "";
    total += (key.length + val.length) * 2; // UTF-16
  }
  return total;
}

export default function SystemHealthPanel({
  companyId,
  hasBackend,
}: SystemHealthPanelProps) {
  const [_tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const visitors = getVisitors(companyId);
  const staff = getStaffByCompany(companyId);
  const blacklist = getBlacklist(companyId);

  const lastSync = (() => {
    const ts = localStorage.getItem(`safentry_last_sync_${companyId}`);
    if (!ts) return null;
    try {
      return new Date(Number(ts));
    } catch {
      return null;
    }
  })();

  const lsSize = estimateLocalStorageSize();
  const lsKeys = localStorage.length;

  const downloadReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      companyId,
      backend: hasBackend ? "online" : "offline",
      lastSync: lastSync?.toISOString() ?? null,
      counts: {
        visitors: visitors.length,
        activeVisitors: visitors.filter((v) => v.status === "active").length,
        staff: staff.length,
        blacklist: blacklist.length,
      },
      storage: {
        estimatedBytes: lsSize,
        estimatedStr: sizeStr(lsSize),
        totalKeys: lsKeys,
      },
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `safentry-health-${companyId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" data-ocid="system_health.panel">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg">⚙️ Sistem Sağlığı</h2>
        <button
          type="button"
          data-ocid="system_health.download_button"
          onClick={downloadReport}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2"
          style={{
            background: "rgba(14,165,233,0.2)",
            border: "1px solid rgba(14,165,233,0.4)",
          }}
        >
          📥 Rapor İndir
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Backend status */}
        <StatusCard
          title="Backend Bağlantısı"
          icon={hasBackend ? "🟢" : "🔴"}
          value={hasBackend ? "Çevrimiçi" : "Çevrimdışı"}
          detail="Internet Computer Canister"
          color={hasBackend ? "#22c55e" : "#ef4444"}
        />

        {/* Last sync */}
        <StatusCard
          title="Son Senkronizasyon"
          icon="🔄"
          value={
            lastSync
              ? lastSync.toLocaleString("tr-TR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Henüz yok"
          }
          detail="LocalStorage ↔ Backend"
          color="#0ea5e9"
        />

        {/* Visitor count */}
        <StatusCard
          title="Ziyaretçi Kayıtları"
          icon="👥"
          value={`${visitors.length} toplam`}
          detail={`${visitors.filter((v) => v.status === "active").length} aktif şu an`}
          color="#f59e0b"
        />

        {/* Staff count */}
        <StatusCard
          title="Personel"
          icon="👤"
          value={`${staff.length} kayıtlı`}
          detail="Aktif personel sayısı"
          color="#a855f7"
        />

        {/* Blacklist */}
        <StatusCard
          title="Kara Liste"
          icon="🚫"
          value={`${blacklist.length} kayıt`}
          detail="Engellenen kişi sayısı"
          color="#ef4444"
        />

        {/* Storage usage */}
        <StatusCard
          title="Depolama Kullanımı"
          icon="💾"
          value={sizeStr(lsSize)}
          detail={`${lsKeys} anahtar, ~${Math.round(lsSize / 5120)}% dolu`}
          color={
            lsSize > 4 * 1024 * 1024
              ? "#ef4444"
              : lsSize > 2 * 1024 * 1024
                ? "#f59e0b"
                : "#22c55e"
          }
        />
      </div>

      {/* Data warnings */}
      {lsSize > 3 * 1024 * 1024 && (
        <div
          className="p-4 rounded-xl flex items-start gap-3"
          data-ocid="system_health.warning_state"
          style={{
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.3)",
          }}
        >
          <span className="text-xl shrink-0">⚠️</span>
          <div>
            <div className="text-amber-300 font-semibold text-sm">
              Depolama Uyarısı
            </div>
            <div className="text-amber-200/70 text-xs mt-1">
              LocalStorage kullanımı {sizeStr(lsSize)} seviyesine ulaştı. Eski
              verileri Arşiv sekmesinden temizlemeniz önerilir.
            </div>
          </div>
        </div>
      )}

      {!hasBackend && (
        <div
          className="p-4 rounded-xl flex items-start gap-3"
          data-ocid="system_health.error_state"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
          }}
        >
          <span className="text-xl shrink-0">🔴</span>
          <div>
            <div className="text-red-300 font-semibold text-sm">
              Backend Bağlantısı Yok
            </div>
            <div className="text-red-200/70 text-xs mt-1">
              Veriler sadece bu tarayıcıda saklanıyor. Diğer cihazlardan erişim
              için backend bağlantısı gereklidir.
            </div>
          </div>
        </div>
      )}

      <div className="text-center">
        <span className="text-slate-600 text-xs">
          Son güncelleme: {new Date().toLocaleTimeString("tr-TR")} · Otomatik
          yenileme: 30 saniye
        </span>
      </div>
    </div>
  );
}

function StatusCard({
  title,
  icon,
  value,
  detail,
  color,
}: {
  title: string;
  icon: string;
  value: string;
  detail: string;
  color: string;
}) {
  return (
    <div
      className="p-5 rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="text-xl font-bold mb-1" style={{ color }}>
        {value}
      </div>
      <div className="text-slate-500 text-xs">{detail}</div>
    </div>
  );
}
