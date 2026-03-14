import { useCallback, useEffect, useState } from "react";
import LangSwitcher from "../components/LangSwitcher";
import QRCode from "../components/QRCode";
import SignatureCanvas from "../components/SignatureCanvas";
import { getLang, t } from "../i18n";
import {
  clearSession,
  findCompanyById,
  findStaffById,
  getAllStaff,
  getAppointments,
  getSession,
  getStaffByCompany,
  getVisitors,
  isBlacklisted,
  refreshSession,
  saveAppointment,
  saveStaff,
  saveVisitor,
} from "../store";
import type { AppScreen, Appointment, Company, Staff, Visitor } from "../types";
import {
  durationLabel,
  formatDateTime,
  generateId,
  generateVisitorId,
  hoursSince,
} from "../utils";
import { generateVisitorBadgePDF } from "../utils/visitorBadge";

const LABEL_COLORS: Record<string, string> = {
  normal: "#0ea5e9",
  vip: "#f59e0b",
  attention: "#f97316",
  restricted: "#a855f7",
};

const LABEL_BORDER_COLORS: Record<string, string> = {
  normal: "rgba(14,165,233,0.4)",
  vip: "rgba(245,158,11,0.4)",
  attention: "rgba(249,115,22,0.4)",
  restricted: "rgba(168,85,247,0.4)",
};

interface Props {
  onNavigate: (s: AppScreen) => void;
  onRefresh: () => void;
}

type Tab =
  | "register"
  | "active"
  | "inside"
  | "appointments"
  | "preregistered"
  | "profile";

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

