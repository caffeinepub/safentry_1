import React, { useState } from "react";
import { toast } from "sonner";

interface TimelineEntry {
  timestamp: number;
  action: string;
  note: string;
  performedBy: string;
}

interface Investigation {
  id: string;
  title: string;
  status: "open" | "closed" | "pending";
  priority: "low" | "medium" | "high" | "critical";
  createdAt: number;
  closedAt: number | null;
  createdBy: string;
  description: string;
  linkedIncidentIds: string[];
  linkedVisitorIds: string[];
  linkedStaffIds: string[];
  timeline: TimelineEntry[];
  outcome: string | null;
}

function getInvestigations(companyId: string): Investigation[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_investigations_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}

function saveInvestigations(companyId: string, data: Investigation[]) {
  localStorage.setItem(
    `safentry_investigations_${companyId}`,
    JSON.stringify(data),
  );
}

const STATUS_CONFIG = {
  open: {
    label: "Açık",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.3)",
  },
  pending: {
    label: "Beklemede",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.3)",
  },
  closed: {
    label: "Kapalı",
    color: "#64748b",
    bg: "rgba(100,116,139,0.12)",
    border: "rgba(100,116,139,0.3)",
  },
};

const PRIORITY_CONFIG = {
  low: { label: "Düşük", color: "#94a3b8", icon: "⬇️" },
  medium: { label: "Orta", color: "#f59e0b", icon: "➡️" },
  high: { label: "Yüksek", color: "#f97316", icon: "⬆️" },
  critical: { label: "Kritik", color: "#ef4444", icon: "🔴" },
};

function formatDT(ts: number) {
  return new Date(ts).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  companyId: string;
  currentUser: string | undefined;
}

