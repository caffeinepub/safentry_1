import { useState } from "react";
import { generateId } from "../utils";

interface ContractorFirm {
  id: string;
  companyId: string;
  name: string;
  contactPerson: string;
  phone: string;
  insuranceExpiry: string;
  contractExpiry: string;
  hourlyRate: number;
  performanceScore: number; // 1-5
  createdAt: number;
}

function getContractorFirms(companyId: string): ContractorFirm[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_contractor_firms_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}

function saveContractorFirms(companyId: string, firms: ContractorFirm[]) {
  localStorage.setItem(
    `safentry_contractor_firms_${companyId}`,
    JSON.stringify(firms),
  );
}

function isExpired(dateStr: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function isExpiringSoon(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 30;
}

function statusColor(firm: ContractorFirm): {
  color: string;
  bg: string;
  label: string;
} {
  if (isExpired(firm.insuranceExpiry) || isExpired(firm.contractExpiry))
    return {
      color: "#ef4444",
      bg: "rgba(239,68,68,0.15)",
      label: "⛔ Süresi Dolmuş",
    };
  if (
    isExpiringSoon(firm.insuranceExpiry) ||
    isExpiringSoon(firm.contractExpiry)
  )
    return {
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.15)",
      label: "⚠️ Yakında Sona Eriyor",
    };
  return {
    color: "#22c55e",
    bg: "rgba(34,197,94,0.15)",
    label: "✅ Aktif",
  };
}

const EMPTY_FORM = {
  name: "",
  contactPerson: "",
  phone: "",
  insuranceExpiry: "",
  contractExpiry: "",
  hourlyRate: 0,
  performanceScore: 5,
};

interface Props {
  companyId: string;
  contractorVisitors?: {
    company?: string;
    arrivalTime: number;
    departureTime?: number;
    status: string;
  }[];
}

