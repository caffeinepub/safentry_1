import React, { useState } from "react";
import type { Visitor } from "../types";

interface CorporateGroup {
  companyName: string;
  visitors: Visitor[];
  lastVisit: number;
  avgRating: number | null;
  activeCount: number;
}

export default function CorporateCrmTab({ visitors }: { visitors: Visitor[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Group visitors by a company/org name derived from visitReason or a companyName field
  const groups: CorporateGroup[] = React.useMemo(() => {
    const map = new Map<string, Visitor[]>();
    for (const v of visitors) {
      // Use hostStaffId's domain or visitReason as grouping key
      // Try to extract company name from visitor data
      const key =
        (v as Visitor & { companyName?: string }).companyName ||
        (v.visitReason?.length > 0 ? v.visitReason : null) ||
        "Bilinmeyen Firma";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }
    return Array.from(map.entries())
      .map(([companyName, vs]) => {
        const rated = vs.filter(
          (v) => v.rating != null || v.exitRating != null,
        );
        const avgRating =
          rated.length > 0
            ? rated.reduce((s, v) => s + (v.rating ?? v.exitRating ?? 0), 0) /
              rated.length
            : null;
        return {
          companyName,
          visitors: vs,
          lastVisit: Math.max(...vs.map((v) => v.arrivalTime)),
          avgRating,
          activeCount: vs.filter((v) => v.status === "active").length,
        };
      })
      .sort((a, b) => b.lastVisit - a.lastVisit);
  }, [visitors]);

  const filtered = groups.filter((g) =>
    g.companyName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-white font-bold text-lg">
            🏢 Kurumsal Ziyaretçi CRM
          </h2>
          <p className="text-slate-400 text-sm">
            Ziyaret amacına göre gruplandırılmış firma bazlı görünüm
          </p>
        </div>
        <span
          className="px-3 py-1 rounded-full text-xs font-bold"
          style={{ background: "rgba(14,165,233,0.2)", color: "#38bdf8" }}
        >
          {groups.length} Grup
        </span>
      </div>

      <input
        data-ocid="corporate_crm.search_input"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Firma / Ziyaret amacı ara..."
        className="w-full px-4 py-2.5 rounded-xl mb-5 text-sm text-white"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          outline: "none",
        }}
      />

      {filtered.length === 0 ? (
        <div
          data-ocid="corporate_crm.empty_state"
          className="text-center py-16 text-slate-500"
        >
          <div className="text-5xl mb-3">🏢</div>
          <p className="text-sm">Henüz kayıt bulunamadı</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((g, idx) => (
            <div
              key={g.companyName}
              data-ocid={`corporate_crm.item.${idx + 1}`}
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <button
                type="button"
                data-ocid={`corporate_crm.row.${idx + 1}`}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                onClick={() =>
                  setExpanded(expanded === g.companyName ? null : g.companyName)
                }
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: "rgba(14,165,233,0.15)" }}
                  >
                    🏢
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold truncate">
                      {g.companyName}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Son ziyaret:{" "}
                      {new Date(g.lastVisit).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="text-center hidden sm:block">
                    <p className="text-white font-bold text-lg">
                      {g.visitors.length}
                    </p>
                    <p className="text-slate-500 text-xs">Ziyaret</p>
                  </div>
                  {g.activeCount > 0 && (
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{
                        background: "rgba(34,197,94,0.2)",
                        color: "#4ade80",
                      }}
                    >
                      {g.activeCount} Aktif
                    </span>
                  )}
                  {g.avgRating != null && (
                    <div className="text-center hidden sm:block">
                      <p className="text-amber-400 font-bold">
                        ⭐ {g.avgRating.toFixed(1)}
                      </p>
                      <p className="text-slate-500 text-xs">Ort. Puan</p>
                    </div>
                  )}
                  <span className="text-slate-500 text-lg ml-2">
                    {expanded === g.companyName ? "▲" : "▼"}
                  </span>
                </div>
              </button>

              {expanded === g.companyName && (
                <div
                  className="px-5 pb-4"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="grid grid-cols-3 gap-4 py-3 mb-3">
                    {[
                      { label: "Toplam Ziyaret", value: g.visitors.length },
                      {
                        label: "Şu An İçeride",
                        value: g.activeCount,
                      },
                      {
                        label: "Ort. Memnuniyet",
                        value:
                          g.avgRating != null
                            ? `⭐ ${g.avgRating.toFixed(1)}`
                            : "—",
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-xl p-3 text-center"
                        style={{ background: "rgba(255,255,255,0.04)" }}
                      >
                        <p className="text-white font-bold text-xl">
                          {stat.value}
                        </p>
                        <p className="text-slate-500 text-xs mt-1">
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {g.visitors
                      .sort((a, b) => b.arrivalTime - a.arrivalTime)
                      .map((v) => (
                        <div
                          key={v.visitorId}
                          className="flex items-center justify-between py-2 px-3 rounded-xl"
                          style={{ background: "rgba(255,255,255,0.03)" }}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                v.status === "active"
                                  ? "bg-green-400"
                                  : "bg-slate-600"
                              }`}
                            />
                            <div>
                              <p className="text-white text-sm">{v.name}</p>
                              <p className="text-slate-500 text-xs">
                                {new Date(v.arrivalTime).toLocaleString(
                                  "tr-TR",
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {(v.rating ?? v.exitRating) != null && (
                              <span className="text-amber-400 text-xs">
                                ⭐ {v.rating ?? v.exitRating}
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs ${
                                v.status === "active"
                                  ? "text-green-400"
                                  : "text-slate-500"
                              }`}
                            >
                              {v.status === "active" ? "Aktif" : "Ayrıldı"}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
