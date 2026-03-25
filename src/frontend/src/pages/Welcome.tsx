import React from "react";
import type { AppScreen } from "../types";

interface Props {
  onNavigate: (s: AppScreen) => void;
  onRefresh: () => void;
}

export default function Welcome({ onNavigate, onRefresh: _onRefresh }: Props) {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)" }}
    >
      <div className="text-center space-y-6">
        <div className="text-5xl font-bold" style={{ color: "#0ea5e9" }}>
          SAFENTRY
        </div>
        <p className="text-slate-400">
          Şirket veya Personel olarak giriş yapın
        </p>
        <div className="flex gap-4 justify-center">
          <button
            type="button"
            onClick={() => onNavigate("company-login")}
            className="px-6 py-3 rounded-xl text-white font-semibold"
            style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
          >
            Şirket Girişi
          </button>
          <button
            type="button"
            onClick={() => onNavigate("staff-login")}
            className="px-6 py-3 rounded-xl text-white font-semibold"
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            Personel Girişi
          </button>
        </div>
      </div>
    </div>
  );
}
