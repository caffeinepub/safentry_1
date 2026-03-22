import { useMemo, useState } from "react";
import { getVisitors } from "../store";
import type { Visitor } from "../types";

interface Props {
  companyId: string;
}

interface ContractorRate {
  tc: string;
  rate: number;
}

function getRates(companyId: string): ContractorRate[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_contractor_rates_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}

function saveRates(companyId: string, rates: ContractorRate[]) {
  localStorage.setItem(
    `safentry_contractor_rates_${companyId}`,
    JSON.stringify(rates),
  );
}

function calcHours(v: Visitor): number {
  if (!v.departureTime) return 0;
  return Math.round(((v.departureTime - v.arrivalTime) / 3600000) * 100) / 100;
}

const CONTRACTOR_CATS = ["Müteahhit", "Contractor", "müteahhit", "contractor"];

export default function ContractorHoursTab({ companyId }: Props) {
  const visitors = getVisitors(companyId);
  const contractors = visitors.filter(
    (v) =>
      CONTRACTOR_CATS.some((c) => v.category?.includes(c)) ||
      v.visitType === "contractor",
  );

  const [rates, setRates] = useState<ContractorRate[]>(() =>
    getRates(companyId),
  );
  const [editTc, setEditTc] = useState("");
  const [editRate, setEditRate] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const filtered = useMemo(() => {
    return contractors.filter((v) => {
      if (v.status === "preregistered") return false;
      if (!v.departureTime) return false;
      if (filterFrom) {
        const from = new Date(filterFrom).getTime();
        if (v.arrivalTime < from) return false;
      }
      if (filterTo) {
        const to = new Date(filterTo).getTime() + 86400000;
        if (v.arrivalTime > to) return false;
      }
      return true;
    });
  }, [contractors, filterFrom, filterTo]);

  const rateMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rates) m[r.tc] = r.rate;
    return m;
  }, [rates]);

  const totalHours = filtered.reduce((sum, v) => sum + calcHours(v), 0);
  const totalCost = filtered.reduce((sum, v) => {
    const r = rateMap[v.idNumber] ?? 0;
    return sum + calcHours(v) * r;
  }, 0);

  function saveRate() {
    if (!editTc.trim() || !editRate) return;
    const updated = [
      ...rates.filter((r) => r.tc !== editTc),
      { tc: editTc.trim(), rate: Number.parseFloat(editRate) },
    ];
    saveRates(companyId, updated);
    setRates(updated);
    setEditTc("");
    setEditRate("");
  }

  function removeRate(tc: string) {
    const updated = rates.filter((r) => r.tc !== tc);
    saveRates(companyId, updated);
    setRates(updated);
  }

  return (
    <div className="space-y-6" data-ocid="contractor_hours.section">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg">
          🏗️ Yüklenici Saatleri & Maliyetler
        </h2>
        <div className="flex gap-2 text-sm">
          <span
            className="px-3 py-1 rounded-xl font-semibold"
            style={{
              background: "rgba(20,184,166,0.15)",
              color: "#14b8a6",
              border: "1px solid rgba(20,184,166,0.3)",
            }}
          >
            {totalHours.toFixed(1)} saat
          </span>
          <span
            className="px-3 py-1 rounded-xl font-semibold"
            style={{
              background: "rgba(245,158,11,0.15)",
              color: "#f59e0b",
              border: "1px solid rgba(245,158,11,0.3)",
            }}
          >
            {totalCost.toLocaleString("tr-TR", {
              style: "currency",
              currency: "TRY",
            })}
          </span>
        </div>
      </div>

      {/* Hourly Rate Config */}
      <div
        className="p-5 rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <p className="text-slate-300 font-semibold mb-3">
          💰 Saatlik Ücret Tanımı
        </p>
        <div className="flex gap-2 mb-4">
          <input
            data-ocid="contractor_hours.tc.input"
            value={editTc}
            onChange={(e) => setEditTc(e.target.value)}
            placeholder="TC Kimlik No"
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#14b8a6] text-sm"
          />
          <input
            data-ocid="contractor_hours.rate.input"
            type="number"
            value={editRate}
            onChange={(e) => setEditRate(e.target.value)}
            placeholder="₺/saat"
            className="w-32 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#14b8a6] text-sm"
          />
          <button
            type="button"
            data-ocid="contractor_hours.save_rate.button"
            onClick={saveRate}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: "linear-gradient(135deg,#14b8a6,#0d9488)" }}
          >
            Kaydet
          </button>
        </div>
        {rates.length > 0 && (
          <div className="space-y-2">
            {rates.map((r) => (
              <div
                key={r.tc}
                className="flex items-center justify-between px-4 py-2 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <span className="text-white font-mono text-sm">{r.tc}</span>
                <span
                  style={{ color: "#f59e0b" }}
                  className="font-semibold text-sm"
                >
                  {r.rate.toLocaleString("tr-TR")} ₺/saat
                </span>
                <button
                  type="button"
                  onClick={() => removeRate(r.tc)}
                  className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded"
                >
                  Kaldır
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Date Filter */}
      <div className="flex gap-3 items-center">
        <div>
          <p className="text-slate-400 text-xs mb-1">Başlangıç</p>
          <input
            data-ocid="contractor_hours.date_from.input"
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
          />
        </div>
        <div>
          <p className="text-slate-400 text-xs mb-1">Bitiş</p>
          <input
            data-ocid="contractor_hours.date_to.input"
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
          />
        </div>
        {(filterFrom || filterTo) && (
          <button
            type="button"
            onClick={() => {
              setFilterFrom("");
              setFilterTo("");
            }}
            className="mt-4 text-xs text-slate-400 hover:text-white"
          >
            Temizle
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div
          data-ocid="contractor_hours.empty_state"
          className="p-8 rounded-2xl text-center"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <p className="text-4xl mb-3">🏗️</p>
          <p className="text-slate-400">
            Henüz tamamlanmış müteahhit ziyareti yok.
          </p>
          <p className="text-slate-500 text-sm mt-1">
            Tamamlanan (çıkış yapılmış) müteahhit ziyaretleri burada görünecek.
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {[
                  "Ad Soyad",
                  "TC",
                  "Tarih",
                  "Çalışma Saati",
                  "₺/Saat",
                  "Maliyet",
                ].map((h) => (
                  <th
                    key={h}
                    className="p-3 text-left text-slate-400 font-medium text-xs"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => {
                const hrs = calcHours(v);
                const rate = rateMap[v.idNumber] ?? 0;
                const cost = hrs * rate;
                return (
                  <tr
                    key={v.visitorId}
                    data-ocid={`contractor_hours.row.${i + 1}`}
                    className="border-b border-white/5 hover:bg-white/3 transition-colors"
                  >
                    <td className="p-3 text-white font-medium">{v.name}</td>
                    <td className="p-3 text-slate-400 font-mono text-xs">
                      {v.idNumber}
                    </td>
                    <td className="p-3 text-slate-300 text-xs">
                      {new Date(v.arrivalTime).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="p-3">
                      <span
                        style={{ color: "#14b8a6" }}
                        className="font-semibold"
                      >
                        {hrs.toFixed(2)} sa
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">
                      {rate > 0 ? (
                        `${rate.toLocaleString("tr-TR")} ₺`
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {cost > 0 ? (
                        <span
                          style={{ color: "#f59e0b" }}
                          className="font-semibold"
                        >
                          {cost.toLocaleString("tr-TR", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          ₺
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
                <td
                  colSpan={3}
                  className="p-3 text-slate-400 text-xs font-semibold"
                >
                  TOPLAM ({filtered.length} kayıt)
                </td>
                <td className="p-3 font-bold" style={{ color: "#14b8a6" }}>
                  {totalHours.toFixed(2)} sa
                </td>
                <td className="p-3" />
                <td className="p-3 font-bold" style={{ color: "#f59e0b" }}>
                  {totalCost.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  ₺
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
