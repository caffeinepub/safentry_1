import React, { useEffect, useState } from "react";
import { toast } from "sonner";

const TURKISH_NAMES = [
  { name: "Ahmet Yılmaz", idNumber: "12345678901" },
  { name: "Fatma Kaya", idNumber: "23456789012" },
  { name: "Mehmet Demir", idNumber: "34567890123" },
  { name: "Ayşe Çelik", idNumber: "45678901234" },
  { name: "Ali Şahin", idNumber: "56789012345" },
  { name: "Zeynep Arslan", idNumber: "67890123456" },
  { name: "Mustafa Koç", idNumber: "78901234567" },
  { name: "Emine Doğan", idNumber: "89012345678" },
  { name: "Hüseyin Yıldız", idNumber: "90123456789" },
  { name: "Hatice Öztürk", idNumber: "10234567890" },
];

interface Props {
  onFill: (name: string, idNumber: string) => void;
  onClose: () => void;
}

export default function OcrScanModal({ onFill, onClose }: Props) {
  const [phase, setPhase] = useState<"scanning" | "done">("scanning");
  const [scanLine, setScanLine] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setScanLine((p) => (p + 2) % 100);
    }, 30);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setPhase("done");
      const pick =
        TURKISH_NAMES[Math.floor(Math.random() * TURKISH_NAMES.length)];
      setTimeout(() => {
        onFill(pick.name, pick.idNumber);
        toast.success("✅ Kimlik başarıyla tarandı ve bilgiler dolduruldu");
        onClose();
      }, 800);
    }, 2500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onFill, onClose]);

  return (
    <div
      data-ocid="ocr.modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: "#0d1526",
          border: "1.5px solid rgba(14,165,233,0.35)",
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div>
            <h3 className="text-white font-bold text-base">📷 Kimlik Tarama</h3>
            <p className="text-slate-400 text-xs mt-0.5">
              {phase === "scanning"
                ? "Kimlik belgesi algılanıyor..."
                : "Tarama tamamlandı!"}
            </p>
          </div>
          <button
            type="button"
            data-ocid="ocr.modal.close_button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Camera viewport */}
        <div className="px-6 pt-5 pb-2">
          <div
            className="relative rounded-xl overflow-hidden"
            style={{
              height: 220,
              background: "#080f1e",
              border: "1px solid rgba(14,165,233,0.2)",
            }}
          >
            {/* Corner guides */}
            {[
              { pos: "top-2 left-2", borders: "border-t border-l" },
              { pos: "top-2 right-2", borders: "border-t border-r" },
              { pos: "bottom-2 left-2", borders: "border-b border-l" },
              { pos: "bottom-2 right-2", borders: "border-b border-r" },
            ].map(({ pos, borders }) => (
              <div
                key={pos}
                className={`absolute w-5 h-5 ${pos} ${borders} border-[#0ea5e9]`}
                style={{ borderWidth: 2 }}
              />
            ))}

            {/* Card outline */}
            <div
              className="absolute rounded-lg"
              style={{
                top: "15%",
                left: "10%",
                right: "10%",
                bottom: "15%",
                border:
                  phase === "scanning"
                    ? "1px dashed rgba(14,165,233,0.4)"
                    : "1px solid rgba(34,197,94,0.7)",
                background:
                  phase === "done" ? "rgba(34,197,94,0.05)" : "transparent",
                transition: "border 0.3s, background 0.3s",
              }}
            >
              {phase === "done" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl">✅</span>
                </div>
              )}
            </div>

            {/* Scanning line animation */}
            {phase === "scanning" && (
              <div
                className="absolute left-0 right-0 h-px"
                style={{
                  top: `${scanLine}%`,
                  background:
                    "linear-gradient(90deg, transparent, #0ea5e9, transparent)",
                  boxShadow: "0 0 8px #0ea5e9",
                }}
              />
            )}

            {/* Status text */}
            <div className="absolute bottom-3 left-0 right-0 text-center">
              <span
                className="text-xs font-medium px-3 py-1 rounded-full"
                style={{
                  background:
                    phase === "scanning"
                      ? "rgba(14,165,233,0.2)"
                      : "rgba(34,197,94,0.2)",
                  color: phase === "scanning" ? "#7dd3fc" : "#86efac",
                  border: `1px solid ${phase === "scanning" ? "rgba(14,165,233,0.3)" : "rgba(34,197,94,0.3)"}`,
                }}
              >
                {phase === "scanning" ? "🔍 Taranıyor..." : "✓ Algılandı"}
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-6 pb-5 pt-3">
          <div
            className="h-1.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: phase === "scanning" ? `${scanLine}%` : "100%",
                background:
                  phase === "done"
                    ? "#22c55e"
                    : "linear-gradient(90deg,#0ea5e9,#22d3ee)",
                transition: "width 0.05s linear, background 0.3s",
              }}
            />
          </div>
          <p className="text-slate-500 text-xs text-center mt-3">
            Kimlik belgenizi kameraya tutun veya simülasyonun tamamlanmasını
            bekleyin
          </p>
        </div>
      </div>
    </div>
  );
}
