import React, { useState } from "react";

import type { Visitor } from "../types";

interface Props {
  visitors: Visitor[];
  companyId: string;
  companyName: string;
}

function getRange(visitors: Visitor[], days: number) {
  const cutoff = Date.now() - days * 86400000;
  return visitors.filter((v) => v.arrivalTime > cutoff && !v.isDraft);
}

function avg(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function msToMin(ms: number) {
  return Math.round(ms / 60000);
}

export default function StatsSummaryTab({ visitors, companyName }: Props) {
  const [period, setPeriod] = useState<7 | 30 | 90>(30);

  const ranged = getRange(visitors, period);
  const total = ranged.length;
  const active = ranged.filter((v) => v.status === "active").length;
  const completed = ranged.filter((v) => v.status === "departed").length;
  const rejected = ranged.filter((v) => v.status === "rejected").length;

  const durations = ranged
    .filter((v) => v.departureTime && v.arrivalTime)
    .map((v) => v.departureTime! - v.arrivalTime);
  const avgDurMin = msToMin(avg(durations));

  const scores = ranged.filter((v) => v.rating).map((v) => v.rating!);
  const avgScore = avg(scores);

  // Top hosts
  const hostMap: Record<string, number> = {};
  for (const v of ranged) {
    if (v.hostStaffId)
      hostMap[v.hostStaffId] = (hostMap[v.hostStaffId] || 0) + 1;
  }
  const topHosts = Object.entries(hostMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Category distribution
  const catMap: Record<string, number> = {};
  for (const v of ranged) {
    const c = v.category || "Belirtilmemiş";
    catMap[c] = (catMap[c] || 0) + 1;
  }
  const categories = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // Daily average
  const dailyAvg = period > 0 ? (total / period).toFixed(1) : "0";

  function printSummary() {
    const win = window.open("", "_blank");
    if (!win) return;
    const date = new Date().toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    win.document.write(`
      <html><head><title>${companyName} - İstatistik Özet</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #1e293b; }
        h1 { color: #0ea5e9; margin-bottom: 4px; }
        .subtitle { color: #64748b; font-size: 13px; margin-bottom: 28px; }
        .grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-bottom: 24px; }
        .card { background: #f8fafc; border-radius: 12px; padding: 18px; text-align: center; }
        .num { font-size: 28px; font-weight: bold; color: #0f172a; }
        .lbl { font-size: 12px; color: #64748b; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { background: #f1f5f9; text-align: left; padding: 8px 12px; font-size: 13px; }
        td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
        .footer { font-size: 11px; color: #94a3b8; margin-top: 32px; }
      </style></head><body>
      <h1>${companyName}</h1>
      <div class="subtitle">Son ${period} Günlük İstatistik Özeti &bull; ${date}</div>
      <div class="grid">
        <div class="card"><div class="num">${total}</div><div class="lbl">Toplam Ziyaret</div></div>
        <div class="card"><div class="num">${completed}</div><div class="lbl">Tamamlanan</div></div>
        <div class="card"><div class="num">${rejected}</div><div class="lbl">Reddedilen</div></div>
        <div class="card"><div class="num">${dailyAvg}</div><div class="lbl">Günlük Ortalama</div></div>
        <div class="card"><div class="num">${avgDurMin} dk</div><div class="lbl">Ort. Ziyaret Süresi</div></div>
        <div class="card"><div class="num">${avgScore > 0 ? `${avgScore.toFixed(1)}/5` : "—"}</div><div class="lbl">Ort. Memnuniyet</div></div>
      </div>
      ${topHosts.length ? `<h3>En Aktif Ev Sahipleri</h3><table><tr><th>Personel</th><th>Ziyaretçi Sayısı</th></tr>${topHosts.map(([h, c]) => `<tr><td>${h}</td><td>${c}</td></tr>`).join("")}</table>` : ""}
      ${categories.length ? `<h3>Ziyaretçi Kategorileri</h3><table><tr><th>Kategori</th><th>Sayı</th><th>Oran</th></tr>${categories.map(([c, n]) => `<tr><td>${c}</td><td>${n}</td><td>${total > 0 ? Math.round((n / total) * 100) : 0}%</td></tr>`).join("")}</table>` : ""}
      <div class="footer">Safentry Ziyaretçi Yönetim Sistemi &bull; ${date} tarihinde oluşturuldu</div>
      </body></html>
    `);
    win.document.close();
    win.print();
  }

  const cardStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 20,
    textAlign: "center" as const,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white font-bold text-xl">
          📈 İstatistik Özet Kartı
        </h2>
        <div className="flex items-center gap-2">
          <div
            className="flex gap-1 p-1 rounded-xl"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            {([7, 30, 90] as const).map((d) => (
              <button
                type="button"
                key={d}
                onClick={() => setPeriod(d)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={
                  period === d
                    ? {
                        background: "rgba(14,165,233,0.25)",
                        color: "#38bdf8",
                        border: "1px solid rgba(14,165,233,0.4)",
                      }
                    : { color: "#64748b", border: "1px solid transparent" }
                }
              >
                {d === 7 ? "Son 7 Gün" : d === 30 ? "Son 30 Gün" : "Son 90 Gün"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={printSummary}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: "rgba(34,197,94,0.15)",
              border: "1px solid rgba(34,197,94,0.4)",
              color: "#4ade80",
            }}
          >
            🖨️ Yazdır / PDF
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {[
          {
            label: "Toplam Ziyaret",
            value: total,
            icon: "👥",
            color: "#38bdf8",
          },
          {
            label: "Tamamlanan",
            value: completed,
            icon: "✅",
            color: "#4ade80",
          },
          {
            label: "Reddedilen",
            value: rejected,
            icon: "🚫",
            color: "#f87171",
          },
          {
            label: "Şu An Binada",
            value: active,
            icon: "🏢",
            color: "#fb923c",
          },
          {
            label: "Günlük Ort.",
            value: dailyAvg,
            icon: "📊",
            color: "#c084fc",
          },
          {
            label: "Ort. Süre",
            value: `${avgDurMin} dk`,
            icon: "⏱️",
            color: "#fbbf24",
          },
        ].map((m) => (
          <div key={m.label} style={cardStyle}>
            <div className="text-3xl mb-1">{m.icon}</div>
            <div className="text-2xl font-bold" style={{ color: m.color }}>
              {m.value}
            </div>
            <div className="text-xs text-slate-400 mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      {avgScore > 0 && (
        <div
          className="p-5 rounded-2xl mb-6"
          style={{
            background: "rgba(34,197,94,0.06)",
            border: "1px solid rgba(34,197,94,0.2)",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">⭐</span>
            <div>
              <div className="text-white font-bold text-lg">
                {avgScore.toFixed(1)} / 5.0
              </div>
              <div className="text-slate-400 text-sm">
                Ortalama memnuniyet puanı ({scores.length} değerlendirme)
              </div>
            </div>
            <div className="ml-auto">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{
                      background:
                        s <= Math.round(avgScore)
                          ? "rgba(34,197,94,0.3)"
                          : "rgba(255,255,255,0.05)",
                      color: s <= Math.round(avgScore) ? "#4ade80" : "#475569",
                    }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {topHosts.length > 0 && (
          <div
            className="p-5 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <h3 className="text-white font-semibold mb-3">
              🏆 En Aktif Ev Sahipleri
            </h3>
            <div className="space-y-2">
              {topHosts.map(([host, count], i) => (
                <div key={host} className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background:
                        i === 0
                          ? "rgba(251,191,36,0.25)"
                          : "rgba(255,255,255,0.08)",
                      color: i === 0 ? "#fbbf24" : "#94a3b8",
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 text-slate-300 text-sm">{host}</div>
                  <div className="text-slate-400 text-sm font-mono">
                    {count} ziyaret
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {categories.length > 0 && (
          <div
            className="p-5 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <h3 className="text-white font-semibold mb-3">
              🏷️ Ziyaretçi Kategorileri
            </h3>
            <div className="space-y-2">
              {categories.map(([cat, count]) => (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">{cat}</span>
                    <span className="text-slate-400">
                      {count} (
                      {total > 0 ? Math.round((count / total) * 100) : 0}%)
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${total > 0 ? (count / total) * 100 : 0}%`,
                        background: "linear-gradient(90deg,#0ea5e9,#38bdf8)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {total === 0 && (
        <div className="text-center py-16 text-slate-500">
          <div className="text-5xl mb-3">📊</div>
          <p className="text-lg font-medium text-slate-400">Veri yok</p>
          <p className="text-sm mt-1">
            Seçilen dönemde ziyaret kaydı bulunmuyor.
          </p>
        </div>
      )}
    </div>
  );
}
