"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/map", label: "Map", icon: "📍" },
  { href: "/messages", label: "Messages", icon: "💬" },
  { href: "/community", label: "Community", icon: "👥" },
];

function AuthenticatedNav() {
  const { signOut } = useAuthActions();
  const account = useQuery(api.accounts.getCurrentAccount);
  const unreadMessages = useQuery(api.messages.getUnreadCount);
  const unreadNotifications = useQuery(api.notifications.getUnreadCount);
  const pathname = usePathname();

  const initials = account?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Link href="/dashboard" className="flex items-center gap-2 mr-6">
            <span aria-hidden="true" className="text-xl">🛡️</span>
            <span className="font-bold text-lg">Warrior Project</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 flex-1" role="navigation" aria-label="Main navigation">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                  {item.href === "/messages" && unreadMessages && unreadMessages > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                      {unreadMessages}
                      <span className="sr-only"> unread messages</span>
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Spacer for mobile when nav is hidden */}
          <div className="flex-1 md:hidden" />

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <Link href="/notifications" className="hidden md:inline-flex">
              <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                <span aria-hidden="true" className="text-lg">🔔</span>
                {unreadNotifications && unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 text-xs bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                    {unreadNotifications}
                    <span className="sr-only"> unread notifications</span>
                  </span>
                )}
              </Button>
            </Link>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full" aria-label="User menu">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={account?.profilePhoto} alt={account?.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center gap-2 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={account?.profilePhoto} alt={account?.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium">{account?.name}</p>
                    <p className="text-xs text-muted-foreground">{account?.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg md:hidden" role="navigation" aria-label="Mobile navigation">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-xs transition-colors relative",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <span aria-hidden="true" className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
                {item.href === "/messages" && unreadMessages && unreadMessages > 0 && (
                  <span className="absolute top-1 ml-4 px-1 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full min-w-[16px] text-center">
                    {unreadMessages}
                    <span className="sr-only"> unread messages</span>
                  </span>
                )}
              </Link>
            );
          })}
          {/* Notifications tab for mobile */}
          <Link
            href="/notifications"
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-xs transition-colors relative",
              pathname === "/notifications" ? "text-primary" : "text-muted-foreground"
            )}
            aria-current={pathname === "/notifications" ? "page" : undefined}
          >
            <span aria-hidden="true" className="text-lg">🔔</span>
            <span>Alerts</span>
            {unreadNotifications && unreadNotifications > 0 && (
              <span className="absolute top-1 ml-4 px-1 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full min-w-[16px] text-center">
                {unreadNotifications}
                <span className="sr-only"> unread notifications</span>
              </span>
            )}
          </Link>
        </div>
      </nav>
    </>
  );
}

function UnauthenticatedNav() {
  const pathname = usePathname();

  // Don't show nav on auth pages
  if (pathname.startsWith("/signin") || pathname.startsWith("/signup")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span aria-hidden="true" className="text-xl">🛡️</span>
          <span className="font-bold text-lg">Warrior Project</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/signin">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link href="/signup">
            <Button>Get Started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function NavSkeleton() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        <div className="flex items-center gap-2 mr-6">
          <span aria-hidden="true" className="text-xl">🛡️</span>
          <span className="font-bold text-lg">Warrior Project</span>
        </div>
        <div className="flex-1" />
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
      </div>
    </header>
  );
}

export function Navigation() {
  return (
    <>
      <AuthLoading>
        <NavSkeleton />
      </AuthLoading>
      <Authenticated>
        <AuthenticatedNav />
      </Authenticated>
      <Unauthenticated>
        <UnauthenticatedNav />
      </Unauthenticated>
    </>
  );
}
