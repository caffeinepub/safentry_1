import { Check, Circle } from "lucide-react";
import type { Visitor } from "../types";
import { formatDateTime } from "../utils";

interface Props {
  visitor: Visitor;
  meetingRoomName?: string;
}

interface Step {
  key: string;
  label: string;
  timestamp?: number | null;
  done: boolean;
  active: boolean;
}

export default function VisitTimeline({ visitor, meetingRoomName }: Props) {
  const steps: Step[] = [
    {
      key: "kiosk",
      label: "Kiosk Girişi",
      timestamp: visitor.createdAt,
      done: true,
      active: false,
    },
    {
      key: "approval",
      label: "Onay Bekleme",
      timestamp: visitor.status !== "preregistered" ? visitor.createdAt : null,
      done: visitor.status !== "preregistered",
      active: visitor.status === "preregistered",
    },
    {
      key: "security",
      label: "Güvenlik Kontrolü",
      timestamp: visitor.arrivalTime,
      done: !!visitor.arrivalTime && visitor.status !== "preregistered",
      active: false,
    },
    {
      key: "entry",
      label: "Giriş",
      timestamp: visitor.arrivalTime,
      done: visitor.status === "active" || visitor.status === "departed",
      active: visitor.status === "active",
    },
    ...(meetingRoomName || visitor.customFieldValues?.meetingRoom
      ? [
          {
            key: "meeting",
            label: `Toplantı: ${meetingRoomName ?? visitor.customFieldValues?.meetingRoom ?? "—"}`,
            timestamp: visitor.arrivalTime,
            done: visitor.status === "active" || visitor.status === "departed",
            active: visitor.status === "active",
          },
        ]
      : []),
    {
      key: "exit",
      label: "Çıkış",
      timestamp: visitor.departureTime ?? null,
      done: visitor.status === "departed",
      active: false,
    },
  ];

  return (
    <div
      data-ocid="visit_timeline.panel"
      className="p-4 rounded-2xl"
      style={{
        background: "rgba(14,165,233,0.04)",
        border: "1px solid rgba(14,165,233,0.15)",
      }}
    >
      <p className="text-slate-400 text-xs uppercase tracking-wide font-semibold mb-4">
        Ziyaret Zaman Çizelgesi
      </p>
      <div className="flex items-start gap-0">
        {steps.map((step, idx) => (
          <div key={step.key} className="flex-1 flex flex-col items-center">
            <div className="flex items-center w-full">
              {idx > 0 && (
                <div
                  className="flex-1 h-0.5 transition-all"
                  style={{
                    background: step.done ? "#0ea5e9" : "rgba(255,255,255,0.1)",
                  }}
                />
              )}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all"
                style={{
                  background: step.done
                    ? "rgba(14,165,233,0.25)"
                    : step.active
                      ? "rgba(245,158,11,0.2)"
                      : "rgba(255,255,255,0.06)",
                  border: step.done
                    ? "2px solid #0ea5e9"
                    : step.active
                      ? "2px solid #f59e0b"
                      : "2px solid rgba(255,255,255,0.15)",
                }}
              >
                {step.done ? (
                  <Check size={12} style={{ color: "#0ea5e9" }} />
                ) : step.active ? (
                  <div
                    className="w-2.5 h-2.5 rounded-full animate-pulse"
                    style={{ background: "#f59e0b" }}
                  />
                ) : (
                  <Circle
                    size={10}
                    style={{ color: "rgba(255,255,255,0.2)" }}
                  />
                )}
              </div>
              {idx < steps.length - 1 && (
                <div
                  className="flex-1 h-0.5 transition-all"
                  style={{
                    background: steps[idx + 1]?.done
                      ? "#0ea5e9"
                      : "rgba(255,255,255,0.1)",
                  }}
                />
              )}
            </div>
            <div className="mt-2 text-center px-1">
              <p
                className="text-xs font-medium leading-tight"
                style={{
                  color: step.done
                    ? "#0ea5e9"
                    : step.active
                      ? "#f59e0b"
                      : "#475569",
                }}
              >
                {step.label}
              </p>
              {step.done && step.timestamp ? (
                <p className="text-slate-600 text-xs mt-0.5">
                  {new Date(step.timestamp).toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {visitor.status === "departed" && visitor.departureTime && (
        <div className="mt-3 pt-3 border-t border-white/5 text-center">
          <span className="text-slate-500 text-xs">
            Toplam süre:{" "}
            <span className="text-slate-300">
              {Math.round(
                (visitor.departureTime - visitor.arrivalTime) / 60000,
              )}{" "}
              dk
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
