import { useCallback, useEffect, useRef, useState } from "react";
import { addAuditLog } from "../auditLog";
import LangSwitcher from "../components/LangSwitcher";
import QRCode from "../components/QRCode";
import SignatureCanvas from "../components/SignatureCanvas";
import { useCameraCapture as useCamera } from "../hooks/useCameraCapture";
import { getLang, t } from "../i18n";
import {
  clearSession,
  findCompanyById,
  findStaffById,
  getAllStaff,
  getAppointments,
  getCustomCategories,
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

const CATEGORY_COLORS: Record<string, string> = {
  Misafir: "#0ea5e9",
  Müteahhit: "#f97316",
  Teslimat: "#22c55e",
  Mülakat: "#a855f7",
  Tedarikçi: "#f59e0b",
  Diğer: "#64748b",
};

interface Props {
  onNavigate: (s: AppScreen, state?: { companyId?: string }) => void;
  onRefresh: () => void;
}

type Tab =
  | "register"
  | "active"
  | "inside"
  | "appointments"
  | "preregistered"
  | "history"
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
  ndaExpanded: false,
  signatureData: "",
  label: "normal" as Visitor["label"],
  category: "Misafir",
  customFieldValues: {} as Record<string, string>,
  specialNeeds: "Yok",
  visitorPhoto: "",
};

const EMPTY_APPT = {
  visitorName: "",
  visitorId: "",
  hostName: "",
  appointmentDate: new Date().toISOString().slice(0, 10),
  appointmentTime: "09:00",
  purpose: "",
  notes: "",
  backupContact: "",
  recurrence: "none" as "none" | "weekly" | "monthly",
  recurrenceEndDate: "",
};

const KIOSK_PENDING_KEY = "safentry_kiosk_pending";

interface KioskPendingVisitor {
  visitorId: string;
  companyId: string;
  name: string;
  idNumber: string;
  phone: string;
  visitReason: string;
  category: string;
  vehiclePlate?: string;
  signatureData: string;
  ndaAccepted: boolean;
  arrivalTime: number;
  hostStaffId: string;
  registeredBy: string;
  label: "normal" | "vip" | "attention" | "restricted";
  status: "active";
  badgeQr: string;
  notes: string;
  createdAt: number;
  shiftType: "morning" | "afternoon" | "night";
  _submittedAt: number;
}

function getShiftType(arrivalStr: string): Visitor["shiftType"] {
  const h = new Date(arrivalStr).getHours();
  if (h >= 6 && h < 14) return "morning";
  if (h >= 14 && h < 22) return "afternoon";
  return "night";
}

function shiftLabel(s: Visitor["shiftType"]): string {
  if (s === "morning") return "☀️ Sabah (06:00–14:00)";
  if (s === "afternoon") return "🌅 Öğleden Sonra (14:00–22:00)";
  if (s === "night") return "🌙 Gece (22:00–06:00)";
  return "";
}

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

