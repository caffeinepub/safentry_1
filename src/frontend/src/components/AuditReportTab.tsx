import React, { useState } from "react";
import { getAuditLogs } from "../auditLog";

export function logAuditEvent(
  companyId: string,
  action: string,
  entityType: string,
  entityId: string,
  details: string,
  userId: string,
  userName: string,
) {
  const key = `safentry_audit_${companyId}`;
  const entry = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    companyId,
    action,
    entityType,
    entityId,
    details,
    userId,
    userName,
  };
  try {
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    localStorage.setItem(key, JSON.stringify([entry, ...list].slice(0, 2000)));
  } catch {
    /* ignore */
  }
}

export function getFullAuditLog(companyId: string) {
  try {
    const fromNew = JSON.parse(
      localStorage.getItem(`safentry_audit_${companyId}`) || "[]",
    );
    const fromOld = getAuditLogs(companyId).map((l) => ({
      id: l.id,
      timestamp: l.timestamp,
      companyId: l.companyId,
      action: l.action,
      entityType: "system",
      entityId: "",
      details: l.details,
      userId: l.actorId,
      userName: l.actorName,
    }));
    const merged = [...fromNew, ...fromOld];
    // Deduplicate by id
    const seen = new Set<string>();
    return merged.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  } catch {
    return [];
  }
}

const ACTION_LABELS: Record<string, string> = {
  visitor_add: "Ziyaretçi Eklendi",
  visitor_edit: "Ziyaretçi Düzenlendi",
  visitor_exit: "Ziyaretçi Çıkışı",
  visitor_delete: "Ziyaretçi Silindi",
  blacklist_add: "Kara Listeye Eklendi",
  blacklist_remove: "Kara Listeden Çıkarıldı",
  staff_add: "Personel Eklendi",
  staff_remove: "Personel Silindi",
  appointment_create: "Randevu Oluşturuldu",
  appointment_approve: "Randevu Onaylandı",
  appointment_reject: "Randevu Reddedildi",
  emergency_on: "Acil Mod Aktifleştirildi",
  emergency_off: "Acil Mod Kapatıldı",
  drill_start: "Tatbikat Başlatıldı",
  drill_end: "Tatbikat Tamamlandı",
  login: "Giriş Yapıldı",
  logout: "Çıkış Yapıldı",
  data_export: "Veri Dışa Aktarıldı",
  data_delete: "Veri Silindi",
};

interface Props {
  companyId: string;
  companyName?: string;
}

