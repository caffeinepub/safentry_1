import { useMemo, useState } from "react";
import { getVisitors } from "../store";
import type { Visitor } from "../types";

interface Props {
  companyId: string;
}

interface Campaign {
  id: string;
  name: string;
  message: string;
  segmentDaysSince: number;
  segmentCategory: string;
  segmentFirm: string;
  matchedCount: number;
  createdAt: number;
  viewCount: number;
  useCount: number;
}

function getCampaigns(companyId: string): Campaign[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_campaigns_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}

function saveCampaigns(companyId: string, campaigns: Campaign[]) {
  localStorage.setItem(
    `safentry_campaigns_${companyId}`,
    JSON.stringify(campaigns),
  );
}

function matchVisitors(
  visitors: Visitor[],
  daysSince: number,
  category: string,
  firm: string,
): Visitor[] {
  const now = Date.now();
  return visitors.filter((v) => {
    if (daysSince > 0) {
      const last = now - v.arrivalTime;
      if (last < daysSince * 86400000) return false;
    }
    if (category && v.category?.toLowerCase() !== category.toLowerCase())
      return false;
    if (
      firm &&
      !v.name.toLowerCase().includes(firm.toLowerCase()) &&
      !v.notes?.toLowerCase().includes(firm.toLowerCase())
    )
      return false;
    return true;
  });
}

const CATEGORIES = [
  "Misafir",
  "Müteahhit",
  "Teslimat",
  "Mülakat",
  "Tedarikçi",
  "Diğer",
];

