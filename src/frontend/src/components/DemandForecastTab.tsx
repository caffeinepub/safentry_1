import React, { useMemo } from "react";

import type { Visitor } from "../types";

function getDayName(dayIndex: number): string {
  return [
    "Pazar",
    "Pazartesi",
    "Salı",
    "Çarşamba",
    "Perşembe",
    "Cuma",
    "Cumartesi",
  ][dayIndex];
}

function getHourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export default function DemandForecastTab({
  visitors,
}: { companyId?: string; visitors: Visitor[] }) {
  const analysis = useMemo(() => {
    const dayCount: number[] = Array(7).fill(0);
    const hourCount: number[] = Array(24).fill(0);
    const dayHour: number[][] = Array.from({ length: 7 }, () =>
      Array(24).fill(0),
    );

    for (const v of visitors) {
      const ts = v.arrivalTime || v.createdAt;
      if (!ts) continue;
      const d = new Date(typeof ts === "number" ? ts : Number(ts));
      if (Number.isNaN(d.getTime())) continue;
      const day = d.getDay();
      const hour = d.getHours();
      dayCount[day]++;
      hourCount[hour]++;
    }

    // Find busiest day
    const busiestDay = dayCount.indexOf(Math.max(...dayCount));
    // Find busiest hour
    const busiestHour = hourCount.indexOf(Math.max(...hourCount));
    // Find quietest day
    const quietestDay = dayCount.indexOf(
      Math.min(...dayCount.filter((v) => v > 0)),
    );

    // Staff recommendation: 1 staff per 8 avg visitors per hour
    const totalVisitors = visitors.length;
    const avgPerHour = totalVisitors > 0 ? totalVisitors / Math.max(1, 8) : 0;

    return {
      dayCount,
      hourCount,
      dayHour,
      busiestDay,
      busiestHour,
      quietestDay,
      avgPerHour,
      totalVisitors,
    };
  }, [visitors]);

  const maxDay = Math.max(...analysis.dayCount, 1);
  const maxHour = Math.max(...analysis.hourCount, 1);

  // Generate next 7 days forecast
  const forecast = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dayOfWeek = d.getDay();
      const expected =
        analysis.dayCount[dayOfWeek] > 0
          ? Math.round(
              analysis.dayCount[dayOfWeek] /
                Math.max(1, Math.ceil(analysis.totalVisitors / 52)),
            )
          : Math.round(analysis.totalVisitors / 7);
      const staffNeeded = Math.max(1, Math.ceil(expected / 8));
      const label =
        i === 0
          ? "Bugün"
          : i === 1
            ? "Yarın"
            : d.toLocaleDateString("tr-TR", {
                weekday: "short",
                day: "numeric",
                month: "short",
              });
      return { label, dayOfWeek, expected, staffNeeded };
    });
  }, [analysis]);

  const peakHours = analysis.hourCount
    .map((c, h) => ({ h, c }))
    .filter((x) => x.c > 0)
    .sort((a, b) => b.c - a.c)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">
          📊 Yoğunluk Tahmini & Personel Önerisi
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Geçmiş ziyaret verilerine göre gelecek 7 gün için beklenen yoğunluk ve
          personel ihtiyacı.
        </p>
      </div>

      {analysis.totalVisitors < 5 ? (
        <div
          className="p-6 rounded-2xl text-center"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="text-4xl mb-3">📈</div>
          <p className="text-slate-400">
            Tahmin yapabilmek için daha fazla ziyaret verisine ihtiyaç var.
          </p>
          <p className="text-slate-500 text-sm mt-1">
            En az 5 ziyaret kaydedildikten sonra analiz görünecek.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              className="p-4 rounded-2xl text-center"
              style={{
                background: "rgba(14,165,233,0.1)",
                border: "1px solid rgba(14,165,233,0.2)",
              }}
            >
              <div className="text-2xl font-bold text-sky-400">
                {getDayName(analysis.busiestDay)}
              </div>
              <div className="text-slate-400 text-xs mt-1">En Yoğun Gün</div>
            </div>
            <div
              className="p-4 rounded-2xl text-center"
              style={{
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.2)",
              }}
            >
              <div className="text-2xl font-bold text-amber-400">
                {getHourLabel(analysis.busiestHour)}
              </div>
              <div className="text-slate-400 text-xs mt-1">En Yoğun Saat</div>
            </div>
            <div
              className="p-4 rounded-2xl text-center"
              style={{
                background: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.2)",
              }}
            >
              <div className="text-2xl font-bold text-indigo-400">
                {getDayName(analysis.quietestDay)}
              </div>
              <div className="text-slate-400 text-xs mt-1">En Sakin Gün</div>
            </div>
            <div
              className="p-4 rounded-2xl text-center"
              style={{
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >
              <div className="text-2xl font-bold text-green-400">
                {analysis.totalVisitors}
              </div>
              <div className="text-slate-400 text-xs mt-1">Toplam Ziyaret</div>
            </div>
          </div>

          {/* 7-day forecast */}
          <div
            className="p-5 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <h3 className="text-white font-semibold mb-4">
              📅 Gelecek 7 Gün Tahmini
            </h3>
            <div className="space-y-3">
              {forecast.map((day) => (
                <div key={day.label} className="flex items-center gap-3">
                  <div className="text-slate-300 text-sm w-32">{day.label}</div>
                  <div
                    className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (day.expected / Math.max(...forecast.map((f) => f.expected), 1)) * 100)}%`,
                        background:
                          day.label === "Bugün"
                            ? "linear-gradient(90deg, #0ea5e9, #6366f1)"
                            : "rgba(14,165,233,0.5)",
                      }}
                    />
                  </div>
                  <div className="text-sky-400 text-sm font-semibold w-16 text-right">
                    ~{day.expected} kişi
                  </div>
                  <div className="text-slate-400 text-sm w-24 text-right">
                    👷 {day.staffNeeded} personel
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Day of week distribution */}
          <div
            className="p-5 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <h3 className="text-white font-semibold mb-4">
              📆 Günlük Dağılım (geçmiş veri)
            </h3>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => (
                <div key={dayIdx} className="flex items-center gap-3">
                  <div className="text-slate-300 text-sm w-20">
                    {getDayName(dayIdx)}
                  </div>
                  <div
                    className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(analysis.dayCount[dayIdx] / maxDay) * 100}%`,
                        background: "linear-gradient(90deg, #0ea5e9, #6366f1)",
                      }}
                    />
                  </div>
                  <div className="text-slate-400 text-sm w-10 text-right">
                    {analysis.dayCount[dayIdx]}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Peak hours */}
          <div
            className="p-5 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <h3 className="text-white font-semibold mb-4">
              ⏰ En Yoğun 5 Saat
            </h3>
            <div className="space-y-2">
              {peakHours.map(({ h, c }) => (
                <div key={h} className="flex items-center gap-3">
                  <div className="text-slate-300 text-sm w-16">
                    {getHourLabel(h)}
                  </div>
                  <div
                    className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(c / maxHour) * 100}%`,
                        background: "linear-gradient(90deg, #f59e0b, #ef4444)",
                      }}
                    />
                  </div>
                  <div className="text-amber-400 text-sm w-10 text-right">
                    {c}
                  </div>
                  <div className="text-slate-500 text-xs w-20 text-right">
                    {Math.max(1, Math.ceil(c / 8))} personel önerisi
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
