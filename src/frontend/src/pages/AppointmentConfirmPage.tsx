import { useEffect, useState } from "react";
import {
  findCompanyById,
  getAppointments,
  getCompanies,
  getStaffPhoto,
} from "../store";
import type { AppScreen, Appointment } from "../types";

interface Props {
  token: string;
  onNavigate: (s: AppScreen) => void;
}

export default function AppointmentConfirmPage({ token, onNavigate }: Props) {
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");
  const [hostPhoto, setHostPhoto] = useState("");

  useEffect(() => {
    try {
      const decoded = atob(token);
      // decoded is appointment id
      const companies = getCompanies();
      for (const c of companies) {
        const found = getAppointments(c.companyId).find(
          (a) => a.id === decoded,
        );
        if (found) {
          setAppt(found);
          const co = findCompanyById(c.companyId);
          setCompanyName(co?.name ?? "");
          if (found.hostStaffId) {
            setHostPhoto(getStaffPhoto(found.hostStaffId));
          }
          return;
        }
      }
      setError("Randevu bulunamadı veya bağlantı geçersiz.");
    } catch {
      setError("Geçersiz bağlantı.");
    }
  }, [token]);

  const statusLabel = (s: Appointment["status"]) => {
    if (s === "approved") return { text: "✅ Onaylandı", color: "#22c55e" };
    if (s === "cancelled") return { text: "❌ İptal Edildi", color: "#ef4444" };
    return { text: "⏳ Beklemede", color: "#f59e0b" };
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "#0a0f1e" }}
    >
      <div
        className="w-full max-w-md rounded-3xl p-8"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1.5px solid rgba(14,165,233,0.25)",
        }}
      >
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">📅</div>
          <h1 className="text-2xl font-bold text-white">
            <span style={{ color: "#0ea5e9" }}>Safe</span>ntry
          </h1>
          <p className="text-slate-400 text-sm mt-1">Randevu Onay Belgesi</p>
        </div>

        {error ? (
          <div data-ocid="confirm.error_state" className="text-center py-8">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-red-400">{error}</p>
            <button
              type="button"
              data-ocid="confirm.back_button"
              onClick={() => onNavigate("welcome")}
              className="mt-4 px-6 py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-colors"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              Ana Sayfa
            </button>
          </div>
        ) : appt ? (
          <div data-ocid="confirm.panel" className="space-y-4">
            {/* Status */}
            <div className="text-center mb-2">
              <span
                className="px-4 py-1.5 rounded-full text-sm font-semibold"
                style={{
                  background: `${statusLabel(appt.status).color}22`,
                  color: statusLabel(appt.status).color,
                  border: `1px solid ${statusLabel(appt.status).color}44`,
                }}
              >
                {statusLabel(appt.status).text}
              </span>
            </div>

            {companyName && <Row label="Şirket" value={companyName} />}
            <Row label="Ziyaretçi" value={appt.visitorName} />
            <div
              className="flex items-center justify-between py-2"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <span className="text-slate-500 text-sm shrink-0">Ev Sahibi</span>
              <div className="flex items-center gap-2">
                {hostPhoto && (
                  <img
                    src={hostPhoto}
                    alt="Host"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
                <span className="text-white text-sm">{appt.hostName}</span>
              </div>
            </div>
            <Row label="Tarih" value={appt.appointmentDate} />
            <Row label="Saat" value={appt.appointmentTime} />
            <Row label="Amaç" value={appt.purpose} />
            {appt.notes && <Row label="Notlar" value={appt.notes} />}

            <div
              className="mt-6 p-3 rounded-xl text-center text-xs text-slate-500"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              Bu belge salt okunur doğrulama amaçlıdır.
            </div>
          </div>
        ) : (
          <div data-ocid="confirm.loading_state" className="text-center py-12">
            <div className="text-3xl animate-spin mb-3">⏳</div>
            <p className="text-slate-400 text-sm">Yükleniyor...</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex justify-between items-start gap-3 py-2"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <span className="text-slate-500 text-sm shrink-0">{label}</span>
      <span className="text-white text-sm text-right">{value}</span>
    </div>
  );
}