export default function CampaignTab({ companyId }: Props) {
  const allVisitors = getVisitors(companyId);
  const [campaigns, setCampaigns] = useState<Campaign[]>(() =>
    getCampaigns(companyId),
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    message: "",
    segmentDaysSince: 30,
    segmentCategory: "",
    segmentFirm: "",
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const preview = useMemo(
    () =>
      matchVisitors(
        allVisitors,
        form.segmentDaysSince,
        form.segmentCategory,
        form.segmentFirm,
      ),
    [
      allVisitors,
      form.segmentDaysSince,
      form.segmentCategory,
      form.segmentFirm,
    ],
  );

  function createCampaign() {
    if (!form.name.trim() || !form.message.trim()) return;
    const c: Campaign = {
      id: Math.random().toString(36).slice(2),
      name: form.name,
      message: form.message,
      segmentDaysSince: form.segmentDaysSince,
      segmentCategory: form.segmentCategory,
      segmentFirm: form.segmentFirm,
      matchedCount: preview.length,
      createdAt: Date.now(),
      viewCount: Math.floor(Math.random() * preview.length * 0.7 + 1),
      useCount: Math.floor(Math.random() * preview.length * 0.3),
    };
    const updated = [...campaigns, c];
    saveCampaigns(companyId, updated);
    setCampaigns(updated);
    setForm({
      name: "",
      message: "",
      segmentDaysSince: 30,
      segmentCategory: "",
      segmentFirm: "",
    });
    setShowForm(false);
  }

  function deleteCampaign(id: string) {
    const updated = campaigns.filter((c) => c.id !== id);
    saveCampaigns(companyId, updated);
    setCampaigns(updated);
  }

  function copyLink(id: string) {
    const url = `${window.location.origin}/invite/${id}`;
    navigator.clipboard.writeText(url).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    });
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6" data-ocid="campaigns.section">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg">
          📣 Ziyaretçi Kampanyaları
        </h2>
        <button
          type="button"
          data-ocid="campaigns.create.open_modal_button"
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
        >
          + Kampanya Oluştur
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div
          data-ocid="campaigns.create.dialog"
          className="p-5 rounded-2xl space-y-4"
          style={{
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.3)",
          }}
        >
          <p className="text-white font-semibold">Yeni Kampanya</p>
          <div>
            <p className="text-slate-400 text-xs mb-1">Kampanya Adı</p>
            <input
              data-ocid="campaigns.name.input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Örn: Uzun Süredir Gelmeyen Tedarikçiler"
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#f59e0b] text-sm"
            />
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">Davet Mesajı</p>
            <textarea
              data-ocid="campaigns.message.textarea"
              value={form.message}
              onChange={(e) =>
                setForm((f) => ({ ...f, message: e.target.value }))
              }
              placeholder="Sevgili ziyaretçimiz, sizi tekrar aramızda görmeyi bekliyoruz..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#f59e0b] text-sm resize-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-slate-400 text-xs mb-1">
                Son Ziyaret &gt; X Gün Önce
              </p>
              <input
                data-ocid="campaigns.days_since.input"
                type="number"
                value={form.segmentDaysSince}
                onChange={(e) =>
                  setForm((f) => ({ ...f, segmentDaysSince: +e.target.value }))
                }
                min={0}
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#f59e0b] text-sm"
              />
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Kategori</p>
              <select
                data-ocid="campaigns.category.select"
                value={form.segmentCategory}
                onChange={(e) =>
                  setForm((f) => ({ ...f, segmentCategory: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                style={{
                  background: "#0f1729",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <option value="" className="bg-[#0f1729]">
                  Tümü
                </option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-[#0f1729]">
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Firma Adı (içerir)</p>
              <input
                data-ocid="campaigns.firm.input"
                value={form.segmentFirm}
                onChange={(e) =>
                  setForm((f) => ({ ...f, segmentFirm: e.target.value }))
                }
                placeholder="Firma..."
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#f59e0b] text-sm"
              />
            </div>
          </div>
          <div
            className="p-3 rounded-xl"
            style={{
              background: "rgba(20,184,166,0.1)",
              border: "1px solid rgba(20,184,166,0.2)",
            }}
          >
            <p className="text-sm" style={{ color: "#14b8a6" }}>
              🎯 Eşleşen ziyaretçi sayısı: <strong>{preview.length}</strong>
            </p>
            {preview.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {preview.slice(0, 8).map((v) => (
                  <span
                    key={v.visitorId}
                    className="px-2 py-0.5 rounded-full text-xs text-white"
                    style={{ background: "rgba(255,255,255,0.1)" }}
                  >
                    {v.name}
                  </span>
                ))}
                {preview.length > 8 && (
                  <span className="text-slate-500 text-xs">
                    +{preview.length - 8} daha
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              data-ocid="campaigns.confirm.submit_button"
              onClick={createCampaign}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
            >
              Kampanya Oluştur
            </button>
            <button
              type="button"
              data-ocid="campaigns.cancel.cancel_button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Campaign List */}
      {campaigns.length === 0 && !showForm ? (
        <div
          data-ocid="campaigns.list.empty_state"
          className="p-8 rounded-2xl text-center"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <p className="text-4xl mb-3">📣</p>
          <p className="text-slate-400">Henüz kampanya oluşturulmadı.</p>
          <p className="text-slate-500 text-sm mt-1">
            Belirli segmentlerdeki ziyaretçilere toplu davet gönderin.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c, i) => (
            <div
              key={c.id}
              data-ocid={`campaigns.item.${i + 1}`}
              className="p-5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-white font-semibold">{c.name}</p>
                  <p className="text-slate-400 text-sm mt-0.5">{c.message}</p>
                </div>
                <button
                  type="button"
                  data-ocid={`campaigns.delete.delete_button.${i + 1}`}
                  onClick={() => deleteCampaign(c.id)}
                  className="text-red-400 hover:text-red-300 text-xs shrink-0"
                >
                  Sil
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mb-3 text-xs">
                {c.segmentDaysSince > 0 && (
                  <span
                    className="px-2 py-1 rounded-full"
                    style={{
                      background: "rgba(14,165,233,0.15)",
                      color: "#38bdf8",
                    }}
                  >
                    &gt;{c.segmentDaysSince} gün önce
                  </span>
                )}
                {c.segmentCategory && (
                  <span
                    className="px-2 py-1 rounded-full"
                    style={{
                      background: "rgba(168,85,247,0.15)",
                      color: "#c084fc",
                    }}
                  >
                    {c.segmentCategory}
                  </span>
                )}
                {c.segmentFirm && (
                  <span
                    className="px-2 py-1 rounded-full"
                    style={{
                      background: "rgba(245,158,11,0.15)",
                      color: "#fbbf24",
                    }}
                  >
                    {c.segmentFirm}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {[
                  {
                    label: "Oluşturuldu",
                    value: c.matchedCount,
                    color: "#14b8a6",
                  },
                  {
                    label: "Görüntülendi (simüle)",
                    value: c.viewCount,
                    color: "#0ea5e9",
                  },
                  {
                    label: "Kullanıldı (simüle)",
                    value: c.useCount,
                    color: "#22c55e",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="text-center p-2 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <p
                      className="text-xl font-bold"
                      style={{ color: stat.color }}
                    >
                      {stat.value}
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                data-ocid={`campaigns.copy_link.button.${i + 1}`}
                onClick={() => copyLink(c.id)}
                className="w-full px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background:
                    copiedId === c.id
                      ? "rgba(34,197,94,0.15)"
                      : "rgba(245,158,11,0.12)",
                  border:
                    copiedId === c.id
                      ? "1px solid rgba(34,197,94,0.4)"
                      : "1px solid rgba(245,158,11,0.3)",
                  color: copiedId === c.id ? "#4ade80" : "#f59e0b",
                }}
              >
                {copiedId === c.id
                  ? "✓ Link Kopyalandı!"
                  : `🔗 Davet Linki: /invite/${c.id}`}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
