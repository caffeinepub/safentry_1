import React, { useEffect, useState } from "react";
import { getCompanies, getVisitors } from "../store";
import type { Visitor } from "../types";

interface Props {
  visitId: string;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VisitorBadgeVerifyPage({ visitId }: Props) {
  const [visitor, setVisitor] = useState<Visitor | null | undefined>(undefined);
  const [companyName, setCompanyName] = useState("");
  const [hostName, setHostName] = useState("");

  useEffect(() => {
    // Search across all companies
    const companies = getCompanies();
    for (const co of companies) {
      const visitors = getVisitors(co.companyId);
      const found = visitors.find(
        (v) =>
          v.visitorId === visitId ||
          v.badgeQr === visitId ||
          v.badgeQr?.endsWith(`/verify-badge/${visitId}`),
      );
      if (found) {
        setVisitor(found);
        setCompanyName(co.name);
        // Try to get host name from staff
        try {
          const staffList = JSON.parse(
            localStorage.getItem("safentry_staff") || "[]",
          ) as Array<{ staffId: string; name: string; companyId: string }>;
          const host = staffList.find(
            (s) =>
              s.staffId === found.hostStaffId && s.companyId === co.companyId,
          );
          setHostName(host?.name ?? found.hostStaffId);
        } catch {
          setHostName(found.hostStaffId);
        }
        return;
      }
    }
    setVisitor(null);
  }, [visitId]);

  const isActive = visitor?.status === "active" && !visitor?.isDraft;
  const isDeparted = visitor?.status === "departed";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "#07111f", fontFamily: "system-ui, sans-serif" }}
    >
      {/* Loading */}
      {visitor === undefined && (
        <div className="text-slate-400 text-center animate-pulse text-lg">
          Rozet doğrulanıyor...
        </div>
      )}

      {/* Not found */}
      {visitor === null && (
        <div
          className="w-full max-w-sm p-8 rounded-3xl text-center"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "2px solid rgba(239,68,68,0.4)",
          }}
        >
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "#f87171" }}>
            Geçersiz Rozet
          </h1>
          <p className="text-slate-400 text-sm">
            Bu rozet bulunamadı veya süresi dolmuş.
          </p>
          <p className="text-slate-600 text-xs mt-3 font-mono break-all">
            ID: {visitId}
          </p>
        </div>
      )}

      {/* Active visitor */}
      {visitor && isActive && (
        <div
          className="w-full max-w-sm rounded-3xl overflow-hidden"
          style={{
            border: "2px solid rgba(34,197,94,0.5)",
            background: "rgba(34,197,94,0.06)",
          }}
        >
          {/* Green header */}
          <div
            className="px-6 py-5 text-center"
            style={{ background: "rgba(34,197,94,0.15)" }}
          >
            <div className="text-5xl mb-2">✅</div>
            <p className="text-green-400 font-bold text-lg uppercase tracking-wide">
              Giriş Onaylı
            </p>
            <p className="text-green-300 text-xs mt-1">Rozet Geçerli</p>
          </div>

          {/* Photo */}
          {visitor.visitorPhoto && (
            <div className="flex justify-center mt-5">
              <img
                src={visitor.visitorPhoto}
                alt={visitor.name}
                className="w-24 h-24 rounded-full object-cover"
                style={{
                  border: "3px solid rgba(34,197,94,0.5)",
                }}
              />
            </div>
          )}

          {/* Info */}
          <div className="px-6 py-5 space-y-3">
            <div className="text-center mb-4">
              <h2 className="text-white font-bold text-2xl">{visitor.name}</h2>
              {visitor.idNumber && visitor.idNumber !== "---" && (
                <p className="text-slate-400 font-mono text-sm">
                  {visitor.idNumber}
                </p>
              )}
            </div>

            {[
              { label: "Şirket", value: companyName },
              { label: "Ziyaret Nedeni", value: visitor.visitReason },
              { label: "Ev Sahibi", value: hostName },
              { label: "Giriş Saati", value: formatTime(visitor.arrivalTime) },
              visitor.category && {
                label: "Kategori",
                value: visitor.category,
              },
              visitor.zonePermissions?.length && {
                label: "Erişim Bölgeleri",
                value: visitor.zonePermissions.join(", "),
              },
              visitor.floor && { label: "Kat", value: visitor.floor },
            ]
              .filter(Boolean)
              .map(
                (row) =>
                  row && (
                    <div
                      key={row.label}
                      className="flex justify-between gap-3 text-sm"
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        paddingBottom: "8px",
                      }}
                    >
                      <span className="text-slate-500">{row.label}</span>
                      <span className="text-slate-200 text-right max-w-[60%]">
                        {row.value}
                      </span>
                    </div>
                  ),
              )}

            {/* Label badge */}
            {visitor.label === "vip" && (
              <div className="text-center mt-3">
                <span
                  className="px-4 py-1.5 rounded-full text-sm font-bold"
                  style={{
                    background: "rgba(245,158,11,0.2)",
                    color: "#f59e0b",
                    border: "1px solid rgba(245,158,11,0.4)",
                  }}
                >
                  ⭐ VIP Ziyaretçi
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-6 py-4 text-center"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-slate-600 text-xs">
              Doğrulandı: {new Date().toLocaleString("tr-TR")}
            </p>
            <p className="text-slate-700 text-xs mt-1">
              Safentry Ziyaretçi Yönetim Sistemi
            </p>
          </div>
        </div>
      )}

      {/* Departed visitor */}
      {visitor && isDeparted && (
        <div
          className="w-full max-w-sm p-8 rounded-3xl text-center"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "2px solid rgba(255,255,255,0.12)",
          }}
        >
          <div className="text-5xl mb-4">🏁</div>
          <h1 className="text-white font-bold text-xl mb-2">{visitor.name}</h1>
          <p className="text-slate-400 text-sm mb-4">Ziyaret tamamlandı</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Giriş</span>
              <span className="text-slate-300">
                {formatTime(visitor.arrivalTime)}
              </span>
            </div>
            {visitor.departureTime && (
              <div className="flex justify-between">
                <span className="text-slate-500">Çıkış</span>
                <span className="text-slate-300">
                  {formatTime(visitor.departureTime)}
                </span>
              </div>
            )}
          </div>
          <p className="text-slate-600 text-xs mt-5">
            Safentry · Ziyaretçi Yönetim Sistemi
          </p>
        </div>
      )}

      {/* Rejected or preregistered */}
      {visitor && !isActive && !isDeparted && (
        <div
          className="w-full max-w-sm p-8 rounded-3xl text-center"
          style={{
            background: "rgba(239,68,68,0.06)",
            border: "2px solid rgba(239,68,68,0.3)",
          }}
        >
          <div className="text-5xl mb-4">🚫</div>
          <h1 className="text-xl font-bold mb-2" style={{ color: "#f87171" }}>
            Giriş Onaylanmadı
          </h1>
          <p className="text-slate-400 text-sm">{visitor.name}</p>
          {visitor.rejectionReason && (
            <p className="text-slate-500 text-xs mt-3">
              Neden: {visitor.rejectionReason}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
