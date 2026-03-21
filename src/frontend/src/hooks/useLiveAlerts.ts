import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { getVisitors } from "../store";

const KIOSK_PENDING_KEY = "safentry_kiosk_pending";

interface KioskPendingEntry {
  name: string;
  visitorId?: string;
  companyId: string;
  timestamp: number;
}

export function useLiveAlerts(companyId: string, enabled: boolean) {
  const alertedVipIds = useRef<Set<string>>(new Set());
  const alertedWaitingIds = useRef<Set<string>>(new Set());
  const alertedPendingIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !companyId) return;

    const check = () => {
      const now = Date.now();
      const visitors = getVisitors(companyId);

      for (const v of visitors) {
        // VIP just arrived (within last 31 seconds)
        const isVip =
          v.category?.toLowerCase().includes("vip") || v.label === "vip";
        if (
          isVip &&
          v.status === "active" &&
          now - v.arrivalTime < 31000 &&
          !alertedVipIds.current.has(v.visitorId)
        ) {
          alertedVipIds.current.add(v.visitorId);
          toast.warning(`👑 VIP Ziyaretçi: ${v.name} binaya girdi!`, {
            duration: 8000,
          });
        }

        // Active visitors waiting >10 minutes (status active but no departure)
        if (
          v.status === "active" &&
          !v.departureTime &&
          now - v.arrivalTime > 10 * 60 * 1000 &&
          !alertedWaitingIds.current.has(v.visitorId)
        ) {
          alertedWaitingIds.current.add(v.visitorId);
          const waitMin = Math.floor((now - v.arrivalTime) / 60000);
          toast.warning(
            `⏰ ${v.name} ${waitMin} dakikadır bekliyor! Lütfen kontrol edin.`,
            { duration: 8000 },
          );
        }
      }

      // Check kiosk pending visitors waiting for approval
      try {
        const pending: KioskPendingEntry[] = JSON.parse(
          localStorage.getItem(KIOSK_PENDING_KEY) ?? "[]",
        );
        for (const entry of pending) {
          if (
            entry.companyId === companyId &&
            entry.visitorId &&
            now - entry.timestamp > 5 * 60 * 1000 &&
            !alertedPendingIds.current.has(entry.visitorId)
          ) {
            alertedPendingIds.current.add(entry.visitorId);
            toast.warning(
              `🔔 Onay bekleyen ziyaretçi: ${entry.name} — 5+ dakikadır onay bekleniyor!`,
              { duration: 8000 },
            );
          }
        }
      } catch {
        // ignore
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [companyId, enabled]);
}