function getAppointmentCountdown(
  apptDate: string,
  apptTime: string,
): { label: string; color: string } {
  const [h, m] = apptTime.split(":").map(Number);
  const ts = new Date(apptDate);
  ts.setHours(h, m, 0, 0);
  const diffMs = ts.getTime() - Date.now();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < -60) return { label: "Geçti", color: "#ef4444" };
  if (diffMins < 0)
    return { label: `${Math.abs(diffMins)} dk geçti`, color: "#f97316" };
  if (diffMins <= 5) return { label: "Şimdi!", color: "#22c55e" };
  if (diffMins <= 30)
    return { label: `${diffMins} dk sonra`, color: "#f59e0b" };
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  const label =
    hours > 0
      ? `${hours} sa ${mins > 0 ? `${mins} dk ` : ""}sonra`
      : `${diffMins} dk sonra`;
  return { label, color: "#22c55e" };
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

  // Notes dialog
  const [notesVisitor, setNotesVisitor] = useState<Visitor | null>(null);
  const [notesText, setNotesText] = useState("");

  // CSV Bulk Import
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<
    Array<{
      name: string;
      idNumber: string;
      phone: string;
      visitReason: string;
      category: string;
      blacklisted: boolean;
    }>
  >([]);
  const [csvError, setCsvError] = useState("");
  const [csvSummary, setCsvSummary] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // History tab
  const [historySearch, setHistorySearch] = useState("");

  // ID Verification modal
  const [showIdVerify, setShowIdVerify] = useState(false);
  const [pendingVisitorData, setPendingVisitorData] = useState<Visitor | null>(
    null,
  );

  // Kiosk pending approvals
  const [kioskPending, setKioskPending] = useState<KioskPendingVisitor[]>([]);

  // Invite code apply
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [inviteCodeMsg, setInviteCodeMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Camera for visitor photo
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const camera = useCamera();

  const loadKioskPending = useCallback(() => {
    const all: KioskPendingVisitor[] = JSON.parse(
      localStorage.getItem(KIOSK_PENDING_KEY) ?? "[]",
    );
    setKioskPending(all.filter((v) => v.companyId === session.companyId));
  }, [session.companyId]);

  const reload = useCallback(() => {
    setVisitors(getVisitors(session.companyId));
    setStaffList(getStaffByCompany(session.companyId));
    setAppointments(getAppointments(session.companyId));
    loadKioskPending();
    refreshSession();
  }, [session.companyId, loadKioskPending]);

  useEffect(() => {
    reload();
    const timer = setInterval(() => reload(), 60000);
    return () => clearInterval(timer);
  }, [reload]);

  // Tick every minute for live elapsed time
  useEffect(() => {
    const t2 = setInterval(() => setTick((x) => x + 1), 60000);
    return () => clearInterval(t2);
  }, []);

  // Auto-checkout effect
  useEffect(() => {
    const autoHours = company?.autoCheckoutHours ?? 0;
    if (!autoHours) return;
    const interval = setInterval(
      () => {
        const now = Date.now();
        const activeVis = getVisitors(session.companyId).filter(
          (v) => v.status === "active",
        );
        let changed = false;
        for (const v of activeVis) {
          if (now - v.arrivalTime > autoHours * 3600000) {
            saveVisitor({ ...v, status: "departed", departureTime: now });
            addAuditLog(
              session.companyId,
              "Sistem",
              "auto",
              "auto_checkout",
              `${v.name} otomatik çıkış kaydedildi`,
            );
            changed = true;
          }
        }
        if (changed) reload();
      },
      5 * 60 * 1000,
    );
    return () => clearInterval(interval);
  }, [company?.autoCheckoutHours, session.companyId, reload]);

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
      category: returningSuggestion.category ?? "Misafir",
    }));
    setReturningSuggestion(null);
  };

  // Apply invite code to fill form
  const applyInviteCode = () => {
    if (!inviteCodeInput.trim()) return;
    const found = appointments.find(
      (a) =>
        a.inviteCode === inviteCodeInput.trim() && a.status !== "cancelled",
    );
    if (found) {
      setForm((f) => ({
        ...f,
        name: found.visitorName,
        idNumber: found.visitorId,
        visitReason: found.purpose,
      }));
      setInviteCodeMsg({
        type: "success",
        text: `✅ ${found.visitorName} için bilgiler dolduruldu`,
      });
      setTimeout(() => setInviteCodeMsg(null), 4000);
    } else {
      setInviteCodeMsg({
        type: "error",
        text: "❌ Geçersiz veya bulunamayan davet kodu",
      });
      setTimeout(() => setInviteCodeMsg(null), 4000);
    }
    setInviteCodeInput("");
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
    // Check required custom fields
    const customFields = company?.customFields ?? [];
    for (const cf of customFields.filter((x) => x.required)) {
      if (!form.customFieldValues[cf.id]?.trim()) {
        setFormError(`"${cf.label}" alanı zorunludur.`);
        return;
      }
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
      category: form.category,
      status: "active",
      badgeQr: visitorId,
      notes: "",
      createdAt: Date.now(),
      shiftType: getShiftType(form.arrivalTime),
      customFieldValues: Object.keys(form.customFieldValues).length
        ? form.customFieldValues
        : undefined,
      specialNeeds: form.specialNeeds !== "Yok" ? form.specialNeeds : undefined,
      visitorPhoto: form.visitorPhoto || undefined,
    };
    // Show ID verification dialog before saving
    setPendingVisitorData(visitor);
    setShowIdVerify(true);
  };

  const confirmIdVerify = () => {
    if (!pendingVisitorData) return;
    const visitor = pendingVisitorData;
    saveVisitor(visitor);
    addAuditLog(
      session.companyId,
      staff?.name ?? "Personel",
      session.staffId ?? "",
      "visitor_registered",
      `${visitor.name} (${visitor.idNumber}) kaydedildi (kimlik doğrulandı)`,
    );
    setRegisteredVisitor(visitor);
    setForm({
      ...EMPTY_FORM,
      arrivalTime: new Date().toISOString().slice(0, 16),
    });
    setFormError("");
    setReturningSuggestion(null);
    setPendingVisitorData(null);
    setShowIdVerify(false);
    reload();
  };

  const cancelIdVerify = () => {
    setPendingVisitorData(null);
    setShowIdVerify(false);
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
    addAuditLog(
      session.companyId,
      staff?.name ?? "Personel",
      session.staffId ?? "",
      "visitor_checkout",
      `${exitModalVisitor.name} çıkış yaptı`,
    );
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
    const baseAppt: Appointment = {
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
      backupContact: apptForm.backupContact || undefined,
    };
    saveAppointment(baseAppt);

    // Generate recurring appointments
    if (apptForm.recurrence !== "none" && apptForm.recurrenceEndDate) {
      let current = new Date(apptForm.appointmentDate);
      const end = new Date(apptForm.recurrenceEndDate);
      const increment = apptForm.recurrence === "weekly" ? 7 : 30;
      let count = 0;
      while (count < 52) {
        current = new Date(current.getTime() + increment * 24 * 60 * 60 * 1000);
        if (current > end) break;
        const recurAppt: Appointment = {
          ...baseAppt,
          id: generateId(),
          appointmentDate: current.toISOString().slice(0, 10),
          createdAt: Date.now() + count,
        };
        saveAppointment(recurAppt);
        count++;
      }
    }

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

  const approveKioskVisitor = (v: KioskPendingVisitor) => {
    const visitor: Visitor = {
      visitorId: v.visitorId,
      companyId: v.companyId,
      registeredBy: session.staffId ?? "staff",
      name: v.name,
      idNumber: v.idNumber,
      phone: v.phone,
      hostStaffId: v.hostStaffId,
      arrivalTime: v.arrivalTime,
      visitReason: v.visitReason,
      visitType: "business",
      ndaAccepted: v.ndaAccepted,
      signatureData: v.signatureData,
      vehiclePlate: v.vehiclePlate,
      label: "normal",
      category: v.category,
      status: "active",
      badgeQr: v.visitorId,
      notes: "",
      createdAt: v.createdAt,
      shiftType: v.shiftType,
    };
    saveVisitor(visitor);
    addAuditLog(
      session.companyId,
      staff?.name ?? "Personel",
      session.staffId ?? "",
      "kiosk_approved",
      `${v.name} kiosk başvurusu onaylandı`,
    );
    const all: KioskPendingVisitor[] = JSON.parse(
      localStorage.getItem(KIOSK_PENDING_KEY) ?? "[]",
    );
    const updated = all.filter((x) => x.visitorId !== v.visitorId);
    localStorage.setItem(KIOSK_PENDING_KEY, JSON.stringify(updated));
    reload();
  };

  const rejectKioskVisitor = (v: KioskPendingVisitor) => {
    addAuditLog(
      session.companyId,
      staff?.name ?? "Personel",
      session.staffId ?? "",
      "kiosk_rejected",
      `${v.name} kiosk başvurusu reddedildi`,
    );
    const all: KioskPendingVisitor[] = JSON.parse(
      localStorage.getItem(KIOSK_PENDING_KEY) ?? "[]",
    );
    const updated = all.filter((x) => x.visitorId !== v.visitorId);
    localStorage.setItem(KIOSK_PENDING_KEY, JSON.stringify(updated));
    reload();
  };

  // Generate invite code for appointment
  const generateInviteCode = (appt: Appointment) => {
    if (appt.inviteCode) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    saveAppointment({ ...appt, inviteCode: code });
    reload();
  };

  // Save visitor notes
  const saveNotes = () => {
    if (!notesVisitor) return;
    saveVisitor({ ...notesVisitor, notes: notesText });
    setNotesVisitor(null);
    reload();
  };

  // CSV parse
  const handleCsvFile = (file: File) => {
    setCsvError("");
    setCsvSummary(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) {
        setCsvError("CSV dosyası boş veya geçersiz.");
        return;
      }
      const rows = lines
        .slice(1)
        .map((line) => {
          const parts = line
            .split(",")
            .map((p) => p.trim().replace(/^"|"$/g, ""));
          return {
            name: parts[0] ?? "",
            idNumber: parts[1] ?? "",
            phone: parts[2] ?? "",
            visitReason: parts[3] ?? "",
            category: parts[4] ?? "Misafir",
            blacklisted: isBlacklisted(session.companyId, parts[1] ?? ""),
          };
        })
        .filter((r) => r.name && r.idNumber);
      setCsvPreview(rows);
    };
    reader.readAsText(file);
  };

  const confirmCsvImport = () => {
    let imported = 0;
    let skipped = 0;
    for (const row of csvPreview) {
      if (row.blacklisted) {
        skipped++;
        continue;
      }
      const visitorId = generateVisitorId();
      const visitor: Visitor = {
        visitorId,
        companyId: session.companyId,
        registeredBy: session.staffId!,
        name: row.name,
        idNumber: row.idNumber,
        phone: row.phone,
        hostStaffId: "",
        arrivalTime: Date.now(),
        visitReason: row.visitReason,
        visitType: "business",
        ndaAccepted: true,
        signatureData: "",
        label: "normal",
        category: row.category,
        status: "active",
        badgeQr: visitorId,
        notes: "",
        createdAt: Date.now(),
      };
      saveVisitor(visitor);
      imported++;
    }
    addAuditLog(
      session.companyId,
      staff?.name ?? "Personel",
      session.staffId ?? "",
      "bulk_import",
      `CSV ile ${imported} ziyaretçi eklendi, ${skipped} kara listede atlandı`,
    );
    setCsvSummary(
      `✅ ${imported} ziyaretçi eklendi, ${skipped} kara listede olduğu için atlandı.`,
    );
    setCsvPreview([]);
    reload();
  };

  const activeVisitors = visitors.filter((v) => v.status === "active");
  const insideVisitors = visitors.filter((v) => v.status === "active");
  const preregistered = visitors.filter((v) => v.status === "preregistered");

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAppointments = appointments.filter(
    (a) => a.appointmentDate === todayStr && a.status !== "cancelled",
  );

  const maxCap = company?.maxCapacity ?? company?.maxConcurrentVisitors ?? 0;
  const capacityExceeded = maxCap > 0 && insideVisitors.length >= maxCap;

  // Off-hours check
  const currentHour = new Date().getHours();
  const workStart = company?.workingHoursStart ?? 8;
  const workEnd = company?.workingHoursEnd ?? 18;
  const isOffHours = currentHour < workStart || currentHour >= workEnd;

  // Categories for this company
  const companyCategories = getCustomCategories(session.companyId);
  const customFields = company?.customFields ?? [];

  // History search results
  const historyResults =
    historySearch.trim().length >= 3
      ? visitors
          .filter(
            (v) =>
              v.idNumber.includes(historySearch.trim()) ||
              v.name.toLowerCase().includes(historySearch.trim().toLowerCase()),
          )
          .sort((a, b) => b.arrivalTime - a.arrivalTime)
      : [];

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
    [
      "active",
      `${t(lang, "activeVisitors")} (${activeVisitors.length})${kioskPending.length > 0 ? ` 🔔${kioskPending.length}` : ""}`,
    ],
    ["inside", `🏢 Şu An Binada (${insideVisitors.length})`],
    ["appointments", `📅 Randevular (${todayAppointments.length})`],
    ["preregistered", t(lang, "preregistered")],
    ["history", "📜 Geçmiş"],
    ["profile", "Hesabım"],
  ];

  return (
    <div className="min-h-screen" style={{ background: "#0a0f1e" }}>
      {/* ID Verification Dialog */}
      {showIdVerify && pendingVisitorData && (
        <div
          data-ocid="id_verify.dialog"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="w-full max-w-md p-7 rounded-2xl"
            style={{
              background: "#0f1729",
              border: "1.5px solid rgba(14,165,233,0.3)",
            }}
          >
            <div className="text-5xl text-center mb-4">🪪</div>
            <h3 className="text-xl font-bold text-white text-center mb-2">
              {t(lang, "idVerification")}
            </h3>
            <p className="text-slate-300 text-center mb-2">
              {t(lang, "idVerifyQuestion")}
            </p>
            <p className="text-slate-400 text-sm text-center mb-6">
              <span className="text-white font-medium">
                {pendingVisitorData.name}
              </span>
              {" — "}
              {pendingVisitorData.idNumber}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                data-ocid="id_verify.cancel_button"
                onClick={cancelIdVerify}
                className="flex-1 py-3 rounded-xl font-semibold text-slate-300 border border-white/20 hover:bg-white/5 transition-colors"
              >
                {t(lang, "noCancel")}
              </button>
              <button
                type="button"
                data-ocid="id_verify.confirm_button"
                onClick={confirmIdVerify}
                className="flex-1 py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                }}
              >
                {t(lang, "yesProceed")}
              </button>
            </div>
          </div>
        </div>
      )}

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
              border: "1.5px solid rgba(239,68,68,0.3)",
            }}
          >
            <h3 className="text-white font-bold text-lg mb-1">
              Çıkış Değerlendirmesi
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              {exitModalVisitor.name}
            </p>
            <p className="text-slate-300 text-sm mb-3">
              Ziyaret deneyiminizi puanlayın:
            </p>
            <StarRating value={exitRating} onChange={setExitRating} />
            <div className="mt-4">
              <textarea
                data-ocid="exit_rating.comment.textarea"
                value={exitComment}
                onChange={(e) => setExitComment(e.target.value.slice(0, 200))}
                placeholder="Yorum (isteğe bağlı)..."
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

      {/* Notes Dialog */}
      {notesVisitor && (
        <div
          data-ocid="visitor_notes.dialog"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-md p-6 rounded-2xl"
            style={{
              background: "#0f1729",
              border: "1.5px solid rgba(245,158,11,0.3)",
            }}
          >
            <h3 className="text-white font-bold text-lg mb-1">
              Ziyaretçi Notu
            </h3>
            <p className="text-slate-400 text-sm mb-4">{notesVisitor.name}</p>
            <textarea
              data-ocid="visitor_notes.textarea"
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Not ekleyin..."
              rows={4}
              className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none resize-none mb-4"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            />
            <div className="flex gap-3">
              <button
                type="button"
                data-ocid="visitor_notes.cancel_button"
                onClick={() => setNotesVisitor(null)}
                className="flex-1 py-2.5 rounded-xl text-slate-300 text-sm font-medium"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                İptal
              </button>
              <button
                type="button"
                data-ocid="visitor_notes.save_button"
                onClick={saveNotes}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold"
                style={{
                  background: "linear-gradient(135deg,#f59e0b,#d97706)",
                }}
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Bulk Import Dialog */}
      {csvDialogOpen && (
        <div
          data-ocid="csv_import.dialog"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-2xl p-6 rounded-2xl max-h-[90vh] overflow-y-auto"
            style={{
              background: "#0f1729",
              border: "1.5px solid rgba(14,165,233,0.3)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">
                CSV ile Toplu Ekle
              </h3>
              <button
                type="button"
                data-ocid="csv_import.close_button"
                onClick={() => {
                  setCsvDialogOpen(false);
                  setCsvPreview([]);
                  setCsvError("");
                  setCsvSummary(null);
                }}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-400 text-sm mb-4">
              CSV formatı:{" "}
              <span className="font-mono text-[#0ea5e9]">
                name, idNumber, phone, visitReason, category
              </span>
            </p>

            {csvSummary ? (
              <div
                data-ocid="csv_import.success_state"
                className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm mb-4"
              >
                {csvSummary}
              </div>
            ) : (
              <>
                <div
                  data-ocid="csv_import.dropzone"
                  className="border-2 border-dashed rounded-xl p-8 text-center mb-4 cursor-pointer transition-colors hover:border-[#0ea5e9]/60"
                  style={{ borderColor: "rgba(14,165,233,0.3)" }}
                  onClick={() => csvInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) handleCsvFile(file);
                  }}
                  onKeyDown={(e) =>
                    e.key === "Enter" && csvInputRef.current?.click()
                  }
                >
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    data-ocid="csv_import.upload_button"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleCsvFile(file);
                    }}
                  />
                  <div className="text-3xl mb-2">📂</div>
                  <p className="text-slate-300 text-sm">
                    CSV dosyasını buraya sürükleyin veya tıklayın
                  </p>
                </div>

                {csvError && (
                  <div
                    data-ocid="csv_import.error_state"
                    className="text-red-400 text-sm mb-3"
                  >
                    {csvError}
                  </div>
                )}

                {csvPreview.length > 0 && (
                  <div className="mb-4">
                    <p className="text-slate-300 text-sm font-semibold mb-2">
                      {csvPreview.length} kayıt bulundu
                      {csvPreview.filter((r) => r.blacklisted).length > 0 && (
                        <span className="ml-2 text-red-400">
                          ({csvPreview.filter((r) => r.blacklisted).length} kara
                          listede)
                        </span>
                      )}
                    </p>
                    <div className="overflow-auto rounded-xl border border-white/10 max-h-48">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="p-2 text-left text-slate-400">
                              Ad Soyad
                            </th>
                            <th className="p-2 text-left text-slate-400">
                              TC/Pasaport
                            </th>
                            <th className="p-2 text-left text-slate-400">
                              Durum
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreview.map((r, i) => (
                            <tr
                              key={r.idNumber || String(i)}
                              className="border-b border-white/5"
                              style={{
                                background: r.blacklisted
                                  ? "rgba(239,68,68,0.1)"
                                  : "transparent",
                              }}
                            >
                              <td className="p-2 text-white">{r.name}</td>
                              <td className="p-2 text-slate-300 font-mono">
                                {r.idNumber}
                              </td>
                              <td className="p-2">
                                {r.blacklisted ? (
                                  <span className="text-red-400">
                                    ⛔ Kara liste
                                  </span>
                                ) : (
                                  <span className="text-emerald-400">
                                    ✓ Tamam
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex gap-3 mt-3">
                      <button
                        type="button"
                        data-ocid="csv_import.cancel_button"
                        onClick={() => setCsvPreview([])}
                        className="flex-1 py-2.5 rounded-xl text-slate-300 text-sm"
                        style={{
                          background: "rgba(255,255,255,0.07)",
                          border: "1px solid rgba(255,255,255,0.15)",
                        }}
                      >
                        İptal
                      </button>
                      <button
                        type="button"
                        data-ocid="csv_import.confirm_button"
                        onClick={confirmCsvImport}
                        className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold"
                        style={{
                          background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                        }}
                      >
                        Onayla ve Ekle
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
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
      {activeVisitors.length > 0 && tab !== "active" && tab !== "inside" && (
        <div className="mx-6 mt-4 px-4 py-3 rounded-xl border border-[#0ea5e9]/20 bg-[#0ea5e9]/10 flex items-center gap-3">
          <span className="text-[#0ea5e9] text-sm">
            🟢 {activeVisitors.length} aktif ziyaretçi
          </span>
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
                  <div className="flex gap-2">
                    <button
                      type="button"
                      data-ocid="register.print_badge.button"
                      onClick={() => printBadge(registeredVisitor)}
                      disabled={
                        pdfLoading === `${registeredVisitor.visitorId}_print`
                      }
                      className="px-3 py-1.5 rounded-lg text-white text-xs font-medium"
                      style={{
                        background: "rgba(168,85,247,0.2)",
                        border: "1px solid rgba(168,85,247,0.4)",
                      }}
                    >
                      {pdfLoading === `${registeredVisitor.visitorId}_print`
                        ? "⏳"
                        : "🖶"}{" "}
                      Rozeti Yazdır
                    </button>
                    <button
                      type="button"
                      data-ocid="register.pdf.button"
                      onClick={() => downloadPDF(registeredVisitor)}
                      disabled={pdfLoading === registeredVisitor.visitorId}
                      className="px-3 py-1.5 rounded-lg text-white text-xs font-medium"
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
              </div>
            )}

            {/* Kiosk Mode button in header area */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-xl">
                {t(lang, "registerVisitor")}
              </h2>
              <button
                type="button"
                data-ocid="register.kiosk_button"
                onClick={() =>
                  onNavigate("kiosk", { companyId: session.companyId })
                }
                className="px-4 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-2"
                style={{
                  background: "rgba(168,85,247,0.15)",
                  border: "1px solid rgba(168,85,247,0.35)",
                }}
              >
                🖵 Kiosk Modu
              </button>
            </div>

            {/* Off-hours warning */}
            {isOffHours && (
              <div
                data-ocid="register.off_hours_warning"
                className="mb-4 p-3 rounded-xl border border-amber-500/40 bg-amber-900/20 flex items-center gap-3"
              >
                <span className="text-amber-400 text-lg">⚠️</span>
                <p className="text-amber-400 text-sm">
                  Mesai saatleri dışında ({String(workStart).padStart(2, "0")}
                  :00–{String(workEnd).padStart(2, "0")}:00) kayıt yapılıyor
                </p>
              </div>
            )}

            {/* Invite code apply */}
            <div
              className="mb-4 p-3 rounded-xl flex items-center gap-3"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <span className="text-slate-400 text-sm shrink-0">
                Davet kodu:
              </span>
              <input
                data-ocid="register.invite_code_input"
                value={inviteCodeInput}
                onChange={(e) =>
                  setInviteCodeInput(e.target.value.toUpperCase())
                }
                placeholder="XXXXXX"
                maxLength={6}
                className="flex-1 px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-white font-mono text-sm focus:outline-none focus:border-[#0ea5e9]"
              />
              <button
                type="button"
                data-ocid="register.invite_code_button"
                onClick={applyInviteCode}
                className="px-3 py-1.5 rounded-lg text-white text-sm font-medium shrink-0"
                style={{
                  background: "rgba(14,165,233,0.2)",
                  border: "1px solid rgba(14,165,233,0.4)",
                }}
              >
                Uygula
              </button>
            </div>
            {inviteCodeMsg && (
              <div
                className={`mb-4 p-3 rounded-xl text-sm ${
                  inviteCodeMsg.type === "success"
                    ? "text-emerald-400 border border-emerald-500/30 bg-emerald-900/20"
                    : "text-red-400 border border-red-500/30 bg-red-900/20"
                }`}
              >
                {inviteCodeMsg.text}
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

            {/* CSV Import button */}
            <div className="flex justify-end mb-4">
              <button
                type="button"
                data-ocid="register.csv_import.open_modal_button"
                onClick={() => setCsvDialogOpen(true)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-2"
                style={{
                  background: "rgba(34,197,94,0.15)",
                  border: "1px solid rgba(34,197,94,0.35)",
                }}
              >
                📋 CSV ile Toplu Ekle
              </button>
            </div>

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
              {/* Category */}
              <div>
                <p className="text-slate-300 text-sm mb-1 block">Kategori *</p>
                <select
                  data-ocid="register.category.select"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-xl bg-[#0f1729] border border-white/20 text-white focus:outline-none"
                >
                  {companyCategories.map((cat) => (
                    <option key={cat} value={cat} className="bg-[#0f1729]">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              {/* Shift display */}
              <div>
                <p className="text-slate-300 text-sm mb-1 block">Vardiya</p>
                <div
                  className="w-full px-4 py-3 rounded-xl border text-sm"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#94a3b8",
                  }}
                >
                  {shiftLabel(getShiftType(form.arrivalTime))}
                </div>
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

              {/* Custom fields */}
              {customFields.map((cf) => (
                <div key={cf.id}>
                  <p className="text-slate-300 text-sm mb-1 block">
                    {cf.label}
                    {cf.required && " *"}
                  </p>
                  <input
                    data-ocid="register.custom_field.input"
                    value={form.customFieldValues[cf.id] ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        customFieldValues: {
                          ...f.customFieldValues,
                          [cf.id]: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#f59e0b]"
                  />
                </div>
              ))}
              {/* Accessibility needs */}
              <div>
                <p className="text-slate-300 text-sm mb-1 block">
                  Özel Gereksinim
                </p>
                <select
                  data-ocid="register.special_needs.select"
                  value={form.specialNeeds}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, specialNeeds: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-xl bg-[#0f1729] border border-white/20 text-white focus:outline-none"
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

              {/* Visitor Photo Capture */}
              <div className="sm:col-span-2">
                <p className="text-slate-300 text-sm mb-1 block">
                  Ziyaretçi Fotoğrafı (İsteğe Bağlı)
                </p>
                {form.visitorPhoto ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={form.visitorPhoto}
                      alt="Ziyaretçi"
                      className="w-16 h-16 rounded-xl object-cover border border-white/20"
                    />
                    <button
                      type="button"
                      data-ocid="register.retake_photo.button"
                      onClick={() => {
                        setForm((f) => ({ ...f, visitorPhoto: "" }));
                        setShowCameraCapture(false);
                        camera.stopCamera();
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white"
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.15)",
                      }}
                    >
                      🔄 Yeniden Çek
                    </button>
                  </div>
                ) : showCameraCapture ? (
                  <div>
                    <div
                      className="relative rounded-xl overflow-hidden mb-2"
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
                    <div className="flex gap-2">
                      <button
                        type="button"
                        data-ocid="register.capture_photo.button"
                        onClick={async () => {
                          const photo = await camera.capturePhoto();
                          if (photo) {
                            setForm((f) => ({ ...f, visitorPhoto: photo }));
                            setShowCameraCapture(false);
                            camera.stopCamera();
                          }
                        }}
                        className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
                        style={{
                          background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                        }}
                      >
                        📸 Fotoğraf Çek
                      </button>
                      <button
                        type="button"
                        data-ocid="register.cancel_camera.button"
                        onClick={() => {
                          setShowCameraCapture(false);
                          camera.stopCamera();
                        }}
                        className="px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white"
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
                    data-ocid="register.open_camera.button"
                    onClick={async () => {
                      setShowCameraCapture(true);
                      await camera.startCamera();
                    }}
                    className="w-full py-3 rounded-xl text-slate-400 hover:text-white flex items-center justify-center gap-2 transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1.5px dashed rgba(255,255,255,0.15)",
                    }}
                  >
                    <span className="text-xl">📷</span> Kamera Aç
                  </button>
                )}
              </div>
            </div>
            <div className="mt-4 space-y-4">
              {/* NDA/KVKK with collapsible text */}
              <div
                className="p-4 rounded-xl"
                style={{
                  background: form.ndaAccepted
                    ? "rgba(34,197,94,0.06)"
                    : "rgba(255,255,255,0.04)",
                  border: form.ndaAccepted
                    ? "1.5px solid rgba(34,197,94,0.3)"
                    : "1.5px solid rgba(255,255,255,0.12)",
                }}
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    data-ocid="register.nda.checkbox"
                    type="checkbox"
                    checked={form.ndaAccepted}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ndaAccepted: e.target.checked }))
                    }
                    className="w-4 h-4 mt-0.5 rounded accent-[#0ea5e9] shrink-0"
                  />
                  <div className="flex-1">
                    <span className="text-slate-200 text-sm font-medium">
                      {t(lang, "ndaAccept")}
                    </span>
                    <button
                      type="button"
                      data-ocid="register.nda.toggle"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          ndaExpanded: !f.ndaExpanded,
                        }))
                      }
                      className="ml-2 text-[#0ea5e9] text-xs hover:underline"
                    >
                      {form.ndaExpanded ? "Gizle ▲" : "Metni Oku ▼"}
                    </button>
                    {form.ndaExpanded && (
                      <p
                        className="mt-2 text-slate-400 text-xs leading-relaxed p-3 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      >
                        Kişisel verileriniz KVKK kapsamında ziyaret kaydı
                        amacıyla işlenmektedir. Verileriniz 90 gün sonra
                        otomatik olarak silinecektir.
                      </p>
                    )}
                  </div>
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
              data-ocid="register.submit_button"
              onClick={submitVisitor}
              className="mt-6 w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90"
              style={{
                background: "linear-gradient(135deg,#f59e0b,#d97706)",
              }}
            >
              {t(lang, "registerVisitor")}
            </button>
          </div>
        )}

        {/* ACTIVE VISITORS TAB */}
        {tab === "active" && (
          <div>
            {/* Kiosk Pending Approvals */}
            {kioskPending.length > 0 && (
              <div
                className="mb-6 p-5 rounded-2xl"
                style={{
                  background: "rgba(245,158,11,0.08)",
                  border: "1.5px solid rgba(245,158,11,0.3)",
                }}
              >
                <h3 className="text-amber-400 font-bold text-sm mb-4 flex items-center gap-2">
                  🔔 Kiosk Onayı Bekleyen ({kioskPending.length})
                </h3>
                <div className="space-y-3">
                  {kioskPending.map((v, i) => (
                    <div
                      key={v.visitorId}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                    >
                      <div>
                        <p className="text-white font-medium text-sm">
                          {v.name}
                        </p>
                        <p className="text-slate-400 text-xs">
                          {v.idNumber} &bull; {v.phone}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {new Date(v._submittedAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          data-ocid={`kiosk.approval.cancel_button.${i + 1}`}
                          onClick={() => rejectKioskVisitor(v)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 border border-red-500/30 hover:bg-red-900/20"
                        >
                          Reddet
                        </button>
                        <button
                          type="button"
                          data-ocid={`kiosk.approval.confirm_button.${i + 1}`}
                          onClick={() => approveKioskVisitor(v)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                          style={{
                            background:
                              "linear-gradient(135deg,#0ea5e9,#0284c7)",
                          }}
                        >
                          Onayla
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeVisitors.length === 0 ? (
              <div
                data-ocid="active_visitors.empty_state"
                className="text-center py-16 text-slate-500"
              >
                {t(lang, "noVisitors")}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeVisitors
                  .slice()
                  .sort((a, b) => b.arrivalTime - a.arrivalTime)
                  .map((v, i) => {
                    const over4h = hoursSince(v.arrivalTime) >= 4;
                    // Find if there's an appointment for this visitor with a backup contact
                    const visitorAppt = appointments.find(
                      (a) =>
                        a.visitorId === v.idNumber &&
                        a.backupContact &&
                        a.status !== "cancelled",
                    );
                    // Check if host is "absent" (appointment >15 min past start time)
                    const showBackupContact =
                      visitorAppt?.backupContact &&
                      (() => {
                        try {
                          const [h, m] = (
                            visitorAppt.appointmentTime || "00:00"
                          )
                            .split(":")
                            .map(Number);
                          const apptTs = new Date(visitorAppt.appointmentDate);
                          apptTs.setHours(h, m, 0, 0);
                          return Date.now() - apptTs.getTime() > 15 * 60 * 1000;
                        } catch {
                          return false;
                        }
                      })();
                    return (
                      <div
                        key={v.visitorId}
                        data-ocid={`active_visitors.item.${i + 1}`}
                        className="p-5 rounded-2xl"
                        style={{
                          background: over4h
                            ? "rgba(245,158,11,0.06)"
                            : "rgba(255,255,255,0.04)",
                          border: `1.5px solid ${LABEL_COLORS[v.label]}40`,
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {v.visitorPhoto ? (
                              <img
                                src={v.visitorPhoto}
                                alt={v.name}
                                className="w-8 h-8 rounded-xl object-cover border border-white/20"
                              />
                            ) : (
                              <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs"
                                style={{ background: LABEL_COLORS[v.label] }}
                              >
                                {v.name[0]?.toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="text-white font-semibold text-sm">
                                {v.name}
                              </div>
                              {v.category && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-xs font-medium text-white"
                                  style={{
                                    background:
                                      CATEGORY_COLORS[v.category] ?? "#64748b",
                                  }}
                                >
                                  {v.category}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0">
                            <QRCode value={v.badgeQr} size={40} />
                          </div>
                        </div>
                        <div className="text-slate-400 text-sm mb-1">
                          Host:{" "}
                          {staffList.find((s) => s.staffId === v.hostStaffId)
                            ?.name ?? v.hostStaffId}
                        </div>
                        <div className="text-slate-400 text-sm mb-1">
                          {t(lang, "arrivalAt")}:{" "}
                          {formatDateTime(v.arrivalTime)}
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
                        {showBackupContact && (
                          <div
                            className="mt-2 px-3 py-2 rounded-lg text-xs"
                            style={{
                              background: "rgba(245,158,11,0.12)",
                              border: "1px solid rgba(245,158,11,0.3)",
                            }}
                          >
                            <span className="text-amber-400 font-medium">
                              ⚡ Yedek İletişim:{" "}
                            </span>
                            <span className="text-amber-300">
                              {visitorAppt?.backupContact}
                            </span>
                          </div>
                        )}
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
                            data-ocid={`active_visitors.note.button.${i + 1}`}
                            onClick={() => {
                              setNotesVisitor(v);
                              setNotesText(v.notes ?? "");
                            }}
                            title="Not Ekle"
                            className="px-3 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-80"
                            style={{
                              background: "rgba(245,158,11,0.15)",
                              border: "1px solid rgba(245,158,11,0.3)",
                            }}
                          >
                            📝
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
            {/* Capacity Warning */}
            {capacityExceeded && (
              <div
                data-ocid="inside.capacity.error_state"
                className="mb-4 p-4 rounded-xl border border-red-500/50 bg-red-900/20 flex items-center gap-3"
              >
                <span className="text-2xl">🚨</span>
                <div>
                  <p className="text-red-400 font-semibold text-sm">
                    Kapasite Sınırına Ulaşıldı!
                  </p>
                  <p className="text-red-300/70 text-xs mt-0.5">
                    Binada {insideVisitors.length} ziyaretçi var — maksimum
                    kapasite {maxCap} kişi.
                  </p>
                </div>
              </div>
            )}

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
                  background: capacityExceeded
                    ? "linear-gradient(135deg,rgba(239,68,68,0.2),rgba(220,38,38,0.2))"
                    : "linear-gradient(135deg,rgba(14,165,233,0.2),rgba(2,132,199,0.2))",
                  border: `1.5px solid ${
                    capacityExceeded
                      ? "rgba(239,68,68,0.4)"
                      : "rgba(14,165,233,0.4)"
                  }`,
                }}
              >
                <div
                  className="text-3xl font-bold"
                  style={{ color: capacityExceeded ? "#ef4444" : "#0ea5e9" }}
                >
                  {insideVisitors.length}
                </div>
                <div className="text-slate-400 text-xs">
                  İçeride{maxCap > 0 ? ` / ${maxCap}` : ""}
                </div>
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
                          border: `1.5px solid ${
                            over4h
                              ? "rgba(245,158,11,0.4)"
                              : "rgba(255,255,255,0.1)"
                          }`,
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
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-slate-400 text-xs">
                                {v.phone}
                              </span>
                              {v.category && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-xs font-medium text-white"
                                  style={{
                                    background:
                                      CATEGORY_COLORS[v.category] ?? "#64748b",
                                  }}
                                >
                                  {v.category}
                                </span>
                              )}
                              {v.vehiclePlate && (
                                <span className="font-mono text-xs text-slate-300">
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
                              className={`text-sm font-semibold ${
                                over4h ? "text-amber-400" : "text-white"
                              }`}
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
                    {todayAppointments.map((appt, i) => {
                      const [h, m] = appt.appointmentTime
                        .split(":")
                        .map(Number);
                      const apptTimestamp = new Date(appt.appointmentDate);
                      apptTimestamp.setHours(h, m, 0, 0);
                      const isOverdue =
                        appt.status === "pending" &&
                        Date.now() - apptTimestamp.getTime() > 15 * 60 * 1000;

                      return (
                        <div
                          key={appt.id}
                          data-ocid={`appointments.item.${i + 1}`}
                          className="p-4 rounded-2xl"
                          style={{
                            background:
                              appt.status === "approved"
                                ? "rgba(34,197,94,0.07)"
                                : isOverdue
                                  ? "rgba(245,158,11,0.08)"
                                  : "rgba(255,255,255,0.04)",
                            border:
                              appt.status === "approved"
                                ? "1.5px solid rgba(34,197,94,0.3)"
                                : isOverdue
                                  ? "1.5px solid rgba(245,158,11,0.4)"
                                  : "1.5px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                                {isOverdue && (
                                  <span
                                    className="px-2 py-0.5 rounded-full text-xs font-bold"
                                    style={{
                                      background: "rgba(245,158,11,0.25)",
                                      color: "#f59e0b",
                                      border: "1px solid rgba(245,158,11,0.4)",
                                    }}
                                  >
                                    ⏰ Geç Kaldı
                                  </span>
                                )}
                                {/* Invite code badge */}
                                {appt.inviteCode && (
                                  <span
                                    data-ocid={`appointments.invite_code.${i + 1}`}
                                    className="px-2 py-0.5 rounded-full text-xs font-mono font-bold"
                                    style={{
                                      background: "rgba(168,85,247,0.2)",
                                      color: "#a855f7",
                                      border: "1px solid rgba(168,85,247,0.4)",
                                    }}
                                  >
                                    🔑 {appt.inviteCode}
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-400 text-sm flex items-center gap-2 flex-wrap">
                                🕐 {appt.appointmentTime} &bull; Host:{" "}
                                {appt.hostName}
                                {(() => {
                                  const cd = getAppointmentCountdown(
                                    appt.appointmentDate,
                                    appt.appointmentTime,
                                  );
                                  return (
                                    <span
                                      data-ocid={`appointments.countdown.${i + 1}`}
                                      className="px-2 py-0.5 rounded-full text-xs font-bold"
                                      style={{
                                        background: `${cd.color}22`,
                                        color: cd.color,
                                        border: `1px solid ${cd.color}44`,
                                      }}
                                    >
                                      ⏱ {cd.label}
                                    </span>
                                  );
                                })()}
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
                            <div className="flex flex-col gap-2 shrink-0">
                              {appt.status === "pending" && (
                                <>
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
                                </>
                              )}
                              {/* Invite code button */}
                              {!appt.inviteCode ? (
                                <button
                                  type="button"
                                  data-ocid={`appointments.invite_button.${i + 1}`}
                                  onClick={() => generateInviteCode(appt)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                                  style={{
                                    background: "rgba(168,85,247,0.15)",
                                    border: "1px solid rgba(168,85,247,0.35)",
                                  }}
                                >
                                  🔑 Davet Kodu
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <p className="text-slate-300 text-sm mb-1">TC/Pasaport *</p>
                    <input
                      data-ocid="appointments.visitor_id.input"
                      value={apptForm.visitorId}
                      onChange={(e) =>
                        setApptForm((f) => ({
                          ...f,
                          visitorId: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none font-mono"
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
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <p className="text-slate-300 text-sm mb-1">Tarih</p>
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
                    <p className="text-slate-300 text-sm mb-1">Saat</p>
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
                  <div>
                    <p className="text-slate-300 text-sm mb-1">
                      Yedek İletişim (isteğe bağlı)
                    </p>
                    <input
                      data-ocid="appointment.backup_contact_input"
                      value={apptForm.backupContact}
                      onChange={(e) =>
                        setApptForm((f) => ({
                          ...f,
                          backupContact: e.target.value,
                        }))
                      }
                      placeholder="Alternatif yetkili adı veya telefon"
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <p className="text-slate-300 text-sm mb-1">Tekrar</p>
                    <select
                      data-ocid="appointment.recurring_select"
                      value={apptForm.recurrence}
                      onChange={(e) =>
                        setApptForm((f) => ({
                          ...f,
                          recurrence: e.target.value as
                            | "none"
                            | "weekly"
                            | "monthly",
                        }))
                      }
                      className="w-full px-4 py-3 rounded-xl bg-[#0f1729] border border-white/20 text-white focus:outline-none"
                    >
                      <option value="none" className="bg-[#0f1729]">
                        Yok
                      </option>
                      <option value="weekly" className="bg-[#0f1729]">
                        Haftalık
                      </option>
                      <option value="monthly" className="bg-[#0f1729]">
                        Aylık
                      </option>
                    </select>
                  </div>
                  {apptForm.recurrence !== "none" && (
                    <div>
                      <p className="text-slate-300 text-sm mb-1">
                        Bitiş Tarihi
                      </p>
                      <input
                        data-ocid="appointment.recurring_end_input"
                        type="date"
                        value={apptForm.recurrenceEndDate}
                        onChange={(e) =>
                          setApptForm((f) => ({
                            ...f,
                            recurrenceEndDate: e.target.value,
                          }))
                        }
                        min={apptForm.appointmentDate}
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none"
                      />
                    </div>
                  )}
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

        {/* HISTORY TAB */}
        {tab === "history" && (
          <div>
            <div className="mb-6">
              <h2 className="text-white font-bold text-xl mb-4">
                Ziyaretçi Geçmişi
              </h2>
              <input
                data-ocid="history.search_input"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="TC numarası veya isim ile arayın (min 3 karakter)..."
                className="w-full max-w-md px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9] text-sm"
              />
            </div>

            {historySearch.trim().length < 3 ? (
              <div
                data-ocid="history.empty_state"
                className="text-center py-16 text-slate-500"
              >
                Aramak için en az 3 karakter girin.
              </div>
            ) : historyResults.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                Sonuç bulunamadı.
              </div>
            ) : (
              <div>
                <p className="text-slate-400 text-sm mb-4">
                  {historyResults.length} sonuç bulundu
                </p>
                <div
                  data-ocid="history.table"
                  className="overflow-auto rounded-2xl border border-white/10"
                >
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        className="border-b border-white/10"
                        style={{ background: "rgba(255,255,255,0.04)" }}
                      >
                        <th className="p-3 text-left text-slate-400 font-medium">
                          Tarih
                        </th>
                        <th className="p-3 text-left text-slate-400 font-medium">
                          Ad Soyad
                        </th>
                        <th className="p-3 text-left text-slate-400 font-medium">
                          Kategori
                        </th>
                        <th className="p-3 text-left text-slate-400 font-medium">
                          Amaç
                        </th>
                        <th className="p-3 text-left text-slate-400 font-medium">
                          Durum
                        </th>
                        <th className="p-3 text-left text-slate-400 font-medium">
                          Giriş
                        </th>
                        <th className="p-3 text-left text-slate-400 font-medium">
                          Çıkış
                        </th>
                        <th className="p-3 text-left text-slate-400 font-medium">
                          Kaydeden
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyResults.map((v, i) => (
                        <tr
                          key={v.visitorId}
                          data-ocid={`history.row.${i + 1}`}
                          className="border-b border-white/5 hover:bg-white/3 transition-colors"
                        >
                          <td className="p-3 text-slate-400 text-xs">
                            {new Date(v.arrivalTime).toLocaleDateString(
                              "tr-TR",
                            )}
                          </td>
                          <td className="p-3">
                            <div className="text-white font-medium">
                              {v.name}
                            </div>
                            <div className="text-slate-500 text-xs font-mono">
                              {v.idNumber}
                            </div>
                          </td>
                          <td className="p-3">
                            {v.category && (
                              <span
                                className="px-2 py-0.5 rounded text-xs text-white"
                                style={{
                                  background:
                                    CATEGORY_COLORS[v.category] ?? "#64748b",
                                }}
                              >
                                {v.category}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-300 text-xs">
                            {v.visitReason || "—"}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                v.status === "active"
                                  ? "text-emerald-400 bg-emerald-500/20"
                                  : "text-slate-400 bg-slate-500/20"
                              }`}
                            >
                              {v.status === "active"
                                ? "Aktif"
                                : v.status === "departed"
                                  ? "Çıkış Yaptı"
                                  : "Ön Kayıt"}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400 text-xs">
                            {formatDateTime(v.arrivalTime).split(" ")[1]}
                          </td>
                          <td className="p-3 text-slate-400 text-xs">
                            {v.departureTime
                              ? formatDateTime(v.departureTime).split(" ")[1]
                              : "—"}
                          </td>
                          <td className="p-3 text-slate-400 text-xs">
                            {staffList.find((s) => s.staffId === v.registeredBy)
                              ?.name ?? v.registeredBy}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                      className="p-4 rounded-2xl flex items-center justify-between gap-3"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      <div>
                        <div className="text-white font-medium text-sm">
                          {c.name}
                        </div>
                        <div
                          className="text-xs font-mono mt-0.5"
                          style={{ color: "#0ea5e9" }}
                        >
                          {c.companyId}
                        </div>
                      </div>
                      <button
                        type="button"
                        data-ocid={`staff_profile.company.code.button.${i + 1}`}
                        onClick={() => copyCode(c.companyId, `company_${i}`)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background:
                            copiedCode === `company_${i}`
                              ? "rgba(34,197,94,0.15)"
                              : "rgba(255,255,255,0.07)",
                          border:
                            copiedCode === `company_${i}`
                              ? "1px solid rgba(34,197,94,0.3)"
                              : "1px solid rgba(255,255,255,0.15)",
                          color:
                            copiedCode === `company_${i}`
                              ? "#22c55e"
                              : "#94a3b8",
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

      {/* Footer */}
      <footer className="text-center py-6 text-slate-600 text-xs border-t border-white/5">
        © {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
