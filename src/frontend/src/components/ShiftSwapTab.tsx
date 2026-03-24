import { useState } from "react";
import { toast } from "sonner";
import type { ShiftSwapRequest, Staff } from "../types";
import { generateId } from "../utils";

function getShiftSwaps(companyId: string): ShiftSwapRequest[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_shift_swaps_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}
function saveShiftSwap(req: ShiftSwapRequest): void {
  const all = getShiftSwaps(req.companyId);
  const idx = all.findIndex((r) => r.swapId === req.swapId);
  if (idx >= 0) all[idx] = req;
  else all.unshift(req);
  localStorage.setItem(
    `safentry_shift_swaps_${req.companyId}`,
    JSON.stringify(all),
  );
}

interface Props {
  companyId: string;
  staffId: string;
  staffName: string;
  staffList: Staff[];
  isAdmin?: boolean;
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

const STATUS_LABELS: Record<ShiftSwapRequest["status"], string> = {
  pending: "⏳ Bekliyor",
  accepted_by_peer: "✅ Eş Onayladı",
  rejected_by_peer: "❌ Eş Reddetti",
  approved: "✔️ Yönetici Onayladı",
  rejected: "✘ Reddedildi",
};
const STATUS_COLORS: Record<ShiftSwapRequest["status"], string> = {
  pending: "#f59e0b",
  accepted_by_peer: "#22c55e",
  rejected_by_peer: "#ef4444",
  approved: "#14b8a6",
  rejected: "#ef4444",
};

export default function ShiftSwapTab({
  companyId,
  staffId,
  staffName,
  staffList,
  isAdmin,
}: Props) {
  const [view, setView] = useState<"list" | "create">("list");
  const [_tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const swaps = getShiftSwaps(companyId);
  const mine = swaps.filter(
    (s) => s.requesterId === staffId || s.targetId === staffId,
  );
  const pending = swaps.filter(
    (s) => s.targetId === staffId && s.status === "pending",
  );

  const [form, setForm] = useState({
    shiftDate: new Date().toISOString().slice(0, 10),
    shiftTime: "09:00",
    targetId: "",
    note: "",
  });

  const submit = () => {
    if (!form.targetId || !form.shiftDate) {
      toast.error("Lütfen tüm alanları doldurun");
      return;
    }
    const target = staffList.find((s) => s.staffId === form.targetId);
    if (!target) return;
    const req: ShiftSwapRequest = {
      swapId: generateId(),
      companyId,
      requesterId: staffId,
      requesterName: staffName,
      targetId: form.targetId,
      targetName: target.name,
      shiftDate: form.shiftDate,
      shiftTime: form.shiftTime,
      note: form.note,
      status: "pending",
      createdAt: Date.now(),
    };
    saveShiftSwap(req);
    toast.success("Vardiya değişim talebi gönderildi");
    setForm({
      shiftDate: new Date().toISOString().slice(0, 10),
      shiftTime: "09:00",
      targetId: "",
      note: "",
    });
    setView("list");
    refresh();
  };

  const respond = (swap: ShiftSwapRequest, accept: boolean) => {
    const updated: ShiftSwapRequest = {
      ...swap,
      status: accept ? "accepted_by_peer" : "rejected_by_peer",
    };
    saveShiftSwap(updated);
    toast.success(accept ? "Talep onaylandı" : "Talep reddedildi");
    refresh();
  };

  const adminDecide = (swap: ShiftSwapRequest, approve: boolean) => {
    const updated: ShiftSwapRequest = {
      ...swap,
      status: approve ? "approved" : "rejected",
    };
    saveShiftSwap(updated);
    toast.success(approve ? "Onaylandı" : "Reddedildi");
    refresh();
  };

  const displaySwaps = isAdmin ? swaps : mine;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold text-lg">🔁 Vardiya Değişim</h2>
        {!isAdmin && (
          <button
            type="button"
            data-ocid="shift_swap.create.button"
            onClick={() => setView(view === "create" ? "list" : "create")}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
            style={{
              background:
                view === "create"
                  ? "rgba(14,165,233,0.2)"
                  : "rgba(14,165,233,0.12)",
              border: "1px solid rgba(14,165,233,0.35)",
            }}
          >
            {view === "create" ? "← Listeye Dön" : "+ Yeni Talep"}
          </button>
        )}
      </div>

      {/* Incoming requests banner */}
      {pending.length > 0 && view === "list" && (
        <div
          className="p-3 rounded-xl text-sm"
          style={{
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.3)",
            color: "#fbbf24",
          }}
        >
          📬 {pending.length} adet bekleyen vardiya değişim talebiniz var.
        </div>
      )}

      {view === "create" && !isAdmin && (
        <div
          className="p-5 rounded-2xl space-y-4"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <h3 className="text-white font-medium">Yeni Değişim Talebi</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-slate-400 text-xs mb-1">Vardiya Tarihi</p>
              <input
                data-ocid="shift_swap.date.input"
                type="date"
                value={form.shiftDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, shiftDate: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white text-sm focus:outline-none"
              />
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Vardiya Saati</p>
              <input
                data-ocid="shift_swap.time.input"
                type="time"
                value={form.shiftTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, shiftTime: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white text-sm focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <p className="text-slate-400 text-xs mb-1">
                Değişim Yapılacak Personel
              </p>
              <select
                data-ocid="shift_swap.target.select"
                value={form.targetId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, targetId: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl bg-[#1e293b] border border-white/15 text-white text-sm focus:outline-none"
              >
                <option value="">Personel Seçin</option>
                {staffList
                  .filter((s) => s.staffId !== staffId)
                  .map((s) => (
                    <option key={s.staffId} value={s.staffId}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="col-span-2">
              <p className="text-slate-400 text-xs mb-1">Not (isteğe bağlı)</p>
              <textarea
                data-ocid="shift_swap.note.textarea"
                value={form.note}
                onChange={(e) =>
                  setForm((f) => ({ ...f, note: e.target.value }))
                }
                placeholder="Değişim sebebinizi yazın..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white text-sm focus:outline-none resize-none"
              />
            </div>
          </div>
          <button
            type="button"
            data-ocid="shift_swap.submit.button"
            onClick={submit}
            className="w-full py-2.5 rounded-xl font-semibold text-white text-sm transition-all"
            style={{
              background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
              border: "1px solid rgba(14,165,233,0.4)",
            }}
          >
            📤 Talep Gönder
          </button>
        </div>
      )}

      {view === "list" && (
        <div className="space-y-3">
          {displaySwaps.length === 0 ? (
            <div
              data-ocid="shift_swap.empty_state"
              className="text-center py-12 text-slate-500"
            >
              <div className="text-4xl mb-3">🔁</div>
              <p>Henüz vardiya değişim talebi yok</p>
            </div>
          ) : (
            displaySwaps.map((swap, i) => (
              <div
                key={swap.swapId}
                data-ocid={`shift_swap.item.${i + 1}`}
                className="p-4 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.09)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-white text-sm font-medium">
                        {swap.requesterName} → {swap.targetName}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: `${STATUS_COLORS[swap.status]}22`,
                          color: STATUS_COLORS[swap.status],
                        }}
                      >
                        {STATUS_LABELS[swap.status]}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs">
                      📅 {swap.shiftDate} {swap.shiftTime} &bull; Talep:{" "}
                      {fmt(swap.createdAt)}
                    </p>
                    {swap.note && (
                      <p className="text-slate-500 text-xs mt-1">
                        💬 {swap.note}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {/* Target peer responds */}
                    {swap.targetId === staffId && swap.status === "pending" && (
                      <>
                        <button
                          type="button"
                          data-ocid={`shift_swap.accept.button.${i + 1}`}
                          onClick={() => respond(swap, true)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                          style={{
                            background: "rgba(34,197,94,0.2)",
                            border: "1px solid rgba(34,197,94,0.4)",
                          }}
                        >
                          ✓ Kabul
                        </button>
                        <button
                          type="button"
                          data-ocid={`shift_swap.reject.button.${i + 1}`}
                          onClick={() => respond(swap, false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                          style={{
                            background: "rgba(239,68,68,0.12)",
                            border: "1px solid rgba(239,68,68,0.3)",
                          }}
                        >
                          ✕ Reddet
                        </button>
                      </>
                    )}
                    {/* Admin approves */}
                    {isAdmin && swap.status === "accepted_by_peer" && (
                      <>
                        <button
                          type="button"
                          data-ocid={`shift_swap.admin_approve.button.${i + 1}`}
                          onClick={() => adminDecide(swap, true)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                          style={{
                            background: "rgba(20,184,166,0.2)",
                            border: "1px solid rgba(20,184,166,0.4)",
                          }}
                        >
                          ✔ Onayla
                        </button>
                        <button
                          type="button"
                          data-ocid={`shift_swap.admin_reject.button.${i + 1}`}
                          onClick={() => adminDecide(swap, false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                          style={{
                            background: "rgba(239,68,68,0.12)",
                            border: "1px solid rgba(239,68,68,0.3)",
                          }}
                        >
                          ✘ Reddet
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
