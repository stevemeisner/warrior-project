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
import {
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Users,
  Bell,
  Shield,
  HeartHandshake,
  LogOut,
  User,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/map", label: "Map", Icon: MapPin },
  { href: "/messages", label: "Messages", Icon: MessageCircle },
  { href: "/community", label: "Community", Icon: Users },
  { href: "/support", label: "Support", Icon: HeartHandshake },
  { href: "/caregivers", label: "Caregivers", Icon: HeartHandshake },
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
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Link href="/dashboard" className="flex items-center gap-2 mr-6">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" strokeWidth={1.75} />
            </div>
            <span className="font-bold text-lg">Warrior Project</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 flex-1" role="navigation" aria-label="Main navigation">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <item.Icon className="h-4 w-4" strokeWidth={1.75} />
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

          <div className="flex-1 md:hidden" />

          <div className="flex items-center gap-2">
            <Link href="/notifications" className="hidden md:inline-flex">
              <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                <Bell className="h-5 w-5" strokeWidth={1.75} />
                {unreadNotifications && unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 text-xs bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                    {unreadNotifications}
                    <span className="sr-only"> unread notifications</span>
                  </span>
                )}
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full" aria-label="User menu">
                  <Avatar className="h-8 w-8 ring-2 ring-border">
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
                  <Link href="/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" strokeWidth={1.75} />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" strokeWidth={1.75} />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive flex items-center gap-2">
                  <LogOut className="h-4 w-4" strokeWidth={1.75} />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:hidden" role="navigation" aria-label="Mobile navigation">
        <div className="flex items-center justify-around h-16 px-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[11px] transition-all duration-200 relative",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <item.Icon className={cn("h-5 w-5", isActive && "scale-110")} strokeWidth={isActive ? 2 : 1.75} />
                <span>{item.label}</span>
                {item.href === "/messages" && unreadMessages && unreadMessages > 0 && (
                  <span className="absolute top-0.5 ml-5 px-1 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full min-w-[16px] text-center">
                    {unreadMessages}
                    <span className="sr-only"> unread messages</span>
                  </span>
                )}
              </Link>
            );
          })}
          <Link
            href="/notifications"
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[11px] transition-all duration-200 relative",
              pathname === "/notifications" ? "text-primary" : "text-muted-foreground"
            )}
            aria-current={pathname === "/notifications" ? "page" : undefined}
          >
            <Bell className={cn("h-5 w-5", pathname === "/notifications" && "scale-110")} strokeWidth={pathname === "/notifications" ? 2 : 1.75} />
            <span>Alerts</span>
            {unreadNotifications && unreadNotifications > 0 && (
              <span className="absolute top-0.5 ml-5 px-1 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full min-w-[16px] text-center">
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" strokeWidth={1.75} />
          </div>
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container mx-auto flex h-14 items-center px-4">
        <div className="flex items-center gap-2 mr-6">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" strokeWidth={1.75} />
          </div>
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
