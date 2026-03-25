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
import CsvImportModal from "../components/CsvImportModal";
import DailyBriefing from "../components/DailyBriefing";
import EmptyState from "../components/EmptyState";
import GlobalSearch from "../components/GlobalSearch";
import { HealthScreeningStep } from "../components/HealthScreeningTab";
import HelpCenter from "../components/HelpCenter";
import { StaffImprovementTasksTab } from "../components/ImprovementTasksTab";
import InteractiveTour, { isTourDone } from "../components/InteractiveTour";
import LangSwitcher from "../components/LangSwitcher";
import LeaveManagementTab from "../components/LeaveManagementTab";
import NotificationCenter from "../components/NotificationCenter";
import OcrScanModal from "../components/OcrScanModal";
import PatrolTab from "../components/PatrolTab";
import QRCode from "../components/QRCode";
import ReinviteModal from "../components/ReinviteModal";
import { ChecklistModal } from "../components/SecurityChecklist";
import ShiftHandoverModal, {
  HandoverHistoryList,
} from "../components/ShiftHandoverModal";
import ShiftSwapTab from "../components/ShiftSwapTab";
import SignatureCanvas from "../components/SignatureCanvas";
import TrainingTab, {
  getTrainingCompletionStatus,
} from "../components/TrainingTab";
import VisitorCountdown from "../components/VisitorCountdown";
import { getVisitorTags } from "../components/VisitorTagsTab";
import { getZones } from "../components/ZoneControlTab";
import { useCameraCapture as useCamera } from "../hooks/useCameraCapture";
import { useLiveAlerts } from "../hooks/useLiveAlerts";
import { getLang, t } from "../i18n";
import { useQRScanner } from "../qr-code/useQRScanner";
import {
  findEntryPointForCategory,
  getEntryPoints,
  isPersonnelOnLeave,
} from "../store";
import {
  dataUrlToBytes,
  fileToBytes,
  uploadBytesToBlob,
} from "../utils/blobUpload";

