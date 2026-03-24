import { useState } from "react";
import { toast } from "sonner";
import type { Staff, Visitor, VisitorGroup } from "../types";

export function getVisitorGroups(companyId: string): VisitorGroup[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_groups_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
export function saveVisitorGroup(g: VisitorGroup): void {
  const all = getVisitorGroups(g.companyId);
  const idx = all.findIndex((x) => x.groupId === g.groupId);
  if (idx >= 0) all[idx] = g;
  else all.unshift(g);
  localStorage.setItem(`safentry_groups_${g.companyId}`, JSON.stringify(all));
}

interface Props {
  companyId: string;
  visitors: Visitor[];
  staffList: Staff[];
  onGroupExit?: (groupId: string) => void;
}

function fmt(n: number) {
  return new Date(n).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VisitorGroupTab({
  companyId,
  visitors,
  onGroupExit,
}: Props) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const groups = getVisitorGroups(companyId);

  if (groups.length === 0) {
    return (
      <div
        data-ocid="groups.empty_state"
        className="flex flex-col items-center justify-center py-16 text-slate-500"
      >
        <div className="text-5xl mb-4">👥</div>
        <p className="text-lg font-medium text-slate-400">Grup Kaydı Yok</p>
        <p className="text-sm mt-2">
          Personel Paneli'nden grup ziyaretçi kaydı oluşturabilirsiniz.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-white font-semibold text-lg">👥 Grup Ziyaretleri</h2>

      {groups.map((group, gi) => {
        const members = visitors.filter((v) =>
          group.memberIds.includes(v.visitorId),
        );
        const activeCount = members.filter((v) => v.status === "active").length;
        const isExpanded = expandedGroup === group.groupId;

        return (
          <div
            key={group.groupId}
            data-ocid={`groups.item.${gi + 1}`}
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {/* Group header */}
            <button
              type="button"
              onClick={() =>
                setExpandedGroup(isExpanded ? null : group.groupId)
              }
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{
                    background:
                      group.status === "active"
                        ? "rgba(0,212,170,0.15)"
                        : "rgba(100,116,139,0.15)",
                    border:
                      group.status === "active"
                        ? "1px solid rgba(0,212,170,0.3)"
                        : "1px solid rgba(100,116,139,0.2)",
                  }}
                >
                  👥
                </div>
                <div>
                  <div className="text-white font-medium text-sm">
                    {group.groupName}
                  </div>
                  <div className="text-slate-400 text-xs">
                    Lider: {group.leaderName} &bull; {fmt(group.createdAt)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className="px-2 py-1 rounded-lg text-xs font-semibold"
                  style={{
                    background:
                      activeCount > 0
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(100,116,139,0.12)",
                    color: activeCount > 0 ? "#4ade80" : "#94a3b8",
                  }}
                >
                  {activeCount}/{group.memberIds.length} İçeride
                </span>
                <span className="text-slate-500 text-sm">
                  {isExpanded ? "▲" : "▼"}
                </span>
              </div>
            </button>

            {/* Members list */}
            {isExpanded && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="px-4 py-3 space-y-2">
                  {members.length === 0 ? (
                    <p className="text-slate-500 text-sm py-2">
                      Üye kaydı bulunamadı.
                    </p>
                  ) : (
                    members.map((v, mi) => (
                      <div
                        key={v.visitorId}
                        data-ocid={`groups.member.${mi + 1}`}
                        className="flex items-center justify-between p-3 rounded-xl"
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{
                              background:
                                v.status === "active"
                                  ? "rgba(34,197,94,0.2)"
                                  : "rgba(100,116,139,0.2)",
                            }}
                          >
                            {v.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white text-sm">{v.name}</p>
                            <p className="text-slate-500 text-xs">
                              {v.idNumber}
                            </p>
                          </div>
                          {v.visitorId === members[0]?.visitorId && (
                            <span
                              className="px-1.5 py-0.5 rounded text-xs"
                              style={{
                                background: "rgba(245,158,11,0.15)",
                                color: "#f59e0b",
                              }}
                            >
                              Lider
                            </span>
                          )}
                        </div>
                        <span
                          className="text-xs px-2 py-1 rounded-full"
                          style={{
                            background:
                              v.status === "active"
                                ? "rgba(34,197,94,0.15)"
                                : v.status === "departed"
                                  ? "rgba(100,116,139,0.15)"
                                  : "rgba(14,165,233,0.15)",
                            color:
                              v.status === "active"
                                ? "#4ade80"
                                : v.status === "departed"
                                  ? "#94a3b8"
                                  : "#38bdf8",
                          }}
                        >
                          {v.status === "active"
                            ? "İçeride"
                            : v.status === "departed"
                              ? "Çıktı"
                              : "Ön Kayıt"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                {activeCount > 0 && onGroupExit && (
                  <div
                    className="px-4 pb-4"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <button
                      type="button"
                      data-ocid={`groups.bulk_exit.button.${gi + 1}`}
                      onClick={() => {
                        onGroupExit(group.groupId);
                        const updated: VisitorGroup = {
                          ...group,
                          status: "departed",
                        };
                        saveVisitorGroup(updated);
                        setTick((t) => t + 1);
                        toast.success(
                          `${group.groupName} grubu toplu çıkış yapıldı`,
                        );
                      }}
                      className="mt-3 w-full py-2 rounded-xl text-sm font-semibold text-white transition-all"
                      style={{
                        background: "rgba(239,68,68,0.12)",
                        border: "1px solid rgba(239,68,68,0.3)",
                        color: "#f87171",
                      }}
                    >
                      🚪 Grubu Toplu Çıkış Yap ({activeCount} kişi)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      {/* eslint-disable-next-line react-hooks/exhaustive-deps */}
      <span className="hidden">{tick}</span>
    </div>
  );
}
