"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
  /** Link the name/avatar to the warrior's detail page. */
  linkToDetail?: boolean;
  compact?: boolean;
}

export function WarriorCard({
  warrior,
  onStatusChange,
  canEdit = false,
  linkToDetail = false,
  compact = false,
}: WarriorCardProps) {
  const initials = warrior.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const identity = (
    <>
      <Avatar className={compact ? "h-10 w-10" : "h-16 w-16"}>
        <AvatarImage src={warrior.profilePhoto} alt="" />
        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <h3 className={cn("font-heading font-semibold truncate", compact ? "text-base" : "text-lg")}>
          {warrior.name}
        </h3>
        {warrior.condition && !compact && (
          <p className="text-sm text-muted-foreground truncate">{warrior.condition}</p>
        )}
        <div className="mt-1">
          <StatusBadge status={warrior.currentStatus} size={compact ? "sm" : "md"} />
        </div>
      </div>
      {linkToDetail && (
        <ChevronRight
          className="size-5 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      )}
    </>
  );

  return (
    <Card
      className={cn(
        "rounded-2xl border-0 shadow-[0_1px_4px_rgba(0,0,0,0.03),0_4px_16px_rgba(26,122,106,0.06)]",
        linkToDetail && "card-hover",
        warrior.isFeather && "opacity-75"
      )}
    >
      <CardHeader className={cn(compact && "pb-2")}>
        {linkToDetail ? (
          <Link
            href={`/profile/warrior/${warrior._id}`}
            aria-label={`View ${warrior.name}`}
            className="group flex flex-row items-center gap-4 -m-2 p-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {identity}
          </Link>
        ) : (
          <div className="flex flex-row items-center gap-4">{identity}</div>
        )}
      </CardHeader>
      {canEdit && !compact && onStatusChange && (
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              How is {warrior.name} today?
            </p>
            <StatusSelector
              currentStatus={warrior.currentStatus}
              onStatusChange={(status) => onStatusChange(warrior._id, status)}
              warriorName={warrior.name}
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
  linkToDetail?: boolean;
  canEdit?: boolean;
  compact?: boolean;
  /** One card per row — for lists that already sit inside a narrow column. */
  singleColumn?: boolean;
}

export function WarriorList({
  warriors,
  onStatusChange,
  linkToDetail = false,
  canEdit = false,
  compact = false,
  singleColumn = false,
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
    <div
      className={cn(
        "grid gap-4",
        compact || singleColumn ? "grid-cols-1" : "md:grid-cols-2 lg:grid-cols-3"
      )}
    >
      {warriors.map((warrior) => (
        <WarriorCard
          key={warrior._id}
          warrior={warrior}
          onStatusChange={onStatusChange}
          canEdit={canEdit}
          linkToDetail={linkToDetail}
          compact={compact}
        />
      ))}
    </div>
  );
}
