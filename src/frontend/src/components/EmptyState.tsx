import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  "data-ocid"?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  "data-ocid": dataOcid,
}: EmptyStateProps) {
  return (
    <div
      data-ocid={dataOcid}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div
        className="mb-4 flex items-center justify-center w-14 h-14 rounded-2xl"
        style={{
          background: "rgba(20,184,166,0.12)",
          border: "1px solid rgba(20,184,166,0.25)",
        }}
      >
        <Icon className="w-7 h-7" style={{ color: "#14b8a6" }} />
      </div>
      <h3 className="text-white font-semibold text-base mb-1">{title}</h3>
      {description && (
        <p className="text-slate-500 text-sm max-w-xs mb-4">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button
          size="sm"
          onClick={onAction}
          className="mt-1"
          style={{
            background: "rgba(20,184,166,0.2)",
            border: "1px solid rgba(20,184,166,0.4)",
            color: "#14b8a6",
          }}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
