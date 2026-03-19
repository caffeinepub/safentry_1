import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import React, { useState } from "react";
import { toast } from "sonner";
import { getAnnouncements, saveAnnouncement } from "../store";
import type { Announcement } from "../types";

interface BroadcastModalProps {
  companyId: string;
  staffName: string;
  onClose: () => void;
}

function formatDT(ts: number) {
  return new Date(ts).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BroadcastModal({
  companyId,
  staffName,
  onClose,
}: BroadcastModalProps) {
  const [message, setMessage] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>(() =>
    getAnnouncements(companyId),
  );

  const publish = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    const ann: Announcement = {
      id: `ann_${Date.now()}`,
      companyId,
      message: trimmed,
      createdBy: staffName,
      createdAt: Date.now(),
    };
    saveAnnouncement(ann);
    setAnnouncements(getAnnouncements(companyId));
    setMessage("");
    toast.success("Duyuru tüm personele yayınlandı");
  };

  return (
    <div
      data-ocid="broadcast.modal"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      tabIndex={-1}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-2xl flex flex-col max-h-[85vh]"
        style={{
          background: "linear-gradient(135deg,#0f172a,#0f1e36)",
          border: "1px solid rgba(245,158,11,0.3)",
          boxShadow: "0 0 40px rgba(245,158,11,0.08)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div>
            <div className="text-white font-bold text-base">
              📢 Personel Duyurusu
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Tüm personel bir sonraki girişte görecek
            </div>
          </div>
          <button
            type="button"
            data-ocid="broadcast.close_button"
            onClick={onClose}
            className="text-slate-400 hover:text-white w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Compose */}
        <div className="px-6 py-4 shrink-0">
          <Textarea
            data-ocid="broadcast.textarea"
            placeholder="Duyurunuzu yazın... (ör. B katı 15:00'e kadar kapalı)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl resize-none mb-3"
          />
          <button
            type="button"
            data-ocid="broadcast.submit_button"
            onClick={publish}
            disabled={!message.trim()}
            className="w-full py-2.5 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg,#f59e0b,#d97706)",
              border: "1px solid #fbbf24",
            }}
          >
            📣 Yayınla
          </button>
        </div>

        {/* Past announcements */}
        <div
          className="px-6 pb-2 shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="text-xs font-bold uppercase tracking-wider py-3"
            style={{ color: "#f59e0b" }}
          >
            Geçmiş Duyurular ({announcements.length})
          </div>
        </div>
        <ScrollArea className="flex-1 px-6 pb-6">
          {announcements.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              Henüz duyuru yok.
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  data-ocid="broadcast.item.1"
                  className="p-4 rounded-xl"
                  style={{
                    background: "rgba(245,158,11,0.06)",
                    border: "1px solid rgba(245,158,11,0.15)",
                  }}
                >
                  <p className="text-white text-sm mb-2">{ann.message}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs">
                      👤 {ann.createdBy}
                    </span>
                    <span className="text-slate-500 text-xs">
                      {formatDT(ann.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
