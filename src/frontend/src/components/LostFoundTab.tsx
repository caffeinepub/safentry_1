import { useState } from "react";
import { toast } from "sonner";
import type { LostFoundItem } from "../store";
import { deleteLostFound, getLostFound, saveLostFound } from "../store";
import { generateId } from "../utils";

interface Props {
  companyId: string;
}

const EMPTY_FORM = {
  description: "",
  foundLocation: "",
  foundDate: new Date().toISOString().slice(0, 10),
  finderName: "",
};

export default function LostFoundTab({ companyId }: Props) {
  const [items, setItems] = useState<LostFoundItem[]>(() =>
    getLostFound(companyId),
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [claimModal, setClaimModal] = useState<LostFoundItem | null>(null);
  const [claimantName, setClaimantName] = useState("");
  const [filter, setFilter] = useState<"all" | "found" | "claimed">("all");

  const reload = () => setItems(getLostFound(companyId));

  const submit = () => {
    if (
      !form.description.trim() ||
      !form.foundLocation.trim() ||
      !form.finderName.trim()
    ) {
      toast.error("Tüm alanları doldurun.");
      return;
    }
    const item: LostFoundItem = {
      id: generateId(),
      companyId,
      description: form.description.trim(),
      foundLocation: form.foundLocation.trim(),
      foundDate: form.foundDate,
      finderName: form.finderName.trim(),
      status: "found",
    };
    saveLostFound(item);
    setForm(EMPTY_FORM);
    setShowForm(false);
    toast.success("Eşya kaydedildi.");
    reload();
  };

  const claimItem = () => {
    if (!claimModal) return;
    if (!claimantName.trim()) {
      toast.error("İade eden kişi adını girin.");
      return;
    }
    saveLostFound({
      ...claimModal,
      status: "claimed",
      claimantName: claimantName.trim(),
      claimedAt: Date.now(),
    });
    setClaimModal(null);
    setClaimantName("");
    toast.success("Eşya iade edildi.");
    reload();
  };

  const filtered = items.filter((x) => filter === "all" || x.status === filter);

  return (
    <div className="space-y-6" data-ocid="lostfound.section">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-xl">🔍 Kayıp & Bulunan</h2>
          <p className="text-slate-400 text-sm">
            Tesiste bulunan eşyaları kayıt altına al ve sahiplerine iade et
          </p>
        </div>
        <button
          type="button"
          data-ocid="lostfound.open_modal_button"
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
        >
          + Eşya Kaydet
        </button>
      </div>

      {showForm && (
        <div
          className="p-5 rounded-2xl space-y-4"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(14,165,233,0.3)",
          }}
          data-ocid="lostfound.dialog"
        >
          <h3 className="text-white font-semibold">Bulunan Eşya Kaydı</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <p className="text-slate-300 text-sm mb-1">Eşya Açıklaması *</p>
              <input
                type="text"
                data-ocid="lostfound.description.input"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Örn: Siyah laptop çantası"
                className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-[#0ea5e9] text-sm"
              />
            </div>
            <div>
              <p className="text-slate-300 text-sm mb-1">Bulunduğu Yer *</p>
              <input
                type="text"
                data-ocid="lostfound.location.input"
                value={form.foundLocation}
                onChange={(e) =>
                  setForm((f) => ({ ...f, foundLocation: e.target.value }))
                }
                placeholder="Örn: 3. kat koridor"
                className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-[#0ea5e9] text-sm"
              />
            </div>
            <div>
              <p className="text-slate-300 text-sm mb-1">Bulunma Tarihi *</p>
              <input
                type="date"
                data-ocid="lostfound.date.input"
                value={form.foundDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, foundDate: e.target.value }))
                }
                className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9] text-sm"
              />
            </div>
            <div>
              <p className="text-slate-300 text-sm mb-1">Bulan Kişi *</p>
              <input
                type="text"
                data-ocid="lostfound.finder.input"
                value={form.finderName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, finderName: e.target.value }))
                }
                placeholder="Güvenlik görevlisi adı"
                className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-[#0ea5e9] text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              data-ocid="lostfound.submit_button"
              onClick={submit}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
            >
              Kaydet
            </button>
            <button
              type="button"
              data-ocid="lostfound.cancel_button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2 rounded-xl text-sm text-slate-300 border border-white/20 hover:bg-white/10"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(["all", "found", "claimed"] as const).map((f) => (
          <button
            key={f}
            type="button"
            data-ocid={`lostfound.${f}.tab`}
            onClick={() => setFilter(f)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background:
                filter === f
                  ? "rgba(14,165,233,0.2)"
                  : "rgba(255,255,255,0.05)",
              color: filter === f ? "#0ea5e9" : "#94a3b8",
              border: `1px solid ${filter === f ? "rgba(14,165,233,0.4)" : "rgba(255,255,255,0.1)"}`,
            }}
          >
            {f === "all" ? "Tümü" : f === "found" ? "Kayıp" : "İade Edildi"} (
            {items.filter((x) => f === "all" || x.status === f).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div data-ocid="lostfound.empty_state" className="text-center py-16">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-slate-400">Kayıt bulunamadı.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, i) => (
            <div
              key={item.id}
              data-ocid={`lostfound.item.${i + 1}`}
              className="p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${
                  item.status === "claimed"
                    ? "rgba(34,197,94,0.2)"
                    : "rgba(255,255,255,0.1)"
                }`,
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-semibold text-sm">
                    {item.description}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{
                      background:
                        item.status === "found"
                          ? "rgba(245,158,11,0.15)"
                          : "rgba(34,197,94,0.15)",
                      color: item.status === "found" ? "#f59e0b" : "#22c55e",
                    }}
                  >
                    {item.status === "found" ? "Kayıp" : "İade Edildi"}
                  </span>
                </div>
                <p className="text-slate-400 text-xs mt-0.5">
                  📍 {item.foundLocation} · 📅 {item.foundDate} · 👤{" "}
                  {item.finderName}
                </p>
                {item.claimantName && (
                  <p className="text-slate-500 text-xs mt-0.5">
                    İade: {item.claimantName} —{" "}
                    {item.claimedAt
                      ? new Date(item.claimedAt).toLocaleString("tr-TR")
                      : ""}
                  </p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {item.status === "found" && (
                  <button
                    type="button"
                    data-ocid={`lostfound.claim.${i + 1}`}
                    onClick={() => {
                      setClaimModal(item);
                      setClaimantName("");
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{
                      background: "linear-gradient(135deg,#22c55e,#16a34a)",
                    }}
                  >
                    ✅ İade Edildi
                  </button>
                )}
                <button
                  type="button"
                  data-ocid={`lostfound.delete_button.${i + 1}`}
                  onClick={() => {
                    deleteLostFound(companyId, item.id);
                    reload();
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs text-red-400 border border-red-500/30 hover:bg-red-900/20"
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Claim Modal */}
      {claimModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="w-full max-w-sm p-6 rounded-2xl space-y-4"
            style={{
              background: "linear-gradient(135deg,#0f1729,#141d2e)",
              border: "1px solid rgba(34,197,94,0.4)",
            }}
            data-ocid="lostfound.claim.dialog"
          >
            <h3 className="text-white font-bold text-lg">Eşyayı İade Et</h3>
            <p className="text-slate-400 text-sm">{claimModal.description}</p>
            <div>
              <p className="text-slate-300 text-sm mb-1">İade Alan Kişi *</p>
              <input
                type="text"
                data-ocid="lostfound.claimant.input"
                value={claimantName}
                onChange={(e) => setClaimantName(e.target.value)}
                placeholder="Ad Soyad"
                className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-[#22c55e] text-sm"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                data-ocid="lostfound.claim.confirm_button"
                onClick={claimItem}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg,#22c55e,#16a34a)",
                }}
              >
                Onayla
              </button>
              <button
                type="button"
                data-ocid="lostfound.claim.cancel_button"
                onClick={() => setClaimModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm text-slate-300 border border-white/20 hover:bg-white/10"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
