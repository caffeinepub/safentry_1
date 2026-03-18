import { useState } from "react";
import { toast } from "sonner";
import type { EscortAssignment } from "../store";
import {
  deleteEscort,
  getEscorts,
  getStaffByCompany,
  getVisitors,
  saveEscort,
} from "../store";
import { generateId } from "../utils";

interface Props {
  companyId: string;
  visitors: import("../types").Visitor[];
  staffList: import("../types").Staff[];
}

export default function EscortTab({ companyId, visitors, staffList }: Props) {
  const [escorts, setEscorts] = useState<EscortAssignment[]>(() =>
    getEscorts(companyId),
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    visitorId: "",
    staffId: "",
    notes: "",
  });

  const reload = () => setEscorts(getEscorts(companyId));

  const activeVisitors = visitors.filter((v) => v.status === "active");

  const assign = () => {
    if (!form.visitorId || !form.staffId) {
      toast.error("Ziyaretçi ve personel seçimi zorunludur.");
      return;
    }
    const visitor = activeVisitors.find((v) => v.visitorId === form.visitorId);
    const staff = staffList.find((s) => s.staffId === form.staffId);
    if (!visitor || !staff) return;
    const entry: EscortAssignment = {
      id: generateId(),
      companyId,
      visitorId: form.visitorId,
      visitorName: visitor.name,
      staffId: form.staffId,
      staffName: staff.name,
      status: "assigned",
      assignedAt: Date.now(),
      notes: form.notes,
    };
    saveEscort(entry);
    setForm({ visitorId: "", staffId: "", notes: "" });
    setShowForm(false);
    toast.success("Refakatçi atandı.");
    reload();
  };

  const updateStatus = (
    e: EscortAssignment,
    status: EscortAssignment["status"],
  ) => {
    const updated: EscortAssignment = {
      ...e,
      status,
      ...(status === "active" ? { takenAt: Date.now() } : {}),
      ...(status === "completed" ? { handedAt: Date.now() } : {}),
    };
    saveEscort(updated);
    toast.success(
      status === "active" ? "Teslim alındı." : "Refakat tamamlandı.",
    );
    reload();
  };

  const remove = (id: string) => {
    deleteEscort(companyId, id);
    reload();
  };

  const statusLabel = (s: EscortAssignment["status"]) => {
    if (s === "assigned") return { label: "Atandı", color: "#0ea5e9" };
    if (s === "active") return { label: "Aktif", color: "#22c55e" };
    return { label: "Tamamlandı", color: "#64748b" };
  };

  return (
    <div className="space-y-6" data-ocid="escorts.section">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-xl">🛡️ Refakatçi Atama</h2>
          <p className="text-slate-400 text-sm">
            VIP ve özel ziyaretçilere personel refakatçi ata
          </p>
        </div>
        <button
          type="button"
          data-ocid="escorts.open_modal_button"
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
        >
          + Refakatçi Ata
        </button>
      </div>

      {showForm && (
        <div
          className="p-5 rounded-2xl space-y-4"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(14,165,233,0.3)",
          }}
          data-ocid="escorts.dialog"
        >
          <h3 className="text-white font-semibold">Yeni Refakatçi Atama</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-slate-300 text-sm mb-1">Ziyaretçi *</p>
              <select
                data-ocid="escorts.visitor.select"
                value={form.visitorId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, visitorId: e.target.value }))
                }
                className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9] text-sm"
              >
                <option value="" className="bg-slate-900">
                  Ziyaretçi seç...
                </option>
                {activeVisitors.map((v) => (
                  <option
                    key={v.visitorId}
                    value={v.visitorId}
                    className="bg-slate-900"
                  >
                    {v.name} ({v.category})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-slate-300 text-sm mb-1">Personel *</p>
              <select
                data-ocid="escorts.staff.select"
                value={form.staffId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, staffId: e.target.value }))
                }
                className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9] text-sm"
              >
                <option value="" className="bg-slate-900">
                  Personel seç...
                </option>
                {staffList.map((s) => (
                  <option
                    key={s.staffId}
                    value={s.staffId}
                    className="bg-slate-900"
                  >
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <p className="text-slate-300 text-sm mb-1">Notlar</p>
            <textarea
              data-ocid="escorts.notes.textarea"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={2}
              placeholder="Özel talimatlar..."
              className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-[#0ea5e9] text-sm resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              data-ocid="escorts.submit_button"
              onClick={assign}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
            >
              Ata
            </button>
            <button
              type="button"
              data-ocid="escorts.cancel_button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2 rounded-xl text-sm text-slate-300 border border-white/20 hover:bg-white/10"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {escorts.length === 0 ? (
        <div data-ocid="escorts.empty_state" className="text-center py-16">
          <div className="text-5xl mb-3">🛡️</div>
          <p className="text-slate-400">Henüz refakatçi ataması yok.</p>
          <p className="text-slate-500 text-sm">
            Aktif ziyaretçilere güvenlik personeli eşliği atayabilirsiniz.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {escorts.map((e, i) => {
            const { label, color } = statusLabel(e.status);
            return (
              <div
                key={e.id}
                data-ocid={`escorts.item.${i + 1}`}
                className="p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold text-sm">
                      {e.visitorName}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{ background: `${color}20`, color }}
                    >
                      {label}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Refakatçi:{" "}
                    <span className="text-slate-300">{e.staffName}</span>
                  </p>
                  {e.notes && (
                    <p className="text-slate-500 text-xs mt-0.5">
                      📝 {e.notes}
                    </p>
                  )}
                  <p className="text-slate-600 text-xs mt-0.5">
                    Atandı: {new Date(e.assignedAt).toLocaleString("tr-TR")}
                    {e.takenAt
                      ? ` · Teslim alındı: ${new Date(e.takenAt).toLocaleString("tr-TR")}`
                      : ""}
                    {e.handedAt
                      ? ` · Teslim edildi: ${new Date(e.handedAt).toLocaleString("tr-TR")}`
                      : ""}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {e.status === "assigned" && (
                    <button
                      type="button"
                      data-ocid={`escorts.taken.${i + 1}`}
                      onClick={() => updateStatus(e, "active")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                      style={{
                        background: "linear-gradient(135deg,#22c55e,#16a34a)",
                      }}
                    >
                      ✅ Teslim Aldım
                    </button>
                  )}
                  {e.status === "active" && (
                    <button
                      type="button"
                      data-ocid={`escorts.handed.${i + 1}`}
                      onClick={() => updateStatus(e, "completed")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                      style={{
                        background: "linear-gradient(135deg,#f59e0b,#d97706)",
                      }}
                    >
                      🤝 Teslim Ettim
                    </button>
                  )}
                  <button
                    type="button"
                    data-ocid={`escorts.delete_button.${i + 1}`}
                    onClick={() => remove(e.id)}
                    className="px-3 py-1.5 rounded-lg text-xs text-red-400 border border-red-500/30 hover:bg-red-900/20"
                  >
                    Sil
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
