import React, { useMemo } from "react";
import { getBranches } from "../store";
import type { Staff, Visitor } from "../types";

interface Props {
  companyId: string;
  visitors: Visitor[];
  staffList: Staff[];
}

export default function ConsolidatedReportTab({
  companyId,
  visitors,
  staffList: _staffList,
}: Props) {
  const branches = useMemo(() => getBranches(companyId), [companyId]);

  const branchStats = useMemo(() => {
    return branches.map((branch) => {
      const bVisitors = visitors.filter(
        (v) =>
          (v.customFieldValues?.branch ?? "") === branch.name ||
          (v.customFieldValues?.branch ?? "") === branch.id,
      );
      const departed = bVisitors.filter((v) => v.departureTime);
      const avgSat =
        bVisitors
          .filter((v) => v.exitRating !== undefined)
          .reduce((s, v) => s + (v.exitRating ?? 0), 0) /
        (bVisitors.filter((v) => v.exitRating !== undefined).length || 1);
      const slaThreshold = 10 * 60 * 1000;
      const slaOk = departed.filter(
        (v) => v.departureTime! - v.arrivalTime <= slaThreshold,
      ).length;
      const slaCompliance =
        departed.length > 0 ? Math.round((slaOk / departed.length) * 100) : 100;
      const incidents = bVisitors.filter(
        (v) => v.label === "attention" || v.label === "restricted",
      ).length;
      return {
        branch,
        total: bVisitors.length,
        avgSat,
        slaCompliance,
        incidents,
      };
    });
  }, [branches, visitors]);

  const totalVisitors = visitors.length;
  const allDeparted = visitors.filter((v) => v.departureTime);
  const overallAvgSat =
    visitors
      .filter((v) => v.exitRating !== undefined)
      .reduce((s, v) => s + (v.exitRating ?? 0), 0) /
    (visitors.filter((v) => v.exitRating !== undefined).length || 1);

  const cardStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
  };

  const maxCount = Math.max(1, ...branchStats.map((b) => b.total));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white font-bold text-xl">
          🏢 Konsolide Şube Raporu
        </h2>
        <p className="text-slate-400 text-sm mt-0.5">
          Tüm şubelerin karşılaştırmalı analizi
        </p>
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Toplam Ziyaretçi", value: totalVisitors, color: "#0ea5e9" },
          { label: "Şube Sayısı", value: branches.length, color: "#22c55e" },
          {
            label: "Ort. Memnuniyet",
            value:
              overallAvgSat > 0 ? `${overallAvgSat.toFixed(1)} / 5` : "N/A",
            color: "#f59e0b",
          },
          {
            label: "Toplam Çıkış",
            value: allDeparted.length,
            color: "#a855f7",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="p-4 rounded-xl text-center"
            style={cardStyle}
          >
            <div className="text-2xl font-bold" style={{ color: s.color }}>
              {String(s.value)}
            </div>
            <div className="text-xs text-slate-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {branches.length < 2 ? (
        <div className="p-6 rounded-xl text-center" style={cardStyle}>
          <div className="text-3xl mb-2">🏢</div>
          <p className="text-slate-300 font-medium">
            Bu özellik çok şubeli şirketler içindir
          </p>
          <p className="text-slate-500 text-sm mt-1">
            Şubeler sekmesinden en az 2 şube tanımlayın
          </p>
        </div>
      ) : (
        <>
          <div className="p-4 rounded-xl" style={cardStyle}>
            <h3 className="text-white font-semibold mb-4">
              Şube Karşılaştırma Tablosu
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-white/10">
                    {[
                      "Şube",
                      "Ziyaretçi",
                      "Ort. Memnuniyet",
                      "SLA Uyum %",
                      "Dikkat",
                    ].map((h) => (
                      <th key={h} className="text-left py-2 pr-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {branchStats.map((b, i) => (
                    <tr
                      key={b.branch.id}
                      data-ocid={`konsoliderapor.row.${i + 1}`}
                      className="border-b border-white/5"
                    >
                      <td className="py-2 pr-4 text-white font-medium">
                        {b.branch.name}
                      </td>
                      <td className="py-2 pr-4 text-slate-300">{b.total}</td>
                      <td className="py-2 pr-4">
                        <span
                          style={{
                            color:
                              b.avgSat >= 4
                                ? "#22c55e"
                                : b.avgSat >= 3
                                  ? "#f59e0b"
                                  : "#ef4444",
                          }}
                        >
                          {b.avgSat > 0 ? b.avgSat.toFixed(1) : "N/A"}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          style={{
                            color:
                              b.slaCompliance >= 80
                                ? "#22c55e"
                                : b.slaCompliance >= 60
                                  ? "#f59e0b"
                                  : "#ef4444",
                          }}
                        >
                          %{b.slaCompliance}
                        </span>
                      </td>
                      <td className="py-2 text-red-400">
                        {b.incidents > 0 ? `⚠ ${b.incidents}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 rounded-xl" style={cardStyle}>
            <h3 className="text-white font-semibold mb-4">
              Ziyaretçi Dağılımı
            </h3>
            <div className="space-y-3">
              {branchStats.map((b) => (
                <div key={b.branch.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{b.branch.name}</span>
                    <span className="text-slate-400">{b.total} ziyaretçi</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(b.total / maxCount) * 100}%`,
                        background: "linear-gradient(90deg,#0ea5e9,#22c55e)",
                      }}
                    />
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
