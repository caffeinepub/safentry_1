import { getAppointments, getVisitors } from "../store";
import type { Visitor } from "../types";

export default function ConversionAnalysisTab({
  companyId,
}: { companyId: string }) {
  const visitors = getVisitors(companyId);
  const appointments = getAppointments(companyId);

  const now = Date.now();
  const last30 = now - 30 * 24 * 60 * 60 * 1000;
  const recentVisitors = visitors.filter((v) => v.arrivalTime >= last30);
  const recentAppts = appointments.filter(
    (a: any) => new Date(a.date).getTime() >= last30,
  );

  // Appointment → actual visit conversion
  const apptTotal = recentAppts.length;
  const apptArrived = recentAppts.filter((a: any) =>
    recentVisitors.some(
      (v) =>
        v.name?.toLowerCase() === a.visitorName?.toLowerCase() &&
        Math.abs(new Date(a.date).getTime() - v.arrivalTime) <
          24 * 60 * 60 * 1000,
    ),
  ).length;
  const apptNoShow = recentAppts.filter((a: any) => a.noShow === true).length;
  const apptConvRate =
    apptTotal > 0 ? Math.round((apptArrived / apptTotal) * 100) : 0;

  // Pre-registration conversion
  const preRegStarted = recentVisitors.filter(
    (v) => v.registeredBy === "self-prereg",
  ).length;
  const _preRegCompleted = preRegStarted; // simplified: all preReg that arrived = completed

  // Kiosk vs direct entry
  const kioskEntries = recentVisitors.filter(
    (v) => v.registeredBy === "kiosk",
  ).length;
  const directEntries = recentVisitors.filter(
    (v) => v.registeredBy !== "kiosk",
  ).length;

  // Category breakdown
  const catCounts: Record<string, number> = {};
  for (const v of recentVisitors) {
    const c = v.category || "Diğer";
    catCounts[c] = (catCounts[c] || 0) + 1;
  }
  const catEntries = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxCat = catEntries[0]?.[1] || 1;

  // Daily trend
  const dailyCounts: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const count = recentVisitors.filter((v) => {
      const vd = new Date(v.arrivalTime);
      return vd.getDate() === d.getDate() && vd.getMonth() === d.getMonth();
    }).length;
    dailyCounts.push({
      label: d.toLocaleDateString("tr-TR", {
        weekday: "short",
        day: "numeric",
      }),
      count,
    });
  }
  const maxDay = Math.max(...dailyCounts.map((d) => d.count), 1);

  // Satisfaction avg
  const rated = recentVisitors.filter((v) => v.rating && v.rating > 0);
  const avgSatisfaction =
    rated.length > 0
      ? (rated.reduce((s, v) => s + (v.rating || 0), 0) / rated.length).toFixed(
          1,
        )
      : "—";

  // No-show rate
  const noShowRate =
    apptTotal > 0 ? Math.round((apptNoShow / apptTotal) * 100) : 0;

  const StatCard = ({
    label,
    value,
    sub,
    color,
  }: {
    label: string;
    value: string | number;
    sub?: string;
    color?: string;
  }) => (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className="font-bold text-2xl" style={{ color: color || "#0ea5e9" }}>
        {value}
      </p>
      {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-white font-semibold text-lg">
        📊 Ziyaretçi Yolculuk Dönüşüm Analizi
      </h2>
      <p className="text-slate-400 text-sm -mt-2">Son 30 günlük veriler</p>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Toplam Ziyaret"
          value={recentVisitors.length}
          sub="son 30 gün"
        />
        <StatCard
          label="Randevu Dönüşümü"
          value={`${apptConvRate}%`}
          sub={`${apptArrived}/${apptTotal} randevu`}
          color="#10b981"
        />
        <StatCard
          label="No-Show Oranı"
          value={`${noShowRate}%`}
          sub={`${apptNoShow} randevu`}
          color={noShowRate > 20 ? "#ef4444" : "#f59e0b"}
        />
        <StatCard
          label="Ort. Memnuniyet"
          value={avgSatisfaction}
          sub={`${rated.length} değerlendirme`}
          color="#a78bfa"
        />
      </div>

      {/* Appointment funnel */}
      <div
        className="rounded-xl p-5"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <p className="text-white font-semibold mb-4">🎯 Randevu Hunisi</p>
        <div className="space-y-3">
          {[
            {
              label: "Oluşturulan Randevu",
              value: apptTotal,
              color: "#0ea5e9",
              pct: 100,
            },
            {
              label: "Gelen Ziyaretçi",
              value: apptArrived,
              color: "#10b981",
              pct:
                apptTotal > 0 ? Math.round((apptArrived / apptTotal) * 100) : 0,
            },
            {
              label: "No-Show",
              value: apptNoShow,
              color: "#ef4444",
              pct:
                apptTotal > 0 ? Math.round((apptNoShow / apptTotal) * 100) : 0,
            },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">{item.label}</span>
                <span className="font-semibold" style={{ color: item.color }}>
                  {item.value} ({item.pct}%)
                </span>
              </div>
              <div
                className="rounded-full overflow-hidden"
                style={{ height: 8, background: "rgba(255,255,255,0.07)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${item.pct}%`, background: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Entry method breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className="rounded-xl p-5"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <p className="text-white font-semibold mb-4">🚪 Giriş Yöntemi</p>
          <div className="space-y-2">
            {[
              { label: "Kiosk", value: kioskEntries, color: "#0d9488" },
              {
                label: "Doğrudan (Personel)",
                value: directEntries,
                color: "#8b5cf6",
              },
              { label: "Ön Kayıtlı", value: preRegStarted, color: "#f59e0b" },
            ].map((item) => {
              const pct =
                recentVisitors.length > 0
                  ? Math.round((item.value / recentVisitors.length) * 100)
                  : 0;
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">{item.label}</span>
                    <span style={{ color: item.color }}>
                      {item.value} ({pct}%)
                    </span>
                  </div>
                  <div
                    className="rounded-full"
                    style={{ height: 6, background: "rgba(255,255,255,0.07)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: item.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="rounded-xl p-5"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <p className="text-white font-semibold mb-4">📂 Kategori Dağılımı</p>
          <div className="space-y-2">
            {catEntries.length > 0 ? (
              catEntries.map(([cat, count]) => (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">{cat}</span>
                    <span className="text-teal-400">{count}</span>
                  </div>
                  <div
                    className="rounded-full"
                    style={{ height: 6, background: "rgba(255,255,255,0.07)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((count / maxCat) * 100)}%`,
                        background: "#0d9488",
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-sm">Veri yok</p>
            )}
          </div>
        </div>
      </div>

      {/* 7-day trend */}
      <div
        className="rounded-xl p-5"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <p className="text-white font-semibold mb-4">📅 Son 7 Gün Trendi</p>
        <div className="flex items-end gap-2" style={{ height: 80 }}>
          {dailyCounts.map((d) => (
            <div
              key={d.label}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <span className="text-xs text-teal-400">
                {d.count > 0 ? d.count : ""}
              </span>
              <div
                className="w-full rounded-t-sm transition-all"
                style={{
                  height: `${Math.round((d.count / maxDay) * 56) + 4}px`,
                  background:
                    d.count > 0
                      ? "linear-gradient(180deg,#0d9488,#0891b2)"
                      : "rgba(255,255,255,0.07)",
                }}
              />
              <span className="text-xs text-slate-500 text-center leading-none">
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
