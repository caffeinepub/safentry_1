import { useRef, useState } from "react";
import { toast } from "sonner";
import { bulkSaveVisitors } from "../store";
import type { Visitor } from "../types";
import { generateId, generateVisitorId } from "../utils";

interface CsvImportModalProps {
  companyId: string;
  onClose: () => void;
  onImported: () => void;
}

interface CsvRow {
  name: string;
  idNumber: string;
  phone: string;
  company: string;
  category: string;
  hostName: string;
  date: string;
  errors: string[];
}

function parseCSV(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const errors: string[] = [];
    const name = cols[0] ?? "";
    const idNumber = cols[1] ?? "";
    const phone = cols[2] ?? "";
    const company = cols[3] ?? "";
    const category = cols[4] ?? "Misafir";
    const hostName = cols[5] ?? "";
    const date = cols[6] ?? "";
    if (!name) errors.push("Ad Soyad zorunlu");
    if (!idNumber) errors.push("TC No zorunlu");
    if (!phone) errors.push("Telefon zorunlu");
    rows.push({
      name,
      idNumber,
      phone,
      company,
      category,
      hostName,
      date,
      errors,
    });
  }
  return rows;
}

function downloadTemplate() {
  const header = "Ad Soyad,TC No,Telefon,Şirket,Kategori,Host Personel,Tarih";
  const example =
    "Ahmet Yılmaz,12345678901,05001234567,ABC Şirketi,Misafir,Mehmet Demir,2026-03-18";
  const blob = new Blob([`${header}\n${example}\n`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "safentry_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function CsvImportModal({
  companyId,
  onClose,
  onImported,
}: CsvImportModalProps) {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [imported, setImported] = useState<number | null>(null);
  const [errors, setErrors] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRows(parseCSV(text));
      setImported(null);
      setErrors(null);
    };
    reader.readAsText(file, "utf-8");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleImport = () => {
    const validRows = rows.filter((r) => r.errors.length === 0);
    const errorCount = rows.length - validRows.length;
    const now = Date.now();
    const visitors: Visitor[] = validRows.map((r) => ({
      visitorId: generateVisitorId(),
      companyId,
      registeredBy: "csv_import",
      name: r.name,
      idNumber: r.idNumber,
      phone: r.phone,
      hostStaffId: r.hostName,
      arrivalTime: r.date ? new Date(r.date).getTime() || now : now,
      visitReason: r.company
        ? `${r.company} ziyareti`
        : "CSV ile içe aktarıldı",
      visitType: r.category || "Misafir",
      ndaAccepted: false,
      signatureData: "",
      label: "normal" as const,
      status: "preregistered" as const,
      badgeQr: generateId(),
      notes: "CSV ile içe aktarıldı",
      category: r.category || "Misafir",
      createdAt: now,
    }));
    bulkSaveVisitors(visitors);
    setImported(validRows.length);
    setErrors(errorCount);
    if (validRows.length > 0) {
      toast.success(`${validRows.length} ziyaretçi başarıyla içe aktarıldı`);
      onImported();
    }
  };

  return (
    <div
      data-ocid="csv_import.modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: "#0f1729",
          border: "1.5px solid rgba(14,165,233,0.3)",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-white font-bold text-lg">
            📥 Toplu CSV İçe Aktar
          </h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-ocid="csv_import.template_button"
              onClick={downloadTemplate}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-teal-300 border border-teal-500/30 hover:bg-teal-900/20 transition-colors"
            >
              📄 Şablonu İndir
            </button>
            <button
              type="button"
              data-ocid="csv_import.close_button"
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xl leading-none"
              aria-label="Kapat"
            >
              ×
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Drop Zone */}
          <button
            type="button"
            data-ocid="csv_import.dropzone"
            aria-label="CSV dosyası yükle"
            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors w-full"
            style={{
              borderColor: dragging ? "#0ea5e9" : "rgba(255,255,255,0.2)",
              background: dragging
                ? "rgba(14,165,233,0.08)"
                : "rgba(255,255,255,0.03)",
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
              aria-label="CSV dosyası seç"
            />
            <div className="text-3xl mb-2">📂</div>
            {fileName ? (
              <p className="text-teal-300 font-medium">{fileName}</p>
            ) : (
              <>
                <p className="text-slate-300 text-sm">
                  CSV dosyasını buraya sürükleyin veya tıklayın
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  Beklenen sütunlar: Ad Soyad, TC No, Telefon, Şirket, Kategori,
                  Host Personel, Tarih
                </p>
              </>
            )}
          </button>

          {/* Preview Table */}
          {rows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-300 text-sm font-medium">
                  {rows.length} satır algılandı
                  {rows.filter((r) => r.errors.length > 0).length > 0 && (
                    <span className="text-red-400 ml-2">
                      ({rows.filter((r) => r.errors.length > 0).length} hatalı)
                    </span>
                  )}
                </p>
              </div>
              <div
                data-ocid="csv_import.table"
                className="overflow-x-auto rounded-xl border border-white/10"
              >
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      {[
                        "#",
                        "Ad Soyad",
                        "TC No",
                        "Telefon",
                        "Şirket",
                        "Kategori",
                        "Host",
                        "Tarih",
                        "Durum",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-left text-slate-400 font-medium whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr
                        key={`${row.name}-${row.idNumber}-${i}`}
                        data-ocid={`csv_import.row.${i + 1}`}
                        className="border-b border-white/5 hover:bg-white/5"
                        style={{
                          background:
                            row.errors.length > 0
                              ? "rgba(239,68,68,0.08)"
                              : undefined,
                        }}
                      >
                        <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-2 text-white">
                          {row.name || <span className="text-red-400">—</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-300">
                          {row.idNumber || (
                            <span className="text-red-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-300">
                          {row.phone || <span className="text-red-400">—</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-300">
                          {row.company}
                        </td>
                        <td className="px-3 py-2 text-slate-300">
                          {row.category}
                        </td>
                        <td className="px-3 py-2 text-slate-300">
                          {row.hostName}
                        </td>
                        <td className="px-3 py-2 text-slate-300">{row.date}</td>
                        <td className="px-3 py-2">
                          {row.errors.length === 0 ? (
                            <span className="text-green-400">✓</span>
                          ) : (
                            <span
                              className="text-red-400"
                              title={row.errors.join(", ")}
                            >
                              ⚠ {row.errors[0]}
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

          {/* Result */}
          {imported !== null && (
            <div
              data-ocid="csv_import.success_state"
              className="p-4 rounded-xl border"
              style={{
                background: "rgba(34,197,94,0.1)",
                borderColor: "rgba(34,197,94,0.3)",
              }}
            >
              <p className="text-green-400 font-medium text-sm">
                ✅ {imported} ziyaretçi başarıyla içe aktarıldı
                {errors !== null && errors > 0 && (
                  <span className="text-red-400 ml-2">
                    ({errors} satır hata nedeniyle atlandı)
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
          <button
            type="button"
            data-ocid="csv_import.cancel_button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white border border-white/10 hover:border-white/30 transition-colors"
          >
            İptal
          </button>
          <button
            type="button"
            data-ocid="csv_import.submit_button"
            onClick={handleImport}
            disabled={rows.filter((r) => r.errors.length === 0).length === 0}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg,#22c55e,#16a34a)",
              border: "1px solid rgba(34,197,94,0.5)",
            }}
          >
            📥 İçe Aktar ({rows.filter((r) => r.errors.length === 0).length}{" "}
            kayıt)
          </button>
        </div>
      </div>
    </div>
  );
}
