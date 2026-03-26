import React, { useState } from "react";

interface BoardAnnouncement {
  id: string;
  title: string;
  message: string;
  createdBy: string;
  createdAt: number;
  expiresAt: number | null;
  priority: "normal" | "urgent" | "info";
}

const KEY = (cid: string) => `safentry_boardann_${cid}`;

function load(cid: string): BoardAnnouncement[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY(cid)) || "[]");
    const now = Date.now();
    // Only return non-expired
    return raw.filter(
      (a: BoardAnnouncement) => !a.expiresAt || a.expiresAt > now,
    );
  } catch {
    return [];
  }
}

function save(cid: string, items: BoardAnnouncement[]) {
  localStorage.setItem(KEY(cid), JSON.stringify(items));
}

const PRIORITY_STYLES: Record<
  string,
  { bg: string; border: string; badge: string; label: string }
> = {
  urgent: {
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.3)",
    badge: "rgba(239,68,68,0.2)",
    label: "🚨 Acil",
  },
  normal: {
    bg: "rgba(14,165,233,0.06)",
    border: "rgba(14,165,233,0.2)",
    badge: "rgba(14,165,233,0.15)",
    label: "📢 Duyuru",
  },
  info: {
    bg: "rgba(34,197,94,0.06)",
    border: "rgba(34,197,94,0.25)",
    badge: "rgba(34,197,94,0.15)",
    label: "ℹ️ Bilgi",
  },
};

export default function BoardAnnounceTab({
  companyId,
  staffName,
}: { companyId: string; staffName: string }) {
  const [items, setItems] = useState<BoardAnnouncement[]>(() =>
    load(companyId),
  );
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"normal" | "urgent" | "info">(
    "normal",
  );
  const [days, setDays] = useState("7");
  const [showForm, setShowForm] = useState(false);

  function addAnn() {
    if (!title.trim() || !message.trim()) return;
    const expiresAt = days
      ? Date.now() + Number.parseInt(days) * 86400000
      : null;
    const ann: BoardAnnouncement = {
      id: Date.now().toString(),
      title: title.trim(),
      message: message.trim(),
      createdBy: staffName,
      createdAt: Date.now(),
      expiresAt,
      priority,
    };
    const updated = [ann, ...items];
    save(companyId, updated);
    setItems(updated);
    setTitle("");
    setMessage("");
    setShowForm(false);
  }

  function removeAnn(id: string) {
    const updated = items.filter((a) => a.id !== id);
    save(companyId, updated);
    setItems(updated);
  }

  const fmt = (ts: number) =>
    new Date(ts).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const fmtTime = (ts: number) =>
    new Date(ts).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white font-bold text-xl">
          📌 Kalıcı Duyuru Panosu
        </h2>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: "rgba(14,165,233,0.15)",
            border: "1px solid rgba(14,165,233,0.4)",
            color: "#38bdf8",
          }}
        >
          {showForm ? "İptal" : "+ Yeni Duyuru"}
        </button>
      </div>

      {showForm && (
        <div
          className="p-5 rounded-2xl mb-5 space-y-3"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <h3 className="text-white font-semibold">Yeni Duyuru Ekle</h3>
          <input
            className="w-full px-4 py-2 rounded-xl text-white text-sm"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
            placeholder="Duyuru başlığı"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="w-full px-4 py-2 rounded-xl text-white text-sm resize-none"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
            rows={3}
            placeholder="Duyuru içeriği..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <p className="text-slate-400 text-xs mb-1">Öncelik</p>
              <select
                className="w-full px-3 py-2 rounded-xl text-white text-sm"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as "normal" | "urgent" | "info")
                }
              >
                <option value="normal">📢 Normal</option>
                <option value="urgent">🚨 Acil</option>
                <option value="info">ℹ️ Bilgi</option>
              </select>
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-xs mb-1">
                Son geçerlilik (gün)
              </p>
              <select
                className="w-full px-3 py-2 rounded-xl text-white text-sm"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
                value={days}
                onChange={(e) => setDays(e.target.value)}
              >
                <option value="1">1 gün</option>
                <option value="3">3 gün</option>
                <option value="7">7 gün</option>
                <option value="14">14 gün</option>
                <option value="30">30 gün</option>
                <option value="">Süresiz</option>
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={addAnn}
            disabled={!title.trim() || !message.trim()}
            className="w-full py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "rgba(14,165,233,0.2)",
              border: "1px solid rgba(14,165,233,0.4)",
              color: "#38bdf8",
            }}
          >
            Duyuruyu Panoya Ekle
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <div className="text-5xl mb-3">📌</div>
          <p className="text-lg font-medium text-slate-400">Aktif duyuru yok</p>
          <p className="text-sm mt-1">
            Yeni duyuru ekleyerek tüm personelin görmesini sağlayın.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((ann) => {
            const s = PRIORITY_STYLES[ann.priority];
            return (
              <div
                key={ann.id}
                className="rounded-2xl p-5 relative"
                style={{ background: s.bg, border: `1px solid ${s.border}` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: s.badge, color: "#e2e8f0" }}
                      >
                        {s.label}
                      </span>
                      <span className="text-white font-bold text-sm">
                        {ann.title}
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {ann.message}
                    </p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                      <span>👤 {ann.createdBy}</span>
                      <span>
                        📅 {fmt(ann.createdAt)} {fmtTime(ann.createdAt)}
                      </span>
                      {ann.expiresAt && (
                        <span
                          style={{
                            color:
                              ann.expiresAt - Date.now() < 86400000
                                ? "#fb923c"
                                : "#64748b",
                          }}
                        >
                          ⏳ {fmt(ann.expiresAt)}'e kadar
                        </span>
                      )}
                      {!ann.expiresAt && <span>♾️ Süresiz</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAnn(ann.id)}
                    className="text-slate-500 hover:text-red-400 transition-colors text-lg flex-shrink-0"
                    title="Kaldır"
                  >
                    ✕
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
