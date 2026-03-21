import { useEffect, useState } from "react";

export interface TourStep {
  target: string; // data-tour attribute value or CSS selector
  title: string;
  content: string;
}

interface Props {
  steps: TourStep[];
  onComplete: () => void;
  tourKey: string;
}

function getTourDoneKey(tourKey: string) {
  return `safentry_tour_done_${tourKey}`;
}

export function isTourDone(tourKey: string): boolean {
  return localStorage.getItem(getTourDoneKey(tourKey)) === "1";
}

export default function InteractiveTour({ steps, onComplete, tourKey }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isTourDone(tourKey)) return;
    // Small delay so DOM is ready
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, [tourKey]);

  useEffect(() => {
    if (!visible) return;
    const step = steps[currentStep];
    if (!step) return;
    const el =
      document.querySelector(`[data-tour="${step.target}"]`) ??
      document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setTargetRect(null);
    }
  }, [currentStep, visible, steps]);

  if (!visible) return null;

  const step = steps[currentStep];
  if (!step) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      complete();
    }
  };

  const complete = () => {
    localStorage.setItem(getTourDoneKey(tourKey), "1");
    setVisible(false);
    onComplete();
  };

  return (
    <>
      {/* Dark overlay */}
      <div
        className="fixed inset-0 z-50 pointer-events-none"
        style={{ background: "rgba(0,0,0,0.55)" }}
      />

      {/* Highlight box */}
      {targetRect && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            border: "2.5px solid #0ea5e9",
            borderRadius: 10,
            boxShadow: "0 0 0 4000px rgba(0,0,0,0.5)",
            background: "transparent",
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="fixed z-[60] max-w-sm w-80 p-5 rounded-2xl shadow-2xl"
        style={{
          background: "linear-gradient(135deg,#0f1f3d,#1e3a5f)",
          border: "1.5px solid rgba(14,165,233,0.4)",
          top: targetRect
            ? Math.min(targetRect.bottom + 14, window.innerHeight - 220)
            : window.innerHeight / 2 - 100,
          left: targetRect
            ? Math.min(Math.max(targetRect.left, 12), window.innerWidth - 330)
            : window.innerWidth / 2 - 160,
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-sky-400 font-semibold">
            Adım {currentStep + 1} / {steps.length}
          </span>
          <button
            type="button"
            onClick={complete}
            className="text-slate-400 hover:text-white text-xs transition-colors"
          >
            Atla ✕
          </button>
        </div>
        <p className="text-white font-semibold text-sm mb-1">{step.title}</p>
        <p className="text-slate-300 text-xs leading-relaxed mb-4">
          {step.content}
        </p>
        <div className="flex gap-2">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => s - 1)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              ← Geri
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 px-4 py-1.5 rounded-lg text-xs text-white font-semibold"
            style={{
              background: "linear-gradient(90deg,#0ea5e9,#0284c7)",
            }}
          >
            {currentStep < steps.length - 1 ? "Sonraki →" : "✓ Tamamla"}
          </button>
        </div>
      </div>
    </>
  );
}
