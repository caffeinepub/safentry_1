import { useCallback, useEffect, useState } from "react";
import ConfirmModal from "../components/ConfirmModal";
import LangSwitcher from "../components/LangSwitcher";
import QRCode from "../components/QRCode";
import SignatureCanvas from "../components/SignatureCanvas";
import { getLang, t } from "../i18n";
import {
  clearSession,
  findCompanyById,
  findStaffById,
  getSession,
  getStaffByCompany,
  getVisitors,
  isBlacklisted,
  refreshSession,
  saveStaff,
  saveVisitor,
} from "../store";
import type { AppScreen, Staff, Visitor } from "../types";
import {
  durationLabel,
  formatDateTime,
  generateVisitorId,
  hoursSince,
} from "../utils";
import { generateVisitorBadgePDF } from "../utils/visitorBadge";

const LABEL_COLORS: Record<string, string> = {
  normal: "#3b82f6",
  vip: "#f59e0b",
  attention: "#f97316",
  restricted: "#ef4444",
};

interface Props {
  onNavigate: (s: AppScreen) => void;
  onRefresh: () => void;
}

type Tab = "register" | "active" | "preregistered";

const EMPTY_FORM = {
  name: "",
  idNumber: "",
  phone: "",
  hostStaffId: "",
  arrivalTime: new Date().toISOString().slice(0, 16),
  visitReason: "",
  visitType: "business",
  vehiclePlate: "",
  ndaAccepted: false,
  signatureData: "",
  label: "normal" as Visitor["label"],
};

