import React, { useState } from "react";

interface ValidationCode {
  id: string;
  visitorName: string;
  plate: string;
  code: string;
  generatedAt: string;
  type: "free" | "discount50" | "discount25";
  used: boolean;
  usedAt?: string;
}

interface Props {
  companyId: string;
}

const STORAGE_KEY = (cid: string) => `parkingValidations_${cid}`;

function load(companyId: string): ValidationCode[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY(companyId)) || "[]");
  } catch {
    return [];
  }
}

function save(companyId: string, data: ValidationCode[]) {
  localStorage.setItem(STORAGE_KEY(companyId), JSON.stringify(data));
}

function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function ParkingValidationTab({ companyId }: Props) {
  const [codes, setCodes] = useState<ValidationCode[]>(() => load(companyId));
  const [showForm, setShowForm] = useState(false);
  const [visitorName, setVisitorName] = useState("");
  const [plate, setPlate] = useState("");
  const [type, setType] = useState<"free" | "discount50" | "discount25">(
    "free",
  );
  const [searchCode, setSearchCode] = useState("");
  const [searchResult, setSearchResult] = useState<
    ValidationCode | null | "not_found"
  >(null);

  const typeLabels: Record<string, string> = {
    free: "Ücretsiz",
    discount50: "%50 İndirimli",
    discount25: "%25 İndirimli",
  };
  const typeColors: Record<string, string> = {
    free: "text-emerald-400 bg-emerald-900/30 border-emerald-700",
    discount50: "text-amber-400 bg-amber-900/30 border-amber-700",
    discount25: "text-sky-400 bg-sky-900/30 border-sky-700",
  };

  function generate() {
    if (!visitorName.trim()) return;
    const newCode: ValidationCode = {
      id: Date.now().toString(),
      visitorName: visitorName.trim(),
      plate: plate.trim().toUpperCase(),
      code: genCode(),
      generatedAt: new Date().toISOString(),
      type,
      used: false,
    };
    const updated = [newCode, ...codes];
    setCodes(updated);
    save(companyId, updated);
    setVisitorName("");
    setPlate("");
    setShowForm(false);
  }

  function markUsed(id: string) {
    const updated = codes.map((c) =>
      c.id === id ? { ...c, used: true, usedAt: new Date().toISOString() } : c,
    );
    setCodes(updated);
    save(companyId, updated);
  }

  function deleteCode(id: string) {
    const updated = codes.filter((c) => c.id !== id);
    setCodes(updated);
    save(companyId, updated);
  }

  function lookup() {
    const found = codes.find((c) => c.code === searchCode.trim().toUpperCase());
    setSearchResult(found ?? "not_found");
  }

  const active = codes.filter((c) => !c.used);
  const used = codes.filter((c) => c.used);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">🅿️ Otopark Doğrulama</h2>
          <p className="text-slate-400 text-sm mt-1">
            Ziyaretçilere otopark muafiyeti veya indirim kodu üretin
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl text-sm font-medium"
          style={{
            background: "linear-gradient(135deg,#0ea5e9,#6366f1)",
            color: "#fff",
          }}
        >
          + Yeni Kod Üret
        </button>
      </div>

      {/* Lookup */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{
          background: "rgba(14,165,233,0.06)",
          border: "1px solid rgba(14,165,233,0.2)",
        }}
      >
        <p className="text-slate-300 text-sm font-medium">
          🔍 Kod Sorgulama (Otopark Görevlisi için)
        </p>
        <div className="flex gap-2">
          <input
            value={searchCode}
            onChange={(e) => {
              setSearchCode(e.target.value);
              setSearchResult(null);
            }}
            placeholder="Kod girin (ör. AB12CD)"
            className="flex-1 px-3 py-2 rounded-lg text-sm text-white"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
            onKeyDown={(e) => e.key === "Enter" && lookup()}
          />
          <button
            type="button"
            onClick={lookup}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-sky-600 hover:bg-sky-700 text-white"
          >
            Sorgula
          </button>
        </div>
        {searchResult === "not_found" && (
          <p className="text-red-400 text-sm">
            ❌ Kod bulunamadı veya geçersiz
          </p>
        )}
        {searchResult && searchResult !== "not_found" && (
          <div
            className="rounded-lg p-3 space-y-1"
            style={{
              background: searchResult.used
                ? "rgba(239,68,68,0.08)"
                : "rgba(16,185,129,0.08)",
              border: `1px solid ${searchResult.used ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
            }}
          >
            <p className="text-white font-semibold">
              {searchResult.visitorName}
            </p>
            {searchResult.plate && (
              <p className="text-slate-300 text-sm">
                Plaka: {searchResult.plate}
              </p>
            )}
            <p className="text-sm">
              <span
                className={`px-2 py-0.5 rounded-full text-xs border ${typeColors[searchResult.type]}`}
              >
                {typeLabels[searchResult.type]}
              </span>
            </p>
            {searchResult.used ? (
              <p className="text-red-400 text-sm">
                ⛔ Bu kod zaten kullanıldı (
                {new Date(searchResult.usedAt!).toLocaleString("tr-TR")})
              </p>
            ) : (
              <div className="flex gap-2 mt-2">
                <p className="text-emerald-400 text-sm flex-1">
                  ✅ Kod geçerli, kullanılmadı
                </p>
                <button
                  type="button"
                  onClick={() => {
                    markUsed(searchResult.id);
                    setSearchResult({
                      ...searchResult,
                      used: true,
                      usedAt: new Date().toISOString(),
                    });
                  }}
                  className="px-3 py-1 rounded-lg text-xs bg-emerald-700 hover:bg-emerald-600 text-white"
                >
                  Kullanıldı Olarak İşaretle
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.3)",
          }}
        >
          <p className="text-white font-medium">Yeni Doğrulama Kodu</p>
          <input
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
            placeholder="Ziyaretçi adı *"
            className="w-full px-3 py-2 rounded-lg text-sm text-white"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          />
          <input
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            placeholder="Araç plakası (opsiyonel)"
            className="w-full px-3 py-2 rounded-lg text-sm text-white"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          />
          <div className="flex gap-2">
            {(["free", "discount50", "discount25"] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${type === t ? typeColors[t] : "text-slate-400 border-slate-600"}`}
              >
                {typeLabels[t]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={generate}
              className="flex-1 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Kod Üret
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Active Codes */}
      <div>
        <p className="text-slate-300 text-sm font-medium mb-3">
          Aktif Kodlar ({active.length})
        </p>
        {active.length === 0 ? (
          <p className="text-slate-500 text-sm">Aktif doğrulama kodu yok</p>
        ) : (
          <div className="grid gap-3">
            {active.map((c) => (
              <div
                key={c.id}
                className="rounded-xl p-4 flex items-center justify-between"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div className="space-y-1">
                  <p className="text-white font-medium">{c.visitorName}</p>
                  {c.plate && (
                    <p className="text-slate-400 text-xs">🚗 {c.plate}</p>
                  )}
                  <p className="text-slate-400 text-xs">
                    {new Date(c.generatedAt).toLocaleString("tr-TR")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-bold border ${typeColors[c.type]}`}
                  >
                    {typeLabels[c.type]}
                  </span>
                  <div className="text-center">
                    <div className="text-2xl font-mono font-bold text-white tracking-widest">
                      {c.code}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => markUsed(c.id)}
                      className="px-2 py-1 rounded text-xs bg-emerald-800 hover:bg-emerald-700 text-emerald-300"
                    >
                      Kullanıldı
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCode(c.id)}
                      className="px-2 py-1 rounded text-xs bg-red-900/40 hover:bg-red-800/60 text-red-400"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Used Codes */}
      {used.length > 0 && (
        <div>
          <p className="text-slate-400 text-sm font-medium mb-3">
            Kullanılmış Kodlar ({used.length})
          </p>
          <div className="space-y-2">
            {used.slice(0, 10).map((c) => (
              <div
                key={c.id}
                className="rounded-lg px-4 py-3 flex items-center justify-between opacity-50"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div>
                  <p className="text-slate-300 text-sm">{c.visitorName}</p>
                  {c.plate && (
                    <p className="text-slate-500 text-xs">🚗 {c.plate}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-slate-400 font-mono text-sm">{c.code}</p>
                  <p className="text-slate-500 text-xs">
                    {c.usedAt ? new Date(c.usedAt).toLocaleString("tr-TR") : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
