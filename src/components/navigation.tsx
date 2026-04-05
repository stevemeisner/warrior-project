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
import { Bell, LogOut, User, Settings, HeartHandshake, Shield, Search } from "lucide-react";
import { HomeIcon, CommunityIcon, MessagesIcon, MapIcon, ProfileIcon } from "@/components/icons/nav-icons";

const mobileNavItems = [
  { href: "/dashboard", label: "Home", Icon: HomeIcon },
  { href: "/community", label: "Community", Icon: CommunityIcon },
  { href: "/messages", label: "Messages", Icon: MessagesIcon },
  { href: "/map", label: "Map", Icon: MapIcon },
  { href: "/profile", label: "Profile", Icon: ProfileIcon },
];

const desktopNavItems = [
  { href: "/dashboard", label: "Dashboard", Icon: HomeIcon },
  { href: "/community", label: "Community", Icon: CommunityIcon },
  { href: "/messages", label: "Messages", Icon: MessagesIcon },
  { href: "/map", label: "Map", Icon: MapIcon },
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
      {/* Desktop Header */}
      <header className="sticky top-0 z-50 w-full gradient-header shadow-md hidden md:block">
        <div className="container mx-auto flex h-14 items-center px-5">
          <Link href="/dashboard" className="flex items-center gap-2 mr-8">
            <Shield className="h-5 w-5 text-white" strokeWidth={1.75} />
            <span className="font-heading font-bold text-lg text-white">Warrior Project</span>
          </Link>

          <nav className="flex items-center gap-1 flex-1" role="navigation" aria-label="Main navigation">
            {desktopNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-white/18 text-white font-semibold"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <item.Icon className="size-4" />
                  <span>{item.label}</span>
                  {item.href === "/messages" && unreadMessages && unreadMessages > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-white text-primary rounded-full font-bold">
                      {unreadMessages}
                      <span className="sr-only"> unread messages</span>
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/search">
              <Button variant="ghost" size="icon-sm" className="text-white/70 hover:text-white hover:bg-white/10" aria-label="Search">
                <Search className="size-5" strokeWidth={1.75} />
              </Button>
            </Link>
            <Link href="/notifications">
              <Button variant="ghost" size="icon-sm" className="relative text-white/70 hover:text-white hover:bg-white/10" aria-label="Notifications">
                <Bell className="size-5" strokeWidth={1.75} />
                {unreadNotifications && unreadNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 text-[10px] bg-red-500 text-white rounded-full flex items-center justify-center font-bold">
                    {unreadNotifications}
                    <span className="sr-only"> unread notifications</span>
                  </span>
                )}
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full ml-1" aria-label="User menu">
                  <Avatar className="h-9 w-9 ring-2 ring-white/30">
                    <AvatarImage src={account?.profilePhoto} alt={account?.name} />
                    <AvatarFallback className="bg-white/20 text-white text-xs font-bold">
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
                <DropdownMenuItem asChild>
                  <Link href="/support" className="flex items-center gap-2">
                    <HeartHandshake className="h-4 w-4" strokeWidth={1.75} />
                    Support
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:hidden" role="navigation" aria-label="Mobile navigation">
        <div className="flex items-center justify-around h-16 px-2">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[11px] font-medium transition-all duration-200 relative rounded-xl min-h-[48px]",
                  isActive
                    ? "text-primary bg-primary/6"
                    : "text-muted-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <span className="absolute -top-0 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full bg-gradient-to-r from-primary to-accent" />
                )}
                <item.Icon className={cn("size-5", isActive && "text-primary")} />
                <span>{item.label}</span>
                {item.href === "/messages" && unreadMessages && unreadMessages > 0 && (
                  <span className="absolute top-1 right-1/4 px-1 py-0.5 text-[10px] bg-red-500 text-white rounded-full min-w-[16px] text-center font-bold">
                    {unreadMessages}
                    <span className="sr-only"> unread messages</span>
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile Top Bar (logo + bell + avatar only) */}
      <header className="sticky top-0 z-50 w-full gradient-header shadow-md md:hidden">
        <div className="flex h-12 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-white" strokeWidth={1.75} />
            <span className="font-heading font-bold text-base text-white">Warrior Project</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/notifications">
              <Button variant="ghost" size="icon-sm" className="relative text-white/70 hover:text-white hover:bg-white/10 size-9" aria-label="Notifications">
                <Bell className="size-4" strokeWidth={1.75} />
                {unreadNotifications && unreadNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 text-[9px] bg-red-500 text-white rounded-full flex items-center justify-center font-bold">
                    {unreadNotifications}
                  </span>
                )}
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full" aria-label="User menu">
                  <Avatar className="h-7 w-7 ring-2 ring-white/30">
                    <AvatarImage src={account?.profilePhoto} alt={account?.name} />
                    <AvatarFallback className="bg-white/20 text-white text-[10px] font-bold">
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
                <DropdownMenuItem asChild>
                  <Link href="/support" className="flex items-center gap-2">
                    <HeartHandshake className="h-4 w-4" strokeWidth={1.75} />
                    Support
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
    </>
  );
}

function UnauthenticatedNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/signin") || pathname.startsWith("/signup")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full gradient-header shadow-md">
      <div className="container mx-auto flex h-14 items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-white" strokeWidth={1.75} />
          <span className="font-heading font-bold text-lg text-white">Warrior Project</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/signin">
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">Sign In</Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-white text-primary hover:bg-white/90 font-semibold">Get Started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function NavSkeleton() {
  return (
    <header className="sticky top-0 z-50 w-full gradient-header shadow-md">
      <div className="container mx-auto flex h-14 items-center px-5">
        <div className="flex items-center gap-2 mr-6">
          <Shield className="h-5 w-5 text-white" strokeWidth={1.75} />
          <span className="font-heading font-bold text-lg text-white">Warrior Project</span>
        </div>
        <div className="flex-1" />
        <div className="h-8 w-8 rounded-full bg-white/20 animate-pulse" />
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
