import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  Calendar,
  ClipboardList,
  HelpCircle,
  ShieldOff,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { addAuditLog } from "../auditLog";
import EmptyState from "../components/EmptyState";
import LangSwitcher from "../components/LangSwitcher";
import NotificationCenter from "../components/NotificationCenter";
import QRCode from "../components/QRCode";
import SignatureCanvas from "../components/SignatureCanvas";
import { useCameraCapture as useCamera } from "../hooks/useCameraCapture";
import { getLang, t } from "../i18n";

import {
  addAlertHistory,
  addNotification,
  clearSession,
  findApprovedByIdNumber,
  findCompanyById,
  findPermitByIdNumber,
  findStaffById,
  getAlertHistory,
  getAllStaff,
  getAppointments,
  getApprovedVisitors,
  getCompanyDepartments,
  getCompanyFloors,
  getCustomCategories,
  getInvitations,
  getLockdown,
  getSession,
  getStaffByCompany,
  getVisitors,
  isBlacklisted,
  refreshSession,
  saveAppointment,
  saveCompany,
  saveInvitation,
  saveStaff,
  saveVisitor,
} from "../store";
import type {
  AlertHistoryEntry,
  AppScreen,
  Appointment,
  ApprovedVisitor,
  Company,
  ContractorPermit,
  ExitQuestion,
  Invitation,
  Staff,
  Visitor,
} from "../types";
import {
  copyToClipboard,
  durationLabel,
  formatDateTime,
  generateId,
  generateVisitorId,
  hoursSince,
} from "../utils";
import { printFormalDocument } from "../utils/formalDocument";
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
  | "profile"
  | "invitations";

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
  multiDay: false,
  endDate: "",
  department: "",
  floor: "",
  screeningAnswers: {} as Record<string, string>,
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
  const [lockdownActive] = useState(() => getLockdown(session.companyId));
  const [storageDismissed, setStorageDismissed] = useState(
    () => localStorage.getItem("safentry_storage_notice_dismissed") === "1",
  );
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

  // Approved visitor suggestion
  const [approvedSuggestion, setApprovedSuggestion] =
    useState<ApprovedVisitor | null>(null);

  // Daily appointments banner
  const [dailyBannerDismissed, setDailyBannerDismissed] = useState(false);

  // Parking assign
  const [parkingModalVisitor, setParkingModalVisitor] =
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
  const [permitWarning, setPermitWarning] = useState<{
    type: "expired" | "expiring" | "missing";
    permitInfo?: ContractorPermit;
  } | null>(null);
  const [permitProceed, setPermitProceed] = useState<(() => void) | null>(null);
  const [timeRestrictionWarning, setTimeRestrictionWarning] = useState<{
    message: string;
    strictMode: boolean;
  } | null>(null);
  const [timeRestrictionProceed, setTimeRestrictionProceed] = useState<
    (() => void) | null
  >(null);
  const [slaTimer, setSlaTimer] = useState(0);
  const [bypassPermitCheck, setBypassPermitCheck] = useState(false);
  const [bypassTimeCheck, setBypassTimeCheck] = useState(false);
  const submitWithBypassRef = useRef<(() => void) | null>(null);

  // Invite code apply
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [inviteCodeMsg, setInviteCodeMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Camera for visitor photo
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const camera = useCamera();

  // Equipment modal
  const [equipmentModalVisitor, setEquipmentModalVisitor] =
    useState<Visitor | null>(null);
  const [equipmentForm, setEquipmentForm] = useState({
    type: "Misafir Kartı",
    id: "",
  });
  const [equipmentReturnChecked, setEquipmentReturnChecked] = useState(false);

  // Blacklist blocking modal
  const [blacklistModalVisible, setBlacklistModalVisible] = useState(false);
  const [blacklistModalName, setBlacklistModalName] = useState("");

  // Personnel absence
  const [absenceToggle, setAbsenceToggle] = useState(staff?.isAbsent ?? false);
  const [absenceReason, setAbsenceReason] = useState(
    staff?.absenceReason ?? "İzin",
  );
  const [absentUntil, setAbsentUntil] = useState(staff?.absentUntil ?? "");

  // Exit survey custom answers
  const [exitSurveyAnswers, setExitSurveyAnswers] = useState<
    Record<string, string>
  >({});

  // Shift report
  const [shiftReportOpen, setShiftReportOpen] = useState(false);

  // Re-invite prefill
  const [_reinviteVisitor, setReinviteVisitor] = useState<Visitor | null>(null);

  // Guest invitation
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showCreateInviteModal, setShowCreateInviteModal] = useState(false);
  const [newInviteHostName, setNewInviteHostName] = useState("");
  const [createdInviteLink, setCreatedInviteLink] = useState("");
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [rejectInviteToken, setRejectInviteToken] = useState<string | null>(
    null,
  );
  const [rejectReason, setRejectReason] = useState("");
  // Bulk exit state
  const [bulkExitModalOpen, setBulkExitModalOpen] = useState(false);
  // Visitor profile state
  const [profileVisitor, setProfileVisitor] = useState<Visitor | null>(null);
  // Appointment calendar view
  const [apptView, setApptView] = useState<"list" | "calendar">("list");
  // Private note state
  const [privateNoteVisitor, setPrivateNoteVisitor] = useState<Visitor | null>(
    null,
  );
  const [privateNoteText, setPrivateNoteText] = useState("");

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
    setInvitations(
      getInvitations(session.companyId).filter((i) => i.status === "submitted"),
    );
    loadKioskPending();
    refreshSession();
  }, [session.companyId, loadKioskPending]);

  // SLA timer - tick every second to update waiting times
  useEffect(() => {
    const t = setInterval(() => {
      setSlaTimer((n) => n + 1);
      // Check for SLA breaches
      const company = findCompanyById(session.companyId);
      const sla = (company?.slaThreshold ?? 10) * 60 * 1000;
      const pending: KioskPendingVisitor[] = JSON.parse(
        localStorage.getItem("safentry_kiosk_pending") ?? "[]",
      );
      const myPending = pending.filter(
        (v) => v.companyId === session.companyId,
      );
      for (const v of myPending) {
        const waited = Date.now() - v._submittedAt;
        if (waited >= sla) {
          // Check if we already notified (use a flag in the pending record)
          const flagKey = `safentry_sla_notified_${v.visitorId}`;
          if (!localStorage.getItem(flagKey)) {
            localStorage.setItem(flagKey, "1");
            addNotification({
              id: generateId(),
              companyId: session.companyId,
              type: "sla_breach",
              message: `${v.name} kiosk başvurusu ${Math.floor(waited / 60000)} dakikadır bekliyor — SLA aşıldı!`,
              createdAt: Date.now(),
              read: false,
              relatedId: v.visitorId,
            });
          }
        }
      }
    }, 1000);
    return () => clearInterval(t);
  }, [session.companyId]);

  // Re-submit form when bypass flags are set
  useEffect(() => {
    if (bypassPermitCheck || bypassTimeCheck) {
      // Re-trigger form submission - handled by the bypass flags in the submit handler
    }
  }, [bypassPermitCheck, bypassTimeCheck]);

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

  const saveAbsenceSettings = (
    absent: boolean,
    reason: string,
    until: string,
  ) => {
    if (!staff) return;
    saveStaff({
      ...staff,
      isAbsent: absent,
      absenceReason: reason,
      absentUntil: until,
    });
  };

  const copyCode = (code: string, key: string) => {
    copyToClipboard(code);
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
      // Also check approved visitors list
      const approved = findApprovedByIdNumber(session.companyId, val);
      setApprovedSuggestion(approved ?? null);
    } else {
      setReturningSuggestion(null);
      setApprovedSuggestion(null);
    }
  };

  const applyApprovedSuggestion = () => {
    if (!approvedSuggestion) return;
    setForm((f) => ({
      ...f,
      name: approvedSuggestion.name,
      phone: approvedSuggestion.phone ?? f.phone,
      visitReason: approvedSuggestion.visitReason ?? f.visitReason,
      category: approvedSuggestion.category ?? f.category,
    }));
    setApprovedSuggestion(null);
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
    submitWithBypassRef.current = submitVisitor;
    if (!form.name || !form.idNumber || !form.phone || !form.hostStaffId) {
      setFormError(
        "Bu alan zorunludur — lütfen ad soyad, TC/pasaport, telefon ve ev sahibi alanlarını doldurun.",
      );
      return;
    }
    if (!form.department || !form.floor) {
      setFormError("Departman ve kat seçimi zorunludur.");
      return;
    }
    if (!form.ndaAccepted) {
      setFormError("Gizlilik sözleşmesini onaylamanız gerekiyor.");
      return;
    }
    if (!form.signatureData) {
      setFormError("Lütfen dijital imzanızı atın.");
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
    // Check blocking screening questions
    const screeningQs = company?.screeningQuestions ?? [];
    for (const sq of screeningQs) {
      if (
        sq.type === "yes_no" &&
        sq.blocking &&
        form.screeningAnswers[sq.id] === "Hayır"
      ) {
        setFormError(
          "Güvenlik sorusu yanıtı nedeniyle giriş engellenmiştir. Lütfen güvenlik görevlisiyle iletişime geçin.",
        );
        return;
      }
    }
    if (isBlacklisted(session.companyId, form.idNumber)) {
      setBlacklistModalName(form.name);
      setBlacklistModalVisible(true);
      toast.error("Bu kişi kara listede — giriş engellidir");
      addNotification({
        id: generateId(),
        companyId: session.companyId,
        type: "blacklist_hit",
        message: `Kara liste uyarısı: ${form.name} (TC: ${form.idNumber}) giriş denemesi engellendi.`,
        createdAt: Date.now(),
        read: false,
      });
      const alertEntry: AlertHistoryEntry = {
        id: generateId(),
        companyId: session.companyId,
        type: "blacklist",
        timestamp: Date.now(),
        detail: `${form.name} (TC: ${form.idNumber}) kara listede tespit edildi — giriş engellendi`,
        personelId: session.staffId,
      };
      addAlertHistory(alertEntry);
      return;
    }

    // Time restriction check
    const timeRestrictions =
      findCompanyById(session.companyId)?.categoryTimeRestrictions ?? [];
    const catRestriction = timeRestrictions.find(
      (r) => r.category === form.category,
    );
    if (catRestriction) {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const dayAllowed = catRestriction.allowedDays.includes(dayOfWeek);
      const timeAllowed =
        currentTime >= catRestriction.allowedStart &&
        currentTime <= catRestriction.allowedEnd;
      if (!dayAllowed || !timeAllowed) {
        const DAY_NAMES = [
          "Pazar",
          "Pazartesi",
          "Salı",
          "Çarşamba",
          "Perşembe",
          "Cuma",
          "Cumartesi",
        ];
        const allowedDayNames = catRestriction.allowedDays
          .map((d) => DAY_NAMES[d])
          .join(", ");
        const msg = `Bu kategori için giriş saati dışındasınız. "${form.category}" ziyaretçileri sadece ${allowedDayNames} günleri ${catRestriction.allowedStart}–${catRestriction.allowedEnd} saatleri arasında giriş yapabilir.`;
        if (catRestriction.strictMode) {
          toast.error(msg);
          return;
        }
        // Show override warning
        setTimeRestrictionWarning({ message: msg, strictMode: false });
        setTimeRestrictionProceed(() => () => {
          setTimeRestrictionWarning(null);
          setBypassTimeCheck(true);
          setTimeout(() => submitWithBypassRef.current?.(), 0);
        });
        return;
      }
    }

    // Contractor permit check
    const contractorCategories = ["Müteahhit", "Contractor", "müteahhit"];
    if (contractorCategories.includes(form.category) && !bypassPermitCheck) {
      const permit = findPermitByIdNumber(session.companyId, form.idNumber);
      if (!permit) {
        setPermitWarning({ type: "missing" });
        setPermitProceed(() => () => {
          setPermitWarning(null);
          setBypassPermitCheck(true);
          setTimeout(() => submitWithBypassRef.current?.(), 0);
        });
        return;
      }
      const expiry = new Date(permit.expiryDate);
      const now = new Date();
      const daysLeft = Math.ceil(
        (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysLeft < 0) {
        setPermitWarning({ type: "expired", permitInfo: permit });
        setPermitProceed(() => () => {
          setPermitWarning(null);
          setBypassPermitCheck(true);
          setTimeout(() => submitWithBypassRef.current?.(), 0);
        });
        return;
      }
      if (daysLeft <= 7) {
        setPermitWarning({ type: "expiring", permitInfo: permit });
        setPermitProceed(() => () => {
          setPermitWarning(null);
          setBypassPermitCheck(true);
          setTimeout(() => submitWithBypassRef.current?.(), 0);
        });
        return;
      }
    }

    // Registration
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
      multiDay: form.multiDay || undefined,
      endDate: form.multiDay && form.endDate ? form.endDate : undefined,
      department: form.department || undefined,
      floor: form.floor || undefined,
      screeningAnswers: Object.keys(form.screeningAnswers).length
        ? Object.entries(form.screeningAnswers).map(([qid, ans]) => ({
            questionId: qid,
            question: qid,
            answer: ans,
          }))
        : undefined,
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
    toast.success("Ziyaretçi başarıyla kaydedildi");
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
    setExitSurveyAnswers({});
  };

  const confirmExit = () => {
    const customQs = company?.customExitQuestions ?? [];
    const hasCustom = customQs.length > 0;
    if (!exitModalVisitor) return;
    if (!hasCustom && exitRating === 0) return;
    if (exitModalVisitor.equipment && !equipmentReturnChecked) return;
    saveVisitor({
      ...exitModalVisitor,
      status: "departed",
      departureTime: Date.now(),
      exitRating: hasCustom ? exitRating || undefined : exitRating,
      exitComment: exitComment.trim() || undefined,
      exitSurveyAnswers: Object.keys(exitSurveyAnswers).length
        ? exitSurveyAnswers
        : undefined,
      equipment:
        exitModalVisitor.equipment && equipmentReturnChecked
          ? null
          : exitModalVisitor.equipment,
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
    setEquipmentReturnChecked(false);
    toast.success("Çıkış kaydedildi");
    reload();
  };

  const bulkExit = () => {
    const now = Date.now();
    for (const v of activeVisitors) {
      saveVisitor({ ...v, status: "departed", departureTime: now });
    }
    setVisitors(getVisitors(session!.companyId));
    setBulkExitModalOpen(false);
    addAuditLog(
      session!.companyId,
      staff?.name ?? session!.staffId ?? "Personel",
      session!.staffId ?? "",
      "Toplu Çıkış",
      `${activeVisitors.length} ziyaretçi toplu çıkış yapıldı`,
    );
  };

  const savePrivateNote = () => {
    if (!privateNoteVisitor) return;
    saveVisitor({ ...privateNoteVisitor, privateNote: privateNoteText });
    setVisitors(getVisitors(session!.companyId));
    setPrivateNoteVisitor(null);
    setPrivateNoteText("");
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
      toast.success("Rozet yazdırıldı");
    } catch (err) {
      console.error("Print failed", err);
      toast.error("Rozet yazdırılırken hata oluştu");
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
    toast.success("Randevu oluşturuldu");
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

  // Re-invite visitor pre-fill
  const openReinvite = (v: Visitor) => {
    setReinviteVisitor(v);
    setApptForm((f) => ({
      ...f,
      visitorName: v.name,
      visitorId: v.idNumber,
      purpose: v.visitReason,
    }));
    setTab("appointments");
    setApptTab("create");
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

  // Assign equipment to visitor
  const assignEquipment = () => {
    if (!equipmentModalVisitor || !equipmentForm.id.trim()) return;
    saveVisitor({
      ...equipmentModalVisitor,
      equipment: {
        type: equipmentForm.type,
        id: equipmentForm.id.trim(),
        assignedAt: new Date().toISOString(),
      },
    });
    addAuditLog(
      session.companyId,
      staff?.name ?? "Personel",
      session.staffId ?? "",
      "equipment_assigned",
      `${equipmentModalVisitor.name} — ${equipmentForm.type} #${equipmentForm.id} teslim edildi`,
    );
    setEquipmentModalVisitor(null);
    setEquipmentForm({ type: "Misafir Kartı", id: "" });
    reload();
  };

  // Create guest self-registration invite
  const createGuestInvite = () => {
    const token = Math.random().toString(36).substring(2, 10).toUpperCase();
    const inv: Invitation = {
      token,
      companyId: session.companyId,
      createdBy: session.staffId ?? "",
      createdAt: Date.now(),
      visitorName: "",
      status: "pending",
      hostName: newInviteHostName || staff?.name || "",
    };
    saveInvitation(inv);
    const link = `${window.location.origin}/invite/${token}`;
    setCreatedInviteLink(link);
    setNewInviteHostName("");
    addAuditLog(
      session.companyId,
      staff?.name ?? "Personel",
      session.staffId ?? "",
      "invite_created",
      `Davet linki oluşturuldu: ${token}`,
    );
  };

  const approveGuestInvitation = (inv: Invitation) => {
    if (!inv.preData) return;
    const visitorId = generateVisitorId();
    const hostStaffMember = staffList.find(
      (s) => s.name === inv.preData?.hostName,
    );
    const visitor: Visitor = {
      visitorId,
      companyId: session.companyId,
      registeredBy: session.staffId ?? "",
      name: inv.preData.name,
      idNumber: inv.preData.idNumber,
      phone: inv.preData.phone,
      hostStaffId: hostStaffMember?.staffId ?? "",
      arrivalTime: Date.now(),
      visitReason: inv.preData.visitReason,
      visitType: "business",
      ndaAccepted: true,
      signatureData: "",
      label: "normal",
      category: "Misafir",
      status: "active",
      badgeQr: visitorId,
      notes: "",
      createdAt: Date.now(),
      department: inv.preData.department,
      floor: inv.preData.floor,
    };
    saveVisitor(visitor);
    saveInvitation({ ...inv, status: "approved" });
    addAuditLog(
      session.companyId,
      staff?.name ?? "Personel",
      session.staffId ?? "",
      "invite_approved",
      `${inv.preData.name} davet başvurusu onaylandı`,
    );
    reload();
  };

  const rejectGuestInvitation = () => {
    if (!rejectInviteToken) return;
    const allInv = getInvitations(session.companyId);
    const inv = allInv.find((i) => i.token === rejectInviteToken);
    if (!inv) return;
    saveInvitation({
      ...inv,
      status: "rejected",
      rejectionReason: rejectReason,
    });
    addAuditLog(
      session.companyId,
      staff?.name ?? "Personel",
      session.staffId ?? "",
      "invite_rejected",
      `${inv.visitorName || inv.token} davet başvurusu reddedildi`,
    );
    setRejectInviteToken(null);
    setRejectReason("");
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
  const companyDepartments = getCompanyDepartments(session.companyId);
  const companyFloors = getCompanyFloors(session.companyId);
  const screeningQuestions = company?.screeningQuestions ?? [];
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
    [
      "invitations",
      `✉️ Davetler${invitations.length > 0 ? ` (${invitations.length})` : ""}`,
    ],
    ["profile", "Hesabım"],
  ];

  return (
    <>
      {/* Permit Warning Modal */}
      {permitWarning && (
        <div
          data-ocid="permit.warning.modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <div
            className="w-full max-w-md mx-4 p-6 rounded-2xl shadow-2xl"
            style={{
              background: "#0d1b2e",
              border: `2px solid ${permitWarning.type === "expired" ? "#ef4444" : permitWarning.type === "missing" ? "#f59e0b" : "#f59e0b"}`,
            }}
          >
            <div className="text-4xl mb-3 text-center">
              {permitWarning.type === "expired" ? "🚫" : "⚠️"}
            </div>
            <h3 className="text-white font-bold text-lg text-center mb-2">
              {permitWarning.type === "expired"
                ? "İş İzni Süresi Dolmuş"
                : permitWarning.type === "missing"
                  ? "İş İzni Bulunamadı"
                  : "İş İzni Yakında Dolacak"}
            </h3>
            <p className="text-slate-300 text-sm text-center mb-1">
              {permitWarning.type === "expired" &&
                `${permitWarning.permitInfo?.contractorName} adlı müteahhidin iş izni ${permitWarning.permitInfo?.expiryDate} tarihinde sona ermiş.`}
              {permitWarning.type === "missing" &&
                "Bu TC kimlik numarasına kayıtlı iş izni bulunamadı. Önce İş İzinleri sekmesinden izin ekleyin."}
              {permitWarning.type === "expiring" &&
                `${permitWarning.permitInfo?.contractorName} adlı müteahhidin iş izni ${permitWarning.permitInfo?.expiryDate} tarihinde sona erecek.`}
            </p>
            <p className="text-slate-500 text-xs text-center mb-5">
              {permitWarning.type !== "missing"
                ? "Güvenlik sorumlusu yetkisiyle devam edebilirsiniz."
                : "Devam etmek için yönetici onayı gerekli."}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                data-ocid="permit.warning.cancel_button"
                onClick={() => {
                  setPermitWarning(null);
                  setPermitProceed(null);
                }}
                className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 border border-white/15 hover:bg-white/5"
              >
                İptal
              </button>
              <button
                type="button"
                data-ocid="permit.warning.confirm_button"
                onClick={() => permitProceed?.()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg,#f97316,#ea580c)",
                }}
              >
                Devam Et
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Time Restriction Warning Modal */}
      {timeRestrictionWarning && (
        <div
          data-ocid="time_restriction.warning.modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <div
            className="w-full max-w-md mx-4 p-6 rounded-2xl shadow-2xl"
            style={{
              background: "#0d1b2e",
              border: "2px solid rgba(245,158,11,0.6)",
            }}
          >
            <div className="text-4xl mb-3 text-center">🕐</div>
            <h3 className="text-amber-400 font-bold text-lg text-center mb-2">
              Zaman Kısıtlaması
            </h3>
            <p className="text-slate-300 text-sm text-center mb-5">
              {timeRestrictionWarning.message}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                data-ocid="time_restriction.cancel_button"
                onClick={() => {
                  setTimeRestrictionWarning(null);
                  setTimeRestrictionProceed(null);
                }}
                className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 border border-white/15 hover:bg-white/5"
              >
                İptal
              </button>
              <button
                type="button"
                data-ocid="time_restriction.confirm_button"
                onClick={() => timeRestrictionProceed?.()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg,#f59e0b,#d97706)",
                }}
              >
                Güvenlik Yetkisiyle Devam
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="min-h-screen" style={{ background: "#0a0f1e" }}>
        {/* Lockdown Banner */}
        {lockdownActive && (
          <div
            data-ocid="staff_dashboard.lockdown_banner"
            className="flex items-center gap-3 px-6 py-3 text-white font-bold text-sm"
            style={{
              background: "linear-gradient(90deg,#7f1d1d,#991b1b)",
              borderBottom: "2px solid #ef4444",
            }}
          >
            <span className="animate-pulse text-lg">⚠️</span>
            ACİL DURUM MOD AKTİF — Yönetici tarafından ziyaretçi girişleri
            durduruldu. Kayıt formu devre dışı.
          </div>
        )}

        {/* Storage Notice */}
        {!storageDismissed && (
          <div
            data-ocid="staff_dashboard.storage_notice"
            className="flex items-center justify-between gap-3 px-6 py-2.5 text-sm"
            style={{
              background: "rgba(245,158,11,0.12)",
              borderBottom: "1px solid rgba(245,158,11,0.25)",
            }}
          >
            <span className="text-amber-300">
              📦 Verileriniz bu tarayıcıda yerel olarak saklanmaktadır. Farklı
              tarayıcı veya cihazda verilerinize erişilemez.
            </span>
            <button
              type="button"
              data-ocid="staff_dashboard.storage_notice.close_button"
              onClick={() => {
                localStorage.setItem("safentry_storage_notice_dismissed", "1");
                setStorageDismissed(true);
              }}
              className="text-amber-400 hover:text-white shrink-0 text-lg leading-none"
              aria-label="Kapat"
            >
              ×
            </button>
          </div>
        )}

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
        {/* Shift Report Modal */}
        {shiftReportOpen &&
          (() => {
            const currentShift = getShiftType(new Date().toISOString());
            const shiftVisitors = visitors.filter(
              (v) => v.shiftType === currentShift,
            );
            const departed = shiftVisitors.filter((v) => v.departureTime);
            const avgMin = departed.length
              ? Math.round(
                  departed.reduce(
                    (acc, v) =>
                      acc + (v.departureTime! - v.arrivalTime) / 60000,
                    0,
                  ) / departed.length,
                )
              : 0;
            const todayAppts = appointments.filter(
              (a) =>
                a.appointmentDate === new Date().toISOString().slice(0, 10),
            );
            const noShows = todayAppts.filter(
              (a) => a.status === "pending",
            ).length;
            const catBreakdown: Record<string, number> = {};
            for (const v of shiftVisitors) {
              const cat = v.category ?? "Diğer";
              catBreakdown[cat] = (catBreakdown[cat] ?? 0) + 1;
            }
            return (
              <div
                data-ocid="shift_report.modal"
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{
                  background: "rgba(0,0,0,0.75)",
                  backdropFilter: "blur(4px)",
                }}
              >
                <div
                  className="w-full max-w-lg p-6 rounded-2xl"
                  style={{
                    background: "#0f1729",
                    border: "1.5px solid rgba(14,165,233,0.4)",
                  }}
                >
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-white font-bold text-xl">
                        Vardiya Raporu
                      </h3>
                      <p className="text-slate-400 text-sm">
                        {shiftLabel(currentShift)}
                      </p>
                    </div>
                    <button
                      type="button"
                      data-ocid="shift_report.close_button"
                      onClick={() => setShiftReportOpen(false)}
                      className="text-slate-400 hover:text-white text-xl"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      {
                        label: "Toplam Ziyaretçi",
                        value: shiftVisitors.length,
                        color: "#0ea5e9",
                      },
                      {
                        label: "Ort. Kalış (dk)",
                        value: avgMin,
                        color: "#22c55e",
                      },
                      {
                        label: "Gelmeyen Randevu",
                        value: noShows,
                        color: "#f59e0b",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="p-4 rounded-xl text-center"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <div
                          className="text-2xl font-bold mb-1"
                          style={{ color: item.color }}
                        >
                          {item.value}
                        </div>
                        <div className="text-slate-400 text-xs">
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>
                  {Object.keys(catBreakdown).length > 0 && (
                    <div
                      className="mb-5 p-4 rounded-xl"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <p className="text-slate-300 text-sm font-semibold mb-3">
                        Kategoriye Göre Dağılım
                      </p>
                      <div className="space-y-2">
                        {Object.entries(catBreakdown).map(([cat, cnt]) => (
                          <div
                            key={cat}
                            className="flex items-center justify-between"
                          >
                            <span className="text-slate-400 text-sm">
                              {cat}
                            </span>
                            <span className="text-white font-semibold text-sm">
                              {cnt}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      data-ocid="shift_report.print_button"
                      onClick={() => window.print()}
                      className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold"
                      style={{
                        background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                      }}
                    >
                      📄 Yazdır / PDF İndir
                    </button>
                    <button
                      type="button"
                      data-ocid="shift_report.cancel_button"
                      onClick={() => setShiftReportOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-slate-300 text-sm"
                      style={{
                        background: "rgba(255,255,255,0.07)",
                        border: "1px solid rgba(255,255,255,0.15)",
                      }}
                    >
                      Kapat
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

        {/* Blacklist Blocking Modal */}
        {blacklistModalVisible && (
          <div
            data-ocid="blacklist_block.modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              className="w-full max-w-sm p-6 rounded-2xl text-center"
              style={{
                background: "#0f1729",
                border: "2px solid rgba(239,68,68,0.5)",
              }}
            >
              <div className="text-5xl mb-3">🚫</div>
              <h3 className="text-red-400 font-bold text-xl mb-2">
                Giriş Engellendi!
              </h3>
              <p className="text-slate-300 text-sm mb-1">
                Bu ziyaretçi kara listede kayıtlı:
              </p>
              <p className="text-white font-semibold text-base mb-4">
                {blacklistModalName}
              </p>
              <p className="text-slate-400 text-xs mb-6">
                Güvenlik yöneticisiyle iletişime geçin.
              </p>
              <button
                type="button"
                data-ocid="blacklist_block.close_button"
                onClick={() => setBlacklistModalVisible(false)}
                className="w-full py-2.5 rounded-xl text-white font-semibold"
                style={{
                  background: "linear-gradient(135deg,#ef4444,#dc2626)",
                }}
              >
                Kapat
              </button>
            </div>
          </div>
        )}

        {exitModalVisitor && (
          <div
            data-ocid="exit_rating.modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(4px)",
            }}
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
              {(() => {
                const customQs = company?.customExitQuestions ?? [];
                if (customQs.length > 0) {
                  return (
                    <div className="space-y-4 mb-2">
                      {customQs.map((q) => (
                        <div key={q.id}>
                          <p className="text-slate-300 text-sm mb-2">
                            {q.question}
                          </p>
                          {q.type === "rating" ? (
                            <StarRating
                              value={Number(exitSurveyAnswers[q.id] ?? 0)}
                              onChange={(v) =>
                                setExitSurveyAnswers((a) => ({
                                  ...a,
                                  [q.id]: String(v),
                                }))
                              }
                            />
                          ) : q.type === "yesno" ? (
                            <div className="flex gap-3">
                              {["Evet", "Hayır"].map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() =>
                                    setExitSurveyAnswers((a) => ({
                                      ...a,
                                      [q.id]: opt,
                                    }))
                                  }
                                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                                  style={{
                                    background:
                                      exitSurveyAnswers[q.id] === opt
                                        ? "rgba(14,165,233,0.3)"
                                        : "rgba(255,255,255,0.07)",
                                    border:
                                      exitSurveyAnswers[q.id] === opt
                                        ? "1px solid rgba(14,165,233,0.6)"
                                        : "1px solid rgba(255,255,255,0.15)",
                                    color: "#fff",
                                  }}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={exitSurveyAnswers[q.id] ?? ""}
                              onChange={(e) =>
                                setExitSurveyAnswers((a) => ({
                                  ...a,
                                  [q.id]: e.target.value,
                                }))
                              }
                              placeholder="Yanıtınız..."
                              className="w-full px-3 py-2 rounded-xl text-sm text-white bg-white/7 border border-white/15 focus:outline-none"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  );
                }
                return (
                  <>
                    <p className="text-slate-300 text-sm mb-3">
                      Ziyaret deneyiminizi puanlayın:
                    </p>
                    <StarRating value={exitRating} onChange={setExitRating} />
                  </>
                );
              })()}
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

              {/* Equipment return step */}
              {exitModalVisitor?.equipment && (
                <div className="my-4 p-4 rounded-xl border border-amber-500/40 bg-amber-900/15">
                  <p className="text-amber-400 font-semibold text-sm mb-2">
                    📦 Ekipman İadesi
                  </p>
                  <p className="text-slate-300 text-xs mb-3">
                    {exitModalVisitor.equipment.type} #
                    {exitModalVisitor.equipment.id} iade alındı mı?
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      data-ocid="exit_rating.equipment_return.checkbox"
                      type="checkbox"
                      checked={equipmentReturnChecked}
                      onChange={(e) =>
                        setEquipmentReturnChecked(e.target.checked)
                      }
                      className="w-4 h-4 accent-[#f59e0b]"
                    />
                    <span className="text-slate-200 text-sm">
                      Ekipmanı iade aldım, onaylıyorum
                    </span>
                  </label>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  data-ocid="exit_rating.cancel_button"
                  onClick={() => {
                    setExitModalVisitor(null);
                    setEquipmentReturnChecked(false);
                  }}
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
                  disabled={
                    ((company?.customExitQuestions ?? []).length === 0 &&
                      exitRating === 0) ||
                    (!!exitModalVisitor?.equipment && !equipmentReturnChecked)
                  }
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
        {/* Private Note Modal */}
        {privateNoteVisitor && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
          >
            <div
              className="w-full max-w-sm p-6 rounded-2xl"
              style={{
                background: "#1e293b",
                border: "1.5px solid rgba(239,68,68,0.3)",
              }}
            >
              <h3 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
                🔒 Gizli Not
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                {privateNoteVisitor.name}
              </p>
              <textarea
                data-ocid="private_note.input"
                value={privateNoteText}
                onChange={(e) => setPrivateNoteText(e.target.value)}
                rows={4}
                placeholder="Sadece güvenlik personeli görebilir..."
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm resize-none focus:outline-none focus:border-red-500/50"
              />
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setPrivateNoteVisitor(null);
                    setPrivateNoteText("");
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-300 bg-white/10 hover:bg-white/15"
                >
                  İptal
                </button>
                <button
                  type="button"
                  data-ocid="private_note.save_button"
                  onClick={savePrivateNote}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{
                    background: "rgba(239,68,68,0.4)",
                    border: "1px solid rgba(239,68,68,0.5)",
                  }}
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Visitor Profile Modal */}
        {profileVisitor && (
          <div
            data-ocid="visitor_profile.sheet"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)" }}
          >
            <div
              className="w-full max-w-lg p-6 rounded-2xl max-h-[80vh] overflow-y-auto"
              style={{
                background: "#1e293b",
                border: "1.5px solid rgba(255,255,255,0.12)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-lg">
                  👤 Ziyaretçi Profili
                </h3>
                <button
                  type="button"
                  data-ocid="visitor_profile.close_button"
                  onClick={() => setProfileVisitor(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3">
                <div
                  className="p-4 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <div className="text-white font-semibold text-base">
                    {profileVisitor.name}
                  </div>
                  <div className="text-slate-400 text-sm mt-1">
                    TC/ID:{" "}
                    <span className="font-mono text-white">
                      {profileVisitor.idNumber}
                    </span>
                  </div>
                  {profileVisitor.phone && (
                    <div className="text-slate-400 text-sm">
                      📞 {profileVisitor.phone}
                    </div>
                  )}
                  {profileVisitor.category && (
                    <span
                      className="inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium text-white"
                      style={{
                        background:
                          CATEGORY_COLORS[profileVisitor.category] ?? "#64748b",
                      }}
                    >
                      {profileVisitor.category}
                    </span>
                  )}
                </div>
                {/* All visits */}
                <div>
                  <p className="text-slate-400 text-xs font-medium mb-2">
                    TÜM ZİYARETLER
                  </p>
                  <div className="space-y-2">
                    {visitors
                      .filter((v) => v.idNumber === profileVisitor.idNumber)
                      .map((v, idx) => (
                        <div
                          key={v.visitorId}
                          data-ocid={`visitor_profile.item.${idx + 1}`}
                          className="p-3 rounded-lg text-sm"
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-white">
                              {formatDateTime(v.arrivalTime)}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${v.status === "active" ? "text-emerald-400 bg-emerald-500/15" : "text-slate-400 bg-white/10"}`}
                            >
                              {v.status === "active" ? "Aktif" : "Ayrıldı"}
                            </span>
                          </div>
                          <div className="text-slate-500 text-xs mt-1">
                            Host:{" "}
                            {staffList.find((s) => s.staffId === v.hostStaffId)
                              ?.name ?? v.hostStaffId}
                          </div>
                          {v.departureTime && (
                            <div className="text-slate-500 text-xs">
                              Çıkış: {formatDateTime(v.departureTime)}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
                {/* Notes */}
                {profileVisitor.notes && (
                  <div
                    className="p-3 rounded-lg text-sm"
                    style={{
                      background: "rgba(245,158,11,0.08)",
                      border: "1px solid rgba(245,158,11,0.2)",
                    }}
                  >
                    <p className="text-amber-400 font-medium text-xs mb-1">
                      📝 NOT
                    </p>
                    <p className="text-slate-300">{profileVisitor.notes}</p>
                  </div>
                )}
                {/* Private note */}
                {profileVisitor.privateNote && (
                  <div
                    className="p-3 rounded-lg text-sm"
                    style={{
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                    }}
                  >
                    <p className="text-red-400 font-medium text-xs mb-1">
                      🔒 GİZLİ NOT
                    </p>
                    <p className="text-slate-300">
                      {profileVisitor.privateNote}
                    </p>
                  </div>
                )}
                {/* Blacklist status */}
                {isBlacklisted(
                  profileVisitor.companyId,
                  profileVisitor.idNumber,
                ) && (
                  <div
                    className="p-3 rounded-lg text-sm"
                    style={{
                      background: "rgba(239,68,68,0.12)",
                      border: "1px solid rgba(239,68,68,0.3)",
                    }}
                  >
                    <p className="text-red-400 font-semibold">
                      🚫 Kara Listede
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {notesVisitor && (
          <div
            data-ocid="visitor_notes.dialog"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(4px)",
            }}
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
            style={{
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(4px)",
            }}
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
                            ({csvPreview.filter((r) => r.blacklisted).length}{" "}
                            kara listede)
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
                            background:
                              "linear-gradient(135deg,#0ea5e9,#0284c7)",
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

        {/* Equipment Assign Modal */}
        {equipmentModalVisitor && (
          <div
            data-ocid="equipment.dialog"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              className="w-full max-w-md p-6 rounded-2xl"
              style={{
                background: "#0f1729",
                border: "1.5px solid rgba(245,158,11,0.4)",
              }}
            >
              <h3 className="text-white font-bold text-lg mb-1">
                📦 Ekipman Teslim
              </h3>
              <p className="text-slate-400 text-sm mb-5">
                {equipmentModalVisitor.name}
              </p>
              <div className="space-y-4">
                <div>
                  <p className="text-slate-300 text-sm mb-1">Ekipman Türü</p>
                  <select
                    data-ocid="equipment.type.select"
                    value={equipmentForm.type}
                    onChange={(e) =>
                      setEquipmentForm((f) => ({ ...f, type: e.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl text-white focus:outline-none"
                    style={{
                      background: "#0f1729",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    {[
                      "Misafir Kartı",
                      "Araç Kartı",
                      "Laptop",
                      "Tablet",
                      "Anahtarlık",
                      "Diğer",
                    ].map((t) => (
                      <option key={t} value={t} className="bg-[#0f1729]">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-slate-300 text-sm mb-1">
                    Ekipman ID / Numarası *
                  </p>
                  <input
                    data-ocid="equipment.id.input"
                    value={equipmentForm.id}
                    onChange={(e) =>
                      setEquipmentForm((f) => ({ ...f, id: e.target.value }))
                    }
                    placeholder="Örn: K-07, SN-12345"
                    className="w-full px-4 py-3 rounded-xl text-white focus:outline-none text-sm font-mono"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  data-ocid="equipment.cancel_button"
                  onClick={() => setEquipmentModalVisitor(null)}
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
                  data-ocid="equipment.confirm_button"
                  onClick={assignEquipment}
                  disabled={!equipmentForm.id.trim()}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
                  style={{
                    background: "linear-gradient(135deg,#f59e0b,#d97706)",
                  }}
                >
                  Teslim Et
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Invite Modal */}
        {showCreateInviteModal && (
          <div
            data-ocid="invite_create.dialog"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              className="w-full max-w-md p-6 rounded-2xl"
              style={{
                background: "#0f1729",
                border: "1.5px solid rgba(168,85,247,0.4)",
              }}
            >
              {createdInviteLink ? (
                <>
                  <h3 className="text-white font-bold text-lg mb-2">
                    ✉️ Davet Linki Hazır
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Aşağıdaki linki ziyaretçiye gönderin:
                  </p>
                  <div
                    className="p-3 rounded-xl font-mono text-xs break-all mb-4"
                    style={{
                      background: "rgba(168,85,247,0.1)",
                      border: "1px solid rgba(168,85,247,0.3)",
                      color: "#a855f7",
                    }}
                  >
                    {createdInviteLink}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      data-ocid="invite_create.copy_button"
                      onClick={() => {
                        copyToClipboard(createdInviteLink);
                        setInviteLinkCopied(true);
                        setTimeout(() => setInviteLinkCopied(false), 2000);
                      }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                      style={{
                        background: inviteLinkCopied
                          ? "rgba(34,197,94,0.2)"
                          : "rgba(168,85,247,0.2)",
                        border: inviteLinkCopied
                          ? "1px solid rgba(34,197,94,0.4)"
                          : "1px solid rgba(168,85,247,0.4)",
                        color: inviteLinkCopied ? "#22c55e" : "#a855f7",
                      }}
                    >
                      {inviteLinkCopied ? "✓ Kopyalandı" : "Kopyala"}
                    </button>
                    <button
                      type="button"
                      data-ocid="invite_create.close_button"
                      onClick={() => {
                        setShowCreateInviteModal(false);
                        setCreatedInviteLink("");
                      }}
                      className="flex-1 py-2.5 rounded-xl text-white text-sm"
                      style={{
                        background: "rgba(255,255,255,0.07)",
                        border: "1px solid rgba(255,255,255,0.15)",
                      }}
                    >
                      Kapat
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-white font-bold text-lg mb-2">
                    ✉️ Ziyaretçi Daveti Oluştur
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Ziyaretçiye gönderilecek self-registration linki
                    oluşturulur.
                  </p>
                  <div className="mb-4">
                    <p className="text-slate-300 text-sm mb-1">
                      Ev Sahibi (isteğe bağlı)
                    </p>
                    <input
                      data-ocid="invite_create.host.input"
                      value={newInviteHostName}
                      onChange={(e) => setNewInviteHostName(e.target.value)}
                      placeholder={staff?.name ?? "Personel adı"}
                      className="w-full px-4 py-3 rounded-xl text-white text-sm focus:outline-none"
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.2)",
                      }}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      data-ocid="invite_create.cancel_button"
                      onClick={() => setShowCreateInviteModal(false)}
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
                      data-ocid="invite_create.primary_button"
                      onClick={createGuestInvite}
                      className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold"
                      style={{
                        background: "linear-gradient(135deg,#a855f7,#7c3aed)",
                      }}
                    >
                      Link Oluştur
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Reject Invitation Dialog */}
        {rejectInviteToken && (
          <div
            data-ocid="invite_reject.dialog"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              className="w-full max-w-md p-6 rounded-2xl"
              style={{
                background: "#0f1729",
                border: "1.5px solid rgba(239,68,68,0.4)",
              }}
            >
              <h3 className="text-white font-bold text-lg mb-4">
                Başvuruyu Reddet
              </h3>
              <textarea
                data-ocid="invite_reject.reason.textarea"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Red sebebi (isteğe bağlı)..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-white text-sm focus:outline-none resize-none mb-4"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  data-ocid="invite_reject.cancel_button"
                  onClick={() => {
                    setRejectInviteToken(null);
                    setRejectReason("");
                  }}
                  className="flex-1 py-2.5 rounded-xl text-slate-300 text-sm"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  data-ocid="invite_reject.confirm_button"
                  onClick={rejectGuestInvitation}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold"
                  style={{
                    background: "linear-gradient(135deg,#ef4444,#dc2626)",
                  }}
                >
                  Reddet
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
            <NotificationCenter companyId={session.companyId} />
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
              {/* Daily appointments banner */}
              {todayAppointments.length > 0 && !dailyBannerDismissed && (
                <div
                  data-ocid="register.daily_summary.card"
                  className="mb-5 p-4 rounded-2xl"
                  style={{
                    background: "rgba(14,165,233,0.08)",
                    border: "1px solid rgba(14,165,233,0.25)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-[#38bdf8] font-semibold text-sm mb-2">
                        📅 Bugün {todayAppointments.length} randevu bekleniyor
                      </p>
                      <div className="space-y-1">
                        {todayAppointments.slice(0, 3).map((appt) => (
                          <div
                            key={appt.id}
                            className="text-slate-400 text-xs flex items-center gap-2"
                          >
                            <span style={{ color: "#38bdf8" }}>
                              {appt.appointmentTime}
                            </span>
                            <span>{appt.visitorName}</span>
                            <span className="text-slate-600">
                              — {appt.hostName}
                            </span>
                          </div>
                        ))}
                        {todayAppointments.length > 3 && (
                          <p className="text-slate-500 text-xs">
                            +{todayAppointments.length - 3} daha...
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        type="button"
                        data-ocid="register.daily_summary_appts.button"
                        onClick={() => setTab("appointments")}
                        className="px-3 py-1 rounded-lg text-xs font-medium text-white"
                        style={{
                          background: "rgba(14,165,233,0.25)",
                          border: "1px solid rgba(14,165,233,0.4)",
                        }}
                      >
                        Randevular
                      </button>
                      <button
                        type="button"
                        data-ocid="register.daily_banner_dismiss.button"
                        onClick={() => setDailyBannerDismissed(true)}
                        className="px-3 py-1 rounded-lg text-xs text-slate-500 hover:text-slate-300"
                      >
                        Kapat
                      </button>
                    </div>
                  </div>
                </div>
              )}

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
                        {pdfLoading === registeredVisitor.visitorId
                          ? "⏳"
                          : "📄"}{" "}
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
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-4 h-4 text-slate-500 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Kiosk modunda ziyaretçiler formu kendileri doldurur ve
                        güvenlik onayı bekler
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
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
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-slate-400 text-sm">Davet kodu:</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Önceden oluşturulmuş davet kodunu girerek bilgileri
                        otomatik doldurabilirsiniz
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
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
                  <p className="text-red-400 text-sm font-medium">
                    {formError}
                  </p>
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

              {/* Approved visitor suggestion */}
              {approvedSuggestion && (
                <div
                  data-ocid="register.approved_visitor.card"
                  className="mb-4 p-4 rounded-xl border border-[#22c55e]/40 bg-[#22c55e]/10 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-emerald-400 text-sm font-semibold">
                      ✅ Onaylı Ziyaretçi
                    </p>
                    <p className="text-slate-300 text-xs mt-0.5">
                      Bu TC onaylı ziyaretçi listesinde — bilgileri otomatik
                      doldur?
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      data-ocid="register.approved_autofill.button"
                      onClick={applyApprovedSuggestion}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                      style={{
                        background: "rgba(34,197,94,0.3)",
                        border: "1px solid rgba(34,197,94,0.5)",
                      }}
                    >
                      Doldur
                    </button>
                    <button
                      type="button"
                      onClick={() => setApprovedSuggestion(null)}
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
                {/* Department */}
                <div>
                  <p className="text-slate-300 text-sm mb-1 block">
                    Departman *
                  </p>
                  <select
                    data-ocid="register.department.select"
                    value={form.department}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, department: e.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl bg-[#0f1729] border border-white/20 text-white focus:outline-none"
                  >
                    <option value="" className="bg-[#0f1729]">
                      Seçin...
                    </option>
                    {companyDepartments.map((d) => (
                      <option key={d} value={d} className="bg-[#0f1729]">
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Floor */}
                <div>
                  <p className="text-slate-300 text-sm mb-1 block">Kat *</p>
                  <select
                    data-ocid="register.floor.select"
                    value={form.floor}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, floor: e.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl bg-[#0f1729] border border-white/20 text-white focus:outline-none"
                  >
                    <option value="" className="bg-[#0f1729]">
                      Seçin...
                    </option>
                    {companyFloors.map((fl) => (
                      <option key={fl} value={fl} className="bg-[#0f1729]">
                        {fl}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Multi-day toggle */}
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      data-ocid="register.multiday.checkbox"
                      type="checkbox"
                      checked={form.multiDay}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          multiDay: e.target.checked,
                          endDate: "",
                        }))
                      }
                      className="w-4 h-4 rounded accent-[#0ea5e9]"
                    />
                    <span className="text-slate-300 text-sm">
                      Çok günlü ziyaret mi?
                    </span>
                  </label>
                  {form.multiDay && (
                    <div className="mt-3">
                      <p className="text-slate-300 text-sm mb-1 block">
                        Bitiş Tarihi *
                      </p>
                      <input
                        data-ocid="register.enddate.input"
                        type="date"
                        value={form.endDate}
                        min={form.arrivalTime.slice(0, 10)}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, endDate: e.target.value }))
                        }
                        className="w-full max-w-xs px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none"
                      />
                    </div>
                  )}
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
                  <p className="text-slate-300 text-sm mb-1 block">
                    Kategori *
                  </p>
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
                            background:
                              "linear-gradient(135deg,#0ea5e9,#0284c7)",
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
                {/* Screening Questions */}
                {screeningQuestions.length > 0 && (
                  <div
                    className="p-4 rounded-xl"
                    style={{
                      background: "rgba(14,165,233,0.04)",
                      border: "1.5px solid rgba(14,165,233,0.2)",
                    }}
                  >
                    <h4 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                      🛡️ Güvenlik Kontrolü
                    </h4>
                    <div className="space-y-4">
                      {screeningQuestions.map((sq) => (
                        <div key={sq.id}>
                          <p className="text-slate-300 text-sm mb-2">
                            {sq.text}
                            {sq.blocking && sq.type === "yes_no" && (
                              <span className="ml-1 text-red-400 text-xs">
                                *
                              </span>
                            )}
                          </p>
                          {sq.type === "yes_no" ? (
                            <div className="flex gap-3">
                              {["Evet", "Hayır"].map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  data-ocid={`screening.${sq.id}.${opt.toLowerCase()}.button`}
                                  onClick={() =>
                                    setForm((f) => ({
                                      ...f,
                                      screeningAnswers: {
                                        ...f.screeningAnswers,
                                        [sq.id]: opt,
                                      },
                                    }))
                                  }
                                  className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
                                  style={{
                                    background:
                                      form.screeningAnswers[sq.id] === opt
                                        ? opt === "Evet"
                                          ? "rgba(34,197,94,0.3)"
                                          : "rgba(239,68,68,0.3)"
                                        : "rgba(255,255,255,0.07)",
                                    border:
                                      form.screeningAnswers[sq.id] === opt
                                        ? opt === "Evet"
                                          ? "1px solid rgba(34,197,94,0.5)"
                                          : "1px solid rgba(239,68,68,0.5)"
                                        : "1px solid rgba(255,255,255,0.15)",
                                    color:
                                      form.screeningAnswers[sq.id] === opt
                                        ? opt === "Evet"
                                          ? "#22c55e"
                                          : "#ef4444"
                                        : "#94a3b8",
                                  }}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <input
                              data-ocid={`screening.${sq.id}.input`}
                              value={form.screeningAnswers[sq.id] ?? ""}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  screeningAnswers: {
                                    ...f.screeningAnswers,
                                    [sq.id]: e.target.value,
                                  },
                                }))
                              }
                              className="w-full px-4 py-2.5 rounded-xl text-white text-sm focus:outline-none"
                              style={{
                                background: "rgba(255,255,255,0.08)",
                                border: "1px solid rgba(255,255,255,0.2)",
                              }}
                            />
                          )}
                          {sq.blocking &&
                            sq.type === "yes_no" &&
                            form.screeningAnswers[sq.id] === "Hayır" && (
                              <div className="mt-2 p-3 rounded-lg border border-red-500/40 bg-red-900/20 text-red-400 text-xs">
                                🚫 Giriş Engellenmiştir — Bu soru için "Hayır"
                                yanıtı giriş izni vermez.
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                        setForm((f) => ({
                          ...f,
                          ndaAccepted: e.target.checked,
                        }))
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
                          {company?.categoryNda?.[form.category] ||
                            "Kişisel verileriniz KVKK kapsamında ziyaret kaydı amacıyla işlenmektedir. Verileriniz saklama süresi dolunca otomatik olarak silinecektir."}
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
              {/* Bulk Exit Button */}
              {activeVisitors.length > 0 && (
                <div className="flex justify-end mb-4">
                  <button
                    type="button"
                    data-ocid="bulk_exit.open_modal_button"
                    onClick={() => setBulkExitModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                    style={{
                      background: "rgba(239,68,68,0.2)",
                      border: "1.5px solid rgba(239,68,68,0.4)",
                      color: "#f87171",
                    }}
                  >
                    🚪 Toplu Çıkış ({activeVisitors.length} kişi)
                  </button>
                </div>
              )}
              {/* Bulk Exit Confirmation Modal */}
              {bulkExitModalOpen && (
                <div
                  data-ocid="bulk_exit.dialog"
                  className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  style={{ background: "rgba(0,0,0,0.7)" }}
                >
                  <div
                    className="w-full max-w-sm p-6 rounded-2xl"
                    style={{
                      background: "#1e293b",
                      border: "1.5px solid rgba(239,68,68,0.3)",
                    }}
                  >
                    <h3 className="text-white font-bold text-lg mb-2">
                      🚪 Toplu Çıkış
                    </h3>
                    <p className="text-slate-400 text-sm mb-6">
                      Tüm aktif ziyaretçileri çıkış yaptırmak istiyor musunuz?{" "}
                      <strong className="text-white">
                        ({activeVisitors.length} kişi)
                      </strong>
                    </p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        data-ocid="bulk_exit.cancel_button"
                        onClick={() => setBulkExitModalOpen(false)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-300 bg-white/10 hover:bg-white/15"
                      >
                        İptal
                      </button>
                      <button
                        type="button"
                        data-ocid="bulk_exit.confirm_button"
                        onClick={bulkExit}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                        style={{
                          background: "rgba(239,68,68,0.5)",
                          border: "1px solid rgba(239,68,68,0.6)",
                        }}
                      >
                        Evet, Çıkış Yaptır
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
                        data-ocid={`kiosk.pending.item.${i + 1}`}
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
                          {(() => {
                            const sla =
                              findCompanyById(session.companyId)
                                ?.slaThreshold ?? 10;
                            void slaTimer; // trigger re-render
                            const waited = Math.floor(
                              (Date.now() - v._submittedAt) / 1000,
                            );
                            const mins = Math.floor(waited / 60);
                            const secs = waited % 60;
                            const overSla = mins >= sla;
                            return (
                              <p
                                className="text-xs font-medium mt-0.5"
                                style={{
                                  color: overSla ? "#ef4444" : "#f59e0b",
                                }}
                              >
                                ⏱ {mins} dk {secs} sn bekleniyor
                                {overSla ? " — SLA aşıldı!" : ""}
                              </p>
                            );
                          })()}
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
                <EmptyState
                  data-ocid="active_visitors.empty_state"
                  icon={ClipboardList}
                  title="Aktif ziyaretçi yok"
                  description="Şu anda kayıtlı aktif ziyaretçi bulunmuyor."
                />
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
                            const apptTs = new Date(
                              visitorAppt.appointmentDate,
                            );
                            apptTs.setHours(h, m, 0, 0);
                            return (
                              Date.now() - apptTs.getTime() > 15 * 60 * 1000
                            );
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
                                        CATEGORY_COLORS[v.category] ??
                                        "#64748b",
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
                          {/* Equipment badge */}
                          {v.equipment && (
                            <div
                              className="mb-2 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2"
                              style={{
                                background: "rgba(245,158,11,0.15)",
                                border: "1px solid rgba(245,158,11,0.3)",
                              }}
                            >
                              <span className="text-amber-400 font-semibold">
                                📦 {v.equipment.type}
                              </span>
                              <span className="text-amber-300 font-mono">
                                #{v.equipment.id}
                              </span>
                            </div>
                          )}
                          {/* Dept/Floor badge */}
                          {(v.department || v.floor) && (
                            <div className="mb-2 flex gap-2">
                              {v.department && (
                                <span
                                  className="px-2 py-0.5 rounded text-xs font-medium text-white"
                                  style={{ background: "rgba(14,165,233,0.2)" }}
                                >
                                  🏢 {v.department}
                                </span>
                              )}
                              {v.floor && (
                                <span
                                  className="px-2 py-0.5 rounded text-xs font-medium text-white"
                                  style={{ background: "rgba(168,85,247,0.2)" }}
                                >
                                  🏗️ {v.floor}
                                </span>
                              )}
                            </div>
                          )}
                          {/* Date range for multi-day */}
                          {v.multiDay && v.endDate && (
                            <div className="mb-2 text-slate-400 text-xs">
                              📅{" "}
                              {new Date(v.arrivalTime).toLocaleDateString(
                                "tr-TR",
                                { day: "2-digit", month: "short" },
                              )}
                              {" — "}
                              {new Date(v.endDate).toLocaleDateString("tr-TR", {
                                day: "2-digit",
                                month: "short",
                              })}
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
                              data-ocid={`active_visitors.equipment.button.${i + 1}`}
                              onClick={() => {
                                setEquipmentModalVisitor(v);
                                setEquipmentForm({
                                  type: "Misafir Kartı",
                                  id: "",
                                });
                              }}
                              title="Ekipman Ver"
                              className="px-3 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-80"
                              style={{
                                background: v.equipment
                                  ? "rgba(245,158,11,0.3)"
                                  : "rgba(245,158,11,0.15)",
                                border: "1px solid rgba(245,158,11,0.3)",
                              }}
                            >
                              📦
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
                            <button
                              type="button"
                              data-ocid={`formal_doc.button.${i + 1}`}
                              onClick={() =>
                                printFormalDocument(
                                  v,
                                  company?.name ?? "Safentry",
                                  staffList.find(
                                    (s) => s.staffId === v.hostStaffId,
                                  )?.name ?? "",
                                )
                              }
                              title="Resmi Belge Yazdır"
                              className="px-3 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-80"
                              style={{
                                background: "rgba(20,184,166,0.15)",
                                border: "1px solid rgba(20,184,166,0.3)",
                              }}
                            >
                              📋
                            </button>
                            <button
                              type="button"
                              data-ocid={`visitor_profile.open_modal_button.${i + 1}`}
                              onClick={() => setProfileVisitor(v)}
                              title="Ziyaretçi Profili"
                              className="px-3 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-80"
                              style={{
                                background: "rgba(168,85,247,0.15)",
                                border: "1px solid rgba(168,85,247,0.3)",
                              }}
                            >
                              👤
                            </button>
                            <button
                              type="button"
                              data-ocid={`private_note.open_button.${i + 1}`}
                              onClick={() => {
                                setPrivateNoteVisitor(v);
                                setPrivateNoteText(v.privateNote ?? "");
                              }}
                              title="Gizli Not"
                              className="px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                              style={{
                                background: v.privateNote
                                  ? "rgba(239,68,68,0.2)"
                                  : "rgba(239,68,68,0.08)",
                                border: "1px solid rgba(239,68,68,0.3)",
                                color: v.privateNote ? "#f87171" : "#94a3b8",
                              }}
                            >
                              🔒
                            </button>
                            {/* Parking assign button */}
                            {v.vehiclePlate &&
                              (company?.parkingSpaces ?? []).length > 0 && (
                                <button
                                  type="button"
                                  data-ocid={`active_visitors.parking.button.${i + 1}`}
                                  onClick={() => setParkingModalVisitor(v)}
                                  title="Otopark Ata"
                                  className="px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                                  style={{
                                    background: v.parkingSpace
                                      ? "rgba(34,197,94,0.2)"
                                      : "rgba(34,197,94,0.08)",
                                    border: "1px solid rgba(34,197,94,0.3)",
                                    color: v.parkingSpace
                                      ? "#4ade80"
                                      : "#94a3b8",
                                  }}
                                >
                                  🚗
                                </button>
                              )}
                          </div>
                          {/* Badge validity warning */}
                          {(() => {
                            const validHours = company?.badgeValidityHours ?? 8;
                            const elapsed =
                              (Date.now() - v.arrivalTime) / 3600000;
                            const remaining = validHours - elapsed;
                            if (remaining <= 0) {
                              return (
                                <div
                                  className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400"
                                  style={{
                                    background: "rgba(239,68,68,0.12)",
                                    border: "1px solid rgba(239,68,68,0.3)",
                                  }}
                                >
                                  🚫 Rozet Süresi Doldu
                                </div>
                              );
                            }
                            if (remaining <= 0.5) {
                              return (
                                <div
                                  className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-400"
                                  style={{
                                    background: "rgba(245,158,11,0.12)",
                                    border: "1px solid rgba(245,158,11,0.3)",
                                  }}
                                >
                                  ⚠️ Rozet Süresi Yaklaşıyor (
                                  {Math.round(remaining * 60)} dk)
                                </div>
                              );
                            }
                            return null;
                          })()}
                          {/* Private note indicator */}
                          {v.privateNote && (
                            <div
                              className="mt-2 px-3 py-1.5 rounded-lg text-xs text-red-300"
                              style={{
                                background: "rgba(239,68,68,0.08)",
                                border: "1px solid rgba(239,68,68,0.2)",
                              }}
                            >
                              🔒{" "}
                              <span className="text-red-400 font-medium">
                                Gizli Not:
                              </span>{" "}
                              {v.privateNote}
                            </div>
                          )}
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
                <EmptyState
                  data-ocid="inside.empty_state"
                  icon={Users}
                  title="Şu an içeride kimse yok"
                  description="Aktif ziyaretçi bulunmuyor."
                />
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
                                        CATEGORY_COLORS[v.category] ??
                                        "#64748b",
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
                                {v.department && (
                                  <span
                                    className="px-1.5 py-0.5 rounded text-xs text-white"
                                    style={{
                                      background: "rgba(14,165,233,0.2)",
                                    }}
                                  >
                                    🏢 {v.department}
                                  </span>
                                )}
                                {v.floor && (
                                  <span
                                    className="px-1.5 py-0.5 rounded text-xs text-white"
                                    style={{
                                      background: "rgba(168,85,247,0.2)",
                                    }}
                                  >
                                    🏗️ {v.floor}
                                  </span>
                                )}
                                {v.equipment && (
                                  <span
                                    className="px-1.5 py-0.5 rounded text-xs font-medium"
                                    style={{
                                      background: "rgba(245,158,11,0.2)",
                                      color: "#f59e0b",
                                    }}
                                  >
                                    📦 {v.equipment.type}
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
                                {formatDateTime(v.arrivalTime).split(" ")[1]}
                                'dan beri
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
              {/* Sub-tabs + View toggle */}
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div className="flex gap-2">
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
                        ? {
                            background:
                              "linear-gradient(135deg,#0ea5e9,#0284c7)",
                          }
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
                        ? {
                            background:
                              "linear-gradient(135deg,#f59e0b,#d97706)",
                          }
                        : { background: "rgba(255,255,255,0.05)" }
                    }
                  >
                    + Yeni Randevu
                  </button>
                </div>
                {apptTab === "today" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      data-ocid="appointments.list_tab"
                      onClick={() => setApptView("list")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${apptView === "list" ? "text-white" : "text-slate-400 hover:text-white"}`}
                      style={
                        apptView === "list"
                          ? {
                              background: "rgba(14,165,233,0.2)",
                              border: "1px solid rgba(14,165,233,0.4)",
                            }
                          : { background: "rgba(255,255,255,0.05)" }
                      }
                    >
                      📋 Liste
                    </button>
                    <button
                      type="button"
                      data-ocid="appointments.calendar_tab"
                      onClick={() => setApptView("calendar")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${apptView === "calendar" ? "text-white" : "text-slate-400 hover:text-white"}`}
                      style={
                        apptView === "calendar"
                          ? {
                              background: "rgba(14,165,233,0.2)",
                              border: "1px solid rgba(14,165,233,0.4)",
                            }
                          : { background: "rgba(255,255,255,0.05)" }
                      }
                    >
                      📅 Takvim
                    </button>
                  </div>
                )}
              </div>

              {apptTab === "today" && (
                <div>
                  {todayAppointments.length === 0 ? (
                    <EmptyState
                      data-ocid="appointments.empty_state"
                      icon={Calendar}
                      title="Bugün için randevu yok"
                      description="Bugün planlanmış randevu bulunmuyor."
                    />
                  ) : apptView === "calendar" ? (
                    /* Calendar view */
                    <div className="overflow-x-auto">
                      <div className="min-w-[600px]">
                        <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-1 mb-2">
                          <div />
                          {[
                            "Pzt",
                            "Sal",
                            "Çar",
                            "Per",
                            "Cum",
                            "Cmt",
                            "Paz",
                          ].map((d) => (
                            <div
                              key={d}
                              className="text-center text-xs text-slate-400 font-medium py-1"
                            >
                              {d}
                            </div>
                          ))}
                        </div>
                        {Array.from({ length: 11 }, (_, i) => i + 8).map(
                          (hour) => {
                            const hourStr = `${String(hour).padStart(2, "0")}:00`;
                            const todayDow = (new Date().getDay() + 6) % 7; // Mon=0
                            return (
                              <div
                                key={hour}
                                className="grid grid-cols-[60px_repeat(7,1fr)] gap-1 mb-1"
                              >
                                <div className="text-xs text-slate-500 text-right pr-2 pt-1">
                                  {hourStr}
                                </div>
                                {(
                                  [
                                    "Pzt",
                                    "Sal",
                                    "Çar",
                                    "Per",
                                    "Cum",
                                    "Cmt",
                                    "Paz",
                                  ] as string[]
                                ).map((dayName, col) => {
                                  const appts = todayAppointments.filter(
                                    (a) => {
                                      const [h] = a.appointmentTime
                                        .split(":")
                                        .map(Number);
                                      const dow =
                                        (new Date(a.appointmentDate).getDay() +
                                          6) %
                                        7;
                                      return h === hour && dow === col;
                                    },
                                  );
                                  return (
                                    <div
                                      key={`${hour}-${dayName}`}
                                      className="min-h-[40px] rounded-lg p-1"
                                      style={{
                                        background:
                                          col === todayDow
                                            ? "rgba(14,165,233,0.05)"
                                            : "rgba(255,255,255,0.02)",
                                        border:
                                          col === todayDow
                                            ? "1px solid rgba(14,165,233,0.15)"
                                            : "1px solid rgba(255,255,255,0.05)",
                                      }}
                                    >
                                      {appts.map((a) => (
                                        <div
                                          key={a.id}
                                          className="text-xs px-1.5 py-0.5 rounded mb-0.5 truncate font-medium"
                                          style={{
                                            background:
                                              a.status === "approved"
                                                ? "rgba(34,197,94,0.25)"
                                                : "rgba(14,165,233,0.25)",
                                            color:
                                              a.status === "approved"
                                                ? "#4ade80"
                                                : "#38bdf8",
                                          }}
                                          title={`${a.visitorName} - ${a.appointmentTime}`}
                                        >
                                          {a.appointmentTime} {a.visitorName}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          },
                        )}
                      </div>
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
                                        border:
                                          "1px solid rgba(245,158,11,0.4)",
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
                                        border:
                                          "1px solid rgba(168,85,247,0.4)",
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
                                    const hostStaff = staffList.find(
                                      (s) =>
                                        s.name === appt.hostName ||
                                        s.staffId === appt.hostName,
                                    );
                                    if (hostStaff?.isAbsent) {
                                      return (
                                        <span
                                          data-ocid={`appointments.absent_warning.${i + 1}`}
                                          className="px-2 py-0.5 rounded-full text-xs font-bold"
                                          style={{
                                            background: "rgba(245,158,11,0.2)",
                                            color: "#f59e0b",
                                            border:
                                              "1px solid rgba(245,158,11,0.4)",
                                          }}
                                        >
                                          ⚠️ Personel Yok (
                                          {hostStaff.absenceReason ?? "İzin"})
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
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
                      <p className="text-slate-300 text-sm mb-1">
                        TC/Pasaport *
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
                <EmptyState
                  data-ocid="preregistered.empty_state"
                  icon={ClipboardList}
                  title="Ön kayıt bulunamadı"
                  description="Henüz ön kayıtlı ziyaretçi yok."
                />
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
                          <th className="p-3 text-left text-slate-400 font-medium">
                            Aksiyon
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
                              {staffList.find(
                                (s) => s.staffId === v.registeredBy,
                              )?.name ?? v.registeredBy}
                            </td>
                            <td className="p-3">
                              <button
                                type="button"
                                data-ocid={`history.reinvite.button.${i + 1}`}
                                onClick={() => openReinvite(v)}
                                className="px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap"
                                style={{
                                  background: "rgba(14,165,233,0.15)",
                                  border: "1px solid rgba(14,165,233,0.35)",
                                  color: "#0ea5e9",
                                }}
                              >
                                ✉️ Tekrar Davet
                              </button>
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
                      color:
                        copiedCode === "login_code" ? "#22c55e" : "#0ea5e9",
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

              {/* Absence Management */}
              <div
                data-ocid="absence.panel"
                className="p-5 rounded-2xl"
                style={{
                  background: absenceToggle
                    ? "rgba(245,158,11,0.08)"
                    : "rgba(255,255,255,0.04)",
                  border: absenceToggle
                    ? "1.5px solid rgba(245,158,11,0.35)"
                    : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-white font-semibold text-sm">
                      Müsaitlik Durumu
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Bugün yoksa randevular uyarı gösterir
                    </p>
                  </div>
                  <button
                    type="button"
                    data-ocid="absence.toggle"
                    onClick={() => {
                      const newVal = !absenceToggle;
                      setAbsenceToggle(newVal);
                      saveAbsenceSettings(newVal, absenceReason, absentUntil);
                    }}
                    className="relative w-12 h-6 rounded-full transition-colors"
                    style={{
                      background: absenceToggle
                        ? "#f59e0b"
                        : "rgba(255,255,255,0.15)",
                    }}
                  >
                    <span
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform"
                      style={{
                        transform: absenceToggle
                          ? "translateX(1.5rem)"
                          : "translateX(0.125rem)",
                      }}
                    />
                  </button>
                </div>
                {absenceToggle && (
                  <div className="space-y-3 mt-3">
                    <div>
                      <p className="text-slate-300 text-xs mb-1.5">Sebep</p>
                      <div className="flex gap-2 flex-wrap">
                        {["İzin", "Hastalık", "Diğer"].map((r) => (
                          <button
                            key={r}
                            type="button"
                            data-ocid={"absence.reason.toggle"}
                            onClick={() => {
                              setAbsenceReason(r);
                              saveAbsenceSettings(
                                absenceToggle,
                                r,
                                absentUntil,
                              );
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={{
                              background:
                                absenceReason === r
                                  ? "rgba(245,158,11,0.25)"
                                  : "rgba(255,255,255,0.07)",
                              border:
                                absenceReason === r
                                  ? "1px solid rgba(245,158,11,0.5)"
                                  : "1px solid rgba(255,255,255,0.12)",
                              color:
                                absenceReason === r ? "#f59e0b" : "#94a3b8",
                            }}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-300 text-xs mb-1.5">
                        Dönüş Tarihi
                      </p>
                      <input
                        data-ocid="absence.return_date.input"
                        type="date"
                        value={absentUntil}
                        onChange={(e) => {
                          setAbsentUntil(e.target.value);
                          saveAbsenceSettings(
                            absenceToggle,
                            absenceReason,
                            e.target.value,
                          );
                        }}
                        className="px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                        style={{
                          background: "rgba(255,255,255,0.07)",
                          border: "1px solid rgba(255,255,255,0.2)",
                        }}
                      />
                    </div>
                    <p className="text-amber-400/70 text-xs">
                      ⚠️ Randevularınızda yeniden atama uyarısı gösterilecek.
                    </p>
                  </div>
                )}
              </div>

              {/* Shift Report Button */}
              <button
                type="button"
                data-ocid="shift_report.open_modal_button"
                onClick={() => setShiftReportOpen(true)}
                className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2"
                style={{
                  background: "rgba(14,165,233,0.15)",
                  border: "1px solid rgba(14,165,233,0.35)",
                }}
              >
                📊 Vardiya Raporu Oluştur
              </button>

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
          {/* INVITATIONS TAB */}
          {tab === "invitations" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-white font-bold text-xl">Davetler</h2>
                  <p className="text-slate-400 text-sm">
                    Bekleyen self-registration başvuruları
                  </p>
                </div>
                <button
                  type="button"
                  data-ocid="invitations.create.open_modal_button"
                  onClick={() => {
                    setShowCreateInviteModal(true);
                    setCreatedInviteLink("");
                  }}
                  className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2"
                  style={{
                    background: "linear-gradient(135deg,#a855f7,#7c3aed)",
                  }}
                >
                  ✉️ Ziyaretçi Daveti Oluştur
                </button>
              </div>

              {invitations.length === 0 ? (
                <EmptyState
                  data-ocid="invitations.empty_state"
                  icon={Calendar}
                  title="Davet başvurusu yok"
                  description="Bekleyen davet başvurusu bulunmuyor."
                />
              ) : (
                <div className="space-y-3">
                  {invitations.map((inv, i) => (
                    <div
                      key={inv.token}
                      data-ocid={`invitations.item.${i + 1}`}
                      className="p-5 rounded-2xl"
                      style={{
                        background: "rgba(168,85,247,0.06)",
                        border: "1.5px solid rgba(168,85,247,0.3)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-semibold">
                              {inv.preData?.name || "—"}
                            </span>
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-semibold"
                              style={{
                                background: "rgba(245,158,11,0.2)",
                                color: "#f59e0b",
                              }}
                            >
                              ⏳ Onay Bekliyor
                            </span>
                          </div>
                          {inv.preData && (
                            <div className="text-slate-400 text-xs space-y-0.5 mt-2">
                              <div>
                                TC/Pasaport:{" "}
                                <span className="font-mono text-slate-300">
                                  {inv.preData.idNumber}
                                </span>
                              </div>
                              <div>Telefon: {inv.preData.phone}</div>
                              {inv.preData.visitReason && (
                                <div>Amaç: {inv.preData.visitReason}</div>
                              )}
                              {inv.preData.department && (
                                <div className="flex gap-2 mt-1">
                                  <span
                                    className="px-2 py-0.5 rounded text-xs text-white"
                                    style={{
                                      background: "rgba(14,165,233,0.2)",
                                    }}
                                  >
                                    🏢 {inv.preData.department}
                                  </span>
                                  {inv.preData.floor && (
                                    <span
                                      className="px-2 py-0.5 rounded text-xs text-white"
                                      style={{
                                        background: "rgba(168,85,247,0.2)",
                                      }}
                                    >
                                      🏗️ {inv.preData.floor}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="text-slate-600 text-xs mt-2">
                            {new Date(inv.createdAt).toLocaleString("tr-TR")}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            type="button"
                            data-ocid={`invitations.approve.button.${i + 1}`}
                            onClick={() => approveGuestInvitation(inv)}
                            disabled={!inv.preData}
                            className="px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
                            style={{
                              background: "rgba(34,197,94,0.25)",
                              border: "1px solid rgba(34,197,94,0.4)",
                            }}
                          >
                            ✓ Onayla
                          </button>
                          <button
                            type="button"
                            data-ocid={`invitations.reject.button.${i + 1}`}
                            onClick={() => setRejectInviteToken(inv.token)}
                            className="px-4 py-2 rounded-lg text-xs font-medium text-red-400"
                            style={{
                              background: "rgba(239,68,68,0.1)",
                              border: "1px solid rgba(239,68,68,0.3)",
                            }}
                          >
                            Reddet
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Parking assign modal */}
        {parkingModalVisitor && company && (
          <div
            data-ocid="parking.modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)" }}
          >
            <div
              className="w-full max-w-sm p-6 rounded-2xl"
              style={{
                background: "#1e293b",
                border: "1.5px solid rgba(34,197,94,0.3)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold">🚗 Otopark Ata</h3>
                <button
                  type="button"
                  data-ocid="parking.modal.close_button"
                  onClick={() => setParkingModalVisitor(null)}
                  className="text-slate-400 hover:text-white text-xl"
                >
                  ×
                </button>
              </div>
              <p className="text-slate-400 text-sm mb-4">
                {parkingModalVisitor.name} — {parkingModalVisitor.vehiclePlate}
              </p>
              {parkingModalVisitor.parkingSpace && (
                <div
                  className="mb-3 p-3 rounded-xl text-sm text-emerald-400"
                  style={{
                    background: "rgba(34,197,94,0.1)",
                    border: "1px solid rgba(34,197,94,0.3)",
                  }}
                >
                  Mevcut: <strong>{parkingModalVisitor.parkingSpace}</strong>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {(company.parkingSpaces ?? []).map((sp) => (
                  <button
                    key={sp.id}
                    type="button"
                    data-ocid="parking.space.button"
                    disabled={
                      sp.occupied &&
                      sp.visitorId !== parkingModalVisitor.visitorId
                    }
                    onClick={() => {
                      const fresh = findCompanyById(session.companyId);
                      if (!fresh) return;
                      // Unassign previous space
                      const updatedSpaces = (fresh.parkingSpaces ?? []).map(
                        (s) => {
                          if (s.visitorId === parkingModalVisitor.visitorId)
                            return {
                              ...s,
                              occupied: false,
                              visitorId: undefined,
                            };
                          if (s.id === sp.id)
                            return {
                              ...s,
                              occupied: true,
                              visitorId: parkingModalVisitor.visitorId,
                            };
                          return s;
                        },
                      );
                      saveCompany({ ...fresh, parkingSpaces: updatedSpaces });
                      saveVisitor({
                        ...parkingModalVisitor,
                        parkingSpace: sp.label,
                      });
                      reload();
                      setParkingModalVisitor(null);
                      toast.success(`${sp.label} alanı atandı`);
                    }}
                    className="py-2 rounded-xl text-xs font-semibold text-white transition-all"
                    style={{
                      background:
                        sp.occupied &&
                        sp.visitorId !== parkingModalVisitor.visitorId
                          ? "rgba(239,68,68,0.15)"
                          : sp.visitorId === parkingModalVisitor.visitorId
                            ? "rgba(34,197,94,0.3)"
                            : "rgba(34,197,94,0.15)",
                      border: `1px solid ${sp.occupied && sp.visitorId !== parkingModalVisitor.visitorId ? "rgba(239,68,68,0.35)" : "rgba(34,197,94,0.35)"}`,
                      opacity:
                        sp.occupied &&
                        sp.visitorId !== parkingModalVisitor.visitorId
                          ? 0.5
                          : 1,
                    }}
                  >
                    {sp.label}
                    {sp.occupied &&
                      sp.visitorId !== parkingModalVisitor.visitorId && (
                        <div className="text-red-400 text-xs">Dolu</div>
                      )}
                  </button>
                ))}
              </div>
              {parkingModalVisitor.parkingSpace && (
                <button
                  type="button"
                  data-ocid="parking.unassign.button"
                  onClick={() => {
                    const fresh = findCompanyById(session.companyId);
                    if (!fresh) return;
                    const updatedSpaces = (fresh.parkingSpaces ?? []).map(
                      (s) =>
                        s.visitorId === parkingModalVisitor.visitorId
                          ? { ...s, occupied: false, visitorId: undefined }
                          : s,
                    );
                    saveCompany({ ...fresh, parkingSpaces: updatedSpaces });
                    saveVisitor({
                      ...parkingModalVisitor,
                      parkingSpace: undefined,
                    });
                    reload();
                    setParkingModalVisitor(null);
                    toast.success("Otopark ataması kaldırıldı");
                  }}
                  className="w-full py-2 rounded-xl text-sm font-medium text-red-400"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.3)",
                  }}
                >
                  Atamayı Kaldır
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
