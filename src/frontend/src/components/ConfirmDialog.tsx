import React from "react";

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
}

export default function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = "Onayla",
  cancelLabel = "İptal",
  variant = "warning",
}: ConfirmDialogProps) {
  if (!open) return null;

  const isDanger = variant === "danger";
  const borderColor = isDanger ? "rgba(239,68,68,0.4)" : "rgba(245,158,11,0.4)";
  const bgColor = isDanger ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)";
  const gradientBtn = isDanger
    ? "linear-gradient(135deg,#ef4444,#dc2626)"
    : "linear-gradient(135deg,#f59e0b,#d97706)";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-sm p-6 rounded-2xl space-y-4"
        style={{
          background: "#0f1729",
          border: `1.5px solid ${borderColor}`,
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)",
        }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
          style={{ background: bgColor, border: `1px solid ${borderColor}` }}
        >
          <span className="text-2xl">{isDanger ? "🗑️" : "⚠️"}</span>
        </div>

        <div className="text-center space-y-2">
          <h3
            id="confirm-dialog-title"
            className="text-white font-bold text-base"
          >
            {title}
          </h3>
          {description && (
            <p className="text-slate-400 text-sm">{description}</p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            data-ocid="confirm_dialog.cancel_button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-300 transition-all hover:bg-white/10"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            data-ocid="confirm_dialog.confirm_button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
            style={{ background: gradientBtn }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
