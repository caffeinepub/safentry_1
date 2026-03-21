import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  findCompanyById,
  getSession,
  getStaffByCompany,
  getVisitors,
  saveVisitor,
} from "../store";
import type { AppScreen, Visitor } from "../types";
import { generateId } from "../utils";

interface Props {
  onNavigate: (s: AppScreen) => void;
}

interface QuickForm {
  name: string;
  idNumber: string;
  host: string;
  purpose: string;
}

const EMPTY_FORM: QuickForm = {
  name: "",
  idNumber: "",
  host: "",
  purpose: "",
};

export default function ReceptionDeskMode({ onNavigate }: Props) {
  const session = getSession();
  const companyId = session?.companyId ?? "";
  const company = findCompanyById(companyId);
  const staffList = getStaffByCompany(companyId);

  const [form, setForm] = useState<QuickForm>(EMPTY_FORM);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [view, setView] = useState<"register" | "active" | "pending">(
    "register",
  );
  const [submitting, setSubmitting] = useState(false);
  const [, setTick] = useState(0);

  const reload = useCallback(() => {
    setVisitors(getVisitors(companyId));
  }, [companyId]);

  useEffect(() => {
    reload();
    const interval = setInterval(() => {
      reload();
      setTick((t) => t + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, [reload]);

  const activeVisitors = visitors.filter((v) => v.status === "active");
  const pendingVisitors = visitors.filter((v) => v.status === "preregistered");

  const handleRegister = () => {
    if (!form.name.trim()) {
      toast.error("Ziyaretçi adı zorunludur");
      return;
    }
    setSubmitting(true);
    const visitor: Visitor = {
      visitorId: generateId(),
      companyId,
      registeredBy: session?.staffId ?? "",
      name: form.name.trim(),
      idNumber: form.idNumber.trim(),
      phone: "",
      visitReason: form.purpose.trim() || "Genel Ziyaret",
      visitType: "walkIn",
      ndaAccepted: false,
      signatureData: "",
      label: "normal",
      status: "active",
      badgeQr: generateId(),
      notes: "",
      hostStaffId: form.host,
      arrivalTime: Date.now(),
      createdAt: Date.now(),
      category: "Misafir",
    };
    saveVisitor(visitor);
    reload();
    setForm(EMPTY_FORM);
    setSubmitting(false);
    toast.success(`${visitor.name} kaydedildi ve içeri alındı`);
  };

  const handleCheckout = (v: Visitor) => {
    saveVisitor({ ...v, status: "departed", departureTime: Date.now() });
    reload();
    toast.success(`${v.name} çıkış yaptı`);
  };

  const handleApprove = (v: Visitor) => {
    saveVisitor({ ...v, status: "active" });
    reload();
    toast.success(`${v.name} onaylandı`);
  };

  const handleReject = (v: Visitor) => {
    saveVisitor({ ...v, status: "departed", notes: "Reddedildi" });
    reload();
    toast.error(`${v.name} reddedildi`);
  };

  const navBtn = (key: typeof view, label: string, count?: number) => (
    <button
      type="button"
      onClick={() => setView(key)}
      data-ocid={`reception.${key}_tab`}
      className="flex-1 py-4 rounded-2xl text-lg font-bold transition-all relative"
      style={{
        background:
          view === key ? "rgba(0,212,170,0.2)" : "rgba(255,255,255,0.05)",
        border:
          view === key
            ? "2px solid #00d4aa"
            : "2px solid rgba(255,255,255,0.1)",
        color: view === key ? "#00d4aa" : "#94a3b8",
      }}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
          style={{ background: "#ef4444", color: "white" }}
        >
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0a0f1e" }}
      data-ocid="reception.page"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-8 py-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            data-ocid="reception.close_button"
            onClick={() => onNavigate("staff-dashboard")}
            className="text-slate-400 hover:text-white text-2xl transition-colors"
          >
            ✕
          </button>
          <div>
            <h1 className="text-white text-2xl font-bold">🖥️ Resepsiyon Modu</h1>
            <p className="text-slate-400 text-sm">
              {company?.name ?? companyId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: "#00d4aa" }}>
              {activeVisitors.length}
            </div>
            <div className="text-slate-400 text-xs">İçeride</div>
          </div>
          <div className="text-center">
            <div
              className="text-3xl font-bold"
              style={{
                color: pendingVisitors.length > 0 ? "#f59e0b" : "#94a3b8",
              }}
            >
              {pendingVisitors.length}
            </div>
            <div className="text-slate-400 text-xs">Bekliyor</div>
          </div>
        </div>
      </div>

      {/* Nav tabs */}
      <div className="flex gap-4 px-8 py-4">
        {navBtn("register", "➕ Hızlı Kayıt")}
        {navBtn("active", "✅ Aktif Ziyaretçiler", activeVisitors.length)}
        {navBtn("pending", "⏳ Onay Bekleyenler", pendingVisitors.length)}
      </div>

      {/* Content */}
      <div className="flex-1 px-8 py-4 overflow-y-auto">
        {/* REGISTER VIEW */}
        {view === "register" && (
          <div className="max-w-xl mx-auto space-y-5">
            <h2 className="text-white text-xl font-bold mb-6">
              Yeni Ziyaretçi Kaydı
            </h2>
            <div>
              <label
                htmlFor="reception.name.input"
                className="text-slate-300 text-sm block mb-2"
              >
                Ad Soyad *
              </label>
              <input
                id="reception.name.input"
                data-ocid="reception.name.input"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ziyaretçi adı soyadı"
                className="w-full px-5 py-4 rounded-2xl text-white text-lg focus:outline-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "2px solid rgba(255,255,255,0.15)",
                }}
                onKeyDown={(e) => e.key === "Enter" && handleRegister()}
              />
            </div>
            <div>
              <label
                htmlFor="reception.id.input"
                className="text-slate-300 text-sm block mb-2"
              >
                TC Kimlik No
              </label>
              <input
                id="reception.id.input"
                data-ocid="reception.id.input"
                value={form.idNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, idNumber: e.target.value }))
                }
                placeholder="11 haneli TC (isteğe bağlı)"
                maxLength={11}
                className="w-full px-5 py-4 rounded-2xl text-white text-lg focus:outline-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "2px solid rgba(255,255,255,0.15)",
                }}
              />
            </div>
            <div>
              <label
                htmlFor="reception.host.select"
                className="text-slate-300 text-sm block mb-2"
              >
                Ev Sahibi Personel
              </label>
              <select
                id="reception.host.select"
                data-ocid="reception.host.select"
                value={form.host}
                onChange={(e) =>
                  setForm((f) => ({ ...f, host: e.target.value }))
                }
                className="w-full px-5 py-4 rounded-2xl text-white text-lg focus:outline-none"
                style={{
                  background: "#0d1424",
                  border: "2px solid rgba(255,255,255,0.15)",
                }}
              >
                <option value="">-- Personel seçin --</option>
                {staffList.map((s) => (
                  <option key={s.staffId} value={s.staffId}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="reception.purpose.input"
                className="text-slate-300 text-sm block mb-2"
              >
                Ziyaret Amacı
              </label>
              <input
                id="reception.purpose.input"
                data-ocid="reception.purpose.input"
                value={form.purpose}
                onChange={(e) =>
                  setForm((f) => ({ ...f, purpose: e.target.value }))
                }
                placeholder="Toplantı, Teslimat, vb."
                className="w-full px-5 py-4 rounded-2xl text-white text-lg focus:outline-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "2px solid rgba(255,255,255,0.15)",
                }}
                onKeyDown={(e) => e.key === "Enter" && handleRegister()}
              />
            </div>
            <button
              type="button"
              data-ocid="reception.register.primary_button"
              onClick={handleRegister}
              disabled={submitting || !form.name.trim()}
              className="w-full py-5 rounded-2xl text-xl font-bold text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#00d4aa,#0ea5e9)" }}
            >
              ✅ Ziyaretçiyi Kaydet & İçeri Al
            </button>
          </div>
        )}

        {/* ACTIVE VISITORS */}
        {view === "active" && (
          <div className="space-y-4" data-ocid="reception.active.list">
            <h2 className="text-white text-xl font-bold mb-4">
              Aktif Ziyaretçiler ({activeVisitors.length})
            </h2>
            {activeVisitors.length === 0 && (
              <div
                data-ocid="reception.active.empty_state"
                className="text-center py-16"
              >
                <div className="text-6xl mb-4">🏢</div>
                <p className="text-slate-400 text-lg">İçeride ziyaretçi yok</p>
              </div>
            )}
            {activeVisitors.map((v, i) => {
              const mins = Math.floor((Date.now() - v.arrivalTime) / 60000);
              const hostName = staffList.find(
                (s) => s.staffId === v.hostStaffId,
              )?.name;
              return (
                <div
                  key={v.visitorId}
                  data-ocid={`reception.visitor.item.${i + 1}`}
                  className="flex items-center justify-between p-5 rounded-2xl"
                  style={{
                    background: "rgba(0,212,170,0.06)",
                    border: "1.5px solid rgba(0,212,170,0.2)",
                  }}
                >
                  <div>
                    <div className="text-white text-xl font-bold">{v.name}</div>
                    <div className="text-slate-400 text-sm mt-1">
                      {hostName ? `👤 ${hostName}` : ""}
                      {hostName && v.visitReason ? " · " : ""}
                      {v.visitReason}
                    </div>
                    <div className="text-teal-400 text-sm mt-1">
                      ⏱️ {mins} dk önce giriş yaptı
                    </div>
                  </div>
                  <button
                    type="button"
                    data-ocid={`reception.checkout.button.${i + 1}`}
                    onClick={() => handleCheckout(v)}
                    className="px-6 py-3 rounded-xl text-base font-bold text-white"
                    style={{
                      background: "linear-gradient(135deg,#ef4444,#dc2626)",
                    }}
                  >
                    Çıkış Yap
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* PENDING APPROVALS */}
        {view === "pending" && (
          <div className="space-y-4" data-ocid="reception.pending.list">
            <h2 className="text-white text-xl font-bold mb-4">
              Onay Bekleyenler ({pendingVisitors.length})
            </h2>
            {pendingVisitors.length === 0 && (
              <div
                data-ocid="reception.pending.empty_state"
                className="text-center py-16"
              >
                <div className="text-6xl mb-4">✅</div>
                <p className="text-slate-400 text-lg">Bekleyen onay yok</p>
              </div>
            )}
            {pendingVisitors.map((v, i) => {
              const mins = Math.floor((Date.now() - v.arrivalTime) / 60000);
              const hostName = staffList.find(
                (s) => s.staffId === v.hostStaffId,
              )?.name;
              return (
                <div
                  key={v.visitorId}
                  data-ocid={`reception.pending.item.${i + 1}`}
                  className="flex items-center justify-between p-5 rounded-2xl"
                  style={{
                    background: "rgba(245,158,11,0.07)",
                    border: "1.5px solid rgba(245,158,11,0.3)",
                  }}
                >
                  <div>
                    <div className="text-white text-xl font-bold">{v.name}</div>
                    <div className="text-slate-400 text-sm mt-1">
                      {hostName ? `👤 ${hostName}` : ""}
                      {v.visitReason ? ` · ${v.visitReason}` : ""}
                    </div>
                    <div className="text-amber-400 text-sm mt-1">
                      ⏳ {mins} dk bekleniyor
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      data-ocid={`reception.approve.button.${i + 1}`}
                      onClick={() => handleApprove(v)}
                      className="px-5 py-3 rounded-xl text-base font-bold text-white"
                      style={{
                        background: "linear-gradient(135deg,#22c55e,#16a34a)",
                      }}
                    >
                      ✅ Kabul
                    </button>
                    <button
                      type="button"
                      data-ocid={`reception.reject.button.${i + 1}`}
                      onClick={() => handleReject(v)}
                      className="px-5 py-3 rounded-xl text-base font-bold text-white"
                      style={{
                        background: "linear-gradient(135deg,#ef4444,#dc2626)",
                      }}
                    >
                      ✕ Reddet
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
