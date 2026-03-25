import { useEffect, useState } from "react";

interface StaffMember {
  staffId: string;
  name: string;
  role: string;
  punchStatus?: string;
}

interface Visitor {
  visitorId: string;
  host?: string;
  registeredBy?: string;
  arrivalTime: number;
  exitRating?: number;
  status: string;
}

interface FeedbackEntry {
  visitorId?: string;
  rating?: number;
  staffId?: string;
  createdAt?: number;
}

interface PunchRecord {
  staffId: string;
  action: "in" | "out";
  timestamp: number;
}

interface ScoreRow {
  staffId: string;
  name: string;
  role: string;
  visitorsToday: number;
  avgSatisfaction: number | null;
  punchedIn: boolean;
}

type SortKey = "name" | "visitorsToday" | "avgSatisfaction";

function todayStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function loadStaff(companyId: string): StaffMember[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_staff_${companyId}`) ?? "[]",
    );
  } catch {
    return [];
  }
}

function loadVisitors(companyId: string): Visitor[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_visitors_${companyId}`) ?? "[]",
    );
  } catch {
    return [];
  }
}

function loadFeedback(companyId: string): FeedbackEntry[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_feedback_${companyId}`) ?? "[]",
    );
  } catch {
    return [];
  }
}

function loadPunches(companyId: string): PunchRecord[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_punches_${companyId}`) ?? "[]",
    );
  } catch {
    return [];
  }
}

