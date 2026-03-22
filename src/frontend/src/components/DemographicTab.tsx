import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Visitor } from "../types";

interface Props {
  visitors: Visitor[];
}

const COLORS = [
  "#00D4AA",
  "#0ea5e9",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
  "#22c55e",
];

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div
      className="p-4 rounded-2xl"
      style={{
        background: `${color}0d`,
        border: `1px solid ${color}30`,
      }}
    >
      <div className="text-2xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-slate-400 text-xs mt-1">{label}</div>
    </div>
  );
}

export default function DemographicTab({ visitors }: Props) {
  const hasData = visitors.length > 0;

  const hourlyData = useMemo(() => {
    const slots = [
      { label: "09-11", min: 9, max: 11, count: 0 },
      { label: "11-13", min: 11, max: 13, count: 0 },
      { label: "13-15", min: 13, max: 15, count: 0 },
      { label: "15-17", min: 15, max: 17, count: 0 },
      { label: "17+", min: 17, max: 24, count: 0 },
    ];
    for (const v of visitors) {
      const h = new Date(v.arrivalTime).getHours();
      const slot = slots.find((s) => h >= s.min && h < s.max);
      if (slot) slot.count++;
    }
    return slots;
  }, [visitors]);

  const repeatData = useMemo(() => {
    const idCounts: Record<string, number> = {};
    for (const v of visitors) {
      idCounts[v.idNumber] = (idCounts[v.idNumber] ?? 0) + 1;
    }
    const firstTime = Object.values(idCounts).filter((c) => c === 1).length;
    const repeat = Object.values(idCounts).filter((c) => c > 1).length;
    return [
      { name: "İlk Kez", value: firstTime },
      { name: "Tekrar", value: repeat },
    ];
  }, [visitors]);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of visitors) {
      const cat = v.category || "Diğer";
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [visitors]);

  const dowData = useMemo(() => {
    const labels = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
    const counts = new Array(7).fill(0);
    for (const v of visitors) {
      const dow = (new Date(v.arrivalTime).getDay() + 6) % 7;
      counts[dow]++;
    }
    return counts.map((count, i) => ({ day: labels[i], count }));
  }, [visitors]);

  const avgDuration = useMemo(() => {
    const departed = visitors.filter((v) => v.departureTime);
    if (!departed.length) return null;
    const totalMs = departed.reduce(
      (acc, v) => acc + (v.departureTime! - v.arrivalTime),
      0,
    );
    const avgMin = Math.round(totalMs / departed.length / 60000);
    return avgMin;
  }, [visitors]);

  const repeatPct = useMemo(() => {
    const total = repeatData.reduce((a, b) => a + b.value, 0);
    if (!total) return 0;
    return Math.round((repeatData[1].value / total) * 100);
  }, [repeatData]);

  if (!hasData) {
    return (
      <div
        data-ocid="demographic.empty_state"
        className="text-center py-20 text-slate-500"
      >
        <div className="text-5xl mb-4">📊</div>
        <p className="font-semibold text-slate-400">
          Demografik analiz için veri yok
        </p>
        <p className="text-sm mt-2">
          Ziyaretçi kaydedildiğinde grafikler otomatik oluşur
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-ocid="demographic.section">
      <h2 className="text-white font-bold text-lg">
        📊 Ziyaretçi Demografik Analizi
      </h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Toplam Ziyaret"
          value={visitors.length}
          color="#00D4AA"
        />
        <StatCard
          label="Tekrar Ziyaretçi"
          value={`%${repeatPct}`}
          color="#0ea5e9"
        />
        <StatCard
          label="Ort. Ziyaret Süresi"
          value={avgDuration !== null ? `${avgDuration} dk` : "—"}
          color="#f59e0b"
        />
        <StatCard
          label="Benzersiz Ziyaretçi"
          value={new Set(visitors.map((v) => v.idNumber)).size}
          color="#a855f7"
        />
      </div>

      {/* Hourly distribution */}
      <div
        className="p-5 rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <h3 className="text-slate-300 font-semibold mb-4 text-sm">
          ⏰ Ziyaret Saati Dağılımı
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={hourlyData}
            margin={{ top: 5, right: 10, bottom: 5, left: -10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
            />
            <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "#0f1729",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
              }}
              labelStyle={{ color: "#fff" }}
              itemStyle={{ color: "#00D4AA" }}
            />
            <Bar dataKey="count" fill="#00D4AA" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Repeat vs first time + Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className="p-5 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h3 className="text-slate-300 font-semibold mb-4 text-sm">
            🔄 Tekrar Ziyaret Oranı
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={repeatData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={4}
                dataKey="value"
              >
                {repeatData.map((d, index) => (
                  <Cell key={d.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#0f1729",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                }}
                itemStyle={{ color: "#fff" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {repeatData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: COLORS[i] }}
                />
                <span className="text-slate-400 text-xs">
                  {d.name}: {d.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="p-5 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h3 className="text-slate-300 font-semibold mb-4 text-sm">
            🏷️ Kategori Dağılımı
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={categoryData}
              layout="vertical"
              margin={{ top: 0, right: 10, bottom: 0, left: 30 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
              />
              <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                width={55}
              />
              <Tooltip
                contentStyle={{
                  background: "#0f1729",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                }}
                itemStyle={{ color: "#f59e0b" }}
              />
              <Bar dataKey="count" fill="#f59e0b" radius={[0, 6, 6, 0]}>
                {categoryData.map((d, index) => (
                  <Cell
                    key={`bar-${d.name}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Day of week */}
      <div
        className="p-5 rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <h3 className="text-slate-300 font-semibold mb-4 text-sm">
          📅 Haftalık Gün Dağılımı
        </h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart
            data={dowData}
            margin={{ top: 5, right: 10, bottom: 5, left: -10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
            />
            <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "#0f1729",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
              }}
              itemStyle={{ color: "#a855f7" }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {dowData.map((d) => (
                <Cell
                  key={d.day}
                  fill={
                    d.count === Math.max(...dowData.map((x) => x.count))
                      ? "#a855f7"
                      : "rgba(168,85,247,0.4)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
