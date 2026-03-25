import React, { useState } from "react";

interface VehicleWait {
  id: string;
  visitorName: string;
  plate: string;
  phone: string;
  host: string;
  parkingSpot: string;
  waitSince: string;
  status: "waiting" | "called" | "entered";
  note: string;
}

const STORAGE_KEY = (cid: string) => `safentry_vehiclewaiting_${cid}`;

function load(cid: string): VehicleWait[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY(cid)) || "[]");
  } catch {
    return [];
  }
}

function save(cid: string, data: VehicleWait[]) {
  localStorage.setItem(STORAGE_KEY(cid), JSON.stringify(data));
}

export default function VehicleWaitingTab({
  companyId,
}: { companyId: string }) {
  const [records, setRecords] = useState<VehicleWait[]>(() => load(companyId));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    visitorName: "",
    plate: "",
    phone: "",
    host: "",
    parkingSpot: "",
    note: "",
  });
  const [callMsg, setCallMsg] = useState<string | null>(null);

  function addRecord() {
    if (!form.visitorName || !form.plate) return;
    const newRec: VehicleWait = {
      id: Date.now().toString(),
      ...form,
      waitSince: new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "waiting",
    };
    const updated = [newRec, ...records];
    setRecords(updated);
    save(companyId, updated);
    setForm({
      visitorName: "",
      plate: "",
      phone: "",
      host: "",
      parkingSpot: "",
      note: "",
    });
    setShowForm(false);
  }

  function callIn(id: string) {
    const updated = records.map((r) =>
      r.id === id ? { ...r, status: "called" as const } : r,
    );
    setRecords(updated);
    save(companyId, updated);
    const rec = records.find((r) => r.id === id);
    if (rec)
      setCallMsg(
        `${rec.visitorName} çağrıldı. Bilet ekranında bildirim gösterildi.`,
      );
    setTimeout(() => setCallMsg(null), 3000);
  }

  function markEntered(id: string) {
    const updated = records.map((r) =>
      r.id === id ? { ...r, status: "entered" as const } : r,
    );
    setRecords(updated);
    save(companyId, updated);
  }

  function remove(id: string) {
    const updated = records.filter((r) => r.id !== id);
    setRecords(updated);
    save(companyId, updated);
  }

  const statusColor = (s: VehicleWait["status"]) => {
    if (s === "waiting")
      return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    if (s === "called")
      return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    return "bg-green-500/20 text-green-300 border-green-500/30";
  };
  const statusLabel = (s: VehicleWait["status"]) => {
    if (s === "waiting") return "🚗 Araçta Bekliyor";
    if (s === "called") return "📢 Çağrıldı";
    return "✅ Girdi";
  };

  const waiting = records.filter((r) => r.status === "waiting").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">
            🚗 Araçta Bekleme Modu
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Ziyaretçi araçta bekliyor kaydı yapın; hazır olduğunda çağırın.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl font-semibold text-white text-sm"
          style={{ background: "linear-gradient(135deg, #0ea5e9, #6366f1)" }}
        >
          + Yeni Kayıt
        </button>
      </div>

      {callMsg && (
        <div
          className="p-3 rounded-xl text-sm font-medium text-white"
          style={{
            background: "rgba(14,165,233,0.2)",
            border: "1px solid rgba(14,165,233,0.4)",
          }}
        >
          📢 {callMsg}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div
          className="p-4 rounded-2xl text-center"
          style={{
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          <div className="text-3xl font-bold text-amber-400">{waiting}</div>
          <div className="text-slate-400 text-sm mt-1">Araçta Bekleyen</div>
        </div>
        <div
          className="p-4 rounded-2xl text-center"
          style={{
            background: "rgba(14,165,233,0.1)",
            border: "1px solid rgba(14,165,233,0.2)",
          }}
        >
          <div className="text-3xl font-bold text-sky-400">
            {records.filter((r) => r.status === "called").length}
          </div>
          <div className="text-slate-400 text-sm mt-1">Çağrılan</div>
        </div>
      </div>

      {showForm && (
        <div
          className="p-5 rounded-2xl space-y-3"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <h3 className="text-white font-semibold">Araç Bekleme Kaydı</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["visitorName", "Ziyaretçi Adı *"],
              ["plate", "Plaka *"],
              ["phone", "Telefon"],
              ["host", "Ev Sahibi Personel"],
              ["parkingSpot", "Park Yeri"],
              ["note", "Not"],
            ].map(([key, label]) => (
              <div key={key}>
                <span className="text-slate-400 text-xs block mb-1">
                  {label}
                </span>
                <input
                  className="w-full px-3 py-2 rounded-lg text-white text-sm"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={addRecord}
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
              style={{
                background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
              }}
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-slate-300 text-sm"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              İptal
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {records.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <div className="text-4xl mb-3">🚗</div>
            <p>Henüz araçta bekleyen ziyaretçi yok</p>
          </div>
        ) : (
          records.map((rec) => (
            <div
              key={rec.id}
              className="p-4 rounded-2xl flex flex-col md:flex-row md:items-center gap-3"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold">
                    {rec.visitorName}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs border ${statusColor(rec.status)}`}
                  >
                    {statusLabel(rec.status)}
                  </span>
                </div>
                <div className="text-slate-400 text-sm flex gap-4 flex-wrap">
                  <span>🚘 {rec.plate}</span>
                  {rec.host && <span>👤 {rec.host}</span>}
                  {rec.parkingSpot && <span>📍 {rec.parkingSpot}</span>}
                  {rec.phone && <span>📞 {rec.phone}</span>}
                  <span>⏱ {rec.waitSince}'dan beri</span>
                </div>
                {rec.note && (
                  <div className="text-slate-500 text-xs italic">
                    {rec.note}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {rec.status === "waiting" && (
                  <button
                    type="button"
                    onClick={() => callIn(rec.id)}
                    className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold"
                    style={{
                      background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
                    }}
                  >
                    📢 Çağır
                  </button>
                )}
                {rec.status === "called" && (
                  <button
                    type="button"
                    onClick={() => markEntered(rec.id)}
                    className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold"
                    style={{
                      background: "linear-gradient(135deg, #22c55e, #16a34a)",
                    }}
                  >
                    ✅ Girdi
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(rec.id)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 text-xs"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                >
                  Sil
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
