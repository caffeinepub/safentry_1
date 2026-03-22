import { useState } from "react";
import { toast } from "sonner";
import {
  getAppointments,
  getIncidents,
  getShiftHandovers,
  getVisitors,
  saveShiftHandover,
} from "../store";
import type { ShiftHandover } from "../types";
import { generateId } from "../utils";

interface Props {
  companyId: string;
  staffName: string;
  staffCode: string;
  onClose: () => void;
}

export default function ShiftHandoverModal({
  companyId,
  staffName,
  staffCode,
  onClose,
}: Props) {
  const visitors = getVisitors(companyId);
  const activeVisitorCount = visitors.filter(
    (v) => v.status === "active",
  ).length;
  const appointments = getAppointments(companyId);
  const pendingApprovalCount = appointments.filter(
    (a) => a.hostApprovalStatus === "pending",
  ).length;
  const incidents = getIncidents(companyId);
  const todayIncidents = incidents.filter((i) => {
    const d = new Date(i.timestamp);
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  }).length;

  const [shiftType, setShiftType] =
    useState<ShiftHandover["shiftType"]>("sabah");
  const [openIssues, setOpenIssues] = useState("");
  const [notes, setNotes] = useState("");

  const handleCreate = () => {
    const handover: ShiftHandover = {
      id: generateId(),
      companyId,
      createdBy: staffName,
      createdByCode: staffCode,
      createdAt: Date.now(),
      shiftType,
      activeVisitorCount,
      pendingApprovalCount,
      incidentCount: todayIncidents,
      openIssues: openIssues.trim(),
      notes: notes.trim(),
      status: "pending",
    };
    saveShiftHandover(handover);
    toast.success("Devir-teslim raporu oluşturuldu ve imzalandı");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      data-ocid="handover.modal"
    >
      <div
        className="w-full max-w-lg mx-4 rounded-2xl shadow-2xl"
        style={{
          background: "#0d1b2e",
          border: "1px solid rgba(14,165,233,0.3)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "rgba(255,255,255,0.1)" }}
        >
          <div>
            <h2 className="text-white font-bold text-lg">
              🔄 Vardiya Devir-Teslim Raporu
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Oluşturan: {staffName}
            </p>
          </div>
          <button
            type="button"
            data-ocid="handover.close_button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Shift type */}
          <div>
            <p className="text-slate-300 text-sm font-medium mb-2">Vardiya</p>
            <div className="flex gap-2">
              {(["sabah", "akşam", "gece"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  data-ocid={`handover.shift_${s}.toggle`}
                  onClick={() => setShiftType(s)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition-all"
                  style={{
                    background:
                      shiftType === s
                        ? "rgba(14,165,233,0.3)"
                        : "rgba(255,255,255,0.05)",
                    border: `1px solid ${
                      shiftType === s
                        ? "rgba(14,165,233,0.6)"
                        : "rgba(255,255,255,0.1)"
                    }`,
                    color: shiftType === s ? "#0ea5e9" : "#94a3b8",
                  }}
                >
                  {s === "sabah" ? "🌅" : s === "akşam" ? "🌇" : "🌙"}{" "}
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Auto counts */}
          <div className="grid grid-cols-3 gap-3">
            <div
              className="p-3 rounded-xl text-center"
              style={{
                background: "rgba(14,165,233,0.08)",
                border: "1px solid rgba(14,165,233,0.2)",
              }}
            >
              <p className="text-2xl font-bold text-cyan-400">
                {activeVisitorCount}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Aktif Ziyaretçi</p>
            </div>
            <div
              className="p-3 rounded-xl text-center"
              style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
              }}
            >
              <p className="text-2xl font-bold text-amber-400">
                {pendingApprovalCount}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Bekleyen Onay</p>
            </div>
            <div
              className="p-3 rounded-xl text-center"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <p className="text-2xl font-bold text-red-400">
                {todayIncidents}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Bugünkü Olay</p>
            </div>
          </div>

          {/* Open issues */}
          <div>
            <p className="text-slate-300 text-sm font-medium mb-1">
              Açık Sorunlar
            </p>
            <textarea
              data-ocid="handover.open_issues.textarea"
              rows={3}
              value={openIssues}
              onChange={(e) => setOpenIssues(e.target.value)}
              placeholder="Devredilen açık sorunlar, takip edilmesi gerekenler..."
              className="w-full px-4 py-3 rounded-xl text-sm text-white resize-none outline-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            />
          </div>

          {/* Notes */}
          <div>
            <p className="text-slate-300 text-sm font-medium mb-1">
              Genel Notlar
            </p>
            <textarea
              data-ocid="handover.notes.textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sonraki vardiyaya iletilecek notlar..."
              className="w-full px-4 py-3 rounded-xl text-sm text-white resize-none outline-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              data-ocid="handover.cancel_button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm text-slate-300 border border-white/15 hover:bg-white/5 transition-colors"
            >
              İptal
            </button>
            <button
              type="button"
              data-ocid="handover.submit_button"
              onClick={handleCreate}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{
                background: "rgba(14,165,233,0.35)",
                border: "1px solid rgba(14,165,233,0.5)",
              }}
            >
              ✅ Raporu Oluştur ve İmzala
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Handover history list (for CompanyDashboard tab) ─────────────────────────
interface HistoryProps {
  companyId: string;
  staffName?: string; // if set, only show this staff's reports
}

export function HandoverHistoryList({ companyId, staffName }: HistoryProps) {
  const [items, setItems] = useState(() => getShiftHandovers(companyId));
  const reload = () => setItems(getShiftHandovers(companyId));

  const filtered = staffName
    ? items.filter((h) => h.createdBy === staffName)
    : items;

  const acknowledge = (id: string, byName: string) => {
    const h = items.find((x) => x.id === id);
    if (!h) return;
    saveShiftHandover({
      ...h,
      status: "acknowledged",
      acknowledgedBy: byName,
      acknowledgedAt: Date.now(),
    });
    toast.success("Devir-teslim raporu onaylandı");
    reload();
  };

  if (filtered.length === 0) {
    return (
      <div
        data-ocid="handover.empty_state"
        className="p-8 rounded-2xl text-center"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="text-4xl mb-3">📋</div>
        <p className="text-slate-400 text-sm">
          Henüz devir-teslim raporu oluşturulmamış.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((h, idx) => (
        <div
          key={h.id}
          data-ocid={`handover.item.${idx + 1}`}
          className="p-4 rounded-2xl space-y-3"
          style={{
            background:
              h.status === "pending"
                ? "rgba(245,158,11,0.06)"
                : "rgba(255,255,255,0.03)",
            border: `1px solid ${
              h.status === "pending"
                ? "rgba(245,158,11,0.3)"
                : "rgba(255,255,255,0.08)"
            }`,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-white text-sm font-semibold">
                {h.shiftType === "sabah"
                  ? "🌅"
                  : h.shiftType === "akşam"
                    ? "🌇"
                    : "🌙"}{" "}
                {h.shiftType.charAt(0).toUpperCase() + h.shiftType.slice(1)}{" "}
                Vardiyası
              </p>
              <p className="text-slate-400 text-xs mt-0.5">
                {h.createdBy} &bull;{" "}
                {new Date(h.createdAt).toLocaleString("tr-TR")}
              </p>
            </div>
            <span
              className="px-2 py-0.5 rounded-lg text-xs font-semibold whitespace-nowrap"
              style={{
                background:
                  h.status === "pending"
                    ? "rgba(245,158,11,0.2)"
                    : "rgba(34,197,94,0.15)",
                color: h.status === "pending" ? "#f59e0b" : "#22c55e",
              }}
            >
              {h.status === "pending" ? "⏳ Onay Bekliyor" : "✅ Onaylandı"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div
              className="rounded-lg p-2"
              style={{ background: "rgba(14,165,233,0.08)" }}
            >
              <span className="text-cyan-400 font-bold">
                {h.activeVisitorCount}
              </span>
              <p className="text-slate-500 mt-0.5">Aktif</p>
            </div>
            <div
              className="rounded-lg p-2"
              style={{ background: "rgba(245,158,11,0.08)" }}
            >
              <span className="text-amber-400 font-bold">
                {h.pendingApprovalCount}
              </span>
              <p className="text-slate-500 mt-0.5">Bekleyen</p>
            </div>
            <div
              className="rounded-lg p-2"
              style={{ background: "rgba(239,68,68,0.08)" }}
            >
              <span className="text-red-400 font-bold">{h.incidentCount}</span>
              <p className="text-slate-500 mt-0.5">Olay</p>
            </div>
          </div>
          {h.openIssues && (
            <div>
              <p className="text-amber-400 text-xs font-semibold mb-0.5">
                ⚠️ Açık Sorunlar
              </p>
              <p className="text-slate-300 text-xs whitespace-pre-wrap">
                {h.openIssues}
              </p>
            </div>
          )}
          {h.notes && (
            <div>
              <p className="text-slate-400 text-xs font-semibold mb-0.5">
                📝 Notlar
              </p>
              <p className="text-slate-300 text-xs whitespace-pre-wrap">
                {h.notes}
              </p>
            </div>
          )}
          {h.status === "acknowledged" && h.acknowledgedBy && (
            <p className="text-green-400 text-xs">
              ✅ {h.acknowledgedBy} tarafından onaylandı &bull;{" "}
              {new Date(h.acknowledgedAt!).toLocaleString("tr-TR")}
            </p>
          )}
          {h.status === "pending" && !staffName && (
            <button
              type="button"
              data-ocid={`handover.acknowledge_button.${idx + 1}`}
              onClick={() => acknowledge(h.id, "Yönetici")}
              className="w-full py-2 rounded-xl text-xs font-semibold text-white transition-all"
              style={{
                background: "rgba(34,197,94,0.25)",
                border: "1px solid rgba(34,197,94,0.4)",
              }}
            >
              ✅ Onaylandı Olarak İşaretle
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
