import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Visitor } from "../types";

interface Props {
  companyId: string;
  visitors: Visitor[];
}

const SHIFTS = [
  {
    key: "sabah",
    label: "Sabah",
    emoji: "🌅",
    minHour: 6,
    maxHour: 14,
    color: "#f59e0b",
  },
  {
    key: "ogleden",
    label: "Öğleden Sonra",
    emoji: "☀️",
    minHour: 14,
    maxHour: 22,
    color: "#0ea5e9",
  },
  {
    key: "gece",
    label: "Gece",
    emoji: "🌙",
    minHour: 22,
    maxHour: 30,
    color: "#a855f7",
  }, // 22-30 means 22-06
];

function classifyShift(ts: number): string {
  const h = new Date(ts).getHours();
  if (h >= 6 && h < 14) return "sabah";
  if (h >= 14 && h < 22) return "ogleden";
  return "gece";
}

export default function ShiftAnalysisTab({ companyId, visitors }: Props) {
  const stats = useMemo(() => {
    // Load incidents
    let incidents: { id: string; reportedAt?: number; createdAt?: number }[] =
      [];
    try {
      const raw = localStorage.getItem(`safentry_incidents_${companyId}`);
      if (raw) incidents = JSON.parse(raw);
    } catch (_) {}

    return SHIFTS.map((shift) => {
      const shiftVisitors = visitors.filter(
        (v) => classifyShift(v.arrivalTime) === shift.key,
      );
      const departed = shiftVisitors.filter((v) => v.departureTime);

      // Average wait time (estimate from duration)
      const avgWait = departed.length
        ? Math.round(
            departed.reduce(
              (a, v) => a + (v.departureTime! - v.arrivalTime) / 60000,
              0,
            ) / departed.length,
          )
        : 0;

      // Average satisfaction
      const shiftRatings = shiftVisitors
        .filter((v) => v.exitRating && v.exitRating > 0)
        .map((v) => v.exitRating as number);
      const avgRating = shiftRatings.length
        ? Number.parseFloat(
            (
              shiftRatings.reduce((a, b) => a + b, 0) / shiftRatings.length
            ).toFixed(1),
          )
        : 0;

      // Incident count by shift time
      const shiftIncidentCount = incidents.filter((inc) => {
        const ts = inc.reportedAt ?? inc.createdAt;
        if (!ts) return false;
        return classifyShift(ts) === shift.key;
      }).length;

      return {
        ...shift,
        count: shiftVisitors.length,
        avgWait,
        avgRating,
        incidents: shiftIncidentCount,
      };
    });
  }, [companyId, visitors]);

  const comparisonData = stats.map((s) => ({
    name: s.label,
    Ziyaretçi: s.count,
    "Ort. Bekleme (dk)": s.avgWait,
    Memnuniyet: s.avgRating,
    Olaylar: s.incidents,
  }));

  if (visitors.length === 0) {
    return (
      <div
        data-ocid="shiftanalysis.empty_state"
        className="text-center py-20 text-slate-500"
      >
        <div className="text-5xl mb-4">🕐</div>
        <p className="font-semibold text-slate-400">
          Vardiya analizi için veri yok
        </p>
        <p className="text-sm mt-2">
          Ziyaretçi kaydedildiğinde analiz otomatik oluşur
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-ocid="shiftanalysis.section">
      <h2 className="text-white font-bold text-lg">
        🕐 Vardiya Performans Karşılaştırması
      </h2>

      {/* Shift cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div
            key={s.key}
            className="p-5 rounded-2xl space-y-3"
            style={{
              background: `${s.color}0a`,
              border: `1px solid ${s.color}30`,
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{s.emoji}</span>
              <div>
                <div className="text-white font-semibold text-sm">
                  {s.label}
                </div>
                <div className="text-slate-500 text-xs">
                  {s.key === "sabah"
                    ? "06:00 - 14:00"
                    : s.key === "ogleden"
                      ? "14:00 - 22:00"
                      : "22:00 - 06:00"}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div
                className="p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <div className="text-xl font-bold" style={{ color: s.color }}>
                  {s.count}
                </div>
                <div className="text-slate-500 text-xs">Ziyaretçi</div>
              </div>
              <div
                className="p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <div className="text-xl font-bold text-slate-300">
                  {s.avgWait} dk
                </div>
                <div className="text-slate-500 text-xs">Ort. Bekleme</div>
              </div>
              <div
                className="p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <div className="text-xl font-bold text-amber-400">
                  {s.avgRating > 0 ? `${s.avgRating}★` : "—"}
                </div>
                <div className="text-slate-500 text-xs">Memnuniyet</div>
              </div>
              <div
                className="p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <div className="text-xl font-bold text-red-400">
                  {s.incidents}
                </div>
                <div className="text-slate-500 text-xs">Olay</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className="p-5 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h3 className="text-slate-300 font-semibold mb-4 text-sm">
            👥 Ziyaretçi Sayısı Karşılaştırması
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={comparisonData}
              margin={{ top: 5, right: 10, bottom: 5, left: -10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
              />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "#0f1729",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                }}
                itemStyle={{ color: "#fff" }}
              />
              <Bar dataKey="Ziyaretçi" radius={[6, 6, 0, 0]}>
                {stats.map((s) => (
                  <Cell key={s.key} fill={s.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div
          className="p-5 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h3 className="text-slate-300 font-semibold mb-4 text-sm">
            ⏱️ Ortalama Bekleme Süresi (dk)
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={comparisonData}
              margin={{ top: 5, right: 10, bottom: 5, left: -10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
              />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "#0f1729",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                }}
                itemStyle={{ color: "#0ea5e9" }}
              />
              <Bar dataKey="Ort. Bekleme (dk)" radius={[6, 6, 0, 0]}>
                {stats.map((s) => (
                  <Cell key={s.key} fill={s.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table summary */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.04)" }}>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">
                Vardiya
              </th>
              <th className="text-center px-4 py-3 text-slate-400 font-medium">
                Ziyaretçi
              </th>
              <th className="text-center px-4 py-3 text-slate-400 font-medium">
                Ort. Bekleme
              </th>
              <th className="text-center px-4 py-3 text-slate-400 font-medium">
                Memnuniyet
              </th>
              <th className="text-center px-4 py-3 text-slate-400 font-medium">
                Olaylar
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s, i) => (
              <tr
                key={s.key}
                style={{
                  borderTop:
                    i > 0 ? "1px solid rgba(255,255,255,0.05)" : undefined,
                }}
              >
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2">
                    <span>{s.emoji}</span>
                    <span className="font-medium" style={{ color: s.color }}>
                      {s.label}
                    </span>
                  </span>
                </td>
                <td className="text-center px-4 py-3 text-white font-semibold">
                  {s.count}
                </td>
                <td className="text-center px-4 py-3 text-slate-300">
                  {s.avgWait} dk
                </td>
                <td className="text-center px-4 py-3 text-amber-400">
                  {s.avgRating > 0 ? `${s.avgRating}★` : "—"}
                </td>
                <td className="text-center px-4 py-3">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{
                      background:
                        s.incidents > 0
                          ? "rgba(239,68,68,0.2)"
                          : "rgba(34,197,94,0.1)",
                      color: s.incidents > 0 ? "#ef4444" : "#22c55e",
                    }}
                  >
                    {s.incidents}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
