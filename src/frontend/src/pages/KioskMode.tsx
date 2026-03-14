import { useCallback, useEffect, useRef, useState } from "react";
import { addAuditLog } from "../auditLog";
import SignatureCanvas from "../components/SignatureCanvas";
import { useCameraCapture as useCamera } from "../hooks/useCameraCapture";
import { useQRScannerLocal as useQRScanner } from "../hooks/useQRScannerLocal";
import { getLang, t } from "../i18n";
import {
  findCompanyById,
  getCustomCategories,
  getStaffByCompany,
  isBlacklisted,
  saveVisitor,
} from "../store";
import type { AppScreen, Visitor } from "../types";
import { generateId, generateVisitorId } from "../utils";

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
  const lang = getLang();
  const company = findCompanyById(companyId);
  const staffList = getStaffByCompany(companyId);
  const categories = getCustomCategories(companyId);
  const customFields = company?.customFields ?? [];

  const [screen, setScreen] = useState<"welcome" | "form" | "waiting">(
    "welcome",
  );
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [customFieldValues, setCustomFieldValues] = useState<
    Record<string, string>
  >({});
  const [formError, setFormError] = useState("");
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [countdown, setCountdown] = useState(60);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      setCountdown(60);
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

  const submitForm = () => {
    if (!form.name || !form.idNumber || !form.phone) {
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
    // Save to pending localStorage instead of directly saving
    const pending = JSON.parse(localStorage.getItem(KIOSK_PENDING_KEY) ?? "[]");
    pending.push({ ...visitor, _submittedAt: now });
    localStorage.setItem(KIOSK_PENDING_KEY, JSON.stringify(pending));
    addAuditLog(
      companyId,
      "Kiosk",
      generateId(),
      "kiosk_submission",
      `${visitor.name} (${visitor.idNumber}) kiosk üzerinden başvurdu (onay bekliyor)`,
    );
    setScreen("waiting");
  };

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
            <span style={{ color: "#0ea5e9" }}>Safe</span>ntry
          </div>
          {company && (
            <p className="text-slate-400 text-lg mb-2">{company.name}</p>
          )}
          <p className="text-slate-400 mb-2">
            {company?.kioskWelcomeMessage || "Ziyaretçi kaydı için dokunun"}
          </p>
          <p className="text-slate-600 text-sm mb-10">
            Lütfen aşağıdaki seçeneklerden birini seçin
          </p>

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
            </div>
          )}
        </div>

        <p className="mt-8 text-slate-600 text-xs">
          {IDLE_TIMEOUT / 1000} saniye işlem yapılmazsa otomatik sıfırlanır
        </p>
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
            background: "rgba(14,165,233,0.07)",
            border: "1.5px solid rgba(14,165,233,0.35)",
          }}
        >
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
            Hoş Geldiniz, <span style={{ color: "#0ea5e9" }}>{form.name}</span>!
          </h2>
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
                  Kişisel verileriniz KVKK kapsamında ziyaret kaydı amacıyla
                  işlenmektedir. Verileriniz 90 gün sonra otomatik olarak
                  silinecektir.
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
