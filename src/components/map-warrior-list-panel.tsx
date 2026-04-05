"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge, WarriorStatus } from "@/components/status-selector";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Users } from "lucide-react";

interface WarriorWithAccount {
  _id: string;
  accountId: string;
  name: string;
  currentStatus: WarriorStatus;
  profilePhoto?: string;
  condition?: string;
  isFeather: boolean;
  account?: {
    location?: {
      city?: string;
      state?: string;
      latitude?: number;
      longitude?: number;
    };
  } | null;
}

interface MapWarriorListPanelProps {
  warriors: WarriorWithAccount[];
  selectedWarriorId?: string;
  onWarriorClick: (warrior: WarriorWithAccount) => void;
  className?: string;
}

export function MapWarriorListPanel({
  warriors,
  selectedWarriorId,
  onWarriorClick,
  className,
}: MapWarriorListPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Desktop Panel
  const DesktopPanel = () => (
    <div
      className={cn(
        "hidden md:flex flex-col bg-white/95 backdrop-blur-sm rounded-2xl shadow-[0_4px_24px_rgba(26,122,106,0.12)] border border-white/60 transition-all duration-300",
        isCollapsed ? "w-12" : "w-80",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">
              {warriors.length} warrior{warriors.length !== 1 ? "s" : ""} in view
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "Expand warrior list" : "Collapse warrior list"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* List */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)]">
          {warriors.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              <p>No warriors in this area</p>
              <p className="text-xs mt-1">Pan or zoom to see warriors</p>
            </div>
          ) : (
            <ul className="divide-y">
              {warriors.map((warrior) => (
                <li key={warrior._id}>
                  <button
                    onClick={() => onWarriorClick(warrior)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50",
                      selectedWarriorId === warrior._id && "bg-primary/10"
                    )}
                  >
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={warrior.profilePhoto} alt={warrior.name} />
                      <AvatarFallback className="bg-gradient-to-br from-[#1a7a6a] to-[#3aab7a] text-white text-xs">
                        {getInitials(warrior.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{warrior.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge status={warrior.currentStatus} size="sm" showLabel={false} />
                        {warrior.account?.location?.city && (
                          <span className="text-xs text-muted-foreground truncate">
                            {warrior.account.location.city}
                            {warrior.account.location.state && `, ${warrior.account.location.state}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );

  // Mobile Bottom Sheet
  const MobilePanel = () => {
    const visibleCount = isMobileExpanded ? warriors.length : 3;
    const displayedWarriors = warriors.slice(0, visibleCount);
    const hasMore = warriors.length > 3;

    return (
      <div
        className={cn(
          "md:hidden fixed bottom-16 left-0 right-0 bg-white/95 backdrop-blur-sm rounded-t-2xl shadow-[0_-4px_24px_rgba(26,122,106,0.12)] border-t border-white/60 transition-all duration-300 z-20",
          isMobileExpanded ? "max-h-[70vh]" : "max-h-48"
        )}
      >
        {/* Drag Handle */}
        <div
          className="flex justify-center py-2 cursor-pointer"
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
          role="button"
          tabIndex={0}
          aria-label={isMobileExpanded ? "Collapse warrior list" : "Expand warrior list"}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsMobileExpanded(!isMobileExpanded); } }}
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">
              {warriors.length} warrior{warriors.length !== 1 ? "s" : ""} in view
            </span>
          </div>
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => setIsMobileExpanded(!isMobileExpanded)}
              aria-expanded={isMobileExpanded}
              aria-label={isMobileExpanded ? "Show fewer warriors" : `Show ${warriors.length - 3} more warriors`}
            >
              {isMobileExpanded ? (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Less
                </>
              ) : (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  {warriors.length - 3} more
                </>
              )}
            </Button>
          )}
        </div>

        {/* List */}
        <div className={cn("overflow-y-auto", isMobileExpanded ? "max-h-[calc(70vh-80px)]" : "")}>
          {warriors.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              <p>No warriors in this area</p>
            </div>
          ) : (
            <ul className="divide-y">
              {displayedWarriors.map((warrior) => (
                <li key={warrior._id}>
                  <button
                    onClick={() => onWarriorClick(warrior)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50",
                      selectedWarriorId === warrior._id && "bg-primary/10"
                    )}
                  >
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={warrior.profilePhoto} alt={warrior.name} />
                      <AvatarFallback className="bg-gradient-to-br from-[#1a7a6a] to-[#3aab7a] text-white text-xs">
                        {getInitials(warrior.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{warrior.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge status={warrior.currentStatus} size="sm" showLabel={false} />
                        {warrior.account?.location?.city && (
                          <span className="text-xs text-muted-foreground truncate">
                            {warrior.account.location.city}
                            {warrior.account.location.state && `, ${warrior.account.location.state}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <DesktopPanel />
      <MobilePanel />
    </>
  );
}
