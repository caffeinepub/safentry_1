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
import ConfirmModal from "../components/ConfirmModal";
import LangSwitcher from "../components/LangSwitcher";
import QRCode from "../components/QRCode";
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
  BlacklistEntry,
  Company,
  Staff,
  Visitor,
} from "../types";
import {
  durationLabel,
  formatDateTime,
  generateId,
  generateStaffId,
  hoursSince,
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [confirmMsg, setConfirmMsg] = useState("");
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

  const reload = useCallback(() => {
    setVisitors(getVisitors(session.companyId));
    setStaffList(getStaffByCompany(session.companyId));
    setBlacklist(getBlacklist(session.companyId));
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

  const checkout = (v: Visitor) => {
    setConfirmMsg("");
    setConfirmAction(() => () => {
      saveVisitor({ ...v, status: "departed", departureTime: Date.now() });
      reload();
      setConfirmOpen(false);
    });
    setConfirmOpen(true);
  };

  const addStaff = () => {
    const all = JSON.parse(
      localStorage.getItem("safentry_staff") || "[]",
    ) as Staff[];
    const s = all.find((x) => x.staffId === newStaffCode);
    if (!s) return alert("Personel bulunamadı");
    saveStaff({ ...s, companyId: session.companyId });
    setNewStaffCode("");
    reload();
  };

  const doRemoveStaff = (staffId: string) => {
    setConfirmMsg("");
    setConfirmAction(() => () => {
      removeStaffStore(staffId);
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
    setBlIdNumber("");
    setBlReason("");
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

  const TABS: { key: Tab; label: string }[] = [
    { key: "visitors", label: t(lang, "visitors") },
    { key: "staff", label: t(lang, "staffList") },
    { key: "blacklist", label: t(lang, "blacklist") },
    { key: "statistics", label: t(lang, "statistics") },
    { key: "evacuation", label: t(lang, "evacuation") },
    { key: "announcements", label: t(lang, "announcements") },
    { key: "profile", label: t(lang, "profile") },
  ];

  const chartData = getLast7DaysData(visitors);

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
          <div className="text-xs text-slate-400">{company?.name}</div>
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

      {/* Reset code result banner */}
      {resetCodeResult && (
        <div
          data-ocid="staff.success_state"
          className="mx-6 mt-4 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm flex items-center justify-between"
        >
          <span>
            ✅ {resetCodeResult.name} — {t(lang, "newCodeGenerated")}:{" "}
            <span className="font-mono font-bold">{resetCodeResult.code}</span>
          </span>
          <button
            type="button"
            className="text-emerald-400 hover:text-white ml-4"
            onClick={() => setResetCodeResult(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Confirm message override for reset code */}
      {confirmMsg && confirmOpen && <div className="hidden">{confirmMsg}</div>}

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 px-6 pt-4 border-b border-white/10">
        {TABS.map((tb) => (
          <button
            type="button"
            key={tb.key}
            data-ocid={`company_dashboard.${tb.key}.tab`}
            onClick={() => setTab(tb.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-all ${
              tab === tb.key
                ? "text-white border-b-2 border-[#0ea5e9]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* VISITORS TAB */}
        {tab === "visitors" && (
          <div>
            {/* Filter + search bar */}
            <div className="flex flex-wrap gap-3 mb-4 items-center">
              <div className="flex gap-2">
                {(["all", "active", "departed"] as const).map((f) => (
                  <button
                    type="button"
                    key={f}
                    data-ocid={`visitors.${f}.tab`}
                    onClick={() => setVisitorFilter(f)}
                    className={`px-4 py-2 rounded-lg text-sm transition-all ${
                      visitorFilter === f
                        ? "text-white font-semibold"
                        : "text-slate-400 hover:text-white"
                    }`}
                    style={
                      visitorFilter === f
                        ? {
                            background:
                              "linear-gradient(135deg, #0ea5e9, #0284c7)",
                          }
                        : { background: "rgba(255,255,255,0.05)" }
                    }
                  >
                    {t(lang, f)}
                  </button>
                ))}
              </div>
              <input
                data-ocid="visitors.search_input"
                value={visitorSearch}
                onChange={(e) => setVisitorSearch(e.target.value)}
                placeholder={t(lang, "searchPlaceholder")}
                className="flex-1 min-w-[200px] px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-[#0ea5e9] text-sm"
              />
              {visitorSearch && (
                <span className="text-slate-400 text-sm">
                  {filtered.length} sonuç
                </span>
              )}
            </div>

            {/* CSV Export */}
            <div
              className="flex flex-wrap gap-3 mb-4 items-center p-4 rounded-2xl border border-white/10"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <span className="text-slate-300 text-sm font-medium">
                📊 CSV Dışa Aktar:
              </span>
              <input
                data-ocid="export.date_from.input"
                type="date"
                value={exportDateFrom}
                onChange={(e) => setExportDateFrom(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-sm text-white bg-white/10 border border-white/20 focus:outline-none"
              />
              <span className="text-slate-500 text-sm">—</span>
              <input
                data-ocid="export.date_to.input"
                type="date"
                value={exportDateTo}
                onChange={(e) => setExportDateTo(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-sm text-white bg-white/10 border border-white/20 focus:outline-none"
              />
              <button
                type="button"
                data-ocid="export.submit_button"
                onClick={exportCsv}
                className="px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg,#22c55e,#16a34a)",
                }}
              >
                ⬇ İndir (
                {exportDateFrom || exportDateTo
                  ? visitors.filter((v) => {
                      const fr = exportDateFrom
                        ? new Date(exportDateFrom).getTime()
                        : 0;
                      const to2 = exportDateTo
                        ? new Date(`${exportDateTo}T23:59:59`).getTime()
                        : Date.now();
                      return v.arrivalTime >= fr && v.arrivalTime <= to2;
                    }).length
                  : visitors.length}{" "}
                kayıt)
              </button>
            </div>

            {filtered.length === 0 ? (
              <div
                data-ocid="visitors.empty_state"
                className="text-center py-16 text-slate-500"
              >
                {t(lang, "noVisitors")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-ocid="visitor.table">
                  <thead>
                    <tr className="text-slate-400 border-b border-white/10">
                      <th className="text-left py-3 px-2">Ad</th>
                      <th className="text-left py-3 px-2">Tel</th>
                      <th className="text-left py-3 px-2">Host</th>
                      <th className="text-left py-3 px-2">Giriş</th>
                      <th className="text-left py-3 px-2">
                        {t(lang, "departureTime")}
                      </th>
                      <th className="text-left py-3 px-2">Süre</th>
                      <th className="text-left py-3 px-2">Etiket</th>
                      <th className="text-left py-3 px-2">Plaka</th>
                      <th className="text-left py-3 px-2">Puan</th>
                      <th className="text-left py-3 px-2">Durum</th>
                      <th className="text-left py-3 px-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((v, i) => {
                      const over4h =
                        v.status === "active" && hoursSince(v.arrivalTime) >= 4;
                      return (
                        <tr
                          key={v.visitorId}
                          data-ocid={`visitors.row.${i + 1}`}
                          className={`border-b border-white/5 transition-colors hover:bg-white/5 ${
                            over4h ? "bg-amber-500/10" : ""
                          }`}
                        >
                          <td className="py-3 px-2 text-white font-medium">
                            {v.name}
                            {over4h && (
                              <span className="ml-2 text-xs text-amber-400">
                                ⚠️ {t(lang, "fourHourWarning")}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-slate-300">
                            {v.phone}
                          </td>
                          <td className="py-3 px-2 text-slate-300">
                            {staffList.find((s) => s.staffId === v.hostStaffId)
                              ?.name ?? v.hostStaffId}
                          </td>
                          <td className="py-3 px-2 text-slate-300">
                            {formatDateTime(v.arrivalTime)}
                          </td>
                          <td className="py-3 px-2 text-slate-300">
                            {v.departureTime ? (
                              formatDateTime(v.departureTime)
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-slate-300">
                            {durationLabel(v.arrivalTime, v.departureTime)}
                          </td>
                          <td className="py-3 px-2">
                            <span
                              className="px-2 py-0.5 rounded-full text-white text-xs font-semibold"
                              style={{ background: LABEL_COLORS[v.label] }}
                            >
                              {v.label.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-slate-400 font-mono text-xs">
                            {v.vehiclePlate || (
                              <span className="text-slate-700">—</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-amber-400 text-xs">
                            {v.exitRating ? (
                              "★".repeat(v.exitRating)
                            ) : (
                              <span className="text-slate-700">—</span>
                            )}
                          </td>
                          <td className="py-3 px-2">{statusBadge(v)}</td>
                          <td className="py-3 px-2">
                            {v.status === "active" && (
                              <button
                                type="button"
                                data-ocid={`visitor.checkout_button.${i + 1}`}
                                onClick={() => checkout(v)}
                                className="px-3 py-1 rounded-lg text-xs font-medium text-white transition-all hover:opacity-80"
                                style={{
                                  background: "rgba(239,68,68,0.2)",
                                  border: "1px solid rgba(239,68,68,0.4)",
                                }}
                              >
                                {t(lang, "checkout")}
                              </button>
                            )}
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

        {/* STAFF TAB */}
        {tab === "staff" && (
          <div className="space-y-6">
            <div className="flex gap-3">
              <input
                data-ocid="staff.add_code.input"
                value={newStaffCode}
                onChange={(e) => setNewStaffCode(e.target.value)}
                placeholder={t(lang, "staffId")}
                className="flex-1 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9] font-mono"
              />
              <button
                type="button"
                data-ocid="staff.add_button"
                onClick={addStaff}
                className="px-4 py-2 rounded-xl text-white text-sm font-medium"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                }}
              >
                {t(lang, "addStaff")}
              </button>
              <button
                type="button"
                data-ocid="staff.invite.button"
                onClick={genInvite}
                className="px-4 py-2 rounded-xl text-white text-sm font-medium"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                {t(lang, "generateInviteCode")}
              </button>
            </div>
            {inviteCode && (
              <div className="p-3 rounded-xl bg-[#0ea5e9]/10 border border-[#0ea5e9]/30 text-white">
                Davet Kodu:{" "}
                <span className="font-mono font-bold text-[#0ea5e9]">
                  {inviteCode}
                </span>
              </div>
            )}
            {staffList.length === 0 ? (
              <div
                data-ocid="staff.empty_state"
                className="text-center py-16 text-slate-500"
              >
                {t(lang, "noStaff")}
              </div>
            ) : (
              <div className="space-y-3">
                {staffList.map((s, i) => (
                  <div
                    key={s.staffId}
                    data-ocid={`staff.item.${i + 1}`}
                    className="flex items-center justify-between p-4 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  >
                    <div>
                      <div className="text-white font-medium">{s.name}</div>
                      <div className="text-slate-400 text-xs font-mono">
                        {s.staffId} &bull; {s.role}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: AVAIL_COLORS[s.availabilityStatus],
                        }}
                      />
                      <span
                        className="text-xs"
                        style={{ color: AVAIL_COLORS[s.availabilityStatus] }}
                      >
                        {s.availabilityStatus === "available"
                          ? t(lang, "available")
                          : s.availabilityStatus === "in_meeting"
                            ? t(lang, "inMeeting")
                            : t(lang, "outside")}
                      </span>
                      <button
                        type="button"
                        data-ocid={`staff.reset_code_button.${i + 1}`}
                        onClick={() => doResetStaffCode(s)}
                        className="px-2 py-1 rounded-lg text-xs font-medium text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-400/50 transition-colors"
                      >
                        {t(lang, "resetCode")}
                      </button>
                      <button
                        type="button"
                        data-ocid={`staff.delete_button.${i + 1}`}
                        onClick={() => doRemoveStaff(s.staffId)}
                        className="text-red-400 hover:text-red-300 text-xs"
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
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                data-ocid="blacklist.idnumber.input"
                value={blIdNumber}
                onChange={(e) => setBlIdNumber(e.target.value)}
                placeholder={t(lang, "idNumber")}
                className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-red-500 font-mono"
              />
              <input
                data-ocid="blacklist.reason.input"
                value={blReason}
                onChange={(e) => setBlReason(e.target.value)}
                placeholder={t(lang, "reason")}
                className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none"
              />
              <button
                type="button"
                data-ocid="blacklist.add_button"
                onClick={doAddBl}
                className="px-4 py-2 rounded-xl text-white text-sm font-medium bg-red-600 hover:bg-red-700"
              >
                {t(lang, "addToBlacklist")}
              </button>
            </div>
            {blacklist.length === 0 ? (
              <div
                data-ocid="blacklist.empty_state"
                className="text-center py-16 text-slate-500"
              >
                Kara liste boş.
              </div>
            ) : (
              <div className="space-y-2">
                {blacklist.map((bl, i) => (
                  <div
                    key={bl.idNumber}
                    data-ocid={`blacklist.item.${i + 1}`}
                    className="flex items-center justify-between p-4 rounded-xl bg-red-900/20 border border-red-900/40"
                  >
                    <div>
                      <div className="text-white font-mono">{bl.idNumber}</div>
                      <div className="text-slate-400 text-xs">
                        {bl.reason} &bull; {formatDateTime(bl.addedAt)}
                      </div>
                    </div>
                    <button
                      type="button"
                      data-ocid={`blacklist.delete_button.${i + 1}`}
                      onClick={() => {
                        setConfirmMsg("");
                        setConfirmAction(() => () => {
                          removeFromBlacklist(session.companyId, bl.idNumber);
                          reload();
                          setConfirmOpen(false);
                        });
                        setConfirmOpen(true);
                      }}
                      className="text-red-400 hover:text-red-300 text-xs"
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                {
                  label: t(lang, "totalToday"),
                  value: today.length,
                  cls: "stat-card-teal",
                },
                {
                  label: t(lang, "activeNow"),
                  value: activeNow.length,
                  cls: "stat-card-green",
                },
                {
                  label: t(lang, "avgDuration"),
                  value: avgDur > 0 ? `${Math.round(avgDur / 60000)} dk` : "-",
                  cls: "stat-card-amber",
                },
                {
                  label: "Ort. Ziyaret Puanı",
                  value: (() => {
                    const rated = visitors.filter(
                      (v) => v.exitRating !== undefined && v.exitRating > 0,
                    );
                    if (!rated.length) return "-";
                    const avg2 =
                      rated.reduce((s, v2) => s + (v2.exitRating ?? 0), 0) /
                      rated.length;
                    return `${"★".repeat(Math.round(avg2))} ${avg2.toFixed(1)}`;
                  })(),
                  cls: "stat-card-teal",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className={`p-6 rounded-2xl text-white ${card.cls}`}
                >
                  <div className="text-3xl font-bold">{card.value}</div>
                  <div className="text-sm opacity-80 mt-1">{card.label}</div>
                </div>
              ))}
            </div>

            {/* 7-day bar chart */}
            <div
              className="p-6 rounded-2xl border border-white/10"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <h3 className="text-white font-semibold mb-4">
                Son 7 Gün Ziyaretçi Sayısı
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barSize={28}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "#f1f5f9",
                    }}
                    cursor={{ fill: "rgba(14,165,233,0.05)" }}
                  />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div
              className="p-6 rounded-2xl border border-white/10"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <h3 className="text-white font-semibold mb-4">Ziyaret Tipleri</h3>
              {["business", "personal", "delivery", "maintenance", "other"].map(
                (type) => {
                  const count = visitors.filter(
                    (v) => v.visitType === type,
                  ).length;
                  const pct = visitors.length
                    ? (count / visitors.length) * 100
                    : 0;
                  return (
                    <div key={type} className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300 capitalize">
                          {type}
                        </span>
                        <span className="text-white font-medium">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${pct}%`,
                            background:
                              "linear-gradient(90deg,#0ea5e9,#0284c7)",
                          }}
                        />
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        )}

        {/* EVACUATION TAB */}
        {tab === "evacuation" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-white font-bold text-lg">
                {t(lang, "evacuation")} ({activeNow.length})
              </h2>
              <button
                type="button"
                data-ocid="evacuation.print.button"
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

        {/* PROFILE TAB */}
        {tab === "profile" && company && (
          <div className="max-w-lg space-y-4">
            {/* Company Code — read-only */}
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
                  {codeCopied ? (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        role="img"
                        aria-label="Kopyalandı"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Kopyalandı
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        role="img"
                        aria-label="Kopyala"
                      >
                        <rect
                          x="9"
                          y="9"
                          width="13"
                          height="13"
                          rx="2"
                          ry="2"
                        />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Kopyala
                    </>
                  )}
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
          </div>
        )}
      </div>
    </div>
  );
}
