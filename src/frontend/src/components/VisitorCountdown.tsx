import { useEffect, useState } from "react";

interface Props {
  arrivalTime: number;
  durationLimitMinutes: number | undefined;
}

export default function VisitorCountdown({
  arrivalTime,
  durationLimitMinutes,
}: Props) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!durationLimitMinutes || durationLimitMinutes <= 0) return;

    const calc = () => {
      const limitMs = durationLimitMinutes * 60000;
      const elapsed = Date.now() - arrivalTime;
      setRemaining(limitMs - elapsed);
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [arrivalTime, durationLimitMinutes]);

  if (!durationLimitMinutes || durationLimitMinutes <= 0) return null;

  const totalSeconds = Math.floor(remaining / 1000);
  const isExpired = totalSeconds <= 0;
  const mins = isExpired ? 0 : Math.floor(totalSeconds / 60);
  const secs = isExpired ? 0 : totalSeconds % 60;

  const color = isExpired ? "#ef4444" : mins < 10 ? "#f59e0b" : "#22c55e";

  const bg = isExpired
    ? "rgba(239,68,68,0.15)"
    : mins < 10
      ? "rgba(245,158,11,0.15)"
      : "rgba(34,197,94,0.12)";

  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold"
      style={{ color, background: bg, border: `1px solid ${color}33` }}
      title="Kalan ziyaret süresi"
    >
      {isExpired
        ? "⏰ Süre Doldu"
        : `⏱ ${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`}
    </span>
  );
}