const EMPTY_APPT = {
  visitorName: "",
  visitorId: "",
  hostName: "",
  appointmentDate: new Date().toISOString().slice(0, 10),
  appointmentTime: "09:00",
  purpose: "",
  notes: "",
};

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          data-ocid={`exit_rating.star.${star}`}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="text-3xl transition-transform hover:scale-110"
          style={{
            color:
              star <= (hover || value) ? "#f59e0b" : "rgba(255,255,255,0.2)",
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function StaffDashboard({ onNavigate, onRefresh }: Props) {
  const lang = getLang();
  const session = getSession()!;
  const staff = findStaffById(session.staffId!)!;
  const company = findCompanyById(session.companyId);
  const [tab, setTab] = useState<Tab>("register");
  const [form, setForm] = useState(EMPTY_FORM);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [formError, setFormError] = useState("");
  const [registeredVisitor, setRegisteredVisitor] = useState<Visitor | null>(
    null,
  );
  const [availability, setAvailability] = useState(
    staff?.availabilityStatus ?? "available",
  );
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Returning visitor suggestion
  const [returningSuggestion, setReturningSuggestion] =
    useState<Visitor | null>(null);

  // Exit rating modal
  const [exitModalVisitor, setExitModalVisitor] = useState<Visitor | null>(
    null,
  );
  const [exitRating, setExitRating] = useState(0);
  const [exitComment, setExitComment] = useState("");

  // Appointment form
  const [apptForm, setApptForm] = useState(EMPTY_APPT);
  const [apptError, setApptError] = useState("");
  const [apptTab, setApptTab] = useState<"today" | "create">("today");

  const reload = useCallback(() => {
    setVisitors(getVisitors(session.companyId));
    setStaffList(getStaffByCompany(session.companyId));
    setAppointments(getAppointments(session.companyId));
    refreshSession();
  }, [session.companyId]);

  useEffect(() => {
    reload();
    const timer = setInterval(() => reload(), 60000);
    return () => clearInterval(timer);
  }, [reload]);

  // Tick every minute for live elapsed time
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const logout = () => {
    clearSession();
    onNavigate("welcome");
  };

  const setAvail = (status: Staff["availabilityStatus"]) => {
    setAvailability(status);
    if (staff) saveStaff({ ...staff, availabilityStatus: status });
  };

  const copyCode = (code: string, key: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(key);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Get all companies this staff member belongs to
  const staffCompanies: Company[] = (() => {
    const allStaff = getAllStaff();
    const companyIds = [
      ...new Set(
        allStaff
          .filter((s) => s.staffId === staff?.staffId)
          .map((s) => s.companyId),
      ),
    ];
    return companyIds
      .map((cid) => findCompanyById(cid))
      .filter((c): c is Company => c !== null);
  })();

  // Returning visitor: check when idNumber changes
  const handleIdNumberChange = (val: string) => {
    setForm((f) => ({ ...f, idNumber: val }));
    if (val.length >= 6) {
      const match = visitors
        .filter((v) => v.idNumber === val && v.status === "departed")
        .sort((a, b) => b.createdAt - a.createdAt)[0];
      setReturningSuggestion(match ?? null);
    } else {
      setReturningSuggestion(null);
    }
  };

  const applyReturningSuggestion = () => {
    if (!returningSuggestion) return;
    setForm((f) => ({
      ...f,
      name: returningSuggestion.name,
      phone: returningSuggestion.phone,
      visitType: returningSuggestion.visitType,
    }));
    setReturningSuggestion(null);
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
      setFormError(t(lang, "blacklistedPerson"));
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
    setReturningSuggestion(null);
    reload();
  };

  // Open exit rating modal
  const openExitModal = (v: Visitor) => {
    setExitModalVisitor(v);
    setExitRating(0);
    setExitComment("");
  };

  const confirmExit = () => {
    if (!exitModalVisitor || exitRating === 0) return;
    saveVisitor({
      ...exitModalVisitor,
      status: "departed",
      departureTime: Date.now(),
      exitRating,
      exitComment: exitComment.trim() || undefined,
    });
    setExitModalVisitor(null);
    setExitRating(0);
    setExitComment("");
    reload();
  };

  const checkout = (v: Visitor) => {
    openExitModal(v);
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

  const printBadge = async (v: Visitor) => {
    setPdfLoading(`${v.visitorId}_print`);
    try {
      const hostName = staffList.find((s) => s.staffId === v.hostStaffId)?.name;
      await generateVisitorBadgePDF(
        v,
        company?.name ?? "Safentry",
        hostName,
        true,
      );
    } catch (err) {
      console.error("Print failed", err);
    } finally {
      setPdfLoading(null);
    }
  };

  const submitAppointment = () => {
    if (
      !apptForm.visitorName ||
      !apptForm.visitorId ||
      !apptForm.hostName ||
      !apptForm.purpose
    ) {
      setApptError("Lütfen zorunlu alanları doldurun.");
      return;
    }
    const appt: Appointment = {
      id: generateId(),
      companyId: session.companyId,
      visitorName: apptForm.visitorName,
      visitorId: apptForm.visitorId,
      hostName: apptForm.hostName,
      appointmentDate: apptForm.appointmentDate,
      appointmentTime: apptForm.appointmentTime,
      purpose: apptForm.purpose,
      notes: apptForm.notes || undefined,
      status: "pending",
      createdBy: session.staffId ?? "",
      createdAt: Date.now(),
    };
    saveAppointment(appt);
    setApptForm(EMPTY_APPT);
    setApptError("");
    reload();
  };

  const approveAppointment = (appt: Appointment) => {
    saveAppointment({ ...appt, status: "approved" });
    // Pre-fill visitor form
    setForm((f) => ({
      ...f,
      name: appt.visitorName,
      idNumber: appt.visitorId,
      visitReason: appt.purpose,
      arrivalTime: new Date().toISOString().slice(0, 16),
    }));
    setTab("register");
    reload();
  };

  const cancelAppointment = (appt: Appointment) => {
    saveAppointment({ ...appt, status: "cancelled" });
    reload();
  };

  const activeVisitors = visitors.filter((v) => v.status === "active");
  const insideVisitors = visitors.filter((v) => v.status === "active");
  const preregistered = visitors.filter((v) => v.status === "preregistered");

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAppointments = appointments.filter(
    (a) => a.appointmentDate === todayStr && a.status !== "cancelled",
  );

  const AVAIL_OPTIONS: {
    key: Staff["availabilityStatus"];
    label: string;
    color: string;
  }[] = [
    { key: "available", label: t(lang, "available"), color: "#22c55e" },
    { key: "in_meeting", label: t(lang, "inMeeting"), color: "#f59e0b" },
    { key: "outside", label: t(lang, "outside"), color: "#94a3b8" },
  ];

  const TABS: [Tab, string][] = [
    ["register", t(lang, "registerVisitor")],
    ["active", `${t(lang, "activeVisitors")} (${activeVisitors.length})`],
    ["inside", `🏢 Şu An Binada (${insideVisitors.length})`],
    ["appointments", `📅 Randevular (${todayAppointments.length})`],
    ["preregistered", t(lang, "preregistered")],
    ["profile", "Hesabım"],
  ];

  return (
    <div className="min-h-screen" style={{ background: "#0a0f1e" }}>
      {/* Exit Rating Modal */}
      {exitModalVisitor && (
        <div
          data-ocid="exit_rating.modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-md p-6 rounded-2xl"
            style={{
              background: "#0f1729",
              border: "1.5px solid rgba(14,165,233,0.3)",
            }}
          >
            <h3 className="text-white font-bold text-lg mb-1">
              Çıkış Değerlendirmesi
            </h3>
            <p className="text-slate-400 text-sm mb-5">
              {exitModalVisitor.name} için çıkış kaydediliyor.
            </p>

            <div className="mb-4">
              <p className="text-slate-300 text-sm mb-2">Ziyaret Puanı *</p>
              <StarRating value={exitRating} onChange={setExitRating} />
              {exitRating > 0 && (
                <p className="text-slate-400 text-xs mt-1">
                  {
                    ["Kötü", "Orta", "İyi", "Çok İyi", "Mükemmel"][
                      exitRating - 1
                    ]
                  }
                </p>
              )}
            </div>

            <div className="mb-5">
              <p className="text-slate-300 text-sm mb-2">
                Yorum (isteğe bağlı)
              </p>
              <textarea
                data-ocid="exit_rating.comment.textarea"
                value={exitComment}
                onChange={(e) => setExitComment(e.target.value.slice(0, 200))}
                placeholder="Kısa bir yorum ekleyin..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none resize-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              />
              <p className="text-slate-600 text-xs text-right">
                {exitComment.length}/200
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                data-ocid="exit_rating.cancel_button"
                onClick={() => setExitModalVisitor(null)}
                className="flex-1 py-2.5 rounded-xl text-slate-300 text-sm font-medium transition-opacity hover:opacity-80"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                İptal
              </button>
              <button
                type="button"
                data-ocid="exit_rating.confirm_button"
                onClick={confirmExit}
                disabled={exitRating === 0}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{
                  background: "linear-gradient(135deg,#ef4444,#dc2626)",
                }}
              >
                Çıkışı Onayla
              </button>
            </div>
          </div>
        </div>
      )}

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
      <div className="flex overflow-x-auto gap-1 px-6 pt-4 border-b border-white/10">
        {TABS.map(([key, label]) => (
          <button
            type="button"
            key={key}
            data-ocid={`staff_dashboard.${key}.tab`}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-all ${
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
                    <div className="text-slate-400 text-xs font-mono">
                      ID: {registeredVisitor.visitorId}
                    </div>
                  </div>
                  <QRCode value={registeredVisitor.visitorId} size={80} />
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    data-ocid="register.print_badge.button"
                    onClick={() => printBadge(registeredVisitor)}
                    disabled={
                      pdfLoading === `${registeredVisitor.visitorId}_print`
                    }
                    className="px-4 py-2 rounded-lg text-sm text-white flex items-center gap-1"
                    style={{ background: "rgba(255,255,255,0.1)" }}
                  >
                    {pdfLoading === `${registeredVisitor.visitorId}_print`
                      ? "⏳"
                      : "🖨️"}{" "}
                    Yazdır
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

            {formError && (
              <div
                data-ocid="register.error_state"
                className="mb-4 p-4 rounded-xl border border-red-500/40 bg-red-900/25 flex items-start gap-3"
              >
                <span className="text-red-400 text-lg mt-0.5">⛔</span>
                <p className="text-red-400 text-sm font-medium">{formError}</p>
              </div>
            )}

            {/* Returning visitor suggestion */}
            {returningSuggestion && (
              <div
                data-ocid="register.returning_visitor.card"
                className="mb-4 p-4 rounded-xl border border-[#f59e0b]/40 bg-[#f59e0b]/10 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-amber-400 text-sm font-semibold">
                    🔄 Tekrarlayan Ziyaretçi
                  </p>
                  <p className="text-slate-300 text-xs mt-0.5">
                    {returningSuggestion.name} daha önce geldi — bilgileri
                    otomatik doldur?
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    data-ocid="register.autofill.button"
                    onClick={applyReturningSuggestion}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{
                      background: "rgba(245,158,11,0.3)",
                      border: "1px solid rgba(245,158,11,0.5)",
                    }}
                  >
                    Doldur
                  </button>
                  <button
                    type="button"
                    onClick={() => setReturningSuggestion(null)}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  >
                    Yoksay
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
                  onChange={(e) => handleIdNumberChange(e.target.value)}
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
                  placeholder="34 ABC 123"
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      vehiclePlate: e.target.value.toUpperCase(),
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none font-mono uppercase"
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
            <button
              type="button"
              data-ocid="visitor.add_button"
              onClick={submitVisitor}
              className="mt-6 w-full py-3 rounded-xl font-semibold text-white text-lg transition-opacity hover:opacity-90"
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
                      className="p-5 rounded-2xl transition-all hover:scale-[1.01]"
                      style={{
                        border: `1.5px solid ${LABEL_BORDER_COLORS[v.label]}`,
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
                        {t(lang, "arrivalAt")}: {formatDateTime(v.arrivalTime)}
                      </div>
                      {v.vehiclePlate && (
                        <div className="text-slate-400 text-sm mb-1">
                          🚗{" "}
                          <span className="font-mono text-white">
                            {v.vehiclePlate}
                          </span>
                        </div>
                      )}
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
                          className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-80 active:scale-95"
                          style={{
                            background: "rgba(239,68,68,0.25)",
                            border: "1px solid rgba(239,68,68,0.5)",
                          }}
                        >
                          {t(lang, "checkout")}
                        </button>
                        <button
                          type="button"
                          data-ocid={`pdf.download_button.${i + 1}`}
                          onClick={() => downloadPDF(v)}
                          disabled={pdfLoading === v.visitorId}
                          className="px-3 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-80"
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

        {/* ŞU AN BİNADA (INSIDE) TAB */}
        {tab === "inside" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-white font-bold text-xl">Şu An Binada</h2>
                <p className="text-slate-400 text-sm">
                  Henüz çıkış yapmamış ziyaretçiler
                </p>
              </div>
              <div
                className="px-5 py-3 rounded-2xl text-center"
                style={{
                  background:
                    "linear-gradient(135deg,rgba(14,165,233,0.2),rgba(2,132,199,0.2))",
                  border: "1.5px solid rgba(14,165,233,0.4)",
                }}
              >
                <div
                  className="text-3xl font-bold"
                  style={{ color: "#0ea5e9" }}
                >
                  {insideVisitors.length}
                </div>
                <div className="text-slate-400 text-xs">İçeride</div>
              </div>
            </div>

            {insideVisitors.length === 0 ? (
              <div
                data-ocid="inside.empty_state"
                className="text-center py-16 text-slate-500"
              >
                Şu an içeride ziyaretçi yok.
              </div>
            ) : (
              <div className="space-y-3">
                {insideVisitors
                  .slice()
                  .sort((a, b) => a.arrivalTime - b.arrivalTime)
                  .map((v, i) => {
                    const over4h = hoursSince(v.arrivalTime) >= 4;
                    const elapsed = durationLabel(v.arrivalTime);
                    return (
                      <div
                        key={v.visitorId}
                        data-ocid={`inside.item.${i + 1}`}
                        className="flex items-center justify-between p-4 rounded-2xl transition-all"
                        style={{
                          background: over4h
                            ? "rgba(245,158,11,0.08)"
                            : "rgba(255,255,255,0.04)",
                          border: `1.5px solid ${over4h ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.1)"}`,
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                            style={{ background: LABEL_COLORS[v.label] }}
                          >
                            {i + 1}
                          </div>
                          <div>
                            <div className="text-white font-semibold">
                              {v.name}
                            </div>
                            <div className="text-slate-400 text-xs">
                              {v.phone}
                              {v.vehiclePlate && (
                                <span className="ml-2 font-mono">
                                  🚗 {v.vehiclePlate}
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500 text-xs mt-0.5">
                              Host:{" "}
                              {staffList.find(
                                (s) => s.staffId === v.hostStaffId,
                              )?.name ?? v.hostStaffId}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div
                              className={`text-sm font-semibold ${over4h ? "text-amber-400" : "text-white"}`}
                            >
                              {elapsed} {over4h && "⚠️"}
                            </div>
                            <div className="text-slate-500 text-xs">
                              {formatDateTime(v.arrivalTime).split(" ")[1]}'dan
                              beri
                            </div>
                          </div>
                          <button
                            type="button"
                            data-ocid={`inside.checkout.button.${i + 1}`}
                            onClick={() => checkout(v)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-80"
                            style={{
                              background: "rgba(239,68,68,0.25)",
                              border: "1px solid rgba(239,68,68,0.5)",
                            }}
                          >
                            Çıkış
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* APPOINTMENTS TAB */}
        {tab === "appointments" && (
          <div>
            {/* Sub-tabs */}
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                data-ocid="appointments.today.tab"
                onClick={() => setApptTab("today")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  apptTab === "today"
                    ? "text-white"
                    : "text-slate-400 hover:text-white"
                }`}
                style={
                  apptTab === "today"
                    ? { background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }
                    : { background: "rgba(255,255,255,0.05)" }
                }
              >
                📋 Bugünün Randevuları ({todayAppointments.length})
              </button>
              <button
                type="button"
                data-ocid="appointments.create.tab"
                onClick={() => setApptTab("create")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  apptTab === "create"
                    ? "text-white"
                    : "text-slate-400 hover:text-white"
                }`}
                style={
                  apptTab === "create"
                    ? { background: "linear-gradient(135deg,#f59e0b,#d97706)" }
                    : { background: "rgba(255,255,255,0.05)" }
                }
              >
                + Yeni Randevu
              </button>
            </div>

            {apptTab === "today" && (
              <div>
                {todayAppointments.length === 0 ? (
                  <div
                    data-ocid="appointments.empty_state"
                    className="text-center py-16 text-slate-500"
                  >
                    Bugün için randevu bulunmuyor.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayAppointments.map((appt, i) => (
                      <div
                        key={appt.id}
                        data-ocid={`appointments.item.${i + 1}`}
                        className="p-4 rounded-2xl"
                        style={{
                          background:
                            appt.status === "approved"
                              ? "rgba(34,197,94,0.07)"
                              : "rgba(255,255,255,0.04)",
                          border:
                            appt.status === "approved"
                              ? "1.5px solid rgba(34,197,94,0.3)"
                              : "1.5px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-semibold">
                                {appt.visitorName}
                              </span>
                              <span
                                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                style={{
                                  background:
                                    appt.status === "approved"
                                      ? "rgba(34,197,94,0.2)"
                                      : "rgba(245,158,11,0.2)",
                                  color:
                                    appt.status === "approved"
                                      ? "#22c55e"
                                      : "#f59e0b",
                                }}
                              >
                                {appt.status === "approved"
                                  ? "✓ Onaylandı"
                                  : "Bekliyor"}
                              </span>
                            </div>
                            <div className="text-slate-400 text-sm">
                              🕐 {appt.appointmentTime} &bull; Host:{" "}
                              {appt.hostName}
                            </div>
                            <div className="text-slate-400 text-sm">
                              Amaç: {appt.purpose}
                            </div>
                            {appt.notes && (
                              <div className="text-slate-500 text-xs mt-1">
                                {appt.notes}
                              </div>
                            )}
                          </div>
                          {appt.status === "pending" && (
                            <div className="flex flex-col gap-2 shrink-0">
                              <button
                                type="button"
                                data-ocid={`appointments.approve_button.${i + 1}`}
                                onClick={() => approveAppointment(appt)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                                style={{
                                  background: "rgba(34,197,94,0.25)",
                                  border: "1px solid rgba(34,197,94,0.4)",
                                }}
                              >
                                ✓ Onayla & Giriş
                              </button>
                              <button
                                type="button"
                                data-ocid={`appointments.cancel_button.${i + 1}`}
                                onClick={() => cancelAppointment(appt)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400"
                                style={{
                                  background: "rgba(239,68,68,0.1)",
                                  border: "1px solid rgba(239,68,68,0.3)",
                                }}
                              >
                                İptal
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {apptTab === "create" && (
              <div className="max-w-lg">
                {apptError && (
                  <div className="mb-4 p-3 rounded-xl border border-red-500/40 bg-red-900/20 text-red-400 text-sm">
                    {apptError}
                  </div>
                )}
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-300 text-sm mb-1">
                        Ziyaretçi Adı *
                      </p>
                      <input
                        data-ocid="appointments.visitor_name.input"
                        value={apptForm.visitorName}
                        onChange={(e) =>
                          setApptForm((f) => ({
                            ...f,
                            visitorName: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#f59e0b]"
                      />
                    </div>
                    <div>
                      <p className="text-slate-300 text-sm mb-1">
                        TC / Pasaport *
                      </p>
                      <input
                        data-ocid="appointments.visitor_id.input"
                        value={apptForm.visitorId}
                        onChange={(e) =>
                          setApptForm((f) => ({
                            ...f,
                            visitorId: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-mono focus:outline-none focus:border-[#f59e0b]"
                      />
                    </div>
                    <div>
                      <p className="text-slate-300 text-sm mb-1">Ev Sahibi *</p>
                      <input
                        data-ocid="appointments.host.input"
                        value={apptForm.hostName}
                        onChange={(e) =>
                          setApptForm((f) => ({
                            ...f,
                            hostName: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#f59e0b]"
                      />
                    </div>
                    <div>
                      <p className="text-slate-300 text-sm mb-1">Tarih *</p>
                      <input
                        data-ocid="appointments.date.input"
                        type="date"
                        value={apptForm.appointmentDate}
                        onChange={(e) =>
                          setApptForm((f) => ({
                            ...f,
                            appointmentDate: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <p className="text-slate-300 text-sm mb-1">Saat *</p>
                      <input
                        data-ocid="appointments.time.input"
                        type="time"
                        value={apptForm.appointmentTime}
                        onChange={(e) =>
                          setApptForm((f) => ({
                            ...f,
                            appointmentTime: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <p className="text-slate-300 text-sm mb-1">Amaç *</p>
                      <input
                        data-ocid="appointments.purpose.input"
                        value={apptForm.purpose}
                        onChange={(e) =>
                          setApptForm((f) => ({
                            ...f,
                            purpose: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-slate-300 text-sm mb-1">
                        Notlar (isteğe bağlı)
                      </p>
                      <textarea
                        data-ocid="appointments.notes.textarea"
                        value={apptForm.notes}
                        onChange={(e) =>
                          setApptForm((f) => ({ ...f, notes: e.target.value }))
                        }
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    data-ocid="appointments.submit_button"
                    onClick={submitAppointment}
                    className="w-full py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
                    style={{
                      background: "linear-gradient(135deg,#f59e0b,#d97706)",
                    }}
                  >
                    Randevu Oluştur
                  </button>
                </div>
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
                    className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-colors"
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
                      className="px-3 py-1 rounded-lg text-xs text-white transition-opacity hover:opacity-80"
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

        {/* PROFILE TAB */}
        {tab === "profile" && (
          <div className="max-w-xl space-y-6">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                }}
              >
                {staff?.name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div>
                <div className="text-white text-lg font-semibold">
                  {staff?.name}
                </div>
                <div className="text-slate-400 text-sm">
                  {staff?.role === "admin"
                    ? "Yönetici"
                    : staff?.role === "receptionist"
                      ? "Resepsiyonist"
                      : "Personel"}
                </div>
              </div>
            </div>

            <div
              data-ocid="staff_profile.login_code.panel"
              className="p-5 rounded-2xl border"
              style={{
                background: "rgba(14,165,233,0.07)",
                border: "1.5px solid rgba(14,165,233,0.3)",
              }}
            >
              <div className="text-slate-400 text-xs font-medium uppercase tracking-widest mb-2">
                Giriş Kodunuz
              </div>
              <div className="flex items-center justify-between gap-3">
                <span
                  className="text-3xl font-mono font-bold tracking-[0.18em]"
                  style={{ color: "#0ea5e9" }}
                >
                  {staff?.staffId}
                </span>
                <button
                  type="button"
                  data-ocid="staff_profile.login_code.button"
                  onClick={() => copyCode(staff?.staffId ?? "", "login_code")}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80 active:scale-95 whitespace-nowrap"
                  style={{
                    background:
                      copiedCode === "login_code"
                        ? "rgba(34,197,94,0.2)"
                        : "rgba(14,165,233,0.15)",
                    border:
                      copiedCode === "login_code"
                        ? "1px solid rgba(34,197,94,0.4)"
                        : "1px solid rgba(14,165,233,0.35)",
                    color: copiedCode === "login_code" ? "#22c55e" : "#0ea5e9",
                  }}
                >
                  {copiedCode === "login_code" ? "✓ Kopyalandı" : "Kopyala"}
                </button>
              </div>
              <p className="text-slate-500 text-xs mt-3">
                Bu kod sisteme giriş yapmak için kullanılır. Kimseyle
                paylaşmayın.
              </p>
            </div>

            <div>
              <div className="text-slate-300 text-sm font-semibold mb-3 flex items-center gap-2">
                <span style={{ color: "#f59e0b" }}>🏢</span> Kayıtlı Olduğunuz
                Şirketler
              </div>
              {staffCompanies.length === 0 ? (
                <div
                  data-ocid="staff_profile.companies.empty_state"
                  className="text-center py-10 text-slate-500 text-sm rounded-2xl border border-white/10"
                >
                  Henüz bir şirkete kayıtlı değilsiniz.
                </div>
              ) : (
                <div
                  data-ocid="staff_profile.companies.list"
                  className="space-y-3"
                >
                  {staffCompanies.map((c, i) => (
                    <div
                      key={c.companyId}
                      data-ocid={`staff_profile.company.item.${i + 1}`}
                      className="p-4 rounded-2xl flex items-center justify-between gap-4"
                      style={{
                        background: "rgba(245,158,11,0.06)",
                        border: "1.5px solid rgba(245,158,11,0.25)",
                      }}
                    >
                      <div className="min-w-0">
                        <div className="text-white font-medium text-sm truncate">
                          {c.name}
                        </div>
                        <div
                          className="font-mono text-lg font-bold tracking-widest mt-0.5"
                          style={{ color: "#f59e0b" }}
                        >
                          {c.companyId}
                        </div>
                      </div>
                      <button
                        type="button"
                        data-ocid={`staff_profile.company_code.button.${i + 1}`}
                        onClick={() => copyCode(c.companyId, `company_${i}`)}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80 active:scale-95 shrink-0"
                        style={{
                          background:
                            copiedCode === `company_${i}`
                              ? "rgba(34,197,94,0.2)"
                              : "rgba(245,158,11,0.15)",
                          border:
                            copiedCode === `company_${i}`
                              ? "1px solid rgba(34,197,94,0.4)"
                              : "1px solid rgba(245,158,11,0.35)",
                          color:
                            copiedCode === `company_${i}`
                              ? "#22c55e"
                              : "#f59e0b",
                        }}
                      >
                        {copiedCode === `company_${i}`
                          ? "✓ Kopyalandı"
                          : "Kopyala"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