function buildScores(companyId: string): ScoreRow[] {
  const staff = loadStaff(companyId);
  const visitors = loadVisitors(companyId);
  const feedback = loadFeedback(companyId);
  const punches = loadPunches(companyId);
  const today = todayStart();

  return staff.map((s) => {
    const todayVisitors = visitors.filter(
      (v) =>
        v.arrivalTime >= today &&
        (v.host === s.name || v.registeredBy === s.staffId),
    );

    const ratings = [
      ...todayVisitors
        .filter((v) => v.exitRating && v.exitRating > 0)
        .map((v) => v.exitRating as number),
      ...feedback
        .filter(
          (f) =>
            f.staffId === s.staffId &&
            f.createdAt &&
            f.createdAt >= today &&
            f.rating &&
            f.rating > 0,
        )
        .map((f) => f.rating as number),
    ];
    const avgSatisfaction =
      ratings.length > 0
        ? Math.round(
            (ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10,
          ) / 10
        : null;

    // Determine punch status -- last punch action today
    const todayPunches = punches
      .filter((p) => p.staffId === s.staffId && p.timestamp >= today)
      .sort((a, b) => b.timestamp - a.timestamp);
    const punchedIn =
      todayPunches.length > 0 && todayPunches[0].action === "in";

    return {
      staffId: s.staffId,
      name: s.name,
      role: s.role,
      visitorsToday: todayVisitors.length,
      avgSatisfaction,
      punchedIn,
    };
  });
}

const MEDAL = ["🥇", "🥈", "🥉"];

interface Props {
  companyId: string;
}

export default function LiveScoreTab({ companyId }: Props) {
  const [scores, setScores] = useState<ScoreRow[]>(() =>
    buildScores(companyId),
  );
  const [sortKey, setSortKey] = useState<SortKey>("visitorsToday");
  const [sortAsc, setSortAsc] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    const refresh = () => {
      setScores(buildScores(companyId));
      setLastRefresh(new Date());
    };
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [companyId]);

  const sorted = [...scores].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name") {
      cmp = a.name.localeCompare(b.name, "tr");
    } else if (sortKey === "visitorsToday") {
      cmp = a.visitorsToday - b.visitorsToday;
    } else {
      const av = a.avgSatisfaction ?? -1;
      const bv = b.avgSatisfaction ?? -1;
      cmp = av - bv;
    }
    return sortAsc ? cmp : -cmp;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const cardStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(14,165,233,0.15)",
    borderRadius: 12,
  };

  const thStyle: React.CSSProperties = {
    padding: "10px 14px",
    textAlign: "left" as const,
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: 600,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap" as const,
  };

  const tdStyle: React.CSSProperties = {
    padding: "12px 14px",
    fontSize: 14,
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  };

  // Top 3 by visitors today (for medals)
  const top3Ids = [...scores]
    .sort((a, b) => b.visitorsToday - a.visitorsToday)
    .slice(0, 3)
    .map((s) => s.staffId);

  const btnBase =
    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-white">
          🏆 Canlı Personel Performans Tablosu
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            Son güncelleme: {lastRefresh.toLocaleTimeString("tr-TR")}
          </span>
          <button
            type="button"
            data-ocid="livescore.refresh.button"
            onClick={() => {
              setScores(buildScores(companyId));
              setLastRefresh(new Date());
            }}
            className={btnBase}
            style={{
              background: "rgba(14,165,233,0.15)",
              border: "1px solid rgba(14,165,233,0.3)",
              color: "#38bdf8",
            }}
          >
            🔄 Yenile
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Tablo her 30 saniyede otomatik güncellenir. Bugünkü (00:00'dan itibaren)
        veriler gösterilmektedir.
      </p>

      {scores.length === 0 ? (
        <div style={{ ...cardStyle, padding: 32, textAlign: "center" }}>
          <p className="text-slate-400">
            Personel bulunamadı. Önce personel ekleyin.
          </p>
        </div>
      ) : (
        <div style={cardStyle} className="overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>
                  <button
                    type="button"
                    onClick={() => handleSort("name")}
                    data-ocid="livescore.name.tab"
                    style={{
                      background: "none",
                      border: "none",
                      color: "inherit",
                      cursor: "pointer",
                      font: "inherit",
                      padding: 0,
                    }}
                  >
                    Personel {sortKey === "name" ? (sortAsc ? "▲" : "▼") : ""}
                  </button>
                </th>
                <th style={thStyle}>Rol</th>
                <th style={thStyle}>Durum</th>
                <th style={{ ...thStyle, textAlign: "center" as const }}>
                  <button
                    type="button"
                    onClick={() => handleSort("visitorsToday")}
                    data-ocid="livescore.visitors.tab"
                    style={{
                      background: "none",
                      border: "none",
                      color: "inherit",
                      cursor: "pointer",
                      font: "inherit",
                      padding: 0,
                    }}
                  >
                    Bugün İşlenen{" "}
                    {sortKey === "visitorsToday" ? (sortAsc ? "▲" : "▼") : ""}
                  </button>
                </th>
                <th style={{ ...thStyle, textAlign: "center" as const }}>
                  <button
                    type="button"
                    onClick={() => handleSort("avgSatisfaction")}
                    data-ocid="livescore.satisfaction.tab"
                    style={{
                      background: "none",
                      border: "none",
                      color: "inherit",
                      cursor: "pointer",
                      font: "inherit",
                      padding: 0,
                    }}
                  >
                    Ort. Memnuniyet{" "}
                    {sortKey === "avgSatisfaction" ? (sortAsc ? "▲" : "▼") : ""}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, idx) => {
                const medalIdx = top3Ids.indexOf(row.staffId);
                const isMedal = medalIdx !== -1 && row.visitorsToday > 0;
                return (
                  <tr
                    key={row.staffId}
                    data-ocid={`livescore.item.${idx + 1}`}
                    style={{
                      background:
                        isMedal && medalIdx === 0
                          ? "rgba(251,191,36,0.04)"
                          : "transparent",
                    }}
                  >
                    <td style={tdStyle}>
                      <span style={{ fontSize: 18 }}>
                        {isMedal ? (
                          MEDAL[medalIdx]
                        ) : (
                          <span className="text-slate-600">{idx + 1}</span>
                        )}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span className="font-medium text-white">{row.name}</span>
                    </td>
                    <td style={tdStyle}>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background:
                            row.role === "admin"
                              ? "rgba(14,165,233,0.15)"
                              : "rgba(148,163,184,0.1)",
                          border: `1px solid ${row.role === "admin" ? "rgba(14,165,233,0.3)" : "rgba(148,163,184,0.2)"}`,
                          color: row.role === "admin" ? "#38bdf8" : "#94a3b8",
                        }}
                      >
                        {row.role === "admin" ? "Admin" : "Güvenlik"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span
                        className="text-xs font-medium"
                        style={{ color: row.punchedIn ? "#4ade80" : "#64748b" }}
                      >
                        {row.punchedIn ? "🟢 Aktif" : "⚫ Pasif"}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <span
                        className="text-base font-bold"
                        style={{
                          color: row.visitorsToday > 0 ? "#38bdf8" : "#475569",
                        }}
                      >
                        {row.visitorsToday}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      {row.avgSatisfaction !== null ? (
                        <span
                          className="text-sm font-semibold"
                          style={{
                            color:
                              row.avgSatisfaction >= 4
                                ? "#4ade80"
                                : row.avgSatisfaction >= 3
                                  ? "#fbbf24"
                                  : "#f87171",
                          }}
                        >
                          ⭐ {row.avgSatisfaction}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary cards */}
      {scores.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div
            style={{
              background: "rgba(14,165,233,0.08)",
              border: "1px solid rgba(14,165,233,0.2)",
              borderRadius: 10,
              padding: "12px 16px",
            }}
          >
            <p className="text-xs text-slate-400">Aktif Personel</p>
            <p className="text-xl font-bold text-teal-400 mt-1">
              {scores.filter((s) => s.punchedIn).length}
            </p>
          </div>
          <div
            style={{
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.2)",
              borderRadius: 10,
              padding: "12px 16px",
            }}
          >
            <p className="text-xs text-slate-400">Bugün Toplam Ziyaret</p>
            <p className="text-xl font-bold text-green-400 mt-1">
              {scores.reduce((a, s) => a + s.visitorsToday, 0)}
            </p>
          </div>
          <div
            style={{
              background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.2)",
              borderRadius: 10,
              padding: "12px 16px",
            }}
          >
            <p className="text-xs text-slate-400">En Yüksek Memnuniyet</p>
            <p className="text-xl font-bold text-yellow-400 mt-1">
              {(() => {
                const best = scores
                  .filter((s) => s.avgSatisfaction !== null)
                  .sort(
                    (a, b) =>
                      (b.avgSatisfaction ?? 0) - (a.avgSatisfaction ?? 0),
                  )[0];
                return best ? `⭐ ${best.avgSatisfaction}` : "—";
              })()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
