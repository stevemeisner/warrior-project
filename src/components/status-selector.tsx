"use client";

import { cn } from "@/lib/utils";
import { statusIconMap } from "@/components/icons/status-icons";

export type WarriorStatus =
  | "thriving"
  | "stable"
  | "struggling"
  | "hospitalized"
  | "needsSupport"
  | "feather";

interface StatusOption {
  value: WarriorStatus;
  label: string;
  description: string;
  colorClass: string;
}

const statusOptions: StatusOption[] = [
  {
    value: "thriving",
    label: "Thriving",
    description: "Great day!",
    colorClass: "text-status-thriving",
  },
  {
    value: "stable",
    label: "Stable",
    description: "Normal day",
    colorClass: "text-status-stable",
  },
  {
    value: "struggling",
    label: "Struggling",
    description: "Hard day",
    colorClass: "text-status-struggling",
  },
  {
    value: "hospitalized",
    label: "Hospitalized",
    description: "In hospital",
    colorClass: "text-status-hospitalized",
  },
  {
    value: "needsSupport",
    label: "Needs Support",
    description: "Could use help",
    colorClass: "text-status-needs-support",
  },
  {
    value: "feather",
    label: "Feather",
    description: "Passed away",
    colorClass: "text-status-feather",
  },
];

interface StatusSelectorProps {
  currentStatus: WarriorStatus;
  onStatusChange: (status: WarriorStatus) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function StatusSelector({
  currentStatus,
  onStatusChange,
  disabled = false,
  compact = false,
}: StatusSelectorProps) {
  return (
    <div className={cn("flex flex-wrap", compact ? "gap-1.5" : "gap-2")}>
      {statusOptions.map((option) => {
        const Icon = statusIconMap[option.value];
        return (
          <button
            key={option.value}
            onClick={() => onStatusChange(option.value)}
            disabled={disabled}
            aria-pressed={currentStatus === option.value}
            aria-label={`${option.label}: ${option.description}`}
            className={cn(
              "flex items-center gap-2 rounded-xl border-2 transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              compact ? "px-3 py-2 text-sm" : "px-4 py-3",
              "min-h-[44px]",
              currentStatus === option.value
                ? "border-primary bg-primary/10"
                : "border-transparent bg-muted hover:bg-muted/80",
              disabled && "cursor-not-allowed opacity-50"
            )}
            title={option.description}
          >
            <Icon className={cn("size-5", option.colorClass)} />
            {!compact && <span className="font-medium">{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

interface StatusBadgeProps {
  status: WarriorStatus;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function StatusBadge({
  status,
  showLabel = true,
  size = "md",
}: StatusBadgeProps) {
  const option = statusOptions.find((o) => o.value === status);
  if (!option) return null;

  const Icon = statusIconMap[status];

  const sizeClasses = {
    sm: "text-xs px-2.5 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  const iconSizes = {
    sm: "size-3.5",
    md: "size-4",
    lg: "size-5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        sizeClasses[size]
      )}
      style={{
        background: `linear-gradient(135deg, var(--status-${status === "needsSupport" ? "needs-support" : status}) / 0.1, var(--status-${status === "needsSupport" ? "needs-support" : status}) / 0.18)`,
        color: `var(--status-${status === "needsSupport" ? "needs-support" : status})`,
      }}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && <span>{option.label}</span>}
      {!showLabel && <span className="sr-only">{option.label}</span>}
    </span>
  );
}

export function getStatusInfo(status: WarriorStatus): StatusOption | undefined {
  return statusOptions.find((o) => o.value === status);
}
