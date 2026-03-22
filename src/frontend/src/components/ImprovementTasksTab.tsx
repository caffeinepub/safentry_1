import { useState } from "react";
import { toast } from "sonner";
import { getImprovementTasks, saveImprovementTask } from "../store";

interface StaffTabProps {
  companyId: string;
  staffCode: string;
}

export function StaffImprovementTasksTab({
  companyId,
  staffCode,
}: StaffTabProps) {
  const [tasks, setTasks] = useState(() =>
    getImprovementTasks(companyId).filter(
      (t) => t.assignedToCode === staffCode,
    ),
  );
  const [resolutions, setResolutions] = useState<Record<string, string>>({});

  const reload = () =>
    setTasks(
      getImprovementTasks(companyId).filter(
        (t) => t.assignedToCode === staffCode,
      ),
    );

  const updateStatus = (
    id: string,
    status: "in_progress" | "resolved",
    resolution?: string,
  ) => {
    const t = getImprovementTasks(companyId).find((x) => x.id === id);
    if (!t) return;
    saveImprovementTask({
      ...t,
      status,
      resolution,
      resolvedAt: status === "resolved" ? Date.now() : undefined,
    });
    toast.success(
      status === "resolved"
        ? "Görev çözüldü olarak işaretlendi"
        : "Görev güncellendi",
    );
    reload();
  };

  const openTasks = tasks.filter((t) => t.status !== "resolved");
  const doneTasks = tasks.filter((t) => t.status === "resolved");

  const renderTask = (
    t: ReturnType<typeof getImprovementTasks>[0],
    idx: number,
  ) => {
    const isOverdue = Date.now() > t.dueDate && t.status !== "resolved";
    return (
      <div
        key={t.id}
        data-ocid={`imptask.item.${idx + 1}`}
        className="p-4 rounded-2xl space-y-3"
        style={{
          background: isOverdue
            ? "rgba(239,68,68,0.06)"
            : "rgba(255,255,255,0.03)",
          border: `1px solid ${
            isOverdue
              ? "rgba(239,68,68,0.3)"
              : t.status === "resolved"
                ? "rgba(34,197,94,0.2)"
                : "rgba(255,255,255,0.08)"
          }`,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-white text-sm font-semibold">{t.visitorName}</p>
            <p className="text-slate-400 text-xs">
              Memnuniyet Puanı:{" "}
              <span
                className="font-bold"
                style={{
                  color: t.satisfactionScore <= 2 ? "#ef4444" : "#f59e0b",
                }}
              >
                {t.satisfactionScore}/5
              </span>{" "}
              &bull; {new Date(t.createdAt).toLocaleString("tr-TR")}
            </p>
            {t.visitorFeedback && (
              <p className="text-slate-400 text-xs mt-1 italic">
                "{t.visitorFeedback}"
              </p>
            )}
          </div>
          <span
            className="px-2 py-0.5 rounded-lg text-xs font-semibold whitespace-nowrap"
            style={{
              background:
                t.status === "resolved"
                  ? "rgba(34,197,94,0.2)"
                  : t.status === "in_progress"
                    ? "rgba(14,165,233,0.2)"
                    : "rgba(245,158,11,0.2)",
              color:
                t.status === "resolved"
                  ? "#22c55e"
                  : t.status === "in_progress"
                    ? "#0ea5e9"
                    : "#f59e0b",
            }}
          >
            {t.status === "resolved"
              ? "✅ Çözüldü"
              : t.status === "in_progress"
                ? "🔄 Devam Ediyor"
                : "⏳ Açık"}
          </span>
        </div>
        <p className="text-slate-500 text-xs">
          Son tarih: {new Date(t.dueDate).toLocaleDateString("tr-TR")}
          {isOverdue && " 🔴 Süre Doldu"}
        </p>
        {t.resolution && (
          <p className="text-green-400 text-xs">✅ Çözüm: {t.resolution}</p>
        )}
        {t.status !== "resolved" && (
          <div className="space-y-2">
            <input
              type="text"
              data-ocid="imptask.resolution.input"
              placeholder="Çözüm notu (isteğe bağlı)"
              value={resolutions[t.id] || ""}
              onChange={(e) =>
                setResolutions((r) => ({ ...r, [t.id]: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-xl text-xs text-white outline-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
            <div className="flex gap-2">
              {t.status === "open" && (
                <button
                  type="button"
                  data-ocid={`imptask.in_progress.button.${idx + 1}`}
                  onClick={() => updateStatus(t.id, "in_progress")}
                  className="flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: "rgba(14,165,233,0.2)",
                    border: "1px solid rgba(14,165,233,0.4)",
                    color: "#0ea5e9",
                  }}
                >
                  🔄 Devam Ediyor
                </button>
              )}
              <button
                type="button"
                data-ocid={`imptask.resolve.button.${idx + 1}`}
                onClick={() =>
                  updateStatus(t.id, "resolved", resolutions[t.id])
                }
                className="flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: "rgba(34,197,94,0.2)",
                  border: "1px solid rgba(34,197,94,0.4)",
                  color: "#22c55e",
                }}
              >
                ✅ Çözüldü
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <h2 className="text-white font-semibold text-lg">
        📋 İyileştirme Görevlerim
      </h2>
      {tasks.length === 0 ? (
        <div
          data-ocid="imptask.empty_state"
          className="p-8 rounded-2xl text-center"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="text-4xl mb-3">🎯</div>
          <p className="text-slate-400 text-sm">
            Atanmış iyileştirme göreviniz yok.
          </p>
        </div>
      ) : (
        <>
          {openTasks.length > 0 && (
            <div className="space-y-3">
              <p className="text-amber-400 text-xs font-semibold uppercase tracking-wide">
                Açık / Devam Eden
              </p>
              {openTasks.map((t, idx) => renderTask(t, idx))}
            </div>
          )}
          {doneTasks.length > 0 && (
            <div className="space-y-3">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">
                Tamamlananlar
              </p>
              {doneTasks.map((t, idx) => renderTask(t, openTasks.length + idx))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Company: All Improvement Tasks ──────────────────────────────────────────
export function CompanyImprovementTasksTab({
  companyId,
}: { companyId: string }) {
  const tasks = getImprovementTasks(companyId);

  const openCount = tasks.filter((t) => t.status === "open").length;
  const inProgressCount = tasks.filter(
    (t) => t.status === "in_progress",
  ).length;
  const resolvedCount = tasks.filter((t) => t.status === "resolved").length;

  return (
    <div className="space-y-5">
      <h2 className="text-white font-semibold text-lg">
        📋 İyileştirme Görevleri
      </h2>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className="p-4 rounded-2xl text-center"
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          <p className="text-2xl font-bold text-amber-400">{openCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">Açık</p>
        </div>
        <div
          className="p-4 rounded-2xl text-center"
          style={{
            background: "rgba(14,165,233,0.08)",
            border: "1px solid rgba(14,165,233,0.2)",
          }}
        >
          <p className="text-2xl font-bold text-cyan-400">{inProgressCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">Devam Ediyor</p>
        </div>
        <div
          className="p-4 rounded-2xl text-center"
          style={{
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.2)",
          }}
        >
          <p className="text-2xl font-bold text-green-400">{resolvedCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">Çözüldü</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div
          data-ocid="imptask.empty_state"
          className="p-8 rounded-2xl text-center"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="text-4xl mb-3">🎯</div>
          <p className="text-slate-400 text-sm">
            Henüz iyileştirme görevi oluşturulmamış.
          </p>
          <p className="text-slate-500 text-xs mt-1">
            Düşük memnuniyet puanı ({"<=3"}) girildiğinde otomatik oluşturulur.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((t, idx) => (
            <div
              key={t.id}
              data-ocid={`imptask.item.${idx + 1}`}
              className="p-4 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-white text-sm font-semibold">
                    {t.visitorName}
                  </p>
                  <p className="text-slate-400 text-xs">
                    Atanan: {t.assignedToName} &bull; Puan:{" "}
                    <span
                      style={{
                        color: t.satisfactionScore <= 2 ? "#ef4444" : "#f59e0b",
                      }}
                    >
                      {t.satisfactionScore}/5
                    </span>
                  </p>
                  <p className="text-slate-500 text-xs">
                    {new Date(t.createdAt).toLocaleString("tr-TR")}
                  </p>
                </div>
                <span
                  className="px-2 py-0.5 rounded-lg text-xs font-semibold whitespace-nowrap"
                  style={{
                    background:
                      t.status === "resolved"
                        ? "rgba(34,197,94,0.2)"
                        : t.status === "in_progress"
                          ? "rgba(14,165,233,0.2)"
                          : "rgba(245,158,11,0.2)",
                    color:
                      t.status === "resolved"
                        ? "#22c55e"
                        : t.status === "in_progress"
                          ? "#0ea5e9"
                          : "#f59e0b",
                  }}
                >
                  {t.status === "resolved"
                    ? "✅ Çözüldü"
                    : t.status === "in_progress"
                      ? "🔄 Devam"
                      : "⏳ Açık"}
                </span>
              </div>
              {t.visitorFeedback && (
                <p className="text-slate-400 text-xs mt-2 italic">
                  "{t.visitorFeedback}"
                </p>
              )}
              {t.resolution && (
                <p className="text-green-400 text-xs mt-2">✅ {t.resolution}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
