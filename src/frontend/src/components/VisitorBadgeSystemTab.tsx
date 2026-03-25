import React, { useMemo, useState } from "react";
import {
  getVisitorBadgeSettings,
  getVisitorTitle,
  saveVisitorBadgeSettings,
} from "../store";
import type { Visitor } from "../types";

interface Props {
  companyId: string;
  visitors: Visitor[];
}

export default function VisitorBadgeSystemTab({ companyId, visitors }: Props) {
  const [settings, setSettings] = useState(() =>
    getVisitorBadgeSettings(companyId),
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveVisitorBadgeSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Compute top visitors by visit count
  const topVisitors = useMemo(() => {
    const counts: Record<
      string,
      { name: string; idNumber: string; count: number; category: string }
    > = {};
    for (const v of visitors) {
      if (!counts[v.idNumber])
        counts[v.idNumber] = {
          name: v.name,
          idNumber: v.idNumber,
          count: 0,
          category: v.category ?? "",
        };
      counts[v.idNumber].count++;
    }
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [visitors]);

  const cardStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
  };
  const inputCls =
    "w-24 px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm text-center focus:outline-none focus:border-[#0ea5e9]";

  const BADGE_TIERS = [
    {
      emoji: "🌟",
      title: "İlk Ziyaret",
      desc: "1. ziyarette",
      field: "threshold1" as const,
    },
    {
      emoji: "👋",
      title: "Düzenli Ziyaretçi",
      desc: "ziyaretten itibaren",
      field: "threshold3" as const,
    },
    {
      emoji: "⭐",
      title: "Sık Ziyaretçi",
      desc: "ziyaretten itibaren",
      field: "threshold7" as const,
    },
    {
      emoji: "🏆",
      title: "Platin Misafir",
      desc: "ziyaretten itibaren",
      field: "threshold15" as const,
    },
    {
      emoji: "🔧",
      title: "Güvenilir Tedarikçi",
      desc: "müteahhit ziyaretinden itibaren",
      field: "contractorThreshold" as const,
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-white font-bold text-xl">
          🏅 Ziyaretçi Rozet & Puan Sistemi
        </h2>
        <p className="text-slate-400 text-sm mt-0.5">
          Sadakat unvanları ve eşik değerlerini yapılandırın
        </p>
      </div>

      {/* Tier Settings */}
      <div className="p-4 rounded-xl space-y-4" style={cardStyle}>
        <h3 className="text-white font-semibold">Unvan Eşikleri</h3>
        {BADGE_TIERS.map((tier) => (
          <div key={tier.field} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{tier.emoji}</span>
              <div>
                <p className="text-white text-sm font-medium">{tier.title}</p>
                <p className="text-slate-500 text-xs">
                  {settings[tier.field]} {tier.desc}
                </p>
              </div>
            </div>
            <input
              type="number"
              min={1}
              value={settings[tier.field]}
              onChange={(e) =>
                setSettings((p) => ({
                  ...p,
                  [tier.field]: Number.parseInt(e.target.value) || 1,
                }))
              }
              className={inputCls}
            />
          </div>
        ))}
        <button
          type="button"
          data-ocid="rozetsistemi.save_button"
          onClick={handleSave}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{
            background: saved
              ? "rgba(34,197,94,0.2)"
              : "linear-gradient(135deg,#0ea5e9,#0284c7)",
            border: saved ? "1px solid rgba(34,197,94,0.4)" : "none",
          }}
        >
          {saved ? "✓ Kaydedildi" : "Kaydet"}
        </button>
      </div>

      {/* Top Visitors Leaderboard */}
      <div className="p-4 rounded-xl" style={cardStyle}>
        <h3 className="text-white font-semibold mb-3">Lider Tablosu</h3>
        {topVisitors.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">
            Henüz ziyaretçi verisi yok
          </p>
        ) : (
          <div className="space-y-2">
            {topVisitors.map((v, i) => {
              const badge = getVisitorTitle(companyId, v.idNumber, v.category);
              return (
                <div
                  key={v.idNumber}
                  data-ocid={`rozetsistemi.item.${i + 1}`}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{
                    background:
                      i === 0
                        ? "rgba(245,158,11,0.08)"
                        : "rgba(255,255,255,0.03)",
                    border: `1px solid ${i === 0 ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-sm w-5 text-center">
                      #{i + 1}
                    </span>
                    <div>
                      <p className="text-white text-sm font-medium">{v.name}</p>
                      <p className="text-slate-500 text-xs">
                        {v.count} ziyaret
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{badge.emoji}</span>
                    <span className="text-xs text-slate-300">
                      {badge.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Badge Preview */}
      <div className="p-4 rounded-xl" style={cardStyle}>
        <h3 className="text-white font-semibold mb-3">Rozet Önizleme</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { emoji: "🌟", title: "İlk Ziyaret", color: "#0ea5e9" },
            { emoji: "👋", title: "Düzenli Ziyaretçi", color: "#22c55e" },
            { emoji: "⭐", title: "Sık Ziyaretçi", color: "#f59e0b" },
            { emoji: "🏆", title: "Platin Misafir", color: "#a855f7" },
            { emoji: "🔧", title: "Güvenilir Tedarikçi", color: "#f97316" },
          ].map((b) => (
            <div
              key={b.title}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: `${b.color}15`,
                border: `1px solid ${b.color}44`,
                color: b.color,
              }}
            >
              {b.emoji} {b.title}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
