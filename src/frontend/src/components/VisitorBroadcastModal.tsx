import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { toast } from "sonner";
import type { VisitorBroadcast } from "../types";
import { generateId } from "../utils";

export function getVisitorBroadcasts(companyId: string): VisitorBroadcast[] {
  try {
    const all: VisitorBroadcast[] = JSON.parse(
      localStorage.getItem(`safentry_visitor_broadcasts_${companyId}`) || "[]",
    );
    const now = Date.now();
    return all.filter((b) => b.expiresAt > now);
  } catch {
    return [];
  }
}

function getAllBroadcasts(companyId: string): VisitorBroadcast[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_visitor_broadcasts_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}

function saveVisitorBroadcast(b: VisitorBroadcast): void {
  const all = getAllBroadcasts(b.companyId);
  all.unshift(b);
  // Keep only last 20
  localStorage.setItem(
    `safentry_visitor_broadcasts_${b.companyId}`,
    JSON.stringify(all.slice(0, 20)),
  );
}

interface Props {
  companyId: string;
  onClose: () => void;
}

function fmt(n: number) {
  return new Date(n).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VisitorBroadcastModal({ companyId, onClose }: Props) {
  const [message, setMessage] = useState("");
  const [broadcasts, setBroadcasts] = useState<VisitorBroadcast[]>(() =>
    getAllBroadcasts(companyId),
  );

  const publish = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    const now = Date.now();
    const b: VisitorBroadcast = {
      broadcastId: generateId(),
      companyId,
      message: trimmed,
      createdAt: now,
      expiresAt: now + 2 * 60 * 60 * 1000, // 2 hours
    };
    saveVisitorBroadcast(b);
    setBroadcasts(getAllBroadcasts(companyId));
    setMessage("");
    toast.success("Acil duyuru tüm aktif ziyaretçi biletlerine yayınlandı");
  };

  return (
    <div
      data-ocid="visitor_broadcast.modal"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      tabIndex={-1}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-2xl flex flex-col max-h-[85vh]"
        style={{
          background: "linear-gradient(135deg,#1a0a0a,#1f1010)",
          border: "1px solid rgba(239,68,68,0.4)",
          boxShadow: "0 0 40px rgba(239,68,68,0.12)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div>
            <div className="text-white font-bold text-base">
              🚨 Ziyaretçi Acil Duyuru
            </div>
            <div className="text-xs text-red-400/70 mt-0.5">
              Tüm aktif ziyaretçi biletlerinde görünür — 2 saat geçerli
            </div>
          </div>
          <button
            type="button"
            data-ocid="visitor_broadcast.close_button"
            onClick={onClose}
            className="text-slate-400 hover:text-white w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Compose */}
        <div className="px-6 py-4 shrink-0">
          <textarea
            data-ocid="visitor_broadcast.textarea"
            placeholder="Acil duyurunuzu yazın... (ör. Bina tahliyesi başlıyor, lütfen acil çıkışa yönelin)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none resize-none mb-3"
            style={{
              background: "rgba(239,68,68,0.05)",
              border: "1px solid rgba(239,68,68,0.25)",
            }}
          />
          <button
            type="button"
            data-ocid="visitor_broadcast.submit_button"
            onClick={publish}
            disabled={!message.trim()}
            className="w-full py-2.5 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg,#ef4444,#dc2626)",
              border: "1px solid rgba(239,68,68,0.5)",
            }}
          >
            🚨 Tüm Aktif Ziyaretçilere Gönder
          </button>
        </div>

        {/* Past broadcasts */}
        <div
          className="px-6 pb-2 shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="text-xs font-bold uppercase tracking-wider py-3"
            style={{ color: "#f87171" }}
          >
            Son Duyurular ({broadcasts.length})
          </div>
        </div>
        <ScrollArea className="flex-1 px-6 pb-6">
          {broadcasts.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">
              Henüz duyuru gönderilmedi.
            </div>
          ) : (
            <div className="space-y-3">
              {broadcasts.map((b, i) => {
                const expired = b.expiresAt < Date.now();
                return (
                  <div
                    key={b.broadcastId}
                    data-ocid={`visitor_broadcast.item.${i + 1}`}
                    className="p-4 rounded-xl"
                    style={{
                      background: expired
                        ? "rgba(100,116,139,0.06)"
                        : "rgba(239,68,68,0.08)",
                      border: expired
                        ? "1px solid rgba(100,116,139,0.15)"
                        : "1px solid rgba(239,68,68,0.2)",
                      opacity: expired ? 0.6 : 1,
                    }}
                  >
                    <p className="text-white text-sm mb-2">{b.message}</p>
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: expired
                            ? "rgba(100,116,139,0.15)"
                            : "rgba(239,68,68,0.15)",
                          color: expired ? "#94a3b8" : "#f87171",
                        }}
                      >
                        {expired ? "Süresi Doldu" : "Aktif"}
                      </span>
                      <span className="text-slate-500 text-xs">
                        {fmt(b.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
