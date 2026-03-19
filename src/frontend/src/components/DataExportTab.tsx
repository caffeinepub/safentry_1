import { Download, FileText, Table2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  getAppointments,
  getBlacklist,
  getIncidents,
  getLostFound,
  getStaffByCompany,
  getVisitors,
} from "../store";
import { formatDateTime } from "../utils";

type DataType =
  | "visitors"
  | "staff"
  | "blacklist"
  | "appointments"
  | "incidents"
  | "lostfound";
type ExportFormat = "csv" | "pdf";

interface Props {
  companyId: string;
}

const DATA_TYPES: { key: DataType; label: string; icon: string }[] = [
  { key: "visitors", label: "Ziyaretçiler", icon: "👤" },
  { key: "staff", label: "Personel", icon: "🛡️" },
  { key: "blacklist", label: "Kara Liste", icon: "🚫" },
  { key: "appointments", label: "Randevular", icon: "📅" },
  { key: "incidents", label: "Olaylar", icon: "⚠️" },
  { key: "lostfound", label: "Kayıp & Bulunan", icon: "🔍" },
];

function toCSV(headers: string[], rows: string[][]): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [
    headers.map(esc).join(","),
    ...rows.map((r) => r.map(esc).join(",")),
  ].join("\n");
}

function downloadCSV(filename: string, content: string) {
  const blob = new Blob([`\uFEFF${content}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function printHTML(title: string, headers: string[], rows: string[][]) {
  const w = window.open("", "_blank");
  if (!w) return;
  const thead = headers.map((h) => `<th>${h}</th>`).join("");
  const tbody = rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("");
  w.document.write(`
    <!DOCTYPE html><html><head>
    <meta charset="UTF-8"><title>${title}</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:12px;padding:24px;color:#111}
      h1{font-size:18px;margin-bottom:4px}
      p{color:#666;font-size:11px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse}
      th{background:#f0f4f8;text-align:left;padding:8px;font-size:11px;border-bottom:2px solid #ddd}
      td{padding:7px 8px;border-bottom:1px solid #eee;font-size:11px}
      tr:nth-child(even){background:#fafafa}
    </style></head><body>
    <h1>${title}</h1>
    <p>Oluşturma tarihi: ${new Date().toLocaleString("tr-TR")}</p>
    <table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
    <script>window.onload=()=>window.print();</script>
    </body></html>
  `);
  w.document.close();
}

export default function DataExportTab({ companyId }: Props) {
  const [dataType, setDataType] = useState<DataType>("visitors");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fromTs = dateFrom ? new Date(dateFrom).getTime() : 0;
  const toTs = dateTo
    ? new Date(`${dateTo}T23:59:59`).getTime()
    : Number.POSITIVE_INFINITY;

  const { count, exportFn } = useMemo(() => {
    const inRange = (ts: number) => ts >= fromTs && ts <= toTs;

    if (dataType === "visitors") {
      const items = getVisitors(companyId).filter((v) =>
        inRange(v.arrivalTime),
      );
      const headers = [
        "Ad Soyad",
        "TC",
        "Telefon",
        "Kategori",
        "Ziyaret Nedeni",
        "Giriş",
        "Çıkış",
        "Durum",
      ];
      const rows = items.map((v) => [
        v.name,
        v.idNumber,
        v.phone,
        v.category ?? "—",
        v.visitReason,
        formatDateTime(v.arrivalTime),
        v.departureTime ? formatDateTime(v.departureTime) : "—",
        v.status === "active" ? "İçeride" : "Çıktı",
      ]);
      return {
        count: items.length,
        exportFn: () => {
          if (exportFormat === "csv")
            downloadCSV(`ziyaretciler_${Date.now()}.csv`, toCSV(headers, rows));
          else printHTML("Ziyaretçi Raporu", headers, rows);
        },
      };
    }

    if (dataType === "staff") {
      const items = getStaffByCompany(companyId).filter((s) =>
        inRange(s.createdAt),
      );
      const headers = ["Ad Soyad", "Rol", "Durum", "Kayıt Tarihi"];
      const rows = items.map((s) => [
        s.name,
        s.role,
        s.availabilityStatus,
        formatDateTime(s.createdAt),
      ]);
      return {
        count: items.length,
        exportFn: () => {
          if (exportFormat === "csv")
            downloadCSV(`personel_${Date.now()}.csv`, toCSV(headers, rows));
          else printHTML("Personel Raporu", headers, rows);
        },
      };
    }

    if (dataType === "blacklist") {
      const items = getBlacklist(companyId).filter((b) => inRange(b.addedAt));
      const headers = ["TC", "Sebep", "Ekleyen", "Tarih"];
      const rows = items.map((b) => [
        b.idNumber,
        b.reason,
        b.addedBy,
        formatDateTime(b.addedAt),
      ]);
      return {
        count: items.length,
        exportFn: () => {
          if (exportFormat === "csv")
            downloadCSV(`kara_liste_${Date.now()}.csv`, toCSV(headers, rows));
          else printHTML("Kara Liste Raporu", headers, rows);
        },
      };
    }

    if (dataType === "appointments") {
      const items = getAppointments(companyId).filter((a) =>
        inRange(a.createdAt),
      );
      const headers = ["Ziyaretçi", "Amaç", "Tarih", "Durum"];
      const rows = items.map((a) => [
        a.visitorName,
        a.purpose ?? "—",
        `${a.appointmentDate} ${a.appointmentTime ?? ""}`,
        a.status,
      ]);
      return {
        count: items.length,
        exportFn: () => {
          if (exportFormat === "csv")
            downloadCSV(`randevular_${Date.now()}.csv`, toCSV(headers, rows));
          else printHTML("Randevu Raporu", headers, rows);
        },
      };
    }

    if (dataType === "incidents") {
      const items = getIncidents(companyId).filter((i) => inRange(i.timestamp));
      const headers = ["Başlık", "Açıklama", "Önem", "Kaydeden", "Tarih"];
      const rows = items.map((i) => [
        i.title,
        i.description,
        i.severity,
        i.loggedBy,
        formatDateTime(i.timestamp),
      ]);
      return {
        count: items.length,
        exportFn: () => {
          if (exportFormat === "csv")
            downloadCSV(`olaylar_${Date.now()}.csv`, toCSV(headers, rows));
          else printHTML("Olay Raporu", headers, rows);
        },
      };
    }

    if (dataType === "lostfound") {
      const items = getLostFound(companyId);
      const headers = [
        "Açıklama",
        "Bulunan Yer",
        "Bulunma Tarihi",
        "Bulan",
        "Durum",
      ];
      const rows = items.map((l) => [
        l.description,
        l.foundLocation,
        l.foundDate,
        l.finderName,
        l.status === "claimed"
          ? `İade edildi${l.claimedAt ? ` ${formatDateTime(l.claimedAt)}` : ""}`
          : "Beklemede",
      ]);
      return {
        count: items.length,
        exportFn: () => {
          if (exportFormat === "csv")
            downloadCSV(
              `kayip_bulunan_${Date.now()}.csv`,
              toCSV(headers, rows),
            );
          else printHTML("Kayıp & Bulunan Raporu", headers, rows);
        },
      };
    }

    return { count: 0, exportFn: () => {} };
  }, [dataType, companyId, exportFormat, fromTs, toTs]);

  return (
    <div data-ocid="data_export.panel">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white font-bold text-xl">Veri Dışa Aktarım</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Tüm veri tiplerini CSV veya PDF olarak indirin
          </p>
        </div>
        <Download className="text-teal-400" size={28} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide font-semibold mb-3">
              Veri Tipi
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DATA_TYPES.map((dt) => (
                <button
                  key={dt.key}
                  type="button"
                  data-ocid={`data_export.${dt.key}.button`}
                  onClick={() => setDataType(dt.key)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
                  style={{
                    background:
                      dataType === dt.key
                        ? "rgba(14,165,233,0.18)"
                        : "rgba(255,255,255,0.04)",
                    border:
                      dataType === dt.key
                        ? "1px solid rgba(14,165,233,0.5)"
                        : "1px solid rgba(255,255,255,0.08)",
                    color: dataType === dt.key ? "#0ea5e9" : "#94a3b8",
                  }}
                >
                  <span>{dt.icon}</span>
                  <span>{dt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide font-semibold mb-3">
              Tarih Aralığı (isteğe bağlı)
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="date"
                  value={dateFrom}
                  aria-label="Başlangıç tarihi"
                  onChange={(e) => setDateFrom(e.target.value)}
                  data-ocid="data_export.date_from.input"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    colorScheme: "dark",
                  }}
                />
              </div>
              <div className="flex-1">
                <input
                  type="date"
                  value={dateTo}
                  aria-label="Bitiş tarihi"
                  onChange={(e) => setDateTo(e.target.value)}
                  data-ocid="data_export.date_to.input"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    colorScheme: "dark",
                  }}
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide font-semibold mb-3">
              Format
            </p>
            <div className="flex gap-3">
              {(["csv", "pdf"] as ExportFormat[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  data-ocid={`data_export.${f}_format.button`}
                  onClick={() => setExportFormat(f)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background:
                      exportFormat === f
                        ? "rgba(245,158,11,0.15)"
                        : "rgba(255,255,255,0.04)",
                    border:
                      exportFormat === f
                        ? "1px solid rgba(245,158,11,0.4)"
                        : "1px solid rgba(255,255,255,0.08)",
                    color: exportFormat === f ? "#f59e0b" : "#94a3b8",
                  }}
                >
                  {f === "csv" ? <Table2 size={14} /> : <FileText size={14} />}
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          className="flex flex-col items-center justify-center p-8 rounded-2xl"
          style={{
            background: "rgba(14,165,233,0.04)",
            border: "1px solid rgba(14,165,233,0.12)",
          }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
            style={{
              background:
                count > 0 ? "rgba(14,165,233,0.15)" : "rgba(255,255,255,0.05)",
              border:
                count > 0
                  ? "2px solid rgba(14,165,233,0.35)"
                  : "2px solid rgba(255,255,255,0.08)",
            }}
          >
            <span
              className="text-3xl font-bold"
              style={{ color: count > 0 ? "#0ea5e9" : "#475569" }}
            >
              {count}
            </span>
          </div>
          <p className="text-white font-semibold mb-1">{count} kayıt bulundu</p>
          <p className="text-slate-500 text-sm mb-8 text-center">
            {DATA_TYPES.find((d) => d.key === dataType)?.label} •{" "}
            {dateFrom || dateTo
              ? `${dateFrom || "—"} → ${dateTo || "—"}`
              : "Tüm zamanlar"}
          </p>
          <button
            type="button"
            data-ocid="data_export.export.button"
            onClick={exportFn}
            disabled={count === 0}
            className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background:
                count > 0
                  ? "linear-gradient(135deg, #0ea5e9, #0284c7)"
                  : "rgba(255,255,255,0.06)",
              color: count > 0 ? "white" : "#475569",
              cursor: count > 0 ? "pointer" : "not-allowed",
            }}
          >
            <Download size={16} />
            {exportFormat === "csv" ? "CSV İndir" : "PDF Yazdır"}
          </button>
          {count === 0 && (
            <p
              data-ocid="data_export.empty_state"
              className="text-slate-600 text-xs mt-3 text-center"
            >
              Seçilen kriterlere uygun kayıt yok
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
