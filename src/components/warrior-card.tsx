"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusSelector, StatusBadge, WarriorStatus } from "./status-selector";
import { cn } from "@/lib/utils";

interface Warrior {
  _id: string;
  name: string;
  currentStatus: WarriorStatus;
  profilePhoto?: string;
  condition?: string;
  isFeather: boolean;
}

interface WarriorCardProps {
  warrior: Warrior;
  onStatusChange?: (warriorId: string, status: WarriorStatus) => void;
  canEdit?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export function WarriorCard({
  warrior,
  onStatusChange,
  canEdit = false,
  onClick,
  compact = false,
}: WarriorCardProps) {
  const initials = warrior.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleStatusChange = (status: WarriorStatus) => {
    if (onStatusChange) {
      onStatusChange(warrior._id, status);
    }
  };

  return (
    <Card
      className={cn(
        "rounded-2xl border-0 shadow-[0_1px_4px_rgba(0,0,0,0.03),0_4px_16px_rgba(26,122,106,0.06)] card-hover",
        onClick && "cursor-pointer",
        warrior.isFeather && "opacity-75"
      )}
      onClick={onClick}
    >
      <CardHeader className={cn("flex flex-row items-center gap-4", compact && "pb-2")}>
        <Avatar className={compact ? "h-10 w-10" : "h-16 w-16"}>
          <AvatarImage src={warrior.profilePhoto} alt={warrior.name} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className={cn("font-heading font-semibold", compact ? "text-base" : "text-lg")}>
            {warrior.name}
          </h3>
          {warrior.condition && !compact && (
            <p className="text-sm text-muted-foreground">{warrior.condition}</p>
          )}
          <div className="mt-1">
            <StatusBadge status={warrior.currentStatus} size={compact ? "sm" : "md"} />
          </div>
        </div>
      </CardHeader>
      {canEdit && !compact && (
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Quick status update:
            </p>
            <StatusSelector
              currentStatus={warrior.currentStatus}
              onStatusChange={handleStatusChange}
              compact
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}

interface WarriorListProps {
  warriors: Warrior[];
  onStatusChange?: (warriorId: string, status: WarriorStatus) => void;
  onWarriorClick?: (warrior: Warrior) => void;
  canEdit?: boolean;
  compact?: boolean;
}

export function WarriorList({
  warriors,
  onStatusChange,
  onWarriorClick,
  canEdit = false,
  compact = false,
}: WarriorListProps) {
  if (warriors.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No warriors yet.</p>
        <p className="text-sm mt-1">Add your first warrior to get started.</p>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4", compact ? "grid-cols-1" : "md:grid-cols-2 lg:grid-cols-3")}>
      {warriors.map((warrior) => (
        <WarriorCard
          key={warrior._id}
          warrior={warrior}
          onStatusChange={onStatusChange}
          canEdit={canEdit}
          onClick={onWarriorClick ? () => onWarriorClick(warrior) : undefined}
          compact={compact}
        />
      ))}
    </div>
  );
}
