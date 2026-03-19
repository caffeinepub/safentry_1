import React, { useState } from "react";
import { getVisitors } from "../store";

interface KpiTargetValues {
  maxWaitMinutes: number;
  minSatisfaction: number;
  monthlyGoal: number;
}

const KPI_KEY = (cid: string) => `safentry_kpi_${cid}`;

export function getKpiTargets(companyId: string): KpiTargetValues {
  try {
    const stored = JSON.parse(localStorage.getItem(KPI_KEY(companyId)) ?? "{}");
    return {
      maxWaitMinutes: stored.maxWaitMinutes ?? 10,
      minSatisfaction: stored.minSatisfaction ?? 80,
      monthlyGoal: stored.monthlyGoal ?? 100,
    };
  } catch {
    return { maxWaitMinutes: 10, minSatisfaction: 80, monthlyGoal: 100 };
  }
}

export function saveKpiTargets(companyId: string, targets: KpiTargetValues) {
  localStorage.setItem(KPI_KEY(companyId), JSON.stringify(targets));
}

function ProgressBar({
  value,
  max,
  color,
}: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div
      className="w-full rounded-full h-2"
      style={{ background: "rgba(255,255,255,0.1)" }}
    >
      <div
        className="h-2 rounded-full transition-all"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

function getColor(onTrack: boolean, warn: boolean) {
  if (onTrack) return "#22c55e";
  if (warn) return "#f59e0b";
  return "#ef4444";
}

interface KpiTargetsProps {
  companyId: string;
}

export default function KpiTargets({ companyId }: KpiTargetsProps) {
  const [targets, setTargets] = useState<KpiTargetValues>(() =>
    getKpiTargets(companyId),
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<KpiTargetValues>(targets);

  const visitors = getVisitors(companyId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthVisitors = visitors.filter((v) => v.arrivalTime >= monthStart);

  // Average wait time (arrival to departure for exited visitors today)
  const todayExited = visitors.filter(
    (v) =>
      v.departureTime &&
      new Date(v.arrivalTime).toDateString() === now.toDateString(),
  );
  const avgWaitMin =
    todayExited.length > 0
      ? todayExited.reduce(
          (s, v) => s + (v.departureTime! - v.arrivalTime),
          0,
        ) /
        todayExited.length /
        60000
      : 0;

  // Average satisfaction
  const withRating = visitors.filter((v) => typeof v.rating === "number");
  const avgSat =
    withRating.length > 0
      ? (withRating.reduce((s, v) => s + (v.rating ?? 0), 0) /
          withRating.length) *
        20
      : 0;

  const monthCount = monthVisitors.length;

  const waitColor = getColor(
    avgWaitMin <= targets.maxWaitMinutes,
    avgWaitMin <= targets.maxWaitMinutes * 1.3,
  );
  const satColor = getColor(
    avgSat >= targets.minSatisfaction,
    avgSat >= targets.minSatisfaction * 0.85,
  );
  const monthColor = getColor(
    monthCount >= targets.monthlyGoal,
    monthCount >= targets.monthlyGoal * 0.7,
  );

  const handleSave = () => {
    saveKpiTargets(companyId, draft);
    setTargets(draft);
    setEditing(false);
  };

  return (
    <div
      className="rounded-2xl p-6"
      data-ocid="kpi.card"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-white font-bold text-base">🎯 KPI Hedefleri</div>
          <div className="text-slate-400 text-xs mt-0.5">
            Performans hedeflerinizi belirleyin ve takip edin
          </div>
        </div>
        <button
          type="button"
          data-ocid="kpi.edit_button"
          onClick={() => {
            if (editing) handleSave();
            else {
              setDraft(targets);
              setEditing(true);
            }
          }}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all"
          style={{
            background: editing
              ? "rgba(34,197,94,0.3)"
              : "rgba(14,165,233,0.2)",
            border: editing
              ? "1px solid rgba(34,197,94,0.5)"
              : "1px solid rgba(14,165,233,0.3)",
          }}
        >
          {editing ? "✅ Kaydet" : "✏️ Düzenle"}
        </button>
      </div>

      <div className="space-y-5">
        {/* Max wait time */}
        <KpiRow
          label="Max Bekleme Süresi"
          unit="dakika"
          target={targets.maxWaitMinutes}
          current={Math.round(avgWaitMin * 10) / 10}
          color={waitColor}
          progress={
            ((targets.maxWaitMinutes -
              Math.min(avgWaitMin, targets.maxWaitMinutes)) /
              targets.maxWaitMinutes) *
            100
          }
          editing={editing}
          draftValue={draft.maxWaitMinutes}
          onDraftChange={(v) => setDraft((d) => ({ ...d, maxWaitMinutes: v }))}
          description="Bugün ortalama karşılama süresi"
          lowerIsBetter
        />

        {/* Min satisfaction */}
        <KpiRow
          label="Min Memnuniyet Skoru"
          unit="%"
          target={targets.minSatisfaction}
          current={Math.round(avgSat)}
          color={satColor}
          progress={avgSat}
          editing={editing}
          draftValue={draft.minSatisfaction}
          onDraftChange={(v) => setDraft((d) => ({ ...d, minSatisfaction: v }))}
          description="Tüm zamanlar ortalama memnuniyet"
        />

        {/* Monthly goal */}
        <KpiRow
          label="Aylık Ziyaretçi Hedefi"
          unit="ziyaretçi"
          target={targets.monthlyGoal}
          current={monthCount}
          color={monthColor}
          progress={(monthCount / targets.monthlyGoal) * 100}
          editing={editing}
          draftValue={draft.monthlyGoal}
          onDraftChange={(v) => setDraft((d) => ({ ...d, monthlyGoal: v }))}
          description={`Bu ay ${monthCount} ziyaretçi`}
        />
      </div>
    </div>
  );
}

function KpiRow({
  label,
  unit,
  target,
  current,
  color,
  progress,
  editing,
  draftValue,
  onDraftChange,
  description,
  lowerIsBetter,
}: {
  label: string;
  unit: string;
  target: number;
  current: number;
  color: string;
  progress: number;
  editing: boolean;
  draftValue: number;
  onDraftChange: (v: number) => void;
  description: string;
  lowerIsBetter?: boolean;
}) {
  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-300 text-sm font-medium">{label}</span>
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={draftValue}
              onChange={(e) => onDraftChange(Number(e.target.value))}
              className="w-20 px-2 py-1 rounded-lg text-xs text-white bg-white/10 border border-white/15 outline-none"
            />
            <span className="text-slate-500 text-xs">{unit}</span>
          </div>
        ) : (
          <span className="text-slate-400 text-xs">
            Hedef: {target} {unit}
          </span>
        )}
      </div>
      <div className="mb-2">
        <ProgressBar value={Math.max(0, progress)} max={100} color={color} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-slate-500 text-xs">{description}</span>
        <span className="text-xs font-bold" style={{ color }}>
          {current} {unit}
          {lowerIsBetter
            ? current <= target
              ? " ✅"
              : " ⚠️"
            : current >= target
              ? " ✅"
              : " ⚠️"}
        </span>
      </div>
    </div>
  );
}
