import {
  AlertTriangle,
  Bell,
  BookOpen,
  ClipboardList,
  FileText,
  Settings,
  ShieldOff,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { addAuditLog, getAuditLogs } from "../auditLog";
import ConfirmModal from "../components/ConfirmModal";
import EmptyState from "../components/EmptyState";
import LangSwitcher from "../components/LangSwitcher";
import NotificationCenter from "../components/NotificationCenter";
import { ChecklistHistoryPanel } from "../components/SecurityChecklist";
import SegmentationAnalysis from "../components/SegmentationAnalysis";
import ShiftCalendar from "../components/ShiftCalendar";
import VisitorComments from "../components/VisitorComments";
import { getLang, t } from "../i18n";

import {
  addAlertHistory,
  addNotification,
  addToBlacklist,
  clearSession,
  deleteApprovedVisitor,
  deleteDepartment,
  deleteIncident,
  deletePermit,
  findApprovedByIdNumber,
  findCompanyById,
  getAlertHistory,
  getAnnouncements,
  getAppointments,
  getApprovedVisitors,
  getBlacklist,
  getCompanyDepartments,
  getCompanyFloors,
  getDepartments,
  getDeptTodayVisitorCount,
  getIncidents,
  getKioskContent,
  getLockdown,
  getPermits,
  getSession,
  getStaffByCompany,
  getVisitorPins,
  getVisitors,
  refreshSession,
  removeFromBlacklist,
  removeStaff as removeStaffStore,
  removeVisitorPin,
  resetStaffCode,
  saveAnnouncement,
  saveAppointment,
  saveApprovedVisitor,
  saveCompany,
  saveDepartment,
  saveIncident,
  saveInviteCode,
  saveKioskContent,
  savePermit,
  saveStaff,
  saveVisitor,
  saveVisitorPin,
  setLockdown,
} from "../store";
import type {
  AlertHistoryEntry,
  AppScreen,
  Appointment,
  ApprovedVisitor,
  AuditLog,
  BlacklistEntry,
  CategoryTimeRestriction,
  Company,
  ContractorPermit,
  Department,
  ExitQuestion,
  ParkingSpace,
  ScreeningQuestion,
  SecurityIncident,
  Staff,
  Visitor,
  MeetingTemplate as _MeetingTemplate,
} from "../types";
import {
  copyToClipboard,
  durationLabel,
  formatDateTime,
  generateId,
} from "../utils";

const LABEL_COLORS: Record<string, string> = {
  normal: "#0ea5e9",
  vip: "#f59e0b",
  attention: "#f97316",
  restricted: "#a855f7",
};
const AVAIL_COLORS: Record<string, string> = {
  available: "#22c55e",
  in_meeting: "#f59e0b",
  outside: "#94a3b8",
};

const CATEGORY_COLORS: Record<string, string> = {
  Misafir: "#0ea5e9",
  Müteahhit: "#f97316",
  Teslimat: "#22c55e",
  Mülakat: "#a855f7",
  Tedarikçi: "#f59e0b",
  Diğer: "#64748b",
};

function getCategoryColor(
  category: string,
  company: Company | null | undefined,
): string {
  return (
    company?.categoryColors?.[category] ??
    CATEGORY_COLORS[category] ??
    "#64748b"
  );
}

interface Props {
  onNavigate: (s: AppScreen) => void;
  onRefresh: () => void;
}

type Tab =
  | "visitors"
  | "staff"
  | "blacklist"
  | "blacklistreport"
  | "statistics"
  | "compliance"
  | "evacuation"
  | "announcements"
  | "auditlog"
  | "alerthistory"
  | "equipment"
  | "approved"
  | "departments"
  | "permits"
  | "archive"
  | "customreport"
  | "profile"
  | "shifts"
  | "checklists"
  | "reviews";

function getLast7DaysData(visitors: Visitor[]) {
  const days: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString("tr-TR", {
      weekday: "short",
      day: "numeric",
    });
    const count = visitors.filter((v) => {
      const vd = new Date(v.arrivalTime);
      return (
        vd.getFullYear() === d.getFullYear() &&
        vd.getMonth() === d.getMonth() &&
        vd.getDate() === d.getDate()
      );
    }).length;
    days.push({ date: dateStr, count });
  }
  return days;
}

