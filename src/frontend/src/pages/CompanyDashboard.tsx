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
import { addAuditLog, getAuditLogs } from "../auditLog";
import ConfirmModal from "../components/ConfirmModal";
import LangSwitcher from "../components/LangSwitcher";
import { getLang, t } from "../i18n";
import {
  addToBlacklist,
  clearSession,
  findCompanyById,
  getAnnouncements,
  getBlacklist,
  getSession,
  getStaffByCompany,
  getVisitors,
  refreshSession,
  removeFromBlacklist,
  removeStaff as removeStaffStore,
  resetStaffCode,
  saveAnnouncement,
  saveCompany,
  saveInviteCode,
  saveStaff,
  saveVisitor,
} from "../store";
import type {
  AppScreen,
  AuditLog,
  BlacklistEntry,
  Company,
  Staff,
  Visitor,
} from "../types";
import { durationLabel, formatDateTime, generateId } from "../utils";

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

interface Props {
  onNavigate: (s: AppScreen) => void;
  onRefresh: () => void;
}

type Tab =
  | "visitors"
  | "staff"
  | "blacklist"
  | "statistics"
  | "evacuation"
  | "announcements"
  | "auditlog"
  | "profile";

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
  const [visitorFilter, setVisitorFilter] = useState<
    "all" | "active" | "departed"
  >("all");
  const [visitorSearch, setVisitorSearch] = useState("");
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [announcements, setAnnouncements] = useState(
    getAnnouncements(session.companyId),
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [auditDateFilter, setAuditDateFilter] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [_confirmMsg, setConfirmMsg] = useState("");
  const [newStaffCode, setNewStaffCode] = useState("");
  const [blIdNumber, setBlIdNumber] = useState("");
  const [blReason, setBlReason] = useState("");
  const [announcementMsg, setAnnouncementMsg] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [profileForm, setProfileForm] = useState<Partial<Company>>(
    company ?? {},
  );
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

  const reload = useCallback(() => {
    setVisitors(getVisitors(session.companyId));
    setStaffList(getStaffByCompany(session.companyId));
    setBlacklist(getBlacklist(session.companyId));
    setAuditLogs(getAuditLogs(session.companyId));
    refreshSession();
  }, [session.companyId]);

  useEffect(() => {
    reload();
    const timer = setInterval(() => reload(), 60000);
    return () => clearInterval(timer);
  }, [reload]);

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
    reload();
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
    alert("Profil güncellendi.");
  };

  const copyCompanyCode = () => {
    navigator.clipboard.writeText(company.companyId).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
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
  const filtered = visitors
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
    { key: "statistics", label: t(lang, "statistics") },
    { key: "evacuation", label: t(lang, "evacuation") },
    { key: "announcements", label: t(lang, "announcements") },
    { key: "auditlog", label: "📋 Denetim Logu" },
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
    return {
      name: s.name,
      total: registered.length,
      avgDurMins,
      topCat,
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
          <LangSwitcher onChange={onRefresh} />
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
              <div
                data-ocid="visitors.empty_state"
                className="text-center py-16 text-slate-500"
              >
                {t(lang, "noData")}
              </div>
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
                      <div className="text-slate-500 text-xs shrink-0 ml-4">
                        {v.departureTime
                          ? durationLabel(v.arrivalTime, v.departureTime)
                          : v.status === "active"
                            ? durationLabel(v.arrivalTime)
                            : ""}
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
              <div
                data-ocid="staff.empty_state"
                className="text-center py-16 text-slate-500"
              >
                {t(lang, "noData")}
              </div>
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
              <div
                data-ocid="blacklist.empty_state"
                className="text-center py-16 text-slate-500"
              >
                {t(lang, "noData")}
              </div>
            ) : (
              <div className="space-y-3">
                {blacklist.map((b, i) => (
                  <div
                    key={b.idNumber}
                    data-ocid={`blacklist.item.${i + 1}`}
                    className="flex items-center justify-between p-4 rounded-xl border border-red-500/20 bg-red-900/10"
                  >
                    <div>
                      <div className="text-white font-mono font-medium">
                        {b.idNumber}
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
          <div className="space-y-6">
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
                            className="border-b border-white/5"
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
                                    background:
                                      CATEGORY_COLORS[s.topCat] ?? "#64748b",
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
          </div>
        )}

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
              <div
                data-ocid="evacuation.empty_state"
                className="text-center py-16 text-slate-500"
              >
                {t(lang, "noVisitors")}
              </div>
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
              <div
                data-ocid="announcements.empty_state"
                className="text-center py-16 text-slate-500"
              >
                {t(lang, "noData")}
              </div>
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
              <div
                data-ocid="auditlog.empty_state"
                className="text-center py-16 text-slate-500"
              >
                Denetim logu bulunamadı.
              </div>
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

        {/* PROFILE TAB */}
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

            <button
              type="button"
              data-ocid="profile.save.button"
              onClick={saveProfile}
              className="w-full py-3 rounded-xl font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
            >
              {t(lang, "updateProfile")}
            </button>

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
                      background:
                        CATEGORY_COLORS[cat] ?? "rgba(100,116,139,0.3)",
                      border: `1px solid ${CATEGORY_COLORS[cat] ?? "#64748b"}60`,
                    }}
                  >
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