export default function ContractorFirmsTab({
  companyId,
  contractorVisitors = [],
}: Props) {
  const [firms, setFirms] = useState<ContractorFirm[]>(() =>
    getContractorFirms(companyId),
  );
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const reload = () => setFirms(getContractorFirms(companyId));

  const handleSave = () => {
    if (!form.name.trim()) return;
    const existing = getContractorFirms(companyId);
    if (editingId) {
      saveContractorFirms(
        companyId,
        existing.map((f) => (f.id === editingId ? { ...f, ...form } : f)),
      );
    } else {
      saveContractorFirms(companyId, [
        ...existing,
        { id: generateId(), companyId, ...form, createdAt: Date.now() },
      ]);
    }
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    reload();
  };

  const handleEdit = (firm: ContractorFirm) => {
    setForm({
      name: firm.name,
      contactPerson: firm.contactPerson,
      phone: firm.phone,
      insuranceExpiry: firm.insuranceExpiry,
      contractExpiry: firm.contractExpiry,
      hourlyRate: firm.hourlyRate,
      performanceScore: firm.performanceScore,
    });
    setEditingId(firm.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    saveContractorFirms(
      companyId,
      getContractorFirms(companyId).filter((f) => f.id !== id),
    );
    reload();
  };

  // Calculate stats per firm from contractor visitor records
  const firmStats = (firmName: string) => {
    const fv = contractorVisitors.filter(
      (v) => (v.company ?? "").toLowerCase() === firmName.toLowerCase(),
    );
    const activeCount = fv.filter((v) => v.status === "active").length;
    let totalHours = 0;
    for (const v of fv) {
      if (v.departureTime) {
        totalHours += (v.departureTime - v.arrivalTime) / (1000 * 60 * 60);
      }
    }
    return { activeCount, totalHours: Math.round(totalHours * 10) / 10 };
  };

  const cardStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-xl">🏗 Müteahhit Firmalar</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Firma bazlı müteahhit takibi, sözleşme ve sigorta yönetimi
          </p>
        </div>
        <button
          type="button"
          data-ocid="contractor_firms.open_modal_button"
          onClick={() => {
            setForm(EMPTY_FORM);
            setEditingId(null);
            setShowForm(true);
          }}
          className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
          style={{
            background: "rgba(14,165,233,0.3)",
            border: "1px solid rgba(14,165,233,0.5)",
          }}
        >
          + Firma Ekle
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div
          data-ocid="contractor_firms.dialog"
          className="p-5 rounded-2xl space-y-4"
          style={cardStyle}
        >
          <h3 className="text-white font-semibold">
            {editingId ? "Firma Düzenle" : "Yeni Firma Ekle"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-slate-400 text-xs mb-1">Firma Adı *</p>
              <input
                data-ocid="contractor_firms.input"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
              />
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">İletişim Kişisi</p>
              <input
                value={form.contactPerson}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactPerson: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
              />
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Telefon</p>
              <input
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
              />
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">
                Sigorta Bitiş Tarihi
              </p>
              <input
                type="date"
                value={form.insuranceExpiry}
                onChange={(e) =>
                  setForm((f) => ({ ...f, insuranceExpiry: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
              />
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">
                Sözleşme Bitiş Tarihi
              </p>
              <input
                type="date"
                value={form.contractExpiry}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contractExpiry: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
              />
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Saatlik Ücret (₺)</p>
              <input
                type="number"
                min={0}
                value={form.hourlyRate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, hourlyRate: Number(e.target.value) }))
                }
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
              />
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">
                Performans Skoru (1-5)
              </p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, performanceScore: n }))
                    }
                    className="w-9 h-9 rounded-lg font-bold text-sm transition-all"
                    style={{
                      background:
                        form.performanceScore >= n
                          ? "rgba(245,158,11,0.5)"
                          : "rgba(255,255,255,0.08)",
                      color: form.performanceScore >= n ? "#f59e0b" : "#64748b",
                      border: `1px solid ${
                        form.performanceScore >= n
                          ? "rgba(245,158,11,0.5)"
                          : "rgba(255,255,255,0.1)"
                      }`,
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              data-ocid="contractor_firms.save_button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-white text-sm font-semibold"
              style={{
                background: "rgba(14,165,233,0.4)",
                border: "1px solid rgba(14,165,233,0.5)",
              }}
            >
              {editingId ? "Güncelle" : "Kaydet"}
            </button>
            <button
              type="button"
              data-ocid="contractor_firms.cancel_button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
              className="px-5 py-2 rounded-xl text-slate-300 text-sm"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Firm list */}
      {firms.length === 0 ? (
        <div
          data-ocid="contractor_firms.empty_state"
          className="text-center py-12 text-slate-500"
        >
          <div className="text-5xl mb-3">🏗</div>
          <p className="text-lg font-medium">Henüz müteahhit firma eklenmedi</p>
          <p className="text-sm mt-1">
            Firma eklemek için yukarıdaki butonu kullanın
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {firms.map((firm, i) => {
            const status = statusColor(firm);
            const stats = firmStats(firm.name);
            const estimatedCost = Math.round(
              stats.totalHours * firm.hourlyRate,
            );
            return (
              <div
                key={firm.id}
                data-ocid={`contractor_firms.item.${i + 1}`}
                className="p-5 rounded-2xl"
                style={cardStyle}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-bold text-base">
                      {firm.name}
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {firm.contactPerson} • {firm.phone}
                    </p>
                  </div>
                  <span
                    className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{ background: status.bg, color: status.color }}
                  >
                    {status.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div
                    className="p-3 rounded-xl text-center"
                    style={{ background: "rgba(14,165,233,0.1)" }}
                  >
                    <div className="text-2xl font-bold text-[#0ea5e9]">
                      {stats.activeCount}
                    </div>
                    <div className="text-slate-400 text-xs">İçeride</div>
                  </div>
                  <div
                    className="p-3 rounded-xl text-center"
                    style={{ background: "rgba(245,158,11,0.1)" }}
                  >
                    <div className="text-2xl font-bold text-amber-400">
                      {stats.totalHours}s
                    </div>
                    <div className="text-slate-400 text-xs">Toplam Saat</div>
                  </div>
                </div>

                <div className="space-y-1.5 mb-3 text-xs text-slate-400">
                  {firm.insuranceExpiry && (
                    <div className="flex justify-between">
                      <span>Sigorta Bitiş:</span>
                      <span
                        style={{
                          color: isExpired(firm.insuranceExpiry)
                            ? "#ef4444"
                            : isExpiringSoon(firm.insuranceExpiry)
                              ? "#f59e0b"
                              : "#94a3b8",
                        }}
                      >
                        {new Date(firm.insuranceExpiry).toLocaleDateString(
                          "tr-TR",
                        )}
                      </span>
                    </div>
                  )}
                  {firm.contractExpiry && (
                    <div className="flex justify-between">
                      <span>Sözleşme Bitiş:</span>
                      <span
                        style={{
                          color: isExpired(firm.contractExpiry)
                            ? "#ef4444"
                            : isExpiringSoon(firm.contractExpiry)
                              ? "#f59e0b"
                              : "#94a3b8",
                        }}
                      >
                        {new Date(firm.contractExpiry).toLocaleDateString(
                          "tr-TR",
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Saatlik Ücret:</span>
                    <span className="text-white">{firm.hourlyRate} ₺/saat</span>
                  </div>
                  {stats.totalHours > 0 && (
                    <div className="flex justify-between">
                      <span>Tahmini Maliyet:</span>
                      <span className="text-emerald-400">
                        {estimatedCost.toLocaleString("tr-TR")} ₺
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>Performans:</span>
                    <span className="text-amber-400">
                      {"★".repeat(firm.performanceScore)}
                      {"☆".repeat(5 - firm.performanceScore)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    data-ocid={`contractor_firms.edit_button.${i + 1}`}
                    onClick={() => handleEdit(firm)}
                    className="flex-1 py-1.5 rounded-lg text-xs text-[#0ea5e9] font-medium"
                    style={{
                      background: "rgba(14,165,233,0.1)",
                      border: "1px solid rgba(14,165,233,0.3)",
                    }}
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    data-ocid={`contractor_firms.delete_button.${i + 1}`}
                    onClick={() => handleDelete(firm.id)}
                    className="flex-1 py-1.5 rounded-lg text-xs text-red-400 font-medium"
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.3)",
                    }}
                  >
                    Sil
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
