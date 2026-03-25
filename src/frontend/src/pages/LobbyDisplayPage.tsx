import { useEffect, useState } from "react";
import {
  findCompanyById,
  getAppointments,
  getQueue,
  getVisitors,
} from "../store";
import type { Appointment, Visitor } from "../types";

interface Props {
  companyId: string;
}

export default function LobbyDisplayPage({ companyId }: Props) {
  const [now, setNow] = useState(new Date());
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queueList, setQueueList] = useState(() => getQueue(companyId));

  const company = findCompanyById(companyId);

  // Read kiosk theme
  const rawTheme = localStorage.getItem(`safentry_kiosk_theme_${companyId}`);
  const theme = rawTheme ? JSON.parse(rawTheme) : {};
  const bgColor = theme.bgColor || "#020817";
  const accentColor = theme.accentColor || "#14b8a6";
  const welcomeTitle = theme.welcomeTitle || company?.name || "Safentry";

  useEffect(() => {
    const reload = () => {
      setVisitors(getVisitors(companyId));
      setAppointments(getAppointments(companyId));
      setQueueList(getQueue(companyId));
    };
    reload();
    const interval = setInterval(reload, 30000);
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(clock);
    };
  }, [companyId]);

  const waiting = visitors.filter((v) => v.status === "preregistered");
  const inside = visitors.filter((v) => v.status === "active");
  const today = now.toISOString().slice(0, 10);
  const upcoming = appointments
    .filter(
      (a) =>
        a.appointmentDate === today &&
        a.status !== "cancelled" &&
        a.appointmentTime >= now.toTimeString().slice(0, 5),
    )
    .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime))
    .slice(0, 3);

  return (
    <div
      className="min-h-screen flex flex-col p-8 overflow-hidden"
      style={{ background: bgColor, color: "#f1f5f9" }}
    >
      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-5xl font-bold mb-2" style={{ color: accentColor }}>
          {welcomeTitle}
        </div>
        <div className="text-4xl font-mono text-white">
          {now.toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </div>
        <div className="text-slate-400 text-lg mt-1">
          {now.toLocaleDateString("tr-TR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
      </div>

      {/* 3 Column Layout */}
      <div className="grid grid-cols-3 gap-6 flex-1">
        {/* Bekleyenler */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${accentColor}40`,
          }}
        >
          <h2
            className="text-2xl font-bold mb-4 flex items-center gap-2"
            style={{ color: accentColor }}
          >
            ⏳ Bekleyenler
            <span
              className="ml-2 text-lg px-3 py-0.5 rounded-full"
              style={{ background: `${accentColor}25`, color: accentColor }}
            >
              {waiting.length}
            </span>
          </h2>
          <div className="space-y-3">
            {waiting.length === 0 && (
              <p className="text-slate-500 text-lg">Bekleyen ziyaretçi yok</p>
            )}
            {waiting.map((v) => (
              <div
                key={v.visitorId}
                className="p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <div className="text-white font-semibold text-lg">{v.name}</div>
                <div className="text-slate-400 text-sm">
                  {v.category || "Ziyaretçi"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* İçeride */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(34,197,94,0.4)",
          }}
        >
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-emerald-400">
            ✅ İçeride
            <span className="ml-2 text-lg px-3 py-0.5 rounded-full bg-emerald-400/20">
              {inside.length}
            </span>
          </h2>
          <div className="space-y-3">
            {inside.length === 0 && (
              <p className="text-slate-500 text-lg">
                Bina içinde ziyaretçi yok
              </p>
            )}
            {inside.map((v) => (
              <div
                key={v.visitorId}
                className="p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <div className="text-white font-semibold text-lg">{v.name}</div>
                <div className="text-slate-400 text-sm">
                  {v.department || v.category || "Ziyaretçi"} •{" "}
                  {new Date(v.arrivalTime).toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Yaklaşan Randevular */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(245,158,11,0.4)",
          }}
        >
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-amber-400">
            📅 Yaklaşan Randevular
          </h2>
          <div className="space-y-3">
            {upcoming.length === 0 && (
              <p className="text-slate-500 text-lg">Yaklaşan randevu yok</p>
            )}
            {upcoming.map((a) => (
              <div
                key={a.id}
                className="p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <div className="text-white font-semibold text-lg">
                  {a.visitorName}
                </div>
                <div className="text-slate-400 text-sm">
                  {a.appointmentTime} • {a.hostName}
                </div>
                <div className="text-slate-500 text-xs mt-0.5">{a.purpose}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Queue Widget */}
      {queueList.length > 0 && (
        <div
          className="mt-6 rounded-2xl p-4"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${accentColor}30`,
          }}
        >
          <h3
            className="text-lg font-bold mb-3 flex items-center gap-2"
            style={{ color: accentColor }}
          >
            🔢 Bekleme Sırası
            <span
              className="text-base px-2 py-0.5 rounded-full"
              style={{ background: `${accentColor}20`, color: accentColor }}
            >
              {queueList.length} kişi
            </span>
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {queueList.slice(0, 5).map((q, i) => (
              <div
                key={q.visitorId}
                className="flex-shrink-0 px-4 py-3 rounded-xl text-center min-w-[100px]"
                style={{
                  background:
                    i === 0 ? `${accentColor}25` : "rgba(255,255,255,0.05)",
                  border: `1px solid ${i === 0 ? accentColor : "rgba(255,255,255,0.1)"}`,
                }}
              >
                <div
                  className="text-2xl font-bold"
                  style={{ color: i === 0 ? accentColor : "#e2e8f0" }}
                >
                  #{q.queueNo}
                </div>
                <div className="text-xs mt-1 text-slate-400 truncate max-w-[90px]">
                  {q.visitorName.split(" ")[0]}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center mt-8 text-slate-600 text-sm">
        Otomatik yenileme: 30 saniyede bir •{" "}
        <span style={{ color: `${accentColor}80` }}>Safentry VMS</span>
      </div>
    </div>
  );
}
