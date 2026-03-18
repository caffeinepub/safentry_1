import { useState } from "react";
import { toast } from "sonner";
import { getBranches, saveVisitor } from "../store";
import type { Staff, Visitor } from "../types";
import { generateId } from "../utils";

interface Props {
  visitor: Visitor;
  companyId: string;
  staffId: string;
  staffList: Staff[];
  onClose: () => void;
  onCreated: () => void;
}

export default function ReinviteModal({
  visitor,
  companyId,
  staffId,
  staffList,
  onClose,
  onCreated,
}: Props) {
  const [form, setForm] = useState({
    name: visitor.name,
    idNumber: visitor.idNumber,
    phone: visitor.phone,
    visitReason: visitor.visitReason,
    category: visitor.category ?? "Misafir",
    hostStaffId: visitor.hostStaffId,
    department: visitor.department ?? "",
    floor: visitor.floor ?? "",
    notes: "",
  });
  const [mode, setMode] = useState<"register" | "prereg">("register");
  const [preregLink, setPreregLink] = useState("");
  const branches = getBranches(companyId);

  const handleRegister = () => {
    const now = Date.now();
    const newVisitor: Visitor = {
      visitorId: generateId(),
      companyId,
      registeredBy: staffId,
      name: form.name,
      idNumber: form.idNumber,
      phone: form.phone,
      hostStaffId: form.hostStaffId,
      arrivalTime: now,
      visitReason: form.visitReason,
      visitType: "business",
      ndaAccepted: true,
      signatureData: "",
      label: "normal",
      status: "active",
      badgeQr: `SAF-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      notes: form.notes,
      category: form.category,
      createdAt: now,
      department: form.department,
      floor: form.floor,
    };
    saveVisitor(newVisitor);
    toast.success(`${form.name} tekrar kaydedildi ve giriş oluşturuldu.`);
    onCreated();
    onClose();
  };

  const handlePreregLink = () => {
    const params = new URLSearchParams({
      name: form.name,
      tc: form.idNumber,
      phone: form.phone,
      purpose: form.visitReason,
      company: companyId,
    });
    const url = `${window.location.origin}${window.location.pathname}?prereg=1&${params.toString()}`;
    setPreregLink(url);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(preregLink);
      toast.success("Link kopyalandı!");
    } catch {
      const el = document.createElement("textarea");
      el.value = preregLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      toast.success("Link kopyalandı!");
    }
  };

  return (
    <div
      data-ocid="reinvite.modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-lg p-6 rounded-2xl overflow-y-auto max-h-[90vh]"
        style={{
          background: "#0f1729",
          border: "1.5px solid rgba(14,165,233,0.4)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold text-lg">🔄 Tekrar Davet Et</h3>
          <button
            type="button"
            data-ocid="reinvite.close_button"
            onClick={onClose}
            className="text-slate-500 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        <div
          className="flex p-1 rounded-xl mb-5"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          {(["register", "prereg"] as const).map((m) => (
            <button
              key={m}
              type="button"
              data-ocid={`reinvite.mode_${m}.toggle`}
              onClick={() => setMode(m)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background:
                  mode === m ? "rgba(14,165,233,0.25)" : "transparent",
                color: mode === m ? "#0ea5e9" : "#64748b",
                border: mode === m ? "1px solid rgba(14,165,233,0.4)" : "none",
              }}
            >
              {m === "register" ? "✅ Anında Kayıt" : "🔗 Ön Kayıt Linki"}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-slate-400 text-xs block mb-1">
                Ad Soyad
              </span>
              <input
                data-ocid="reinvite.name.input"
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              />
            </label>
            <label className="block">
              <span className="text-slate-400 text-xs block mb-1">
                TC / Kimlik No
              </span>
              <input
                data-ocid="reinvite.idnumber.input"
                type="text"
                value={form.idNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, idNumber: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-slate-400 text-xs block mb-1">Telefon</span>
              <input
                type="text"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              />
            </label>
            <label className="block">
              <span className="text-slate-400 text-xs block mb-1">
                Kategori
              </span>
              <input
                type="text"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-slate-400 text-xs block mb-1">
              Ev Sahibi Personel
            </span>
            <select
              data-ocid="reinvite.host.select"
              value={form.hostStaffId}
              onChange={(e) =>
                setForm((f) => ({ ...f, hostStaffId: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <option value="">— Personel Seç —</option>
              {staffList.map((s) => (
                <option key={s.staffId} value={s.staffId}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-slate-400 text-xs block mb-1">
              Ziyaret Amacı
            </span>
            <input
              data-ocid="reinvite.purpose.input"
              type="text"
              value={form.visitReason}
              onChange={(e) =>
                setForm((f) => ({ ...f, visitReason: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            />
          </label>
          {branches.length > 1 && (
            <label className="block">
              <span className="text-slate-400 text-xs block mb-1">Şube</span>
              <select
                value={form.department}
                onChange={(e) =>
                  setForm((f) => ({ ...f, department: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <option value="">Ana Şube</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {mode === "register" && (
            <label className="block">
              <span className="text-slate-400 text-xs block mb-1">Notlar</span>
              <input
                type="text"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="İsteğe bağlı not..."
                className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              />
            </label>
          )}
        </div>

        {mode === "prereg" && preregLink && (
          <div
            className="mt-4 p-3 rounded-xl"
            style={{
              background: "rgba(14,165,233,0.08)",
              border: "1px solid rgba(14,165,233,0.25)",
            }}
          >
            <p className="text-slate-400 text-xs mb-2">Ön kayıt linki:</p>
            <p className="text-sky-400 text-xs break-all font-mono mb-3">
              {preregLink}
            </p>
            <button
              type="button"
              data-ocid="reinvite.copy.button"
              onClick={copyLink}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
              style={{
                background: "rgba(14,165,233,0.2)",
                border: "1px solid rgba(14,165,233,0.4)",
              }}
            >
              📋 Kopyala
            </button>
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button
            type="button"
            data-ocid="reinvite.cancel_button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-slate-300 text-sm"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            İptal
          </button>
          {mode === "register" ? (
            <button
              type="button"
              data-ocid="reinvite.confirm_button"
              onClick={handleRegister}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
            >
              Kayıt Oluştur
            </button>
          ) : (
            <button
              type="button"
              data-ocid="reinvite.prereg_button"
              onClick={handlePreregLink}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
            >
              🔗 Link Oluştur
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
