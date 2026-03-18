import { useMemo, useState } from "react";
import type { Visitor } from "../types";

interface Props {
  visitors: Visitor[];
}

const HOURS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
  22, 23,
];

export default function VisitorHeatmap({ visitors }: Props) {
  const [hoveredCell, setHoveredCell] = useState<{
    day: number;
    hourVal: number;
    count: number;
  } | null>(null);

  const { grid, dayLabels, maxCount } = useMemo(() => {
    const now = new Date();
    const days: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }

    const g: number[][] = Array.from({ length: 7 }, () =>
      new Array(24).fill(0),
    );

    for (const v of visitors) {
      if (!v.arrivalTime) continue;
      const arrivalDate = new Date(v.arrivalTime);
      const arrivalDay = new Date(arrivalDate);
      arrivalDay.setHours(0, 0, 0, 0);
      const dayIdx = days.findIndex(
        (d) => d.getTime() === arrivalDay.getTime(),
      );
      if (dayIdx === -1) continue;
      const h = arrivalDate.getHours();
      g[dayIdx][h]++;
    }

    const maxC = Math.max(1, ...g.flat());

    const dayLbls = days.map((d) =>
      d.toLocaleDateString("tr-TR", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    );

    return { grid: g, dayLabels: dayLbls, maxCount: maxC };
  }, [visitors]);

  function cellColor(count: number): string {
    if (count === 0) return "rgba(255,255,255,0.04)";
    const ratio = count / maxCount;
    if (ratio < 0.25) return "rgba(0,212,170,0.2)";
    if (ratio < 0.5) return "rgba(0,212,170,0.45)";
    if (ratio < 0.75) return "rgba(0,212,170,0.7)";
    return "#f59e0b";
  }

  function cellBorder(count: number): string {
    if (count === 0) return "rgba(255,255,255,0.06)";
    const ratio = count / maxCount;
    if (ratio < 0.5) return "rgba(0,212,170,0.3)";
    if (ratio < 0.75) return "rgba(0,212,170,0.6)";
    return "rgba(245,158,11,0.7)";
  }

  return (
    <div data-ocid="heatmap.section" className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">
          Ziyaretci Akis Isi Haritasi
        </h3>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-sm inline-block"
              style={{ background: "rgba(0,212,170,0.2)" }}
            />
            Az
          </span>
          <span className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-sm inline-block"
              style={{ background: "rgba(0,212,170,0.7)" }}
            />
            Orta
          </span>
          <span className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-sm inline-block"
              style={{ background: "#f59e0b" }}
            />
            Yogun
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: "640px" }}>
          <div className="flex mb-1" style={{ paddingLeft: "100px" }}>
            {HOURS.map((h) => (
              <div
                key={h}
                className="text-slate-500 text-center flex-1"
                style={{ fontSize: "9px" }}
              >
                {h}:00
              </div>
            ))}
          </div>

          {dayLabels.map((dayLabel, dayIdx) => (
            <div key={dayLabel} className="flex items-center mb-1">
              <div
                className="text-slate-400 text-right pr-2 shrink-0"
                style={{ width: "100px", fontSize: "10px" }}
              >
                {dayLabel}
              </div>

              {HOURS.map((hourVal) => {
                const count = grid[dayIdx]?.[hourVal] ?? 0;
                return (
                  <div
                    key={hourVal}
                    data-ocid="heatmap.chart_point"
                    className="flex-1 rounded-sm cursor-pointer transition-all relative"
                    style={{
                      height: "28px",
                      background: cellColor(count),
                      border: `1px solid ${cellBorder(count)}`,
                      margin: "1px",
                    }}
                    onMouseEnter={() =>
                      setHoveredCell({ day: dayIdx, hourVal, count })
                    }
                    onMouseLeave={() => setHoveredCell(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {hoveredCell && (
        <div
          className="text-center py-2 px-4 rounded-xl text-sm"
          style={{
            background: "rgba(0,212,170,0.12)",
            border: "1px solid rgba(0,212,170,0.3)",
          }}
        >
          <span className="text-slate-300">
            {dayLabels[hoveredCell.day]}, {hoveredCell.hourVal}:00-
            {hoveredCell.hourVal + 1}:00
          </span>
          <span className="text-white font-bold ml-3">
            {hoveredCell.count} ziyaretci
          </span>
        </div>
      )}

      {visitors.length === 0 && (
        <div
          data-ocid="heatmap.empty_state"
          className="text-center py-8 text-slate-500 text-sm"
        >
          Henuz ziyaretci verisi yok. Ilk ziyaretcileri kaydettikce harita
          olusacak.
        </div>
      )}
    </div>
  );
}