import {
  type StaffMessage,
  addAlertHistory,
  addBadgeReprintLog,
  addGatePassLog,
  addNotification,
  clearSession,
  computeVisitorTrustScore,
  deleteIncident,
  deletePatrol,
  findApprovedByIdNumber,
  findCompanyById,
  findPermitByIdNumber,
  findStaffById,
  findVisitorByCode,
  getAccessUpgradeRequests,
  getAlertHistory,
  getAllStaff,
  getAnnouncements,
  getAppointments,
  getApprovalChainConfig,
  getApprovedVisitors,
  getBelongings,
  getBranches,
  getCompanyDepartments,
  getCompanyFloors,
  getCustomCategories,
  getDepartments,
  getDeptTodayVisitorCount,
  getHostReviews,
  getIncidents,
  getInvitations,
  getLockdown,
  getMaintenanceRequests,
  getMeetingRooms,
  getPatrols,
  getQueue,
  getSession,
  getStaffByCompany,
  getStaffMessages,
  getStaffPhoto,
  getVisitorBelongings,
  getVisitorTitle,
  getVisitors,
  isBiometricRequired,
  isBlacklisted,
  isDateTimeOutsideWorkHours,
  refreshSession,
  removeFromQueue,
  resetStaffCode,
  saveAccessUpgradeRequest,
  saveAppointment,
  saveApprovalChainConfig,
  saveBelonging,
  saveCompany,
  saveHostReview,
  saveImprovementTask,
  saveIncident,
  saveInvitation,
  saveMaintenanceRequest,
  savePatrol,
  saveSession,
  saveStaff,
  saveStaffMessage,
  saveStaffPhoto,
  saveVisitor,
  setKioskApprovalStatus,
  updateStaffSessionLogout,
} from "../store";
import type {
  AlertHistoryEntry,
  AppScreen,
  Appointment,
  ApprovalChainStep,
  ApprovedVisitor,
  BelongingsItem,
  Company,
  ContractorPermit,
  ExitQuestion,
  HostReview,
  Invitation,
  MaintenanceRequest,
  MeetingRoom,
  SecurityIncident,
  Staff,
  UploadedDocument,
  Visitor,
  VisitorCompanion as _VisitorCompanion,
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
import { validateTcId } from "../utils/tcValidation";
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

interface StaffTask {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedToName: string;
  createdBy: string;
  createdByName: string;
  priority: "high" | "medium" | "low";
  done: boolean;
  createdAt: number;
  doneAt?: number;
}

interface ShiftNote {
  id: string;
  authorName: string;
  authorCode: string;
  content: string;
  createdAt: number;
  read: boolean;
}

interface BlacklistAttempt {
  id: string;
  checkedTC: string;
  checkedName: string;
  matchFound: boolean;
  matchedEntry?: string;
  checkedBy: string;
  checkedAt: number;
}

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
  | "invitations"
  | "gorevler"
  | "mycalendar"
  | "messages"
  | "incidents"
  | "patrol"
  | "maintenance"
  | "handover"
  | "shiftswap"
  | "imptasks"
  | "training"
  | "queue"
  | "punchin";

const PUNCH_KEY = (companyId: string) => `safentry_punchlog_${companyId}`;

type PunchRecord = {
  id: string;
  staffId: string;
  staffName: string;
  type: "in" | "out";
  time: number;
};

function getPunchLog(companyId: string): PunchRecord[] {
  try {
    return JSON.parse(localStorage.getItem(PUNCH_KEY(companyId)) ?? "[]");
  } catch {
    return [];
  }
}
function savePunchLog(companyId: string, logs: PunchRecord[]) {
  localStorage.setItem(PUNCH_KEY(companyId), JSON.stringify(logs));
}

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
  accessCardNumber: "",
  ishgAccepted: false,
  emergencyContactName: "",
  emergencyContactPhone: "",
  policyAccepted: false,
  zonePermissions: [] as string[],
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
  meetingRoomId: "",
  attendees: [] as import("../types").AppointmentAttendee[],
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

// ─── MaintenanceTab ────────────────────────────────────────────────────────────
function MaintenanceTab({
  companyId,
  staffId,
  staffList,
}: {
  companyId: string;
  staffId: string;
  staffList: import("../types").Staff[];
}) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>(() =>
    getMaintenanceRequests(companyId),
  );
  const [form, setForm] = useState({
    location: "",
    category: "cleaning" as MaintenanceRequest["category"],
    description: "",
  });
  const [showForm, setShowForm] = useState(false);
  const reload = () => setRequests(getMaintenanceRequests(companyId));
  const statusColor: Record<string, string> = {
    open: "#f59e0b",
    in_progress: "#0ea5e9",
    done: "#4ade80",
  };
  const statusLabel: Record<string, string> = {
    open: "Açık",
    in_progress: "Devam Ediyor",
    done: "Tamamlandı",
  };
  const catLabel: Record<string, string> = {
    cleaning: "🧹 Temizlik",
    technical: "🔧 Teknik",
    security: "🔒 Güvenlik",
    other: "📋 Diğer",
  };
  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-xl">
          🔧 Bakım ve Temizlik Talepleri
        </h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
        >
          {showForm ? "İptal" : "+ Yeni Talep"}
        </button>
      </div>
      {showForm && (
        <div
          className="p-5 rounded-2xl space-y-4"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder="Konum (örn: 3. Kat Lobi)"
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
              className="px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            />
            <select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  category: e.target.value as MaintenanceRequest["category"],
                }))
              }
              className="px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <option value="cleaning" style={{ background: "#0f1729" }}>
                🧹 Temizlik
              </option>
              <option value="technical" style={{ background: "#0f1729" }}>
                🔧 Teknik
              </option>
              <option value="security" style={{ background: "#0f1729" }}>
                🔒 Güvenlik
              </option>
              <option value="other" style={{ background: "#0f1729" }}>
                📋 Diğer
              </option>
            </select>
          </div>
          <input
            placeholder="Açıklama"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (!form.location.trim()) return;
              const staffName =
                staffList.find((s) => s.staffId === staffId)?.name ??
                staffId ??
                "Personel";
              const req: MaintenanceRequest = {
                id: `maint_${Date.now()}`,
                companyId,
                location: form.location.trim(),
                category: form.category,
                description: form.description.trim(),
                status: "open",
                createdBy: staffName,
                createdAt: Date.now(),
              };
              saveMaintenanceRequest(req);
              setForm({ location: "", category: "cleaning", description: "" });
              setShowForm(false);
              reload();
            }}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
          >
            Talep Gönder
          </button>
        </div>
      )}
      <div className="space-y-3">
        {requests.length === 0 ? (
          <div
            className="p-8 rounded-2xl text-center"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <p className="text-slate-400">Henüz talep yok.</p>
          </div>
        ) : (
          [...requests].reverse().map((req) => (
            <div
              key={req.id}
              className="p-4 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">
                      {catLabel[req.category]}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: `${statusColor[req.status]}22`,
                        color: statusColor[req.status],
                        border: `1px solid ${statusColor[req.status]}44`,
                      }}
                    >
                      {statusLabel[req.status]}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm">📍 {req.location}</p>
                  {req.description && (
                    <p className="text-slate-400 text-xs mt-1">
                      {req.description}
                    </p>
                  )}
                  <p className="text-slate-500 text-xs mt-1">
                    Talep eden: {req.createdBy} •{" "}
                    {new Date(req.createdAt).toLocaleString("tr-TR")}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
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
  const [surveyQrVisitor, setSurveyQrVisitor] = useState<{
    id: string;
    name: string;
    url: string;
  } | null>(null);
  const [showTour, setShowTour] = useState(() => !isTourDone("security_staff"));
  useLiveAlerts(session.companyId, true);
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

  // Group registration
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({
    groupName: "",
    hostStaffId: "",
    category: "Misafir",
    department: "",
    floor: "",
    visitReason: "",
    ndaAccepted: false,
    visitors: [
      { name: "", idNumber: "" },
      { name: "", idNumber: "" },
    ] as { name: string; idNumber: string }[],
  });
  const [groupSubmitting, setGroupSubmitting] = useState(false);

  // Appointment conflict detection
  const [apptConflict, setApptConflict] = useState<string | null>(null);
  const [lastCreatedApptLink, setLastCreatedApptLink] = useState<string | null>(
    null,
  );
  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [visitorViewMode, setVisitorViewMode] = useState<"list" | "grid">(
    () =>
      (localStorage.getItem("safentry_visitor_view_mode") as "list" | "grid") ||
      "list",
  );
  const [msgInput, setMsgInput] = useState("");

  // Staff code renewal
  const [_codeRenewalOpen, _setCodeRenewalOpen] = useState(false);
  const [_newCodeValue, _setNewCodeValue] = useState<string | null>(null);

  // Returning visitor suggestion
  const [returningSuggestion, setReturningSuggestion] =
    useState<Visitor | null>(null);

  // Approved visitor suggestion
  const [approvedSuggestion, setApprovedSuggestion] =
    useState<ApprovedVisitor | null>(null);

  // Trust score
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [visitorTrustScore, setVisitorTrustScore] = useState<number | null>(
    null,
  );

  // Uploaded documents for new visitor form
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [showCompanions, setShowCompanions] = useState(false);
  const [companions, setCompanions] = useState<
    { name: string; relationship: string; idNumber: string }[]
  >([]);

  // Checklist modal
  const [_checklistOpen, setChecklistOpen] = useState(false);
  const [_checklistType, setChecklistType] = useState<"start" | "end">("start");

  // Feature 1: Shift Handover Notes
  const [_shiftNoteModalOpen, setShiftNoteModalOpen] = useState(false);
  const [_shiftNoteInput, _setShiftNoteInput] = useState("");
  const [_shiftNotesViewOpen, setShiftNotesViewOpen] = useState(false);
  const [shiftNotesBanner, setShiftNotesBanner] = useState<number>(0); // unread count

  // Feature 5: Staff Tasks
  const [taskTab, setTaskTab] = useState<"all" | "mine" | "done">("all");
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [escalationModalInc, setEscalationModalInc] =
    useState<SecurityIncident | null>(null);
  const [incidentForm, setIncidentForm] = useState({
    title: "",
    description: "",
    location: "",
    severity: "medium" as SecurityIncident["severity"],
  });
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: "medium" as "high" | "medium" | "low",
  });
  const [tasks, setTasks] = useState<StaffTask[]>([]);

  // Daily appointments banner
  const [dailyBannerDismissed, setDailyBannerDismissed] = useState(false);
  const [showBriefing, setShowBriefing] = useState(() => {
    return !sessionStorage.getItem("safentry_briefing_dismissed");
  });

  // Parking assign
  const [_parkingModalVisitor, setParkingModalVisitor] =
    useState<Visitor | null>(null);

  // Exit rating modal
  const [postExitFeedbackVisitor, setPostExitFeedbackVisitor] =
    useState<Visitor | null>(null);
  const [postExitFeedbackRating, setPostExitFeedbackRating] = useState(0);
  const [postExitFeedbackComment, setPostExitFeedbackComment] = useState("");
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [exitModalVisitor, setExitModalVisitor] = useState<Visitor | null>(
    null,
  );
  const [exitRating, setExitRating] = useState(0);
  const [exitComment, setExitComment] = useState("");
  // Card return confirmation modal
  const [_cardReturnModalVisitor, setCardReturnModalVisitor] =
    useState<Visitor | null>(null);
  // Host review modal
  const [_hostReviewModalVisitor, setHostReviewModalVisitor] =
    useState<Visitor | null>(null);
  const [_hostReviewForm, setHostReviewForm] = useState({
    purposeAchieved: true,
    reinvite: true,
    note: "",
  });

  // Appointment form
  const [apptForm, setApptForm] = useState(EMPTY_APPT);

  // Gate pass modal
  const [_gateModalVisitor, setGateModalVisitor] = useState<Visitor | null>(
    null,
  );
  const [_selectedGate, setSelectedGate] = useState("Ana Giriş");
  const [_gateDirection, setGateDirection] = useState<"in" | "out">("in");

  // Badge reprint modal
  const [_reprintVisitor, setReprintVisitor] = useState<Visitor | null>(null);
  const [accessUpgradeVisitor, setAccessUpgradeVisitor] =
    useState<Visitor | null>(null);
  const [accessUpgradeZones, setAccessUpgradeZones] = useState<string[]>([]);
  const [accessUpgradeReason, setAccessUpgradeReason] = useState("");
  const [accessUpgradeDuration, setAccessUpgradeDuration] = useState<
    "1h" | "4h" | "8h" | "custom"
  >("1h");
  const [_reprintReason, setReprintReason] = useState<
    "Kayıp" | "Hasar Gördü" | "Diğer"
  >("Kayıp");
  const [_reprintNote, setReprintNote] = useState("");

  // Transfer modal
  const [_transferAppt, setTransferAppt] = useState<Appointment | null>(null);
  const [_transferTargetId, setTransferTargetId] = useState("");

  // Evacuation modal in staff
  const [_showEvacModal, setShowEvacModal] = useState(false);

  // Biometric verification modal
  const [_biometricModalVisitor, setBiometricModalVisitor] =
    useState<Visitor | null>(null);

  // Meeting rooms
  const meetingRooms = getMeetingRooms(session.companyId);
  const [apptError, setApptError] = useState("");
  const [apptTab, setApptTab] = useState<"today" | "create">("today");
  const [hostSuggestion, setHostSuggestion] = useState<{
    hostName: string;
    hostId: string;
  } | null>(null);

  // Notes dialog
  const [notesVisitor, setNotesVisitor] = useState<Visitor | null>(null);
  const [notesText, setNotesText] = useState("");

  // CSV Bulk Import
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [showCsvImportModal, setShowCsvImportModal] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState<string[]>([]);
  const [highContrast, setHighContrast] = useState(
    () => localStorage.getItem("safentry_high_contrast") === "1",
  );
  const toggleHighContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    if (next) {
      localStorage.setItem("safentry_high_contrast", "1");
      document.body.classList.add("high-contrast");
    } else {
      localStorage.removeItem("safentry_high_contrast");
      document.body.classList.remove("high-contrast");
    }
  };
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
  const [photoUploadProgress, setPhotoUploadProgress] = useState<number | null>(
    null,
  );
  const [docUploadProgress, setDocUploadProgress] = useState<number | null>(
    null,
  );
  const [_staffPhotoUploadProgress, _setStaffPhotoUploadProgress] = useState<
    number | null
  >(null);
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
  const [_absenceToggle, _setAbsenceToggle] = useState(
    staff?.isAbsent ?? false,
  );
  const [_absenceReason, _setAbsenceReason] = useState(
    staff?.absenceReason ?? "İzin",
  );
  const [_absentUntil, _setAbsentUntil] = useState(staff?.absentUntil ?? "");

  // Exit survey custom answers
  const [exitSurveyAnswers, setExitSurveyAnswers] = useState<
    Record<string, string>
  >({});

  // Shift report
  const [shiftReportOpen, setShiftReportOpen] = useState(false);
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [healthPassed, setHealthPassed] = useState<boolean | null>(null);

  // Re-invite modal
  const [reinviteModalVisitor, setReinviteModalVisitor] =
    useState<Visitor | null>(null);
  const [staffProfilePhoto, setStaffProfilePhoto] = useState(() =>
    getStaffPhoto(session.staffId ?? ""),
  );

  // Punch in/out
  const [punchLog, setPunchLog] = useState<PunchRecord[]>(() =>
    getPunchLog(session.companyId),
  );

  // Visitor name autocomplete
  const [nameQuery, setNameQuery] = useState("");
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);

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

  // QR Scanner
  const [_showQrScan, setShowQrScan] = useState(false);
  const [_qrScanResultVisitor, setQrScanResultVisitor] = useState<
    Visitor | null | "notfound"
  >(null);
  const _qrScanner = useQRScanner({
    facingMode: "environment",
  });

  // Belongings tracking
  const [belongingsForm, setBelongingsForm] = useState<
    { id: string; itemType: string; description: string; quantity: number }[]
  >([]);

  // Host approval
  const [apptRejectId, setApptRejectId] = useState<string | null>(null);
  const [apptRejectReason, setApptRejectReason] = useState("");

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

  const reloadIncidents = useCallback(() => {
    setIncidents(getIncidents(session.companyId));
  }, [session.companyId]);

  const reload = useCallback(() => {
    setVisitors(getVisitors(session.companyId));
    setStaffList(getStaffByCompany(session.companyId));
    setAppointments(getAppointments(session.companyId));
    setInvitations(
      getInvitations(session.companyId).filter((i) => i.status === "submitted"),
    );
    setMessages(getStaffMessages(session.companyId));
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

  // Feature 1: Load shift notes and check for unread on mount
  useEffect(() => {
    const key = `safentry_shift_notes_${session.companyId}`;
    const notes: ShiftNote[] = JSON.parse(localStorage.getItem(key) ?? "[]");
    const unread = notes.filter(
      (n) => !n.read && n.authorCode !== session.staffId,
    ).length;
    setShiftNotesBanner(unread);
  }, [session.companyId, session.staffId]);

  // Feature 5: Load tasks
  useEffect(() => {
    const key = `safentry_tasks_${session.companyId}`;
    const saved: StaffTask[] = JSON.parse(localStorage.getItem(key) ?? "[]");
    setTasks(saved);
  }, [session.companyId]);

  // Feature 2: Appointment reminders every 5 minutes
  useEffect(() => {
    const checkApptReminders = () => {
      const allAppts = getAppointments(session.companyId);
      const notifiedKey = `safentry_notified_appts_${session.companyId}`;
      const notified: string[] = JSON.parse(
        localStorage.getItem(notifiedKey) ?? "[]",
      );
      const now = Date.now();
      const in30 = now + 30 * 60 * 1000;
      for (const appt of allAppts) {
        if (appt.status === "cancelled") continue;
        const apptTime = new Date(
          `${appt.appointmentDate}T${appt.appointmentTime ?? "00:00"}`,
        ).getTime();
        if (apptTime > now && apptTime <= in30 && !notified.includes(appt.id)) {
          addNotification({
            id: generateId(),
            companyId: session.companyId,
            type: "kiosk_pending",
            message: `⏰ 30 dk içinde randevu: ${appt.visitorName} — ${appt.hostName ?? ""}`,
            createdAt: Date.now(),
            read: false,
          });
          notified.push(appt.id);
          localStorage.setItem(notifiedKey, JSON.stringify(notified));
        }
      }
    };
    checkApptReminders();
    const t3 = setInterval(checkApptReminders, 5 * 60 * 1000);
    return () => clearInterval(t3);
  }, [session.companyId]);

  // Tick every minute for live elapsed time
  useEffect(() => {
    const t2 = setInterval(() => setTick((x) => x + 1), 60000);
    return () => clearInterval(t2);
  }, []);

  // Check for unread announcements
  useEffect(() => {
    const readKey = `safentry_ann_read_${session.companyId}`;
    const readIds: string[] = JSON.parse(localStorage.getItem(readKey) ?? "[]");
    const allAnns = getAnnouncements(session.companyId);
    const unread = allAnns.filter((a) => !readIds.includes(a.id));
    setUnreadAnnouncements(unread.map((a) => a.message));
  }, [session.companyId]);
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
    const sessionId = localStorage.getItem(
      `safentry_current_session_id_${session.staffId}`,
    );
    if (sessionId && session.staffId && session.companyId) {
      updateStaffSessionLogout(session.companyId, sessionId);
      localStorage.removeItem(`safentry_current_session_id_${session.staffId}`);
    }
    clearSession();
    onNavigate("welcome");
  };

  const setAvail = (status: Staff["availabilityStatus"]) => {
    setAvailability(status);
    if (staff) saveStaff({ ...staff, availabilityStatus: status });
  };

  const _saveAbsenceSettings = (
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
      // Compute trust score
      const score = computeVisitorTrustScore(session.companyId, val);
      setVisitorTrustScore(score);
    } else {
      setReturningSuggestion(null);
      setApprovedSuggestion(null);
      setVisitorTrustScore(null);
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
    if (form.idNumber.length === 11 && !validateTcId(form.idNumber)) {
      setFormError(
        "Geçersiz TC Kimlik Numarası. Lütfen kontrol edip tekrar deneyin.",
      );
      return;
    }
    // Department quota check
    if (form.department) {
      const depts = getDepartments(session.companyId);
      const dept = depts.find((d) => d.name === form.department);
      if (dept?.dailyQuota && dept.dailyQuota > 0) {
        const used = getDeptTodayVisitorCount(session.companyId, dept.name);
        if (used >= dept.dailyQuota) {
          setFormError(
            `${dept.name} departmanı günlük kotaya ulaştı (${dept.dailyQuota}/${dept.dailyQuota} ziyaretçi).`,
          );
          return;
        }
      }
    }
    if (!form.department || !form.floor) {
      setFormError("Departman ve kat seçimi zorunludur.");
      return;
    }
    if (!form.ndaAccepted) {
      setFormError("Gizlilik sözleşmesini onaylamanız gerekiyor.");
      return;
    }
    if (company?.ishgEnabled && !form.ishgAccepted) {
      setFormError(
        "İSG Sağlık ve Güvenlik Beyannamesini onaylamanız gerekiyor.",
      );
      return;
    }
    if (company?.visitorPolicyEnabled && !form.policyAccepted) {
      setFormError("Ziyaretçi politikasını okuyup kabul etmeniz gerekiyor.");
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
    const _blMatched = isBlacklisted(session.companyId, form.idNumber);
    // Feature 3: Log blacklist attempt
    {
      const blKey = `safentry_blacklist_attempts_${session.companyId}`;
      const blLog: BlacklistAttempt[] = JSON.parse(
        localStorage.getItem(blKey) ?? "[]",
      );
      blLog.unshift({
        id: generateId(),
        checkedTC: form.idNumber,
        checkedName: form.name,
        matchFound: _blMatched,
        matchedEntry: _blMatched ? form.idNumber : undefined,
        checkedBy: staff?.name ?? session.staffId,
        checkedAt: Date.now(),
      });
      localStorage.setItem(blKey, JSON.stringify(blLog.slice(0, 500)));
    }
    if (_blMatched) {
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
      accessCardNumber: form.accessCardNumber?.trim() || undefined,
      ishgAccepted: form.ishgAccepted || undefined,
      uploadedDocuments: uploadedDocs.length > 0 ? uploadedDocs : undefined,
      emergencyContactName: form.emergencyContactName?.trim() || undefined,
      emergencyContactPhone: form.emergencyContactPhone?.trim() || undefined,
      zonePermissions:
        form.zonePermissions.length > 0 ? form.zonePermissions : undefined,
      companions:
        companions.filter((c) => c.name.trim()).length > 0
          ? companions.filter((c) => c.name.trim())
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
    // Save belongings
    for (const b of belongingsForm) {
      saveBelonging({
        id: generateId(),
        companyId: session.companyId,
        visitorId: visitor.visitorId,
        visitorName: visitor.name,
        itemType: b.itemType,
        description: b.description || undefined,
        quantity: b.quantity,
        takenAt: Date.now(),
        takenBy: session.staffId ?? "",
      });
    }
    setBelongingsForm([]);
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
    setUploadedDocs([]);
    setCompanions([]);
    setShowCompanions(false);
    setVisitorTrustScore(null);
    setPendingVisitorData(null);
    setShowIdVerify(false);
    toast.success("Ziyaretçi başarıyla kaydedildi");
    // Host auto-arrival notification
    if (visitor.hostStaffId && visitor.hostStaffId !== session.staffId) {
      addNotification({
        id: Math.random().toString(36).substring(2, 9),
        companyId: session.companyId,
        type: "info",
        message: `🚪 Ziyaretçiniz ${visitor.name} geldi - lütfen karşılayın`,
        createdAt: Date.now(),
        read: false,
        relatedId: visitor.visitorId,
      });
    }
    // Biometric check trigger
    if (
      visitor.visitorPhoto &&
      isBiometricRequired(session.companyId, visitor.category)
    ) {
      setTimeout(() => setBiometricModalVisitor(visitor), 500);
    }
    // VIP escort protocol
    if (visitor.label === "vip" && company?.vipEscortEnabled) {
      toast("🌟 VIP Ziyaretçi — Güvenlik Eşliği Gerekli!", {
        duration: 8000,
        style: {
          background: "#0f172a",
          color: "#fbbf24",
          border: "2px solid rgba(245,158,11,0.6)",
        },
      });
    }
    // Accessibility routing notification
    if (visitor.specialNeeds?.trim()) {
      addNotification({
        id: Math.random().toString(36).substring(2, 9),
        companyId: session.companyId,
        type: "info",
        message: `♿ Erişilebilir giriş yönlendirmesi: ${visitor.name} — ${visitor.specialNeeds}`,
        createdAt: Date.now(),
        read: false,
        relatedId: visitor.visitorId,
      });
      toast("♿ Erişilebilir giriş yönlendirmesi gerekiyor", {
        style: {
          background: "#0f172a",
          color: "#38bdf8",
          border: "1px solid rgba(56,189,248,0.4)",
        },
      });
    }
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
    const departedVisitor = {
      ...exitModalVisitor,
      status: "departed" as const,
      departureTime: Date.now(),
    };
    setExitModalVisitor(null);
    setExitRating(0);
    setExitComment("");
    setEquipmentReturnChecked(false);
    toast.success("Çıkış kaydedildi");
    // Show post-exit feedback modal
    setPostExitFeedbackVisitor(departedVisitor);
    setPostExitFeedbackRating(0);
    setPostExitFeedbackComment("");
    // Host review trigger
    if (
      departedVisitor.hostStaffId &&
      session?.staffId &&
      departedVisitor.hostStaffId === session.staffId
    ) {
      setHostReviewForm({ purposeAchieved: true, reinvite: true, note: "" });
      setHostReviewModalVisitor(departedVisitor);
    }
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
    if (v.accessCardNumber && v.accessCardReturned !== true) {
      setCardReturnModalVisitor(v);
    } else {
      openExitModal(v);
    }
  };

  const downloadPDF = async (v: Visitor) => {
    setPdfLoading(v.visitorId);
    try {
      const hostName = staffList.find((s) => s.staffId === v.hostStaffId)?.name;
      await generateVisitorBadgePDF(
        v,
        company?.name ?? "Safentry",
        hostName,
        false,
        v.visitorLanguage,
      );
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
        v.visitorLanguage,
      );
      toast.success("Rozet yazdırıldı");
    } catch (err) {
      console.error("Print failed", err);
      toast.error("Rozet yazdırılırken hata oluştu");
    } finally {
      setPdfLoading(null);
    }
  };

  // Appointment conflict detection
  const checkApptConflict = (hostName: string, date: string, time: string) => {
    if (!hostName || !date || !time) {
      setApptConflict(null);
      return;
    }
    const [h, m] = time.split(":").map(Number);
    const apptMinutes = h * 60 + m;
    const existing = getAppointments(session.companyId).filter(
      (a) =>
        a.hostName === hostName &&
        a.appointmentDate === date &&
        a.status !== "cancelled",
    );
    const conflict = existing.find((a) => {
      const [ah, am] = (a.appointmentTime ?? "00:00").split(":").map(Number);
      return Math.abs(ah * 60 + am - apptMinutes) < 60;
    });
    if (conflict)
      setApptConflict(`${conflict.visitorName} — ${conflict.appointmentTime}`);
    else setApptConflict(null);
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
    const hostStaffMatch = staffList.find((s) => s.name === apptForm.hostName);
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
      hostStaffId: hostStaffMatch?.staffId,
      hostApprovalStatus: hostStaffMatch ? "pending" : undefined,
      meetingRoomId: apptForm.meetingRoomId || undefined,
      attendees: apptForm.attendees.length > 0 ? apptForm.attendees : undefined,
    };
    // Check working hours / holidays
    const workCheck = isDateTimeOutsideWorkHours(
      session.companyId,
      apptForm.appointmentDate,
      apptForm.appointmentTime,
    );
    if (workCheck.outside) {
      toast.warning(
        `⚠️ Uyarı: ${workCheck.reason}. Randevu yine de oluşturuldu.`,
      );
    }
    saveAppointment(baseAppt);
    // Generate shareable confirmation link
    setLastCreatedApptLink(
      `${window.location.origin}/confirm/${btoa(baseAppt.id)}`,
    );

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
    // Initialize approval chain if enabled
    (() => {
      const chainCfg = getApprovalChainConfig(session.companyId);
      if (chainCfg.enabled && chainCfg.steps.length > 0) {
        const chain: ApprovalChainStep[] = chainCfg.steps.map((role) => ({
          role,
          status: "pending" as const,
        }));
        saveAppointment({ ...baseAppt, approvalChain: chain });
      }
    })();
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
    setKioskApprovalStatus(v.visitorId, "approved");
    removeFromQueue(session.companyId, v.visitorId);
    toast.success(`${v.name} giriş için onaylandı`);
    // Host auto-arrival notification for kiosk approval
    if (visitor.hostStaffId && visitor.hostStaffId !== session.staffId) {
      addNotification({
        id: Math.random().toString(36).substring(2, 9),
        companyId: session.companyId,
        type: "info",
        message: `🚪 Ziyaretçiniz ${v.name} geldi - lütfen karşılayın`,
        createdAt: Date.now(),
        read: false,
        relatedId: visitor.visitorId,
      });
    }
    reload();
  };

  const rejectKioskVisitor = (v: KioskPendingVisitor, reason?: string) => {
    addAuditLog(
      session.companyId,
      staff?.name ?? "Personel",
      session.staffId ?? "",
      "kiosk_rejected",
      `${v.name} kiosk başvurusu reddedildi${reason ? `: ${reason}` : ""}`,
    );
    const all: KioskPendingVisitor[] = JSON.parse(
      localStorage.getItem(KIOSK_PENDING_KEY) ?? "[]",
    );
    const updated = all.filter((x) => x.visitorId !== v.visitorId);
    localStorage.setItem(KIOSK_PENDING_KEY, JSON.stringify(updated));
    setKioskApprovalStatus(
      v.visitorId,
      "rejected",
      reason || "Güvenlik tarafından reddedildi",
    );
    removeFromQueue(session.companyId, v.visitorId);
    toast.error(`${v.name} girişi reddedildi`);
    reload();
  };

  // Re-invite visitor pre-fill
  const openReinvite = (v: Visitor) => {
    setReinviteModalVisitor(v);
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

  const _approveGuestInvitation = (inv: Invitation) => {
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
    (() => {
      const myPendingApprovals = appointments.filter(
        (a) =>
          a.hostStaffId === session.staffId &&
          a.hostApprovalStatus === "pending",
      ).length;
      return [
        "appointments" as Tab,
        `📅 Randevular (${todayAppointments.length})${myPendingApprovals > 0 ? ` ⏳${myPendingApprovals}` : ""}`,
      ] as [Tab, string];
    })(),
    ["preregistered", t(lang, "preregistered")],
    ["history", "📜 Geçmiş"],
    [
      "invitations",
      `✉️ Davetler${invitations.length > 0 ? ` (${invitations.length})` : ""}`,
    ],
    ["patrol" as Tab, "🗺️ Devriye Logu"] as [Tab, string],
    ["maintenance" as Tab, "🔧 Bakım Talepleri"] as [Tab, string],
    ["handover" as Tab, "🔄 Devir-Teslim"] as [Tab, string],
    ["shiftswap" as Tab, "🔀 Vardiya Değişim"] as [Tab, string],
    ["imptasks" as Tab, "📋 İyileştirme Görevlerim"] as [Tab, string],
    ["profile", "Hesabım"],
    (() => {
      const myPending = tasks.filter(
        (t) => !t.done && t.assignedTo === session.staffId,
      ).length;
      return [
        "gorevler" as Tab,
        `📋 Görevler${myPending > 0 ? ` (${myPending})` : ""}`,
      ] as [Tab, string];
    })(),
    ["mycalendar" as Tab, "📅 Takvimim"] as [Tab, string],
    ["messages" as Tab, "💬 Mesajlar"] as [Tab, string],
    ["training" as Tab, "🎓 Eğitim"] as [Tab, string],
    ["queue" as Tab, "🔢 Bekleme Sırası"] as [Tab, string],
    ["punchin" as Tab, "⏱️ Mesai Takibi"] as [Tab, string],
  ];

  return (
    <>
      {/* CSV Import Modal */}
      {showCsvImportModal && (
        <CsvImportModal
          companyId={session.companyId}
          onClose={() => setShowCsvImportModal(false)}
          onImported={() => {
            setShowCsvImportModal(false);
            reload();
          }}
        />
      )}

      {/* Daily Briefing */}
      {showBriefing && (
        <DailyBriefing
          companyId={session.companyId}
          visitors={visitors}
          appointments={appointments}
          onDismiss={() => {
            sessionStorage.setItem("safentry_briefing_dismissed", "1");
            setShowBriefing(false);
          }}
        />
      )}
      {/* Re-invite Modal */}
      {reinviteModalVisitor && (
        <ReinviteModal
          visitor={reinviteModalVisitor}
          companyId={session.companyId}
          staffId={session.staffId ?? ""}
          staffList={staffList}
          onClose={() => setReinviteModalVisitor(null)}
          onCreated={reload}
        />
      )}
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
      <div
        id="main-content"
        className="min-h-screen"
        style={{ background: "#0a0f1e" }}
      >
        {/* Training Warning Banner */}
        {session.staffId &&
          !getTrainingCompletionStatus(session.staffId).allDone && (
            <button
              type="button"
              data-ocid="staff_dashboard.training_warning"
              className="w-full flex items-center justify-between gap-3 px-6 py-2.5 text-sm cursor-pointer"
              style={{
                background: "rgba(20,184,166,0.1)",
                borderBottom: "1px solid rgba(20,184,166,0.3)",
              }}
              onClick={() => setTab("training")}
            >
              <span className="text-teal-300">
                🎓 Tamamlanmamış eğitim modülünüz var (
                {getTrainingCompletionStatus(session.staffId).completed}/
                {getTrainingCompletionStatus(session.staffId).total}{" "}
                tamamlandı). Eğitim sekmesini açmak için tıklayın.
              </span>
              <span className="text-teal-400 text-xs font-semibold">
                Eğitime Git →
              </span>
            </button>
          )}

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
        {handoverModalOpen && (
          <ShiftHandoverModal
            companyId={session.companyId}
            staffName={staff?.name ?? ""}
            staffCode={staff?.staffId ?? session.staffId ?? ""}
            onClose={() => setHandoverModalOpen(false)}
          />
        )}
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

              {/* Belongings return step */}
              {(() => {
                const vBelongings = exitModalVisitor
                  ? getVisitorBelongings(
                      session.companyId,
                      exitModalVisitor.visitorId,
                    ).filter((b) => !b.returnedAt)
                  : [];
                if (vBelongings.length === 0) return null;
                return (
                  <div className="my-4 p-4 rounded-xl border border-amber-500/40 bg-amber-900/15">
                    <p className="text-amber-400 font-semibold text-sm mb-2">
                      📦 Emanet İadesi ({vBelongings.length} kalem)
                    </p>
                    <div className="space-y-2">
                      {vBelongings.map((b) => (
                        <label
                          key={b.id}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            data-ocid="exit.belonging_return.checkbox"
                            type="checkbox"
                            className="w-4 h-4 accent-[#f59e0b]"
                            onChange={(e) => {
                              if (e.target.checked) {
                                saveBelonging({
                                  ...b,
                                  returnedAt: Date.now(),
                                  returnedBy: session.staffId ?? "",
                                });
                              }
                            }}
                          />
                          <span className="text-slate-200 text-sm">
                            {b.itemType}
                            {b.description ? ` — ${b.description}` : ""} (×
                            {b.quantity})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })()}
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

        {/* Post-Exit Feedback Modal */}
        {postExitFeedbackVisitor && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)" }}
            data-ocid="post_exit_feedback.modal"
          >
            <div
              className="w-full max-w-sm p-7 rounded-2xl text-center"
              style={{
                background: "#1e293b",
                border: "1.5px solid rgba(14,165,233,0.3)",
              }}
            >
              <div className="text-4xl mb-3">✅</div>
              <h3 className="text-white font-bold text-lg mb-1">
                Ziyaretiniz Tamamlandı!
              </h3>
              <p className="text-slate-400 text-sm mb-5">
                {postExitFeedbackVisitor.name} — memnuniyet değerlendirmesi
              </p>
              <div className="flex justify-center mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    data-ocid={`post_exit_feedback.star.${star}`}
                    onClick={() => setPostExitFeedbackRating(star)}
                    className="text-3xl px-1 transition-transform hover:scale-110"
                    style={{
                      color:
                        star <= postExitFeedbackRating
                          ? "#f59e0b"
                          : "rgba(255,255,255,0.2)",
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                data-ocid="post_exit_feedback.comment.textarea"
                value={postExitFeedbackComment}
                onChange={(e) => setPostExitFeedbackComment(e.target.value)}
                rows={2}
                placeholder="Ek yorum (isteğe bağlı)..."
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm resize-none focus:outline-none mb-4"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  data-ocid="post_exit_feedback.skip_button"
                  onClick={() => setPostExitFeedbackVisitor(null)}
                  className="flex-1 py-2.5 rounded-xl text-slate-300 text-sm font-medium"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  Geç
                </button>
                <button
                  type="button"
                  data-ocid="post_exit_feedback.save_button"
                  disabled={postExitFeedbackRating === 0}
                  onClick={() => {
                    if (postExitFeedbackRating > 0) {
                      saveVisitor({
                        ...postExitFeedbackVisitor,
                        exitRating: postExitFeedbackRating,
                        exitComment:
                          postExitFeedbackComment.trim() || undefined,
                      });
                      // Auto-create improvement task for low scores
                      if (postExitFeedbackRating <= 3) {
                        const hostStaff =
                          staffList.find(
                            (s) =>
                              s.staffId === postExitFeedbackVisitor.hostStaffId,
                          ) ?? staff;
                        if (hostStaff) {
                          saveImprovementTask({
                            id: generateId(),
                            companyId: session.companyId,
                            assignedToCode: hostStaff.staffId,
                            assignedToName: hostStaff.name,
                            visitorName: postExitFeedbackVisitor.name,
                            visitorId: postExitFeedbackVisitor.visitorId,
                            satisfactionScore: postExitFeedbackRating,
                            visitorFeedback:
                              postExitFeedbackComment.trim() || undefined,
                            createdAt: Date.now(),
                            dueDate: Date.now() + 3 * 24 * 60 * 60 * 1000,
                            status: "open",
                          });
                        }
                      }
                      toast.success("Değerlendirme kaydedildi");
                    }
                    setPostExitFeedbackVisitor(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
                  style={{
                    background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                  }}
                >
                  Anketi Kaydet
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

        {/* Group Registration Modal */}
        {groupModalOpen && (
          <div
            data-ocid="group_registration.dialog"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6"
              style={{
                background: "#0f1729",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold text-lg">
                  👥 Grup Ziyaretçi Kaydı
                </h3>
                <button
                  type="button"
                  data-ocid="group_registration.close_button"
                  onClick={() => setGroupModalOpen(false)}
                  className="text-slate-400 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="col-span-2">
                  <p className="text-slate-400 text-xs mb-1">Grup Adı</p>
                  <input
                    value={groupForm.groupName}
                    onChange={(e) =>
                      setGroupForm((f) => ({ ...f, groupName: e.target.value }))
                    }
                    placeholder="Örn: ABC Ltd. Teknik Ekibi"
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                  />
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">
                    Ev Sahibi Personel
                  </p>
                  <select
                    value={groupForm.hostStaffId}
                    onChange={(e) =>
                      setGroupForm((f) => ({
                        ...f,
                        hostStaffId: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#1e293b] border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                  >
                    <option value="">Seçiniz</option>
                    {staffList
                      .filter((s) => !s.isAbsent)
                      .map((s) => (
                        <option key={s.staffId} value={s.staffId}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Kategori</p>
                  <select
                    value={groupForm.category}
                    onChange={(e) =>
                      setGroupForm((f) => ({ ...f, category: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#1e293b] border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                  >
                    {getCustomCategories(session.companyId).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Departman</p>
                  <select
                    value={groupForm.department}
                    onChange={(e) =>
                      setGroupForm((f) => ({
                        ...f,
                        department: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#1e293b] border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                  >
                    <option value="">Seçiniz</option>
                    {getCompanyDepartments(session.companyId).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Kat</p>
                  <select
                    value={groupForm.floor}
                    onChange={(e) =>
                      setGroupForm((f) => ({ ...f, floor: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#1e293b] border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                  >
                    <option value="">Seçiniz</option>
                    {getCompanyFloors(session.companyId).map((fl) => (
                      <option key={fl} value={fl}>
                        {fl}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 text-xs mb-1">Ziyaret Nedeni</p>
                  <input
                    value={groupForm.visitReason}
                    onChange={(e) =>
                      setGroupForm((f) => ({
                        ...f,
                        visitReason: e.target.value,
                      }))
                    }
                    placeholder="Toplantı, denetim..."
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                  />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="groupNda"
                    checked={groupForm.ndaAccepted}
                    onChange={(e) =>
                      setGroupForm((f) => ({
                        ...f,
                        ndaAccepted: e.target.checked,
                      }))
                    }
                    className="rounded"
                  />
                  <label
                    htmlFor="groupNda"
                    className="text-slate-300 text-sm cursor-pointer"
                  >
                    NDA/KVKK okundu ve onaylandı
                  </label>
                </div>
              </div>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-300 text-sm font-medium">
                    Ziyaretçiler ({groupForm.visitors.length})
                  </p>
                  {groupForm.visitors.length < 10 && (
                    <button
                      type="button"
                      onClick={() =>
                        setGroupForm((f) => ({
                          ...f,
                          visitors: [...f.visitors, { name: "", idNumber: "" }],
                        }))
                      }
                      className="px-3 py-1 rounded-lg text-xs font-medium text-white"
                      style={{
                        background: "rgba(14,165,233,0.15)",
                        border: "1px solid rgba(14,165,233,0.3)",
                      }}
                    >
                      + Kişi Ekle
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {groupForm.visitors.map((v, i) => (
                    <div
                      key={`grp-${v.idNumber || i}`}
                      data-ocid={`group_registration.visitor.${i + 1}`}
                      className="flex gap-2 items-center"
                    >
                      <span className="text-slate-500 text-xs w-5 text-right">
                        {i + 1}.
                      </span>
                      <input
                        value={v.name}
                        onChange={(e) =>
                          setGroupForm((f) => ({
                            ...f,
                            visitors: f.visitors.map((x, j) =>
                              j === i ? { ...x, name: e.target.value } : x,
                            ),
                          }))
                        }
                        placeholder="Ad Soyad"
                        className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                      />
                      <input
                        value={v.idNumber}
                        onChange={(e) =>
                          setGroupForm((f) => ({
                            ...f,
                            visitors: f.visitors.map((x, j) =>
                              j === i ? { ...x, idNumber: e.target.value } : x,
                            ),
                          }))
                        }
                        placeholder="TC Kimlik No"
                        maxLength={11}
                        className="w-36 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm font-mono focus:outline-none focus:border-[#0ea5e9]"
                      />
                      {groupForm.visitors.length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            setGroupForm((f) => ({
                              ...f,
                              visitors: f.visitors.filter((_, j) => j !== i),
                            }))
                          }
                          className="text-red-400 hover:text-red-300 px-2 py-1 rounded text-sm"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <button
                type="button"
                data-ocid="group_registration.submit_button"
                disabled={groupSubmitting}
                onClick={() => {
                  const validVisitors = groupForm.visitors.filter(
                    (v) => v.name.trim() && v.idNumber.trim(),
                  );
                  if (validVisitors.length === 0) {
                    toast.error("En az bir ziyaretçi bilgisi giriniz");
                    return;
                  }
                  if (!groupForm.hostStaffId) {
                    toast.error("Ev sahibi personel seçiniz");
                    return;
                  }
                  if (!groupForm.ndaAccepted) {
                    toast.error("NDA/KVKK onayı gereklidir");
                    return;
                  }
                  setGroupSubmitting(true);
                  const groupId = generateId();
                  const _hostStaff = staffList.find(
                    (s) => s.staffId === groupForm.hostStaffId,
                  );
                  const savedMembers = validVisitors
                    .filter(
                      (vis) => !isBlacklisted(session.companyId, vis.idNumber),
                    )
                    .map((vis) => {
                      const newV: Visitor = {
                        visitorId: generateVisitorId(),
                        companyId: session.companyId,
                        registeredBy: session.staffId!,
                        name: vis.name.trim(),
                        idNumber: vis.idNumber.trim(),
                        phone: "",
                        hostStaffId: groupForm.hostStaffId,
                        arrivalTime: Date.now(),
                        visitReason: groupForm.visitReason,
                        visitType: "group",
                        ndaAccepted: groupForm.ndaAccepted,
                        signatureData: "",
                        label: "normal",
                        status: "active",
                        badgeQr: generateVisitorId(),
                        notes: groupId ? `Grup: ${groupForm.groupName}` : "",
                        category: groupForm.category,
                        department: groupForm.department,
                        floor: groupForm.floor,
                        createdAt: Date.now(),
                        groupId,
                      };
                      saveVisitor(newV);
                      return newV;
                    });
                  // Save VisitorGroup record
                  import("../components/VisitorGroupTab").then(
                    ({ saveVisitorGroup }) => {
                      saveVisitorGroup({
                        groupId,
                        companyId: session.companyId,
                        groupName: groupForm.groupName,
                        leaderName: savedMembers[0]?.name ?? "",
                        memberIds: savedMembers.map((v) => v.visitorId),
                        createdAt: Date.now(),
                        status: "active",
                      });
                    },
                  );
                  setVisitors(getVisitors(session.companyId));
                  toast.success(
                    `✅ ${validVisitors.length} ziyaretçi kaydedildi! Grup: ${groupForm.groupName}`,
                  );
                  setGroupSubmitting(false);
                  setGroupModalOpen(false);
                  setGroupForm({
                    groupName: "",
                    hostStaffId: "",
                    category: "Misafir",
                    department: "",
                    floor: "",
                    visitReason: "",
                    ndaAccepted: false,
                    visitors: [
                      { name: "", idNumber: "" },
                      { name: "", idNumber: "" },
                    ],
                  });
                }}
                className="w-full py-3 rounded-xl font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg,#22c55e,#16a34a)",
                }}
              >
                {groupSubmitting
                  ? "Kaydediliyor..."
                  : `👥 ${groupForm.visitors.filter((v) => v.name.trim()).length} Kişiyi Kaydet`}
              </button>
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
            {kioskPending.length > 0 && (
              <span
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white animate-pulse"
                style={{ background: "#f59e0b" }}
                title="Kiosk onayı bekleyen ziyaretçi"
              >
                {kioskPending.length}
              </span>
            )}
            <button
              type="button"
              title="Güvenlik Olayı Kaydet"
              onClick={() => setTab("incidents")}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-red-400 border border-red-500/30 hover:bg-red-900/20 transition-colors"
              data-ocid="staff.quick_incident.button"
            >
              🚨
            </button>
            <NotificationCenter companyId={session.companyId} />
            <GlobalSearch
              companyId={session.companyId}
              onNavigate={(t) => setTab(t as Tab)}
            />
            <button
              type="button"
              data-ocid="staff_dashboard.checklist_start.button"
              onClick={() => {
                setChecklistType("start");
                setChecklistOpen(true);
              }}
              title="Vardiya Başlangıç Kontrol"
              className="relative p-2 rounded-xl transition-all hover:bg-white/10"
              style={{ color: "#22c55e" }}
            >
              ✅
            </button>
            <button
              type="button"
              data-ocid="staff_dashboard.checklist_end.button"
              onClick={() => {
                setChecklistType("end");
                setChecklistOpen(true);
              }}
              title="Vardiya Bitiş Kontrol"
              className="relative p-2 rounded-xl transition-all hover:bg-white/10"
              style={{ color: "#ef4444" }}
            >
              🔴
            </button>
            <button
              type="button"
              data-ocid="staff_dashboard.evacuation.button"
              onClick={() => setShowEvacModal(true)}
              title="Acil Tahliye Listesi"
              className="relative p-2 rounded-xl transition-all hover:bg-white/10"
              style={{ color: "#ef4444" }}
            >
              🚨
            </button>
            <button
              type="button"
              data-ocid="staff_dashboard.handover.open_modal_button"
              onClick={() => setHandoverModalOpen(true)}
              title="Vardiya Devir-Teslim Raporu"
              className="px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors"
              style={{
                color: "#0ea5e9",
                borderColor: "rgba(14,165,233,0.4)",
                background: "rgba(14,165,233,0.08)",
              }}
            >
              🔄 Devir
            </button>
            <button
              type="button"
              data-ocid="staff_dashboard.shift_note.button"
              onClick={() => setShiftNoteModalOpen(true)}
              title="Vardiya Notu Bırak"
              className="relative p-2 rounded-xl transition-all hover:bg-white/10"
              style={{ color: "#94a3b8" }}
            >
              📓
            </button>
            <button
              type="button"
              data-ocid="staff_dashboard.qr_scan.button"
              onClick={() => {
                setShowQrScan(true);
                setQrScanResultVisitor(null);
              }}
              title="QR Rozet Tara"
              className="relative p-2 rounded-xl transition-all hover:bg-white/10"
              style={{ color: "#0ea5e9" }}
            >
              🔍
            </button>
            <button
              type="button"
              data-ocid="staff_dashboard.self_reg_portal.button"
              onClick={() => {
                const loginCode =
                  findCompanyById(session.companyId)?.loginCode ?? "";
                copyToClipboard(
                  `${window.location.origin}/self-prereg/${loginCode}`,
                );
                toast.success("Self-Reg portal linki kopyalandı");
              }}
              title="Self-Reg Portal Linki Kopyala"
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-purple-300 border border-purple-500/30 hover:bg-purple-900/20 transition-colors"
              aria-label="Self-Reg Portal Linki Kopyala"
            >
              🔗
            </button>
            <button
              type="button"
              data-ocid="staff_dashboard.csv_import.open_modal_button"
              onClick={() => setShowCsvImportModal(true)}
              title="CSV ile Toplu Ziyaretçi Aktar"
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-green-300 border border-green-500/30 hover:bg-green-900/20 transition-colors"
              aria-label="CSV ile Toplu Ziyaretçi Aktar"
            >
              📥
            </button>
            <button
              type="button"
              data-ocid="staff_dashboard.high_contrast.toggle"
              onClick={toggleHighContrast}
              title={highContrast ? "Normal Görünüm" : "Yüksek Kontrast"}
              className="relative p-2 rounded-xl transition-all hover:bg-white/10"
              style={{ color: highContrast ? "#facc15" : "#94a3b8" }}
              aria-label={
                highContrast
                  ? "Normal görünüme geç"
                  : "Yüksek kontrast moduna geç"
              }
              aria-pressed={highContrast}
            >
              🌓
            </button>
            <LangSwitcher onChange={onRefresh} />
            <button
              type="button"
              data-ocid="staff_dashboard.help.button"
              onClick={() => setShowHelpCenter(true)}
              title="Yardu0131m Merkezi"
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 border border-white/15 hover:bg-white/10 transition-colors"
            >
              u2753 Yardu0131m
            </button>
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

        {/* Shift notes unread banner */}
        {showHelpCenter && (
          <HelpCenter onClose={() => setShowHelpCenter(false)} />
        )}

        {/* Announcement banner */}
        {unreadAnnouncements.length > 0 && (
          <div className="mx-6 mt-3 px-4 py-3 rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 flex items-center justify-between gap-3">
            <span className="text-amber-300 text-sm flex items-center gap-2">
              ud83dudce2 <strong>Duyuru:</strong> {unreadAnnouncements[0]}
              {unreadAnnouncements.length > 1 && (
                <span className="text-amber-400 text-xs">
                  (+{unreadAnnouncements.length - 1} daha)
                </span>
              )}
            </span>
            <button
              type="button"
              data-ocid="announcement.dismiss.button"
              onClick={() => {
                const readKey = `safentry_ann_read_${session.companyId}`;
                const allAnns = getAnnouncements(session.companyId);
                const ids = allAnns.map((a) => a.id);
                localStorage.setItem(readKey, JSON.stringify(ids));
                setUnreadAnnouncements([]);
              }}
              className="px-3 py-1 rounded-lg text-xs font-semibold text-white shrink-0"
              style={{
                background: "rgba(245,158,11,0.3)",
                border: "1px solid rgba(245,158,11,0.5)",
              }}
            >
              Tamam
            </button>
          </div>
        )}
        {shiftNotesBanner > 0 && (
          <div className="mx-6 mt-3 px-4 py-3 rounded-xl border border-[#0ea5e9]/30 bg-[#0ea5e9]/10 flex items-center justify-between gap-3">
            <span className="text-[#38bdf8] text-sm">
              📓 Önceki vardiyadan {shiftNotesBanner} okunmamış not var
            </span>
            <button
              type="button"
              data-ocid="shift_notes.view.button"
              onClick={() => setShiftNotesViewOpen(true)}
              className="px-3 py-1 rounded-lg text-xs font-semibold text-white"
              style={{
                background: "rgba(14,165,233,0.3)",
                border: "1px solid rgba(14,165,233,0.5)",
              }}
            >
              Notları Gör
            </button>
          </div>
        )}

        {/* Active visitors notification */}
        {activeVisitors.length > 0 && tab !== "active" && tab !== "inside" && (
          <div className="mx-6 mt-4 px-4 py-3 rounded-xl border border-[#0ea5e9]/20 bg-[#0ea5e9]/10 flex items-center gap-3">
            <span className="text-[#0ea5e9] text-sm">
              🟢 {activeVisitors.length} aktif ziyaretçi
            </span>
          </div>
        )}

        {/* Tabs - hidden on mobile, visible on desktop */}
        <div className="hidden md:flex overflow-x-auto gap-1 px-6 pt-4 border-b border-white/10">
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

        <div className="p-6 pb-24 md:pb-6">
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
                      <button
                        type="button"
                        data-ocid="register.digital_ticket.button"
                        onClick={() => {
                          const url = `${window.location.origin}/ticket/${registeredVisitor.visitorId}`;
                          navigator.clipboard
                            .writeText(url)
                            .then(() =>
                              toast.success("Dijital bilet linki kopyalandı"),
                            )
                            .catch(() => toast.error("Kopyalanamadı"));
                        }}
                        className="px-3 py-1.5 rounded-lg text-white text-xs font-medium"
                        style={{
                          background: "rgba(0,212,170,0.2)",
                          border: "1px solid rgba(0,212,170,0.4)",
                        }}
                      >
                        🎫 Dijital Bilet
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
                    data-ocid="register.group_registration.button"
                    onClick={() => setGroupModalOpen(true)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-2"
                    style={{
                      background: "rgba(34,197,94,0.15)",
                      border: "1px solid rgba(34,197,94,0.35)",
                    }}
                  >
                    👥 Grup Kaydı
                  </button>
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
                  <button
                    type="button"
                    data-ocid="register.reception_mode.button"
                    onClick={() => onNavigate("reception-desk")}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-2"
                    style={{
                      background: "rgba(245,158,11,0.15)",
                      border: "1px solid rgba(245,158,11,0.35)",
                    }}
                  >
                    🖥️ Resepsiyon Modu
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
              {returningSuggestion &&
                (() => {
                  const visitCount = visitors.filter(
                    (v) => v.idNumber === returningSuggestion.idNumber,
                  ).length;
                  const lastVisitDate = new Date(
                    returningSuggestion.createdAt,
                  ).toLocaleDateString("tr-TR");
                  return (
                    <div
                      data-ocid="register.returning_visitor.card"
                      className="mb-4 p-4 rounded-xl border border-[#f59e0b]/40 bg-[#f59e0b]/10 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-amber-400 text-sm font-semibold">
                          🔄 Tekrarlayan Ziyaretçi — {visitCount}. ziyaret
                        </p>
                        <p className="text-slate-300 text-xs mt-0.5">
                          {returningSuggestion.name} — Son ziyaret:{" "}
                          {lastVisitDate}
                        </p>
                        <p className="text-slate-400 text-xs">
                          Bilgileri otomatik doldur?
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
                          Bilgileri Doldur
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
                  );
                })()}

              {/* Approved visitor suggestion */}
              {approvedSuggestion && (
                <div
                  data-ocid="register.approved_visitor.card"
                  className="mb-4 p-4 rounded-xl border border-[#22c55e]/40 bg-[#22c55e]/10 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-emerald-400 text-sm font-semibold">
                      ✅ Onaylı Ziyaretçi
                      {approvedSuggestion.badgeValidDays &&
                        approvedSuggestion.badgeIssuedAt &&
                        (() => {
                          const rem = Math.ceil(
                            (approvedSuggestion.badgeIssuedAt +
                              approvedSuggestion.badgeValidDays * 86400000 -
                              Date.now()) /
                              86400000,
                          );
                          if (rem > 0)
                            return (
                              <span
                                className="ml-2 px-2 py-0.5 rounded-full text-xs"
                                style={{
                                  background: "rgba(34,197,94,0.2)",
                                  color: "#22c55e",
                                }}
                              >
                                Rozet Geçerli ({rem} gün kaldı)
                              </span>
                            );
                          return (
                            <span
                              className="ml-2 px-2 py-0.5 rounded-full text-xs"
                              style={{
                                background: "rgba(239,68,68,0.15)",
                                color: "#f87171",
                              }}
                            >
                              Rozet Süresi Dolmuş
                            </span>
                          );
                        })()}
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

              {/* OCR scan button */}
              <div className="mb-3">
                <button
                  type="button"
                  data-ocid="register.ocr_scan.button"
                  onClick={() => setShowOcrModal(true)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-2 transition-all"
                  style={{
                    background: "rgba(14,165,233,0.12)",
                    border: "1px solid rgba(14,165,233,0.3)",
                  }}
                >
                  📷 Kimlik Tara
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-300 text-sm mb-1 block">
                    {t(lang, "visitorName")} *
                  </p>
                  <div className="relative">
                    <input
                      data-ocid="register.name.input"
                      value={form.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm((f) => ({ ...f, name: val }));
                        setNameQuery(val);
                        setShowNameSuggestions(true);
                      }}
                      onBlur={() =>
                        setTimeout(() => setShowNameSuggestions(false), 150)
                      }
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#f59e0b]"
                    />
                    {showNameSuggestions &&
                      nameQuery.length >= 2 &&
                      (() => {
                        const nameSuggestions = visitors
                          .filter(
                            (v) =>
                              v.status === "departed" &&
                              v.name
                                .toLowerCase()
                                .includes(nameQuery.toLowerCase()),
                          )
                          .slice(0, 5);
                        return nameSuggestions.length > 0 ? (
                          <div
                            className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl overflow-hidden"
                            style={{
                              background: "#1e2a3a",
                              border: "1px solid rgba(14,165,233,0.3)",
                            }}
                          >
                            {nameSuggestions.map((v) => (
                              <button
                                type="button"
                                key={v.visitorId}
                                className="w-full px-4 py-2.5 text-left hover:bg-[rgba(14,165,233,0.1)] text-sm"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setForm((f) => ({
                                    ...f,
                                    name: v.name,
                                    phone: v.phone,
                                    visitType: v.visitType,
                                    category: v.category ?? f.category,
                                  }));
                                  setShowNameSuggestions(false);
                                  setNameQuery("");
                                }}
                              >
                                <span className="text-white font-medium">
                                  {v.name}
                                </span>
                                <span className="text-slate-400 text-xs ml-2">
                                  {v.phone}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : null;
                      })()}
                  </div>
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
                  {visitorTrustScore !== null && (
                    <div className="mt-2 flex items-center gap-3">
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{
                          background:
                            visitorTrustScore >= 80
                              ? "rgba(34,197,94,0.15)"
                              : visitorTrustScore >= 50
                                ? "rgba(245,158,11,0.15)"
                                : "rgba(239,68,68,0.15)",
                          border: `1px solid ${visitorTrustScore >= 80 ? "rgba(34,197,94,0.4)" : visitorTrustScore >= 50 ? "rgba(245,158,11,0.4)" : "rgba(239,68,68,0.4)"}`,
                          color:
                            visitorTrustScore >= 80
                              ? "#4ade80"
                              : visitorTrustScore >= 50
                                ? "#fbbf24"
                                : "#f87171",
                        }}
                      >
                        {visitorTrustScore >= 80
                          ? "🟢 Güvenilir"
                          : visitorTrustScore >= 50
                            ? "🟡 Orta"
                            : "🔴 Riskli"}
                        <span className="opacity-70">
                          ({visitorTrustScore}/100)
                        </span>
                      </div>
                    </div>
                  )}
                  {visitorTrustScore !== null && visitorTrustScore < 40 && (
                    <div
                      className="mt-2 p-3 rounded-lg text-xs"
                      style={{
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.3)",
                        color: "#f87171",
                      }}
                    >
                      ⚠️ Yüksek riskli ziyaretçi - ek güvenlik kontrolü önerilir
                    </div>
                  )}
                  {isBlacklisted(session.companyId, form.idNumber) && (
                    <div
                      className="mt-2 px-3 py-2 rounded-lg text-xs font-medium"
                      style={{
                        background: "rgba(245,158,11,0.1)",
                        border: "1px solid rgba(245,158,11,0.3)",
                        color: "#fbbf24",
                      }}
                    >
                      ⚠️ Bu kişi kara listede bulunmaktadır!
                    </div>
                  )}
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
                {/* Branch */}
                {getBranches(session.companyId).length > 1 && (
                  <div>
                    <p className="text-slate-300 text-sm mb-1 block">Şube</p>
                    <select
                      data-ocid="register.branch.select"
                      value={form.customFieldValues?.branch ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          customFieldValues: {
                            ...f.customFieldValues,
                            branch: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-4 py-3 rounded-xl bg-[#0f1729] border border-white/20 text-white focus:outline-none"
                    >
                      <option value="" className="bg-[#0f1729]">
                        Ana Şube
                      </option>
                      {getBranches(session.companyId).map((b) => (
                        <option
                          key={b.id}
                          value={b.id}
                          className="bg-[#0f1729]"
                        >
                          {b.name}
                          {b.isMain ? " (Ana)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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
                {/* Entry Point Hint */}
                {form.category &&
                  (() => {
                    const ep = findEntryPointForCategory(
                      session.companyId,
                      form.category,
                    );
                    if (!ep) return null;
                    return (
                      <div
                        className="col-span-2 p-3 rounded-xl text-sm flex items-start gap-2"
                        style={{
                          background: "rgba(14,165,233,0.08)",
                          border: "1px solid rgba(14,165,233,0.3)",
                        }}
                      >
                        <span className="text-xl">📍</span>
                        <div>
                          <p className="text-sky-300 font-semibold">
                            Giriş Noktası: {ep.name}
                          </p>
                          {ep.instructions && (
                            <p className="text-slate-300 text-xs mt-0.5">
                              {ep.instructions}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
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
                    💳 Erişim Kartı No (isteğe bağlı)
                  </p>
                  <input
                    data-ocid="register.access_card.input"
                    type="text"
                    value={form.accessCardNumber}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        accessCardNumber: e.target.value,
                      }))
                    }
                    placeholder="Örn: T-047"
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <p className="text-slate-300 text-sm mb-1 block">
                    🚨 Acil İletişim Kişi Adı (isteğe bağlı)
                  </p>
                  <input
                    data-ocid="register.emergency_name.input"
                    type="text"
                    value={form.emergencyContactName}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        emergencyContactName: e.target.value,
                      }))
                    }
                    placeholder="Kişi adı soyadı"
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <p className="text-slate-300 text-sm mb-1 block">
                    📞 Acil İletişim Telefon (isteğe bağlı)
                  </p>
                  <input
                    data-ocid="register.emergency_phone.input"
                    type="tel"
                    value={form.emergencyContactPhone}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        emergencyContactPhone: e.target.value,
                      }))
                    }
                    placeholder="0555 000 0000"
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none text-sm"
                  />
                </div>
                {/* Zone Permissions */}
                {(() => {
                  const zones = getZones(session.companyId);
                  if (zones.length === 0) return null;
                  return (
                    <div>
                      <p className="text-slate-300 text-sm mb-2 block">
                        🗺️ Erişim İzinleri (Bölgeler)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {zones.map((zone) => {
                          const checked = form.zonePermissions.includes(
                            zone.id,
                          );
                          return (
                            <button
                              key={zone.id}
                              type="button"
                              data-ocid="register.zone_permission.toggle"
                              onClick={() =>
                                setForm((f) => ({
                                  ...f,
                                  zonePermissions: checked
                                    ? f.zonePermissions.filter(
                                        (id) => id !== zone.id,
                                      )
                                    : [...f.zonePermissions, zone.id],
                                }))
                              }
                              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                              style={{
                                background: checked
                                  ? `${zone.color}22`
                                  : "rgba(255,255,255,0.05)",
                                border: checked
                                  ? `1.5px solid ${zone.color}88`
                                  : "1px solid rgba(255,255,255,0.12)",
                                color: checked ? zone.color : "#94a3b8",
                              }}
                            >
                              {checked ? "✓ " : ""}
                              {zone.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                {(form.category === "Müteahhit" ||
                  form.category === "Teknik Destek") &&
                  !form.emergencyContactName && (
                    <div
                      data-ocid="register.emergency_warning.panel"
                      className="px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                      style={{
                        background: "rgba(245,158,11,0.1)",
                        border: "1px solid rgba(245,158,11,0.3)",
                        color: "#fbbf24",
                      }}
                    >
                      ⚠️ {form.category} kategorisi için acil iletişim bilgisi
                      girilmesi önerilir.
                    </div>
                  )}
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
                    {cf.fieldType === "yesno" ? (
                      <select
                        data-ocid="register.custom_field.select"
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
                        className="w-full px-4 py-3 rounded-xl bg-[#0f1729] border border-white/20 text-white focus:outline-none focus:border-[#f59e0b]"
                      >
                        <option value="">Seçin</option>
                        <option value="Evet">Evet</option>
                        <option value="Hayır">Hayır</option>
                      </select>
                    ) : cf.fieldType === "select" &&
                      cf.options &&
                      cf.options.length > 0 ? (
                      <select
                        data-ocid="register.custom_field.select"
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
                        className="w-full px-4 py-3 rounded-xl bg-[#0f1729] border border-white/20 text-white focus:outline-none focus:border-[#f59e0b]"
                      >
                        <option value="">Seçin</option>
                        {cf.options.map((opt: string) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        data-ocid="register.custom_field.input"
                        type={cf.fieldType === "number" ? "number" : "text"}
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
                    )}
                  </div>
                ))}
                {/* Category-specific fields */}
                {(() => {
                  const catFields =
                    findCompanyById(session.companyId)?.categoryFields?.[
                      form.category
                    ] ?? [];
                  if (catFields.length === 0) return null;
                  return (
                    <div
                      className="p-4 rounded-xl"
                      style={{
                        background: "rgba(14,165,233,0.04)",
                        border: "1px solid rgba(14,165,233,0.2)",
                      }}
                    >
                      <p className="text-[#0ea5e9] text-xs font-semibold mb-3">
                        🏷️ {form.category} — Kategori Alanları
                      </p>
                      <div className="space-y-3">
                        {catFields.map((cf) => (
                          <div key={cf.id}>
                            <p className="text-slate-300 text-sm mb-1">
                              {cf.label}
                              {cf.required && " *"}
                            </p>
                            <input
                              data-ocid="register.category_field.input"
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
                              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9]"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
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

                {/* Companion Registration */}
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    data-ocid="register.companions_toggle.button"
                    onClick={() => {
                      setShowCompanions((v) => !v);
                      if (companions.length === 0) {
                        setCompanions([
                          { name: "", relationship: "Asistan", idNumber: "" },
                        ]);
                      }
                    }}
                    className="flex items-center gap-2 text-sm transition-colors"
                    style={{ color: showCompanions ? "#00d4aa" : "#94a3b8" }}
                  >
                    <span>{showCompanions ? "▼" : "▶"}</span>
                    <span>
                      👥 Refakatçi Ekle{" "}
                      {companions.filter((c) => c.name.trim()).length > 0
                        ? `(${companions.filter((c) => c.name.trim()).length} kişi)`
                        : ""}
                    </span>
                  </button>
                  {showCompanions && (
                    <div
                      className="mt-3 space-y-2"
                      data-ocid="register.companions.panel"
                    >
                      {companions.map((comp, ci) => (
                        <div
                          key={`companion-${comp.name || ci}`}
                          data-ocid={`register.companion.${ci + 1}`}
                          className="grid grid-cols-3 gap-2 p-3 rounded-xl"
                          style={{
                            background: "rgba(0,212,170,0.05)",
                            border: "1px solid rgba(0,212,170,0.15)",
                          }}
                        >
                          <input
                            placeholder="Ad Soyad *"
                            value={comp.name}
                            onChange={(e) =>
                              setCompanions((cs) =>
                                cs.map((c, i) =>
                                  i === ci ? { ...c, name: e.target.value } : c,
                                ),
                              )
                            }
                            className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white text-xs focus:outline-none"
                          />
                          <select
                            value={comp.relationship}
                            onChange={(e) =>
                              setCompanions((cs) =>
                                cs.map((c, i) =>
                                  i === ci
                                    ? { ...c, relationship: e.target.value }
                                    : c,
                                ),
                              )
                            }
                            className="px-3 py-2 rounded-lg bg-[#1e293b] border border-white/15 text-white text-xs focus:outline-none"
                          >
                            {["Asistan", "Tercüman", "Aile", "Diğer"].map(
                              (r) => (
                                <option
                                  key={r}
                                  value={r}
                                  className="bg-[#0f1729]"
                                >
                                  {r}
                                </option>
                              ),
                            )}
                          </select>
                          <div className="flex gap-1">
                            <input
                              placeholder="TC (isteğe bağlı)"
                              value={comp.idNumber}
                              onChange={(e) =>
                                setCompanions((cs) =>
                                  cs.map((c, i) =>
                                    i === ci
                                      ? { ...c, idNumber: e.target.value }
                                      : c,
                                  ),
                                )
                              }
                              className="flex-1 px-2 py-2 rounded-lg bg-white/10 border border-white/15 text-white text-xs focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setCompanions((cs) =>
                                  cs.filter((_, i) => i !== ci),
                                )
                              }
                              className="w-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-400/10 text-sm"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                      {companions.length < 3 && (
                        <button
                          type="button"
                          data-ocid="register.companion_add.button"
                          onClick={() =>
                            setCompanions((cs) => [
                              ...cs,
                              {
                                name: "",
                                relationship: "Asistan",
                                idNumber: "",
                              },
                            ])
                          }
                          className="px-3 py-1.5 rounded-lg text-xs text-teal-400 hover:text-white transition-colors"
                          style={{
                            background: "rgba(0,212,170,0.08)",
                            border: "1px solid rgba(0,212,170,0.2)",
                          }}
                        >
                          + Kişi Ekle ({companions.length}/3)
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Visitor Photo Capture */}
                <div className="sm:col-span-2">
                  <p className="text-slate-300 text-sm mb-1 block">
                    Ziyaretçi Fotoğrafı (İsteğe Bağlı)
                  </p>
                  {photoUploadProgress !== null && (
                    <div className="mb-2">
                      <div className="text-xs text-teal-400 mb-1">
                        ⬆️ Fotoğraf yükleniyor... {photoUploadProgress}%
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${photoUploadProgress}%`,
                            background:
                              "linear-gradient(90deg,#0ea5e9,#14b8a6)",
                          }}
                        />
                      </div>
                    </div>
                  )}
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
                              setShowCameraCapture(false);
                              camera.stopCamera();
                              setPhotoUploadProgress(0);
                              try {
                                const bytes = await dataUrlToBytes(photo);
                                const url = await uploadBytesToBlob(
                                  bytes,
                                  (pct) => setPhotoUploadProgress(pct),
                                );
                                setForm((f) => ({
                                  ...f,
                                  visitorPhoto: url ?? photo,
                                }));
                              } catch {
                                setForm((f) => ({ ...f, visitorPhoto: photo }));
                                toast.error(
                                  "Fotoğraf yüklenemedi, yerel kaydedildi.",
                                );
                              } finally {
                                setPhotoUploadProgress(null);
                              }
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
                {/* Belongings Tracking */}
                <div
                  className="p-4 rounded-xl"
                  style={{
                    background: "rgba(245,158,11,0.04)",
                    border: "1.5px solid rgba(245,158,11,0.2)",
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-amber-400 font-semibold text-sm">
                      📦 Emanet Kaydı
                    </h4>
                    <button
                      type="button"
                      data-ocid="register.add_belonging.button"
                      onClick={() =>
                        setBelongingsForm((prev) => [
                          ...prev,
                          {
                            id: `b_${Date.now()}`,
                            itemType: "Telefon",
                            description: "",
                            quantity: 1,
                          } as {
                            id: string;
                            itemType: string;
                            description: string;
                            quantity: number;
                          },
                        ])
                      }
                      className="px-2 py-1 rounded-lg text-xs text-white font-medium"
                      style={{
                        background: "rgba(245,158,11,0.2)",
                        border: "1px solid rgba(245,158,11,0.4)",
                      }}
                    >
                      + Ekle
                    </button>
                  </div>
                  {belongingsForm.length === 0 ? (
                    <p className="text-slate-500 text-xs">
                      Emanet alınmadıysa boş bırakın.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {belongingsForm.map((item, idx) => (
                        <div
                          key={item.id}
                          className="flex gap-2 items-center flex-wrap"
                        >
                          <select
                            data-ocid={`register.belonging_type.${idx + 1}`}
                            value={item.itemType}
                            onChange={(e) =>
                              setBelongingsForm((prev) =>
                                prev.map((b, i) =>
                                  i === idx
                                    ? { ...b, itemType: e.target.value }
                                    : b,
                                ),
                              )
                            }
                            className="px-3 py-2 rounded-lg bg-[#0f1729] border border-white/20 text-white text-sm focus:outline-none"
                          >
                            {[
                              "Telefon",
                              "Laptop",
                              "Kimlik Kartı",
                              "Çanta",
                              "Diğer",
                            ].map((t) => (
                              <option
                                key={t}
                                value={t}
                                className="bg-[#0f1729]"
                              >
                                {t}
                              </option>
                            ))}
                          </select>
                          <input
                            data-ocid={`register.belonging_desc.${idx + 1}`}
                            value={item.description}
                            onChange={(e) =>
                              setBelongingsForm((prev) =>
                                prev.map((b, i) =>
                                  i === idx
                                    ? { ...b, description: e.target.value }
                                    : b,
                                ),
                              )
                            }
                            placeholder="Açıklama"
                            className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none min-w-0"
                          />
                          <input
                            data-ocid={`register.belonging_qty.${idx + 1}`}
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              setBelongingsForm((prev) =>
                                prev.map((b, i) =>
                                  i === idx
                                    ? { ...b, quantity: +e.target.value || 1 }
                                    : b,
                                ),
                              )
                            }
                            className="w-16 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
                          />
                          <button
                            type="button"
                            data-ocid={`register.belonging_remove.${idx + 1}`}
                            onClick={() =>
                              setBelongingsForm((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                            className="text-red-400 hover:text-red-300 text-sm px-2"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                {company?.ishgEnabled && (
                  <div
                    className="p-4 rounded-xl"
                    style={{
                      background: form.ishgAccepted
                        ? "rgba(14,165,233,0.06)"
                        : "rgba(255,255,255,0.04)",
                      border: form.ishgAccepted
                        ? "1.5px solid rgba(14,165,233,0.3)"
                        : "1.5px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        data-ocid="register.ishg.checkbox"
                        type="checkbox"
                        checked={form.ishgAccepted}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            ishgAccepted: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 mt-0.5 rounded accent-[#0ea5e9] shrink-0"
                      />
                      <div className="flex-1">
                        <span className="text-slate-200 text-sm font-medium">
                          🦺 İSG Kurallarını Okudum ve Kabul Ediyorum *
                        </span>
                        <details className="mt-1">
                          <summary className="text-[#0ea5e9] text-xs cursor-pointer hover:underline">
                            Metni Oku
                          </summary>
                          <p
                            className="mt-2 text-slate-400 text-xs leading-relaxed p-3 rounded-lg"
                            style={{ background: "rgba(255,255,255,0.05)" }}
                          >
                            {company.ishgText ||
                              "Bu binada İş Sağlığı ve Güvenliği kurallarına uymayı kabul ediyorum. Belirlenen güvenlik önlemlerine, tahliye prosedürlerine ve acil durum talimatlarına uyacağımı taahhüt ederim."}
                          </p>
                        </details>
                      </div>
                    </label>
                  </div>
                )}
                {/* Visitor Policy */}
                {company?.visitorPolicyEnabled && company.visitorPolicy && (
                  <div
                    data-ocid="register.policy.panel"
                    className="p-4 rounded-2xl space-y-3"
                    style={{
                      background: "rgba(14,165,233,0.06)",
                      border: "1px solid rgba(14,165,233,0.25)",
                    }}
                  >
                    <p className="text-slate-200 font-semibold text-sm">
                      📋 Ziyaretçi Politikası
                    </p>
                    <p className="text-slate-400 text-xs">
                      Aşağıdaki politikayı okuyup kabul etmeniz gerekmektedir.
                    </p>
                    {policyModalOpen ? (
                      <div
                        className="p-3 rounded-xl text-slate-300 text-xs whitespace-pre-wrap leading-relaxed"
                        style={{
                          background: "rgba(0,0,0,0.3)",
                          maxHeight: 160,
                          overflowY: "auto",
                        }}
                      >
                        {company.visitorPolicy}
                      </div>
                    ) : null}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        data-ocid="register.policy_read.button"
                        onClick={() => setPolicyModalOpen((v) => !v)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#0ea5e9] transition-all"
                        style={{
                          background: "rgba(14,165,233,0.15)",
                          border: "1px solid rgba(14,165,233,0.3)",
                        }}
                      >
                        {policyModalOpen ? "Gizle" : "Politikayı Oku"}
                      </button>
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer mt-2">
                      <input
                        data-ocid="register.policy_accept.checkbox"
                        type="checkbox"
                        checked={form.policyAccepted}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            policyAccepted: e.target.checked,
                          }))
                        }
                        className="mt-0.5 accent-[#0ea5e9]"
                      />
                      <span className="text-slate-300 text-sm">
                        Politikayı okudum ve kabul ediyorum{" "}
                        <span className="text-red-400">*</span>
                      </span>
                    </label>
                  </div>
                )}
                {/* Document Upload */}
                <div>
                  <p className="text-slate-300 text-sm mb-2 block">
                    📎 Belgeler (isteğe bağlı, max 3 dosya, max 2MB)
                  </p>
                  {docUploadProgress !== null && (
                    <div className="mb-2">
                      <div className="text-xs text-amber-400 mb-1">
                        ⬆️ Belge yükleniyor... {docUploadProgress}%
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${docUploadProgress}%`,
                            background:
                              "linear-gradient(90deg,#f59e0b,#f97316)",
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    {uploadedDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg"
                        style={{
                          background: "rgba(14,165,233,0.1)",
                          border: "1px solid rgba(14,165,233,0.2)",
                        }}
                      >
                        <span className="text-white text-xs truncate flex-1">
                          {doc.name}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setUploadedDocs((d) =>
                              d.filter((x) => x.id !== doc.id),
                            )
                          }
                          className="ml-2 text-red-400 hover:text-red-300 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {uploadedDocs.length < 3 && (
                      <label
                        data-ocid="register.upload_button"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs text-slate-400 hover:text-white transition-colors"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1.5px dashed rgba(255,255,255,0.2)",
                        }}
                      >
                        <span>📁 Dosya Ekle (PDF, JPG, PNG)</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 2 * 1024 * 1024) {
                              toast.error("Dosya boyutu 2MB'yi aşamaz");
                              return;
                            }
                            e.target.value = "";
                            setDocUploadProgress(0);
                            (async () => {
                              try {
                                const bytes = await fileToBytes(file);
                                const url = await uploadBytesToBlob(
                                  bytes,
                                  (pct) => setDocUploadProgress(pct),
                                );
                                // Fallback to base64 if blob upload unavailable
                                if (url) {
                                  setUploadedDocs((d) => [
                                    ...d,
                                    {
                                      id: generateId(),
                                      name: file.name,
                                      type: file.type,
                                      url,
                                      uploadedAt: Date.now(),
                                    },
                                  ]);
                                } else {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    const base64 = ev.target?.result as string;
                                    setUploadedDocs((d) => [
                                      ...d,
                                      {
                                        id: generateId(),
                                        name: file.name,
                                        type: file.type,
                                        base64,
                                        uploadedAt: Date.now(),
                                      },
                                    ]);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              } catch {
                                toast.error(
                                  "Belge yüklenemedi, yerel kaydedildi.",
                                );
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  const base64 = ev.target?.result as string;
                                  setUploadedDocs((d) => [
                                    ...d,
                                    {
                                      id: generateId(),
                                      name: file.name,
                                      type: file.type,
                                      base64,
                                      uploadedAt: Date.now(),
                                    },
                                  ]);
                                };
                                reader.readAsDataURL(file);
                              } finally {
                                setDocUploadProgress(null);
                              }
                            })();
                          }}
                        />
                      </label>
                    )}
                  </div>
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
              {/* Health Screening Step */}
              {(company?.healthScreeningEnabled as boolean) &&
                ((company?.healthQuestions as any[]) ?? []).length > 0 &&
                healthPassed === null && (
                  <div className="mt-4">
                    <HealthScreeningStep
                      questions={(company?.healthQuestions as any[]) ?? []}
                      companyId={session.companyId}
                      visitorId={form.idNumber || "pending"}
                      visitorName={form.name}
                      onPassed={() => setHealthPassed(true)}
                      onBlocked={() => setHealthPassed(false)}
                    />
                  </div>
                )}
              {(company?.healthScreeningEnabled as boolean) &&
                ((company?.healthQuestions as any[]) ?? []).length > 0 &&
                healthPassed === false && (
                  <div
                    className="mt-4 p-4 rounded-2xl text-center"
                    style={{
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.3)",
                    }}
                  >
                    <p className="text-red-400 font-semibold text-sm">
                      🚫 Sağlık taraması geçilemedi — kayıt engellenmiştir.
                    </p>
                    <button
                      type="button"
                      onClick={() => setHealthPassed(null)}
                      className="mt-2 text-xs text-slate-400 hover:text-white"
                    >
                      Tekrar dene
                    </button>
                  </div>
                )}
              <button
                type="button"
                data-ocid="register.submit_button"
                onClick={submitVisitor}
                disabled={
                  (company?.healthScreeningEnabled as boolean) &&
                  ((company?.healthQuestions as any[]) ?? []).length > 0 &&
                  healthPassed !== true
                }
                className="mt-6 w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90 disabled:opacity-40"
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
                            onClick={() => {
                              const reason = window.prompt(
                                "Reddetme nedeni (isteğe bağlı):",
                              );
                              rejectKioskVisitor(v, reason ?? undefined);
                            }}
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
                          {v.emergencyContactName && (
                            <div className="text-slate-400 text-sm mb-1">
                              🚨 Acil:{" "}
                              <span className="text-white">
                                {v.emergencyContactName}
                              </span>
                              {v.emergencyContactPhone && (
                                <span className="text-slate-300 ml-1 font-mono text-xs">
                                  ({v.emergencyContactPhone})
                                </span>
                              )}
                            </div>
                          )}
                          {(v.category === "Müteahhit" ||
                            v.category === "Teknik Destek") &&
                            !v.emergencyContactName && (
                              <span
                                className="inline-block px-2 py-0.5 rounded text-xs font-medium mb-1"
                                style={{
                                  background: "rgba(245,158,11,0.15)",
                                  color: "#fbbf24",
                                  border: "1px solid rgba(245,158,11,0.3)",
                                }}
                              >
                                ⚠️ Acil iletişim eksik
                              </span>
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
                            <VisitorCountdown
                              arrivalTime={v.arrivalTime}
                              durationLimitMinutes={
                                v.category
                                  ? (findCompanyById(session.companyId)
                                      ?.categoryMaxStay?.[v.category] ?? 0)
                                  : 0
                              }
                            />
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
                          {/* Dual Signature Status */}
                          {(v.ndaAccepted || v.signatureData) && (
                            <div
                              className="mb-2 p-2 rounded-lg text-xs"
                              style={{
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.08)",
                              }}
                            >
                              <p className="text-slate-400 font-semibold mb-1">
                                📄 Belge İmza Durumu
                              </p>
                              <div className="flex gap-3 items-center flex-wrap">
                                <span className="text-green-400">
                                  {v.signatureData
                                    ? "✅ Ziyaretçi İmzaladı"
                                    : "⏳ Ziyaretçi İmzalamadı"}
                                </span>
                                <span
                                  className={
                                    v.hostSignatureData
                                      ? "text-green-400"
                                      : "text-amber-400"
                                  }
                                >
                                  {v.hostSignatureData
                                    ? "✅ Host İmzaladı"
                                    : "⏳ Host Bekleniyor"}
                                </span>
                              </div>
                              {v.signatureData && v.hostSignatureData && (
                                <p className="text-teal-400 text-xs mt-1 font-semibold">
                                  ✅ Geçerli / İki Taraflı İmzalandı
                                </p>
                              )}
                              {!v.hostSignatureData && (
                                <button
                                  type="button"
                                  data-ocid={`active_visitors.host_sign.button.${i + 1}`}
                                  onClick={() => {
                                    saveVisitor({
                                      ...v,
                                      hostSignatureData: `HOST_SIGNED_BY_${session.staffId}_AT_${Date.now()}`,
                                    });
                                    reload();
                                    toast.success(
                                      "Host imzası eklendi — belge geçerli.",
                                    );
                                  }}
                                  className="mt-2 px-3 py-1 rounded-lg text-xs font-semibold text-white"
                                  style={{
                                    background:
                                      "linear-gradient(135deg,#14b8a6,#0d9488)",
                                  }}
                                >
                                  ✍️ İmzala (Host)
                                </button>
                              )}
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
                            {/* Gate Pass Button */}
                            <button
                              type="button"
                              data-ocid={`active_visitors.gate.button.${i + 1}`}
                              onClick={() => {
                                setGateModalVisitor(v);
                                setSelectedGate("Ana Giriş");
                                setGateDirection("in");
                              }}
                              title="Kapıyı Aç"
                              className="px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                              style={{
                                background: "rgba(20,184,166,0.15)",
                                border: "1px solid rgba(20,184,166,0.3)",
                                color: "#2dd4bf",
                              }}
                            >
                              🚪
                            </button>
                            {/* Badge Reprint Button */}
                            <button
                              type="button"
                              data-ocid={`active_visitors.reprint.button.${i + 1}`}
                              onClick={() => {
                                setReprintVisitor(v);
                                setReprintReason("Kayıp");
                                setReprintNote("");
                              }}
                              title="Rozet Yeniden Bas"
                              className="px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                              style={{
                                background: "rgba(168,85,247,0.15)",
                                border: "1px solid rgba(168,85,247,0.3)",
                                color: "#c084fc",
                              }}
                            >
                              🖨️
                            </button>
                            <button
                              type="button"
                              data-ocid={`active_visitors.digital_ticket.button.${i + 1}`}
                              onClick={() => {
                                const url = `${window.location.origin}/ticket/${v.visitorId}`;
                                navigator.clipboard
                                  .writeText(url)
                                  .then(() =>
                                    toast.success(
                                      "Dijital bilet linki kopyalandı",
                                    ),
                                  )
                                  .catch(() => toast.error("Kopyalanamadı"));
                              }}
                              title="Dijital Bilet Linki Kopyala"
                              className="px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                              style={{
                                background: "rgba(0,212,170,0.15)",
                                border: "1px solid rgba(0,212,170,0.3)",
                                color: "#00d4aa",
                              }}
                            >
                              🎫
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const url = `${window.location.origin}/welcome-pkg/${v.visitorId}`;
                                navigator.clipboard
                                  .writeText(url)
                                  .then(() =>
                                    toast.success(
                                      "Karşılama paketi linki kopyalandı",
                                    ),
                                  )
                                  .catch(() => toast.error("Kopyalanamadı"));
                              }}
                              title="Dijital Karşılama Paketi Linkini Kopyala"
                              className="px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                              style={{
                                background: "rgba(167,139,250,0.15)",
                                border: "1px solid rgba(167,139,250,0.3)",
                                color: "#a78bfa",
                              }}
                            >
                              🎁
                            </button>
                            <button
                              type="button"
                              data-ocid={`active_visitors.access_upgrade.button.${i + 1}`}
                              onClick={() => setAccessUpgradeVisitor(v)}
                              title="Erişim Yükselt"
                              className="px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                              style={{
                                background: "rgba(168,85,247,0.15)",
                                border: "1px solid rgba(168,85,247,0.3)",
                                color: "#c084fc",
                              }}
                            >
                              ⬆️
                            </button>
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

              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-white font-bold text-xl">Şu An Binada</h2>
                  <p className="text-slate-400 text-sm">
                    Henüz çıkış yapmamış ziyaretçiler
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    data-ocid="inside.toggle"
                    onClick={() => {
                      const next = visitorViewMode === "list" ? "grid" : "list";
                      setVisitorViewMode(next);
                      localStorage.setItem("safentry_visitor_view_mode", next);
                    }}
                    className="px-3 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#e2e8f0",
                    }}
                  >
                    {visitorViewMode === "list"
                      ? "👁 Görsel Mod"
                      : "📋 Liste Modu"}
                  </button>
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
                      style={{
                        color: capacityExceeded ? "#ef4444" : "#0ea5e9",
                      }}
                    >
                      {insideVisitors.length}
                    </div>
                    <div className="text-slate-400 text-xs">
                      İçeride{maxCap > 0 ? ` / ${maxCap}` : ""}
                    </div>
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
              ) : visitorViewMode === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {insideVisitors
                    .slice()
                    .sort((a, b) => a.arrivalTime - b.arrivalTime)
                    .map((v, i) => {
                      const over4h = hoursSince(v.arrivalTime) >= 4;
                      const elapsed = durationLabel(v.arrivalTime);
                      const initials = v.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();
                      return (
                        <button
                          type="button"
                          key={v.visitorId}
                          data-ocid={`inside.item.${i + 1}`}
                          className="p-4 rounded-2xl cursor-pointer transition-all hover:scale-105 text-left w-full"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            border: `1.5px solid ${over4h ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.1)"}`,
                          }}
                          onClick={() => {
                            toast.info(
                              `${v.name} — ${v.category || "Ziyaretçi"} — ${durationLabel(v.arrivalTime)}`,
                            );
                          }}
                        >
                          <div className="flex flex-col items-center text-center gap-2">
                            {v.visitorPhoto ? (
                              <img
                                src={v.visitorPhoto}
                                alt={v.name}
                                className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                              />
                            ) : (
                              <div
                                className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
                                style={{ background: LABEL_COLORS[v.label] }}
                              >
                                {initials}
                              </div>
                            )}
                            <div>
                              <p className="text-white font-semibold text-sm leading-tight">
                                {v.name}
                              </p>
                              <p className="text-slate-400 text-xs mt-0.5">
                                {v.category || "Ziyaretçi"}
                              </p>
                              <p
                                className="text-xs mt-1"
                                style={{
                                  color: over4h ? "#f59e0b" : "#94a3b8",
                                }}
                              >
                                {elapsed}
                              </p>
                            </div>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                background: `${LABEL_COLORS[v.label]}33`,
                                color: LABEL_COLORS[v.label],
                              }}
                            >
                              {v.label === "vip"
                                ? "VIP"
                                : v.label === "attention"
                                  ? "Dikkat"
                                  : v.label === "restricted"
                                    ? "Kısıtlı"
                                    : "Normal"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
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
              {/* Host Approval Section */}
              {(() => {
                const pendingForMe = appointments.filter(
                  (a) =>
                    a.hostStaffId === session.staffId &&
                    a.hostApprovalStatus === "pending",
                );
                if (pendingForMe.length === 0) return null;
                return (
                  <div
                    className="mb-6 p-4 rounded-2xl"
                    style={{
                      background: "rgba(245,158,11,0.07)",
                      border: "1.5px solid rgba(245,158,11,0.3)",
                    }}
                  >
                    <h4 className="text-amber-400 font-bold text-sm mb-3">
                      ⏳ Onayınızı Bekleyen Randevular ({pendingForMe.length})
                    </h4>
                    <div className="space-y-2">
                      {pendingForMe.map((a) => (
                        <div
                          key={a.id}
                          className="p-3 rounded-xl flex flex-col gap-2"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-3">
                              {(() => {
                                const photo = getStaffPhoto(
                                  session.staffId ?? "",
                                );
                                return photo ? (
                                  <img
                                    src={photo}
                                    alt="Host"
                                    className="w-8 h-8 rounded-full object-cover shrink-0"
                                  />
                                ) : null;
                              })()}
                              <div>
                                <span className="text-white font-semibold text-sm">
                                  {a.visitorName}
                                </span>
                                <span className="text-slate-400 text-xs ml-2">
                                  {a.appointmentDate} {a.appointmentTime} —{" "}
                                  {a.purpose}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                data-ocid="appointments.host_approve.button"
                                onClick={() => {
                                  saveAppointment({
                                    ...a,
                                    hostApprovalStatus: "approved",
                                    status: "approved",
                                  });
                                  reload();
                                  toast.success(
                                    `"${a.visitorName}" randevusu onaylandı`,
                                  );
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                                style={{
                                  background: "rgba(34,197,94,0.25)",
                                  border: "1px solid rgba(34,197,94,0.4)",
                                }}
                              >
                                ✅ Onayla
                              </button>
                              <button
                                type="button"
                                data-ocid="appointments.host_reject.button"
                                onClick={() => {
                                  setApptRejectId(a.id);
                                  setApptRejectReason("");
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400"
                                style={{
                                  background: "rgba(239,68,68,0.1)",
                                  border: "1px solid rgba(239,68,68,0.3)",
                                }}
                              >
                                ❌ Reddet
                              </button>
                            </div>
                          </div>
                          {apptRejectId === a.id && (
                            <div className="flex gap-2 mt-1">
                              <input
                                data-ocid="appointments.reject_reason.input"
                                value={apptRejectReason}
                                onChange={(e) =>
                                  setApptRejectReason(e.target.value)
                                }
                                placeholder="Red nedeni..."
                                className="flex-1 px-3 py-2 rounded-lg text-sm text-white bg-white/10 border border-white/20 focus:outline-none"
                              />
                              <button
                                type="button"
                                data-ocid="appointments.confirm_reject.button"
                                onClick={() => {
                                  saveAppointment({
                                    ...a,
                                    hostApprovalStatus: "rejected",
                                    hostRejectionReason: apptRejectReason,
                                    status: "cancelled",
                                  });
                                  setApptRejectId(null);
                                  reload();
                                  toast.error("Randevu reddedildi");
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                                style={{
                                  background: "rgba(239,68,68,0.3)",
                                  border: "1px solid rgba(239,68,68,0.5)",
                                }}
                              >
                                Gönder
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
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
                                      : appt.status === "cancelled"
                                        ? "İptal"
                                        : "Bekliyor"}
                                  </span>
                                  {appt.hostApprovalStatus === "approved" && (
                                    <span
                                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                      style={{
                                        background: "rgba(34,197,94,0.15)",
                                        color: "#22c55e",
                                      }}
                                    >
                                      ✅ Host Onayladı
                                    </span>
                                  )}
                                  {appt.attendees &&
                                    appt.attendees.length > 0 && (
                                      <span
                                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                        style={{
                                          background: "rgba(14,165,233,0.15)",
                                          color: "#38bdf8",
                                        }}
                                      >
                                        👥 +{appt.attendees.length} katılımcı
                                      </span>
                                    )}
                                  {appt.hostApprovalStatus === "rejected" && (
                                    <span
                                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                      style={{
                                        background: "rgba(239,68,68,0.15)",
                                        color: "#f87171",
                                      }}
                                      title={appt.hostRejectionReason}
                                    >
                                      ❌ Host Reddetti
                                    </span>
                                  )}
                                  {appt.hostApprovalStatus === "pending" &&
                                    appt.hostStaffId && (
                                      <span
                                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                        style={{
                                          background: "rgba(245,158,11,0.15)",
                                          color: "#fbbf24",
                                        }}
                                      >
                                        ⏳ Host Onayı Bekleniyor
                                      </span>
                                    )}
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
                                {appt.approvalChain &&
                                  appt.approvalChain.length > 0 && (
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className="text-slate-500 text-xs">
                                        🔗 Onay:
                                      </span>
                                      {appt.approvalChain.map((step, si) => {
                                        const roleLabel: Record<
                                          string,
                                          string
                                        > = {
                                          host: "Host",
                                          security: "Güvenlik",
                                          hr: "İK",
                                        };
                                        const stepColor =
                                          step.status === "approved"
                                            ? "#22c55e"
                                            : step.status === "rejected"
                                              ? "#ef4444"
                                              : "#94a3b8";
                                        return (
                                          <span
                                            key={`${step.role}-${si}`}
                                            className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                            style={{
                                              background: `${stepColor}22`,
                                              color: stepColor,
                                              border: `1px solid ${stepColor}44`,
                                            }}
                                          >
                                            {si + 1}. {roleLabel[step.role]}
                                            {step.status === "approved"
                                              ? " ✓"
                                              : step.status === "rejected"
                                                ? " ✗"
                                                : " ⏳"}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}
                                {appt.notes && (
                                  <div className="text-slate-500 text-xs mt-1">
                                    {appt.notes}
                                  </div>
                                )}
                                {appt.attendees &&
                                  appt.attendees.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-slate-500 text-xs font-medium mb-1">
                                        👥 Ek Katılımcılar:
                                      </p>
                                      <div className="space-y-1">
                                        {appt.attendees.map((att, ai) => (
                                          <div
                                            key={att.idNumber || `att-${ai}`}
                                            className="flex items-center gap-2 text-xs"
                                          >
                                            <span
                                              className="w-2 h-2 rounded-full"
                                              style={{
                                                background: att.checkedIn
                                                  ? "#22c55e"
                                                  : "#94a3b8",
                                              }}
                                            />
                                            <span className="text-slate-300">
                                              {att.name}
                                            </span>
                                            <span className="text-slate-500">
                                              {att.idNumber}
                                            </span>
                                            {att.checkedIn && (
                                              <span className="text-green-400">
                                                ✓ Giriş Yaptı
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
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
                                {/* No-Show Button */}
                                {!appt.noShow && appt.status === "pending" && (
                                  <button
                                    type="button"
                                    data-ocid={`appointments.noshow_button.${i + 1}`}
                                    onClick={() => {
                                      const updated = {
                                        ...appt,
                                        noShow: true,
                                        noShowMarkedAt: Date.now(),
                                        status: "cancelled" as const,
                                      };
                                      saveAppointment(updated);
                                      setAppointments(
                                        getAppointments(session.companyId),
                                      );
                                      toast.warning(
                                        `${appt.visitorName} gelmedi (No-Show) olarak işaretlendi`,
                                      );
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                                    style={{
                                      background: "rgba(239,68,68,0.12)",
                                      border: "1px solid rgba(239,68,68,0.3)",
                                      color: "#ef4444",
                                    }}
                                  >
                                    🚫 Gelmedi
                                  </button>
                                )}
                                {appt.noShow && (
                                  <span
                                    className="px-2 py-1 rounded-lg text-xs font-bold"
                                    style={{
                                      background: "rgba(239,68,68,0.15)",
                                      color: "#ef4444",
                                      border: "1px solid rgba(239,68,68,0.3)",
                                    }}
                                  >
                                    🚫 No-Show
                                  </span>
                                )}
                                {/* Transfer Button */}
                                <button
                                  type="button"
                                  data-ocid={`appointments.transfer.button.${i + 1}`}
                                  onClick={() => {
                                    setTransferAppt(appt);
                                    setTransferTargetId("");
                                  }}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                                  style={{
                                    background: "rgba(20,184,166,0.15)",
                                    border: "1px solid rgba(20,184,166,0.35)",
                                  }}
                                >
                                  🔀 Devret
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

              {apptTab === "create" && (
                <div className="max-w-lg">
                  {/* Meeting Templates Quick Create */}
                  {(() => {
                    const templates = company?.meetingTemplates ?? [];
                    if (templates.length === 0) return null;
                    return (
                      <div
                        className="mb-5 p-4 rounded-2xl"
                        style={{
                          background: "rgba(14,165,233,0.07)",
                          border: "1px solid rgba(14,165,233,0.2)",
                        }}
                      >
                        <p className="text-slate-300 text-sm font-medium mb-3">
                          📅 Şablondan Oluştur
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {templates.map((tmpl) => {
                            const DAY_NAMES = [
                              "Paz",
                              "Pzt",
                              "Sal",
                              "Çar",
                              "Per",
                              "Cum",
                              "Cmt",
                            ];
                            const hostStaff = staffList.find(
                              (s) => s.staffId === tmpl.hostStaffId,
                            );
                            return (
                              <button
                                key={tmpl.id}
                                type="button"
                                data-ocid="appointments.template.button"
                                onClick={() => {
                                  // Find next occurrence of this day of week
                                  const today = new Date();
                                  let next = new Date(today);
                                  const todayDow = today.getDay();
                                  let diff =
                                    (tmpl.dayOfWeek - todayDow + 7) % 7;
                                  if (diff === 0) diff = 7; // Next week if today
                                  next.setDate(today.getDate() + diff);
                                  const dateStr = next
                                    .toISOString()
                                    .slice(0, 10);
                                  setApptForm((f) => ({
                                    ...f,
                                    visitorName: tmpl.visitorName ?? "",
                                    hostName: hostStaff?.name ?? "",
                                    appointmentDate: dateStr,
                                    appointmentTime: tmpl.time,
                                    purpose: tmpl.purpose,
                                    notes: tmpl.notes ?? "",
                                  }));
                                  toast.success(
                                    `"${tmpl.name}" şablonu yüklendi`,
                                  );
                                }}
                                className="px-3 py-1.5 rounded-xl text-xs font-medium text-white transition-all hover:opacity-90"
                                style={{
                                  background: "rgba(14,165,233,0.2)",
                                  border: "1px solid rgba(14,165,233,0.4)",
                                }}
                              >
                                {tmpl.name} ({DAY_NAMES[tmpl.dayOfWeek]}{" "}
                                {tmpl.time})
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                  {apptError && (
                    <div className="mb-4 p-3 rounded-xl border border-red-500/40 bg-red-900/20 text-red-400 text-sm">
                      {apptError}
                    </div>
                  )}
                  {/* OCR scan button */}
                  <div className="mb-3">
                    <button
                      type="button"
                      data-ocid="register.ocr_scan.button"
                      onClick={() => setShowOcrModal(true)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-2 transition-all"
                      style={{
                        background: "rgba(14,165,233,0.12)",
                        border: "1px solid rgba(14,165,233,0.3)",
                      }}
                    >
                      📷 Kimlik Tara
                    </button>
                  </div>

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
                        onChange={(e) => {
                          const idVal = e.target.value;
                          setApptForm((f) => ({ ...f, visitorId: idVal }));
                          // Host suggestion logic
                          if (idVal.length >= 5) {
                            const pastVisits = getVisitors(session.companyId)
                              .filter(
                                (v) => v.idNumber === idVal && v.hostStaffId,
                              )
                              .sort((a, b) => b.arrivalTime - a.arrivalTime);
                            if (pastVisits.length > 0) {
                              const lastVisit = pastVisits[0];
                              const hostStaff = staffList.find(
                                (s) => s.staffId === lastVisit.hostStaffId,
                              );
                              if (hostStaff) {
                                setHostSuggestion({
                                  hostName: hostStaff.name,
                                  hostId: hostStaff.staffId,
                                });
                              } else {
                                setHostSuggestion(null);
                              }
                            } else {
                              setHostSuggestion(null);
                            }
                          } else {
                            setHostSuggestion(null);
                          }
                        }}
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none font-mono"
                      />
                    </div>
                    {/* Host Suggestion */}
                    {hostSuggestion && !apptForm.hostName && (
                      <div
                        data-ocid="appointments.host_suggestion.panel"
                        className="col-span-2 p-3 rounded-xl text-sm"
                        style={{
                          background: "rgba(20,184,166,0.1)",
                          border: "1px solid rgba(20,184,166,0.3)",
                        }}
                      >
                        <p className="text-teal-300 mb-2">
                          💡 Bu ziyaretçi daha önce{" "}
                          <strong>{hostSuggestion.hostName}</strong> ile
                          görüşmüştü. Aynı host&apos;u seç mi?
                        </p>
                        <button
                          type="button"
                          data-ocid="appointments.host_suggestion.button"
                          onClick={() => {
                            setApptForm((f) => ({
                              ...f,
                              hostName: hostSuggestion.hostName,
                            }));
                            setHostSuggestion(null);
                            toast.success(
                              `Host seçildi: ${hostSuggestion.hostName}`,
                            );
                          }}
                          className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white"
                          style={{
                            background:
                              "linear-gradient(135deg,#14b8a6,#0d9488)",
                          }}
                        >
                          ✓ Evet, Seç
                        </button>
                      </div>
                    )}
                    <div>
                      <p className="text-slate-300 text-sm mb-1">Ev Sahibi *</p>
                      <input
                        data-ocid="appointments.host.input"
                        value={apptForm.hostName}
                        onChange={(e) => {
                          const v = e.target.value;
                          setApptForm((f) => ({ ...f, hostName: v }));
                          checkApptConflict(
                            v,
                            apptForm.appointmentDate,
                            apptForm.appointmentTime,
                          );
                        }}
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none"
                      />
                    </div>
                    {/* Leave Warning */}
                    {apptForm.hostName &&
                      apptForm.appointmentDate &&
                      (() => {
                        const match = staffList.find(
                          (s) => s.name === apptForm.hostName,
                        );
                        if (
                          match &&
                          isPersonnelOnLeave(
                            session.companyId,
                            match.staffId,
                            apptForm.appointmentDate,
                          )
                        ) {
                          return (
                            <div
                              className="col-span-2 p-3 rounded-xl text-sm"
                              style={{
                                background: "rgba(245,158,11,0.12)",
                                border: "1px solid rgba(245,158,11,0.4)",
                                color: "#fbbf24",
                              }}
                            >
                              ⚠️ Seçilen personel bu tarihte izinli. Başka bir
                              personel atamak ister misiniz?
                            </div>
                          );
                        }
                        return null;
                      })()}
                    <div>
                      <p className="text-slate-300 text-sm mb-1">Tarih</p>
                      <input
                        data-ocid="appointments.date.input"
                        type="date"
                        value={apptForm.appointmentDate}
                        onChange={(e) => {
                          const v = e.target.value;
                          setApptForm((f) => ({ ...f, appointmentDate: v }));
                          checkApptConflict(
                            apptForm.hostName,
                            v,
                            apptForm.appointmentTime,
                          );
                        }}
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <p className="text-slate-300 text-sm mb-1">Saat</p>
                      <input
                        data-ocid="appointments.time.input"
                        type="time"
                        value={apptForm.appointmentTime}
                        onChange={(e) => {
                          const v = e.target.value;
                          setApptForm((f) => ({ ...f, appointmentTime: v }));
                          checkApptConflict(
                            apptForm.hostName,
                            apptForm.appointmentDate,
                            v,
                          );
                        }}
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
                  {/* Meeting Room Selection */}
                  {meetingRooms.length > 0 && (
                    <div>
                      <p className="text-slate-300 text-sm mb-1">
                        Toplantı Odası (isteğe bağlı)
                      </p>
                      <select
                        data-ocid="appointments.meeting_room.select"
                        value={apptForm.meetingRoomId}
                        onChange={(e) => {
                          const roomId = e.target.value;
                          if (roomId) {
                            const conflict = appointments.find(
                              (a) =>
                                a.meetingRoomId === roomId &&
                                a.appointmentDate ===
                                  apptForm.appointmentDate &&
                                a.appointmentTime ===
                                  apptForm.appointmentTime &&
                                a.status !== "cancelled",
                            );
                            if (conflict)
                              toast.warning(
                                `Bu oda ${apptForm.appointmentTime} saatinde dolu: ${conflict.visitorName}`,
                              );
                          }
                          setApptForm((f) => ({ ...f, meetingRoomId: roomId }));
                        }}
                        className="w-full px-4 py-3 rounded-xl text-white focus:outline-none"
                        style={{
                          background: "#0f1729",
                          border: "1px solid rgba(255,255,255,0.2)",
                        }}
                      >
                        <option value="" className="bg-[#0f1729]">
                          Oda seçin (isteğe bağlı)
                        </option>
                        {meetingRooms.map((r) => (
                          <option
                            key={r.id}
                            value={r.id}
                            className="bg-[#0f1729]"
                          >
                            {r.name} — {r.floor} ({r.capacity} kişi)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {/* Multi-Attendee Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-slate-300 text-sm font-medium">
                        👥 Ek Katılımcılar
                        {apptForm.attendees.length > 0 && (
                          <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-cyan-500/20 text-cyan-400">
                            {apptForm.attendees.length} kişi
                          </span>
                        )}
                      </p>
                      <button
                        type="button"
                        data-ocid="appointments.add_attendee.button"
                        onClick={() =>
                          setApptForm((f) => ({
                            ...f,
                            attendees: [
                              ...f.attendees,
                              { name: "", idNumber: "" },
                            ],
                          }))
                        }
                        className="text-xs px-3 py-1 rounded-lg text-cyan-400 border border-cyan-500/30 hover:bg-cyan-900/20"
                      >
                        + Katılımcı Ekle
                      </button>
                    </div>
                    {apptForm.attendees.length === 0 ? (
                      <p className="text-slate-500 text-xs">
                        İsteğe bağlı — Birden fazla kişi gelecekse ekleyin.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {apptForm.attendees.map((att, idx) => (
                          <div
                            key={
                              att.idNumber
                                ? `attendee-${att.idNumber}`
                                : `attendee-form-new-${idx}`
                            }
                            className="flex gap-2 items-center"
                          >
                            <input
                              data-ocid={`appointments.attendee_name.input.${idx + 1}`}
                              value={att.name}
                              onChange={(e) =>
                                setApptForm((f) => ({
                                  ...f,
                                  attendees: f.attendees.map((a, i) =>
                                    i === idx
                                      ? { ...a, name: e.target.value }
                                      : a,
                                  ),
                                }))
                              }
                              placeholder="Ad Soyad"
                              className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-cyan-400"
                            />
                            <input
                              data-ocid={`appointments.attendee_id.input.${idx + 1}`}
                              value={att.idNumber}
                              onChange={(e) =>
                                setApptForm((f) => ({
                                  ...f,
                                  attendees: f.attendees.map((a, i) =>
                                    i === idx
                                      ? { ...a, idNumber: e.target.value }
                                      : a,
                                  ),
                                }))
                              }
                              placeholder="TC / Pasaport No"
                              className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-cyan-400"
                            />
                            <button
                              type="button"
                              data-ocid={`appointments.remove_attendee.${idx + 1}`}
                              onClick={() =>
                                setApptForm((f) => ({
                                  ...f,
                                  attendees: f.attendees.filter(
                                    (_, i) => i !== idx,
                                  ),
                                }))
                              }
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {apptConflict && (
                    <div
                      data-ocid="appointments.conflict.error_state"
                      className="p-3 rounded-xl border text-sm"
                      style={{
                        background: "rgba(245,158,11,0.1)",
                        border: "1px solid rgba(245,158,11,0.35)",
                        color: "#fbbf24",
                      }}
                    >
                      ⚠️ Bu personelin bu saatte başka randevusu var:{" "}
                      {apptConflict}
                    </div>
                  )}
                  <button
                    type="button"
                    data-ocid="appointments.submit_button"
                    onClick={() => {
                      setLastCreatedApptLink(null);
                      submitAppointment();
                    }}
                    className="w-full py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
                    style={{
                      background: "linear-gradient(135deg,#f59e0b,#d97706)",
                    }}
                  >
                    Randevu Oluştur
                  </button>
                  {lastCreatedApptLink && (
                    <div
                      data-ocid="appointments.confirm_link.success_state"
                      className="p-3 rounded-xl"
                      style={{
                        background: "rgba(14,165,233,0.08)",
                        border: "1px solid rgba(14,165,233,0.3)",
                      }}
                    >
                      <p className="text-[#0ea5e9] text-xs font-semibold mb-1">
                        🔗 Paylaşılabilir Onay Linki:
                      </p>
                      <div className="flex gap-2 items-center">
                        <input
                          readOnly
                          value={lastCreatedApptLink}
                          className="flex-1 text-xs text-slate-300 bg-transparent outline-none truncate"
                        />
                        <button
                          type="button"
                          data-ocid="appointments.copy_link.button"
                          onClick={() => {
                            try {
                              navigator.clipboard.writeText(
                                lastCreatedApptLink ?? "",
                              );
                            } catch {
                              const el = document.createElement("textarea");
                              el.value = lastCreatedApptLink ?? "";
                              document.body.appendChild(el);
                              el.select();
                              document.execCommand("copy");
                              document.body.removeChild(el);
                            }
                            toast.success("Link kopyalandı");
                          }}
                          className="shrink-0 px-2 py-1 rounded-lg text-xs text-[#0ea5e9] border border-[#0ea5e9]/30 hover:bg-[#0ea5e9]/10"
                        >
                          Kopyala
                        </button>
                      </div>
                    </div>
                  )}
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
                            <td className="p-3">
                              {v.status === "departed" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const feedbackUrl = `${window.location.origin}/feedback/${company?.loginCode ?? ""}`;
                                    setSurveyQrVisitor({
                                      id: v.visitorId,
                                      name: v.name,
                                      url: feedbackUrl,
                                    });
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap"
                                  style={{
                                    background: "rgba(245,158,11,0.15)",
                                    border: "1px solid rgba(245,158,11,0.35)",
                                    color: "#f59e0b",
                                  }}
                                >
                                  📋 Anket QR
                                </button>
                              )}
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

          {/* GOREVLER TAB */}
          {tab === "gorevler" && (
            <div className="max-w-2xl space-y-5">
              <h2 className="text-white font-semibold text-lg">
                📋 Personel Görev Panosu
              </h2>
              {/* Task creation form */}
              <div
                className="p-4 rounded-2xl space-y-3"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <p className="text-slate-300 text-sm font-semibold">
                  Yeni Görev Oluştur
                </p>
                <input
                  data-ocid="task.input"
                  type="text"
                  placeholder="Görev başlığı"
                  value={taskForm.title}
                  onChange={(e) =>
                    setTaskForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                />
                <textarea
                  data-ocid="task.textarea"
                  placeholder="Açıklama (isteğe bağlı)"
                  value={taskForm.description}
                  onChange={(e) =>
                    setTaskForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none resize-none"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                />
                <div className="flex gap-3">
                  <select
                    data-ocid="task.select"
                    value={taskForm.assignedTo}
                    onChange={(e) =>
                      setTaskForm((f) => ({ ...f, assignedTo: e.target.value }))
                    }
                    className="flex-1 px-3 py-2 rounded-xl text-sm text-white outline-none"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    <option value="">Atanacak Personel Seç</option>
                    {staffList.map((s) => (
                      <option key={s.staffId} value={s.staffId}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <select
                    data-ocid="task.priority.select"
                    value={taskForm.priority}
                    onChange={(e) =>
                      setTaskForm((f) => ({
                        ...f,
                        priority: e.target.value as "high" | "medium" | "low",
                      }))
                    }
                    className="px-3 py-2 rounded-xl text-sm text-white outline-none"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    <option value="high">🔴 Yüksek</option>
                    <option value="medium">🟡 Orta</option>
                    <option value="low">🟢 Düşük</option>
                  </select>
                </div>
                <button
                  type="button"
                  data-ocid="task.submit_button"
                  onClick={() => {
                    if (!taskForm.title.trim() || !taskForm.assignedTo) {
                      toast.error("Başlık ve atanacak personel zorunludur");
                      return;
                    }
                    const assignee = staffList.find(
                      (s) => s.staffId === taskForm.assignedTo,
                    );
                    const newTask: StaffTask = {
                      id: generateId(),
                      title: taskForm.title.trim(),
                      description: taskForm.description.trim(),
                      assignedTo: taskForm.assignedTo,
                      assignedToName: assignee?.name ?? taskForm.assignedTo,
                      createdBy: session.staffId ?? "",
                      createdByName: staff?.name ?? session.staffId,
                      priority: taskForm.priority,
                      done: false,
                      createdAt: Date.now(),
                    };
                    const key = `safentry_tasks_${session.companyId}`;
                    const updated = [newTask, ...tasks];
                    localStorage.setItem(key, JSON.stringify(updated));
                    setTasks(updated);
                    setTaskForm({
                      title: "",
                      description: "",
                      assignedTo: "",
                      priority: "medium",
                    });
                    toast.success("Görev oluşturuldu");
                  }}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{
                    background: "rgba(14,165,233,0.3)",
                    border: "1px solid rgba(14,165,233,0.5)",
                  }}
                >
                  Görev Ekle
                </button>
              </div>
              {/* Filter tabs */}
              <div className="flex gap-2">
                {(["all", "mine", "done"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    data-ocid={`task.${f}.tab`}
                    onClick={() => setTaskTab(f)}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={
                      taskTab === f
                        ? { background: "#0ea5e9", color: "white" }
                        : {
                            background: "rgba(255,255,255,0.07)",
                            color: "#94a3b8",
                          }
                    }
                  >
                    {f === "all"
                      ? "Tümü"
                      : f === "mine"
                        ? "Bana Atanan"
                        : "Tamamlanan"}
                  </button>
                ))}
              </div>
              {/* Task list */}
              {(() => {
                const filtered = tasks.filter((t) => {
                  if (taskTab === "mine")
                    return t.assignedTo === session.staffId && !t.done;
                  if (taskTab === "done") return t.done;
                  return true;
                });
                if (filtered.length === 0)
                  return (
                    <div
                      data-ocid="task.empty_state"
                      className="text-center py-10 text-slate-500"
                    >
                      <p className="text-3xl mb-2">📋</p>
                      <p>Görev yok</p>
                    </div>
                  );
                return (
                  <div className="space-y-3">
                    {filtered.map((task, idx) => {
                      const pColors = {
                        high: "#ef4444",
                        medium: "#f59e0b",
                        low: "#22c55e",
                      };
                      const pLabels = {
                        high: "Yüksek",
                        medium: "Orta",
                        low: "Düşük",
                      };
                      return (
                        <div
                          key={task.id}
                          data-ocid={`task.item.${idx + 1}`}
                          className="p-4 rounded-2xl flex items-start gap-3"
                          style={{
                            background: task.done
                              ? "rgba(255,255,255,0.02)"
                              : "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            opacity: task.done ? 0.6 : 1,
                          }}
                        >
                          <input
                            type="checkbox"
                            data-ocid={`task.checkbox.${idx + 1}`}
                            checked={task.done}
                            onChange={() => {
                              const key = `safentry_tasks_${session.companyId}`;
                              const updated = tasks.map((t) =>
                                t.id === task.id
                                  ? {
                                      ...t,
                                      done: !t.done,
                                      doneAt: !t.done ? Date.now() : undefined,
                                    }
                                  : t,
                              );
                              localStorage.setItem(
                                key,
                                JSON.stringify(updated),
                              );
                              setTasks(updated);
                            }}
                            className="mt-1 w-4 h-4 rounded accent-teal-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-white text-sm font-semibold ${task.done ? "line-through text-slate-500" : ""}`}
                              >
                                {task.title}
                              </span>
                              <span
                                className="px-2 py-0.5 rounded-full text-xs font-bold"
                                style={{
                                  background: `${pColors[task.priority]}20`,
                                  color: pColors[task.priority],
                                }}
                              >
                                {pLabels[task.priority]}
                              </span>
                            </div>
                            {task.description && (
                              <p className="text-slate-400 text-xs mt-1">
                                {task.description}
                              </p>
                            )}
                            <p className="text-slate-500 text-xs mt-1">
                              👤 {task.assignedToName} &bull;{" "}
                              {new Date(task.createdAt).toLocaleDateString(
                                "tr-TR",
                              )}
                            </p>
                          </div>
                          <button
                            type="button"
                            data-ocid={`task.delete_button.${idx + 1}`}
                            onClick={() => {
                              const key = `safentry_tasks_${session.companyId}`;
                              const updated = tasks.filter(
                                (t) => t.id !== task.id,
                              );
                              localStorage.setItem(
                                key,
                                JSON.stringify(updated),
                              );
                              setTasks(updated);
                            }}
                            className="text-slate-500 hover:text-red-400 text-xs p-1"
                          >
                            🗑️
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* MY CALENDAR TAB */}
          {tab === "mycalendar" &&
            (() => {
              const today = new Date();
              const [calYear, calMonth] = [
                today.getFullYear(),
                today.getMonth(),
              ];
              const myAppts = appointments.filter(
                (a) =>
                  a.status !== "cancelled" &&
                  (a.createdBy === session.staffId ||
                    a.hostName === staff?.name),
              );
              const firstDay = new Date(calYear, calMonth, 1).getDay();
              const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
              const monthName = today.toLocaleString("tr-TR", {
                month: "long",
                year: "numeric",
              });
              return (
                <div data-ocid="mycalendar.section">
                  <h2 className="text-white font-bold text-lg mb-4">
                    📅 {monthName} — Takvimim
                  </h2>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {["Pz", "Pt", "Sa", "Çr", "Pe", "Cu", "Ct"].map((d) => (
                      <div
                        key={d}
                        className="text-center text-slate-500 text-xs py-1 font-semibold"
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstDay }, (_, i) => `pad-${i}`).map(
                      (k) => (
                        <div key={k} />
                      ),
                    )}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const dayAppts = myAppts.filter(
                        (a) => a.appointmentDate === dateStr,
                      );
                      const isToday = day === today.getDate();
                      return (
                        <div
                          key={day}
                          data-ocid={`mycalendar.day.${day}`}
                          className="rounded-xl p-1.5 text-center cursor-default min-h-[52px] flex flex-col items-center"
                          style={{
                            background: isToday
                              ? "rgba(14,165,233,0.15)"
                              : dayAppts.length > 0
                                ? "rgba(245,158,11,0.1)"
                                : "rgba(255,255,255,0.03)",
                            border: isToday
                              ? "1.5px solid rgba(14,165,233,0.5)"
                              : dayAppts.length > 0
                                ? "1px solid rgba(245,158,11,0.3)"
                                : "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <span
                            className="text-xs font-semibold"
                            style={{ color: isToday ? "#38bdf8" : "#cbd5e1" }}
                          >
                            {day}
                          </span>
                          {dayAppts.length > 0 && (
                            <span
                              className="mt-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                              style={{
                                background: "rgba(245,158,11,0.3)",
                                color: "#fbbf24",
                              }}
                            >
                              {dayAppts.length}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Today's appointments */}
                  {(() => {
                    const todayStr = today.toISOString().slice(0, 10);
                    const todayMyAppts = myAppts.filter(
                      (a) => a.appointmentDate === todayStr,
                    );
                    if (todayMyAppts.length === 0)
                      return (
                        <div
                          data-ocid="mycalendar.today.empty_state"
                          className="mt-6 text-center py-8 text-slate-500 text-sm"
                        >
                          Bugün randevunuz yok.
                        </div>
                      );
                    return (
                      <div className="mt-6">
                        <p className="text-slate-300 text-sm font-semibold mb-3">
                          Bugünün Randevuları
                        </p>
                        <div className="space-y-2">
                          {todayMyAppts.map((a, i) => (
                            <div
                              key={a.id}
                              data-ocid={`mycalendar.item.${i + 1}`}
                              className="flex items-center gap-3 p-3 rounded-xl"
                              style={{
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.08)",
                              }}
                            >
                              <span className="text-[#0ea5e9] text-sm font-mono">
                                {a.appointmentTime}
                              </span>
                              <div className="flex-1">
                                <p className="text-white text-sm font-semibold">
                                  {a.visitorName}
                                </p>
                                <p className="text-slate-400 text-xs">
                                  {a.purpose}
                                </p>
                              </div>
                              <span
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{
                                  background:
                                    a.status === "approved"
                                      ? "rgba(34,197,94,0.15)"
                                      : "rgba(245,158,11,0.15)",
                                  color:
                                    a.status === "approved"
                                      ? "#22c55e"
                                      : "#f59e0b",
                                }}
                              >
                                {a.status === "approved"
                                  ? "Onaylandı"
                                  : "Bekliyor"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

          {/* MESSAGES TAB */}
          {tab === "messages" && (
            <div
              data-ocid="messages.section"
              className="flex flex-col h-[70vh] max-w-2xl"
            >
              <h2 className="text-white font-bold text-lg mb-4">
                💬 Personel Mesajlaşma
              </h2>
              <div
                className="flex-1 overflow-y-auto space-y-3 p-3 rounded-2xl mb-3"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {messages.length === 0 ? (
                  <div
                    data-ocid="messages.empty_state"
                    className="text-center py-10 text-slate-500 text-sm"
                  >
                    Henüz mesaj yok. İlk mesajı gönderin!
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isMine = msg.authorId === session.staffId;
                    return (
                      <div
                        key={msg.id}
                        data-ocid={`messages.item.${i + 1}`}
                        className={`flex flex-col max-w-[80%] ${isMine ? "ml-auto items-end" : "items-start"}`}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-slate-500 text-[10px]">
                            {msg.authorName}
                          </span>
                          <span className="text-slate-600 text-[10px]">
                            {new Date(msg.createdAt).toLocaleTimeString(
                              "tr-TR",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </span>
                        </div>
                        <div
                          className="px-4 py-2 rounded-2xl text-sm text-white"
                          style={{
                            background: isMine
                              ? "rgba(14,165,233,0.3)"
                              : "rgba(255,255,255,0.08)",
                            border: isMine
                              ? "1px solid rgba(14,165,233,0.4)"
                              : "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex gap-2">
                <input
                  data-ocid="messages.input"
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && msgInput.trim()) {
                      const msg: StaffMessage = {
                        id: generateId(),
                        authorName: staff?.name ?? "Personel",
                        authorId: session.staffId ?? "",
                        content: msgInput.trim(),
                        createdAt: Date.now(),
                        companyId: session.companyId,
                      };
                      saveStaffMessage(msg);
                      setMessages(getStaffMessages(session.companyId));
                      setMsgInput("");
                    }
                  }}
                  placeholder="Mesaj yazın..."
                  className="flex-1 px-4 py-2 rounded-xl text-white text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                />
                <button
                  type="button"
                  data-ocid="messages.submit_button"
                  onClick={() => {
                    if (!msgInput.trim()) return;
                    const msg: StaffMessage = {
                      id: generateId(),
                      authorName: staff?.name ?? "Personel",
                      authorId: session.staffId ?? "",
                      content: msgInput.trim(),
                      createdAt: Date.now(),
                      companyId: session.companyId,
                    };
                    saveStaffMessage(msg);
                    setMessages(getStaffMessages(session.companyId));
                    setMsgInput("");
                  }}
                  className="px-4 py-2 rounded-xl font-semibold text-white"
                  style={{
                    background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                  }}
                >
                  Gönder
                </button>
              </div>
            </div>
          )}

          {/* INCIDENTS TAB */}
          {tab === "incidents" && (
            <div data-ocid="incidents.section" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold text-lg">
                  🚨 Güvenlik Olayları
                </h2>
              </div>
              {/* Quick log form */}
              <div
                className="p-5 rounded-2xl"
                style={{
                  background: "rgba(239,68,68,0.07)",
                  border: "1.5px solid rgba(239,68,68,0.2)",
                }}
              >
                <h3 className="text-red-400 font-semibold text-sm mb-4">
                  ➕ Yeni Olay Kaydet
                </h3>
                <div className="space-y-3">
                  <input
                    data-ocid="incident.title.input"
                    value={incidentForm.title}
                    onChange={(e) =>
                      setIncidentForm((f) => ({ ...f, title: e.target.value }))
                    }
                    placeholder="Olay başlığı"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-red-400"
                  />
                  <textarea
                    data-ocid="incident.description.textarea"
                    value={incidentForm.description}
                    onChange={(e) =>
                      setIncidentForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Olay açıklaması..."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-red-400 resize-none"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      data-ocid="incident.location.input"
                      value={incidentForm.location}
                      onChange={(e) =>
                        setIncidentForm((f) => ({
                          ...f,
                          location: e.target.value,
                        }))
                      }
                      placeholder="Konum (isteğe bağlı)"
                      className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-red-400"
                    />
                    <select
                      data-ocid="incident.severity.select"
                      value={incidentForm.severity}
                      onChange={(e) =>
                        setIncidentForm((f) => ({
                          ...f,
                          severity: e.target
                            .value as SecurityIncident["severity"],
                        }))
                      }
                      className="px-3 py-2.5 rounded-xl bg-[#0a0f1e] border border-white/15 text-white text-sm focus:outline-none focus:border-red-400"
                    >
                      <option value="low">🟢 Düşük</option>
                      <option value="medium">🟡 Orta</option>
                      <option value="high">🟠 Yüksek</option>
                      <option value="critical">🔴 Kritik</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    data-ocid="incident.submit_button"
                    onClick={() => {
                      if (!incidentForm.title.trim()) {
                        toast.error("Olay başlığı zorunludur");
                        return;
                      }
                      const inc: SecurityIncident = {
                        id: generateId(),
                        companyId: session.companyId,
                        title: incidentForm.title.trim(),
                        description: incidentForm.description.trim(),
                        location: incidentForm.location.trim() || undefined,
                        severity: incidentForm.severity,
                        loggedBy: staff?.name ?? "Personel",
                        timestamp: Date.now(),
                      };
                      saveIncident(inc);
                      setIncidentForm({
                        title: "",
                        description: "",
                        location: "",
                        severity: "medium",
                      });
                      reloadIncidents();
                      toast.success("Olay kaydedildi");
                    }}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{
                      background: "linear-gradient(135deg,#ef4444,#dc2626)",
                    }}
                  >
                    Olayı Kaydet
                  </button>
                </div>
              </div>

              {/* Incidents list */}
              {incidents.length === 0 ? (
                <div
                  data-ocid="incidents.empty_state"
                  className="text-center py-12 text-slate-500 text-sm"
                >
                  <div className="text-4xl mb-3">🛡️</div>
                  <p className="font-medium text-slate-400 mb-1">
                    Kayıtlı olay yok
                  </p>
                  <p>Güvenlik olaylarını yukarıdaki formdan kaydedin.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incidents.map((inc, i) => {
                    const severityColors: Record<
                      SecurityIncident["severity"],
                      {
                        bg: string;
                        border: string;
                        text: string;
                        label: string;
                      }
                    > = {
                      low: {
                        bg: "rgba(34,197,94,0.08)",
                        border: "rgba(34,197,94,0.3)",
                        text: "#22c55e",
                        label: "🟢 Düşük",
                      },
                      medium: {
                        bg: "rgba(245,158,11,0.08)",
                        border: "rgba(245,158,11,0.3)",
                        text: "#f59e0b",
                        label: "🟡 Orta",
                      },
                      high: {
                        bg: "rgba(249,115,22,0.08)",
                        border: "rgba(249,115,22,0.3)",
                        text: "#f97316",
                        label: "🟠 Yüksek",
                      },
                      critical: {
                        bg: "rgba(239,68,68,0.10)",
                        border: "rgba(239,68,68,0.4)",
                        text: "#ef4444",
                        label: "🔴 Kritik",
                      },
                    };
                    const sc = severityColors[inc.severity];
                    return (
                      <div
                        key={inc.id}
                        data-ocid={`incidents.item.${i + 1}`}
                        className="p-4 rounded-2xl"
                        style={{
                          background: sc.bg,
                          border: `1.5px solid ${sc.border}`,
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                style={{
                                  background: sc.border,
                                  color: sc.text,
                                }}
                              >
                                {sc.label}
                              </span>
                              {inc.location && (
                                <span className="text-slate-500 text-xs">
                                  📍 {inc.location}
                                </span>
                              )}
                            </div>
                            <p className="text-white font-semibold text-sm">
                              {inc.title}
                            </p>
                            {inc.description && (
                              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                                {inc.description}
                              </p>
                            )}
                            <p className="text-slate-600 text-xs mt-2">
                              {inc.loggedBy} —{" "}
                              {new Date(inc.timestamp).toLocaleString("tr-TR")}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1.5 items-end">
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                              style={{
                                background:
                                  inc.escalationLevel === 3
                                    ? "rgba(168,85,247,0.2)"
                                    : inc.escalationLevel === 2
                                      ? "rgba(245,158,11,0.2)"
                                      : "rgba(255,255,255,0.06)",
                                color:
                                  inc.escalationLevel === 3
                                    ? "#a855f7"
                                    : inc.escalationLevel === 2
                                      ? "#f59e0b"
                                      : "#64748b",
                              }}
                            >
                              Seviye {inc.escalationLevel ?? 1}
                            </span>
                            <button
                              type="button"
                              data-ocid={`incidents.escalate_button.${i + 1}`}
                              onClick={() => setEscalationModalInc(inc)}
                              className="text-xs px-2 py-1 rounded-lg transition-colors hover:opacity-80"
                              style={{
                                background: "rgba(0,212,170,0.12)",
                                color: "#00d4aa",
                                border: "1px solid rgba(0,212,170,0.25)",
                              }}
                            >
                              🔼 Eskalasyon
                            </button>
                            <button
                              type="button"
                              data-ocid={`incidents.delete_button.${i + 1}`}
                              onClick={() => {
                                deleteIncident(session.companyId, inc.id);
                                reloadIncidents();
                                toast.success("Olay silindi");
                              }}
                              className="text-slate-600 hover:text-red-400 transition-colors text-xs px-2 py-1 rounded-lg hover:bg-red-900/20"
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

              {/* Escalation modal */}
              {escalationModalInc &&
                (() => {
                  const inc = escalationModalInc;
                  const level = inc.escalationLevel ?? 1;
                  const levelLabels: Record<number, string> = {
                    1: "Güvenlik Personeli",
                    2: "Güvenlik Müdürü",
                    3: "Yönetim",
                  };
                  const levelColors: Record<number, string> = {
                    1: "#64748b",
                    2: "#f59e0b",
                    3: "#a855f7",
                  };
                  return (
                    <div
                      className="fixed inset-0 z-50 flex items-center justify-center p-4"
                      style={{ background: "rgba(0,0,0,0.7)" }}
                      data-ocid="incidents.modal"
                    >
                      <div
                        className="w-full max-w-md rounded-3xl p-6 space-y-4"
                        style={{
                          background: "#0d1424",
                          border: "1.5px solid rgba(0,212,170,0.3)",
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <h3 className="text-white font-bold text-lg">
                            🔼 Eskalasyon Zinciri
                          </h3>
                          <button
                            type="button"
                            onClick={() => setEscalationModalInc(null)}
                            className="text-slate-400 hover:text-white text-xl"
                          >
                            ✕
                          </button>
                        </div>
                        <div
                          className="p-3 rounded-xl"
                          style={{ background: "rgba(255,255,255,0.04)" }}
                        >
                          <p className="text-white font-semibold text-sm">
                            {inc.title}
                          </p>
                          <p className="text-slate-500 text-xs mt-1">
                            {new Date(inc.timestamp).toLocaleString("tr-TR")}
                          </p>
                        </div>
                        {/* Escalation chain visualization */}
                        <div className="space-y-2">
                          {([1, 2, 3] as const).map((l) => {
                            const histEntry = inc.escalationHistory?.find(
                              (h) => h.level === l,
                            );
                            return (
                              <div
                                key={l}
                                className="flex items-center gap-3 p-3 rounded-xl"
                                style={{
                                  background:
                                    l <= level
                                      ? "rgba(0,212,170,0.06)"
                                      : "rgba(255,255,255,0.03)",
                                  border: `1px solid ${l === level ? "rgba(0,212,170,0.3)" : "rgba(255,255,255,0.07)"}`,
                                }}
                              >
                                <span className="text-lg">
                                  {l <= level ? "✅" : "⬜"}
                                </span>
                                <div className="flex-1">
                                  <p
                                    className="text-sm font-medium"
                                    style={{ color: levelColors[l] }}
                                  >
                                    Seviye {l}: {levelLabels[l]}
                                  </p>
                                  {histEntry && (
                                    <p className="text-slate-500 text-xs">
                                      {histEntry.by} —{" "}
                                      {new Date(
                                        histEntry.timestamp,
                                      ).toLocaleString("tr-TR")}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex gap-3">
                          {level < 3 && (
                            <button
                              type="button"
                              data-ocid="incidents.escalate.confirm_button"
                              onClick={() => {
                                const nextLevel = (level + 1) as 1 | 2 | 3;
                                const updated = {
                                  ...inc,
                                  escalationLevel: nextLevel,
                                  escalationHistory: [
                                    ...(inc.escalationHistory ?? [
                                      {
                                        level: 1 as const,
                                        timestamp: inc.timestamp,
                                        by: inc.loggedBy,
                                      },
                                    ]),
                                    {
                                      level: nextLevel,
                                      timestamp: Date.now(),
                                      by: staff?.name ?? "Personel",
                                    },
                                  ],
                                };
                                saveIncident(updated);
                                setEscalationModalInc(null);
                                reloadIncidents();
                                toast.success(
                                  `Seviye ${nextLevel}'e eskalasyon edildi`,
                                );
                              }}
                              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                              style={{
                                background:
                                  "linear-gradient(135deg,#f59e0b,#d97706)",
                              }}
                            >
                              Bir Üst Seviyeye Eskalasyon Et
                            </button>
                          )}
                          <button
                            type="button"
                            data-ocid="incidents.escalate.cancel_button"
                            onClick={() => setEscalationModalInc(null)}
                            className="px-4 py-2.5 rounded-xl text-sm text-slate-400"
                            style={{ background: "rgba(255,255,255,0.05)" }}
                          >
                            Kapat
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              {/* Export button */}
              {incidents.length > 0 && (
                <button
                  type="button"
                  data-ocid="incidents.export_button"
                  onClick={() => {
                    const rows = [
                      [
                        "Tarih",
                        "Başlık",
                        "Açıklama",
                        "Konum",
                        "Ciddiyet",
                        "Kaydeden",
                      ],
                      ...incidents.map((inc) => [
                        new Date(inc.timestamp).toLocaleString("tr-TR"),
                        inc.title,
                        inc.description,
                        inc.location ?? "",
                        inc.severity,
                        inc.loggedBy,
                      ]),
                    ];
                    const csv = rows
                      .map((r) =>
                        r
                          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
                          .join(","),
                      )
                      .join("\n");
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "olay_raporu.csv";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-slate-300 transition-colors hover:text-white"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  📥 Olay Raporu İndir (CSV)
                </button>
              )}
            </div>
          )}

          {/* PROFILE TAB */}
          {tab === "patrol" && (
            <PatrolTab
              companyId={session.companyId}
              staffId={session.staffId ?? ""}
              staffName={
                staffList.find((s) => s.staffId === session.staffId)?.name ??
                session.staffId ??
                "Personel"
              }
            />
          )}

          {/* MAINTENANCE REQUESTS TAB - Staff */}
          {tab === "maintenance" && (
            <MaintenanceTab
              companyId={session.companyId}
              staffId={session.staffId ?? ""}
              staffList={staffList}
            />
          )}

          {tab === "handover" && (
            <div className="max-w-2xl space-y-5">
              <h2 className="text-white font-semibold text-lg">
                🔄 Devir-Teslim Raporlarım
              </h2>
              <HandoverHistoryList
                companyId={session.companyId}
                staffName={staff?.name}
              />
            </div>
          )}

          {tab === "shiftswap" && (
            <ShiftSwapTab
              companyId={session.companyId}
              staffId={session.staffId ?? ""}
              staffName={
                staffList.find((s) => s.staffId === session.staffId)?.name ??
                "Personel"
              }
              staffList={staffList}
              isAdmin={staff?.role === "admin"}
            />
          )}

          {tab === "imptasks" && (
            <div className="max-w-2xl">
              <StaffImprovementTasksTab
                companyId={session.companyId}
                staffCode={staff?.staffId ?? session.staffId ?? ""}
              />
            </div>
          )}

          {tab === "training" && (
            <div className="max-w-2xl">
              <TrainingTab staffId={session.staffId ?? ""} />
            </div>
          )}

          {tab === "queue" &&
            (() => {
              const queue = getQueue(session.companyId);
              const queueVisitors = queue.map((q) => ({
                ...q,
                visitor: visitors.find((v) => v.visitorId === q.visitorId),
              }));
              return (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-white font-bold text-xl">
                        🔢 Bekleme Sırası
                      </h2>
                      <p className="text-slate-400 text-sm mt-0.5">
                        Kiosk üzerinden kayıt olan ziyaretçilerin sırası
                      </p>
                    </div>
                    <div
                      className="px-4 py-2 rounded-xl text-center"
                      style={{
                        background: "rgba(14,165,233,0.15)",
                        border: "1px solid rgba(14,165,233,0.3)",
                      }}
                    >
                      <div className="text-2xl font-bold text-[#0ea5e9]">
                        {queue.length}
                      </div>
                      <div className="text-slate-400 text-xs">Bekliyor</div>
                    </div>
                  </div>
                  {queue.length === 0 ? (
                    <div
                      data-ocid="queue.empty_state"
                      className="text-center py-12 text-slate-500"
                    >
                      <div className="text-5xl mb-3">🔢</div>
                      <p className="text-lg font-medium">
                        Bekleme sırasında kimse yok
                      </p>
                      <p className="text-sm mt-1">
                        Ziyaretçiler kiosk üzerinden kayıt olduğunda buraya
                        eklenirler
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {queueVisitors.map((q, i) => {
                        const waitMins = Math.floor(
                          (Date.now() - q.waitingSince) / 60000,
                        );
                        const host = q.visitor
                          ? getStaffByCompany(session.companyId).find(
                              (s) => s.staffId === q.visitor!.hostStaffId,
                            )
                          : null;
                        return (
                          <div
                            key={q.visitorId}
                            data-ocid={`queue.item.${i + 1}`}
                            className="flex items-center justify-between p-4 rounded-2xl"
                            style={{
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.1)",
                            }}
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                                style={{ background: "rgba(14,165,233,0.3)" }}
                              >
                                #{q.queueNo}
                              </div>
                              <div>
                                <p className="text-white font-semibold">
                                  {q.visitorName}
                                </p>
                                {host && (
                                  <p className="text-slate-400 text-xs">
                                    Host: {host.name}
                                  </p>
                                )}
                                <p className="text-slate-500 text-xs">
                                  {waitMins} dk önce geldi
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                data-ocid={`queue.secondary_button.${i + 1}`}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300"
                                style={{
                                  background: "rgba(245,158,11,0.15)",
                                  border: "1px solid rgba(245,158,11,0.3)",
                                }}
                                onClick={() =>
                                  toast.info(
                                    `Sıra No ${q.queueNo}: ${q.visitorName} çağrıldı`,
                                  )
                                }
                              >
                                📣 Çağır
                              </button>
                              <button
                                type="button"
                                data-ocid={`queue.primary_button.${i + 1}`}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-300"
                                style={{
                                  background: "rgba(34,197,94,0.15)",
                                  border: "1px solid rgba(34,197,94,0.3)",
                                }}
                                onClick={() => {
                                  removeFromQueue(
                                    session.companyId,
                                    q.visitorId,
                                  );
                                  reload();
                                }}
                              >
                                ✅ Karşılandı
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

          {tab === "punchin" &&
            (() => {
              const staffName = (() => {
                const s = staffList.find((s) => s.staffId === session.staffId);
                return s?.name ?? session.staffId ?? "Personel";
              })();
              const todayStart = new Date();
              todayStart.setHours(0, 0, 0, 0);
              const todayPunches = punchLog.filter(
                (p) =>
                  p.staffId === session.staffId &&
                  p.time >= todayStart.getTime(),
              );
              const lastPunch = [...punchLog]
                .filter((p) => p.staffId === session.staffId)
                .sort((a, b) => b.time - a.time)[0];
              const isPunchedIn = lastPunch?.type === "in";
              let todayMs = 0;
              const sorted = [...todayPunches].sort((a, b) => a.time - b.time);
              let inTime: number | null = null;
              for (const p of sorted) {
                if (p.type === "in") {
                  inTime = p.time;
                } else if (p.type === "out" && inTime !== null) {
                  todayMs += p.time - inTime;
                  inTime = null;
                }
              }
              if (isPunchedIn && inTime !== null)
                todayMs += Date.now() - inTime;
              const todayHours = (todayMs / 3600000).toFixed(2);
              return (
                <div className="max-w-lg mx-auto space-y-6">
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-white mb-1">
                      ⏱️ Mesai Takibi
                    </h2>
                    <p className="text-slate-400 text-sm">
                      Vardiya başlatma ve bitiş kaydı
                    </p>
                  </div>
                  <div
                    className="flex flex-col items-center gap-4 p-8 rounded-2xl"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <div
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold ${isPunchedIn ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-slate-700/50 text-slate-400 border border-slate-600/40"}`}
                    >
                      {isPunchedIn ? "🟢 Görevde" : "⚪ Görev Dışı"}
                    </div>
                    <button
                      data-ocid="punchin.primary_button"
                      type="button"
                      onClick={() => {
                        const record: PunchRecord = {
                          id: Date.now().toString(),
                          staffId: session.staffId ?? "",
                          staffName,
                          type: isPunchedIn ? "out" : "in",
                          time: Date.now(),
                        };
                        const updated = [...punchLog, record];
                        savePunchLog(session.companyId, updated);
                        setPunchLog(updated);
                      }}
                      className="w-48 h-48 rounded-full text-white font-bold text-xl transition-all hover:scale-105 active:scale-95 shadow-lg"
                      style={{
                        background: isPunchedIn
                          ? "linear-gradient(135deg,#ef4444,#dc2626)"
                          : "linear-gradient(135deg,#22c55e,#16a34a)",
                      }}
                    >
                      {isPunchedIn ? "Görevi Bitir" : "Göreve Başla"}
                    </button>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-[#0ea5e9]">
                        {todayHours} sa
                      </div>
                      <div className="text-slate-400 text-sm">
                        Bugünkü çalışma süresi
                      </div>
                    </div>
                  </div>
                  <div
                    className="rounded-2xl overflow-hidden"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div className="px-4 py-3 border-b border-white/10">
                      <h3 className="text-white font-semibold text-sm">
                        Son Kayıtlar
                      </h3>
                    </div>
                    {[...punchLog]
                      .filter((p) => p.staffId === session.staffId)
                      .sort((a, b) => b.time - a.time)
                      .slice(0, 20).length === 0 ? (
                      <div
                        data-ocid="punchin.empty_state"
                        className="text-center py-10 text-slate-500"
                      >
                        <div className="text-4xl mb-2">⏱️</div>
                        <p className="text-sm">Henüz kayıt yok</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {[...punchLog]
                          .filter((p) => p.staffId === session.staffId)
                          .sort((a, b) => b.time - a.time)
                          .slice(0, 20)
                          .map((p, idx) => (
                            <div
                              key={p.id}
                              data-ocid={`punchin.item.${idx + 1}`}
                              className="px-4 py-3 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={`w-2 h-2 rounded-full ${p.type === "in" ? "bg-emerald-400" : "bg-red-400"}`}
                                />
                                <span
                                  className={`text-sm font-medium ${p.type === "in" ? "text-emerald-400" : "text-red-400"}`}
                                >
                                  {p.type === "in" ? "Giriş" : "Çıkış"}
                                </span>
                              </div>
                              <span className="text-slate-400 text-xs">
                                {new Date(p.time).toLocaleString("tr-TR")}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

          {tab === "invitations" &&
            (() => {
              const stage1 = invitations.length;
              const stage2 = invitations.filter(
                (inv) => (inv as any).openedAt,
              ).length;
              const stage3 = invitations.filter(
                (inv) =>
                  (inv as any).preRegCompleted ||
                  (inv as any).status === "preregistered",
              ).length;
              const stage4 = invitations.filter(
                (inv) => (inv as any).converted,
              ).length;
              const getStage = (inv: Invitation) => {
                if ((inv as any).converted) return 4;
                if (
                  (inv as any).preRegCompleted ||
                  (inv as any).status === "preregistered"
                )
                  return 3;
                if ((inv as any).openedAt) return 2;
                return 1;
              };
              const stageLabel = (s: number) =>
                s === 4
                  ? "Randevuya Dönüştü"
                  : s === 3
                    ? "Ön Kayıt Tamamlandı"
                    : s === 2
                      ? "Açıldı"
                      : "Gönderildi";
              const stageColor = (s: number) =>
                s === 4
                  ? {
                      bg: "rgba(16,185,129,0.15)",
                      border: "rgba(16,185,129,0.4)",
                      text: "#34d399",
                    }
                  : s === 3
                    ? {
                        bg: "rgba(245,158,11,0.15)",
                        border: "rgba(245,158,11,0.4)",
                        text: "#fbbf24",
                      }
                    : s === 2
                      ? {
                          bg: "rgba(14,165,233,0.15)",
                          border: "rgba(14,165,233,0.4)",
                          text: "#38bdf8",
                        }
                      : {
                          bg: "rgba(100,116,139,0.15)",
                          border: "rgba(100,116,139,0.4)",
                          text: "#94a3b8",
                        };
              return (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">
                      ✉️ Davet Takip Hunisi
                    </h2>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {(
                      [
                        ["Gönderildi", stage1, 1],
                        ["Açıldı", stage2, 2],
                        ["Ön Kayıt", stage3, 3],
                        ["Dönüştü", stage4, 4],
                      ] as [string, number, number][]
                    ).map(([label, count, s], i, arr) => {
                      const c = stageColor(s);
                      return (
                        <div key={label} className="flex items-center gap-1">
                          <div
                            className="flex-1 rounded-xl p-4 text-center"
                            style={{
                              background: c.bg,
                              border: `1px solid ${c.border}`,
                            }}
                          >
                            <div
                              className="text-2xl font-bold"
                              style={{ color: c.text }}
                            >
                              {count}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                              {label}
                            </div>
                          </div>
                          {i < arr.length - 1 && (
                            <span className="text-slate-600 text-lg">→</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {invitations.length === 0 ? (
                    <div
                      data-ocid="invitations.empty_state"
                      className="text-center py-16 text-slate-500"
                    >
                      <div className="text-5xl mb-3">✉️</div>
                      <p className="text-lg font-medium">Henüz davet yok</p>
                      <p className="text-sm mt-1">
                        Ziyaretçilere davet linki göndermek için yeni davet
                        oluşturun
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {invitations.map((inv, idx) => {
                        const s = getStage(inv);
                        const c = stageColor(s);
                        const link = `${window.location.origin}/?invite=${inv.token}`;
                        return (
                          <div
                            key={inv.token}
                            data-ocid={`invitations.item.${idx + 1}`}
                            className="p-4 rounded-xl flex items-center justify-between gap-4"
                            style={{
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.08)",
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-white font-medium text-sm">
                                  {inv.visitorName || "—"}
                                </span>
                                <span
                                  className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                  style={{
                                    background: c.bg,
                                    border: `1px solid ${c.border}`,
                                    color: c.text,
                                  }}
                                >
                                  {stageLabel(s)}
                                </span>
                              </div>
                              <div className="text-slate-500 text-xs mt-0.5 font-mono">
                                {inv.token}
                              </div>
                              <div className="text-slate-500 text-xs">
                                {new Date(inv.createdAt).toLocaleDateString(
                                  "tr-TR",
                                )}
                              </div>
                            </div>
                            <button
                              data-ocid={`invitations.item.${idx + 1}.button`}
                              type="button"
                              onClick={() =>
                                navigator.clipboard
                                  .writeText(link)
                                  .catch(() => {})
                              }
                              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white shrink-0 hover:opacity-80 transition-opacity"
                              style={{
                                background: "rgba(14,165,233,0.2)",
                                border: "1px solid rgba(14,165,233,0.4)",
                              }}
                            >
                              🔗 Kopyala
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

          {tab === "profile" && (
            <div className="max-w-xl space-y-6">
              <div className="flex items-center gap-4">
                {staffProfilePhoto ? (
                  <img
                    src={staffProfilePhoto}
                    alt="Profil"
                    className="w-14 h-14 rounded-2xl object-cover"
                  />
                ) : (
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                    style={{
                      background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                    }}
                  >
                    {staff?.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
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

              {/* Profile Photo Section */}
              <div
                data-ocid="staff_profile.photo.panel"
                className="p-5 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <p className="text-slate-300 text-sm font-semibold mb-3">
                  📸 Profil Fotoğrafı
                </p>
                {staffProfilePhoto && (
                  <div className="flex items-center gap-4 mb-3">
                    <img
                      src={staffProfilePhoto}
                      alt="Profil"
                      className="w-16 h-16 rounded-2xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        saveStaffPhoto(session.staffId ?? "", "");
                        setStaffProfilePhoto("");
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      Kaldır
                    </button>
                  </div>
                )}
                <label
                  className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white w-fit"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  📷 Fotoğraf Yükle
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const bytes = await fileToBytes(file);
                      const url = await uploadBytesToBlob(bytes);
                      saveStaffPhoto(session.staffId ?? "", url ?? "");
                      setStaffProfilePhoto(url ?? "");
                    }}
                  />
                </label>
              </div>

              {/* Personnel Code */}
              <div
                className="p-5 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <p className="text-slate-300 text-sm font-semibold mb-3">
                  🔑 Personel Kodunuz
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 px-4 py-3 rounded-xl font-mono text-[#f59e0b] text-sm tracking-widest select-all"
                    style={{
                      background: "rgba(245,158,11,0.06)",
                      border: "1px solid rgba(245,158,11,0.25)",
                    }}
                  >
                    {staff?.staffId ?? session.staffId}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyCode(
                        staff?.staffId ?? session.staffId ?? "",
                        "personnel",
                      )
                    }
                    data-ocid="staff_profile.code.button"
                    className="px-3 py-3 rounded-xl text-xs font-medium transition-all"
                    style={{
                      background:
                        copiedCode === "personnel"
                          ? "rgba(34,197,94,0.15)"
                          : "rgba(255,255,255,0.08)",
                      border:
                        copiedCode === "personnel"
                          ? "1px solid rgba(34,197,94,0.4)"
                          : "1px solid rgba(255,255,255,0.15)",
                      color: copiedCode === "personnel" ? "#4ade80" : "#94a3b8",
                    }}
                  >
                    {copiedCode === "personnel" ? "✓" : "📋"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newCode = resetStaffCode(session.staffId ?? "");
                    if (newCode) {
                      refreshSession();
                      onRefresh();
                    }
                  }}
                  className="mt-3 px-4 py-2 rounded-xl text-xs font-medium text-amber-400 hover:bg-amber-400/10 transition-colors"
                  style={{ border: "1px solid rgba(245,158,11,0.3)" }}
                >
                  🔄 Kodu Yenile
                </button>
              </div>

              {/* Company Codes */}
              <div
                className="p-5 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <p className="text-slate-300 text-sm font-semibold mb-3">
                  🏢 Şirket Kodu
                </p>
                {staffCompanies.length === 0 ? (
                  <p className="text-slate-500 text-sm">Şirket bulunamadı.</p>
                ) : (
                  staffCompanies.map((c) => (
                    <div
                      key={c.companyId}
                      className="flex items-center gap-2 mb-2"
                    >
                      <span className="text-slate-400 text-xs mr-1">
                        {c.name}
                      </span>
                      <div
                        className="flex-1 px-3 py-2 rounded-xl font-mono text-[#0ea5e9] text-xs tracking-widest select-all"
                        style={{
                          background: "rgba(14,165,233,0.06)",
                          border: "1px solid rgba(14,165,233,0.2)",
                        }}
                      >
                        {c.companyId}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          copyCode(c.companyId, `company_${c.companyId}`)
                        }
                        className="px-2 py-2 rounded-lg text-xs transition-all"
                        style={{
                          background:
                            copiedCode === `company_${c.companyId}`
                              ? "rgba(34,197,94,0.15)"
                              : "rgba(255,255,255,0.08)",
                          border: `1px solid ${copiedCode === `company_${c.companyId}` ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.15)"}`,
                          color:
                            copiedCode === `company_${c.companyId}`
                              ? "#4ade80"
                              : "#94a3b8",
                        }}
                      >
                        {copiedCode === `company_${c.companyId}` ? "✓" : "📋"}
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Language setting */}
              <div
                className="p-5 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <p className="text-slate-300 text-sm font-semibold mb-3">
                  🌐 Dil Ayarı
                </p>
                <select
                  value={lang}
                  onChange={(e) => {
                    localStorage.setItem("safentry_lang", e.target.value);
                    onRefresh();
                  }}
                  className="w-full px-4 py-3 rounded-xl text-white text-sm focus:outline-none"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  {[
                    ["tr", "🇹🇷 Türkçe"],
                    ["en", "🇬🇧 English"],
                    ["de", "🇩🇪 Deutsch"],
                    ["fr", "🇫🇷 Français"],
                    ["es", "🇪🇸 Español"],
                    ["ar", "🇸🇦 العربية"],
                    ["ru", "🇷🇺 Русский"],
                    ["zh", "🇨🇳 中文"],
                    ["pt", "🇵🇹 Português"],
                    ["jp", "🇯🇵 日本語"],
                  ].map(([code, label]) => (
                    <option
                      key={code}
                      value={code}
                      style={{ background: "#0f1729" }}
                    >
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Logout */}
              <button
                type="button"
                data-ocid="staff_profile.logout.button"
                onClick={() => {
                  clearSession();
                  onNavigate("welcome");
                }}
                className="w-full py-3 rounded-xl text-sm font-medium text-red-400 transition-colors hover:bg-red-400/10"
                style={{ border: "1px solid rgba(239,68,68,0.3)" }}
              >
                🚪 Çıkış Yap
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-2 py-2 border-t border-white/10"
        style={{ background: "rgba(10,22,40,0.97)" }}
      >
        {(
          [
            ["register", "📝", "Kayıt"],
            ["active", "🟢", "Aktif"],
            ["appointments", "📅", "Randevu"],
            ["history", "📜", "Geçmiş"],
            ["profile", "👤", "Hesabım"],
          ] as [Tab, string, string][]
        ).map(([key, icon, label]) => (
          <button
            type="button"
            key={key}
            data-ocid={`staff_dashboard.mobile_${key}.tab`}
            onClick={() => setTab(key)}
            className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all"
            style={{ color: tab === key ? "#0ea5e9" : "#64748b" }}
          >
            <span className="text-lg">{icon}</span>
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </div>

      {/* Survey QR Modal */}
      {surveyQrVisitor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setSurveyQrVisitor(null)}
          onKeyDown={(e) => e.key === "Escape" && setSurveyQrVisitor(null)}
          role="presentation"
        >
          <div
            className="p-6 rounded-2xl max-w-sm w-full space-y-4"
            style={{
              background: "#0a1628",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-semibold">
              📋 Memnuniyet Anketi QR
            </h3>
            <p className="text-slate-400 text-sm">
              {surveyQrVisitor.name} için anket bağlantısı:
            </p>
            <div
              className="mx-auto w-40 h-40 rounded-xl flex items-center justify-center"
              style={{
                background: "rgba(0,212,255,0.1)",
                border: "2px dashed rgba(0,212,255,0.3)",
              }}
            >
              <div className="text-center">
                <div className="text-3xl mb-1">📱</div>
                <div className="text-[#00d4ff] text-xs font-mono">Anket QR</div>
              </div>
            </div>
            <div
              className="p-2 rounded-lg font-mono text-xs text-[#00d4ff] break-all"
              style={{
                background: "rgba(0,212,255,0.06)",
                border: "1px solid rgba(0,212,255,0.2)",
              }}
            >
              {surveyQrVisitor.url}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(surveyQrVisitor.url);
                }}
                className="flex-1 py-2 rounded-lg text-sm text-white"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                }}
              >
                🔗 Kopyala
              </button>
              <button
                type="button"
                onClick={() => setSurveyQrVisitor(null)}
                className="flex-1 py-2 rounded-lg text-sm text-slate-300"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Tour for Security Staff */}
      {showTour && (
        <InteractiveTour
          tourKey="security_staff"
          steps={[
            {
              target: "visitors.register.button",
              title: "Ziyaretçi Kayıt",
              content: "Yeni ziyaretçi kaydı oluşturun ve giriş yaptırın.",
            },
            {
              target: "visitors.active.tab",
              title: "Aktif Ziyaretçiler",
              content:
                "Şu an binada bulunan ziyaretçileri buradan takip edebilirsiniz.",
            },
            {
              target: "appointments.create.button",
              title: "Randevular",
              content: "Önceden randevu oluşturun ve ziyaretçileri davet edin.",
            },
          ]}
          onComplete={() => setShowTour(false)}
        />
      )}
      {/* OCR Modal */}
      {showOcrModal && (
        <OcrScanModal
          onFill={(name, idNumber) =>
            setForm((f) => ({ ...f, name, idNumber }))
          }
          onClose={() => setShowOcrModal(false)}
        />
      )}

      {/* Access Upgrade Modal */}
      {accessUpgradeVisitor && (
        <div
          data-ocid="erisimstalepleri.modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{
              background: "#0f1729",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <h3 className="text-white font-bold text-lg">
              ⬆️ Erişim Yükseltme Talebi
            </h3>
            <p className="text-slate-400 text-sm">
              Ziyaretçi:{" "}
              <span className="text-white">{accessUpgradeVisitor.name}</span>
            </p>
            <div>
              <p className="text-slate-400 text-xs mb-1">
                Ek Bölgeler (virgülle ayırın)
              </p>
              <input
                data-ocid="erisimstalepleri.input"
                value={accessUpgradeZones.join(", ")}
                onChange={(e) =>
                  setAccessUpgradeZones(
                    e.target.value
                      .split(",")
                      .map((z) => z.trim())
                      .filter(Boolean),
                  )
                }
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
                placeholder="Örn: Üretim Alanı, Depo"
              />
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Gerekçe *</p>
              <textarea
                data-ocid="erisimstalepleri.textarea"
                value={accessUpgradeReason}
                onChange={(e) => setAccessUpgradeReason(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9] resize-none"
                placeholder="Neden ek erişim gerekiyor?"
              />
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Süre</p>
              <select
                data-ocid="erisimstalepleri.select"
                value={accessUpgradeDuration}
                onChange={(e) =>
                  setAccessUpgradeDuration(
                    e.target.value as "1h" | "4h" | "8h" | "custom",
                  )
                }
                className="w-full px-3 py-2 rounded-xl bg-[#0f1729] border border-white/20 text-white text-sm focus:outline-none"
              >
                <option value="1h">1 Saat</option>
                <option value="4h">4 Saat</option>
                <option value="8h">8 Saat</option>
                <option value="custom">Özel</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                data-ocid="erisimstalepleri.submit_button"
                disabled={
                  !accessUpgradeReason.trim() || accessUpgradeZones.length === 0
                }
                onClick={() => {
                  if (!accessUpgradeVisitor) return;
                  saveAccessUpgradeRequest({
                    id: `accupg_${Date.now()}`,
                    companyId: accessUpgradeVisitor.companyId,
                    visitId: accessUpgradeVisitor.visitorId,
                    visitorId: accessUpgradeVisitor.visitorId,
                    visitorName: accessUpgradeVisitor.name,
                    requestedBy:
                      staffList.find((s) => s.staffId === session?.staffId)
                        ?.name ?? "Personel",
                    zones: accessUpgradeZones,
                    reason: accessUpgradeReason,
                    duration: accessUpgradeDuration,
                    status: "pending",
                    createdAt: Date.now(),
                  });
                  toast.success("Erişim yükseltme talebi gönderildi");
                  setAccessUpgradeVisitor(null);
                  setAccessUpgradeZones([]);
                  setAccessUpgradeReason("");
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                }}
              >
                Talep Gönder
              </button>
              <button
                type="button"
                data-ocid="erisimstalepleri.cancel_button"
                onClick={() => setAccessUpgradeVisitor(null)}
                className="flex-1 py-2.5 rounded-xl text-sm text-slate-300"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Tour Button */}
      <button
        type="button"
        onClick={() => setShowTour(true)}
        title="Tur Başlat"
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full text-white font-bold text-xl flex items-center justify-center shadow-lg"
        style={{
          background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
          border: "2px solid rgba(14,165,233,0.4)",
        }}
      >
        ?
      </button>
    </>
  );
}
