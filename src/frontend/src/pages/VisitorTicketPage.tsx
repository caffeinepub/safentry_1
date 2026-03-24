import { useEffect, useState } from "react";
import { getVisitorBroadcasts } from "../components/VisitorBroadcastModal";
import { findCompanyById, getStaffByCompany, getVisitors } from "../store";
import type { VisitorBroadcast } from "../types";
import type { AppScreen, Visitor } from "../types";

interface Props {
  visitorId: string;
  onNavigate: (s: AppScreen) => void;
}

function QRCodeDisplay({ data, size = 140 }: { data: string; size?: number }) {
  const [svgUrl, setSvgUrl] = useState("");

  useEffect(() => {
    // Simple QR code visual using SVG pattern (placeholder)
    const encoded = encodeURIComponent(data);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="#fff"/>
      <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-size="10" fill="#0f1729" font-family="monospace">
        ${data.slice(0, 12)}
      </text>
      <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-size="8" fill="#666" font-family="monospace">
        ${data.slice(12, 24)}
      </text>
      <rect x="10" y="10" width="20" height="20" fill="none" stroke="#0f1729" stroke-width="2"/>
      <rect x="12" y="12" width="6" height="6" fill="#0f1729"/>
      <rect x="${size - 30}" y="10" width="20" height="20" fill="none" stroke="#0f1729" stroke-width="2"/>
      <rect x="${size - 28}" y="12" width="6" height="6" fill="#0f1729"/>
      <rect x="10" y="${size - 30}" width="20" height="20" fill="none" stroke="#0f1729" stroke-width="2"/>
      <rect x="12" y="${size - 28}" width="6" height="6" fill="#0f1729"/>
    </svg>`;
    const url = `data:image/svg+xml;charset=utf-8,${encoded}`;
    void url;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const blobUrl = URL.createObjectURL(blob);
    setSvgUrl(blobUrl);
    return () => URL.revokeObjectURL(blobUrl);
  }, [data, size]);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ width: size, height: size, background: "white" }}
    >
      {svgUrl && <img src={svgUrl} alt="QR Kod" width={size} height={size} />}
    </div>
  );
}

export default function VisitorTicketPage({ visitorId, onNavigate }: Props) {
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [copied, setCopied] = useState(false);
  const [broadcasts, setBroadcasts] = useState<VisitorBroadcast[]>([]);

  useEffect(() => {
    // Find visitor across all companies
    const allVisitors: Visitor[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("safentry_visitors_")) {
          const companyId = key.replace("safentry_visitors_", "");
          const list = getVisitors(companyId);
          allVisitors.push(...list);
        }
      }
    } catch {}
    const found = allVisitors.find((v) => v.visitorId === visitorId);
    setVisitor(found ?? null);
    if (found) {
      setBroadcasts(getVisitorBroadcasts(found.companyId));
    }
  }, [visitorId]);

  if (!visitor) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0a0f1e" }}
      >
        <div className="text-center">
          <div className="text-6xl mb-4">🎫</div>
          <p className="text-slate-400 text-xl">Bilet bulunamadı</p>
          <button
            type="button"
            onClick={() => onNavigate("welcome")}
            className="mt-4 text-teal-400 hover:text-teal-300 text-sm"
          >
            Ana sayfaya dön
          </button>
        </div>
      </div>
    );
  }

  const company = findCompanyById(visitor.companyId);
  const staffList = getStaffByCompany(visitor.companyId);
  const host = staffList.find((s) => s.staffId === visitor.hostStaffId);

  const statusColors: Record<
    string,
    { bg: string; text: string; label: string }
  > = {
    active: {
      bg: "rgba(34,197,94,0.15)",
      text: "#22c55e",
      label: "✅ İçeride",
    },
    pending: {
      bg: "rgba(245,158,11,0.15)",
      text: "#f59e0b",
      label: "⏳ Bekliyor",
    },
    completed: {
      bg: "rgba(100,116,139,0.15)",
      text: "#94a3b8",
      label: "✓ Tamamlandı",
    },
    rejected: {
      bg: "rgba(239,68,68,0.15)",
      text: "#ef4444",
      label: "✕ Reddedildi",
    },
  };
  const sc = statusColors[visitor.status] ?? statusColors.completed;

  const ticketUrl = `${window.location.origin}/ticket/${visitorId}`;
  const arrivalStr = new Date(visitor.arrivalTime).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const copyUrl = () => {
    navigator.clipboard.writeText(ticketUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "#0a0f1e" }}
      data-ocid="visitor_ticket.page"
    >
      <div className="w-full max-w-md">
        {/* Back button */}
        <div className="flex justify-between items-center mb-6">
          <button
            type="button"
            data-ocid="visitor_ticket.close_button"
            onClick={() => window.history.back()}
            className="text-slate-400 hover:text-white text-sm"
          >
            ← Geri
          </button>
          <button
            type="button"
            data-ocid="visitor_ticket.copy_button"
            onClick={copyUrl}
            className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: copied
                ? "rgba(34,197,94,0.15)"
                : "rgba(255,255,255,0.08)",
              border: copied
                ? "1px solid rgba(34,197,94,0.4)"
                : "1px solid rgba(255,255,255,0.15)",
              color: copied ? "#4ade80" : "#94a3b8",
            }}
          >
            {copied ? "✓ Kopyalandı" : "🔗 Link Kopyala"}
          </button>
        </div>

        {/* Ticket card */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(145deg, #0f1d35 0%, #0a1628 100%)",
            border: "1.5px solid rgba(0,212,170,0.3)",
            boxShadow:
              "0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,212,170,0.1)",
          }}
          data-ocid="visitor_ticket.card"
        >
          {/* Emergency Broadcast Banner */}
          {broadcasts.length > 0 && (
            <div
              className="px-6 py-3 space-y-2"
              style={{
                background:
                  "linear-gradient(135deg,rgba(239,68,68,0.2),rgba(220,38,38,0.15))",
                borderBottom: "1px solid rgba(239,68,68,0.3)",
              }}
              data-ocid="visitor_ticket.broadcast.panel"
            >
              {broadcasts.map((b) => (
                <div key={b.broadcastId} className="flex items-start gap-2">
                  <span className="text-red-400 text-lg shrink-0">🚨</span>
                  <div>
                    <p className="text-red-300 text-xs font-bold uppercase tracking-wide mb-0.5">
                      ACİL DUYURU
                    </p>
                    <p className="text-white text-sm font-medium">
                      {b.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Header */}
          <div
            className="px-8 py-5"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,212,170,0.15), rgba(14,165,233,0.1))",
              borderBottom: "1px solid rgba(0,212,170,0.2)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-400 text-xs font-bold tracking-widest uppercase">
                  Ziyaretçi Bileti
                </p>
                <p className="text-slate-300 text-sm">
                  {company?.name ?? visitor.companyId}
                </p>
              </div>
              <div className="text-4xl">🎫</div>
            </div>
          </div>

          {/* Visitor info */}
          <div className="px-8 py-6 space-y-5">
            <div className="flex items-start gap-5">
              {/* Photo or avatar */}
              {visitor.visitorPhoto ? (
                <img
                  src={visitor.visitorPhoto}
                  alt={visitor.name}
                  className="w-20 h-20 rounded-2xl object-cover flex-shrink-0"
                  style={{ border: "2px solid rgba(0,212,170,0.3)" }}
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg,#0ea5e9,#14b8a6)",
                    border: "2px solid rgba(0,212,170,0.3)",
                  }}
                >
                  {visitor.name[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-white text-2xl font-bold leading-tight">
                  {visitor.name}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className="text-xs px-3 py-1 rounded-full font-semibold"
                    style={{ background: sc.bg, color: sc.text }}
                  >
                    {sc.label}
                  </span>
                  <span
                    className="text-xs px-3 py-1 rounded-full"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      color: "#94a3b8",
                    }}
                  >
                    {visitor.category ?? "Misafir"}
                  </span>
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Giriş Zamanı", value: arrivalStr },
                { label: "Ziyaret Amacı", value: visitor.visitReason || "—" },
                { label: "Ev Sahibi", value: host?.name ?? "—" },
                {
                  label: "Firma",
                  value: company?.name ?? "—",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="p-3 rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <p className="text-slate-500 text-xs mb-1">{item.label}</p>
                  <p className="text-white text-sm font-medium truncate">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Access zones */}
            {visitor.zonePermissions && visitor.zonePermissions.length > 0 && (
              <div
                className="p-3 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <p className="text-slate-500 text-xs mb-2">Erişim Bölgeleri</p>
                <div className="flex flex-wrap gap-1.5">
                  {visitor.zonePermissions.map((z) => (
                    <span
                      key={z}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(0,212,170,0.12)",
                        color: "#00d4aa",
                      }}
                    >
                      {z}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* QR Code */}
            <div className="flex flex-col items-center gap-3 pt-2">
              <QRCodeDisplay
                data={`SAFENTRY:${visitorId}:${visitor.companyId}`}
                size={140}
              />
              <p className="text-slate-500 text-xs text-center">
                ID: {visitorId.slice(0, 12).toUpperCase()}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div
            className="px-8 py-4 text-center"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-slate-600 text-xs">
              Safentry Ziyaretçi Yönetim Sistemi · {company?.name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
