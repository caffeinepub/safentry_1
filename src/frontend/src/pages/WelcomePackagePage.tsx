import { getCompanies, getStaffByCompany, getVisitors } from "../store";

export default function WelcomePackagePage({
  visitorId,
}: { visitorId: string }) {
  // Find visitor across all companies
  const companies = getCompanies();
  let visitor: any = null;
  let company: any = null;
  for (const c of companies) {
    const v = getVisitors(c.companyId).find((x) => x.visitorId === visitorId);
    if (v) {
      visitor = v;
      company = c;
      break;
    }
  }

  // Find host staff
  let host: any = null;
  if (visitor?.host && company) {
    const staffList = getStaffByCompany(company.companyId);
    host = staffList.find(
      (s) => s.name === visitor.host || s.staffId === visitor.host,
    );
  }

  if (!visitor || !company) {
    return (
      <div
        style={{ minHeight: "100vh", background: "#0f172a" }}
        className="flex items-center justify-center"
      >
        <div className="text-center">
          <div className="text-5xl mb-4">❓</div>
          <p className="text-white font-semibold">
            Karşılama paketi bulunamadı.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ minHeight: "100vh", background: "#0f172a" }}
      className="p-4 flex items-center justify-center"
    >
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20,
        }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div
          className="text-center p-6 border-b"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div className="text-4xl mb-2">🎉</div>
          <h1 className="text-white text-xl font-bold">Hoş Geldiniz!</h1>
          <p className="text-teal-400 font-semibold mt-1">{visitor.name}</p>
          <p className="text-slate-400 text-sm">{company.companyName}</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Host info */}
          {visitor.host && (
            <div
              className="rounded-xl p-4"
              style={{
                background: "rgba(13,148,136,0.12)",
                border: "1px solid rgba(13,148,136,0.3)",
              }}
            >
              <p className="text-teal-400 text-xs font-semibold uppercase tracking-wider mb-2">
                👤 Evsahibiniz
              </p>
              <div className="flex items-center gap-3">
                {host?.profilePhoto ? (
                  <img
                    src={host.profilePhoto}
                    alt={visitor.host}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                    style={{ background: "rgba(13,148,136,0.3)" }}
                  >
                    👤
                  </div>
                )}
                <div>
                  <p className="text-white font-semibold">{visitor.host}</p>
                  {host?.phone && (
                    <p className="text-slate-400 text-sm">{host.phone}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Visit info */}
          <div
            className="rounded-xl p-4"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              📅 Ziyaret Bilgileri
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Giriş Saati</span>
                <span className="text-white">
                  {new Date(visitor.arrivalTime).toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {visitor.visitReason && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Ziyaret Amacı</span>
                  <span className="text-white">{visitor.visitReason}</span>
                </div>
              )}
              {visitor.meetingRoom && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Toplantı Odası</span>
                  <span className="text-white">{visitor.meetingRoom}</span>
                </div>
              )}
              {visitor.assignedParking && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Otopark Yeri</span>
                  <span className="text-amber-400 font-mono">
                    {visitor.assignedParking}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* WiFi */}
          {(company.guestWifiSsid || company.wifiPassword) && (
            <div
              className="rounded-xl p-4"
              style={{
                background: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.3)",
              }}
            >
              <p className="text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
                📶 Misafir WiFi
              </p>
              {company.guestWifiSsid && (
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Ağ Adı</span>
                  <span className="text-white font-mono">
                    {company.guestWifiSsid}
                  </span>
                </div>
              )}
              {company.wifiPassword && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Şifre</span>
                  <span className="text-white font-mono">
                    {company.wifiPassword}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Building info */}
          {company.buildingInstructions && (
            <div
              className="rounded-xl p-4"
              style={{
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.3)",
              }}
            >
              <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
                🏢 Bina Talimatları
              </p>
              <p className="text-slate-300 text-sm">
                {company.buildingInstructions}
              </p>
            </div>
          )}

          {/* Access zones */}
          {visitor.allowedZones && visitor.allowedZones.length > 0 && (
            <div
              className="rounded-xl p-4"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                🚪 Erişim Bölgeleri
              </p>
              <div className="flex flex-wrap gap-2">
                {visitor.allowedZones.map((z: string) => (
                  <span
                    key={z}
                    className="px-2 py-1 rounded-full text-xs font-medium text-teal-400"
                    style={{
                      background: "rgba(13,148,136,0.15)",
                      border: "1px solid rgba(13,148,136,0.3)",
                    }}
                  >
                    {z}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-slate-500 text-xs pt-2">
            İyi ziyaretler dileriz 🌟
          </p>
        </div>
      </div>
    </div>
  );
}
