import { Bell, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  dismissNotification,
  getNotifications,
  markAllNotificationsRead,
} from "../store";
import type { SentryNotification } from "../types";

interface Props {
  companyId: string;
}

const TYPE_ICONS: Record<SentryNotification["type"], string> = {
  kiosk_pending: "🔔",
  blacklist_hit: "🚫",
  capacity_warning: "⚠️",
  badge_expiry: "🏷️",
  permit_expiry: "📋",
  sla_breach: "⏱️",
};

const TYPE_COLORS: Record<SentryNotification["type"], string> = {
  kiosk_pending: "#0ea5e9",
  blacklist_hit: "#ef4444",
  capacity_warning: "#f59e0b",
  badge_expiry: "#a855f7",
  permit_expiry: "#f97316",
  sla_breach: "#f59e0b",
};

function relativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff} sn önce`;
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
  return `${Math.floor(diff / 86400)} gün önce`;
}

export default function NotificationCenter({ companyId }: Props) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<SentryNotification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(
    () => setNotifications(getNotifications(companyId)),
    [companyId],
  );

  useEffect(() => {
    reload();
    const t = setInterval(reload, 5000);
    return () => clearInterval(t);
  }, [reload]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unread = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    markAllNotificationsRead(companyId);
    reload();
  };

  const handleDismiss = (id: string) => {
    dismissNotification(companyId, id);
    reload();
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        data-ocid="notifications.open_modal_button"
        onClick={() => {
          setOpen((v) => !v);
          reload();
        }}
        className="relative p-2 rounded-xl transition-all hover:bg-white/10"
        style={{ color: unread > 0 ? "#f59e0b" : "#94a3b8" }}
        title="Bildirimler"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1"
            style={{ background: "#ef4444" }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          data-ocid="notifications.panel"
          className="absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden"
          style={{
            background: "#0d1b2e",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <span className="text-white font-semibold text-sm">
              🔔 Bildirimler
              {unread > 0 && (
                <span
                  className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                  style={{ background: "#ef4444" }}
                >
                  {unread}
                </span>
              )}
            </span>
            {unread > 0 && (
              <button
                type="button"
                data-ocid="notifications.mark_read.button"
                onClick={handleMarkAllRead}
                className="text-xs text-[#0ea5e9] hover:text-white transition-colors"
              >
                Tümünü okundu işaretle
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div
                data-ocid="notifications.empty_state"
                className="px-4 py-8 text-center text-slate-500 text-sm"
              >
                <div className="text-3xl mb-2">🔕</div>
                Bildirim yok
              </div>
            ) : (
              notifications.map((n, i) => (
                <div
                  key={n.id}
                  data-ocid={`notifications.item.${i + 1}`}
                  className="flex items-start gap-3 px-4 py-3 border-b transition-colors hover:bg-white/5"
                  style={{
                    borderColor: "rgba(255,255,255,0.05)",
                    background: n.read
                      ? "transparent"
                      : "rgba(14,165,233,0.05)",
                  }}
                >
                  <span
                    className="text-lg shrink-0 mt-0.5"
                    style={{ color: TYPE_COLORS[n.type] }}
                  >
                    {TYPE_ICONS[n.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm leading-snug"
                      style={{ color: n.read ? "#94a3b8" : "#e2e8f0" }}
                    >
                      {n.message}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {relativeTime(n.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    data-ocid={`notifications.dismiss.${i + 1}`}
                    onClick={() => handleDismiss(n.id)}
                    className="shrink-0 text-slate-600 hover:text-white transition-colors mt-0.5"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
