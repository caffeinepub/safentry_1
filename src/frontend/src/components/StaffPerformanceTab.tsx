import { Award, Star, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { getPatrols } from "../store";
import type { Staff, Visitor } from "../types";

interface Props {
  companyId: string;
  staffList: Staff[];
  visitors: Visitor[];
}

type SortKey = "name" | "visitors" | "satisfaction" | "noshow" | "patrols";

export default function StaffPerformanceTab({
  companyId,
  staffList,
  visitors,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("visitors");
  const [sortAsc, setSortAsc] = useState(false);

  const patrols = useMemo(() => getPatrols(companyId), [companyId]);

  const data = useMemo(() => {
    return staffList.map((s) => {
      const hosted = visitors.filter(
        (v) => v.hostStaffId === s.staffId || v.registeredBy === s.staffId,
      );
      const rated = hosted.filter((v) => v.exitRating && v.exitRating > 0);
      const avgSat =
        rated.length > 0
          ? rated.reduce((acc, v) => acc + (v.exitRating ?? 0), 0) /
            rated.length
          : null;
      const noShows = visitors.filter(
        (v) =>
          (v.hostStaffId === s.staffId || v.registeredBy === s.staffId) &&
          (v as any).noShow,
      ).length;
      const patrolCount = patrols.filter((p) => p.staffId === s.staffId).length;

      return {
        staff: s,
        visitorsCount: hosted.length,
        avgSatisfaction: avgSat,
        noShowCount: noShows,
        patrolCount,
      };
    });
  }, [staffList, visitors, patrols]);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      let diff = 0;
      if (sortKey === "name") diff = a.staff.name.localeCompare(b.staff.name);
      else if (sortKey === "visitors") diff = a.visitorsCount - b.visitorsCount;
      else if (sortKey === "satisfaction")
        diff = (a.avgSatisfaction ?? -1) - (b.avgSatisfaction ?? -1);
      else if (sortKey === "noshow") diff = a.noShowCount - b.noShowCount;
      else if (sortKey === "patrols") diff = a.patrolCount - b.patrolCount;
      return sortAsc ? diff : -diff;
    });
  }, [data, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const maxVisitors = Math.max(...data.map((d) => d.visitorsCount), 1);

  const _colStyle =
    "px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide cursor-pointer hover:text-white transition-colors whitespace-nowrap";

  return (
    <div data-ocid="staff_performance.panel">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white font-bold text-xl">Personel Performansı</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            {staffList.length} personel • tüm zamanlarda
          </p>
        </div>
        <Award className="text-amber-400" size={28} />
      </div>

      {sorted.length === 0 ? (
        <div
          data-ocid="staff_performance.empty_state"
          className="text-center py-16 text-slate-500"
        >
          Henüz personel kaydı yok.
        </div>
      ) : (
        <>
          {/* Mini bar chart */}
          <div
            className="mb-6 p-4 rounded-2xl"
            style={{
              background: "rgba(14,165,233,0.05)",
              border: "1px solid rgba(14,165,233,0.15)",
            }}
          >
            <p className="text-slate-400 text-xs mb-3 uppercase tracking-wide font-semibold">
              Ziyaretçi Dağılımı
            </p>
            <div className="space-y-2">
              {sorted.slice(0, 8).map((d) => (
                <div key={d.staff.staffId} className="flex items-center gap-3">
                  <div className="w-28 text-sm text-slate-300 truncate shrink-0">
                    {d.staff.name.split(" ")[0]}
                  </div>
                  <div
                    className="flex-1 h-5 rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(d.visitorsCount / maxVisitors) * 100}%`,
                        background: "linear-gradient(90deg, #0ea5e9, #06b6d4)",
                        minWidth: d.visitorsCount > 0 ? 4 : 0,
                      }}
                    />
                  </div>
                  <span className="text-slate-300 text-sm font-mono w-6 text-right">
                    {d.visitorsCount}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Table */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="overflow-x-auto">
              <table data-ocid="staff_performance.table" className="w-full">
                <thead style={{ background: "rgba(255,255,255,0.03)" }}>
                  <tr>
                    {(
                      [
                        "name",
                        "visitors",
                        "satisfaction",
                        "noshow",
                        "patrols",
                      ] as SortKey[]
                    ).map((k) => (
                      <th key={k} className="px-4 py-3 text-left">
                        <button
                          type="button"
                          onClick={() => toggleSort(k)}
                          className="text-xs font-semibold text-slate-400 uppercase tracking-wide cursor-pointer hover:text-white transition-colors whitespace-nowrap"
                        >
                          {k === "name"
                            ? "Ad Soyad"
                            : k === "visitors"
                              ? "Karşılanan"
                              : k === "satisfaction"
                                ? "Ort. Memnuniyet"
                                : k === "noshow"
                                  ? "No-Show"
                                  : "Devriye"}
                          {sortKey === k ? (sortAsc ? " ↑" : " ↓") : ""}
                        </button>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide text-left">
                      Durum
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((d, idx) => {
                    const isTop = idx === 0 && d.visitorsCount > 0;
                    return (
                      <tr
                        key={d.staff.staffId}
                        data-ocid={`staff_performance.row.${idx + 1}`}
                        className="border-t border-white/5 hover:bg-white/3 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                              style={{
                                background: isTop
                                  ? "rgba(245,158,11,0.2)"
                                  : "rgba(14,165,233,0.12)",
                                color: isTop ? "#f59e0b" : "#0ea5e9",
                              }}
                            >
                              {d.staff.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-white text-sm font-medium flex items-center gap-1">
                                {d.staff.name}
                                {isTop && (
                                  <span className="text-amber-400 text-xs">
                                    🏆
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-500 text-xs">
                                {d.staff.role}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-semibold"
                            style={{
                              background: "rgba(14,165,233,0.1)",
                              color: "#0ea5e9",
                            }}
                          >
                            {d.visitorsCount}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {d.avgSatisfaction !== null ? (
                            <span className="flex items-center gap-1 text-amber-400">
                              <Star size={12} fill="currentColor" />
                              <span className="text-sm font-semibold">
                                {d.avgSatisfaction.toFixed(1)}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-600 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {d.noShowCount > 0 ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                              style={{
                                background: "rgba(239,68,68,0.1)",
                                color: "#ef4444",
                              }}
                            >
                              <TrendingDown size={10} /> {d.noShowCount}
                            </span>
                          ) : (
                            <span className="text-slate-600 text-sm">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                            style={{
                              background: "rgba(168,85,247,0.1)",
                              color: "#a855f7",
                            }}
                          >
                            <TrendingUp size={10} /> {d.patrolCount}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs"
                            style={{
                              background:
                                d.staff.availabilityStatus === "available"
                                  ? "rgba(34,197,94,0.12)"
                                  : d.staff.availabilityStatus === "in_meeting"
                                    ? "rgba(245,158,11,0.12)"
                                    : "rgba(100,116,139,0.12)",
                              color:
                                d.staff.availabilityStatus === "available"
                                  ? "#22c55e"
                                  : d.staff.availabilityStatus === "in_meeting"
                                    ? "#f59e0b"
                                    : "#64748b",
                            }}
                          >
                            {d.staff.availabilityStatus === "available"
                              ? "Müsait"
                              : d.staff.availabilityStatus === "in_meeting"
                                ? "Toplantıda"
                                : "Dışarıda"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
