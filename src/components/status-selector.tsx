"use client";

import { cn } from "@/lib/utils";

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
  emoji: string;
  description: string;
  colorClass: string;
}

const statusOptions: StatusOption[] = [
  {
    value: "thriving",
    label: "Thriving",
    emoji: "🌟",
    description: "Great day!",
    colorClass: "bg-status-thriving",
  },
  {
    value: "stable",
    label: "Stable",
    emoji: "💙",
    description: "Normal day",
    colorClass: "bg-status-stable",
  },
  {
    value: "struggling",
    label: "Struggling",
    emoji: "🌧️",
    description: "Hard day",
    colorClass: "bg-status-struggling",
  },
  {
    value: "hospitalized",
    label: "Hospitalized",
    emoji: "🏥",
    description: "In hospital",
    colorClass: "bg-status-hospitalized",
  },
  {
    value: "needsSupport",
    label: "Needs Support",
    emoji: "💜",
    description: "Could use help",
    colorClass: "bg-status-needs-support",
  },
  {
    value: "feather",
    label: "Feather",
    emoji: "🪶",
    description: "Passed away",
    colorClass: "bg-status-feather",
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
    <div className={cn("flex flex-wrap gap-2", compact ? "gap-1" : "gap-2")}>
      {statusOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => onStatusChange(option.value)}
          disabled={disabled}
          className={cn(
            "flex items-center gap-2 rounded-lg border-2 transition-all",
            compact ? "px-2 py-1 text-sm" : "px-3 py-2",
            currentStatus === option.value
              ? "border-primary bg-primary/10"
              : "border-transparent bg-muted hover:bg-muted/80",
            disabled && "cursor-not-allowed opacity-50"
          )}
          title={option.description}
        >
          <span className="text-lg">{option.emoji}</span>
          {!compact && <span>{option.label}</span>}
        </button>
      ))}
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

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full text-white",
        option.colorClass,
        sizeClasses[size]
      )}
    >
      <span>{option.emoji}</span>
      {showLabel && <span>{option.label}</span>}
    </span>
  );
}

export function getStatusInfo(status: WarriorStatus): StatusOption | undefined {
  return statusOptions.find((o) => o.value === status);
}
