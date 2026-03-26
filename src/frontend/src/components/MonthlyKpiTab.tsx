import React, { useMemo, useRef, useState } from "react";
import type { Staff, Visitor } from "../types";

interface Props {
  visitors: Visitor[];
  staffList: Staff[];
  companyId: string;
}

function getLast6Months() {
  const months: { label: string; year: number; month: number }[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleString("tr-TR", { year: "numeric", month: "long" }),
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }
  return months;
}

export default function MonthlyKpiTab({ visitors, staffList }: Props) {
  const months = useMemo(() => getLast6Months(), []);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const printRef = useRef<HTMLDivElement>(null);

  const { year, month } = months[selectedIdx];

  const monthVisitors = useMemo(
    () =>
      visitors.filter((v) => {
        if (v.isDraft) return false;
        const d = new Date(v.arrivalTime);
        return d.getFullYear() === year && d.getMonth() === month;
      }),
    [visitors, year, month],
  );

  const staffKpi = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        count: number;
        totalDuration: number;
        satisfaction: number[];
        punchHours: number;
      }
    >();

    for (const s of staffList) {
      map.set(s.staffId, {
        name: s.name,
        count: 0,
        totalDuration: 0,
        satisfaction: [],
        punchHours: 0,
      });
    }

    for (const v of monthVisitors) {
      const entry = v.hostStaffId ? map.get(v.hostStaffId) : null;
      if (entry) {
        entry.count++;
        if (v.departureTime && v.arrivalTime) {
          entry.totalDuration += v.departureTime - v.arrivalTime;
        }
        if (v.rating) entry.satisfaction.push(v.rating);
      }
    }

    // Load punch-in hours from localStorage
    const punchKey = `safentry_punch_${staffList[0]?.companyId ?? ""}`;
    try {
      const punches = JSON.parse(
        localStorage.getItem(punchKey) || "[]",
      ) as Array<{
        staffId: string;
        start: number;
        end?: number;
      }>;
      for (const p of punches) {
        if (!p.end) continue;
        const d = new Date(p.start);
        if (d.getFullYear() === year && d.getMonth() === month) {
          const entry = map.get(p.staffId);
          if (entry) entry.punchHours += (p.end - p.start) / 3600000;
        }
      }
    } catch {
      // ignore
    }

    const avgCount =
      [...map.values()].reduce((a, b) => a + b.count, 0) /
      Math.max(1, map.size);

    return [...map.entries()]
      .map(([id, d]) => ({
        id,
        name: d.name,
        count: d.count,
        avgDuration:
          d.count > 0 ? Math.round(d.totalDuration / d.count / 60000) : 0,
        satisfaction:
          d.satisfaction.length > 0
            ? +(
                d.satisfaction.reduce((a, b) => a + b, 0) /
                d.satisfaction.length
              ).toFixed(1)
            : null,
        punchHours: +d.punchHours.toFixed(1),
        performance:
          d.count === 0
            ? "inactive"
            : d.count >= avgCount * 1.2
              ? "green"
              : d.count >= avgCount * 0.7
                ? "yellow"
                : "red",
      }))
      .sort((a, b) => b.count - a.count);
  }, [monthVisitors, staffList, year, month]);

  const perfColor = (p: string) => {
    if (p === "green") return { color: "#4ade80", label: "İyi" };
    if (p === "yellow") return { color: "#f59e0b", label: "Orta" };
    if (p === "red") return { color: "#f87171", label: "Düşük" };
    return { color: "#64748b", label: "—" };
  };

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head><title>Aylık KPI — ${months[selectedIdx].label}</title>
      <style>
        body { font-family: sans-serif; padding: 24px; color: #111; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
        th { background: #f1f5f9; font-weight: 600; }
        h2 { margin-bottom: 4px; }
        .good { color: green; } .mid { color: #b45309; } .low { color: red; } .na { color: #888; }
      </style></head><body>
      ${el.innerHTML}
      </body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-white font-bold text-xl">📊 Aylık KPI Raporu</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            data-ocid="monthly_kpi.month.select"
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
            className="px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            {months.map((m) => (
              <option key={m.label} value={months.indexOf(m)}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            data-ocid="monthly_kpi.print_button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{
              background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
            }}
          >
            🖨️ PDF İndir / Yazdır
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Toplam Ziyaretçi",
            value: monthVisitors.length,
            color: "#0ea5e9",
          },
          {
            label: "Aktif Personel",
            value: staffKpi.filter((s) => s.count > 0).length,
            color: "#14b8a6",
          },
          {
            label: "Ortalama/Personel",
            value:
              staffKpi.length > 0
                ? +(monthVisitors.length / staffKpi.length).toFixed(1)
                : 0,
            color: "#a78bfa",
          },
          {
            label: "Ort. Memnuniyet",
            value: (() => {
              const all = staffKpi
                .map((s) => s.satisfaction)
                .filter((x) => x !== null) as number[];
              return all.length > 0
                ? (all.reduce((a, b) => a + b, 0) / all.length).toFixed(1)
                : "—";
            })(),
            color: "#f59e0b",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="p-4 rounded-xl"
            style={{
              background: `${card.color}15`,
              border: `1px solid ${card.color}30`,
            }}
          >
            <p className="text-slate-400 text-xs mb-1">{card.label}</p>
            <p className="text-2xl font-bold" style={{ color: card.color }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Printable table */}
      <div
        ref={printRef}
        className="overflow-x-auto rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="p-4 pb-0 print-only">
          <h2 style={{ fontWeight: "bold", fontSize: "18px" }}>
            Aylık Personel KPI — {months[selectedIdx].label}
          </h2>
          <p style={{ color: "#666", fontSize: "12px", marginBottom: "8px" }}>
            Oluşturulma: {new Date().toLocaleString("tr-TR")}
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {[
                "Personel Adı",
                "Karşılanan Ziyaretçi",
                "Ort. İşlem Süresi",
                "Memnuniyet Puanı",
                "Mesai Saati",
                "Performans",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-slate-400 font-medium"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staffKpi.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  Bu ay için veri bulunamadı
                </td>
              </tr>
            ) : (
              staffKpi.map((row, i) => {
                const perf = perfColor(row.performance);
                return (
                  <tr
                    key={row.id}
                    data-ocid={`monthly_kpi.row.${i + 1}`}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <td className="px-4 py-3 text-white font-medium">
                      {row.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="font-bold text-base"
                        style={{ color: "#0ea5e9" }}
                      >
                        {row.count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {row.avgDuration > 0 ? `${row.avgDuration} dk` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {row.satisfaction !== null ? (
                        <span style={{ color: "#f59e0b" }}>
                          ★ {row.satisfaction}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {row.punchHours > 0 ? `${row.punchHours} sa` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          background: `${perf.color}20`,
                          color: perf.color,
                          border: `1px solid ${perf.color}40`,
                        }}
                      >
                        {perf.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