export default function AuditReportTab({ companyId, companyName }: Props) {
  const allLogs = getFullAuditLog(companyId);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const filtered = allLogs.filter((log) => {
    if (dateFrom && new Date(log.timestamp) < new Date(`${dateFrom}T00:00:00`))
      return false;
    if (dateTo && new Date(log.timestamp) > new Date(`${dateTo}T23:59:59`))
      return false;
    if (actionFilter && !log.action.includes(actionFilter)) return false;
    if (
      userFilter &&
      !(log.userName ?? "").toLowerCase().includes(userFilter.toLowerCase())
    )
      return false;
    return true;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const exportCsv = () => {
    const headers = [
      "Tarih/Saat",
      "Kullanıcı",
      "Kullanıcı ID",
      "Aksiyon",
      "Varlık Tipi",
      "Detaylar",
    ];
    const rows = filtered.map((log) => [
      new Date(log.timestamp).toLocaleString("tr-TR"),
      log.userName ?? "",
      log.userId ?? "",
      ACTION_LABELS[log.action] ?? log.action,
      log.entityType ?? "",
      log.details ?? "",
    ]);
    const csvContent = [
      "# ISO 27001 / KVKK Uyumlu Denetim İzi Raporu",
      `# Şirket: ${companyName ?? companyId}`,
      `# Oluşturma: ${new Date().toLocaleString("tr-TR")}`,
      `# Toplam Kayıt: ${filtered.length}`,
      "",
      headers.join(","),
      ...rows.map((r) =>
        r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `denetim_izi_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const uniqueActions = Array.from(new Set(allLogs.map((l) => l.action)));
  const uniqueUsers = Array.from(
    new Set(allLogs.map((l) => l.userName).filter(Boolean)),
  );

  return (
    <div data-ocid="audit_report.section" className="space-y-5">
      {/* Header */}
      <div
        className="p-5 rounded-2xl"
        style={{
          background: "rgba(14,165,233,0.07)",
          border: "1px solid rgba(14,165,233,0.2)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-cyan-400 font-bold text-base">
              📋 ISO 27001 / KVKK Uyumlu Denetim İzi Raporu
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              {companyName ?? companyId} • Toplam {allLogs.length} kayıt
            </p>
          </div>
          <button
            type="button"
            data-ocid="audit_report.export.button"
            onClick={exportCsv}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white shrink-0"
            style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
          >
            📥 CSV İndir
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label
            htmlFor="audit-date-from"
            className="text-xs text-slate-400 block mb-1"
          >
            Başlangıç Tarihi
          </label>
          <input
            id="audit-date-from"
            type="date"
            data-ocid="audit_report.date_from.input"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-cyan-400"
          />
        </div>
        <div>
          <label
            htmlFor="audit-date-to"
            className="text-xs text-slate-400 block mb-1"
          >
            Bitiş Tarihi
          </label>
          <input
            id="audit-date-to"
            type="date"
            data-ocid="audit_report.date_to.input"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-cyan-400"
          />
        </div>
        <div>
          <label
            htmlFor="audit-action-filter"
            className="text-xs text-slate-400 block mb-1"
          >
            Aksiyon Tipi
          </label>
          <select
            id="audit-action-filter"
            data-ocid="audit_report.action_filter.select"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-cyan-400"
          >
            <option value="">Tümü</option>
            {uniqueActions.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a] ?? a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="audit-user-filter"
            className="text-xs text-slate-400 block mb-1"
          >
            Kullanıcı
          </label>
          <select
            id="audit-user-filter"
            data-ocid="audit_report.user_filter.select"
            value={userFilter}
            onChange={(e) => {
              setUserFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-cyan-400"
          >
            <option value="">Tümü</option>
            {uniqueUsers.map((u) => (
              <option key={u} value={u ?? ""}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results info */}
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-xs">
          {filtered.length} kayıt gösteriliyor (Toplam: {allLogs.length})
        </p>
        {(dateFrom || dateTo || actionFilter || userFilter) && (
          <button
            type="button"
            data-ocid="audit_report.clear_filters.button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setActionFilter("");
              setUserFilter("");
              setPage(1);
            }}
            className="text-xs text-slate-400 hover:text-white"
          >
            ✕ Filtreleri Temizle
          </button>
        )}
      </div>

      {/* Table */}
      {paginated.length === 0 ? (
        <div
          data-ocid="audit_report.empty_state"
          className="text-center py-12 text-slate-500"
        >
          <div className="text-4xl mb-2">📋</div>
          <p>Kayıt bulunamadı.</p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-ocid="audit_report.table">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.05)" }}>
                  <th className="px-4 py-3 text-left text-slate-400 font-medium text-xs">
                    Tarih / Saat
                  </th>
                  <th className="px-4 py-3 text-left text-slate-400 font-medium text-xs">
                    Kullanıcı
                  </th>
                  <th className="px-4 py-3 text-left text-slate-400 font-medium text-xs">
                    Aksiyon
                  </th>
                  <th className="px-4 py-3 text-left text-slate-400 font-medium text-xs">
                    Varlık Tipi
                  </th>
                  <th className="px-4 py-3 text-left text-slate-400 font-medium text-xs">
                    Detaylar
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((log, i) => (
                  <tr
                    key={log.id}
                    data-ocid={`audit_report.row.item.${i + 1}`}
                    style={{
                      borderTop: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <td className="px-4 py-3 text-slate-300 text-xs font-mono whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString("tr-TR")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white text-xs font-medium">
                        {log.userName ?? "—"}
                      </span>
                      {log.userId && (
                        <span className="block text-slate-500 text-xs font-mono">
                          {log.userId}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background:
                            log.action.includes("delete") ||
                            log.action.includes("remove")
                              ? "rgba(239,68,68,0.15)"
                              : log.action.includes("add") ||
                                  log.action.includes("create")
                                ? "rgba(34,197,94,0.15)"
                                : log.action.includes("emergency") ||
                                    log.action.includes("drill")
                                  ? "rgba(245,158,11,0.15)"
                                  : "rgba(14,165,233,0.15)",
                          color:
                            log.action.includes("delete") ||
                            log.action.includes("remove")
                              ? "#ef4444"
                              : log.action.includes("add") ||
                                  log.action.includes("create")
                                ? "#4ade80"
                                : log.action.includes("emergency") ||
                                    log.action.includes("drill")
                                  ? "#f59e0b"
                                  : "#38bdf8",
                        }}
                      >
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {log.entityType ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs max-w-xs truncate">
                      {log.details ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            data-ocid="audit_report.pagination_prev"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 border border-white/15 hover:bg-white/5 disabled:opacity-40"
          >
            ← Önceki
          </button>
          <span className="text-slate-400 text-xs">
            Sayfa {page} / {totalPages}
          </span>
          <button
            type="button"
            data-ocid="audit_report.pagination_next"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 border border-white/15 hover:bg-white/5 disabled:opacity-40"
          >
            Sonraki →
          </button>
        </div>
      )}
    </div>
  );
}
