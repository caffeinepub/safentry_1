import React from "react";
import type { AppScreen } from "../types";

interface Props {
  onNavigate: (s: AppScreen) => void;
  onRefresh: () => void;
}

export default function Welcome({ onNavigate, onRefresh: _onRefresh }: Props) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)" }}
    >
      <div className="text-center space-y-8 w-full max-w-sm">
        <div>
          <div className="text-5xl font-bold mb-2" style={{ color: "#0ea5e9" }}>
            SAFENTRY
          </div>
          <p className="text-slate-400 text-sm">
            Kurumsal Ziyaretçi Yönetim Sistemi
          </p>
        </div>

        {/* Giriş */}
        <div
          className="rounded-2xl p-5 space-y-3"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <p className="text-slate-300 text-xs font-semibold uppercase tracking-widest mb-1">
            Giriş Yap
          </p>
          <button
            type="button"
            onClick={() => onNavigate("company-login")}
            className="w-full px-6 py-3 rounded-xl text-white font-semibold transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
          >
            🏢 Şirket Girişi
          </button>
          <button
            type="button"
            onClick={() => onNavigate("staff-login")}
            className="w-full px-6 py-3 rounded-xl text-white font-semibold transition-opacity hover:opacity-90"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            👤 Personel Girişi
          </button>
        </div>

        {/* Kayıt */}
        <div
          className="rounded-2xl p-5 space-y-3"
          style={{
            background: "rgba(16,185,129,0.07)",
            border: "1px solid rgba(16,185,129,0.2)",
          }}
        >
          <p className="text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-1">
            Yeni Kayıt
          </p>
          <button
            type="button"
            onClick={() => onNavigate("company-register")}
            className="w-full px-6 py-3 rounded-xl text-white font-semibold transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}
          >
            🏢 Yeni Şirket Kaydı
          </button>
          <button
            type="button"
            onClick={() => onNavigate("staff-register")}
            className="w-full px-6 py-3 rounded-xl text-white font-semibold transition-opacity hover:opacity-90"
            style={{
              background: "rgba(16,185,129,0.15)",
              border: "1px solid rgba(16,185,129,0.3)",
            }}
          >
            👤 Personel Kaydı
          </button>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("platform-admin" as AppScreen)}
          className="text-slate-600 text-xs hover:text-slate-400 transition-colors"
        >
          Platform Yönetimi
        </button>
      </div>
    </div>
  );
}
