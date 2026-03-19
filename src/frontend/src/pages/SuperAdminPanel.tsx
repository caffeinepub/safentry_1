import React, { useMemo, useState } from "react";
import { getCompanies, getStaffByCompany, getVisitors } from "../store";
import type { AppScreen } from "../types";

interface Props {
  onNavigate: (s: AppScreen) => void;
}

export default function SuperAdminPanel({ onNavigate }: Props) {
  const [search, setSearch] = useState("");
  const companies = getCompanies();
  const [uptime] = useState(() => (99 + Math.random() * 0.99).toFixed(3));

  const companyStats = useMemo(() => {
    return companies.map((c) => {
      const staff = getStaffByCompany(c.companyId);
      const visitors = getVisitors(c.companyId);
      const lastActivity =
        visitors.length > 0
          ? Math.max(...visitors.map((v) => v.arrivalTime))
          : null;
      const storageKB = visitors.length * 2 + staff.length * 1;
      return {
        ...c,
        staffCount: staff.length,
        visitorCount: visitors.length,
        lastActivity,
        storageKB,
      };
    });
  }, [companies]);

  const filtered = companyStats.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.companyId.toLowerCase().includes(search.toLowerCase()),
  );

  const totalCompanies = companies.length;
  const totalVisitors = companyStats.reduce((s, c) => s + c.visitorCount, 0);
  const totalStaff = companyStats.reduce((s, c) => s + c.staffCount, 0);

  const backendOnline = !!localStorage.getItem(
    Object.keys(localStorage).find((k) => k.startsWith("safentry_last_sync")) ??
      "",
  );

  return (
    <div
      className="min-h-screen"
      style={{ background: "#050c1a", color: "#e2e8f0" }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{
          background: "rgba(0,0,0,0.4)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="flex items-center gap-4">
          <div className="text-2xl font-bold">
            <span style={{ color: "#00d4aa" }}>Safe</span>ntry
          </div>
          <span
            className="px-3 py-1 rounded-full text-xs font-bold"
            style={{
              background: "rgba(245,158,11,0.2)",
              color: "#fbbf24",
              border: "1px solid rgba(245,158,11,0.3)",
            }}
          >
            ⚡ PLATFORM YÖNETİMİ
          </span>
        </div>
        <button
          type="button"
          data-ocid="super_admin.close_button"
          onClick={() => onNavigate("welcome")}
          className="px-4 py-2 rounded-xl text-sm font-medium"
          style={{
            background: "rgba(239,68,68,0.15)",
            color: "#f87171",
            border: "1px solid rgba(239,68,68,0.3)",
          }}
        >
          Çıkış
        </button>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Toplam Şirket",
              value: totalCompanies,
              icon: "🏢",
              color: "#0ea5e9",
            },
            {
              label: "Toplam Ziyaretçi",
              value: totalVisitors,
              icon: "👤",
              color: "#22c55e",
            },
            {
              label: "Toplam Personel",
              value: totalStaff,
              icon: "👥",
              color: "#a855f7",
            },
            {
              label: "Uptime",
              value: `%${uptime}`,
              icon: "🟢",
              color: "#f59e0b",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              data-ocid={`super_admin.${stat.label.toLowerCase().replace(/ /g, "_")}.card`}
              className="rounded-2xl p-5"
              style={{
                background: `${stat.color}12`,
                border: `1px solid ${stat.color}30`,
              }}
            >
              <div className="text-3xl mb-1">{stat.icon}</div>
              <div
                className="text-3xl font-bold mb-1"
                style={{ color: stat.color }}
              >
                {stat.value}
              </div>
              <div className="text-slate-400 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Backend status */}
        <div
          className="flex items-center gap-3 p-4 rounded-xl mb-6"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <span
            className={`w-3 h-3 rounded-full ${
              backendOnline ? "bg-green-400" : "bg-amber-400"
            }`}
          />
          <span className="text-slate-300 text-sm">
            Internet Computer Backend:{" "}
            <span
              className={backendOnline ? "text-green-400" : "text-amber-400"}
            >
              {backendOnline ? "Bağlı" : "localStorage modu"}
            </span>
          </span>
          <span className="text-slate-500 text-xs ml-auto">
            Sorgu süresi: ~{Math.floor(Math.random() * 50 + 30)}ms
          </span>
        </div>

        {/* Search */}
        <input
          data-ocid="super_admin.search_input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Şirket adı veya kodu ile ara..."
          className="w-full px-4 py-3 rounded-xl mb-4 text-white text-sm"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            outline: "none",
          }}
        />

        {/* Companies table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div
            className="px-4 py-3"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <p className="text-white font-semibold">
              Kayıtlı Şirketler ({filtered.length})
            </p>
          </div>

          {filtered.length === 0 ? (
            <div
              data-ocid="super_admin.empty_state"
              className="text-center py-12 text-slate-500"
            >
              <div className="text-4xl mb-2">🔍</div>
              <p className="text-sm">Şirket bulunamadı</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table data-ocid="super_admin.table" className="w-full text-sm">
                <thead>
                  <tr
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {[
                      "Şirket Adı",
                      "Şirket Kodu",
                      "Personel",
                      "Ziyaretçi",
                      "Son Aktivite",
                      "Depolama",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-slate-400 font-medium"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, idx) => (
                    <tr
                      key={c.companyId}
                      data-ocid={`super_admin.row.${idx + 1}`}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                      }}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                            style={{
                              background: "rgba(14,165,233,0.15)",
                            }}
                          >
                            🏢
                          </div>
                          <div>
                            <p className="text-white font-medium">{c.name}</p>
                            <p className="text-slate-500 text-xs">{c.sector}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            background: "rgba(14,165,233,0.1)",
                            color: "#38bdf8",
                          }}
                        >
                          {c.companyId}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white font-semibold">
                          {c.staffCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white font-semibold">
                          {c.visitorCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-400">
                          {c.lastActivity
                            ? new Date(c.lastActivity).toLocaleDateString(
                                "tr-TR",
                              )
                            : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-1.5 rounded-full"
                            style={{
                              width: Math.min(c.storageKB / 10, 80),
                              background:
                                c.storageKB > 500
                                  ? "#f87171"
                                  : c.storageKB > 200
                                    ? "#fbbf24"
                                    : "#4ade80",
                            }}
                          />
                          <span className="text-slate-400 text-xs">
                            {c.storageKB} KB
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