export default function CompanyDashboard({ onNavigate, onRefresh }: Props) {
  const lang = getLang();
  const session = getSession()!;
  const company = findCompanyById(session.companyId)!;
  const [tab, setTab] = useState<Tab>("visitors");
  const [blReportFilter, setBlReportFilter] = useState<
    "all" | "blocked" | "cleared"
  >("all");
  const [visitorFilter, setVisitorFilter] = useState<
    "all" | "active" | "departed"
  >("all");
  const [visitorSearch, setVisitorSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState<
    "today" | "week" | "month" | "all"
  >("today");
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [announcements, setAnnouncements] = useState(
    getAnnouncements(session.companyId),
  );
  const [departments, setDepartments] = useState<Department[]>([]);
  const [permits, setPermits] = useState<ContractorPermit[]>([]);
  // Department form
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptFloor, setNewDeptFloor] = useState("");
  const [newDeptCapacity, setNewDeptCapacity] = useState("10");
  const [editDept, setEditDept] = useState<Department | null>(null);
  // Permit form
  const [showPermitForm, setShowPermitForm] = useState(false);
  const [editPermit, setEditPermit] = useState<ContractorPermit | null>(null);
  const [permitForm, setPermitForm] = useState({
    contractorName: "",
    idNumber: "",
    permitNumber: "",
    issueDate: "",
    expiryDate: "",
    insuranceInfo: "",
  });
  // Category time restrictions
  const [editingRestriction, setEditingRestriction] = useState<string | null>(
    null,
  );
  const [restrictionForm, setRestrictionForm] = useState<
    Omit<CategoryTimeRestriction, "category">
  >({
    allowedStart: "08:00",
    allowedEnd: "18:00",
    allowedDays: [1, 2, 3, 4, 5],
    strictMode: false,
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [auditDateFilter, setAuditDateFilter] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [_confirmMsg, setConfirmMsg] = useState("");
  const [newStaffCode, setNewStaffCode] = useState("");
  const [blIdNumber, setBlIdNumber] = useState("");
  const [blReason, setBlReason] = useState("");
  const [blReasonCategory, setBlReasonCategory] = useState("Diğer");
  const [lockdownActive, setLockdownActive] = useState(() =>
    getLockdown(getSession()!.companyId),
  );
  const [lockdownConfirm, setLockdownConfirm] = useState(false);
  const [selectedStaffPerf, setSelectedStaffPerf] = useState<{
    name: string;
    total: number;
    avgDurMins: number;
    topCat: string;
    staffId?: string;
    busiestShift?: string;
    busiestDay?: string;
    avgRating?: string;
    commentPct?: number;
  } | null>(null);
  const [storageDismissed, setStorageDismissed] = useState(
    () => localStorage.getItem("safentry_storage_notice_dismissed") === "1",
  );
  const [announcementMsg, setAnnouncementMsg] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  // Visitor profile modal
  const [profileVisitor, setProfileVisitor] = useState<Visitor | null>(null);
  const [profileForm, setProfileForm] = useState<Partial<Company>>(
    company ?? {},
  );
  // Onboarding banner
  const onboardingDismissKey = `safentry_onboarding_dismissed_${session.companyId}`;
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => !!localStorage.getItem(onboardingDismissKey),
  );
  const dismissOnboarding = () => {
    localStorage.setItem(onboardingDismissKey, "1");
    setOnboardingDismissed(true);
  };
  const [resetCodeResult, setResetCodeResult] = useState<{
    name: string;
    code: string;
  } | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState("");
  const [exportDateTo, setExportDateTo] = useState("");

  // Visitor history dialog
  const [historyVisitor, setHistoryVisitor] = useState<Visitor | null>(null);

  // Category management
  const [newCategoryInput, setNewCategoryInput] = useState("");

  // Custom field management
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  // Department/Floor management
  const [newDeptInput, setNewDeptInput] = useState("");
  const [newFloorInput, setNewFloorInput] = useState("");

  // Screening questions management
  const [newSqText, setNewSqText] = useState("");
  const [newSqType, setNewSqType] = useState<"yes_no" | "text">("yes_no");
  const [newSqBlocking, setNewSqBlocking] = useState(false);

  // Alert history
  const [alertHistory, setAlertHistory] = useState<AlertHistoryEntry[]>([]);

  // Custom exit questions
  const [newExitQText, setNewExitQText] = useState("");
  const [newExitQType, setNewExitQType] = useState<"rating" | "text" | "yesno">(
    "rating",
  );

  // Advanced filter panel
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterPersonnel, setFilterPersonnel] = useState("");

  // Re-invite
  const [reinviteOpen, setReinviteOpen] = useState(false);
  const [reinviteVisitorData, setReinviteVisitorData] =
    useState<Visitor | null>(null);
  const [reinviteDate, setReinviteDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [reinviteTime, setReinviteTime] = useState("10:00");
  const [reinvitePurpose, setReinvitePurpose] = useState("");

  // Approved visitors state
  const [approvedVisitors, setApprovedVisitors] = useState<ApprovedVisitor[]>(
    () => getApprovedVisitors(session.companyId),
  );
  const [newApprovedName, setNewApprovedName] = useState("");
  const [newApprovedId, setNewApprovedId] = useState("");
  const [newApprovedPhone, setNewApprovedPhone] = useState("");
  const [newApprovedReason, setNewApprovedReason] = useState("");
  const [newApprovedCategory, setNewApprovedCategory] = useState("");
  const [newApprovedBadgeDays, setNewApprovedBadgeDays] = useState<number>(0);
  const [statSatisfactionPeriod, setStatSatisfactionPeriod] = useState<
    "7d" | "30d" | "all"
  >("all");

  // Lobby display
  const [lobbyOpen, setLobbyOpen] = useState(false);
  const [lobbyTime, setLobbyTime] = useState(new Date());

  // Custom report builder
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");
  const [reportCategory, setReportCategory] = useState("");
  const [reportDepartment, setReportDepartment] = useState("");
  const [reportPersonnel, setReportPersonnel] = useState("");
  const [reportMinStay, setReportMinStay] = useState<number | "">("");
  const [reportResults, setReportResults] = useState<Visitor[] | null>(null);

  // Meeting templates
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    dayOfWeek: 1,
    time: "10:00",
    hostStaffId: "",
    purpose: "",
    notes: "",
    visitorName: "",
  });

  // Parking state
  const [newParkingLabel, setNewParkingLabel] = useState("");

  const reload = useCallback(() => {
    setVisitors(getVisitors(session.companyId));
    setStaffList(getStaffByCompany(session.companyId));
    setBlacklist(getBlacklist(session.companyId));
    setAuditLogs(getAuditLogs(session.companyId));
    setAlertHistory(getAlertHistory(session.companyId));
    setApprovedVisitors(getApprovedVisitors(session.companyId));
    setDepartments(getDepartments(session.companyId));
    setPermits(getPermits(session.companyId));
    refreshSession();
  }, [session.companyId]);

  useEffect(() => {
    reload();
    const timer = setInterval(() => reload(), 60000);
    return () => clearInterval(timer);
  }, [reload]);

  // Log capacity exceeded alert when threshold crossed
  useEffect(() => {
    const maxC = company?.maxCapacity ?? company?.maxConcurrentVisitors ?? 0;
    if (
      maxC > 0 &&
      visitors.filter((v) => v.status === "active").length >= maxC
    ) {
      const history = getAlertHistory(session.companyId);
      const recentCapAlert = history.find(
        (e) =>
          e.type === "capacity" && Date.now() - e.timestamp < 5 * 60 * 1000,
      );
      if (!recentCapAlert) {
        addAlertHistory({
          id: Math.random().toString(36).substring(2, 9),
          companyId: session.companyId,
          type: "capacity",
          timestamp: Date.now(),
          detail: `Kapasite sınırına ulaşıldı: ${visitors.filter((v) => v.status === "active").length}/${maxC} kişi`,
        });
      }
    }
  }, [visitors, company, session.companyId]);

  // Auto-checkout effect
  useEffect(() => {
    const latestCompany = findCompanyById(session.companyId);
    const autoHours = latestCompany?.autoCheckoutHours ?? 0;
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
  }, [session.companyId, reload]);

  // Lobby clock
  useEffect(() => {
    const t = setInterval(() => setLobbyTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Max stay violation check (every 2 minutes)
  useEffect(() => {
    const interval = setInterval(
      () => {
        const latestCompany = findCompanyById(session.companyId);
        const maxStay = latestCompany?.categoryMaxStay ?? {};
        const notifiedKey = `safentry_maxstay_notified_${session.companyId}`;
        const notified: string[] = JSON.parse(
          localStorage.getItem(notifiedKey) ?? "[]",
        );
        const activeVis = getVisitors(session.companyId).filter(
          (v) => v.status === "active",
        );
        let changed = false;
        for (const v of activeVis) {
          const limit = v.category ? (maxStay[v.category] ?? 0) : 0;
          if (
            limit > 0 &&
            Date.now() - v.arrivalTime > limit * 60000 &&
            !notified.includes(v.visitorId)
          ) {
            notified.push(v.visitorId);
            addNotification({
              id: Math.random().toString(36).substring(2, 9),
              companyId: session.companyId,
              type: "warning",
              message: `Ziyaretçi ${v.name} — ${v.category ?? ""} kategorisi için max kalma süresini (${limit} dk) aştı!`,
              createdAt: Date.now(),
              read: false,
              relatedId: v.visitorId,
            });
            changed = true;
          }
        }
        if (changed) {
          localStorage.setItem(notifiedKey, JSON.stringify(notified));
        }
      },
      2 * 60 * 1000,
    );
    return () => clearInterval(interval);
  }, [session.companyId]);

  const logout = () => {
    clearSession();
    onNavigate("welcome");
  };

  const addStaff = () => {
    const all = JSON.parse(
      localStorage.getItem("safentry_staff") || "[]",
    ) as Staff[];
    const s = all.find((x) => x.staffId === newStaffCode);
    if (!s) return alert("Personel bulunamadı");
    saveStaff({ ...s, companyId: session.companyId });
    addAuditLog(
      session.companyId,
      "Yönetici",
      session.companyId,
      "staff_added",
      `${s.name} şirkete eklendi`,
    );
    setNewStaffCode("");
    reload();
  };

  const doRemoveStaff = (s: Staff) => {
    setConfirmMsg("");
    setConfirmAction(() => () => {
      removeStaffStore(s.staffId);
      addAuditLog(
        session.companyId,
        "Yönetici",
        session.companyId,
        "staff_removed",
        `${s.name} şirketten çıkarıldı`,
      );
      reload();
      setConfirmOpen(false);
    });
    setConfirmOpen(true);
  };

  const doResetStaffCode = (s: Staff) => {
    setConfirmMsg(t(lang, "resetCodeConfirm"));
    setConfirmAction(() => () => {
      const newCode = resetStaffCode(s.staffId);
      setResetCodeResult({ name: s.name, code: newCode });
      reload();
      setConfirmOpen(false);
    });
    setConfirmOpen(true);
  };

  const genInvite = () => {
    const code = generateId().substring(0, 6);
    saveInviteCode(code, session.companyId);
    setInviteCode(code);
  };

  const doAddBl = () => {
    if (!blIdNumber) return;
    addToBlacklist({
      companyId: session.companyId,
      idNumber: blIdNumber,
      reason: blReason,
      reasonCategory: blReasonCategory,
      addedBy: session.staffId ?? "company",
      addedAt: Date.now(),
    });
    addAuditLog(
      session.companyId,
      "Yönetici",
      session.companyId,
      "blacklist_add",
      `${blIdNumber} kara listeye eklendi${blReason ? `: ${blReason}` : ""}`,
    );
    setBlIdNumber("");
    setBlReason("");
    setBlReasonCategory("Diğer");
    reload();
    toast.success("Kara listeye eklendi");
  };

  const doRemoveBl = (idNumber: string) => {
    removeFromBlacklist(session.companyId, idNumber);
    addAuditLog(
      session.companyId,
      "Yönetici",
      session.companyId,
      "blacklist_remove",
      `${idNumber} kara listeden çıkarıldı`,
    );
    reload();
    toast.success("Kara listeden çıkarıldı");
  };

  const postAnnouncement = () => {
    if (!announcementMsg) return;
    saveAnnouncement({
      id: generateId(),
      companyId: session.companyId,
      message: announcementMsg,
      createdBy: "company",
      createdAt: Date.now(),
    });
    setAnnouncementMsg("");
    setAnnouncements(getAnnouncements(session.companyId));
  };

  const saveProfile = () => {
    if (!company) return;
    saveCompany({ ...company, ...profileForm });
    toast.success("Ayarlar kaydedildi");
  };

  const toggleLockdown = () => {
    const newState = !lockdownActive;
    setLockdown(session.companyId, newState);
    setLockdownActive(newState);
    setLockdownConfirm(false);
    toast(
      newState
        ? "🚨 Acil durum modu aktifleştirildi"
        : "✅ Kilitleme kaldırıldı",
      {
        style: { background: newState ? "#7f1d1d" : "#14532d", color: "#fff" },
      },
    );
  };

  const copyCompanyCode = () => {
    copyToClipboard(company.companyId);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const exportCsv = () => {
    const from = exportDateFrom ? new Date(exportDateFrom).getTime() : 0;
    const to = exportDateTo
      ? new Date(`${exportDateTo}T23:59:59`).getTime()
      : Date.now();
    const rows = visitors.filter((v) => {
      const t2 = v.arrivalTime;
      return t2 >= from && t2 <= to;
    });
    const headers = [
      "Tarih",
      "Giris Saati",
      "Cikis Saati",
      "Ad Soyad",
      "TC/Pasaport",
      "Telefon",
      "Kategori",
      "Sirket",
      "Plaka",
      "Amac",
      "Degerlendirme",
    ];
    const lines = [
      headers.join(","),
      ...rows.map((v) =>
        [
          new Date(v.arrivalTime).toLocaleDateString("tr-TR"),
          new Date(v.arrivalTime).toLocaleTimeString("tr-TR"),
          v.departureTime
            ? new Date(v.departureTime).toLocaleTimeString("tr-TR")
            : "",
          `"${v.name}"`,
          v.idNumber,
          v.phone,
          v.category ?? "",
          `"${v.visitReason || ""}"`,
          v.vehiclePlate || "",
          `"${v.visitType}"`,
          v.exitRating !== undefined ? String(v.exitRating) : "",
        ].join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `safentry-ziyaretciler-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  // Department management helpers
  const getCurrentDepartments = (): string[] => {
    const fresh = findCompanyById(session.companyId);
    return fresh?.departments?.length
      ? fresh.departments
      : getCompanyDepartments(session.companyId);
  };

  const addDepartment = () => {
    if (!newDeptInput.trim()) return;
    const depts = getCurrentDepartments();
    if (depts.includes(newDeptInput.trim())) return;
    const fresh = findCompanyById(session.companyId);
    if (fresh)
      saveCompany({ ...fresh, departments: [...depts, newDeptInput.trim()] });
    setNewDeptInput("");
    reload();
  };

  const removeDepartment = (dept: string) => {
    const fresh = findCompanyById(session.companyId);
    if (fresh)
      saveCompany({
        ...fresh,
        departments: getCurrentDepartments().filter((d) => d !== dept),
      });
    reload();
  };

  // Floor management helpers
  const getCurrentFloors = (): string[] => {
    const fresh = findCompanyById(session.companyId);
    return fresh?.floors?.length
      ? fresh.floors
      : getCompanyFloors(session.companyId);
  };

  const addFloor = () => {
    if (!newFloorInput.trim()) return;
    const floors = getCurrentFloors();
    if (floors.includes(newFloorInput.trim())) return;
    const fresh = findCompanyById(session.companyId);
    if (fresh)
      saveCompany({ ...fresh, floors: [...floors, newFloorInput.trim()] });
    setNewFloorInput("");
    reload();
  };

  const removeFloor = (floor: string) => {
    const fresh = findCompanyById(session.companyId);
    if (fresh)
      saveCompany({
        ...fresh,
        floors: getCurrentFloors().filter((f) => f !== floor),
      });
    reload();
  };

  // Screening questions helpers
  const getCurrentScreeningQuestions = (): ScreeningQuestion[] => {
    return findCompanyById(session.companyId)?.screeningQuestions ?? [];
  };

  const addScreeningQuestion = () => {
    if (!newSqText.trim()) return;
    const fresh = findCompanyById(session.companyId);
    if (!fresh) return;
    const questions = fresh.screeningQuestions ?? [];
    const newQ: ScreeningQuestion = {
      id: Math.random().toString(36).substring(2, 9),
      text: newSqText.trim(),
      type: newSqType,
      blocking: newSqBlocking,
    };
    saveCompany({ ...fresh, screeningQuestions: [...questions, newQ] });
    setNewSqText("");
    setNewSqType("yes_no");
    setNewSqBlocking(false);
    reload();
  };

  // Exit questions helpers
  const getCurrentExitQuestions = (): ExitQuestion[] => {
    return findCompanyById(session.companyId)?.customExitQuestions ?? [];
  };

  const addExitQuestion = () => {
    if (!newExitQText.trim()) return;
    const fresh = findCompanyById(session.companyId);
    if (!fresh) return;
    const qs = fresh.customExitQuestions ?? [];
    const newQ: ExitQuestion = {
      id: Math.random().toString(36).substring(2, 9),
      question: newExitQText.trim(),
      type: newExitQType,
    };
    saveCompany({ ...fresh, customExitQuestions: [...qs, newQ] });
    setNewExitQText("");
    reload();
  };

  const removeExitQuestion = (id: string) => {
    const fresh = findCompanyById(session.companyId);
    if (!fresh) return;
    saveCompany({
      ...fresh,
      customExitQuestions: (fresh.customExitQuestions ?? []).filter(
        (q) => q.id !== id,
      ),
    });
    reload();
  };

  // Re-invite helper
  const submitReinvite = () => {
    if (!reinviteVisitorData) return;
    const appt: Appointment = {
      id: Math.random().toString(36).substring(2, 9),
      companyId: session.companyId,
      visitorName: reinviteVisitorData.name,
      visitorId: reinviteVisitorData.idNumber,
      hostName:
        staffList.find((s) => s.staffId === reinviteVisitorData.hostStaffId)
          ?.name ?? "",
      appointmentDate: reinviteDate,
      appointmentTime: reinviteTime,
      purpose: reinvitePurpose || reinviteVisitorData.visitReason,
      status: "pending",
      createdBy: session.companyId,
      createdAt: Date.now(),
    };
    saveAppointment(appt);
    setReinviteOpen(false);
    setReinviteVisitorData(null);
    reload();
  };

  const removeScreeningQuestion = (id: string) => {
    const fresh = findCompanyById(session.companyId);
    if (!fresh) return;
    saveCompany({
      ...fresh,
      screeningQuestions: (fresh.screeningQuestions ?? []).filter(
        (q) => q.id !== id,
      ),
    });
    reload();
  };

  // Category management helpers
  const getCurrentCategories = (): string[] => {
    const fresh = findCompanyById(session.companyId);
    return fresh?.customCategories?.length
      ? fresh.customCategories
      : ["Misafir", "Müteahhit", "Teslimat", "Mülakat", "Tedarikçi", "Diğer"];
  };

  const addCategory = () => {
    if (!newCategoryInput.trim()) return;
    const cats = getCurrentCategories();
    if (cats.includes(newCategoryInput.trim())) return;
    const fresh = findCompanyById(session.companyId);
    if (fresh) {
      saveCompany({
        ...fresh,
        customCategories: [...cats, newCategoryInput.trim()],
      });
    }
    setNewCategoryInput("");
    reload();
  };

  const removeCategory = (cat: string) => {
    const cats = getCurrentCategories().filter((c) => c !== cat);
    const fresh = findCompanyById(session.companyId);
    if (fresh) {
      saveCompany({ ...fresh, customCategories: cats });
    }
    reload();
  };

  const addCustomField = () => {
    if (!newFieldLabel.trim()) return;
    const fresh = findCompanyById(session.companyId);
    if (!fresh) return;
    const fields = fresh.customFields ?? [];
    saveCompany({
      ...fresh,
      customFields: [
        ...fields,
        {
          id: generateId(),
          label: newFieldLabel.trim(),
          required: newFieldRequired,
        },
      ],
    });
    setNewFieldLabel("");
    setNewFieldRequired(false);
    reload();
  };

  const removeCustomField = (id: string) => {
    const fresh = findCompanyById(session.companyId);
    if (!fresh) return;
    saveCompany({
      ...fresh,
      customFields: (fresh.customFields ?? []).filter((f) => f.id !== id),
    });
    reload();
  };

  // Filter visitors by status AND search text
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;

  const visitorsByTime = (tf: "today" | "week" | "month" | "all") =>
    visitors.filter((v) => {
      const d = new Date(v.arrivalTime);
      if (tf === "today") return d.toDateString() === now.toDateString();
      if (tf === "week") return v.arrivalTime >= startOfWeek;
      if (tf === "month")
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth()
        );
      return true;
    });

  const timeCounts = {
    today: visitorsByTime("today").length,
    week: visitorsByTime("week").length,
    month: visitorsByTime("month").length,
    all: visitors.length,
  };

  const filtered = visitorsByTime(timeFilter)
    .filter((v) =>
      visitorFilter === "all" ? true : v.status === visitorFilter,
    )
    .filter((v) => {
      if (!visitorSearch.trim()) return true;
      const q = visitorSearch.toLowerCase();
      const hostName =
        staffList.find((s) => s.staffId === v.hostStaffId)?.name ?? "";
      return (
        v.name.toLowerCase().includes(q) ||
        v.idNumber.toLowerCase().includes(q) ||
        v.hostStaffId.toLowerCase().includes(q) ||
        hostName.toLowerCase().includes(q)
      );
    })
    .filter((v) => {
      if (filterCategory && v.category !== filterCategory) return false;
      if (filterDateFrom) {
        const fromTs = new Date(filterDateFrom).getTime();
        if (v.arrivalTime < fromTs) return false;
      }
      if (filterDateTo) {
        const toTs = new Date(filterDateTo).getTime() + 86400000;
        if (v.arrivalTime > toTs) return false;
      }
      if (filterPersonnel) {
        const h = staffList.find((s) => s.staffId === v.hostStaffId);
        if (!h?.name.toLowerCase().includes(filterPersonnel.toLowerCase()))
          return false;
      }
      return true;
    });

  const activeNow = visitors.filter((v) => v.status === "active");
  const today = visitors.filter(
    (v) => new Date(v.arrivalTime).toDateString() === new Date().toDateString(),
  );
  const avgDur =
    today
      .filter((v) => v.departureTime)
      .reduce((acc, v) => acc + (v.departureTime! - v.arrivalTime), 0) /
    (today.filter((v) => v.departureTime).length || 1);

  const maxCap = company?.maxCapacity ?? company?.maxConcurrentVisitors ?? 0;
  const capacityExceeded = maxCap > 0 && activeNow.length >= maxCap;

  const TABS: { key: Tab; label: string }[] = [
    { key: "visitors", label: t(lang, "visitors") },
    { key: "staff", label: t(lang, "staffList") },
    { key: "blacklist", label: t(lang, "blacklist") },
    { key: "blacklistreport", label: "🚫 Kara Liste Raporu" },
    { key: "statistics", label: t(lang, "statistics") },
    { key: "evacuation", label: t(lang, "evacuation") },
    { key: "announcements", label: t(lang, "announcements") },
    { key: "compliance", label: "🔒 Uyum Raporu" },
    { key: "auditlog", label: "📋 Denetim Logu" },
    {
      key: "alerthistory",
      label: `⚠️ Uyarı Geçmişi${alertHistory.length > 0 ? ` (${alertHistory.length})` : ""}`,
    },
    {
      key: "equipment",
      label: `📦 Ekipmanlar (${visitors.filter((v) => v.status === "active" && v.equipment).length})`,
    },
    { key: "approved", label: "✅ Onaylı Ziyaretçiler" },
    { key: "departments", label: `🏢 Departmanlar (${departments.length})` },
    { key: "permits", label: `📋 İş İzinleri (${permits.length})` },
    { key: "archive", label: "🗄️ Arşiv" },
    { key: "customreport", label: "📊 Özel Rapor" },
    { key: "shifts", label: "📅 Vardiya Planı" },
    { key: "checklists", label: "✅ Denetim Çeklistleri" },
    { key: "reviews", label: "💬 Yorumlar" },
    { key: "profile", label: t(lang, "profile") },
  ];

  const chartData = getLast7DaysData(visitors);

  // Category breakdown for stats
  const categoryData = (() => {
    const counts: Record<string, number> = {};
    for (const v of visitors) {
      const cat = v.category || "Diğer";
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return Object.entries(counts).map(([category, count]) => ({
      category,
      count,
    }));
  })();

  // Hour breakdown for stats
  const hourData = (() => {
    const counts: number[] = new Array(24).fill(0);
    for (const v of visitors) {
      const h = new Date(v.arrivalTime).getHours();
      counts[h]++;
    }
    return counts.map((count, hour) => ({
      hour: `${String(hour).padStart(2, "0")}:00`,
      count,
    }));
  })();

  // Day of week breakdown for stats
  const dowData = (() => {
    const DAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
    const counts: number[] = new Array(7).fill(0);
    for (const v of visitors) {
      const dow = (new Date(v.arrivalTime).getDay() + 6) % 7; // Mon=0
      counts[dow]++;
    }
    return counts.map((count, i) => ({ day: DAY_LABELS[i], count }));
  })();

  // Repeat visitor analysis
  const repeatVisitorData = (() => {
    const visitorCounts: Record<
      string,
      { name: string; idNumber: string; count: number }
    > = {};
    for (const v of visitors) {
      if (!visitorCounts[v.idNumber]) {
        visitorCounts[v.idNumber] = {
          name: v.name,
          idNumber: v.idNumber,
          count: 0,
        };
      }
      visitorCounts[v.idNumber].count++;
    }
    const repeats = Object.values(visitorCounts).filter((v) => v.count > 1);
    const top5 = repeats.sort((a, b) => b.count - a.count).slice(0, 5);
    const repeatTotal = repeats.reduce((acc, v) => acc + v.count, 0);
    const repeatUniqueCount = repeats.length;
    return { top5, repeatTotal, repeatUniqueCount };
  })();

  // Avg duration by category
  const avgDurByCat = (() => {
    const catData: Record<string, { total: number; count: number }> = {};
    for (const v of visitors.filter((v) => v.departureTime)) {
      const cat = v.category || "Diğer";
      if (!catData[cat]) catData[cat] = { total: 0, count: 0 };
      catData[cat].total += (v.departureTime! - v.arrivalTime) / 60000;
      catData[cat].count++;
    }
    return Object.entries(catData).map(([category, d]) => ({
      category,
      minutes: Math.round(d.total / d.count),
    }));
  })();

  // Shift distribution
  const shiftCounts = {
    morning: visitors.filter((v) => v.shiftType === "morning").length,
    afternoon: visitors.filter((v) => v.shiftType === "afternoon").length,
    night: visitors.filter((v) => v.shiftType === "night").length,
  };

  // Staff performance data
  const staffPerformance = staffList.map((s) => {
    const registered = visitors.filter((v) => v.registeredBy === s.staffId);
    const departed = registered.filter((v) => v.departureTime);
    const avgDurMins = departed.length
      ? Math.round(
          departed.reduce(
            (acc, v) => acc + (v.departureTime! - v.arrivalTime) / 60000,
            0,
          ) / departed.length,
        )
      : 0;
    const catCounts: Record<string, number> = {};
    for (const v of registered) {
      const cat = v.category || "Diğer";
      catCounts[cat] = (catCounts[cat] ?? 0) + 1;
    }
    const topCat =
      Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    // Busiest shift
    const shiftCounts: Record<string, number> = {
      morning: 0,
      afternoon: 0,
      night: 0,
    };
    for (const v of registered) {
      if (v.shiftType)
        shiftCounts[v.shiftType] = (shiftCounts[v.shiftType] ?? 0) + 1;
    }
    const busiestShift =
      Object.entries(shiftCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "morning";
    // Busiest day of week
    const dayCounts: Record<string, number> = {};
    for (const v of registered) {
      const day = new Date(v.arrivalTime).toLocaleDateString("tr-TR", {
        weekday: "long",
      });
      dayCounts[day] = (dayCounts[day] ?? 0) + 1;
    }
    const busiestDay =
      Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    const ratedVisitors = registered.filter(
      (v) => v.exitRating && v.exitRating > 0,
    );
    const avgRating = ratedVisitors.length
      ? (
          ratedVisitors.reduce((acc, v) => acc + (v.exitRating ?? 0), 0) /
          ratedVisitors.length
        ).toFixed(1)
      : "—";
    const commentedCount = registered.filter((v) => v.exitComment).length;
    const commentPct =
      registered.length > 0
        ? Math.round((commentedCount / registered.length) * 100)
        : 0;
    return {
      name: s.name,
      staffId: s.staffId,
      total: registered.length,
      avgDurMins,
      topCat,
      busiestShift,
      busiestDay,
      avgRating,
      commentPct,
    };
  });

  const statusBadge = (v: Visitor) => {
    if (v.status === "active")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          🟢 {t(lang, "active")}
        </span>
      );
    if (v.status === "departed")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/20 text-slate-400 border border-slate-500/30">
          ● {t(lang, "departed")}
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
        ⏳ {t(lang, "preregistered")}
      </span>
    );
  };

  // Audit log filters
  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditActionFilter && !log.action.includes(auditActionFilter))
      return false;
    if (auditDateFilter) {
      const logDate = log.timestamp.slice(0, 10);
      if (logDate !== auditDateFilter) return false;
    }
    return true;
  });

  const ACTION_OPTIONS = [
    { value: "", label: "Tüm İşlemler" },
    { value: "visitor_registered", label: "Ziyaretçi Kayıt" },
    { value: "visitor_checkout", label: "Ziyaretçi Çıkış" },
    { value: "blacklist_add", label: "Kara Liste Ekleme" },
    { value: "blacklist_remove", label: "Kara Liste Silme" },
    { value: "staff_added", label: "Personel Ekleme" },
    { value: "staff_removed", label: "Personel Çıkarma" },
    { value: "bulk_import", label: "Toplu CSV Aktarım" },
    { value: "auto_checkout", label: "Otomatik Çıkış" },
  ];

  const actionLabel = (action: string) => {
    return ACTION_OPTIONS.find((o) => o.value === action)?.label ?? action;
  };

  const actionColor = (action: string) => {
    if (
      action.includes("registered") ||
      action.includes("added") ||
      action.includes("import")
    )
      return "#22c55e";
    if (
      action.includes("checkout") ||
      action.includes("removed") ||
      action.includes("remove")
    )
      return "#ef4444";
    return "#0ea5e9";
  };

  // Current categories from company
  const currentCategories = findCompanyById(session.companyId)?.customCategories
    ?.length
    ? findCompanyById(session.companyId)!.customCategories!
    : ["Misafir", "Müteahhit", "Teslimat", "Mülakat", "Tedarikçi", "Diğer"];

  const currentCustomFields =
    findCompanyById(session.companyId)?.customFields ?? [];

  return (
    <div className="min-h-screen" style={{ background: "#0a0f1e" }}>
      <ConfirmModal
        open={confirmOpen}
        onConfirm={confirmAction}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* Lockdown Confirm Dialog */}
      {lockdownConfirm && (
        <div
          data-ocid="lockdown.dialog"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-sm p-7 rounded-2xl text-center"
            style={{
              background: "#0f1729",
              border: "1.5px solid rgba(239,68,68,0.4)",
            }}
          >
            <div className="text-5xl mb-4">{lockdownActive ? "✅" : "🚨"}</div>
            <h3 className="text-white font-bold text-lg mb-2">
              {lockdownActive
                ? "Kilitlemeyi Kaldır?"
                : "Acil Durum Modunu Aktifleştir?"}
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              {lockdownActive
                ? "Sistem normale döner ve ziyaretçi girişlerine izin verilir."
                : "Tüm ziyaretçi girişleri durdurulur. Kiosk ve personel kayıt formları devre dışı kalır."}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                data-ocid="lockdown.cancel_button"
                onClick={() => setLockdownConfirm(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-slate-300 border border-white/20 hover:bg-white/5 transition-colors"
              >
                İptal
              </button>
              <button
                type="button"
                data-ocid="lockdown.confirm_button"
                onClick={toggleLockdown}
                className="flex-1 py-3 rounded-xl font-semibold text-white"
                style={{
                  background: lockdownActive
                    ? "linear-gradient(135deg,#16a34a,#15803d)"
                    : "linear-gradient(135deg,#dc2626,#b91c1c)",
                }}
              >
                {lockdownActive ? "Evet, Kaldır" : "Evet, Aktifleştir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visitor History Dialog */}
      {historyVisitor && (
        <div
          data-ocid="visitor_history.dialog"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-2xl p-6 rounded-2xl max-h-[85vh] overflow-y-auto"
            style={{
              background: "#0f1729",
              border: "1.5px solid rgba(14,165,233,0.3)",
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-bold text-lg">
                  {historyVisitor.name}
                </h3>
                <p className="text-slate-400 text-sm font-mono">
                  {historyVisitor.idNumber}
                </p>
              </div>
              <button
                type="button"
                data-ocid="visitor_history.close_button"
                onClick={() => setHistoryVisitor(null)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            {(() => {
              const history = visitors
                .filter((v) => v.idNumber === historyVisitor.idNumber)
                .sort((a, b) => b.arrivalTime - a.arrivalTime);
              return history.length === 0 ? (
                <div
                  data-ocid="visitor_history.empty_state"
                  className="text-center py-8 text-slate-500"
                >
                  Geçmiş ziyaret bulunamadı.
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-slate-400 text-sm mb-3">
                    Toplam {history.length} ziyaret kaydı
                  </p>
                  {history.map((v, i) => (
                    <div
                      key={v.visitorId}
                      data-ocid={`visitor_history.item.${i + 1}`}
                      className="p-4 rounded-xl"
                      style={{
                        background:
                          v.status === "active"
                            ? "rgba(34,197,94,0.07)"
                            : "rgba(255,255,255,0.04)",
                        border:
                          v.status === "active"
                            ? "1px solid rgba(34,197,94,0.25)"
                            : "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white text-sm font-medium">
                              {formatDateTime(v.arrivalTime)}
                            </span>
                            {v.category && (
                              <span
                                className="px-2 py-0.5 rounded text-xs text-white"
                                style={{ background: "rgba(14,165,233,0.3)" }}
                              >
                                {v.category}
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 text-xs">
                            Host:{" "}
                            {staffList.find((s) => s.staffId === v.hostStaffId)
                              ?.name ??
                              (v.hostStaffId || "—")}
                          </div>
                          {v.visitReason && (
                            <div className="text-slate-500 text-xs mt-0.5">
                              {v.visitReason}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          {v.departureTime && (
                            <div className="text-slate-400 text-xs">
                              Süre:{" "}
                              {durationLabel(v.arrivalTime, v.departureTime)}
                            </div>
                          )}
                          {v.exitRating && (
                            <div className="text-amber-400 text-xs">
                              {"\u2605".repeat(v.exitRating)}
                              {"\u2606".repeat(5 - v.exitRating)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Reset code result notification */}
      {resetCodeResult && (
        <div
          className="fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-2xl max-w-sm"
          style={{
            background: "#0f1729",
            border: "1.5px solid rgba(34,197,94,0.4)",
          }}
        >
          <p className="text-emerald-400 font-semibold text-sm mb-1">
            ✅ Kod Sıfırlandı!
          </p>
          <p className="text-slate-300 text-sm">{resetCodeResult.name}</p>
          <p className="text-white font-mono text-lg tracking-widest">
            {resetCodeResult.code}
          </p>
          <button
            type="button"
            onClick={() => setResetCodeResult(null)}
            className="mt-2 text-slate-500 text-xs hover:text-slate-300"
          >
            Kapat
          </button>
        </div>
      )}

      {/* Lockdown Banner */}
      {lockdownActive && (
        <div
          data-ocid="company_dashboard.lockdown_banner"
          className="flex items-center gap-3 px-6 py-3 text-white font-bold text-sm"
          style={{
            background: "linear-gradient(90deg,#7f1d1d,#991b1b)",
            borderBottom: "2px solid #ef4444",
          }}
        >
          <span className="animate-pulse text-lg">⚠️</span>
          ACİL DURUM MOD AKTİF — Ziyaretçi girişleri durduruldu
        </div>
      )}

      {/* Storage Notice */}
      {!storageDismissed && (
        <div
          data-ocid="company_dashboard.storage_notice"
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
            data-ocid="company_dashboard.storage_notice.close_button"
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

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div>
          <div className="text-xl font-bold text-white">
            <span style={{ color: "#0ea5e9" }}>Safe</span>ntry
          </div>
          <div className="text-xs text-slate-400">
            {company?.name} — Yönetici Paneli
          </div>
        </div>
        <div className="flex items-center gap-3">
          <NotificationCenter companyId={session.companyId} />
          <LangSwitcher onChange={onRefresh} />
          <button
            type="button"
            data-ocid="company_dashboard.lobby.button"
            onClick={() => setLobbyOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all"
            style={{
              background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
              border: "1px solid #38bdf8",
            }}
          >
            🖥️ Lobi Ekranı
          </button>
          <button
            type="button"
            data-ocid="company_dashboard.lockdown.button"
            onClick={() => setLockdownConfirm(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all"
            style={{
              background: lockdownActive
                ? "linear-gradient(135deg,#16a34a,#15803d)"
                : "linear-gradient(135deg,#dc2626,#b91c1c)",
              border: lockdownActive
                ? "1px solid #22c55e"
                : "1px solid #ef4444",
            }}
          >
            {lockdownActive ? "✅ Kilidi Kaldır" : "🚨 Acil Durum"}
          </button>
          <button
            type="button"
            data-ocid="company_dashboard.logout.button"
            onClick={logout}
            className="text-slate-400 hover:text-white text-sm"
          >
            {t(lang, "logout")}
          </button>
        </div>
      </div>

      {/* Lobby Display */}
      {lobbyOpen && (
        <div
          data-ocid="lobby_display.panel"
          className="fixed inset-0 z-50 flex flex-col p-10"
          style={{ background: "#020817" }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setLobbyOpen(false);
          }}
          tabIndex={-1}
        >
          <button
            type="button"
            data-ocid="lobby_display.close_button"
            onClick={() => setLobbyOpen(false)}
            className="absolute top-6 right-8 text-slate-500 hover:text-white text-2xl z-10"
          >
            ✕
          </button>
          {/* Company + Time */}
          <div className="text-center mb-12">
            <div
              className="text-5xl font-bold mb-3"
              style={{ color: "#14b8a6" }}
            >
              {company?.name}
            </div>
            <div className="text-7xl font-mono text-white">
              {lobbyTime.toLocaleTimeString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </div>
            <div className="text-slate-400 text-lg mt-2">
              {lobbyTime.toLocaleDateString("tr-TR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl mx-auto w-full">
            {/* Expected Visitors */}
            <div
              className="p-8 rounded-3xl"
              style={{
                background: "rgba(14,165,233,0.07)",
                border: "1.5px solid rgba(14,165,233,0.25)",
              }}
            >
              <h2 className="text-2xl font-bold text-white mb-6">
                📋 Bugün Beklenen
              </h2>
              {(() => {
                const todayStr = new Date().toISOString().slice(0, 10);
                const todayAppts = getAppointments(session.companyId)
                  .filter(
                    (a) =>
                      a.appointmentDate === todayStr &&
                      a.status !== "cancelled",
                  )
                  .sort((a, b) =>
                    a.appointmentTime.localeCompare(b.appointmentTime),
                  );
                return todayAppts.length === 0 ? (
                  <p className="text-slate-500 text-lg">
                    Bugün için randevu yok
                  </p>
                ) : (
                  <div className="space-y-4">
                    {todayAppts.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-4 rounded-2xl"
                        style={{ background: "rgba(14,165,233,0.08)" }}
                      >
                        <div>
                          <div className="text-white text-lg font-semibold">
                            {a.visitorName}
                          </div>
                          <div className="text-slate-400">{a.hostName}</div>
                        </div>
                        <div className="text-teal-400 text-xl font-mono">
                          {a.appointmentTime}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            {/* Currently Inside */}
            <div
              className="p-8 rounded-3xl"
              style={{
                background: "rgba(34,197,94,0.07)",
                border: "1.5px solid rgba(34,197,94,0.25)",
              }}
            >
              <h2 className="text-2xl font-bold text-white mb-2">
                🟢 Şu An İçeride
              </h2>
              <p
                className="text-6xl font-bold mb-6"
                style={{ color: "#4ade80" }}
              >
                {activeNow.length}
              </p>
              <div className="space-y-3">
                {activeNow.slice(0, 6).map((v) => (
                  <div
                    key={v.visitorId}
                    className="flex items-center justify-between"
                  >
                    <span className="text-white text-base">{v.name}</span>
                    <span className="text-slate-400 text-sm">
                      {new Date(v.arrivalTime).toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
                {activeNow.length > 6 && (
                  <div className="text-slate-500 text-sm">
                    +{activeNow.length - 6} kişi daha...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 pt-4">
        {[
          { label: "Aktif", value: activeNow.length, color: "#22c55e" },
          { label: "Bugün", value: today.length, color: "#0ea5e9" },
          { label: "Toplam", value: visitors.length, color: "#f59e0b" },
          { label: "Personel", value: staffList.length, color: "#a855f7" },
        ].map((s) => (
          <div
            key={s.label}
            className="px-4 py-2 rounded-xl flex items-center gap-3"
            style={{
              background: `${s.color}12`,
              border: `1px solid ${s.color}30`,
            }}
          >
            <span className="text-2xl font-bold" style={{ color: s.color }}>
              {s.value}
            </span>
            <span className="text-slate-400 text-sm">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 px-6 pt-4 border-b border-white/10">
        {TABS.map(({ key, label }) => (
          <button
            type="button"
            key={key}
            data-ocid={`company_dashboard.${key}.tab`}
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
        {/* ONBOARDING BANNER */}
        {!onboardingDismissed &&
          visitors.length === 0 &&
          staffList.length === 0 && (
            <div
              data-ocid="onboarding.banner"
              className="mb-6 p-5 rounded-2xl relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, rgba(20,184,166,0.15), rgba(245,158,11,0.1))",
                border: "1px solid rgba(20,184,166,0.3)",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-white font-bold text-base mb-1">
                    🎉 Safentry'ye Hoş Geldiniz!
                  </h3>
                  <p className="text-slate-300 text-sm mb-4">
                    Sistemi kullanmaya başlamak için aşağıdaki adımları
                    tamamlayın:
                  </p>
                  <div className="space-y-2">
                    {[
                      { label: "Personel ekleyin", done: staffList.length > 0 },
                      {
                        label: "Ziyaret kategorilerini yapılandırın",
                        done:
                          (findCompanyById(session.companyId)?.customCategories
                            ?.length ?? 0) > 0,
                      },
                      {
                        label: "Kapasite limitini ayarlayın",
                        done: (company?.maxCapacity ?? 0) > 0,
                      },
                      { label: "Kiosk modunu deneyin", done: false },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: item.done
                              ? "rgba(20,184,166,0.3)"
                              : "rgba(255,255,255,0.08)",
                            border: `1px solid ${item.done ? "#14b8a6" : "rgba(255,255,255,0.15)"}`,
                          }}
                        >
                          {item.done && (
                            <span className="text-teal-400 text-xs">✓</span>
                          )}
                        </div>
                        <span
                          className={`text-sm ${item.done ? "text-teal-300 line-through opacity-70" : "text-slate-200"}`}
                        >
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  data-ocid="onboarding.close_button"
                  onClick={dismissOnboarding}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#94a3b8",
                  }}
                >
                  Tamam, anladım
                </button>
              </div>
            </div>
          )}

        {/* VISITORS TAB */}
        {tab === "visitors" && (
          <div>
            {/* Capacity Warning */}
            {capacityExceeded && (
              <div
                data-ocid="visitors.capacity.error_state"
                className="mb-4 p-4 rounded-xl border border-red-500/50 bg-red-900/20 flex items-center gap-3"
              >
                <span className="text-2xl">🚨</span>
                <div>
                  <p className="text-red-400 font-semibold text-sm">
                    Kapasite Sınırına Ulaşıldı!
                  </p>
                  <p className="text-red-300/70 text-xs mt-0.5">
                    Binada {activeNow.length} ziyaretçi var — maksimum kapasite{" "}
                    {maxCap} kişi.
                  </p>
                </div>
              </div>
            )}

            {/* Time Period Filter */}
            <div className="flex flex-wrap gap-2 mb-3">
              {(["today", "week", "month", "all"] as const).map((tf) => {
                const labels = {
                  today: "Günlük",
                  week: "Haftalık",
                  month: "Aylık",
                  all: "Tümü",
                };
                const ocids = {
                  today: "visitors.today.tab",
                  week: "visitors.week.tab",
                  month: "visitors.month.tab",
                  all: "visitors.all_time.tab",
                };
                return (
                  <button
                    type="button"
                    key={tf}
                    data-ocid={ocids[tf]}
                    onClick={() => setTimeFilter(tf)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      timeFilter === tf
                        ? "text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                    style={
                      timeFilter === tf
                        ? {
                            background: "rgba(14,165,233,0.3)",
                            border: "1px solid rgba(14,165,233,0.6)",
                          }
                        : {
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.1)",
                          }
                    }
                  >
                    {labels[tf]}
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        timeFilter === tf
                          ? "bg-sky-500/40 text-sky-200"
                          : "bg-white/10 text-slate-400"
                      }`}
                    >
                      {timeCounts[tf]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Filters + search */}
            <div className="flex flex-wrap gap-3 mb-5 items-center">
              {(["all", "active", "departed"] as const).map((f) => (
                <button
                  type="button"
                  key={f}
                  data-ocid={`visitors.${f}.tab`}
                  onClick={() => setVisitorFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    visitorFilter === f
                      ? "text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                  style={
                    visitorFilter === f
                      ? {
                          background: "rgba(14,165,233,0.25)",
                          border: "1px solid rgba(14,165,233,0.5)",
                        }
                      : {
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }
                  }
                >
                  {f === "all"
                    ? t(lang, "all")
                    : f === "active"
                      ? t(lang, "active")
                      : t(lang, "departed")}
                </button>
              ))}
              <input
                data-ocid="visitors.search_input"
                value={visitorSearch}
                onChange={(e) => setVisitorSearch(e.target.value)}
                placeholder={t(lang, "search")}
                className="flex-1 min-w-[200px] px-4 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
              />
              <button
                type="button"
                data-ocid="visitors.filter.toggle"
                onClick={() => setShowAdvancedFilter((v) => !v)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all"
                style={{
                  background: showAdvancedFilter
                    ? "rgba(245,158,11,0.2)"
                    : "rgba(255,255,255,0.07)",
                  border: showAdvancedFilter
                    ? "1px solid rgba(245,158,11,0.4)"
                    : "1px solid rgba(255,255,255,0.15)",
                  color: showAdvancedFilter ? "#f59e0b" : "#94a3b8",
                }}
              >
                🔽 Gelişmiş Filtre{" "}
                {filterCategory ||
                filterDateFrom ||
                filterDateTo ||
                filterPersonnel
                  ? "●"
                  : ""}
              </button>
            </div>

            {/* Advanced Filter Panel */}
            {showAdvancedFilter && (
              <div
                data-ocid="visitors.filter.panel"
                className="mb-4 p-4 rounded-xl grid grid-cols-2 gap-3"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div>
                  <p className="text-slate-400 text-xs mb-1.5">Kategori</p>
                  <select
                    data-ocid="visitors.category.select"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                    style={{
                      background: "#0f1729",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    <option value="" className="bg-[#0f1729]">
                      Tümü
                    </option>
                    {[
                      "Misafir",
                      "Müteahhit",
                      "Teslimat",
                      "Mülakat",
                      "Tedarikçi",
                      "Diğer",
                    ].map((c) => (
                      <option key={c} value={c} className="bg-[#0f1729]">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1.5">Personel</p>
                  <input
                    data-ocid="visitors.personnel.input"
                    type="text"
                    value={filterPersonnel}
                    onChange={(e) => setFilterPersonnel(e.target.value)}
                    placeholder="Personel adı..."
                    className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  />
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1.5">
                    Başlangıç Tarihi
                  </p>
                  <input
                    data-ocid="visitors.date_from.input"
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  />
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1.5">Bitiş Tarihi</p>
                  <input
                    data-ocid="visitors.date_to.input"
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  />
                </div>
                <div className="col-span-2 flex justify-end">
                  <button
                    type="button"
                    data-ocid="visitors.filter.clear_button"
                    onClick={() => {
                      setFilterCategory("");
                      setFilterDateFrom("");
                      setFilterDateTo("");
                      setFilterPersonnel("");
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300"
                    style={{
                      background: "rgba(239,68,68,0.12)",
                      border: "1px solid rgba(239,68,68,0.3)",
                    }}
                  >
                    🗑️ Filtreyi Temizle
                  </button>
                </div>
              </div>
            )}

            {/* CSV Export */}
            <div className="flex flex-wrap gap-3 mb-5 items-center">
              {/* CSV Export */}
              <div className="flex gap-2 items-center">
                <input
                  data-ocid="visitors.export_from.input"
                  type="date"
                  value={exportDateFrom}
                  onChange={(e) => setExportDateFrom(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
                />
                <span className="text-slate-500 text-sm">—</span>
                <input
                  data-ocid="visitors.export_to.input"
                  type="date"
                  value={exportDateTo}
                  onChange={(e) => setExportDateTo(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
                />
                <button
                  type="button"
                  data-ocid="visitors.export.button"
                  onClick={exportCsv}
                  className="px-4 py-1.5 rounded-xl text-white text-sm font-medium whitespace-nowrap"
                  style={{
                    background: "rgba(34,197,94,0.15)",
                    border: "1px solid rgba(34,197,94,0.35)",
                  }}
                >
                  CSV İndir
                </button>
              </div>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                data-ocid="visitors.empty_state"
                icon={ClipboardList}
                title="Ziyaretçi bulunamadı"
                description="Seçilen filtreye uygun ziyaretçi kaydı yok."
              />
            ) : (
              <div className="space-y-2">
                {filtered
                  .slice()
                  .sort((a, b) => b.arrivalTime - a.arrivalTime)
                  .map((v, i) => (
                    <div
                      key={v.visitorId}
                      data-ocid={`visitors.item.${i + 1}`}
                      className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-colors cursor-pointer"
                      onClick={() => setHistoryVisitor(v)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && setHistoryVisitor(v)
                      }
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0"
                          style={{ background: LABEL_COLORS[v.label] }}
                        >
                          {v.name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-medium text-sm">
                              {v.name}
                            </span>
                            {statusBadge(v)}
                            {v.category && (
                              <span
                                className="px-2 py-0.5 rounded text-xs text-white"
                                style={{ background: "rgba(14,165,233,0.3)" }}
                              >
                                {v.category}
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 text-xs truncate">
                            {formatDateTime(v.arrivalTime)} &bull;{" "}
                            {staffList.find((s) => s.staffId === v.hostStaffId)
                              ?.name ?? v.hostStaffId}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        <div className="text-slate-500 text-xs">
                          {v.departureTime
                            ? durationLabel(v.arrivalTime, v.departureTime)
                            : v.status === "active"
                              ? durationLabel(v.arrivalTime)
                              : ""}
                        </div>
                        <button
                          type="button"
                          data-ocid={`visitors.reinvite.button.${i + 1}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setReinviteVisitorData(v);
                            setReinviteOpen(true);
                            setReinvitePurpose(v.visitReason);
                          }}
                          className="px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap"
                          style={{
                            background: "rgba(14,165,233,0.15)",
                            border: "1px solid rgba(14,165,233,0.3)",
                            color: "#0ea5e9",
                          }}
                        >
                          ✉️ Davet
                        </button>
                        <button
                          type="button"
                          data-ocid={`visitor_profile.open_modal_button.${i + 1}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setProfileVisitor(v);
                          }}
                          className="px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap"
                          style={{
                            background: "rgba(168,85,247,0.15)",
                            border: "1px solid rgba(168,85,247,0.3)",
                            color: "#a855f7",
                          }}
                          title="Ziyaretçi Profili"
                        >
                          👤
                        </button>
                        {/* Badge validity warning */}
                        {v.status === "active" &&
                          (() => {
                            const validHours = company?.badgeValidityHours ?? 8;
                            const elapsed =
                              (Date.now() - v.arrivalTime) / 3600000;
                            const remaining = validHours - elapsed;
                            if (remaining <= 0) {
                              return (
                                <span
                                  className="px-1.5 py-0.5 rounded text-xs font-bold text-red-400"
                                  style={{ background: "rgba(239,68,68,0.15)" }}
                                >
                                  🚫 Süre Doldu
                                </span>
                              );
                            }
                            if (remaining <= 0.5) {
                              return (
                                <span
                                  className="px-1.5 py-0.5 rounded text-xs font-bold text-amber-400"
                                  style={{
                                    background: "rgba(245,158,11,0.15)",
                                  }}
                                >
                                  ⚠️ Süre Yaklaşıyor
                                </span>
                              );
                            }
                            return null;
                          })()}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* STAFF TAB */}
        {tab === "staff" && (
          <div>
            {/* Add staff by code */}
            <div className="flex gap-3 mb-6">
              <input
                data-ocid="staff.code.input"
                value={newStaffCode}
                onChange={(e) => setNewStaffCode(e.target.value)}
                placeholder={"Personel Kodu"}
                className="flex-1 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9] font-mono"
              />
              <button
                type="button"
                data-ocid="staff.add.button"
                onClick={addStaff}
                className="px-5 py-2 rounded-xl text-white text-sm font-medium"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                }}
              >
                {t(lang, "add")}
              </button>
            </div>

            {/* Invite code */}
            <div
              className="flex flex-wrap items-center gap-3 p-4 rounded-2xl border border-white/10 mb-6"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <button
                type="button"
                data-ocid="staff.invite.button"
                onClick={genInvite}
                className="px-4 py-2 rounded-xl text-sm text-white font-medium"
                style={{
                  background: "linear-gradient(135deg,#a855f7,#9333ea)",
                }}
              >
                {t(lang, "generateInviteCode")}
              </button>
              {inviteCode && (
                <span className="font-mono text-purple-400 text-sm border border-purple-500/30 px-3 py-1 rounded-lg">
                  {inviteCode}
                </span>
              )}
            </div>

            {staffList.length === 0 ? (
              <EmptyState
                data-ocid="staff.empty_state"
                icon={Users}
                title="Personel bulunamadı"
                description="Henüz personel eklenmemiş. Yeni personel ekleyerek başlayın."
              />
            ) : (
              <div className="space-y-3">
                {staffList.map((s, i) => (
                  <div
                    key={s.staffId}
                    data-ocid={`staff.item.${i + 1}`}
                    className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                        style={{
                          background:
                            AVAIL_COLORS[s.availabilityStatus] ?? "#0ea5e9",
                        }}
                      >
                        {s.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium text-sm">
                          {s.name}
                        </div>
                        <div className="text-slate-400 text-xs font-mono">
                          {s.staffId} &bull; {s.role}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        data-ocid={`staff.reset_code.button.${i + 1}`}
                        onClick={() => doResetStaffCode(s)}
                        className="px-3 py-1.5 rounded-lg text-xs text-amber-400 transition-all"
                        style={{
                          background: "rgba(245,158,11,0.1)",
                          border: "1px solid rgba(245,158,11,0.3)",
                        }}
                      >
                        {t(lang, "resetCode")}
                      </button>
                      <button
                        type="button"
                        data-ocid={`staff.delete_button.${i + 1}`}
                        onClick={() => doRemoveStaff(s)}
                        className="px-3 py-1.5 rounded-lg text-xs text-red-400 transition-all"
                        style={{
                          background: "rgba(239,68,68,0.1)",
                          border: "1px solid rgba(239,68,68,0.3)",
                        }}
                      >
                        {t(lang, "remove")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BLACKLIST TAB */}
        {tab === "blacklist" && (
          <div>
            <div className="flex flex-wrap gap-3 mb-6">
              <input
                data-ocid="blacklist.idnumber.input"
                value={blIdNumber}
                onChange={(e) => setBlIdNumber(e.target.value)}
                placeholder={t(lang, "idNumber")}
                className="flex-1 min-w-[160px] px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-red-500 font-mono"
              />
              <input
                data-ocid="blacklist.reason.input"
                value={blReason}
                onChange={(e) => setBlReason(e.target.value)}
                placeholder={t(lang, "reason")}
                className="flex-1 min-w-[200px] px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none"
              />
              <select
                data-ocid="blacklist.reason_category.select"
                value={blReasonCategory}
                onChange={(e) => setBlReasonCategory(e.target.value)}
                className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none"
              >
                {[
                  "Güvenlik Tehdidi",
                  "Yasak Kişi",
                  "Eski Çalışan",
                  "Hırsızlık",
                  "Diğer",
                ].map((cat) => (
                  <option key={cat} value={cat} className="bg-[#0f1729]">
                    {cat}
                  </option>
                ))}
              </select>
              <button
                type="button"
                data-ocid="blacklist.add.button"
                onClick={doAddBl}
                className="px-5 py-2 rounded-xl text-white text-sm font-medium"
                style={{
                  background: "linear-gradient(135deg,#ef4444,#dc2626)",
                }}
              >
                {t(lang, "addToBlacklist")}
              </button>
            </div>

            {blacklist.length === 0 ? (
              <EmptyState
                data-ocid="blacklist.empty_state"
                icon={ShieldOff}
                title="Kara liste boş"
                description="Henüz kara listeye alınmış kişi yok."
              />
            ) : (
              <div className="space-y-3">
                {blacklist.map((b, i) => (
                  <div
                    key={b.idNumber}
                    data-ocid={`blacklist.item.${i + 1}`}
                    className="flex items-center justify-between p-4 rounded-xl border border-red-500/20 bg-red-900/10"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-white font-mono font-medium">
                          {b.idNumber}
                        </div>
                        {b.reasonCategory && (
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{
                              background:
                                b.reasonCategory === "Güvenlik Tehdidi"
                                  ? "rgba(239,68,68,0.3)"
                                  : b.reasonCategory === "Yasak Kişi"
                                    ? "rgba(168,85,247,0.3)"
                                    : b.reasonCategory === "Eski Çalışan"
                                      ? "rgba(245,158,11,0.3)"
                                      : b.reasonCategory === "Hırsızlık"
                                        ? "rgba(249,115,22,0.3)"
                                        : "rgba(100,116,139,0.3)",
                              border: "1px solid rgba(255,255,255,0.15)",
                            }}
                          >
                            {b.reasonCategory}
                          </span>
                        )}
                      </div>
                      {b.reason && (
                        <div className="text-slate-400 text-xs mt-0.5">
                          {b.reason}
                        </div>
                      )}
                      <div className="text-slate-500 text-xs">
                        {formatDateTime(b.addedAt)}
                      </div>
                    </div>
                    <button
                      type="button"
                      data-ocid={`blacklist.delete_button.${i + 1}`}
                      onClick={() => doRemoveBl(b.idNumber)}
                      className="px-3 py-1.5 rounded-lg text-xs text-red-400 transition-all hover:opacity-80"
                      style={{
                        background: "rgba(239,68,68,0.15)",
                        border: "1px solid rgba(239,68,68,0.35)",
                      }}
                    >
                      {t(lang, "remove")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STATISTICS TAB */}
        {tab === "statistics" && (
          <div id="statistics-print-section" className="space-y-6">
            {/* PDF Download button */}
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">
                📊 Ziyaretçi İstatistikleri
              </h2>
              <button
                type="button"
                data-ocid="statistics.pdf.button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 no-print"
                style={{
                  background: "rgba(14,165,233,0.3)",
                  border: "1px solid rgba(14,165,233,0.5)",
                }}
              >
                📄 PDF İndir
              </button>
            </div>
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  label: "Bugün",
                  value: today.length,
                  color: "#0ea5e9",
                  bg: "rgba(14,165,233,0.15)",
                },
                {
                  label: "Aktif",
                  value: activeNow.length,
                  color: "#22c55e",
                  bg: "rgba(34,197,94,0.15)",
                },
                {
                  label: "Toplam",
                  value: visitors.length,
                  color: "#f59e0b",
                  bg: "rgba(245,158,11,0.15)",
                },
                {
                  label: "Ort. Süre",
                  value:
                    Math.round(avgDur / 60000) < 60
                      ? `${Math.round(avgDur / 60000)}d`
                      : `${Math.floor(avgDur / 3600000)}s`,
                  color: "#a855f7",
                  bg: "rgba(168,85,247,0.15)",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-5 rounded-2xl text-center"
                  style={{
                    background: s.bg,
                    border: `1.5px solid ${s.color}40`,
                  }}
                >
                  <div
                    className="text-3xl font-bold"
                    style={{ color: s.color }}
                  >
                    {s.value}
                  </div>
                  <div className="text-slate-400 text-xs mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Shift distribution */}
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  label: "☀️ Sabah",
                  value: shiftCounts.morning,
                  color: "#f59e0b",
                },
                {
                  label: "🌅 Öğleden Sonra",
                  value: shiftCounts.afternoon,
                  color: "#0ea5e9",
                },
                {
                  label: "🌙 Gece",
                  value: shiftCounts.night,
                  color: "#a855f7",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-4 rounded-2xl text-center"
                  style={{
                    background: `${s.color}12`,
                    border: `1.5px solid ${s.color}35`,
                  }}
                >
                  <div
                    className="text-2xl font-bold"
                    style={{ color: s.color }}
                  >
                    {s.value}
                  </div>
                  <div className="text-slate-400 text-xs mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* 7-day chart */}
            <div
              className="p-5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <p className="text-slate-300 text-sm font-semibold mb-4">
                Son 7 Gün
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#1e293b",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    labelStyle={{ color: "white" }}
                    itemStyle={{ color: "#0ea5e9" }}
                  />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category breakdown chart */}
            {categoryData.length > 0 && (
              <div
                className="p-5 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <p className="text-slate-300 text-sm font-semibold mb-4">
                  Kategoriye Göre Ziyaretçi
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={categoryData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <XAxis
                      dataKey="category"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                    />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#1e293b",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                      labelStyle={{ color: "white" }}
                      itemStyle={{ color: "#f59e0b" }}
                    />
                    <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Hour distribution chart */}
            <div
              className="p-5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <p className="text-slate-300 text-sm font-semibold mb-4">
                Saate Göre Ziyaretçi Dağılımı
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={hourData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    interval={3}
                  />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#1e293b",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    labelStyle={{ color: "white" }}
                    itemStyle={{ color: "#22c55e" }}
                  />
                  <Bar dataKey="count" fill="#22c55e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Avg duration by category */}
            {avgDurByCat.length > 0 && (
              <div
                className="p-5 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <p className="text-slate-300 text-sm font-semibold mb-4">
                  Ortalama Kalış Süresi (Kategoriye Göre, dakika)
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={avgDurByCat}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <XAxis
                      dataKey="category"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                    />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#1e293b",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                      labelStyle={{ color: "white" }}
                      itemStyle={{ color: "#a855f7" }}
                    />
                    <Bar
                      dataKey="minutes"
                      fill="#a855f7"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Visit type breakdown */}
            <div
              className="p-5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <p className="text-slate-300 text-sm font-semibold mb-4">
                Ziyaret Tiplerine Göre
              </p>
              {Object.entries(
                visitors.reduce(
                  (acc, v) => {
                    acc[v.visitType] = (acc[v.visitType] ?? 0) + 1;
                    return acc;
                  },
                  {} as Record<string, number>,
                ),
              ).map(([type, count]) => {
                const pct = Math.round((count / visitors.length) * 100);
                return (
                  <div key={type} className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300 capitalize">{type}</span>
                      <span className="text-white font-medium">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: "linear-gradient(90deg,#0ea5e9,#0284c7)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Satisfaction score section */}
            {(() => {
              const rated = visitors.filter(
                (v) => v.exitRating && v.exitRating > 0,
              );
              const avgSat = rated.length
                ? (
                    rated.reduce((acc, v) => acc + (v.exitRating ?? 0), 0) /
                    rated.length
                  ).toFixed(1)
                : null;
              const dist = [1, 2, 3, 4, 5].map((star) => ({
                star,
                count: rated.filter((v) => v.exitRating === star).length,
              }));
              const last7 = (() => {
                const days: { date: string; avg: number | null }[] = [];
                for (let i = 6; i >= 0; i--) {
                  const d = new Date();
                  d.setDate(d.getDate() - i);
                  const dayRated = rated.filter((v) => {
                    const vd = new Date(v.arrivalTime);
                    return (
                      vd.getFullYear() === d.getFullYear() &&
                      vd.getMonth() === d.getMonth() &&
                      vd.getDate() === d.getDate()
                    );
                  });
                  days.push({
                    date: d.toLocaleDateString("tr-TR", {
                      weekday: "short",
                      day: "numeric",
                    }),
                    avg: dayRated.length
                      ? Number.parseFloat(
                          (
                            dayRated.reduce(
                              (a, v) => a + (v.exitRating ?? 0),
                              0,
                            ) / dayRated.length
                          ).toFixed(1),
                        )
                      : null,
                  });
                }
                return days;
              })();
              return (
                <div
                  className="p-5 rounded-2xl"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <p className="text-slate-300 text-sm font-semibold mb-4">
                    ⭐ Ziyaretçi Memnuniyet Puanı
                  </p>
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div
                      className="p-4 rounded-xl text-center"
                      style={{
                        background: "rgba(245,158,11,0.1)",
                        border: "1px solid rgba(245,158,11,0.25)",
                      }}
                    >
                      <div
                        className="text-3xl font-bold"
                        style={{ color: "#f59e0b" }}
                      >
                        {avgSat ?? "—"}
                      </div>
                      <div className="text-slate-400 text-xs mt-1">
                        Ortalama Puan
                      </div>
                      <div className="text-slate-500 text-xs">
                        {rated.length} değerlendirme
                      </div>
                    </div>
                    <div
                      className="p-4 rounded-xl"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div className="text-slate-300 text-xs font-semibold mb-2">
                        Dağılım
                      </div>
                      {dist.map(({ star, count }) => (
                        <div
                          key={star}
                          className="flex items-center gap-2 mb-1"
                        >
                          <span className="text-xs text-slate-500 w-3">
                            {star}
                          </span>
                          <span className="text-yellow-400 text-xs">
                            {"★".repeat(star)}
                            {"☆".repeat(5 - star)}
                          </span>
                          <div
                            className="flex-1 h-1.5 rounded-full"
                            style={{ background: "rgba(255,255,255,0.08)" }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${rated.length ? (count / rated.length) * 100 : 0}%`,
                                background: "#f59e0b",
                              }}
                            />
                          </div>
                          <span className="text-slate-500 text-xs w-4">
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-2">
                      Son 7 Gün Trendi
                    </p>
                    <div
                      className="flex items-end gap-1"
                      style={{ height: 48 }}
                    >
                      {last7.map((day) => (
                        <div
                          key={day.date}
                          className="flex-1 flex flex-col items-center gap-1"
                        >
                          <div
                            className="w-full rounded-t"
                            style={{
                              height: day.avg
                                ? `${(day.avg / 5) * 40}px`
                                : "2px",
                              background: day.avg
                                ? "#f59e0b"
                                : "rgba(255,255,255,0.1)",
                              minHeight: "2px",
                            }}
                          />
                          <span className="text-slate-600 text-xs">
                            {day.avg ?? "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Memnuniyet Trend Report */}
            {(() => {
              const now = Date.now();
              const day7 = now - 7 * 86400000;
              const day30 = now - 30 * 86400000;
              const ratedAll = visitors.filter(
                (v) => v.exitRating && v.exitRating > 0,
              );
              const rated7 = ratedAll.filter((v) => v.arrivalTime >= day7);
              const rated30 = ratedAll.filter((v) => v.arrivalTime >= day30);
              const avg = (arr: typeof ratedAll) =>
                arr.length
                  ? (
                      arr.reduce((a, v) => a + (v.exitRating ?? 0), 0) /
                      arr.length
                    ).toFixed(1)
                  : null;
              // Weekly trend: last 8 weeks
              const weeklyTrend = Array.from({ length: 8 }, (_, i) => {
                const wEnd = now - i * 7 * 86400000;
                const wStart = wEnd - 7 * 86400000;
                const wRated = ratedAll.filter(
                  (v) => v.arrivalTime >= wStart && v.arrivalTime < wEnd,
                );
                const wLabel = new Date(wStart).toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "short",
                });
                return {
                  label: wLabel,
                  avg: wRated.length
                    ? Number(
                        (
                          wRated.reduce((a, v) => a + (v.exitRating ?? 0), 0) /
                          wRated.length
                        ).toFixed(1),
                      )
                    : null,
                  count: wRated.length,
                };
              }).reverse();
              // Category breakdown
              const categories = [
                ...new Set(ratedAll.map((v) => v.category).filter(Boolean)),
              ] as string[];
              const catBreakdown = categories.map((cat) => {
                const catRated = ratedAll.filter((v) => v.category === cat);
                return {
                  cat,
                  avg: catRated.length
                    ? (
                        catRated.reduce((a, v) => a + (v.exitRating ?? 0), 0) /
                        catRated.length
                      ).toFixed(1)
                    : null,
                  count: catRated.length,
                };
              });
              if (ratedAll.length < 3)
                return (
                  <div
                    data-ocid="stats.satisfaction_trend.empty_state"
                    className="p-5 rounded-2xl"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <p className="text-slate-300 text-sm font-semibold mb-2">
                      📈 Memnuniyet Trend Raporu
                    </p>
                    <p className="text-slate-500 text-sm">
                      Trend raporu için en az 3 değerlendirme gereklidir. Şu an{" "}
                      {ratedAll.length} değerlendirme var.
                    </p>
                  </div>
                );

              return (
                <div
                  className="p-5 rounded-2xl space-y-5"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <p className="text-slate-300 text-sm font-semibold">
                      📈 Memnuniyet Trend Raporu
                    </p>
                    <div className="flex gap-1">
                      {(
                        [
                          ["7d", "Son 7 Gün"],
                          ["30d", "Son 30 Gün"],
                          ["all", "Tüm Zamanlar"],
                        ] as [typeof statSatisfactionPeriod, string][]
                      ).map(([k, l]) => (
                        <button
                          key={k}
                          type="button"
                          data-ocid={`stats.satisfaction_period.${k}.button`}
                          onClick={() => setStatSatisfactionPeriod(k)}
                          className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                          style={{
                            background:
                              statSatisfactionPeriod === k
                                ? "rgba(245,158,11,0.25)"
                                : "rgba(255,255,255,0.05)",
                            color:
                              statSatisfactionPeriod === k
                                ? "#f59e0b"
                                : "#94a3b8",
                            border:
                              statSatisfactionPeriod === k
                                ? "1px solid rgba(245,158,11,0.4)"
                                : "1px solid transparent",
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      ["Son 7 Gün", avg(rated7), rated7.length],
                      ["Son 30 Gün", avg(rated30), rated30.length],
                      ["Tüm Zamanlar", avg(ratedAll), ratedAll.length],
                    ].map(([label, a, c]) => (
                      <div
                        key={String(label)}
                        className="p-3 rounded-xl text-center"
                        style={{
                          background: "rgba(245,158,11,0.08)",
                          border: "1px solid rgba(245,158,11,0.15)",
                        }}
                      >
                        <div
                          className="text-2xl font-bold"
                          style={{ color: "#f59e0b" }}
                        >
                          {a ?? "—"}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {label}
                        </div>
                        <div className="text-xs text-slate-500">
                          {c} değerlendirme
                        </div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-3">
                      Haftalık Trend (Son 8 Hafta)
                    </p>
                    <div className="flex items-end gap-1 h-20">
                      {weeklyTrend.map((w, i) => (
                        <div
                          key={w.label || i}
                          className="flex-1 flex flex-col items-center gap-1"
                        >
                          <div
                            className="w-full rounded-t transition-all"
                            style={{
                              height: w.avg ? `${(w.avg / 5) * 56}px` : "2px",
                              background: w.avg
                                ? `oklch(0.75 0.12 ${50 + (w.avg / 5) * 30})`
                                : "rgba(255,255,255,0.08)",
                              minHeight: "2px",
                            }}
                          />
                          <span className="text-slate-600 text-xs">
                            {w.avg ?? "—"}
                          </span>
                          <span className="text-slate-700 text-xs leading-none">
                            {w.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {catBreakdown.length > 0 && (
                    <div>
                      <p className="text-slate-400 text-xs mb-3">
                        Kategori Bazlı Ortalama
                      </p>
                      <div className="space-y-2">
                        {catBreakdown.map(({ cat, avg: a, count }) => (
                          <div key={cat} className="flex items-center gap-3">
                            <span className="text-white text-xs w-24 truncate">
                              {cat}
                            </span>
                            <div
                              className="flex-1 h-2 rounded-full"
                              style={{ background: "rgba(255,255,255,0.07)" }}
                            >
                              <div
                                className="h-2 rounded-full transition-all"
                                style={{
                                  width: `${a ? (Number(a) / 5) * 100 : 0}%`,
                                  background: "#f59e0b",
                                }}
                              />
                            </div>
                            <span className="text-amber-400 text-xs font-bold w-8 text-right">
                              {a ?? "—"}
                            </span>
                            <span className="text-slate-500 text-xs w-16">
                              ({count} oy)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Staff performance table */}
            {staffPerformance.length > 0 && (
              <div
                className="p-5 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <p className="text-slate-300 text-sm font-semibold mb-4">
                  Personel Performansı
                </p>
                <div
                  data-ocid="stats.performance_table"
                  className="overflow-auto rounded-xl border border-white/10"
                >
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        className="border-b border-white/10"
                        style={{ background: "rgba(255,255,255,0.04)" }}
                      >
                        <th className="p-3 text-left text-slate-400 font-medium">
                          Personel
                        </th>
                        <th className="p-3 text-left text-slate-400 font-medium">
                          Toplam Kayıt
                        </th>
                        <th className="p-3 text-left text-slate-400 font-medium">
                          Ort. Kalış (dk)
                        </th>
                        <th className="p-3 text-left text-slate-400 font-medium">
                          En Çok Kategori
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffPerformance
                        .sort((a, b) => b.total - a.total)
                        .map((s, i) => (
                          <tr
                            key={s.name}
                            data-ocid={`stats.performance_row.${i + 1}`}
                            className="border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
                            onClick={() => setSelectedStaffPerf(s)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ")
                                setSelectedStaffPerf(s);
                            }}
                          >
                            <td className="p-3 text-white font-medium">
                              {s.name}
                            </td>
                            <td className="p-3">
                              <span
                                className="px-2 py-0.5 rounded-full text-xs font-bold"
                                style={{
                                  background: "rgba(14,165,233,0.2)",
                                  color: "#0ea5e9",
                                }}
                              >
                                {s.total}
                              </span>
                            </td>
                            <td className="p-3 text-slate-300 text-sm">
                              {s.avgDurMins > 0 ? `${s.avgDurMins}dk` : "—"}
                            </td>
                            <td className="p-3">
                              {s.topCat !== "—" ? (
                                <span
                                  className="px-2 py-0.5 rounded text-xs text-white"
                                  style={{
                                    background: getCategoryColor(
                                      s.topCat,
                                      findCompanyById(session.companyId),
                                    ),
                                  }}
                                >
                                  {s.topCat}
                                </span>
                              ) : (
                                <span className="text-slate-500 text-xs">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* Peak Hour Analysis */}
            <div
              className="p-5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <p className="text-slate-300 text-sm font-semibold mb-4">
                📊 Yoğunluk Analizi — Saate Göre
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={hourData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    interval={3}
                  />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#1e293b",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    labelStyle={{ color: "white" }}
                    itemStyle={{ color: "#0ea5e9" }}
                    cursor={{ fill: "rgba(14,165,233,0.05)" }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#0ea5e9"
                    radius={[3, 3, 0, 0]}
                    data-ocid="stats.peak_hours.chart_point"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Peak Day Analysis */}
            <div
              className="p-5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <p className="text-slate-300 text-sm font-semibold mb-4">
                📊 Yoğunluk Analizi — Güne Göre
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dowData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#1e293b",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    labelStyle={{ color: "white" }}
                    itemStyle={{ color: "#a855f7" }}
                    cursor={{ fill: "rgba(168,85,247,0.05)" }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#a855f7"
                    radius={[3, 3, 0, 0]}
                    data-ocid="stats.peak_days.chart_point"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Repeat Visitors */}
            {repeatVisitorData.repeatUniqueCount > 0 && (
              <div
                className="p-5 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <p className="text-slate-300 text-sm font-semibold mb-4">
                  🔄 Tekrar Ziyaretçiler
                </p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div
                    className="p-4 rounded-xl text-center"
                    style={{
                      background: "rgba(14,165,233,0.12)",
                      border: "1.5px solid rgba(14,165,233,0.2)",
                    }}
                  >
                    <div className="text-3xl font-bold text-sky-400">
                      {repeatVisitorData.repeatUniqueCount}
                    </div>
                    <div className="text-slate-400 text-xs mt-1">
                      Tekrar Ziyaretçi
                    </div>
                  </div>
                  <div
                    className="p-4 rounded-xl text-center"
                    style={{
                      background: "rgba(168,85,247,0.12)",
                      border: "1.5px solid rgba(168,85,247,0.2)",
                    }}
                  >
                    <div className="text-3xl font-bold text-purple-400">
                      {visitors.length > 0
                        ? Math.round(
                            (repeatVisitorData.repeatTotal / visitors.length) *
                              100,
                          )
                        : 0}
                      %
                    </div>
                    <div className="text-slate-400 text-xs mt-1">
                      Tekrar Ziyaret Oranı
                    </div>
                  </div>
                </div>
                <p className="text-slate-400 text-xs font-medium mb-2">
                  EN SIK GELENLER
                </p>
                <div
                  data-ocid="stats.repeat_visitors.table"
                  className="overflow-auto rounded-xl border border-white/10"
                >
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        className="border-b border-white/10"
                        style={{ background: "rgba(255,255,255,0.04)" }}
                      >
                        <th className="p-3 text-left text-slate-400 font-medium">
                          Ad Soyad
                        </th>
                        <th className="p-3 text-left text-slate-400 font-medium">
                          TC/ID
                        </th>
                        <th className="p-3 text-left text-slate-400 font-medium">
                          Ziyaret
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {repeatVisitorData.top5.map((v, i) => (
                        <tr
                          key={v.idNumber}
                          data-ocid={`stats.repeat_visitors.row.${i + 1}`}
                          className="border-b border-white/5"
                        >
                          <td className="p-3 text-white font-medium">
                            {v.name}
                          </td>
                          <td className="p-3 text-slate-400 font-mono text-xs">
                            {v.idNumber}
                          </td>
                          <td className="p-3">
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-bold"
                              style={{
                                background: "rgba(14,165,233,0.2)",
                                color: "#0ea5e9",
                              }}
                            >
                              {v.count}x
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* Segmentasyon Analizi */}
            <div
              className="p-5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <h3 className="text-white font-bold text-base mb-4">
                🔍 Segmentasyon Analizi
              </h3>
              <SegmentationAnalysis visitors={visitors} />
            </div>
          </div>
        )}

        {/* BLACKLIST REPORT TAB */}
        {tab === "blacklistreport" &&
          (() => {
            const blKey = `safentry_blacklist_attempts_${session.companyId}`;
            const attempts: {
              id: string;
              checkedTC: string;
              checkedName: string;
              matchFound: boolean;
              matchedEntry?: string;
              checkedBy: string;
              checkedAt: number;
            }[] = JSON.parse(localStorage.getItem(blKey) ?? "[]");
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayAttempts = attempts.filter(
              (a) => a.checkedAt >= today.getTime(),
            );
            const blFilter = blReportFilter;
            const setBlFilter = setBlReportFilter;
            const filtered = attempts.filter((a) => {
              if (blFilter === "blocked") return a.matchFound;
              if (blFilter === "cleared") return !a.matchFound;
              return true;
            });
            return (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-white font-bold text-lg">
                    🚫 Kara Liste Eşleşme Raporu
                  </h2>
                </div>
                {/* Summary stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    {
                      label: "Bugün Toplam Kontrol",
                      value: todayAttempts.length,
                      color: "#0ea5e9",
                      bg: "rgba(14,165,233,0.1)",
                    },
                    {
                      label: "Bugün Engellenen",
                      value: todayAttempts.filter((a) => a.matchFound).length,
                      color: "#ef4444",
                      bg: "rgba(239,68,68,0.1)",
                    },
                    {
                      label: "Toplam Kayıt",
                      value: attempts.length,
                      color: "#f59e0b",
                      bg: "rgba(245,158,11,0.1)",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="p-4 rounded-2xl text-center"
                      style={{
                        background: s.bg,
                        border: `1.5px solid ${s.color}40`,
                      }}
                    >
                      <div
                        className="text-2xl font-bold"
                        style={{ color: s.color }}
                      >
                        {s.value}
                      </div>
                      <div className="text-slate-400 text-xs mt-1">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Filter */}
                <div className="flex gap-2">
                  {(["all", "blocked", "cleared"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      data-ocid={`blacklistreport.${f}.tab`}
                      onClick={() => setBlFilter(f)}
                      className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
                      style={
                        blFilter === f
                          ? { background: "#0ea5e9", color: "white" }
                          : {
                              background: "rgba(255,255,255,0.07)",
                              color: "#94a3b8",
                            }
                      }
                    >
                      {f === "all"
                        ? "Tümü"
                        : f === "blocked"
                          ? "🚫 Engellendi"
                          : "✅ Temiz"}
                    </button>
                  ))}
                </div>
                {filtered.length === 0 ? (
                  <div
                    data-ocid="blacklistreport.empty_state"
                    className="text-center py-12 text-slate-500"
                  >
                    <p className="text-3xl mb-2">🚫</p>
                    <p>Kayıt bulunamadı</p>
                  </div>
                ) : (
                  <div
                    className="overflow-x-auto rounded-2xl"
                    style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    <table
                      className="w-full text-sm"
                      data-ocid="blacklistreport.table"
                    >
                      <thead>
                        <tr style={{ background: "rgba(255,255,255,0.05)" }}>
                          {[
                            "Tarih/Saat",
                            "TC",
                            "İsim",
                            "Kontrol Eden",
                            "Sonuç",
                          ].map((h) => (
                            <th
                              key={h}
                              className="px-4 py-3 text-left text-slate-400 text-xs font-semibold"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((a, i) => (
                          <tr
                            key={a.id}
                            data-ocid={`blacklistreport.row.${i + 1}`}
                            className="border-t border-white/5 hover:bg-white/3 transition-colors"
                          >
                            <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                              {new Date(a.checkedAt).toLocaleString("tr-TR")}
                            </td>
                            <td className="px-4 py-3 text-slate-300 text-xs font-mono">
                              {a.checkedTC}
                            </td>
                            <td className="px-4 py-3 text-slate-300 text-xs">
                              {a.checkedName}
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-xs">
                              {a.checkedBy}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className="px-2 py-0.5 rounded-full text-xs font-bold"
                                style={
                                  a.matchFound
                                    ? {
                                        background: "rgba(239,68,68,0.15)",
                                        color: "#ef4444",
                                      }
                                    : {
                                        background: "rgba(34,197,94,0.12)",
                                        color: "#22c55e",
                                      }
                                }
                              >
                                {a.matchFound ? "🚫 Engellendi" : "✅ Temiz"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

        {/* EVACUATION TAB */}
        {tab === "evacuation" && (
          <div id="evacuation-print-section">
            {/* Print Header - only visible when printing */}
            <div className="hidden print:block mb-6 border-b border-gray-400 pb-4">
              <h1 className="text-2xl font-bold text-black">
                {company?.name ?? "Şirket"} — Tahliye Listesi
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                {new Date().toLocaleString("tr-TR")} &bull; Binada:{" "}
                {activeNow.length} kişi
              </p>
            </div>
            {/* Capacity Warning */}
            {capacityExceeded && (
              <div
                data-ocid="evacuation.capacity.error_state"
                className="mb-4 p-4 rounded-xl border border-red-500/50 bg-red-900/20 flex items-center gap-3"
              >
                <span className="text-2xl">🚨</span>
                <div>
                  <p className="text-red-400 font-semibold text-sm">
                    Kapasite Sınırına Ulaşıldı!
                  </p>
                  <p className="text-red-300/70 text-xs mt-0.5">
                    Binada {activeNow.length} ziyaretçi var — maksimum kapasite{" "}
                    {maxCap} kişi.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-white font-bold text-lg">
                {t(lang, "evacuation")} ({activeNow.length})
              </h2>
              <button
                type="button"
                data-ocid="evacuation.print_button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-white text-sm"
                style={{
                  background: "linear-gradient(135deg,#f59e0b,#ef4444)",
                }}
              >
                {t(lang, "printList")}
              </button>
            </div>
            {activeNow.length === 0 ? (
              <EmptyState
                data-ocid="evacuation.empty_state"
                icon={Users}
                title="Binada kimse yok"
                description="Şu anda aktif ziyaretçi bulunmuyor."
              />
            ) : (
              <div className="space-y-2">
                {activeNow.map((v, i) => (
                  <div
                    key={v.visitorId}
                    data-ocid={`evacuation.item.${i + 1}`}
                    className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5"
                  >
                    <div>
                      <div className="text-white font-medium">
                        {i + 1}. {v.name}
                      </div>
                      <div className="text-slate-400 text-xs">
                        {v.phone} &bull; {formatDateTime(v.arrivalTime)}
                      </div>
                      {(v.department || v.floor) && (
                        <div className="flex gap-1 mt-1">
                          {v.department && (
                            <span
                              className="px-1.5 py-0.5 rounded text-xs text-white"
                              style={{ background: "rgba(14,165,233,0.2)" }}
                            >
                              {v.department}
                            </span>
                          )}
                          {v.floor && (
                            <span
                              className="px-1.5 py-0.5 rounded text-xs text-white"
                              style={{ background: "rgba(168,85,247,0.2)" }}
                            >
                              {v.floor}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{
                        background: LABEL_COLORS[v.label],
                        color: "white",
                      }}
                    >
                      {v.label.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* APPROVED VISITORS TAB */}
        {tab === "approved" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-white font-bold text-lg">
                ✅ Onaylı Ziyaretçiler
              </h2>
              <span className="text-slate-400 text-sm">
                {approvedVisitors.length} kayıt
              </span>
            </div>
            {/* Add new */}
            <div
              className="p-5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <h3 className="text-white font-semibold mb-4 text-sm">
                Yeni Onaylı Ziyaretçi Ekle
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-slate-400 text-xs mb-1">Ad Soyad *</p>
                  <input
                    data-ocid="approved.name.input"
                    value={newApprovedName}
                    onChange={(e) => setNewApprovedName(e.target.value)}
                    placeholder="Ad Soyad"
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                  />
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">TC Kimlik No *</p>
                  <input
                    data-ocid="approved.idnumber.input"
                    value={newApprovedId}
                    onChange={(e) => setNewApprovedId(e.target.value)}
                    placeholder="11 hane"
                    maxLength={11}
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-mono focus:outline-none focus:border-[#0ea5e9]"
                  />
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Telefon</p>
                  <input
                    data-ocid="approved.phone.input"
                    value={newApprovedPhone}
                    onChange={(e) => setNewApprovedPhone(e.target.value)}
                    placeholder="0500 000 0000"
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                  />
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Ziyaret Nedeni</p>
                  <input
                    data-ocid="approved.reason.input"
                    value={newApprovedReason}
                    onChange={(e) => setNewApprovedReason(e.target.value)}
                    placeholder="Toplantı, teslimat..."
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                  />
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 text-xs mb-1">Kategori</p>
                  <select
                    data-ocid="approved.category.select"
                    value={newApprovedCategory}
                    onChange={(e) => setNewApprovedCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#1e293b] border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                  >
                    <option value="">Seçiniz</option>
                    {(company?.customCategories?.length
                      ? company.customCategories
                      : [
                          "Misafir",
                          "Müteahhit",
                          "Teslimat",
                          "Mülakat",
                          "Tedarikçi",
                        ]
                    ).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 text-xs mb-1">
                    Rozet Geçerliliği
                  </p>
                  <select
                    data-ocid="approved.badge_validity.select"
                    value={newApprovedBadgeDays}
                    onChange={(e) =>
                      setNewApprovedBadgeDays(Number(e.target.value))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#1e293b] border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                  >
                    <option value={0} className="bg-[#0f1729]">
                      Yok
                    </option>
                    <option value={7} className="bg-[#0f1729]">
                      7 Gün
                    </option>
                    <option value={14} className="bg-[#0f1729]">
                      14 Gün
                    </option>
                    <option value={30} className="bg-[#0f1729]">
                      30 Gün
                    </option>
                    <option value={60} className="bg-[#0f1729]">
                      60 Gün
                    </option>
                  </select>
                </div>
              </div>
              <button
                type="button"
                data-ocid="approved.add.button"
                onClick={() => {
                  if (!newApprovedName.trim() || !newApprovedId.trim()) return;
                  const av: ApprovedVisitor = {
                    id: generateId(),
                    companyId: session.companyId,
                    name: newApprovedName.trim(),
                    idNumber: newApprovedId.trim(),
                    phone: newApprovedPhone || undefined,
                    visitReason: newApprovedReason || undefined,
                    category: newApprovedCategory || undefined,
                    badgeValidDays:
                      newApprovedBadgeDays > 0
                        ? newApprovedBadgeDays
                        : undefined,
                    badgeIssuedAt:
                      newApprovedBadgeDays > 0 ? Date.now() : undefined,
                  };
                  saveApprovedVisitor(av);
                  setApprovedVisitors(getApprovedVisitors(session.companyId));
                  setNewApprovedName("");
                  setNewApprovedId("");
                  setNewApprovedPhone("");
                  setNewApprovedReason("");
                  setNewApprovedCategory("");
                  setNewApprovedBadgeDays(0);
                  toast.success("Onaylı ziyaretçi eklendi");
                }}
                className="mt-4 w-full py-2 rounded-xl text-white font-semibold text-sm"
                style={{
                  background: "linear-gradient(135deg,#22c55e,#16a34a)",
                }}
              >
                ✅ Ekle
              </button>
            </div>
            {/* List */}
            {approvedVisitors.length === 0 ? (
              <div
                data-ocid="approved.empty_state"
                className="text-center py-12 text-slate-500"
              >
                Henüz onaylı ziyaretçi yok
              </div>
            ) : (
              <div className="space-y-2">
                {approvedVisitors.map((av, i) => (
                  <div
                    key={av.id}
                    data-ocid={`approved.item.${i + 1}`}
                    className="flex items-center justify-between p-4 rounded-xl"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div>
                      <div className="text-white font-semibold text-sm">
                        {av.name}
                      </div>
                      <div className="text-slate-400 text-xs font-mono">
                        {av.idNumber}
                      </div>
                      {av.phone && (
                        <div className="text-slate-500 text-xs">{av.phone}</div>
                      )}
                      {av.category && (
                        <span
                          className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs text-white"
                          style={{ background: "rgba(14,165,233,0.25)" }}
                        >
                          {av.category}
                        </span>
                      )}
                      {(() => {
                        if (!av.badgeValidDays || !av.badgeIssuedAt)
                          return (
                            <span
                              className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs"
                              style={{
                                background: "rgba(100,116,139,0.2)",
                                color: "#94a3b8",
                              }}
                            >
                              Rozet Yok
                            </span>
                          );
                        const expiresAt =
                          av.badgeIssuedAt + av.badgeValidDays * 86400000;
                        const remaining = Math.ceil(
                          (expiresAt - Date.now()) / 86400000,
                        );
                        if (remaining > 0)
                          return (
                            <span
                              className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs"
                              style={{
                                background: "rgba(34,197,94,0.15)",
                                color: "#22c55e",
                              }}
                            >
                              ✓ Aktif ({remaining} gün kaldı)
                            </span>
                          );
                        return (
                          <span
                            className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs"
                            style={{
                              background: "rgba(239,68,68,0.15)",
                              color: "#f87171",
                            }}
                          >
                            ⚠ Süresi Dolmuş
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {(() => {
                        const pins = getVisitorPins(session.companyId);
                        const currentPin = pins[av.idNumber];
                        return currentPin ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="text-teal-400 font-mono text-sm tracking-widest px-2 py-1 rounded-lg"
                              style={{
                                background: "rgba(20,184,166,0.1)",
                                border: "1px solid rgba(20,184,166,0.3)",
                              }}
                            >
                              PIN: {currentPin}
                            </span>
                            <button
                              type="button"
                              data-ocid={`approved.pin_remove.button.${i + 1}`}
                              onClick={() => {
                                removeVisitorPin(
                                  session.companyId,
                                  av.idNumber,
                                );
                                reload();
                                toast.success("PIN kaldırıldı");
                              }}
                              className="text-slate-400 hover:text-red-400 text-xs px-2 py-1 rounded-lg"
                              style={{ background: "rgba(255,255,255,0.05)" }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            data-ocid={`approved.pin_assign.button.${i + 1}`}
                            onClick={() => {
                              const pin = Math.floor(
                                1000 + Math.random() * 9000,
                              ).toString();
                              saveVisitorPin(
                                session.companyId,
                                av.idNumber,
                                pin,
                              );
                              reload();
                              toast.success(`PIN atandı: ${pin}`);
                            }}
                            className="text-teal-400 hover:text-teal-300 px-3 py-1 rounded-lg text-xs"
                            style={{
                              background: "rgba(20,184,166,0.1)",
                              border: "1px solid rgba(20,184,166,0.2)",
                            }}
                          >
                            🔑 PIN Ata
                          </button>
                        );
                      })()}
                      <button
                        type="button"
                        data-ocid={`approved.delete_button.${i + 1}`}
                        onClick={() => {
                          deleteApprovedVisitor(session.companyId, av.id);
                          setApprovedVisitors(
                            getApprovedVisitors(session.companyId),
                          );
                          toast.success("Silindi");
                        }}
                        className="text-red-400 hover:text-red-300 px-3 py-1 rounded-lg text-xs"
                        style={{ background: "rgba(239,68,68,0.1)" }}
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ARCHIVE TAB */}
        {tab === "archive" &&
          (() => {
            const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
            const archiveVisitors = visitors.filter(
              (v) => v.arrivalTime < cutoff,
            );
            return (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-white font-bold text-lg">
                    🗄️ Arşiv ve Veri Temizleme
                  </h2>
                  {archiveVisitors.length > 0 && (
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        background: "rgba(239,68,68,0.15)",
                        color: "#f87171",
                      }}
                    >
                      {archiveVisitors.length} kayıt 90+ gün eski
                    </span>
                  )}
                </div>
                <div
                  className="p-4 rounded-xl text-sm"
                  style={{
                    background: "rgba(245,158,11,0.07)",
                    border: "1px solid rgba(245,158,11,0.2)",
                  }}
                >
                  <p className="text-amber-300">
                    ⚠️ 90 günden eski ziyaretçi kayıtları KVKK/GDPR kapsamında
                    silinmelidir. Silinen kayıtlar geri alınamaz.
                  </p>
                </div>
                {archiveVisitors.length === 0 ? (
                  <div
                    data-ocid="archive.empty_state"
                    className="text-center py-16 text-slate-500"
                  >
                    <div className="text-4xl mb-3">🗄️</div>
                    <p>90 günden eski kayıt bulunamadı</p>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      data-ocid="archive.delete_all.button"
                      onClick={() => {
                        const remaining = visitors.filter(
                          (v) => v.arrivalTime >= cutoff,
                        );
                        localStorage.setItem(
                          `safentry_visitors_${session.companyId}`,
                          JSON.stringify(remaining),
                        );
                        setVisitors(remaining);
                        toast.success(
                          `${archiveVisitors.length} kayıt silindi`,
                        );
                      }}
                      className="px-5 py-2 rounded-xl text-sm font-semibold text-white"
                      style={{
                        background: "linear-gradient(135deg,#ef4444,#dc2626)",
                      }}
                    >
                      🗑️ Tümünü Sil ({archiveVisitors.length})
                    </button>
                    <div
                      data-ocid="archive.table"
                      className="overflow-auto rounded-2xl border border-white/10"
                    >
                      <table className="w-full text-sm">
                        <thead>
                          <tr
                            className="border-b border-white/10"
                            style={{ background: "rgba(255,255,255,0.04)" }}
                          >
                            <th className="p-3 text-left text-slate-400 font-medium">
                              Ad Soyad
                            </th>
                            <th className="p-3 text-left text-slate-400 font-medium">
                              TC (Gizli)
                            </th>
                            <th className="p-3 text-left text-slate-400 font-medium">
                              Geliş Tarihi
                            </th>
                            <th className="p-3 text-left text-slate-400 font-medium">
                              Kategori
                            </th>
                            <th className="p-3 text-left text-slate-400 font-medium">
                              İşlem
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {archiveVisitors.map((v, i) => (
                            <tr
                              key={v.visitorId}
                              data-ocid={`archive.row.${i + 1}`}
                              className="border-b border-white/5 hover:bg-white/4 transition-colors"
                            >
                              <td className="p-3 text-white">{v.name}</td>
                              <td className="p-3 text-slate-400 font-mono text-xs">
                                {v.idNumber.slice(0, 3)}****
                                {v.idNumber.slice(-2)}
                              </td>
                              <td className="p-3 text-slate-400 text-xs">
                                {new Date(v.arrivalTime).toLocaleDateString(
                                  "tr-TR",
                                )}
                              </td>
                              <td className="p-3">
                                {v.category ? (
                                  <span
                                    className="px-2 py-0.5 rounded-full text-xs text-white"
                                    style={{
                                      background: "rgba(14,165,233,0.2)",
                                    }}
                                  >
                                    {v.category}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">—</span>
                                )}
                              </td>
                              <td className="p-3">
                                <button
                                  type="button"
                                  data-ocid={`archive.delete_button.${i + 1}`}
                                  onClick={() => {
                                    const updated = visitors.filter(
                                      (x) => x.visitorId !== v.visitorId,
                                    );
                                    localStorage.setItem(
                                      `safentry_visitors_${session.companyId}`,
                                      JSON.stringify(updated),
                                    );
                                    setVisitors(updated);
                                    toast.success("Kayıt silindi");
                                  }}
                                  className="text-red-400 hover:text-red-300 px-2 py-1 rounded-lg text-xs"
                                  style={{ background: "rgba(239,68,68,0.1)" }}
                                >
                                  Sil
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

        {/* ANNOUNCEMENTS TAB */}
        {tab === "announcements" && (
          <div className="space-y-6">
            <div className="flex gap-3">
              <input
                data-ocid="announcements.message.input"
                value={announcementMsg}
                onChange={(e) => setAnnouncementMsg(e.target.value)}
                placeholder={t(lang, "message")}
                className="flex-1 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9]"
              />
              <button
                type="button"
                data-ocid="announcements.post.button"
                onClick={postAnnouncement}
                className="px-4 py-2 rounded-xl text-white text-sm font-medium"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                }}
              >
                {t(lang, "postAnnouncement")}
              </button>
            </div>
            {announcements.length === 0 ? (
              <EmptyState
                data-ocid="announcements.empty_state"
                icon={Bell}
                title="Duyuru bulunamadı"
                description="Henüz duyuru oluşturulmamış."
              />
            ) : (
              <div className="space-y-3">
                {announcements.map((a, i) => (
                  <div
                    key={a.id}
                    data-ocid={`announcements.item.${i + 1}`}
                    className="p-4 rounded-xl border border-white/10 bg-white/5"
                  >
                    <div className="text-white">{a.message}</div>
                    <div className="text-slate-500 text-xs mt-2">
                      {formatDateTime(a.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AUDIT LOG TAB */}
        {tab === "auditlog" && (
          <div>
            <div className="flex flex-wrap gap-3 mb-5 items-center">
              <select
                data-ocid="auditlog.action.select"
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#0f1729] border border-white/20 text-white text-sm focus:outline-none"
              >
                {ACTION_OPTIONS.map((o) => (
                  <option
                    key={o.value}
                    value={o.value}
                    className="bg-[#0f1729]"
                  >
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                data-ocid="auditlog.date.input"
                type="date"
                value={auditDateFilter}
                onChange={(e) => setAuditDateFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
              />
              {(auditActionFilter || auditDateFilter) && (
                <button
                  type="button"
                  data-ocid="auditlog.clear.button"
                  onClick={() => {
                    setAuditActionFilter("");
                    setAuditDateFilter("");
                  }}
                  className="px-3 py-2 rounded-xl text-slate-400 text-sm hover:text-white"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  Temizle
                </button>
              )}
              <span className="text-slate-500 text-sm ml-auto">
                {filteredAuditLogs.length} kayıt
              </span>
            </div>

            {filteredAuditLogs.length === 0 ? (
              <EmptyState
                data-ocid="auditlog.empty_state"
                icon={BookOpen}
                title="Denetim logu boş"
                description="Henüz kayıtlı işlem yok."
              />
            ) : (
              <div className="space-y-2">
                {filteredAuditLogs.map((log, i) => (
                  <div
                    key={log.id}
                    data-ocid={`auditlog.item.${i + 1}`}
                    className="flex items-start gap-4 p-4 rounded-xl border border-white/8 hover:border-white/15 transition-colors"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-2 shrink-0"
                      style={{ background: actionColor(log.action) }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: `${actionColor(log.action)}22`,
                            color: actionColor(log.action),
                            border: `1px solid ${actionColor(log.action)}44`,
                          }}
                        >
                          {actionLabel(log.action)}
                        </span>
                        <span className="text-slate-400 text-xs">
                          {log.actorName}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm mt-1">
                        {log.details}
                      </p>
                    </div>
                    <div className="text-slate-600 text-xs shrink-0 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString("tr-TR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ALERT HISTORY TAB */}
        {tab === "alerthistory" && (
          <div>
            <div className="mb-6">
              <h2 className="text-white font-bold text-xl">Uyarı Geçmişi</h2>
              <p className="text-slate-400 text-sm">
                Tetiklenen güvenlik uyarıları
              </p>
            </div>
            {alertHistory.length === 0 ? (
              <EmptyState
                data-ocid="alerthistory.empty_state"
                icon={AlertTriangle}
                title="Uyarı geçmişi boş"
                description="Henüz tetiklenmiş uyarı yok."
              />
            ) : (
              <div
                data-ocid="alerthistory.table"
                className="overflow-auto rounded-2xl border border-white/10"
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className="border-b border-white/10"
                      style={{ background: "rgba(255,255,255,0.04)" }}
                    >
                      <th className="p-3 text-left text-slate-400 font-medium">
                        Tarih/Saat
                      </th>
                      <th className="p-3 text-left text-slate-400 font-medium">
                        Tür
                      </th>
                      <th className="p-3 text-left text-slate-400 font-medium">
                        Detay
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {alertHistory.map((entry, i) => {
                      const typeColors: Record<
                        string,
                        { bg: string; text: string; label: string }
                      > = {
                        blacklist: {
                          bg: "rgba(239,68,68,0.15)",
                          text: "#ef4444",
                          label: "🚫 Kara Liste",
                        },
                        capacity: {
                          bg: "rgba(245,158,11,0.15)",
                          text: "#f59e0b",
                          label: "⚠️ Kapasite",
                        },
                        afterhours: {
                          bg: "rgba(168,85,247,0.15)",
                          text: "#a855f7",
                          label: "🌙 Mesai Dışı",
                        },
                        prescreening: {
                          bg: "rgba(239,68,68,0.15)",
                          text: "#ef4444",
                          label: "🛡️ Ön Eleme",
                        },
                      };
                      const tc = typeColors[entry.type] ?? {
                        bg: "rgba(255,255,255,0.1)",
                        text: "#94a3b8",
                        label: entry.type,
                      };
                      return (
                        <tr
                          key={entry.id}
                          data-ocid={`alerthistory.row.${i + 1}`}
                          className="border-b border-white/5 hover:bg-white/3 transition-colors"
                        >
                          <td className="p-3 text-slate-400 text-xs whitespace-nowrap">
                            {new Date(entry.timestamp).toLocaleString("tr-TR")}
                          </td>
                          <td className="p-3">
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                              style={{ background: tc.bg, color: tc.text }}
                            >
                              {tc.label}
                            </span>
                          </td>
                          <td className="p-3 text-slate-300 text-sm">
                            {entry.detail}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* EQUIPMENT TAB */}
        {tab === "equipment" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-white font-bold text-xl">Ekipmanlar</h2>
                <p className="text-slate-400 text-sm">
                  Şu an teslim edilmiş ekipmanlar
                </p>
              </div>
            </div>
            {visitors.filter((v) => v.status === "active" && v.equipment)
              .length === 0 ? (
              <EmptyState
                data-ocid="equipment.empty_state"
                icon={Settings}
                title="Ekipman bulunamadı"
                description="Şu an teslim edilmiş ekipman yok."
              />
            ) : (
              <div className="overflow-auto rounded-2xl border border-white/10">
                <table className="w-full text-sm" data-ocid="equipment.table">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="p-3 text-left text-slate-400 font-medium">
                        Ziyaretçi
                      </th>
                      <th className="p-3 text-left text-slate-400 font-medium">
                        Ekipman
                      </th>
                      <th className="p-3 text-left text-slate-400 font-medium">
                        ID
                      </th>
                      <th className="p-3 text-left text-slate-400 font-medium">
                        Saat
                      </th>
                      <th className="p-3 text-left text-slate-400 font-medium">
                        Departman / Kat
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitors
                      .filter((v) => v.status === "active" && v.equipment)
                      .map((v, i) => (
                        <tr
                          key={v.visitorId}
                          data-ocid={`equipment.row.${i + 1}`}
                          className="border-b border-white/5 hover:bg-white/3 transition-colors"
                        >
                          <td className="p-3">
                            <div className="text-white font-medium">
                              {v.name}
                            </div>
                            <div className="text-slate-500 text-xs">
                              {v.idNumber}
                            </div>
                          </td>
                          <td className="p-3">
                            <span
                              className="px-2 py-1 rounded-full text-xs font-semibold"
                              style={{
                                background: "rgba(245,158,11,0.2)",
                                color: "#f59e0b",
                                border: "1px solid rgba(245,158,11,0.3)",
                              }}
                            >
                              📦 {v.equipment!.type}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-300 text-sm">
                            #{v.equipment!.id}
                          </td>
                          <td className="p-3 text-slate-400 text-xs">
                            {new Date(
                              v.equipment!.assignedAt,
                            ).toLocaleTimeString("tr-TR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1 flex-wrap">
                              {v.department && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-xs text-white"
                                  style={{ background: "rgba(14,165,233,0.2)" }}
                                >
                                  {v.department}
                                </span>
                              )}
                              {v.floor && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-xs text-white"
                                  style={{ background: "rgba(168,85,247,0.2)" }}
                                >
                                  {v.floor}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* COMPLIANCE TAB */}
        {tab === "compliance" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold text-lg">
                🔒 KVKK / GDPR Uyum Raporu
              </h2>
              <button
                type="button"
                data-ocid="compliance.print.button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                }}
              >
                🖨️ Yazdır / PDF
              </button>
            </div>
            <div id="compliance-report" className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  {
                    label: "Toplam Kayıt",
                    value: visitors.length,
                    color: "#0ea5e9",
                  },
                  {
                    label: "Aktif Kayıt",
                    value: visitors.filter((v) => v.status === "active").length,
                    color: "#22c55e",
                  },
                  {
                    label: "Saklama Süresi",
                    value: `${company.dataRetentionDays} gün`,
                    color: "#f59e0b",
                  },
                  {
                    label: "Sonraki Temizlik",
                    value:
                      visitors.length > 0 && visitors.some((v) => v.createdAt)
                        ? new Date(
                            Math.min(...visitors.map((v) => v.createdAt)) +
                              company.dataRetentionDays * 86400000,
                          ).toLocaleDateString("tr-TR")
                        : "—",
                    color: "#a855f7",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="p-4 rounded-2xl flex flex-col gap-1"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${s.color}30`,
                    }}
                  >
                    <span
                      className="text-2xl font-bold"
                      style={{ color: s.color }}
                    >
                      {s.value}
                    </span>
                    <span className="text-slate-400 text-sm">{s.label}</span>
                  </div>
                ))}
              </div>

              <div
                className="p-5 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <p className="text-slate-300 font-semibold mb-3">
                  📋 Toplanan Kişisel Veri Kategorileri
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Ad Soyad",
                    "TC Kimlik No",
                    "Telefon",
                    "Dijital İmza",
                    "Ziyaret Nedeni",
                    "Ön Eleme Cevapları",
                  ].map((d) => (
                    <span
                      key={d}
                      className="px-3 py-1 rounded-full text-xs text-white"
                      style={{
                        background: "rgba(14,165,233,0.2)",
                        border: "1px solid rgba(14,165,233,0.3)",
                      }}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              <div
                className="p-5 rounded-2xl"
                style={{
                  background: "rgba(245,158,11,0.05)",
                  border: "1px solid rgba(245,158,11,0.2)",
                }}
              >
                <p className="text-amber-400 font-semibold mb-3">
                  ⚖️ KVKK Uyum Beyanı
                </p>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Bu sistem, 6698 sayılı Kişisel Verilerin Korunması Kanunu
                  (KVKK) ve AB Genel Veri Koruma Yönetmeliği (GDPR) kapsamında
                  ziyaretçi verilerini işlemektedir. Toplanan kişisel veriler;
                  ziyaret kaydı, güvenlik takibi ve yasal yükümlülüklerin yerine
                  getirilmesi amacıyla kullanılmaktadır. Veriler,{" "}
                  {company.dataRetentionDays} gün sonra otomatik olarak silinmek
                  üzere planlanmaktadır. Ziyaretçilerden açık rıza alınmakta;
                  NDA/KVKK onayı dijital imza ile kayıt altına alınmaktadır.
                </p>
              </div>

              <div
                className="p-5 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <p className="text-slate-300 font-semibold mb-3">
                  📅 En Eski Kayıt
                </p>
                <p className="text-slate-400 text-sm">
                  {visitors.length > 0
                    ? new Date(
                        Math.min(...visitors.map((v) => v.createdAt)),
                      ).toLocaleDateString("tr-TR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Henüz kayıt yok"}
                </p>
              </div>
            </div>

            {/* Data Export Section */}
            <div
              className="p-5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <p className="text-slate-300 font-semibold mb-4">
                📥 Veri Dışa Aktarım
              </p>
              <p className="text-slate-400 text-xs mb-4">
                GDPR/KVKK veri silme talepleri veya yedekleme için tüm şirket
                verisini indirin.
              </p>
              <div className="flex gap-3 flex-wrap">
                <button
                  type="button"
                  data-ocid="compliance.json_export.button"
                  onClick={() => {
                    const data = {
                      exportDate: new Date().toISOString(),
                      company,
                      visitors: getVisitors(session.companyId),
                      staff: getStaffByCompany(session.companyId),
                      blacklist: getBlacklist(session.companyId),
                      appointments: getAppointments(session.companyId),
                      approvedVisitors: getApprovedVisitors(session.companyId),
                    };
                    const blob = new Blob([JSON.stringify(data, null, 2)], {
                      type: "application/json",
                    });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `safentry-export-${session.companyId}-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                    toast.success("JSON dosyası indirildi");
                  }}
                  className="px-4 py-2 rounded-xl text-white text-sm font-medium"
                  style={{
                    background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                  }}
                >
                  📄 JSON Olarak İndir
                </button>
                <button
                  type="button"
                  data-ocid="compliance.csv_export.button"
                  onClick={() => {
                    const vs = getVisitors(session.companyId);
                    const headers = [
                      "ID",
                      "Ad Soyad",
                      "TC",
                      "Telefon",
                      "Geliş",
                      "Çıkış",
                      "Durum",
                      "Neden",
                      "Kategori",
                      "Etiket",
                    ];
                    const rows = vs.map((v) =>
                      [
                        v.visitorId,
                        v.name,
                        v.idNumber,
                        v.phone,
                        new Date(v.arrivalTime).toLocaleString("tr-TR"),
                        v.departureTime
                          ? new Date(v.departureTime).toLocaleString("tr-TR")
                          : "",
                        v.status,
                        v.visitReason,
                        v.category ?? "",
                        v.label,
                      ]
                        .map((x) => `"${String(x).replace(/"/g, '""')}"`)
                        .join(","),
                    );
                    const csv = [headers.join(","), ...rows].join("\n");
                    const blob = new Blob([`﻿${csv}`], {
                      type: "text/csv;charset=utf-8;",
                    });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `safentry-visitors-${session.companyId}-${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                    toast.success("CSV dosyası indirildi");
                  }}
                  className="px-4 py-2 rounded-xl text-white text-sm font-medium"
                  style={{
                    background: "linear-gradient(135deg,#22c55e,#16a34a)",
                  }}
                >
                  📊 Ziyaretçiler CSV
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {tab === "departments" && (
          <div data-ocid="departments.section">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold text-lg">
                🏢 Departman Yönetimi
              </h2>
            </div>
            {/* Add/Edit Department Form */}
            <div
              className="p-5 rounded-2xl mb-6"
              style={{
                background: "rgba(14,165,233,0.07)",
                border: "1.5px solid rgba(14,165,233,0.2)",
              }}
            >
              <h3 className="text-[#0ea5e9] font-semibold text-sm mb-4">
                {editDept ? "✏️ Departman Düzenle" : "➕ Yeni Departman Ekle"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <input
                  data-ocid="departments.name.input"
                  value={editDept ? editDept.name : newDeptName}
                  onChange={(e) =>
                    editDept
                      ? setEditDept({ ...editDept, name: e.target.value })
                      : setNewDeptName(e.target.value)
                  }
                  placeholder="Departman adı"
                  className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                />
                <input
                  data-ocid="departments.floor.input"
                  value={editDept ? editDept.floor : newDeptFloor}
                  onChange={(e) =>
                    editDept
                      ? setEditDept({ ...editDept, floor: e.target.value })
                      : setNewDeptFloor(e.target.value)
                  }
                  placeholder="Kat (örn. 3. Kat)"
                  className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                />
                <input
                  data-ocid="departments.capacity.input"
                  type="number"
                  value={editDept ? editDept.capacity : newDeptCapacity}
                  onChange={(e) =>
                    editDept
                      ? setEditDept({
                          ...editDept,
                          capacity: Number(e.target.value),
                        })
                      : setNewDeptCapacity(e.target.value)
                  }
                  placeholder="Kapasite"
                  className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  data-ocid="departments.save.button"
                  onClick={() => {
                    if (editDept) {
                      saveDepartment(editDept);
                      setEditDept(null);
                    } else {
                      if (!newDeptName.trim()) return;
                      saveDepartment({
                        id: generateId(),
                        companyId: session.companyId,
                        name: newDeptName.trim(),
                        floor: newDeptFloor.trim() || "Zemin Kat",
                        capacity: Number(newDeptCapacity) || 10,
                      });
                      setNewDeptName("");
                      setNewDeptFloor("");
                      setNewDeptCapacity("10");
                    }
                    reload();
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{
                    background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                  }}
                >
                  {editDept ? "Kaydet" : "Ekle"}
                </button>
                {editDept && (
                  <button
                    type="button"
                    data-ocid="departments.cancel.button"
                    onClick={() => setEditDept(null)}
                    className="px-4 py-2 rounded-xl text-sm text-slate-400 border border-white/15 hover:bg-white/5"
                  >
                    İptal
                  </button>
                )}
              </div>
            </div>
            {/* Department List */}
            {departments.length === 0 ? (
              <div
                data-ocid="departments.empty_state"
                className="text-center py-12 text-slate-500"
              >
                <div className="text-4xl mb-2">🏢</div>
                <p>Henüz departman eklenmedi.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {departments.map((d, i) => (
                  <div
                    key={d.id}
                    data-ocid={`departments.item.${i + 1}`}
                    className="flex items-center justify-between p-4 rounded-2xl"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div>
                      <p className="text-white font-semibold">{d.name}</p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        📍 {d.floor} &bull; 👥 Kapasite: {d.capacity}
                        {d.dailyQuota
                          ? ` • 📋 Günlük Kota: ${getDeptTodayVisitorCount(session.companyId, d.name)}/${d.dailyQuota}`
                          : ""}
                      </p>
                      {(() => {
                        const occ = visitors.filter(
                          (v) =>
                            v.status === "active" &&
                            (v.department === d.name || v.floor === d.floor),
                        ).length;
                        const pct =
                          d.capacity > 0
                            ? Math.min((occ / d.capacity) * 100, 100)
                            : 0;
                        const barColor =
                          pct >= 90
                            ? "#ef4444"
                            : pct >= 70
                              ? "#f59e0b"
                              : "#22c55e";
                        return (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span style={{ color: barColor }}>
                                {occ} / {d.capacity} kişi
                              </span>
                              <span className="text-slate-500">
                                {Math.round(pct)}%
                              </span>
                            </div>
                            <div
                              className="h-1.5 rounded-full overflow-hidden"
                              style={{ background: "rgba(255,255,255,0.08)" }}
                            >
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${pct}%`,
                                  background: barColor,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        data-ocid={`departments.edit_button.${i + 1}`}
                        onClick={() => setEditDept(d)}
                        className="px-3 py-1.5 rounded-lg text-xs text-[#0ea5e9] border border-[#0ea5e9]/30 hover:bg-[#0ea5e9]/10"
                      >
                        Düzenle
                      </button>
                      <button
                        type="button"
                        data-ocid={`departments.delete_button.${i + 1}`}
                        onClick={() => {
                          deleteDepartment(session.companyId, d.id);
                          reload();
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs text-red-400 border border-red-500/30 hover:bg-red-900/20"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "permits" && (
          <div data-ocid="permits.section">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold text-lg">
                📋 Müteahhit İş İzni Takibi
              </h2>
              <button
                type="button"
                data-ocid="permits.open_modal_button"
                onClick={() => {
                  setShowPermitForm(true);
                  setEditPermit(null);
                  setPermitForm({
                    contractorName: "",
                    idNumber: "",
                    permitNumber: "",
                    issueDate: "",
                    expiryDate: "",
                    insuranceInfo: "",
                  });
                }}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg,#f97316,#ea580c)",
                }}
              >
                ➕ Yeni İzin Ekle
              </button>
            </div>
            {/* Permit Form */}
            {(showPermitForm || editPermit) && (
              <div
                data-ocid="permits.dialog"
                className="p-5 rounded-2xl mb-6"
                style={{
                  background: "rgba(249,115,22,0.07)",
                  border: "1.5px solid rgba(249,115,22,0.2)",
                }}
              >
                <h3 className="text-orange-400 font-semibold text-sm mb-4">
                  {editPermit ? "✏️ İzin Düzenle" : "➕ Yeni İş İzni"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <input
                    data-ocid="permits.contractor_name.input"
                    value={permitForm.contractorName}
                    onChange={(e) =>
                      setPermitForm((f) => ({
                        ...f,
                        contractorName: e.target.value,
                      }))
                    }
                    placeholder="Müteahhit adı soyadı"
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-orange-400"
                  />
                  <input
                    data-ocid="permits.id_number.input"
                    value={permitForm.idNumber}
                    onChange={(e) =>
                      setPermitForm((f) => ({ ...f, idNumber: e.target.value }))
                    }
                    placeholder="TC Kimlik No"
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-orange-400"
                  />
                  <input
                    data-ocid="permits.permit_number.input"
                    value={permitForm.permitNumber}
                    onChange={(e) =>
                      setPermitForm((f) => ({
                        ...f,
                        permitNumber: e.target.value,
                      }))
                    }
                    placeholder="İzin numarası"
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-orange-400"
                  />
                  <input
                    data-ocid="permits.insurance_info.input"
                    value={permitForm.insuranceInfo}
                    onChange={(e) =>
                      setPermitForm((f) => ({
                        ...f,
                        insuranceInfo: e.target.value,
                      }))
                    }
                    placeholder="Sigorta bilgisi"
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-orange-400"
                  />
                  <div>
                    <span className="text-xs text-slate-400 mb-1 block">
                      Düzenleme Tarihi
                    </span>
                    <input
                      type="date"
                      data-ocid="permits.issue_date.input"
                      value={permitForm.issueDate}
                      onChange={(e) =>
                        setPermitForm((f) => ({
                          ...f,
                          issueDate: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-orange-400"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 mb-1 block">
                      Geçerlilik Tarihi
                    </span>
                    <input
                      type="date"
                      data-ocid="permits.expiry_date.input"
                      value={permitForm.expiryDate}
                      onChange={(e) =>
                        setPermitForm((f) => ({
                          ...f,
                          expiryDate: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-orange-400"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    data-ocid="permits.save.button"
                    onClick={() => {
                      const p: ContractorPermit = {
                        ...(editPermit ?? {
                          id: generateId(),
                          companyId: session.companyId,
                          createdAt: Date.now(),
                        }),
                        ...permitForm,
                      };
                      savePermit(p);
                      setShowPermitForm(false);
                      setEditPermit(null);
                      reload();
                    }}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                    style={{
                      background: "linear-gradient(135deg,#f97316,#ea580c)",
                    }}
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    data-ocid="permits.cancel_button"
                    onClick={() => {
                      setShowPermitForm(false);
                      setEditPermit(null);
                    }}
                    className="px-4 py-2 rounded-xl text-sm text-slate-400 border border-white/15 hover:bg-white/5"
                  >
                    İptal
                  </button>
                </div>
              </div>
            )}
            {/* Permits Table */}
            {permits.length === 0 ? (
              <div
                data-ocid="permits.empty_state"
                className="text-center py-12 text-slate-500"
              >
                <div className="text-4xl mb-2">📋</div>
                <p>Henüz iş izni eklenmedi.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {permits.map((p, i) => {
                  const now = new Date();
                  const expiry = new Date(p.expiryDate);
                  const daysLeft = Math.ceil(
                    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
                  );
                  const status =
                    daysLeft < 0
                      ? "expired"
                      : daysLeft <= 7
                        ? "expiring"
                        : "valid";
                  const statusLabel =
                    status === "expired"
                      ? "Süresi Dolmuş"
                      : status === "expiring"
                        ? "Süresi Dolmak Üzere"
                        : "Geçerli";
                  const statusColor =
                    status === "expired"
                      ? "#ef4444"
                      : status === "expiring"
                        ? "#f59e0b"
                        : "#22c55e";
                  return (
                    <div
                      key={p.id}
                      data-ocid={`permits.item.${i + 1}`}
                      className="p-4 rounded-2xl"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: `1px solid ${statusColor}30`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-white font-semibold">
                              {p.contractorName}
                            </p>
                            <span
                              className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                              style={{
                                background: `${statusColor}20`,
                                color: statusColor,
                              }}
                            >
                              {statusLabel}
                            </span>
                          </div>
                          <p className="text-slate-400 text-xs">
                            TC: {p.idNumber} &bull; İzin No: {p.permitNumber}
                          </p>
                          <p className="text-slate-500 text-xs mt-0.5">
                            Düzenleme: {p.issueDate} &bull; Geçerlilik:{" "}
                            <span style={{ color: statusColor }}>
                              {p.expiryDate}
                            </span>
                            {status === "expiring"
                              ? ` (${daysLeft} gün kaldı)`
                              : ""}
                          </p>
                          {p.insuranceInfo && (
                            <p className="text-slate-500 text-xs mt-0.5">
                              Sigorta: {p.insuranceInfo}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            data-ocid={`permits.edit_button.${i + 1}`}
                            onClick={() => {
                              setEditPermit(p);
                              setPermitForm({
                                contractorName: p.contractorName,
                                idNumber: p.idNumber,
                                permitNumber: p.permitNumber,
                                issueDate: p.issueDate,
                                expiryDate: p.expiryDate,
                                insuranceInfo: p.insuranceInfo,
                              });
                              setShowPermitForm(false);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs text-[#0ea5e9] border border-[#0ea5e9]/30 hover:bg-[#0ea5e9]/10"
                          >
                            Düzenle
                          </button>
                          <button
                            type="button"
                            data-ocid={`permits.delete_button.${i + 1}`}
                            onClick={() => {
                              deletePermit(session.companyId, p.id);
                              reload();
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs text-red-400 border border-red-500/30 hover:bg-red-900/20"
                          >
                            Sil
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "customreport" && (
          <div className="max-w-4xl space-y-6">
            <h2 className="text-white font-bold text-lg">
              📊 Özel Rapor Oluşturucu
            </h2>
            <div
              className="p-5 rounded-2xl space-y-4"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-300 text-sm mb-1">
                    Başlangıç Tarihi
                  </p>
                  <input
                    type="date"
                    data-ocid="customreport.date_from.input"
                    value={reportDateFrom}
                    onChange={(e) => setReportDateFrom(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9]"
                  />
                </div>
                <div>
                  <p className="text-slate-300 text-sm mb-1">Bitiş Tarihi</p>
                  <input
                    type="date"
                    data-ocid="customreport.date_to.input"
                    value={reportDateTo}
                    onChange={(e) => setReportDateTo(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9]"
                  />
                </div>
                <div>
                  <p className="text-slate-300 text-sm mb-1">Kategori</p>
                  <select
                    data-ocid="customreport.category.select"
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-white focus:outline-none"
                    style={{
                      background: "#0f1729",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    <option value="" className="bg-[#0f1729]">
                      Tümü
                    </option>
                    {currentCategories.map((c) => (
                      <option key={c} value={c} className="bg-[#0f1729]">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-slate-300 text-sm mb-1">Departman</p>
                  <select
                    data-ocid="customreport.department.select"
                    value={reportDepartment}
                    onChange={(e) => setReportDepartment(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-white focus:outline-none"
                    style={{
                      background: "#0f1729",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    <option value="" className="bg-[#0f1729]">
                      Tümü
                    </option>
                    {getCurrentDepartments().map((d) => (
                      <option key={d} value={d} className="bg-[#0f1729]">
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-slate-300 text-sm mb-1">Personel</p>
                  <select
                    data-ocid="customreport.personnel.select"
                    value={reportPersonnel}
                    onChange={(e) => setReportPersonnel(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-white focus:outline-none"
                    style={{
                      background: "#0f1729",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    <option value="" className="bg-[#0f1729]">
                      Tümü
                    </option>
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
                  <p className="text-slate-300 text-sm mb-1">Min. Kalma (dk)</p>
                  <input
                    type="number"
                    data-ocid="customreport.min_stay.input"
                    value={reportMinStay === "" ? "" : reportMinStay}
                    onChange={(e) =>
                      setReportMinStay(
                        e.target.value === "" ? "" : +e.target.value,
                      )
                    }
                    placeholder="0 = tümü"
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9]"
                  />
                </div>
              </div>
              <button
                type="button"
                data-ocid="customreport.generate.button"
                onClick={() => {
                  let res = [...visitors];
                  if (reportDateFrom)
                    res = res.filter(
                      (v) =>
                        v.arrivalTime >= new Date(reportDateFrom).getTime(),
                    );
                  if (reportDateTo)
                    res = res.filter(
                      (v) =>
                        v.arrivalTime <=
                        new Date(`${reportDateTo}T23:59:59`).getTime(),
                    );
                  if (reportCategory)
                    res = res.filter((v) => v.category === reportCategory);
                  if (reportDepartment)
                    res = res.filter((v) => v.department === reportDepartment);
                  if (reportPersonnel)
                    res = res.filter(
                      (v) =>
                        v.registeredBy === reportPersonnel ||
                        v.hostStaffId === reportPersonnel,
                    );
                  if (reportMinStay !== "")
                    res = res.filter(
                      (v) =>
                        v.departureTime &&
                        (v.departureTime - v.arrivalTime) / 60000 >=
                          (reportMinStay as number),
                    );
                  setReportResults(res);
                }}
                className="px-6 py-3 rounded-xl text-white font-semibold"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                }}
              >
                Rapor Oluştur
              </button>
            </div>
            {reportResults !== null && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-white font-semibold">
                    {reportResults.length} sonuç bulundu
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      data-ocid="customreport.csv_download.button"
                      onClick={() => {
                        if (!reportResults) return;
                        const headers = [
                          "Ad Soyad",
                          "Kategori",
                          "Departman",
                          "Personel",
                          "Giriş",
                          "Çıkış",
                          "Süre(dk)",
                        ];
                        const rows = reportResults.map((v) => {
                          const staffName =
                            staffList.find((s) => s.staffId === v.registeredBy)
                              ?.name ?? v.registeredBy;
                          const dur = v.departureTime
                            ? Math.round(
                                (v.departureTime - v.arrivalTime) / 60000,
                              )
                            : "";
                          return [
                            `"${v.name}"`,
                            v.category ?? "",
                            v.department ?? "",
                            `"${staffName}"`,
                            new Date(v.arrivalTime).toLocaleString("tr-TR"),
                            v.departureTime
                              ? new Date(v.departureTime).toLocaleString(
                                  "tr-TR",
                                )
                              : "",
                            String(dur),
                          ].join(",");
                        });
                        const blob = new Blob(
                          [[headers.join(","), ...rows].join("\n")],
                          { type: "text/csv;charset=utf-8;" },
                        );
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `safentry-rapor-${new Date().toISOString().slice(0, 10)}.csv`;
                        a.click();
                        setTimeout(() => URL.revokeObjectURL(url), 5000);
                      }}
                      className="px-4 py-2 rounded-xl text-white text-sm font-medium"
                      style={{
                        background: "rgba(34,197,94,0.2)",
                        border: "1px solid rgba(34,197,94,0.4)",
                      }}
                    >
                      CSV İndir
                    </button>
                    <button
                      type="button"
                      data-ocid="customreport.print.button"
                      onClick={() => window.print()}
                      className="px-4 py-2 rounded-xl text-white text-sm font-medium"
                      style={{
                        background: "rgba(168,85,247,0.2)",
                        border: "1px solid rgba(168,85,247,0.4)",
                      }}
                    >
                      Yazdır
                    </button>
                  </div>
                </div>
                {reportResults.length === 0 ? (
                  <div
                    data-ocid="customreport.empty_state"
                    className="text-center py-10 text-slate-500"
                  >
                    Filtrelerle eşleşen sonuç bulunamadı.
                  </div>
                ) : (
                  <div
                    className="overflow-x-auto rounded-2xl"
                    style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    <table className="w-full text-sm">
                      <thead>
                        <tr
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            borderBottom: "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          {[
                            "Ad Soyad",
                            "Kategori",
                            "Departman",
                            "Personel",
                            "Giriş",
                            "Çıkış",
                            "Süre",
                          ].map((h) => (
                            <th
                              key={h}
                              className="text-left px-4 py-3 text-slate-400 font-medium"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportResults.map((v, i) => {
                          const staffName =
                            staffList.find((s) => s.staffId === v.registeredBy)
                              ?.name ?? v.registeredBy;
                          const dur = v.departureTime
                            ? `${Math.round(
                                (v.departureTime - v.arrivalTime) / 60000,
                              )} dk`
                            : "—";
                          return (
                            <tr
                              key={v.visitorId}
                              data-ocid={`customreport.row.${i + 1}`}
                              style={{
                                borderBottom:
                                  "1px solid rgba(255,255,255,0.05)",
                              }}
                            >
                              <td className="px-4 py-3 text-white font-medium">
                                {v.name}
                              </td>
                              <td className="px-4 py-3">
                                {v.category ? (
                                  <span
                                    className="px-2 py-0.5 rounded-full text-xs text-white"
                                    style={{
                                      background: `${getCategoryColor(
                                        v.category,
                                        findCompanyById(session.companyId),
                                      )}55`,
                                    }}
                                  >
                                    {v.category}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-300">
                                {v.department ?? "—"}
                              </td>
                              <td className="px-4 py-3 text-slate-300">
                                {staffName}
                              </td>
                              <td className="px-4 py-3 text-slate-300 text-xs">
                                {new Date(v.arrivalTime).toLocaleString(
                                  "tr-TR",
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-300 text-xs">
                                {v.departureTime
                                  ? new Date(v.departureTime).toLocaleString(
                                      "tr-TR",
                                    )
                                  : "—"}
                              </td>
                              <td className="px-4 py-3 text-slate-400 text-xs">
                                {dur}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SHIFTS TAB */}
        {tab === "shifts" && (
          <div>
            <ShiftCalendar
              companyId={session.companyId}
              staffList={staffList}
            />
          </div>
        )}

        {/* CHECKLISTS TAB */}
        {tab === "checklists" && (
          <div>
            <ChecklistHistoryPanel companyId={session.companyId} />
          </div>
        )}

        {/* REVIEWS TAB */}
        {tab === "reviews" && (
          <div>
            <h2 className="text-white font-bold text-lg mb-5">
              💬 Ziyaretçi Yorumları
            </h2>
            <VisitorComments
              companyId={session.companyId}
              visitors={visitors}
            />
          </div>
        )}

        {tab === "profile" && company && (
          <div className="max-w-lg space-y-4">
            {/* Company Code */}
            <div data-ocid="profile.company_code.panel">
              <p className="text-slate-300 text-sm mb-1 block">Şirket Kodu</p>
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 px-4 py-3 rounded-xl font-mono text-[#0ea5e9] text-sm tracking-widest select-all"
                  style={{
                    background: "rgba(14,165,233,0.06)",
                    border: "1px solid rgba(14,165,233,0.25)",
                    letterSpacing: "0.15em",
                  }}
                >
                  {company.companyId}
                </div>
                <button
                  type="button"
                  data-ocid="profile.company_code.button"
                  onClick={copyCompanyCode}
                  title="Kopyala"
                  className="flex items-center gap-1 px-3 py-3 rounded-xl text-xs font-medium transition-all"
                  style={{
                    background: codeCopied
                      ? "rgba(34,197,94,0.15)"
                      : "rgba(255,255,255,0.08)",
                    border: codeCopied
                      ? "1px solid rgba(34,197,94,0.4)"
                      : "1px solid rgba(255,255,255,0.15)",
                    color: codeCopied ? "#4ade80" : "#94a3b8",
                  }}
                >
                  {codeCopied ? "✓ Kopyalandı" : "Kopyala"}
                </button>
              </div>
            </div>

            {(
              [
                ["companyName", "name"],
                ["sector", "sector"],
                ["address", "address"],
                ["authorizedPerson", "authorizedPerson"],
                ["workingHours", "workingHours"],
              ] as [string, keyof Company][]
            ).map(([label, field]) => (
              <div key={field}>
                <p className="text-slate-300 text-sm mb-1 block">
                  {t(lang, label as Parameters<typeof t>[1])}
                </p>
                <input
                  data-ocid={`profile.${field}.input`}
                  value={String(profileForm[field] ?? "")}
                  onChange={(e) =>
                    setProfileForm((f) => ({ ...f, [field]: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9]"
                />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-300 text-sm mb-1 block">
                  {t(lang, "maxConcurrent")}
                </p>
                <input
                  data-ocid="profile.maxconcurrent.input"
                  type="number"
                  value={profileForm.maxConcurrentVisitors ?? 50}
                  onChange={(e) =>
                    setProfileForm((f) => ({
                      ...f,
                      maxConcurrentVisitors: +e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9]"
                />
              </div>
              <div>
                <p className="text-slate-300 text-sm mb-1 block">
                  Maks. Kapasite
                </p>
                <input
                  data-ocid="profile.maxcapacity.input"
                  type="number"
                  placeholder="0 = sınırsız"
                  value={profileForm.maxCapacity ?? 0}
                  onChange={(e) =>
                    setProfileForm((f) => ({
                      ...f,
                      maxCapacity: +e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9]"
                />
              </div>
              <div>
                <p className="text-slate-300 text-sm mb-1 block">
                  {t(lang, "dataRetention")}
                </p>
                <input
                  data-ocid="profile.retention.input"
                  type="number"
                  value={profileForm.dataRetentionDays ?? 365}
                  onChange={(e) =>
                    setProfileForm((f) => ({
                      ...f,
                      dataRetentionDays: +e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9]"
                />
              </div>
              {/* Working hours */}
              <div>
                <p className="text-slate-300 text-sm mb-1 block">
                  Mesai Başlangıcı
                </p>
                <input
                  data-ocid="profile.work_start_input"
                  type="number"
                  min={0}
                  max={23}
                  value={profileForm.workingHoursStart ?? 8}
                  onChange={(e) =>
                    setProfileForm((f) => ({
                      ...f,
                      workingHoursStart: +e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9]"
                />
              </div>
              <div>
                <p className="text-slate-300 text-sm mb-1 block">
                  Mesai Bitişi
                </p>
                <input
                  data-ocid="profile.work_end_input"
                  type="number"
                  min={0}
                  max={23}
                  value={profileForm.workingHoursEnd ?? 18}
                  onChange={(e) =>
                    setProfileForm((f) => ({
                      ...f,
                      workingHoursEnd: +e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9]"
                />
              </div>
              {/* Auto-checkout */}
              <div className="col-span-2">
                <p className="text-slate-300 text-sm mb-1 block">
                  Otomatik Çıkış (saat, 0=kapalı)
                </p>
                <input
                  data-ocid="profile.auto_checkout_input"
                  type="number"
                  min={0}
                  placeholder="0 = kapalı"
                  value={profileForm.autoCheckoutHours ?? 0}
                  onChange={(e) =>
                    setProfileForm((f) => ({
                      ...f,
                      autoCheckoutHours: +e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9]"
                />
                <p className="text-slate-500 text-xs mt-1">
                  Girilen saatten fazla süredir aktif olan ziyaretçiler otomatik
                  çıkış yapılır.
                </p>
              </div>
              {/* Badge validity */}
              <div className="col-span-2">
                <p className="text-slate-300 text-sm mb-1 block">
                  Rozet Geçerlilik Süresi (saat)
                </p>
                <input
                  data-ocid="badge_validity.input"
                  type="number"
                  min={1}
                  max={24}
                  value={profileForm.badgeValidityHours ?? 8}
                  onChange={(e) =>
                    setProfileForm((f) => ({
                      ...f,
                      badgeValidityHours: +e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9]"
                />
                <p className="text-slate-500 text-xs mt-1">
                  Rozet bu süreden fazla aktif olan ziyaretçiler için uyarı
                  gösterilir.
                </p>
              </div>
            </div>

            {/* Kiosk Welcome Message */}
            <div>
              <p className="text-slate-300 text-sm mb-1 block">
                Kiosk Karşılama Mesajı
              </p>
              <input
                data-ocid="profile.kiosk_message.input"
                placeholder="Hoş geldiniz! Lütfen ziyaret formunu doldurun."
                value={profileForm.kioskWelcomeMessage ?? ""}
                onChange={(e) =>
                  setProfileForm((f) => ({
                    ...f,
                    kioskWelcomeMessage: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9]"
              />
              <p className="text-slate-500 text-xs mt-1">
                Kiosk giriş ekranında gösterilecek karşılama mesajı
              </p>
            </div>

            {/* Category-Based NDA */}
            <div
              className="p-5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <p className="text-slate-300 font-semibold mb-4">
                📄 Kategori Bazlı NDA Metinleri
              </p>
              <p className="text-slate-400 text-xs mb-4">
                Her kategori için özel bir gizlilik/NDA metni
                tanımlayabilirsiniz. Boş bırakılan kategoriler varsayılan metni
                kullanır.
              </p>
              <div className="space-y-3">
                {(
                  profileForm.customCategories ??
                  company.customCategories ?? [
                    "Misafir",
                    "Müteahhit",
                    "Teslimat",
                    "Mülakat",
                    "Tedarikçi",
                    "Diğer",
                  ]
                ).map((cat) => (
                  <div key={cat}>
                    <p className="text-slate-400 text-xs mb-1">{cat}</p>
                    <textarea
                      data-ocid="profile.category_nda.textarea"
                      rows={2}
                      value={profileForm.categoryNda?.[cat] ?? ""}
                      onChange={(e) =>
                        setProfileForm((f) => ({
                          ...f,
                          categoryNda: {
                            ...(f.categoryNda ?? {}),
                            [cat]: e.target.value,
                          },
                        }))
                      }
                      placeholder={`${cat} kategorisi için özel NDA metni (isteğe bağlı)`}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-[#0ea5e9] resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* SLA Threshold */}
            <div
              className="mt-6 p-5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <h3 className="text-white font-semibold mb-4">
                ⏱️ Kiosk SLA Eşiği
              </h3>
              <p className="text-slate-400 text-xs mb-3">
                Kiosk üzerinden başvuran ziyaretçi kaç dakika beklediğinde uyarı
                oluşturulsun?
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  data-ocid="profile.sla_threshold.input"
                  value={profileForm.slaThreshold ?? 10}
                  onChange={(e) =>
                    setProfileForm((f) => ({
                      ...f,
                      slaThreshold: Number(e.target.value),
                    }))
                  }
                  min={1}
                  max={60}
                  className="w-24 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                />
                <span className="text-slate-400 text-sm">dakika</span>
              </div>
            </div>

            {/* Category Time Restrictions */}
            <div
              className="mt-6 p-5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <h3 className="text-white font-semibold mb-2">
                🕐 Zaman Kısıtlı Erişim
              </h3>
              <p className="text-slate-400 text-xs mb-4">
                Her kategori için giriş yapılabilecek saat ve günleri
                tanımlayın.
              </p>
              {(
                profileForm.customCategories ??
                company?.customCategories ?? [
                  "Misafir",
                  "Müteahhit",
                  "Teslimat",
                  "Mülakat",
                  "Tedarikçi",
                  "Diğer",
                ]
              ).map((cat) => {
                const restr = (
                  profileForm.categoryTimeRestrictions ??
                  company?.categoryTimeRestrictions ??
                  []
                ).find((r) => r.category === cat);
                const isEditing = editingRestriction === cat;
                const DAY_LABELS = [
                  "Paz",
                  "Pzt",
                  "Sal",
                  "Çar",
                  "Per",
                  "Cum",
                  "Cmt",
                ];
                return (
                  <div
                    key={cat}
                    className="mb-3 p-3 rounded-xl"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-medium">
                        {cat}
                      </span>
                      <div className="flex items-center gap-2">
                        {restr && !isEditing && (
                          <span className="text-xs text-amber-400">
                            {restr.allowedStart}–{restr.allowedEnd}
                          </span>
                        )}
                        <button
                          type="button"
                          data-ocid={`profile.time_restriction.${cat}.toggle`}
                          onClick={() => {
                            if (isEditing) {
                              setEditingRestriction(null);
                            } else {
                              setEditingRestriction(cat);
                              setRestrictionForm(
                                restr
                                  ? {
                                      allowedStart: restr.allowedStart,
                                      allowedEnd: restr.allowedEnd,
                                      allowedDays: restr.allowedDays,
                                      strictMode: restr.strictMode,
                                    }
                                  : {
                                      allowedStart: "08:00",
                                      allowedEnd: "18:00",
                                      allowedDays: [1, 2, 3, 4, 5],
                                      strictMode: false,
                                    },
                              );
                            }
                          }}
                          className="text-xs px-2 py-1 rounded-lg"
                          style={{
                            background: isEditing
                              ? "rgba(14,165,233,0.2)"
                              : "rgba(255,255,255,0.07)",
                            color: isEditing ? "#38bdf8" : "#94a3b8",
                          }}
                        >
                          {isEditing
                            ? "Kapat"
                            : restr
                              ? "Düzenle"
                              : "+ Kısıtla"}
                        </button>
                        {restr && !isEditing && (
                          <button
                            type="button"
                            data-ocid={`profile.time_restriction.${cat}.delete_button`}
                            onClick={() => {
                              const list = (
                                profileForm.categoryTimeRestrictions ??
                                company?.categoryTimeRestrictions ??
                                []
                              ).filter((r) => r.category !== cat);
                              setProfileForm((f) => ({
                                ...f,
                                categoryTimeRestrictions: list,
                              }));
                            }}
                            className="text-xs px-2 py-1 rounded-lg text-red-400"
                            style={{ background: "rgba(239,68,68,0.1)" }}
                          >
                            Kaldır
                          </button>
                        )}
                      </div>
                    </div>
                    {isEditing && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-3">
                          <div>
                            <span className="text-xs text-slate-400">
                              Başlangıç
                            </span>
                            <input
                              type="time"
                              data-ocid="profile.restriction_start.input"
                              value={restrictionForm.allowedStart}
                              onChange={(e) =>
                                setRestrictionForm((f) => ({
                                  ...f,
                                  allowedStart: e.target.value,
                                }))
                              }
                              className="ml-2 px-2 py-1 rounded-lg bg-white/5 border border-white/15 text-white text-xs focus:outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-xs text-slate-400">
                              Bitiş
                            </span>
                            <input
                              type="time"
                              data-ocid="profile.restriction_end.input"
                              value={restrictionForm.allowedEnd}
                              onChange={(e) =>
                                setRestrictionForm((f) => ({
                                  ...f,
                                  allowedEnd: e.target.value,
                                }))
                              }
                              className="ml-2 px-2 py-1 rounded-lg bg-white/5 border border-white/15 text-white text-xs focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {DAY_LABELS.map((day, di) => (
                            <button
                              key={day}
                              type="button"
                              data-ocid={`profile.restriction_day.${di + 1}.toggle`}
                              onClick={() => {
                                const days =
                                  restrictionForm.allowedDays.includes(di)
                                    ? restrictionForm.allowedDays.filter(
                                        (d) => d !== di,
                                      )
                                    : [...restrictionForm.allowedDays, di];
                                setRestrictionForm((f) => ({
                                  ...f,
                                  allowedDays: days,
                                }));
                              }}
                              className="px-2 py-1 rounded-lg text-xs font-medium"
                              style={{
                                background:
                                  restrictionForm.allowedDays.includes(di)
                                    ? "rgba(14,165,233,0.25)"
                                    : "rgba(255,255,255,0.07)",
                                color: restrictionForm.allowedDays.includes(di)
                                  ? "#38bdf8"
                                  : "#64748b",
                                border: restrictionForm.allowedDays.includes(di)
                                  ? "1px solid rgba(14,165,233,0.4)"
                                  : "1px solid transparent",
                              }}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            data-ocid="profile.strict_mode.checkbox"
                            id={`strict_${cat}`}
                            checked={restrictionForm.strictMode}
                            onChange={(e) =>
                              setRestrictionForm((f) => ({
                                ...f,
                                strictMode: e.target.checked,
                              }))
                            }
                            className="rounded"
                          />
                          <label
                            htmlFor={`strict_${cat}`}
                            className="text-xs text-slate-400"
                          >
                            Katı mod (giriş tamamen engelle, uyarı gösterme)
                          </label>
                        </div>
                        <button
                          type="button"
                          data-ocid="profile.restriction_save.button"
                          onClick={() => {
                            const newRestr = {
                              category: cat,
                              ...restrictionForm,
                            };
                            const list = [
                              ...(
                                profileForm.categoryTimeRestrictions ??
                                company?.categoryTimeRestrictions ??
                                []
                              ).filter((r) => r.category !== cat),
                              newRestr,
                            ];
                            setProfileForm((f) => ({
                              ...f,
                              categoryTimeRestrictions: list,
                            }));
                            setEditingRestriction(null);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                          style={{
                            background:
                              "linear-gradient(135deg,#0ea5e9,#0284c7)",
                          }}
                        >
                          Kaydet
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              data-ocid="badge_validity.save_button"
              onClick={saveProfile}
              className="w-full py-3 rounded-xl font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
            >
              {t(lang, "updateProfile")}
            </button>

            {/* Badge Fields */}
            {(() => {
              const ALL_BADGE_FIELDS = [
                { key: "name", label: "Ad Soyad" },
                { key: "idNumber", label: "TC Kimlik No" },
                { key: "phone", label: "Telefon" },
                { key: "company", label: "Şirket" },
                { key: "department", label: "Departman" },
                { key: "floor", label: "Kat" },
                { key: "vehiclePlate", label: "Araç Plakası" },
                { key: "visitReason", label: "Ziyaret Nedeni" },
                { key: "category", label: "Kategori" },
                { key: "arrivalTime", label: "Geliş Saati" },
              ];
              const currentFields = profileForm.badgeFields ?? [
                "name",
                "company",
                "arrivalTime",
                "category",
              ];
              const toggle = (key: string) => {
                const updated = currentFields.includes(key)
                  ? currentFields.filter((f) => f !== key)
                  : [...currentFields, key];
                setProfileForm((f) => ({ ...f, badgeFields: updated }));
              };
              return (
                <div
                  className="mt-6 p-5 rounded-2xl"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <h3 className="text-white font-semibold mb-4">
                    🏷️ Rozet Alanları
                  </h3>
                  <p className="text-slate-400 text-xs mb-3">
                    Ziyaretçi rozetinde hangi alanların görüneceğini seçin.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ALL_BADGE_FIELDS.map(({ key, label }) => {
                      const active = currentFields.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          data-ocid={`profile.badge_field_${key}.toggle`}
                          onClick={() => toggle(key)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                          style={{
                            background: active
                              ? "rgba(14,165,233,0.25)"
                              : "rgba(255,255,255,0.07)",
                            border: active
                              ? "1.5px solid rgba(14,165,233,0.6)"
                              : "1px solid rgba(255,255,255,0.12)",
                            color: active ? "#38bdf8" : "#94a3b8",
                          }}
                        >
                          {active ? "✓ " : ""}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Parking Management */}
            {(() => {
              const spaces: ParkingSpace[] = company?.parkingSpaces ?? [];
              const addSpace = () => {
                if (!newParkingLabel.trim()) return;
                const newSpace: ParkingSpace = {
                  id: generateId(),
                  label: newParkingLabel.trim(),
                  occupied: false,
                };
                const fresh = findCompanyById(session.companyId);
                if (fresh) {
                  saveCompany({
                    ...fresh,
                    parkingSpaces: [...(fresh.parkingSpaces ?? []), newSpace],
                  });
                  setNewParkingLabel("");
                  reload();
                }
              };
              const removeSpace = (id: string) => {
                const fresh = findCompanyById(session.companyId);
                if (fresh) {
                  saveCompany({
                    ...fresh,
                    parkingSpaces: (fresh.parkingSpaces ?? []).filter(
                      (s) => s.id !== id,
                    ),
                  });
                  reload();
                }
              };
              const occupied = spaces.filter((s) => s.occupied).length;
              return (
                <div
                  className="mt-6 p-5 rounded-2xl"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold">
                      🚗 Otopark Yönetimi
                    </h3>
                    <span className="text-xs text-slate-400">
                      {occupied}/{spaces.length} dolu
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {spaces.map((sp, i) => (
                      <div
                        key={sp.id}
                        data-ocid={`profile.parking_space.${i + 1}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                        style={{
                          background: sp.occupied
                            ? "rgba(239,68,68,0.15)"
                            : "rgba(34,197,94,0.15)",
                          border: `1px solid ${sp.occupied ? "rgba(239,68,68,0.35)" : "rgba(34,197,94,0.35)"}`,
                          color: sp.occupied ? "#f87171" : "#4ade80",
                        }}
                      >
                        {sp.label}
                        <button
                          type="button"
                          data-ocid={`profile.parking_delete.${i + 1}`}
                          onClick={() => removeSpace(sp.id)}
                          className="ml-1 opacity-60 hover:opacity-100 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {spaces.length === 0 && (
                      <p className="text-slate-500 text-xs">
                        Otopark alanı tanımlanmamış
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      data-ocid="profile.parking_label.input"
                      value={newParkingLabel}
                      onChange={(e) => setNewParkingLabel(e.target.value)}
                      placeholder="Örn: A-01, B-12"
                      className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                      onKeyDown={(e) => e.key === "Enter" && addSpace()}
                    />
                    <button
                      type="button"
                      data-ocid="profile.parking_add.button"
                      onClick={addSpace}
                      className="px-4 py-2 rounded-xl text-white text-sm font-medium"
                      style={{
                        background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                      }}
                    >
                      Ekle
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Department Management */}
            <div
              className="mt-6 p-5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <h3 className="text-white font-semibold mb-4">🏢 Departmanlar</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {getCurrentDepartments().map((dept, i) => (
                  <div
                    key={dept}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                    style={{
                      background: "rgba(14,165,233,0.2)",
                      border: "1px solid rgba(14,165,233,0.3)",
                    }}
                  >
                    {dept}
                    <button
                      type="button"
                      data-ocid={`profile.dept_delete_button.${i + 1}`}
                      onClick={() => removeDepartment(dept)}
                      className="text-white/60 hover:text-white text-xs ml-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  data-ocid="profile.dept_input"
                  value={newDeptInput}
                  onChange={(e) => setNewDeptInput(e.target.value)}
                  placeholder="Yeni departman..."
                  onKeyDown={(e) => e.key === "Enter" && addDepartment()}
                  className="flex-1 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                />
                <button
                  type="button"
                  data-ocid="profile.dept_add_button"
                  onClick={addDepartment}
                  className="px-4 py-2 rounded-xl text-white text-sm font-medium"
                  style={{
                    background: "rgba(14,165,233,0.2)",
                    border: "1px solid rgba(14,165,233,0.4)",
                  }}
                >
                  Ekle
                </button>
              </div>
            </div>

            {/* Floor Management */}
            <div
              className="p-5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <h3 className="text-white font-semibold mb-4">🏗️ Katlar</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {getCurrentFloors().map((floor, i) => (
                  <div
                    key={floor}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                    style={{
                      background: "rgba(168,85,247,0.2)",
                      border: "1px solid rgba(168,85,247,0.3)",
                    }}
                  >
                    {floor}
                    <button
                      type="button"
                      data-ocid={`profile.floor_delete_button.${i + 1}`}
                      onClick={() => removeFloor(floor)}
                      className="text-white/60 hover:text-white text-xs ml-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  data-ocid="profile.floor_input"
                  value={newFloorInput}
                  onChange={(e) => setNewFloorInput(e.target.value)}
                  placeholder="Yeni kat..."
                  onKeyDown={(e) => e.key === "Enter" && addFloor()}
                  className="flex-1 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                />
                <button
                  type="button"
                  data-ocid="profile.floor_add_button"
                  onClick={addFloor}
                  className="px-4 py-2 rounded-xl text-white text-sm font-medium"
                  style={{
                    background: "rgba(168,85,247,0.2)",
                    border: "1px solid rgba(168,85,247,0.4)",
                  }}
                >
                  Ekle
                </button>
              </div>
            </div>

            {/* Screening Questions Management */}
            <div
              className="p-5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <h3 className="text-white font-semibold mb-1">
                🛡️ Ön Eleme Soruları
              </h3>
              <p className="text-slate-500 text-xs mb-4">
                Ziyaretçi kaydında gösterilecek güvenlik soruları. Engelleme
                aktifse "Hayır" yanıtı girişi reddeder.
              </p>
              {getCurrentScreeningQuestions().length === 0 ? (
                <p className="text-slate-500 text-sm mb-4">
                  Henüz soru eklenmemiş.
                </p>
              ) : (
                <div className="space-y-2 mb-4">
                  {getCurrentScreeningQuestions().map((sq, i) => (
                    <div
                      key={sq.id}
                      className="flex items-start justify-between p-3 rounded-xl"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm">{sq.text}</div>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              background: "rgba(14,165,233,0.15)",
                              color: "#0ea5e9",
                            }}
                          >
                            {sq.type === "yes_no" ? "Evet/Hayır" : "Metin"}
                          </span>
                          {sq.blocking && (
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                background: "rgba(239,68,68,0.15)",
                                color: "#ef4444",
                              }}
                            >
                              🚫 Engelleyici
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        data-ocid={`profile.sq_delete_button.${i + 1}`}
                        onClick={() => removeScreeningQuestion(sq.id)}
                        className="text-slate-500 hover:text-red-400 ml-3 text-sm shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-3">
                <input
                  data-ocid="profile.sq_text_input"
                  value={newSqText}
                  onChange={(e) => setNewSqText(e.target.value)}
                  placeholder="Soru metni..."
                  className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                />
                <div className="flex gap-3 items-center flex-wrap">
                  <select
                    data-ocid="profile.sq_type_select"
                    value={newSqType}
                    onChange={(e) =>
                      setNewSqType(e.target.value as "yes_no" | "text")
                    }
                    className="px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                    style={{
                      background: "#0f1729",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    <option value="yes_no" className="bg-[#0f1729]">
                      Evet/Hayır
                    </option>
                    <option value="text" className="bg-[#0f1729]">
                      Metin Girişi
                    </option>
                  </select>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      data-ocid="profile.sq_blocking_checkbox"
                      type="checkbox"
                      checked={newSqBlocking}
                      onChange={(e) => setNewSqBlocking(e.target.checked)}
                      className="w-4 h-4 accent-[#ef4444]"
                    />
                    <span className="text-slate-300 text-sm">
                      Engelleyici (Hayır = Giriş Yok)
                    </span>
                  </label>
                  <button
                    type="button"
                    data-ocid="profile.sq_add_button"
                    onClick={addScreeningQuestion}
                    className="px-4 py-2 rounded-xl text-white text-sm font-medium"
                    style={{
                      background: "rgba(14,165,233,0.2)",
                      border: "1px solid rgba(14,165,233,0.4)",
                    }}
                  >
                    Soru Ekle
                  </button>
                </div>
              </div>
            </div>

            {/* Category Management */}
            <div
              className="mt-6 p-5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <h3 className="text-white font-semibold mb-4">
                Ziyaret Kategorileri
              </h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {currentCategories.map((cat, i) => (
                  <div
                    key={cat}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                    style={{
                      background: `${getCategoryColor(
                        cat,
                        findCompanyById(session.companyId),
                      )}33`,
                      border: `1px solid ${getCategoryColor(cat, findCompanyById(session.companyId))}80`,
                    }}
                  >
                    <input
                      type="color"
                      data-ocid={`profile.category_color.${i + 1}`}
                      value={
                        findCompanyById(session.companyId)?.categoryColors?.[
                          cat
                        ] ??
                        CATEGORY_COLORS[cat] ??
                        "#64748b"
                      }
                      onChange={(e) => {
                        const fresh = findCompanyById(session.companyId);
                        if (fresh)
                          saveCompany({
                            ...fresh,
                            categoryColors: {
                              ...(fresh.categoryColors ?? {}),
                              [cat]: e.target.value,
                            },
                          });
                        reload();
                      }}
                      title={`${cat} rengi`}
                      className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                      style={{ padding: 0 }}
                    />
                    {cat}
                    <button
                      type="button"
                      data-ocid={`profile.category_delete_button.${i + 1}`}
                      onClick={() => removeCategory(cat)}
                      className="text-white/60 hover:text-white text-xs ml-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  data-ocid="profile.category_input"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  placeholder="Yeni kategori..."
                  onKeyDown={(e) => e.key === "Enter" && addCategory()}
                  className="flex-1 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                />
                <button
                  type="button"
                  data-ocid="profile.category_add_button"
                  onClick={addCategory}
                  className="px-4 py-2 rounded-xl text-white text-sm font-medium"
                  style={{
                    background: "rgba(14,165,233,0.2)",
                    border: "1px solid rgba(14,165,233,0.4)",
                  }}
                >
                  Ekle
                </button>
              </div>
            </div>

            {/* Category Max Stay */}
            <div
              className="p-5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <h3 className="text-white font-semibold mb-1">
                ⏱️ Kategori Ziyaret Süresi Sınırı
              </h3>
              <p className="text-slate-500 text-xs mb-4">
                Her kategori için maksimum kalma süresini dakika olarak girin. 0
                = sınırsız.
              </p>
              <div className="space-y-2">
                {currentCategories.map((cat) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-white text-sm w-28 shrink-0">
                      {cat}
                    </span>
                    <input
                      type="number"
                      data-ocid="profile.category_maxstay.input"
                      min={0}
                      placeholder="0 = sınırsız"
                      value={profileForm.categoryMaxStay?.[cat] ?? 0}
                      onChange={(e) => {
                        const v = +e.target.value;
                        setProfileForm((f) => ({
                          ...f,
                          categoryMaxStay: {
                            ...(f.categoryMaxStay ?? {}),
                            [cat]: v,
                          },
                        }));
                      }}
                      className="w-32 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                    />
                    <span className="text-slate-400 text-xs">dk</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Meeting Templates */}
            <div
              className="p-5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold">
                    📅 Toplantı Şablonları
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Tekrarlayan randevular için şablon tanımlayın
                  </p>
                </div>
                <button
                  type="button"
                  data-ocid="profile.template_add.button"
                  onClick={() => setTemplateModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-white text-xs font-medium"
                  style={{
                    background: "rgba(14,165,233,0.2)",
                    border: "1px solid rgba(14,165,233,0.4)",
                  }}
                >
                  + Şablon Ekle
                </button>
              </div>
              {(company?.meetingTemplates ?? []).length === 0 ? (
                <p className="text-slate-500 text-sm">
                  Henüz şablon tanımlanmamış.
                </p>
              ) : (
                <div className="space-y-2">
                  {(company?.meetingTemplates ?? []).map((tmpl, i) => {
                    const DAY_NAMES = [
                      "Paz",
                      "Pzt",
                      "Sal",
                      "Çar",
                      "Per",
                      "Cum",
                      "Cmt",
                    ];
                    const hostName =
                      staffList.find((s) => s.staffId === tmpl.hostStaffId)
                        ?.name ?? tmpl.hostStaffId;
                    return (
                      <div
                        key={tmpl.id}
                        data-ocid={`profile.template.${i + 1}`}
                        className="flex items-center justify-between p-3 rounded-xl"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <div>
                          <div className="text-white text-sm font-medium">
                            {tmpl.name}
                          </div>
                          <div className="text-slate-400 text-xs">
                            {DAY_NAMES[tmpl.dayOfWeek]} {tmpl.time} — {hostName}
                          </div>
                        </div>
                        <button
                          type="button"
                          data-ocid={`profile.template_delete.${i + 1}`}
                          onClick={() => {
                            const fresh = findCompanyById(session.companyId);
                            if (fresh) {
                              saveCompany({
                                ...fresh,
                                meetingTemplates: (
                                  fresh.meetingTemplates ?? []
                                ).filter((t) => t.id !== tmpl.id),
                              });
                              reload();
                            }
                          }}
                          className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded"
                          style={{ background: "rgba(239,68,68,0.1)" }}
                        >
                          Sil
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Custom Form Fields */}
            <div
              className="p-5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <h3 className="text-white font-semibold mb-4">
                Özel Form Alanları
              </h3>
              {currentCustomFields.length === 0 ? (
                <p className="text-slate-500 text-sm mb-4">
                  Henüz özel alan tanımlanmamış.
                </p>
              ) : (
                <div className="space-y-2 mb-4">
                  {currentCustomFields.map((cf, i) => (
                    <div
                      key={cf.id}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div>
                        <span className="text-white text-sm">{cf.label}</span>
                        {cf.required && (
                          <span className="ml-2 text-red-400 text-xs">
                            Zorunlu
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        data-ocid={`profile.custom_field_delete_button.${i + 1}`}
                        onClick={() => removeCustomField(cf.id)}
                        className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded"
                        style={{ background: "rgba(239,68,68,0.1)" }}
                      >
                        Sil
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <p className="text-slate-400 text-xs mb-1">Alan Adı</p>
                  <input
                    data-ocid="profile.custom_field_input"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    placeholder="Örn: Firma Adı"
                    className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                  />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <input
                    type="checkbox"
                    id="field_required"
                    checked={newFieldRequired}
                    onChange={(e) => setNewFieldRequired(e.target.checked)}
                    className="w-4 h-4 accent-[#0ea5e9]"
                  />
                  <label
                    htmlFor="field_required"
                    className="text-slate-400 text-xs"
                  >
                    Zorunlu
                  </label>
                </div>
                <button
                  type="button"
                  data-ocid="profile.custom_field_add_button"
                  onClick={addCustomField}
                  className="px-4 py-2 rounded-xl text-white text-sm font-medium"
                  style={{
                    background: "rgba(168,85,247,0.2)",
                    border: "1px solid rgba(168,85,247,0.4)",
                  }}
                >
                  Ekle
                </button>
              </div>
            </div>

            {/* Custom Exit Questions */}
            <div
              className="p-5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <h3 className="text-white font-semibold mb-1">
                📋 Çıkış Anketi Soruları
              </h3>
              <p className="text-slate-500 text-xs mb-4">
                Ziyaretçi çıkışında gösterilecek özel sorular. Tanımlanmazsa
                varsayılan yıldız puanı kullanılır.
              </p>
              {getCurrentExitQuestions().length === 0 ? (
                <p className="text-slate-500 text-sm mb-4">
                  Henüz özel soru eklenmemiş.
                </p>
              ) : (
                <div className="space-y-2 mb-4">
                  {getCurrentExitQuestions().map((q, i) => (
                    <div
                      key={q.id}
                      className="flex items-start justify-between p-3 rounded-xl"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm">{q.question}</div>
                        <span
                          className="mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            background: "rgba(14,165,233,0.15)",
                            color: "#0ea5e9",
                          }}
                        >
                          {q.type === "rating"
                            ? "⭐ Puanlama"
                            : q.type === "yesno"
                              ? "Evet/Hayır"
                              : "Metin"}
                        </span>
                      </div>
                      <button
                        type="button"
                        data-ocid={`profile.exit_question_delete_button.${i + 1}`}
                        onClick={() => removeExitQuestion(q.id)}
                        className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded ml-3 shrink-0"
                        style={{ background: "rgba(239,68,68,0.1)" }}
                      >
                        Sil
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-3">
                <input
                  data-ocid="profile.exit_question_input"
                  value={newExitQText}
                  onChange={(e) => setNewExitQText(e.target.value)}
                  placeholder="Soru metni..."
                  className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                />
                <div className="flex gap-3 items-center">
                  <select
                    data-ocid="profile.exit_question_type_select"
                    value={newExitQType}
                    onChange={(e) =>
                      setNewExitQType(
                        e.target.value as "rating" | "text" | "yesno",
                      )
                    }
                    className="px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                    style={{
                      background: "#0f1729",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    <option value="rating" className="bg-[#0f1729]">
                      ⭐ Puanlama
                    </option>
                    <option value="yesno" className="bg-[#0f1729]">
                      Evet/Hayır
                    </option>
                    <option value="text" className="bg-[#0f1729]">
                      Metin Girişi
                    </option>
                  </select>
                  <button
                    type="button"
                    data-ocid="profile.exit_question_add_button"
                    onClick={addExitQuestion}
                    className="px-4 py-2 rounded-xl text-white text-sm font-medium"
                    style={{
                      background: "rgba(14,165,233,0.2)",
                      border: "1px solid rgba(14,165,233,0.4)",
                    }}
                  >
                    Soru Ekle
                  </button>
                </div>
              </div>
            </div>

            {/* Kiosk Content Customization */}
            <div
              className="mt-6 p-5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              data-ocid="profile.kiosk_content.panel"
            >
              <h3 className="text-white font-semibold mb-1">🖥️ Kiosk İçeriği</h3>
              <p className="text-slate-500 text-xs mb-4">
                Kiosk ekranında gösterilecek metin ve etiketleri özelleştirin.
                Boş bırakırsanız varsayılan metinler kullanılır.
              </p>
              {(() => {
                const currentKioskContent = getKioskContent(session.companyId);
                const langContent = currentKioskContent[lang] ?? {};
                const updateField = (field: string, value: string) => {
                  saveKioskContent(session.companyId, lang, {
                    ...langContent,
                    [field]: value,
                  });
                  reload();
                };
                return (
                  <div className="space-y-3">
                    {[
                      {
                        key: "welcomeTitle",
                        label: "Karşılama Başlığı",
                        placeholder: "Hoş Geldiniz",
                      },
                      {
                        key: "subtitle",
                        label: "Alt Mesaj",
                        placeholder: "Ziyaretçi kaydı için dokunun",
                      },
                      {
                        key: "visitorNameLabel",
                        label: "Ad Soyad Etiketi",
                        placeholder: "Ad Soyad",
                      },
                      {
                        key: "companyLabel",
                        label: "Firma Adı Etiketi",
                        placeholder: "Firma Adı",
                      },
                      {
                        key: "visitReasonLabel",
                        label: "Ziyaret Nedeni Etiketi",
                        placeholder: "Ziyaret Nedeni",
                      },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <p className="text-slate-300 text-xs mb-1">{label}</p>
                        <input
                          data-ocid={`profile.kiosk_${key}.input`}
                          value={
                            (langContent as Record<string, string>)[key] ?? ""
                          }
                          onChange={(e) => updateField(key, e.target.value)}
                          placeholder={placeholder}
                          className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                        />
                      </div>
                    ))}
                    <p className="text-slate-500 text-xs">
                      Şu an düzenlenen dil:{" "}
                      <span className="text-teal-400 font-medium">
                        {lang.toUpperCase()}
                      </span>
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Meeting Template Add Modal */}
      {templateModalOpen && (
        <div
          data-ocid="template_add.modal"
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
              border: "1.5px solid rgba(14,165,233,0.4)",
            }}
          >
            <h3 className="text-white font-bold text-lg mb-4">
              📅 Yeni Toplantı Şablonu
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-slate-300 text-xs mb-1">Şablon Adı *</p>
                <input
                  data-ocid="template_add.name.input"
                  value={templateForm.name}
                  onChange={(e) =>
                    setTemplateForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Örn: Haftalık Tedarikçi Toplantısı"
                  className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-slate-300 text-xs mb-1">Gün</p>
                  <select
                    data-ocid="template_add.day.select"
                    value={templateForm.dayOfWeek}
                    onChange={(e) =>
                      setTemplateForm((f) => ({
                        ...f,
                        dayOfWeek: +e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                    style={{
                      background: "#0f1729",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    {[
                      "Pazar",
                      "Pazartesi",
                      "Salı",
                      "Çarşamba",
                      "Perşembe",
                      "Cuma",
                      "Cumartesi",
                    ].map((d, i) => (
                      <option key={d} value={i} className="bg-[#0f1729]">
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-slate-300 text-xs mb-1">Saat</p>
                  <input
                    type="time"
                    data-ocid="template_add.time.input"
                    value={templateForm.time}
                    onChange={(e) =>
                      setTemplateForm((f) => ({ ...f, time: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <p className="text-slate-300 text-xs mb-1">
                  Ev Sahibi Personel
                </p>
                <select
                  data-ocid="template_add.host.select"
                  value={templateForm.hostStaffId}
                  onChange={(e) =>
                    setTemplateForm((f) => ({
                      ...f,
                      hostStaffId: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                  style={{
                    background: "#0f1729",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  <option value="" className="bg-[#0f1729]">
                    Seçin...
                  </option>
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
                <p className="text-slate-300 text-xs mb-1">Amaç *</p>
                <input
                  data-ocid="template_add.purpose.input"
                  value={templateForm.purpose}
                  onChange={(e) =>
                    setTemplateForm((f) => ({ ...f, purpose: e.target.value }))
                  }
                  placeholder="Toplantı amacı..."
                  className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                />
              </div>
              <div>
                <p className="text-slate-300 text-xs mb-1">
                  Varsayılan Ziyaretçi Adı (isteğe bağlı)
                </p>
                <input
                  data-ocid="template_add.visitor_name.input"
                  value={templateForm.visitorName}
                  onChange={(e) =>
                    setTemplateForm((f) => ({
                      ...f,
                      visitorName: e.target.value,
                    }))
                  }
                  placeholder="Düzenli ziyaretçi adı"
                  className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                />
              </div>
              <div>
                <p className="text-slate-300 text-xs mb-1">Notlar</p>
                <input
                  data-ocid="template_add.notes.input"
                  value={templateForm.notes}
                  onChange={(e) =>
                    setTemplateForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  placeholder="İsteğe bağlı notlar..."
                  className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                data-ocid="template_add.cancel_button"
                onClick={() => setTemplateModalOpen(false)}
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
                data-ocid="template_add.confirm_button"
                onClick={() => {
                  if (!templateForm.name || !templateForm.purpose) return;
                  const fresh = findCompanyById(session.companyId);
                  if (!fresh) return;
                  const newTmpl = {
                    id: generateId(),
                    name: templateForm.name,
                    dayOfWeek: templateForm.dayOfWeek,
                    time: templateForm.time,
                    hostStaffId: templateForm.hostStaffId,
                    purpose: templateForm.purpose,
                    notes: templateForm.notes || undefined,
                    visitorName: templateForm.visitorName || undefined,
                  };
                  saveCompany({
                    ...fresh,
                    meetingTemplates: [
                      ...(fresh.meetingTemplates ?? []),
                      newTmpl,
                    ],
                  });
                  setTemplateModalOpen(false);
                  setTemplateForm({
                    name: "",
                    dayOfWeek: 1,
                    time: "10:00",
                    hostStaffId: "",
                    purpose: "",
                    notes: "",
                    visitorName: "",
                  });
                  reload();
                  toast.success("Şablon eklendi");
                }}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                }}
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-invite Modal */}
      {reinviteOpen && reinviteVisitorData && (
        <div
          data-ocid="reinvite.modal"
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
              border: "1.5px solid rgba(14,165,233,0.4)",
            }}
          >
            <h3 className="text-white font-bold text-lg mb-4">
              ✉️ Tekrar Davet Et
            </h3>
            <div className="space-y-4">
              <div
                className="p-3 rounded-xl"
                style={{
                  background: "rgba(14,165,233,0.08)",
                  border: "1px solid rgba(14,165,233,0.2)",
                }}
              >
                <p className="text-white font-medium">
                  {reinviteVisitorData.name}
                </p>
                <p className="text-slate-400 text-xs">
                  {reinviteVisitorData.idNumber}
                </p>
              </div>
              <div>
                <p className="text-slate-300 text-xs mb-1.5">Randevu Tarihi</p>
                <input
                  data-ocid="reinvite.date.input"
                  type="date"
                  value={reinviteDate}
                  onChange={(e) => setReinviteDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                />
              </div>
              <div>
                <p className="text-slate-300 text-xs mb-1.5">Randevu Saati</p>
                <input
                  data-ocid="reinvite.time.input"
                  type="time"
                  value={reinviteTime}
                  onChange={(e) => setReinviteTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                />
              </div>
              <div>
                <p className="text-slate-300 text-xs mb-1.5">Ziyaret Amacı</p>
                <input
                  data-ocid="reinvite.purpose.input"
                  type="text"
                  value={reinvitePurpose}
                  onChange={(e) => setReinvitePurpose(e.target.value)}
                  placeholder="Ziyaret amacı..."
                  className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                data-ocid="reinvite.cancel_button"
                onClick={() => {
                  setReinviteOpen(false);
                  setReinviteVisitorData(null);
                }}
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
                data-ocid="reinvite.confirm_button"
                onClick={submitReinvite}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                }}
              >
                Randevu Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
      {profileVisitor && (
        <div
          data-ocid="visitor_profile.sheet"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
                      background: getCategoryColor(
                        profileVisitor.category,
                        findCompanyById(session.companyId),
                      ),
                    }}
                  >
                    {profileVisitor.category}
                  </span>
                )}
              </div>
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
                        {v.departureTime && (
                          <div className="text-slate-500 text-xs mt-1">
                            Çıkış: {formatDateTime(v.departureTime)}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
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
            </div>
          </div>
        </div>
      )}

      {/* Staff Performance Detail Modal */}
      {selectedStaffPerf && (
        <div
          data-ocid="stats.performance_modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-md p-7 rounded-2xl"
            style={{
              background: "#0f1729",
              border: "1.5px solid rgba(14,165,233,0.3)",
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-bold text-lg">
                  {selectedStaffPerf.name}
                </h3>
                <p className="text-slate-400 text-sm">Performans Detayı</p>
              </div>
              <button
                type="button"
                data-ocid="stats.performance_modal.close_button"
                onClick={() => setSelectedStaffPerf(null)}
                className="text-slate-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              {[
                {
                  label: "Toplam Kayıt",
                  value: selectedStaffPerf.total.toString(),
                  icon: "👤",
                },
                {
                  label: "En Yoğun Vardiya",
                  value:
                    selectedStaffPerf.busiestShift === "morning"
                      ? "Sabah"
                      : selectedStaffPerf.busiestShift === "afternoon"
                        ? "Öğleden Sonra"
                        : "Gece",
                  icon: "🕐",
                },
                {
                  label: "En Yoğun Gün",
                  value: selectedStaffPerf.busiestDay ?? "—",
                  icon: "📅",
                },
                {
                  label: "Ort. Kalış Süresi",
                  value:
                    selectedStaffPerf.avgDurMins > 0
                      ? `${selectedStaffPerf.avgDurMins} dk`
                      : "—",
                  icon: "⏱️",
                },
                {
                  label: "En Çok Kategori",
                  value: selectedStaffPerf.topCat,
                  icon: "🏷️",
                },
                {
                  label: "Ort. Ziyaretçi Puanı",
                  value:
                    selectedStaffPerf.avgRating !== undefined
                      ? selectedStaffPerf.avgRating !== "—"
                        ? `⭐ ${selectedStaffPerf.avgRating}`
                        : "—"
                      : "—",
                  icon: "⭐",
                },
                {
                  label: "Yorum Bırakan (%)",
                  value:
                    selectedStaffPerf.commentPct !== undefined
                      ? `%${selectedStaffPerf.commentPct}`
                      : "—",
                  icon: "💬",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <span className="text-slate-400 text-sm">
                    {item.icon} {item.label}
                  </span>
                  <span className="text-white font-semibold text-sm">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