export default function InvestigationTab({ companyId, currentUser }: Props) {
  const [items, setItems] = useState<Investigation[]>(() =>
    getInvestigations(companyId),
  );
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium" as Investigation["priority"],
  });
  const [timelineNote, setTimelineNote] = useState("");
  const [closeModal, setCloseModal] = useState<{
    id: string;
    outcome: string;
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | Investigation["status"]
  >("all");

  const filtered = items.filter(
    (i) => statusFilter === "all" || i.status === statusFilter,
  );

  const handleCreate = () => {
    if (!form.title.trim()) {
      toast.error("Başlık zorunludur");
      return;
    }
    const inv: Investigation = {
      id: `inv_${Date.now()}`,
      title: form.title.trim(),
      status: "open",
      priority: form.priority,
      createdAt: Date.now(),
      closedAt: null,
      createdBy: currentUser ?? "Sistem",
      description: form.description.trim(),
      linkedIncidentIds: [],
      linkedVisitorIds: [],
      linkedStaffIds: [],
      timeline: [
        {
          timestamp: Date.now(),
          action: "Soruşturma açıldı",
          note: form.description.trim(),
          performedBy: currentUser ?? "Sistem",
        },
      ],
      outcome: null,
    };
    const updated = [inv, ...items];
    saveInvestigations(companyId, updated);
    setItems(updated);
    setForm({ title: "", description: "", priority: "medium" });
    setShowForm(false);
    toast.success("🔍 Soruşturma oluşturuldu");
  };

  const addTimeline = (id: string) => {
    if (!timelineNote.trim()) {
      toast.error("Not zorunludur");
      return;
    }
    const updated = items.map((inv) =>
      inv.id === id
        ? {
            ...inv,
            timeline: [
              ...inv.timeline,
              {
                timestamp: Date.now(),
                action: "Not eklendi",
                note: timelineNote.trim(),
                performedBy: currentUser ?? "Sistem",
              },
            ],
          }
        : inv,
    );
    saveInvestigations(companyId, updated);
    setItems(updated);
    setTimelineNote("");
    toast.success("Zaman çizelgesi güncellendi");
  };

  const closeInvestigation = () => {
    if (!closeModal) return;
    const updated = items.map((inv) =>
      inv.id === closeModal.id
        ? {
            ...inv,
            status: "closed" as const,
            closedAt: Date.now(),
            outcome: closeModal.outcome,
            timeline: [
              ...inv.timeline,
              {
                timestamp: Date.now(),
                action: "Soruşturma kapatıldı",
                note: closeModal.outcome,
                performedBy: currentUser ?? "Sistem",
              },
            ],
          }
        : inv,
    );
    saveInvestigations(companyId, updated);
    setItems(updated);
    setCloseModal(null);
    toast.success("Soruşturma kapatıldı");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-white font-bold text-lg">
            🔍 Güvenlik Soruşturmaları
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Toplam{" "}
            <span className="text-white font-medium">{items.length}</span>{" "}
            soruşturma
          </p>
        </div>
        <button
          type="button"
          data-ocid="investigation.open_modal_button"
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2"
          style={{
            background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
            border: "1px solid rgba(14,165,233,0.4)",
          }}
        >
          + Yeni Soruşturma
        </button>
      </div>

      {/* New form */}
      {showForm && (
        <div
          data-ocid="investigation.modal"
          className="p-5 rounded-2xl space-y-4"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(14,165,233,0.2)",
          }}
        >
          <h3 className="text-white font-semibold">Yeni Soruşturma Dosyası</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <p className="text-slate-300 text-xs mb-1">Başlık *</p>
              <input
                data-ocid="investigation.title.input"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Soruşturma başlığı"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9]"
              />
            </div>
            <div className="sm:col-span-2">
              <p className="text-slate-300 text-xs mb-1">Açıklama</p>
              <textarea
                data-ocid="investigation.description.textarea"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={3}
                placeholder="Soruşturma detayları..."
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white resize-none focus:outline-none focus:border-[#0ea5e9]"
              />
            </div>
            <div>
              <p className="text-slate-300 text-xs mb-1">Öncelik</p>
              <select
                data-ocid="investigation.priority.select"
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    priority: e.target.value as Investigation["priority"],
                  }))
                }
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9]"
              >
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                  <option key={k} value={k} style={{ background: "#1e293b" }}>
                    {v.icon} {v.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              data-ocid="investigation.submit_button"
              onClick={handleCreate}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
            >
              Oluştur
            </button>
            <button
              type="button"
              data-ocid="investigation.cancel_button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {(["all", "open", "pending", "closed"] as const).map((s) => {
          const labels = {
            all: "Tümü",
            open: "Açık",
            pending: "Beklemede",
            closed: "Kapalı",
          };
          return (
            <button
              type="button"
              key={s}
              data-ocid={`investigation.${s}.tab`}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={
                statusFilter === s
                  ? {
                      background: "rgba(14,165,233,0.25)",
                      border: "1px solid rgba(14,165,233,0.5)",
                      color: "#fff",
                    }
                  : {
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#94a3b8",
                    }
              }
            >
              {labels[s]}
            </button>
          );
        })}
      </div>

      {/* Investigation cards */}
      {filtered.length === 0 ? (
        <div
          data-ocid="investigation.empty_state"
          className="text-center py-16 text-slate-500"
        >
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-sm">Soruşturma bulunamadı</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv, idx) => {
            const sc = STATUS_CONFIG[inv.status];
            const pc = PRIORITY_CONFIG[inv.priority];
            const isExpanded = expandedId === inv.id;
            return (
              <div
                key={inv.id}
                data-ocid={`investigation.item.${idx + 1}`}
                className="rounded-2xl overflow-hidden"
                style={{ border: `1px solid ${sc.border}`, background: sc.bg }}
              >
                {/* Card header */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                  className="w-full text-left p-4 flex items-start justify-between gap-3 hover:opacity-90 transition-opacity"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-white font-semibold text-sm">
                          {inv.title}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            background: sc.bg,
                            color: sc.color,
                            border: `1px solid ${sc.border}`,
                          }}
                        >
                          {sc.label}
                        </span>
                        <span className="text-xs" style={{ color: pc.color }}>
                          {pc.icon} {pc.label}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs">
                        {formatDT(inv.createdAt)} • {inv.createdBy}
                      </p>
                      <div className="flex gap-3 mt-1 text-xs text-slate-500">
                        <span>📋 {inv.linkedIncidentIds.length} olay</span>
                        <span>👤 {inv.linkedVisitorIds.length} ziyaretçi</span>
                        <span>🕐 {inv.timeline.length} adım</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-slate-400 text-lg">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div
                    className="px-4 pb-4 space-y-4"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {inv.description && (
                      <p className="text-slate-300 text-sm pt-3">
                        {inv.description}
                      </p>
                    )}

                    {/* Timeline */}
                    <div>
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">
                        Zaman Çizelgesi
                      </p>
                      <div className="space-y-2">
                        {inv.timeline.map((tl, ti) => (
                          <div
                            key={`${tl.timestamp}-${ti}`}
                            className="flex gap-3 items-start"
                          >
                            <div
                              className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                              style={{ background: "#0ea5e9" }}
                            />
                            <div>
                              <p className="text-white text-xs font-medium">
                                {tl.action}
                              </p>
                              {tl.note && (
                                <p className="text-slate-400 text-xs">
                                  {tl.note}
                                </p>
                              )}
                              <p className="text-slate-600 text-xs">
                                {formatDT(tl.timestamp)} • {tl.performedBy}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add timeline note */}
                    {inv.status !== "closed" && (
                      <div className="flex gap-2">
                        <input
                          value={timelineNote}
                          onChange={(e) => setTimelineNote(e.target.value)}
                          placeholder="Zaman çizelgesine not ekle..."
                          className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                        />
                        <button
                          type="button"
                          onClick={() => addTimeline(inv.id)}
                          className="px-3 py-2 rounded-lg text-sm text-white"
                          style={{
                            background: "rgba(14,165,233,0.2)",
                            border: "1px solid rgba(14,165,233,0.4)",
                          }}
                        >
                          + Not
                        </button>
                      </div>
                    )}

                    {/* Close button */}
                    {inv.status !== "closed" && (
                      <button
                        type="button"
                        data-ocid={`investigation.close.button.${idx + 1}`}
                        onClick={() =>
                          setCloseModal({ id: inv.id, outcome: "" })
                        }
                        className="px-4 py-2 rounded-xl text-xs font-medium text-amber-300 hover:text-white transition-colors"
                        style={{
                          background: "rgba(245,158,11,0.1)",
                          border: "1px solid rgba(245,158,11,0.3)",
                        }}
                      >
                        ✓ Soruşturmayı Kapat
                      </button>
                    )}

                    {inv.outcome && (
                      <div
                        className="p-3 rounded-lg text-xs"
                        style={{
                          background: "rgba(14,165,233,0.08)",
                          border: "1px solid rgba(14,165,233,0.2)",
                        }}
                      >
                        <p className="text-[#7dd3fc] font-medium mb-0.5">
                          Sonuç
                        </p>
                        <p className="text-slate-300">{inv.outcome}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Close modal */}
      {closeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-md p-6 rounded-2xl space-y-4"
            style={{
              background: "#0f1729",
              border: "1.5px solid rgba(245,158,11,0.3)",
            }}
          >
            <h3 className="text-white font-bold">Soruşturmayı Kapat</h3>
            <p className="text-slate-400 text-sm">
              Soruşturmanın sonucunu ve çözümünü açıklayın.
            </p>
            <textarea
              value={closeModal.outcome}
              onChange={(e) =>
                setCloseModal({ ...closeModal, outcome: e.target.value })
              }
              rows={3}
              placeholder="Soruşturma sonucu ve alınan önlemler..."
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white resize-none focus:outline-none focus:border-[#f59e0b]"
            />
            <div className="flex gap-3">
              <button
                type="button"
                data-ocid="investigation.confirm_button"
                onClick={closeInvestigation}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg,#f59e0b,#d97706)",
                }}
              >
                Kapat
              </button>
              <button
                type="button"
                data-ocid="investigation.cancel_button"
                onClick={() => setCloseModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-300"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
