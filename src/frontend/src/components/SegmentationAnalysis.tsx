import type { Visitor } from "../types";

interface Props {
  visitors: Visitor[];
}

const COLORS = [
  "#0ea5e9",
  "#f59e0b",
  "#22c55e",
  "#a855f7",
  "#ef4444",
  "#06b6d4",
  "#f97316",
];

function SimpleBar({
  label,
  value,
  max,
  color,
}: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-24 text-slate-400 text-xs text-right truncate">
        {label}
      </div>
      <div
        className="flex-1 h-5 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
          style={{ width: `${Math.max(pct, 1)}%`, background: color }}
        >
          {pct > 15 && (
            <span className="text-white text-xs font-bold">{value}</span>
          )}
        </div>
      </div>
      {pct <= 15 && <span className="text-slate-300 text-xs w-6">{value}</span>}
    </div>
  );
}

export default function SegmentationAnalysis({ visitors }: Props) {
  const categories = [...new Set(visitors.map((v) => v.category || "Diğer"))];
  const departments = [
    ...new Set(visitors.map((v) => v.department || "Belirtilmemiş")),
  ];

  // Category vs Department matrix
  const catDeptMatrix: Record<string, Record<string, number>> = {};
  for (const v of visitors) {
    const cat = v.category || "Diğer";
    const dept = v.department || "Belirtilmemiş";
    if (!catDeptMatrix[cat]) catDeptMatrix[cat] = {};
    catDeptMatrix[cat][dept] = (catDeptMatrix[cat][dept] ?? 0) + 1;
  }

  // Visit reason breakdown per category
  const catReasonMatrix: Record<string, Record<string, number>> = {};
  for (const v of visitors) {
    const cat = v.category || "Diğer";
    const reason = v.visitReason?.trim().slice(0, 20) || "Belirtilmemiş";
    if (!catReasonMatrix[cat]) catReasonMatrix[cat] = {};
    catReasonMatrix[cat][reason] = (catReasonMatrix[cat][reason] ?? 0) + 1;
  }

  // Time of day per category
  const getTimeSlot = (ts: number) => {
    const h = new Date(ts).getHours();
    if (h >= 6 && h < 12) return "Sabah (06-12)";
    if (h >= 12 && h < 17) return "Öğle (12-17)";
    if (h >= 17 && h < 22) return "Akşam (17-22)";
    return "Gece (22-06)";
  };
  const timeSlots = [
    "Sabah (06-12)",
    "Öğle (12-17)",
    "Akşam (17-22)",
    "Gece (22-06)",
  ];
  const catTimeMatrix: Record<string, Record<string, number>> = {};
  for (const v of visitors) {
    const cat = v.category || "Diğer";
    const slot = getTimeSlot(v.arrivalTime);
    if (!catTimeMatrix[cat]) catTimeMatrix[cat] = {};
    catTimeMatrix[cat][slot] = (catTimeMatrix[cat][slot] ?? 0) + 1;
  }

  if (visitors.length === 0) {
    return (
      <div
        className="text-slate-500 text-sm text-center py-12"
        data-ocid="segmentation.empty_state"
      >
        Segmentasyon analizi için ziyaretçi verisi gerekli
      </div>
    );
  }

  return (
    <div className="space-y-8" data-ocid="segmentation.panel">
      {/* Category distribution */}
      <div
        className="p-5 rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <h4 className="text-white font-semibold mb-4">📊 Kategori Dağılımı</h4>
        {(() => {
          const counts = Object.fromEntries(
            categories.map((c) => [
              c,
              visitors.filter((v) => (v.category || "Diğer") === c).length,
            ]),
          );
          const max = Math.max(...Object.values(counts));
          return categories.map((cat, i) => (
            <SimpleBar
              key={cat}
              label={cat}
              value={counts[cat]}
              max={max}
              color={COLORS[i % COLORS.length]}
            />
          ));
        })()}
      </div>

      {/* Category vs Department */}
      {departments.length > 1 && (
        <div
          className="p-5 rounded-2xl overflow-x-auto"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h4 className="text-white font-semibold mb-4">
            🏢 Kategori × Departman Matrisi
          </h4>
          <table
            className="w-full text-xs"
            style={{ minWidth: `${departments.length * 90 + 100}px` }}
          >
            <thead>
              <tr>
                <th className="text-left text-slate-400 pr-3 py-1 font-medium">
                  Kategori
                </th>
                {departments.map((d) => (
                  <th
                    key={d}
                    className="text-center text-slate-400 px-2 py-1 font-medium"
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, ci) => (
                <tr key={cat}>
                  <td className="text-slate-300 pr-3 py-2 font-medium">
                    {cat}
                  </td>
                  {departments.map((dept) => {
                    const val = catDeptMatrix[cat]?.[dept] ?? 0;
                    const maxVal = Math.max(
                      ...departments.map((d) => catDeptMatrix[cat]?.[d] ?? 0),
                    );
                    return (
                      <td key={dept} className="text-center py-2 px-2">
                        <div
                          className="inline-block min-w-[24px] px-2 py-1 rounded-lg font-bold text-center"
                          style={{
                            background:
                              val > 0
                                ? `${COLORS[ci % COLORS.length]}${Math.round(
                                    (val / (maxVal || 1)) * 40 + 10,
                                  )
                                    .toString(16)
                                    .padStart(2, "0")}`
                                : "rgba(255,255,255,0.04)",
                            color:
                              val > 0 ? COLORS[ci % COLORS.length] : "#4b5563",
                          }}
                        >
                          {val || "—"}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Time of Day per Category heatmap */}
      <div
        className="p-5 rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <h4 className="text-white font-semibold mb-4">
          ⏰ Zaman Dilimi × Kategori Isı Haritası
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left text-slate-400 pr-3 py-1 font-medium">
                  Kategori
                </th>
                {timeSlots.map((slot) => (
                  <th
                    key={slot}
                    className="text-center text-slate-400 px-3 py-1 font-medium whitespace-nowrap"
                  >
                    {slot}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, ci) => {
                const rowMax = Math.max(
                  ...timeSlots.map((s) => catTimeMatrix[cat]?.[s] ?? 0),
                );
                return (
                  <tr key={cat}>
                    <td className="text-slate-300 pr-3 py-2 font-medium">
                      {cat}
                    </td>
                    {timeSlots.map((slot) => {
                      const val = catTimeMatrix[cat]?.[slot] ?? 0;
                      const intensity = rowMax > 0 ? val / rowMax : 0;
                      return (
                        <td key={slot} className="text-center py-2 px-3">
                          <div
                            className="inline-block min-w-[32px] px-2 py-1 rounded-lg font-bold"
                            style={{
                              background:
                                val > 0
                                  ? `${COLORS[ci % COLORS.length]}${Math.round(
                                      intensity * 50 + 10,
                                    )
                                      .toString(16)
                                      .padStart(2, "0")}`
                                  : "rgba(255,255,255,0.03)",
                              color:
                                val > 0
                                  ? COLORS[ci % COLORS.length]
                                  : "#374151",
                            }}
                          >
                            {val || "—"}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
