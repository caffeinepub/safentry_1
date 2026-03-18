import { useState } from "react";
import { toast } from "sonner";
import type { PatrolEntry } from "../store";
import { deletePatrol, getPatrols, savePatrol } from "../store";
import { formatDateTime, generateId } from "../utils";

interface Props {
  companyId: string;
  staffId: string;
  staffName: string;
}

const CHECKPOINTS = [
  "Ana Giriş",
  "Arka Giriş",
  "Otopark",
  "Zemin Kat Koridor",
  "1. Kat Koridor",
  "2. Kat Koridor",
  "3. Kat Koridor",
  "Sunucu Odası",
  "Kamera Sistemi",
  "Alarm Paneli",
  "Depo",
  "Merdiven Sahanlığı",
];

export default function PatrolTab({ companyId, staffId, staffName }: Props) {
  const [patrols, setPatrols] = useState<PatrolEntry[]>(() =>
    getPatrols(companyId),
  );
  const [form, setForm] = useState({ checkpoint: "", notes: "" });
  const [customCheckpoint, setCustomCheckpoint] = useState("");

  const reload = () => setPatrols(getPatrols(companyId));

  const submit = () => {
    const cp =
      form.checkpoint === "__custom__"
        ? customCheckpoint.trim()
        : form.checkpoint;
    if (!cp) {
      toast.error("Kontrol noktası seçin veya girin.");
      return;
    }
    const entry: PatrolEntry = {
      id: generateId(),
      companyId,
      staffId,
      staffName,
      checkpoint: cp,
      notes: form.notes.trim(),
      loggedAt: Date.now(),
    };
    savePatrol(entry);
    setForm({ checkpoint: "", notes: "" });
    setCustomCheckpoint("");
    toast.success("Devriye kaydı eklendi.");
    reload();
  };

  const remove = (id: string) => {
    deletePatrol(companyId, id);
    reload();
  };

  const today = patrols.filter((p) => {
    const d = new Date(p.loggedAt);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  });

  return (
    <div className="space-y-6" data-ocid="patrol.section">
      <div>
        <h2 className="text-white font-bold text-xl">🗺️ Devriye Logu</h2>
        <p className="text-slate-400 text-sm">
          Kontrol noktası ve tur kayıtlarını takip edin
        </p>
      </div>

      {/* Entry Form */}
      <div
        className="p-5 rounded-2xl space-y-4"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(14,165,233,0.2)",
        }}
      >
        <h3 className="text-white font-semibold text-sm">Yeni Kayıt Ekle</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-slate-300 text-sm mb-1">Kontrol Noktası *</p>
            <select
              data-ocid="patrol.checkpoint.select"
              value={form.checkpoint}
              onChange={(e) =>
                setForm((f) => ({ ...f, checkpoint: e.target.value }))
              }
              className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9] text-sm"
            >
              <option value="" className="bg-slate-900">
                Seç...
              </option>
              {CHECKPOINTS.map((cp) => (
                <option key={cp} value={cp} className="bg-slate-900">
                  {cp}
                </option>
              ))}
              <option value="__custom__" className="bg-slate-900">
                — Diğer (manuel gir)
              </option>
            </select>
          </div>
          {form.checkpoint === "__custom__" && (
            <div>
              <p className="text-slate-300 text-sm mb-1">Özel Nokta *</p>
              <input
                type="text"
                data-ocid="patrol.custom_checkpoint.input"
                value={customCheckpoint}
                onChange={(e) => setCustomCheckpoint(e.target.value)}
                placeholder="Kontrol noktası adı"
                className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-[#0ea5e9] text-sm"
              />
            </div>
          )}
          <div
            className={form.checkpoint === "__custom__" ? "" : "sm:col-span-1"}
          >
            <p className="text-slate-300 text-sm mb-1">Notlar</p>
            <input
              type="text"
              data-ocid="patrol.notes.input"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Gözlemler, anormallikler..."
              className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-[#0ea5e9] text-sm"
            />
          </div>
        </div>
        <button
          type="button"
          data-ocid="patrol.submit_button"
          onClick={submit}
          className="px-5 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
        >
          + Kaydet
        </button>
      </div>

      {/* Summary */}
      {today.length > 0 && (
        <div
          className="px-4 py-3 rounded-xl text-sm"
          style={{
            background: "rgba(14,165,233,0.08)",
            border: "1px solid rgba(14,165,233,0.2)",
          }}
        >
          <span className="text-[#0ea5e9] font-semibold">Bugün:</span>{" "}
          <span className="text-slate-300">
            {today.length} devriye kaydı — son kontrol:{" "}
            {new Date(today[0].loggedAt).toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      )}

      {/* Log List */}
      {patrols.length === 0 ? (
        <div data-ocid="patrol.empty_state" className="text-center py-16">
          <div className="text-5xl mb-3">🗺️</div>
          <p className="text-slate-400">Henüz devriye kaydı yok.</p>
          <p className="text-slate-500 text-sm">
            Kontrol noktalarını tamamladıkça buraya kayıt ekleyin.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {patrols.map((p, i) => (
            <div
              key={p.id}
              data-ocid={`patrol.item.${i + 1}`}
              className="px-4 py-3 rounded-xl flex items-start gap-3"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="text-[#0ea5e9] text-lg">📍</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-semibold text-sm">
                    {p.checkpoint}
                  </span>
                  <span className="text-slate-500 text-xs">
                    {formatDateTime(p.loggedAt)}
                  </span>
                </div>
                <p className="text-slate-400 text-xs mt-0.5">
                  👤 {p.staffName}
                </p>
                {p.notes && (
                  <p className="text-slate-500 text-xs mt-0.5">📝 {p.notes}</p>
                )}
              </div>
              <button
                type="button"
                data-ocid={`patrol.delete_button.${i + 1}`}
                onClick={() => remove(p.id)}
                className="text-slate-600 hover:text-red-400 text-xs transition-colors px-2 py-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
