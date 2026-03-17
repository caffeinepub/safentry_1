import { useCallback, useEffect, useRef, useState } from "react";
import { addAuditLog } from "../auditLog";
import SignatureCanvas from "../components/SignatureCanvas";
import { useCameraCapture as useCamera } from "../hooks/useCameraCapture";
import { useQRScannerLocal as useQRScanner } from "../hooks/useQRScannerLocal";
import { LANGUAGES, getLang, t } from "../i18n";
import {
  addAlertHistory,
  addNotification,
  addToQueue,
  findCompanyById,
  findPreRegByToken,
  getCustomCategories,
  getDepartments,
  getDeptTodayVisitorCount,
  getKioskApprovalStatus,
  getKioskContent,
  getLockdown,
  getNextQueueNo,
  getStaffByCompany,
  getVisitorPins,
  getVisitors,
  isBlacklisted,
  savePreReg,
  saveVisitor,
} from "../store";
import type { AppScreen, Visitor } from "../types";
import { generateId, generateVisitorId } from "../utils";
import { validateTcId } from "../utils/tcValidation";

const KIOSK_PENDING_KEY = "safentry_kiosk_pending";

interface Props {
  companyId: string;
  onNavigate: (s: AppScreen) => void;
}

const IDLE_TIMEOUT = 60000; // 60 seconds

function getShiftType(arrivalTime: number): Visitor["shiftType"] {
  const h = new Date(arrivalTime).getHours();
  if (h >= 6 && h < 14) return "morning";
  if (h >= 14 && h < 22) return "afternoon";
  return "night";
}

const EMPTY_FORM = {
  name: "",
  idNumber: "",
  phone: "",
  visitReason: "",
  category: "Misafir",
  vehiclePlate: "",
  ndaAccepted: false,
  signatureData: "",
  ndaExpanded: false,
  specialNeeds: "Yok",
  visitorPhoto: "",
};

