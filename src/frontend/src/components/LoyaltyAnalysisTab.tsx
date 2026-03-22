import React, { useMemo, useState } from "react";

interface Visitor {
  visitorId: string;
  name: string;
  idNumber: string;
  arrivalTime: number;
  departureTime?: number;
  status: string;
}

interface Props {
  visitors: Visitor[];
}

export default function LoyaltyAnalysisTab({ visitors }: Props) {
  const [loyalThreshold, setLoyalThreshold] = useState(3);

  const analysis = useMemo(() => {
    // Group by TC number
    const groups: Record<string, Visitor[]> = {};
    for (const v of visitors) {
      if (!groups[v.idNumber]) groups[v.idNumber] = [];
      groups[v.idNumber].push(v);
    }

    // Build per-person stats
    const persons = Object.entries(groups).map(([idNumber, visits]) => {
      const sorted = [...visits].sort((a, b) => a.arrivalTime - b.arrivalTime);
      let avgInterval = 0;
      if (sorted.length > 1) {
        let totalGap = 0;
        for (let i = 1; i < sorted.length; i++) {
          totalGap +=
            (sorted[i].arrivalTime - sorted[i - 1].arrivalTime) /
            (1000 * 60 * 60 * 24);
        }
        avgInterval = totalGap / (sorted.length - 1);
      }
      return {
        idNumber,
        name: sorted[sorted.length - 1].name,
        visitCount: visits.length,
        lastVisit: Math.max(...visits.map((v) => v.arrivalTime)),
        avgInterval: Math.round(avgInterval),
      };
    });

    const top10 = [...persons]
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 10);
    const uniqueVisitors = persons.length;
    const totalVisits = visitors.length;
    const oneTimeVisitors = persons.filter((p) => p.visitCount === 1).length;
    const repeatVisitors = uniqueVisitors - oneTimeVisitors;
    const loyalVisitors = persons.filter(
      (p) => p.visitCount >= loyalThreshold,
    ).length;
    const avgIntervalAll =
      persons
        .filter((p) => p.visitCount > 1)
        .reduce((s, p) => s + p.avgInterval, 0) /
      Math.max(1, persons.filter((p) => p.visitCount > 1).length);

    return {
      top10,
      uniqueVisitors,
      totalVisits,
      oneTimeVisitors,
      repeatVisitors,
      loyalVisitors,
      avgIntervalAll: Math.round(avgIntervalAll),
    };
  }, [visitors, loyalThreshold]);

  const repeatPct =
    analysis.uniqueVisitors > 0
      ? Math.round((analysis.repeatVisitors / analysis.uniqueVisitors) * 100)
      : 0;
  const oneTimePct = 100 - repeatPct;

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-white font-bold text-base">🔄 Sadakat Analizi</h3>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs">Sadık ziyaretçi eşiği:</span>
          <input
            type="number"
            min={2}
            max={20}
            value={loyalThreshold}
            onChange={(e) => setLoyalThreshold(Number(e.target.value))}
            className="w-16 px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white text-xs text-center focus:outline-none focus:border-[#0ea5e9]"
          />
          <span className="text-slate-400 text-xs">+ ziyaret</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Benzersiz Ziyaretçi",
            value: analysis.uniqueVisitors,
            icon: "👤",
            color: "#0ea5e9",
          },
          {
            label: "Toplam Ziyaret",
            value: analysis.totalVisits,
            icon: "📊",
            color: "#22c55e",
          },
          {
            label: "Tekrar Gelen",
            value: analysis.repeatVisitors,
            icon: "🔄",
            color: "#f59e0b",
          },
          {
            label: "Sadık Ziyaretçi",
            value: analysis.loyalVisitors,
            icon: "⭐",
            color: "#a855f7",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 rounded-xl text-center"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="text-slate-400 text-xs mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Avg interval */}
      {analysis.avgIntervalAll > 0 && (
        <div
          className="p-4 rounded-xl flex items-center gap-4"
          style={{
            background: "rgba(14,165,233,0.06)",
            border: "1px solid rgba(14,165,233,0.2)",
          }}
        >
          <span className="text-3xl">📅</span>
          <div>
            <p className="text-white font-semibold">Ortalama Ziyaret Aralığı</p>
            <p className="text-[#7dd3fc] text-2xl font-bold">
              {analysis.avgIntervalAll} gün
            </p>
            <p className="text-slate-400 text-xs">
              Tekrar gelen ziyaretçiler için
            </p>
          </div>
        </div>
      )}

      {/* Tek seferlik vs tekrar — CSS bar chart */}
      <div
        className="p-5 rounded-xl"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <p className="text-slate-300 text-sm font-semibold mb-4">
          Tek Seferlik vs Tekrar Ziyaretçiler
        </p>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-300 text-xs">Tek Seferlik</span>
              <span className="text-slate-400 text-xs">
                {analysis.oneTimeVisitors} kişi ({oneTimePct}%)
              </span>
            </div>
            <div
              className="h-5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${oneTimePct}%`,
                  background: "linear-gradient(90deg,#94a3b8,#64748b)",
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-300 text-xs">Tekrar Gelenler</span>
              <span className="text-slate-400 text-xs">
                {analysis.repeatVisitors} kişi ({repeatPct}%)
              </span>
            </div>
            <div
              className="h-5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${repeatPct}%`,
                  background: "linear-gradient(90deg,#0ea5e9,#22d3ee)",
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-amber-300 text-xs">
                ⭐ Sadık Ziyaretçiler ({loyalThreshold}+ ziyaret)
              </span>
              <span className="text-slate-400 text-xs">
                {analysis.loyalVisitors} kişi (
                {analysis.uniqueVisitors > 0
                  ? Math.round(
                      (analysis.loyalVisitors / analysis.uniqueVisitors) * 100,
                    )
                  : 0}
                %)
              </span>
            </div>
            <div
              className="h-5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${analysis.uniqueVisitors > 0 ? Math.round((analysis.loyalVisitors / analysis.uniqueVisitors) * 100) : 0}%`,
                  background: "linear-gradient(90deg,#f59e0b,#fbbf24)",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Top 10 frequent visitors */}
      <div>
        <p className="text-slate-300 text-sm font-semibold mb-3">
          🏆 En Sık Gelen 10 Ziyaretçi
        </p>
        {analysis.top10.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            Yeterli veri yok
          </div>
        ) : (
          <div className="space-y-2">
            {analysis.top10.map((p, idx) => (
              <div
                key={p.idNumber}
                data-ocid={`loyalty.item.${idx + 1}`}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background:
                        idx === 0
                          ? "rgba(245,158,11,0.2)"
                          : idx === 1
                            ? "rgba(148,163,184,0.15)"
                            : idx === 2
                              ? "rgba(180,83,9,0.2)"
                              : "rgba(14,165,233,0.1)",
                      color:
                        idx === 0
                          ? "#fbbf24"
                          : idx === 1
                            ? "#94a3b8"
                            : idx === 2
                              ? "#b45309"
                              : "#7dd3fc",
                      border: `1px solid ${idx === 0 ? "rgba(245,158,11,0.4)" : idx === 1 ? "rgba(148,163,184,0.3)" : idx === 2 ? "rgba(180,83,9,0.4)" : "rgba(14,165,233,0.2)"}`,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">
                      {p.name}
                      {p.visitCount >= loyalThreshold && (
                        <span className="ml-1.5 text-amber-400 text-xs">
                          ⭐ Sadık
                        </span>
                      )}
                    </p>
                    <p className="text-slate-500 text-xs font-mono">
                      {p.idNumber}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[#0ea5e9] font-bold text-sm">
                    {p.visitCount} ziyaret
                  </p>
                  <p className="text-slate-500 text-xs">
                    {new Date(p.lastVisit).toLocaleDateString("tr-TR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