export default function StaffDashboard({ onNavigate, onRefresh }: Props) {
  const lang = getLang();
  const session = getSession()!;
  const staff = findStaffById(session.staffId!)!;
  const company = findCompanyById(session.companyId);
  const [tab, setTab] = useState<Tab>("register");
  const [form, setForm] = useState(EMPTY_FORM);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [formError, setFormError] = useState("");
  const [registeredVisitor, setRegisteredVisitor] = useState<Visitor | null>(
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [availability, setAvailability] = useState(
    staff?.availabilityStatus ?? "available",
  );
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);

  const reload = useCallback(() => {
    setVisitors(getVisitors(session.companyId));
    setStaffList(getStaffByCompany(session.companyId));
    refreshSession();
  }, [session.companyId]);

  useEffect(() => {
    reload();
    const timer = setInterval(() => reload(), 60000);
    return () => clearInterval(timer);
  }, [reload]);

  const logout = () => {
    clearSession();
    onNavigate("welcome");
  };

  const setAvail = (status: Staff["availabilityStatus"]) => {
    setAvailability(status);
    if (staff) saveStaff({ ...staff, availabilityStatus: status });
  };

  const submitVisitor = () => {
    if (!form.name || !form.idNumber || !form.phone || !form.hostStaffId) {
      setFormError("Lütfen zorunlu alanları doldurun.");
      return;
    }
    if (!form.ndaAccepted) {
      setFormError("Gizlilik sözleşmesini onaylamalısınız.");
      return;
    }
    if (!form.signatureData) {
      setFormError("Lütfen dijital imza atın.");
      return;
    }
    if (isBlacklisted(session.companyId, form.idNumber)) {
      setFormError("⚠️ Bu ziyaretçi kara listede!");
      return;
    }
    const visitorId = generateVisitorId();
    const visitor: Visitor = {
      visitorId,
      companyId: session.companyId,
      registeredBy: session.staffId!,
      name: form.name,
      idNumber: form.idNumber,
      phone: form.phone,
      hostStaffId: form.hostStaffId,
      arrivalTime: new Date(form.arrivalTime).getTime(),
      visitReason: form.visitReason,
      visitType: form.visitType,
      ndaAccepted: form.ndaAccepted,
      signatureData: form.signatureData,
      vehiclePlate: form.vehiclePlate || undefined,
      label: form.label,
      status: "active",
      badgeQr: visitorId,
      notes: "",
      createdAt: Date.now(),
    };
    saveVisitor(visitor);
    setRegisteredVisitor(visitor);
    setForm({
      ...EMPTY_FORM,
      arrivalTime: new Date().toISOString().slice(0, 16),
    });
    setFormError("");
    reload();
  };

  const checkout = (v: Visitor) => {
    setConfirmAction(() => () => {
      saveVisitor({ ...v, status: "departed", departureTime: Date.now() });
      reload();
      setConfirmOpen(false);
    });
    setConfirmOpen(true);
  };

  const downloadPDF = async (v: Visitor) => {
    setPdfLoading(v.visitorId);
    try {
      const hostName = staffList.find((s) => s.staffId === v.hostStaffId)?.name;
      await generateVisitorBadgePDF(v, company?.name ?? "Safentry", hostName);
    } catch (err) {
      console.error("PDF generation failed", err);
    } finally {
      setPdfLoading(null);
    }
  };

  const activeVisitors = visitors.filter((v) => v.status === "active");
  const preregistered = visitors.filter((v) => v.status === "preregistered");

  const AVAIL_OPTIONS: {
    key: Staff["availabilityStatus"];
    label: string;
    color: string;
  }[] = [
    { key: "available", label: t(lang, "available"), color: "#22c55e" },
    { key: "in_meeting", label: t(lang, "inMeeting"), color: "#f59e0b" },
    { key: "outside", label: t(lang, "outside"), color: "#94a3b8" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#0a0f1e" }}>
      <ConfirmModal
        open={confirmOpen}
        onConfirm={confirmAction}
        onCancel={() => setConfirmOpen(false)}
      />
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div>
          <div className="text-xl font-bold text-white">
            <span style={{ color: "#0ea5e9" }}>Safe</span>ntry
          </div>
          <div className="text-xs text-slate-400">
            {staff?.name} &bull; {company?.name}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {AVAIL_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.key}
                data-ocid={`avail.${opt.key}.button`}
                onClick={() => setAvail(opt.key)}
                className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                style={
                  availability === opt.key
                    ? { background: opt.color, color: "white" }
                    : {
                        background: "rgba(255,255,255,0.05)",
                        color: "#94a3b8",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
          <LangSwitcher onChange={onRefresh} />
          <button
            type="button"
            data-ocid="staff_dashboard.logout.button"
            onClick={logout}
            className="text-slate-400 hover:text-white text-sm"
          >
            {t(lang, "logout")}
          </button>
        </div>
      </div>

      {/* Active visitors notification */}
      {activeVisitors.length > 0 && (
        <div className="mx-6 mt-4 p-3 rounded-xl border border-[#0ea5e9]/30 bg-[#0ea5e9]/10 text-[#0ea5e9] text-sm">
          👥 {activeVisitors.length} ziyaretçi içeride
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4 border-b border-white/10">
        {(
          [
            ["register", t(lang, "registerVisitor")],
            [
              "active",
              `${t(lang, "activeVisitors")} (${activeVisitors.length})`,
            ],
            ["preregistered", t(lang, "preregistered")],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            type="button"
            key={key}
            data-ocid={`staff_dashboard.${key}.tab`}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
              tab === key
                ? "text-white border-b-2 border-[#f59e0b]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* REGISTER TAB */}
        {tab === "register" && (
          <div className="max-w-2xl">
            {registeredVisitor && (
              <div className="mb-6 p-4 rounded-2xl border border-[#0ea5e9]/30 bg-[#0ea5e9]/10">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[#0ea5e9] font-semibold mb-1">
                      ✅ {registeredVisitor.name} kaydedildi!
                    </div>
                    <div className="text-slate-400 text-sm font-mono">
                      ID: {registeredVisitor.visitorId}
                    </div>
                  </div>
                  <QRCode value={registeredVisitor.visitorId} size={80} />
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    data-ocid="register.print_badge.button"
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-lg text-sm text-white"
                    style={{ background: "rgba(255,255,255,0.1)" }}
                  >
                    {t(lang, "printBadge")}
                  </button>
                  <button
                    type="button"
                    data-ocid="register.pdf_download.button"
                    onClick={() => downloadPDF(registeredVisitor)}
                    disabled={pdfLoading === registeredVisitor.visitorId}
                    className="px-4 py-2 rounded-lg text-sm text-white flex items-center gap-1"
                    style={{
                      background: "rgba(14,165,233,0.2)",
                      border: "1px solid rgba(14,165,233,0.4)",
                    }}
                  >
                    {pdfLoading === registeredVisitor.visitorId ? "⏳" : "📄"}{" "}
                    PDF İndir
                  </button>
                </div>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-slate-300 text-sm mb-1 block">
                  {t(lang, "visitorName")} *
                </p>
                <input
                  data-ocid="register.name.input"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#f59e0b]"
                />
              </div>
              <div>
                <p className="text-slate-300 text-sm mb-1 block">
                  {t(lang, "idNumber")} *
                </p>
                <input
                  data-ocid="register.idnumber.input"
                  value={form.idNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, idNumber: e.target.value }))
                  }
                  maxLength={11}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#f59e0b] font-mono"
                />
              </div>
              <div>
                <p className="text-slate-300 text-sm mb-1 block">
                  {t(lang, "phone")} *
                </p>
                <input
                  data-ocid="register.phone.input"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#f59e0b]"
                />
              </div>
              <div>
                <p className="text-slate-300 text-sm mb-1 block">
                  {t(lang, "host")} *
                </p>
                <select
                  data-ocid="register.host.select"
                  value={form.hostStaffId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hostStaffId: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-xl bg-[#0f1729] border border-white/20 text-white focus:outline-none"
                >
                  <option value="">Seçin...</option>
                  {staffList.map((s) => (
                    <option
                      key={s.staffId}
                      value={s.staffId}
                      className="bg-[#0f1729]"
                    >
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-slate-300 text-sm mb-1 block">
                  {t(lang, "arrivalTime")}
                </p>
                <input
                  data-ocid="register.arrival.input"
                  type="datetime-local"
                  value={form.arrivalTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, arrivalTime: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none"
                />
              </div>
              <div>
                <p className="text-slate-300 text-sm mb-1 block">
                  {t(lang, "visitType")}
                </p>
                <select
                  data-ocid="register.visittype.select"
                  value={form.visitType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, visitType: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-xl bg-[#0f1729] border border-white/20 text-white focus:outline-none"
                >
                  {[
                    "business",
                    "personal",
                    "delivery",
                    "maintenance",
                    "other",
                  ].map((vt) => (
                    <option key={vt} value={vt} className="bg-[#0f1729]">
                      {t(lang, vt as Parameters<typeof t>[1])}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <p className="text-slate-300 text-sm mb-1 block">
                  {t(lang, "visitReason")}
                </p>
                <input
                  data-ocid="register.reason.input"
                  value={form.visitReason}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, visitReason: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none"
                />
              </div>
              <div>
                <p className="text-slate-300 text-sm mb-1 block">
                  {t(lang, "vehiclePlate")}
                </p>
                <input
                  data-ocid="register.plate.input"
                  value={form.vehiclePlate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, vehiclePlate: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none"
                />
              </div>
              <div>
                <p className="text-slate-300 text-sm mb-1 block">
                  {t(lang, "label")}
                </p>
                <select
                  data-ocid="register.label.select"
                  value={form.label}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      label: e.target.value as Visitor["label"],
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl bg-[#0f1729] border border-white/20 text-white focus:outline-none"
                >
                  {["normal", "vip", "attention", "restricted"].map((l) => (
                    <option key={l} value={l} className="bg-[#0f1729]">
                      {t(lang, l as Parameters<typeof t>[1])}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    data-ocid="register.nda.checkbox"
                    type="checkbox"
                    checked={form.ndaAccepted}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ndaAccepted: e.target.checked }))
                    }
                    className="w-4 h-4 rounded accent-[#0ea5e9]"
                  />
                  <span className="text-slate-300 text-sm">
                    {t(lang, "ndaAccept")}
                  </span>
                </label>
              </div>
              <div>
                <p className="text-slate-300 text-sm mb-2 block">
                  {t(lang, "signature")} *
                </p>
                <SignatureCanvas
                  value={form.signatureData}
                  onChange={(data) =>
                    setForm((f) => ({ ...f, signatureData: data }))
                  }
                />
              </div>
            </div>
            {formError && (
              <p
                data-ocid="register.error_state"
                className="mt-4 text-red-400 text-sm"
              >
                {formError}
              </p>
            )}
            <button
              type="button"
              data-ocid="visitor.add_button"
              onClick={submitVisitor}
              className="mt-6 w-full py-3 rounded-xl font-semibold text-white text-lg"
              style={{
                background: "linear-gradient(135deg, #f59e0b, #ef4444)",
              }}
            >
              {t(lang, "registerVisitor")}
            </button>
          </div>
        )}

        {/* ACTIVE VISITORS TAB */}
        {tab === "active" && (
          <div>
            {activeVisitors.length === 0 ? (
              <div
                data-ocid="active_visitors.empty_state"
                className="text-center py-16 text-slate-500"
              >
                {t(lang, "noVisitors")}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {activeVisitors.map((v, i) => {
                  const over4h = hoursSince(v.arrivalTime) >= 4;
                  return (
                    <div
                      key={v.visitorId}
                      data-ocid={`active_visitors.item.${i + 1}`}
                      className={`p-5 rounded-2xl border ${
                        over4h ? "border-amber-500/50" : "border-white/10"
                      }`}
                      style={{
                        background: over4h
                          ? "rgba(245,158,11,0.08)"
                          : "rgba(255,255,255,0.03)",
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-white font-semibold">
                            {v.name}
                          </div>
                          <div className="text-slate-400 text-xs">
                            {v.phone}
                          </div>
                        </div>
                        <span
                          className="px-2 py-0.5 rounded-full text-white text-xs font-semibold"
                          style={{ background: LABEL_COLORS[v.label] }}
                        >
                          {v.label.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-slate-400 text-sm mb-1">
                        Host:{" "}
                        {staffList.find((s) => s.staffId === v.hostStaffId)
                          ?.name ?? v.hostStaffId}
                      </div>
                      <div className="text-slate-400 text-sm mb-1">
                        Giriş: {formatDateTime(v.arrivalTime)}
                      </div>
                      <div className="text-slate-400 text-sm mb-3">
                        Süre:{" "}
                        <span
                          className={
                            over4h
                              ? "text-amber-400 font-semibold"
                              : "text-white"
                          }
                        >
                          {durationLabel(v.arrivalTime)}
                        </span>
                        {over4h && " ⚠️"}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          data-ocid={`active_visitors.checkout.button.${i + 1}`}
                          onClick={() => checkout(v)}
                          className="flex-1 py-2 rounded-lg text-sm font-medium text-white"
                          style={{
                            background: "rgba(239,68,68,0.2)",
                            border: "1px solid rgba(239,68,68,0.4)",
                          }}
                        >
                          {t(lang, "checkout")}
                        </button>
                        <button
                          type="button"
                          data-ocid={`pdf.download_button.${i + 1}`}
                          onClick={() => downloadPDF(v)}
                          disabled={pdfLoading === v.visitorId}
                          className="px-3 py-2 rounded-lg text-sm font-medium text-white"
                          style={{
                            background: "rgba(14,165,233,0.15)",
                            border: "1px solid rgba(14,165,233,0.3)",
                          }}
                        >
                          {pdfLoading === v.visitorId ? "⏳" : "📄"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PREREGISTERED TAB */}
        {tab === "preregistered" && (
          <div>
            {preregistered.length === 0 ? (
              <div
                data-ocid="preregistered.empty_state"
                className="text-center py-16 text-slate-500"
              >
                Ön kayıt bulunamadı.
              </div>
            ) : (
              <div className="space-y-3">
                {preregistered.map((v, i) => (
                  <div
                    key={v.visitorId}
                    data-ocid={`preregistered.item.${i + 1}`}
                    className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5"
                  >
                    <div>
                      <div className="text-white font-medium">{v.name}</div>
                      <div className="text-slate-400 text-xs">
                        {formatDateTime(v.arrivalTime)} &bull; {v.visitType}
                      </div>
                    </div>
                    <button
                      type="button"
                      data-ocid={`preregistered.activate.button.${i + 1}`}
                      onClick={() => {
                        saveVisitor({
                          ...v,
                          status: "active",
                          arrivalTime: Date.now(),
                        });
                        reload();
                      }}
                      className="px-3 py-1 rounded-lg text-xs text-white"
                      style={{
                        background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                      }}
                    >
                      Aktifleştir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