export default function KioskMode({ companyId, onNavigate }: Props) {
  const [kioskLang, setKioskLang] = useState(getLang());
  const lang = kioskLang;
  const company = findCompanyById(companyId);
  const kioskContentAll = getKioskContent(companyId);
  const kioskContent = kioskContentAll[kioskLang] ?? {};
  const staffList = getStaffByCompany(companyId);
  const categories = getCustomCategories(companyId);
  const customFields = company?.customFields ?? [];

  const [screen, setScreen] = useState<
    "welcome" | "form" | "waiting" | "pin" | "checkout" | "checkout-success"
  >("welcome");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [pinTc, setPinTc] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [pinError, setPinError] = useState("");
  const [checkoutTc, setCheckoutTc] = useState("");
  const [checkoutFound, setCheckoutFound] = useState<
    import("../types").Visitor | null
  >(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [customFieldValues, setCustomFieldValues] = useState<
    Record<string, string>
  >({});
  const [formError, setFormError] = useState("");
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [countdown, setCountdown] = useState(60);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [queueNo, setQueueNo] = useState<number | null>(null);
  const [currentVisitorId, setCurrentVisitorId] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<
    "waiting" | "approved" | "rejected"
  >("waiting");
  const [rejectionReason, setRejectionReason] = useState<string>("");

  // QR Scanner
  const [showQrScanner, setShowQrScanner] = useState(false);
  const qrScanner = useQRScanner();

  // Camera for photo
  const [showCamera, setShowCamera] = useState(false);
  const camera = useCamera();

  const resetToWelcome = useCallback(() => {
    setForm({ ...EMPTY_FORM });
    setCustomFieldValues({});
    setFormError("");
    setShowQrScanner(false);
    setShowCamera(false);
    qrScanner.stopScanning();
    camera.stopCamera();
    setScreen("welcome");
  }, [qrScanner, camera]);

  // Handle QR scan result - auto-fill from invite code
  useEffect(() => {
    if (qrScanner.qrResults.length > 0) {
      const code = qrScanner.qrResults[0].data;
      // Try to match against pre-registrations
      const preReg = findPreRegByToken(code);
      if (
        preReg &&
        preReg.companyId === companyId &&
        preReg.status !== "used"
      ) {
        setForm((f) => ({
          ...f,
          name: preReg.name,
          idNumber: preReg.tc,
          phone: preReg.phone,
          visitReason: preReg.purpose,
        }));
        savePreReg({ ...preReg, status: "used" });
        setShowQrScanner(false);
        qrScanner.stopScanning();
        setScreen("form");
        return;
      }
      // Try to match against appointments
      const raw = localStorage.getItem("safentry_appointments") ?? "[]";
      try {
        const appts = JSON.parse(raw);
        const found = appts.find(
          (a: {
            inviteCode?: string;
            status?: string;
            companyId?: string;
            visitorName?: string;
            visitorId?: string;
            purpose?: string;
          }) =>
            a.inviteCode === code &&
            a.status !== "cancelled" &&
            a.companyId === companyId,
        );
        if (found) {
          setForm((f) => ({
            ...f,
            name: found.visitorName ?? "",
            idNumber: found.visitorId ?? "",
            visitReason: found.purpose ?? "",
          }));
          setShowQrScanner(false);
          qrScanner.stopScanning();
          setScreen("form");
          setFormError("✅ Davet kodu ile bilgiler dolduruldu.");
          setTimeout(() => setFormError(""), 3000);
        }
      } catch {
        // ignore
      }
    }
  }, [qrScanner.qrResults, companyId, qrScanner]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (screen !== "waiting") {
      idleTimerRef.current = setTimeout(() => {
        resetToWelcome();
      }, IDLE_TIMEOUT);
    }
  }, [screen, resetToWelcome]);

  // Reset idle timer on any interaction
  useEffect(() => {
    const events = ["mousemove", "touchstart", "keydown", "click"];
    const handler = () => resetIdleTimer();
    for (const e of events) {
      window.addEventListener(e, handler);
    }
    resetIdleTimer();
    return () => {
      for (const e of events) {
        window.removeEventListener(e, handler);
      }
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  // Waiting screen countdown
  useEffect(() => {
    if (screen === "waiting") {
      setCountdown(120);
      countdownRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            resetToWelcome();
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      return () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
      };
    }
  }, [screen, resetToWelcome]);

  // Approval status polling
  useEffect(() => {
    if (screen !== "waiting" || !currentVisitorId) return;
    setApprovalStatus("waiting");
    const poll = setInterval(() => {
      const status = getKioskApprovalStatus(currentVisitorId);
      if (status) {
        clearInterval(poll);
        if (status.status === "approved") {
          setApprovalStatus("approved");
          setTimeout(() => resetToWelcome(), 5000);
        } else {
          setApprovalStatus("rejected");
          setRejectionReason(status.reason || "");
          setTimeout(() => resetToWelcome(), 6000);
        }
      }
    }, 3000);
    return () => clearInterval(poll);
  }, [screen, currentVisitorId, resetToWelcome]);

  const submitForm = () => {
    if (!form.name || !form.idNumber || !form.phone) {
      setFormError("Lütfen zorunlu alanları doldurun.");
      return;
    }
    if (form.idNumber.length === 11 && !validateTcId(form.idNumber)) {
      setFormError(
        "Geçersiz TC Kimlik Numarası. Lütfen kontrol edip tekrar deneyin.",
      );
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
    // Check required custom fields
    for (const f of customFields.filter((cf) => cf.required)) {
      if (!customFieldValues[f.id]?.trim()) {
        setFormError(`"${f.label}" alanı zorunludur.`);
        return;
      }
    }
    if (isBlacklisted(companyId, form.idNumber)) {
      setFormError(
        "Sisteme girişiniz engellenmiştir. Lütfen güvenlik personeline başvurun.",
      );
      addAlertHistory({
        id: Math.random().toString(36).substring(2, 9),
        companyId,
        type: "blacklist",
        timestamp: Date.now(),
        detail: `Kiosk: ${form.name} (TC: ${form.idNumber}) kara listede — giriş engellendi`,
      });
      return;
    }

    const now = Date.now();
    const firstStaff = staffList[0];
    const visitorId = generateVisitorId();
    const visitor: Visitor = {
      visitorId,
      companyId,
      registeredBy: firstStaff?.staffId ?? "kiosk",
      name: form.name,
      idNumber: form.idNumber,
      phone: form.phone,
      hostStaffId: firstStaff?.staffId ?? "",
      arrivalTime: now,
      visitReason: form.visitReason,
      visitType: "business",
      ndaAccepted: true,
      signatureData: form.signatureData,
      vehiclePlate: form.vehiclePlate || undefined,
      label: "normal",
      category: form.category,
      status: "active",
      badgeQr: visitorId,
      notes: "",
      createdAt: now,
      shiftType: getShiftType(now),
      customFieldValues: Object.keys(customFieldValues).length
        ? customFieldValues
        : undefined,
      specialNeeds: form.specialNeeds !== "Yok" ? form.specialNeeds : undefined,
      visitorPhoto: form.visitorPhoto || undefined,
    };
    // Check department quota
    if (visitor.department) {
      const depts = getDepartments(companyId);
      const dept = depts.find((d) => d.name === visitor.department);
      if (dept?.dailyQuota && dept.dailyQuota > 0) {
        const used = getDeptTodayVisitorCount(companyId, dept.name);
        if (used >= dept.dailyQuota) {
          setFormError(
            `${dept.name} departmanı günlük kotaya ulaştı (${dept.dailyQuota} ziyaretçi). Lütfen güvenlik personeliyle görüşün.`,
          );
          return;
        }
      }
    }

    // Assign queue number
    const nextQueueNo = getNextQueueNo(companyId);
    addToQueue({
      queueNo: nextQueueNo,
      visitorId,
      visitorName: visitor.name,
      waitingSince: now,
      companyId,
    });
    setQueueNo(nextQueueNo);
    setCurrentVisitorId(visitorId);

    // Save to pending localStorage instead of directly saving
    const pending = JSON.parse(localStorage.getItem(KIOSK_PENDING_KEY) ?? "[]");
    pending.push({ ...visitor, _submittedAt: now });
    localStorage.setItem(KIOSK_PENDING_KEY, JSON.stringify(pending));
    addNotification({
      id: `${visitor.visitorId}_kiosk`,
      companyId,
      type: "kiosk_pending",
      message: `Kiosk başvurusu: ${visitor.name} (${visitor.category}) onay bekliyor.`,
      createdAt: now,
      read: false,
      relatedId: visitor.visitorId,
    });
    addAuditLog(
      companyId,
      "Kiosk",
      generateId(),
      "kiosk_submission",
      `${visitor.name} (${visitor.idNumber}) kiosk üzerinden başvurdu (onay bekliyor)`,
    );
    setScreen("waiting");
  };

  // Lockdown check
  const isLockedDown = getLockdown(companyId);
  if (isLockedDown) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8"
        style={{ background: "#0a0f1e" }}
      >
        <button
          type="button"
          data-ocid="kiosk.back_button"
          onClick={() => onNavigate("staff-dashboard")}
          className="absolute top-6 left-6 px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-colors"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          ← Personel Paneli
        </button>
        <div
          className="max-w-md w-full text-center p-10 rounded-3xl"
          style={{
            background: "rgba(239,68,68,0.06)",
            border: "2px solid rgba(239,68,68,0.3)",
          }}
        >
          <div className="text-6xl mb-6 animate-pulse">🚨</div>
          <h2 className="text-white font-bold text-2xl mb-3">Sistem Kapalı</h2>
          <p className="text-slate-300 text-lg leading-relaxed">
            Sistem geçici olarak kapalıdır. Lütfen personel ile iletişime geçin.
          </p>
        </div>
      </div>
    );
  }

  // Welcome screen
  if (screen === "welcome") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8"
        style={{ background: "#0a0f1e" }}
      >
        <button
          type="button"
          data-ocid="kiosk.back_button"
          onClick={() => onNavigate("staff-dashboard")}
          className="absolute top-6 left-6 px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-colors"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          ← Personel Paneli
        </button>

        <div
          className="max-w-lg w-full text-center p-10 rounded-3xl"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1.5px solid rgba(14,165,233,0.25)",
          }}
        >
          <div className="text-6xl mb-6">👋</div>
          <div className="text-4xl font-bold text-white mb-2">
            {kioskContent.welcomeTitle ? (
              kioskContent.welcomeTitle
            ) : (
              <>
                <span style={{ color: "#0ea5e9" }}>Safe</span>ntry
              </>
            )}
          </div>
          {company && (
            <p className="text-slate-400 text-lg mb-2">{company.name}</p>
          )}
          <p className="text-slate-400 mb-2">
            {kioskContent.subtitle ||
              company?.kioskWelcomeMessage ||
              "Ziyaretçi kaydı için dokunun"}
          </p>
          <p className="text-slate-600 text-sm mb-4">
            Lütfen aşağıdaki seçeneklerden birini seçin
          </p>
          {/* Language selector */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {LANGUAGES.map((lng) => (
              <button
                key={lng.code}
                type="button"
                data-ocid={`kiosk.lang_${lng.code}.button`}
                onClick={() => setKioskLang(lng.code)}
                className="px-2 py-1 rounded-lg text-xs font-medium transition-all"
                style={{
                  background:
                    kioskLang === lng.code
                      ? "rgba(14,165,233,0.25)"
                      : "rgba(255,255,255,0.06)",
                  border:
                    kioskLang === lng.code
                      ? "1.5px solid rgba(14,165,233,0.6)"
                      : "1px solid rgba(255,255,255,0.12)",
                  color: kioskLang === lng.code ? "#38bdf8" : "#94a3b8",
                }}
              >
                {lng.flag} {lng.label}
              </button>
            ))}
          </div>

          {showQrScanner ? (
            <div className="mb-6">
              <p className="text-slate-300 text-sm mb-3 text-center">
                QR kodu kameraya gösterin
              </p>
              <div
                className="relative rounded-2xl overflow-hidden"
                style={{ height: "240px", width: "100%" }}
              >
                <video
                  ref={qrScanner.videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <canvas ref={qrScanner.canvasRef} className="hidden" />
              </div>
              <button
                type="button"
                data-ocid="kiosk.qr_cancel.button"
                onClick={() => {
                  setShowQrScanner(false);
                  qrScanner.stopScanning();
                }}
                className="mt-3 w-full py-3 rounded-xl text-slate-400 hover:text-white transition-colors"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                İptal
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                data-ocid="kiosk.start_button"
                onClick={() => setScreen("form")}
                className="w-full py-5 rounded-2xl font-bold text-white text-xl transition-opacity hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                  minHeight: "64px",
                }}
              >
                📝 Formu Doldur
              </button>
              {qrScanner.isSupported && (
                <button
                  type="button"
                  data-ocid="kiosk.qr_entry.button"
                  onClick={() => {
                    setShowQrScanner(true);
                    qrScanner.startScanning();
                  }}
                  className="w-full py-4 rounded-2xl font-semibold text-white text-lg transition-opacity hover:opacity-90"
                  style={{
                    background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
                    minHeight: "56px",
                  }}
                >
                  📷 QR ile Giriş
                </button>
              )}
              <button
                type="button"
                data-ocid="kiosk.pin_login.button"
                onClick={() => {
                  setPinTc("");
                  setPinCode("");
                  setPinError("");
                  setScreen("pin");
                }}
                className="w-full py-3 rounded-2xl font-semibold text-sm transition-opacity hover:opacity-90"
                style={{
                  background: "rgba(20,184,166,0.15)",
                  border: "1.5px solid rgba(20,184,166,0.4)",
                  color: "#2dd4bf",
                }}
              >
                🔑 PIN ile Hızlı Giriş
              </button>
              <button
                type="button"
                data-ocid="kiosk.checkout.button"
                onClick={() => {
                  setCheckoutTc("");
                  setCheckoutFound(null);
                  setCheckoutError("");
                  setScreen("checkout");
                }}
                className="w-full py-3 rounded-2xl font-semibold text-sm transition-opacity hover:opacity-90"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1.5px solid rgba(239,68,68,0.35)",
                  color: "#f87171",
                }}
              >
                🚪 Çıkış Yap
              </button>
            </div>
          )}
        </div>

        <p className="mt-8 text-slate-600 text-xs">
          {IDLE_TIMEOUT / 1000} saniye işlem yapılmazsa otomatik sıfırlanır
        </p>
      </div>
    );
  }

  // PIN login screen
  if (screen === "pin") {
    const handlePinLogin = () => {
      if (!pinTc.trim() || !pinCode.trim()) {
        setPinError("TC ve PIN giriniz.");
        return;
      }
      const pins = getVisitorPins(companyId);
      if (pins[pinTc] !== pinCode) {
        setPinError("TC veya PIN hatalı.");
        setPinCode("");
        return;
      }
      // Find last visit of this person
      const allVisits = getVisitors(companyId)
        .filter((v) => v.idNumber === pinTc)
        .sort((a, b) => b.arrivalTime - a.arrivalTime);
      const lastVisit = allVisits[0];
      if (lastVisit) {
        setForm({
          ...EMPTY_FORM,
          name: lastVisit.name,
          idNumber: lastVisit.idNumber,
          phone: lastVisit.phone || "",
          visitReason: lastVisit.visitReason || "",
          category: lastVisit.category || "Misafir",
          vehiclePlate: lastVisit.vehiclePlate || "",
        });
      } else {
        setForm((f) => ({ ...f, idNumber: pinTc }));
      }
      setPinError("");
      setScreen("form");
    };
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8"
        style={{ background: "#0a0f1e" }}
        data-ocid="kiosk.pin_screen"
      >
        <div
          className="max-w-sm w-full p-8 rounded-3xl text-center"
          style={{
            background: "rgba(20,184,166,0.07)",
            border: "1.5px solid rgba(20,184,166,0.35)",
          }}
        >
          <div className="text-4xl mb-4">🔑</div>
          <h2 className="text-white font-bold text-xl mb-2">PIN ile Giriş</h2>
          <p className="text-slate-400 text-sm mb-6">
            TC Kimlik No ve PIN'inizi girin
          </p>
          <div className="space-y-3 mb-4">
            <input
              data-ocid="kiosk.pin_tc.input"
              value={pinTc}
              onChange={(e) => setPinTc(e.target.value)}
              placeholder="TC Kimlik No (11 hane)"
              maxLength={11}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-center text-lg focus:outline-none focus:border-teal-400"
            />
            <input
              data-ocid="kiosk.pin_code.input"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              placeholder="4 haneli PIN"
              maxLength={4}
              type="tel"
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-center text-2xl tracking-widest focus:outline-none focus:border-teal-400"
            />
            {/* Numeric keypad */}
            <div className="grid grid-cols-3 gap-2 mt-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map(
                (k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      if (!k) return;
                      if (k === "⌫") {
                        setPinCode((p) => p.slice(0, -1));
                        return;
                      }
                      setPinCode((p) => (p.length < 4 ? p + k : p));
                    }}
                    className="py-3 rounded-xl font-bold text-white text-lg transition-all hover:opacity-80"
                    style={{
                      background: k ? "rgba(255,255,255,0.08)" : "transparent",
                      border: k ? "1px solid rgba(255,255,255,0.12)" : "none",
                    }}
                  >
                    {k}
                  </button>
                ),
              )}
            </div>
          </div>
          {pinError && (
            <div
              className="mb-4 px-3 py-2 rounded-xl text-sm"
              style={{
                background: "rgba(239,68,68,0.1)",
                color: "#f87171",
                border: "1px solid rgba(239,68,68,0.3)",
              }}
              data-ocid="kiosk.pin_error.error_state"
            >
              {pinError}
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              data-ocid="kiosk.pin_cancel.button"
              onClick={() => setScreen("welcome")}
              className="flex-1 py-3 rounded-xl text-slate-400 hover:text-white transition-colors"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              İptal
            </button>
            <button
              type="button"
              data-ocid="kiosk.pin_submit.button"
              onClick={handlePinLogin}
              className="flex-1 py-3 rounded-xl font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#0d9488,#0f766e)" }}
            >
              Giriş
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Waiting screen
  if (screen === "waiting") {
    return (
      <div
        data-ocid="kiosk.waiting_screen"
        className="min-h-screen flex flex-col items-center justify-center p-8"
        style={{ background: "#0a0f1e" }}
      >
        <div
          className="max-w-md w-full text-center p-12 rounded-3xl"
          style={{
            background:
              approvalStatus === "approved"
                ? "rgba(34,197,94,0.07)"
                : approvalStatus === "rejected"
                  ? "rgba(239,68,68,0.07)"
                  : "rgba(14,165,233,0.07)",
            border: `1.5px solid ${approvalStatus === "approved" ? "rgba(34,197,94,0.35)" : approvalStatus === "rejected" ? "rgba(239,68,68,0.35)" : "rgba(14,165,233,0.35)"}`,
          }}
        >
          {approvalStatus === "approved" ? (
            <>
              <div className="text-6xl mb-6 animate-bounce">✅</div>
              <h2 className="text-2xl font-bold text-white mb-3">
                Giriş Onaylandı!
              </h2>
              <p className="text-green-400 text-base mb-2">
                Güvenlik personeliniz sizi karşılamak için yolda.
              </p>
              <p className="text-slate-500 text-sm">Lütfen bekleyiniz...</p>
            </>
          ) : approvalStatus === "rejected" ? (
            <>
              <div className="text-6xl mb-6">❌</div>
              <h2 className="text-2xl font-bold text-white mb-3">
                Giriş Reddedildi
              </h2>
              {rejectionReason && (
                <p className="text-red-400 text-base mb-2">{rejectionReason}</p>
              )}
              <p className="text-slate-400 text-sm mb-4">
                Lütfen güvenlik personeliyle iletişime geçin.
              </p>
            </>
          ) : (
            <>
              {/* Animated spinner */}
              <div className="flex justify-center mb-8">
                <div
                  className="w-20 h-20 rounded-full border-4 border-t-transparent animate-spin"
                  style={{
                    borderColor: "rgba(14,165,233,0.3)",
                    borderTopColor: "#0ea5e9",
                  }}
                />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">
                Hoş Geldiniz,{" "}
                <span style={{ color: "#0ea5e9" }}>{form.name}</span>!
              </h2>
              {queueNo !== null && (
                <div
                  className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl mb-4"
                  style={{
                    background: "rgba(245,158,11,0.12)",
                    border: "1.5px solid rgba(245,158,11,0.3)",
                  }}
                >
                  <span
                    className="text-4xl font-black"
                    style={{ color: "#f59e0b" }}
                  >
                    {queueNo}
                  </span>
                  <div className="text-left">
                    <p className="text-amber-300 font-semibold text-sm">
                      Sıra Numaranız
                    </p>
                    <p className="text-amber-200/60 text-xs">
                      Tahmini bekleme: ~{queueNo * 3} dk
                    </p>
                  </div>
                </div>
              )}
              <p className="text-slate-300 text-base mb-2">
                Bilgileriniz alındı, güvenlik onayı bekleniyor...
              </p>
              <p className="text-slate-500 text-sm mb-8">
                Lütfen güvenlik görevlisi sizi onaylayana kadar bekleyin.
              </p>
              <div
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium"
                style={{
                  background: "rgba(245,158,11,0.15)",
                  color: "#f59e0b",
                  border: "1px solid rgba(245,158,11,0.3)",
                }}
              >
                ⏱ {countdown} saniye sonra sıfırlanacak
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Self checkout screen
  if (screen === "checkout") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8"
        style={{ background: "#0a0f1e" }}
        data-ocid="kiosk.checkout_screen"
      >
        <button
          type="button"
          data-ocid="kiosk.checkout.back_button"
          onClick={() => setScreen("welcome")}
          className="absolute top-6 left-6 px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-colors"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          ← Geri
        </button>
        <div
          className="w-full max-w-sm p-8 rounded-3xl"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1.5px solid rgba(239,68,68,0.3)",
          }}
        >
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🚪</div>
            <h2 className="text-2xl font-bold text-white mb-1">Kıendı Çıkış</h2>
            <p className="text-slate-400 text-sm">
              TC kimlik numaranız ile Çıkış yapın
            </p>
          </div>
          <div className="space-y-4">
            <input
              data-ocid="kiosk.checkout.tc_input"
              type="text"
              value={checkoutTc}
              onChange={(e) => {
                setCheckoutTc(e.target.value);
                setCheckoutError("");
                setCheckoutFound(null);
              }}
              placeholder="TC Kimlik No"
              className="w-full px-4 py-3 rounded-xl text-white text-center text-lg font-mono outline-none"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
              maxLength={11}
            />
            {checkoutError && (
              <p
                data-ocid="kiosk.checkout.error_state"
                className="text-red-400 text-sm text-center"
              >
                {checkoutError}
              </p>
            )}
            {checkoutFound && (
              <div
                data-ocid="kiosk.checkout.confirm_panel"
                className="p-4 rounded-2xl text-center"
                style={{
                  background: "rgba(34,197,94,0.08)",
                  border: "1px solid rgba(34,197,94,0.3)",
                }}
              >
                <p className="text-green-400 font-semibold">
                  {checkoutFound.name}
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  Giriş:{" "}
                  {new Date(checkoutFound.arrivalTime).toLocaleTimeString(
                    "tr-TR",
                  )}
                </p>
                <button
                  type="button"
                  data-ocid="kiosk.checkout.confirm_button"
                  onClick={() => {
                    if (!checkoutFound) return;
                    const updated = {
                      ...checkoutFound,
                      status: "departed" as const,
                      departureTime: Date.now(),
                    };
                    const { saveVisitor } = require("../store");
                    saveVisitor(updated);
                    setCheckoutFound(null);
                    setCheckoutTc("");
                    setScreen("checkout-success");
                    setTimeout(() => setScreen("welcome"), 4000);
                  }}
                  className="mt-3 w-full py-3 rounded-xl font-semibold text-white"
                  style={{
                    background: "linear-gradient(135deg,#ef4444,#dc2626)",
                  }}
                >
                  Evet, Çıkış Yap
                </button>
              </div>
            )}
            {!checkoutFound && (
              <button
                type="button"
                data-ocid="kiosk.checkout.search_button"
                onClick={() => {
                  const visitors = getVisitors(companyId);
                  const found = visitors.find(
                    (v) => v.idNumber === checkoutTc && v.status === "active",
                  );
                  if (found) {
                    setCheckoutFound(found);
                    setCheckoutError("");
                  } else {
                    setCheckoutError(
                      "Aktif ziyaretçi bulunamadı. Lütfen TC numaranız kontrol edin.",
                    );
                  }
                }}
                className="w-full py-3 rounded-xl font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                }}
              >
                Sorgula
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Self checkout success screen
  if (screen === "checkout-success") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8"
        style={{ background: "#0a0f1e" }}
        data-ocid="kiosk.checkout_success_screen"
      >
        <div
          className="w-full max-w-sm p-10 rounded-3xl text-center"
          style={{
            background: "rgba(34,197,94,0.07)",
            border: "1.5px solid rgba(34,197,94,0.3)",
          }}
        >
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Çıkış Kaydedildi
          </h2>
          <p className="text-slate-400">İyi günler dileriz!</p>
          <p className="text-slate-500 text-sm mt-3">
            Ekran otomatik kapanacak...
          </p>
        </div>
      </div>
    );
  }

  // Form screen
  return (
    <div
      data-ocid="kiosk.form"
      className="min-h-screen overflow-y-auto"
      style={{ background: "#0a0f1e" }}
    >
      <div
        className="sticky top-0 z-10 px-6 py-4 border-b border-white/10 flex items-center justify-between"
        style={{ background: "#0a0f1e" }}
      >
        <div className="text-xl font-bold text-white">
          <span style={{ color: "#0ea5e9" }}>Safe</span>ntry
          {company && (
            <span className="text-slate-400 text-sm font-normal ml-2">
              — {company.name}
            </span>
          )}
        </div>
        <button
          type="button"
          data-ocid="kiosk.reset_button"
          onClick={resetToWelcome}
          className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-colors"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          ✕ İptal
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-6 pb-16">
        <h2 className="text-2xl font-bold text-white mb-6">Ziyaretçi Kaydı</h2>

        {formError && (
          <div className="mb-5 p-4 rounded-xl border border-red-500/40 bg-red-900/25 flex items-start gap-3">
            <span className="text-red-400 text-lg mt-0.5">⛔</span>
            <p className="text-red-400 text-sm font-medium">{formError}</p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <p className="text-slate-300 text-base mb-2 font-medium">
              {t(lang, "visitorName")} *
            </p>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#f59e0b] text-lg"
              style={{ minHeight: "56px" }}
            />
          </div>
          <div>
            <p className="text-slate-300 text-base mb-2 font-medium">
              {t(lang, "idNumber")} *
            </p>
            <input
              value={form.idNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, idNumber: e.target.value }))
              }
              maxLength={11}
              className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#f59e0b] font-mono text-lg"
              style={{ minHeight: "56px" }}
            />
          </div>
          <div>
            <p className="text-slate-300 text-base mb-2 font-medium">
              {t(lang, "phone")} *
            </p>
            <input
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
              className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#f59e0b] text-lg"
              style={{ minHeight: "56px" }}
            />
          </div>
          <div>
            <p className="text-slate-300 text-base mb-2 font-medium">
              Kategori
            </p>
            <select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
              className="w-full px-5 py-4 rounded-xl bg-[#0f1729] border border-white/20 text-white focus:outline-none text-lg"
              style={{ minHeight: "56px" }}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-[#0f1729]">
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <p className="text-slate-300 text-base mb-2 font-medium">
              {t(lang, "visitReason")}
            </p>
            <input
              value={form.visitReason}
              onChange={(e) =>
                setForm((f) => ({ ...f, visitReason: e.target.value }))
              }
              className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none text-lg"
              style={{ minHeight: "56px" }}
            />
          </div>
          <div>
            <p className="text-slate-300 text-base mb-2 font-medium">
              {t(lang, "vehiclePlate")}
            </p>
            <input
              value={form.vehiclePlate}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  vehiclePlate: e.target.value.toUpperCase(),
                }))
              }
              placeholder="34 ABC 123"
              className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none font-mono uppercase text-lg"
              style={{ minHeight: "56px" }}
            />
          </div>
          <div>
            <p className="text-slate-300 text-base mb-2 font-medium">
              Özel Gereksinim
            </p>
            <select
              data-ocid="kiosk.special_needs.select"
              value={form.specialNeeds}
              onChange={(e) =>
                setForm((f) => ({ ...f, specialNeeds: e.target.value }))
              }
              className="w-full px-5 py-4 rounded-xl bg-[#0f1729] border border-white/20 text-white focus:outline-none text-lg"
              style={{ minHeight: "56px" }}
            >
              {[
                "Yok",
                "Tekerlekli Sandalye",
                "Refakatçi",
                "İşaret Dili",
                "Diğer",
              ].map((opt) => (
                <option key={opt} value={opt} className="bg-[#0f1729]">
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <p className="text-slate-300 text-base mb-2 font-medium">
              Fotoğraf (İsteğe Bağlı)
            </p>
            {form.visitorPhoto ? (
              <div className="flex items-center gap-4">
                <img
                  src={form.visitorPhoto}
                  alt="Ziyaretçi fotoğrafı"
                  className="w-20 h-20 rounded-xl object-cover border border-white/20"
                />
                <button
                  type="button"
                  data-ocid="kiosk.retake_photo.button"
                  onClick={() => {
                    setForm((f) => ({ ...f, visitorPhoto: "" }));
                    setShowCamera(false);
                    camera.stopCamera();
                  }}
                  className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  🔄 Yeniden Çek
                </button>
              </div>
            ) : showCamera ? (
              <div>
                <div
                  className="relative rounded-2xl overflow-hidden mb-3"
                  style={{ height: "240px", width: "100%" }}
                >
                  <video
                    ref={camera.videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={camera.canvasRef} className="hidden" />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    data-ocid="kiosk.capture_photo.button"
                    onClick={async () => {
                      const photo = await camera.capturePhoto();
                      if (photo) {
                        setForm((f) => ({ ...f, visitorPhoto: photo }));
                        setShowCamera(false);
                        camera.stopCamera();
                      }
                    }}
                    className="flex-1 py-3 rounded-xl font-semibold text-white"
                    style={{
                      background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                    }}
                  >
                    📸 Fotoğraf Çek
                  </button>
                  <button
                    type="button"
                    data-ocid="kiosk.cancel_camera.button"
                    onClick={() => {
                      setShowCamera(false);
                      camera.stopCamera();
                    }}
                    className="px-4 py-3 rounded-xl text-slate-400 hover:text-white transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    İptal
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                data-ocid="kiosk.open_camera.button"
                onClick={async () => {
                  setShowCamera(true);
                  await camera.startCamera();
                }}
                className="w-full py-4 rounded-xl text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-3"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1.5px dashed rgba(255,255,255,0.2)",
                  minHeight: "56px",
                }}
              >
                <span className="text-2xl">📷</span>
                <span>Kamera Aç (İsteğe Bağlı)</span>
              </button>
            )}
          </div>

          {/* Custom Fields */}
          {customFields.map((cf) => (
            <div key={cf.id}>
              <p className="text-slate-300 text-base mb-2 font-medium">
                {cf.label}
                {cf.required && " *"}
              </p>
              <input
                value={customFieldValues[cf.id] ?? ""}
                onChange={(e) =>
                  setCustomFieldValues((prev) => ({
                    ...prev,
                    [cf.id]: e.target.value,
                  }))
                }
                className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none text-lg"
                style={{ minHeight: "56px" }}
              />
            </div>
          ))}
        </div>

        {/* NDA */}
        <div
          className="mt-6 p-5 rounded-xl"
          style={{
            background: form.ndaAccepted
              ? "rgba(34,197,94,0.06)"
              : "rgba(255,255,255,0.04)",
            border: form.ndaAccepted
              ? "1.5px solid rgba(34,197,94,0.3)"
              : "1.5px solid rgba(255,255,255,0.12)",
          }}
        >
          <label className="flex items-start gap-4 cursor-pointer">
            <input
              type="checkbox"
              checked={form.ndaAccepted}
              onChange={(e) =>
                setForm((f) => ({ ...f, ndaAccepted: e.target.checked }))
              }
              className="w-6 h-6 mt-0.5 rounded accent-[#0ea5e9] shrink-0"
              style={{ minWidth: "24px" }}
            />
            <div className="flex-1">
              <span className="text-slate-200 text-base font-medium">
                {t(lang, "ndaAccept")}
              </span>
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, ndaExpanded: !f.ndaExpanded }))
                }
                className="ml-2 text-[#0ea5e9] text-sm hover:underline"
              >
                {form.ndaExpanded ? "Gizle ▲" : "Metni Oku ▼"}
              </button>
              {form.ndaExpanded && (
                <p
                  className="mt-3 text-slate-400 text-sm leading-relaxed p-3 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  {company?.categoryNda?.[form.category] ||
                    "Kişisel verileriniz KVKK kapsamında ziyaret kaydı amacıyla işlenmektedir. Verileriniz saklama süresi dolunca otomatik olarak silinecektir."}
                </p>
              )}
            </div>
          </label>
        </div>

        {/* Signature */}
        <div className="mt-6">
          <p className="text-slate-300 text-base mb-2 font-medium">
            {t(lang, "signature")} *
          </p>
          <SignatureCanvas
            value={form.signatureData}
            onChange={(data) => setForm((f) => ({ ...f, signatureData: data }))}
          />
        </div>

        <button
          type="button"
          data-ocid="kiosk.submit_button"
          onClick={submitForm}
          className="mt-8 w-full py-5 rounded-2xl font-bold text-white text-xl transition-opacity hover:opacity-90"
          style={{
            background: "linear-gradient(135deg,#f59e0b,#d97706)",
            minHeight: "64px",
          }}
        >
          {t(lang, "registerVisitor")}
        </button>
      </div>
    </div>
  );
}
