"use client";

import { useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { WarriorList } from "@/components/warrior-card";
import { DashboardSkeleton } from "@/components/skeleton-loaders";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { WarriorStatus, StatusBadge } from "@/components/status-selector";
import { statusIconMap } from "@/components/icons/status-icons";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useRouter } from "next/navigation";
import { GradientHeader, ContentPanel } from "@/components/gradient-header";
import {
  MapPin,
  MessageCircle,
  Users,
  HeartHandshake,
  Bell,
  Shield,
  ArrowRight,
  Activity,
} from "lucide-react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function DashboardContent() {
  const router = useRouter();
  const account = useQuery(api.accounts.getCurrentAccount);
  const warriors = useQuery(api.warriors.getMyWarriors);
  const recentUpdates = useQuery(api.status.getRecentUpdates, { limit: 10 });
  const unreadMessages = useQuery(api.messages.getUnreadCount);
  const notifications = useQuery(api.notifications.getUnreadCount);
  const supportCount = useQuery(api.supportRequests.getActiveCount);

  const updateStatus = useMutation(api.status.updateStatus);

  const handleStatusChange = async (warriorId: string, status: WarriorStatus) => {
    try {
      await updateStatus({
        warriorId: warriorId as any,
        status,
      });
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  // Loading state (query in flight)
  if (account === undefined) {
    return <DashboardSkeleton />;
  }

  // No account exists - redirect to onboarding
  useEffect(() => {
    if (account === null) {
      router.push("/onboarding");
    }
  }, [account, router]);

  if (account === null) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
    );
  }

  const isFamily = account.role === "family";

  const statItems = [
    {
      label: "Warriors",
      value: warriors === undefined ? null : warriors.length,
      icon: Shield,
      color: "text-primary",
    },
    {
      label: "Messages",
      value: unreadMessages === undefined ? null : unreadMessages,
      icon: MessageCircle,
      color: "text-violet-500",
    },
    {
      label: "Notifications",
      value: notifications === undefined ? null : notifications,
      icon: Bell,
      color: "text-amber-500",
    },
    {
      label: "Updates",
      value: recentUpdates === undefined ? null : recentUpdates.length,
      icon: Activity,
      color: "text-emerald-500",
    },
    {
      label: "Support",
      value: supportCount === undefined ? null : supportCount,
      icon: HeartHandshake,
      color: "text-rose-500",
    },
  ];

  return (
    <>
      {/* Gradient Header with Greeting */}
      <GradientHeader tall>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-white">
              {getGreeting()}, {account.name}
            </h1>
            <p className="text-white/80 text-sm mt-1">
              {isFamily
                ? "Here\u2019s how your warriors are doing today"
                : "Here are the latest updates from families you care for"}
            </p>
          </div>
          {isFamily && (
            <Link href="/profile/warrior/new">
              <Button variant="secondary" size="sm">
                Add Warrior
              </Button>
            </Link>
          )}
        </div>
      </GradientHeader>

      <ContentPanel>
        {/* Quick Stats Strip */}
        <div className="flex overflow-x-auto gap-3 pb-2 -mt-1 md:flex-row md:overflow-visible mb-6">
          {statItems.map((item) => (
            <div
              key={item.label}
              className="flex-shrink-0 bg-white rounded-xl px-4 py-3 shadow-sm min-w-[120px] flex items-center gap-3"
            >
              <item.icon className={`size-5 ${item.color} shrink-0`} />
              <div>
                {item.value === null ? (
                  <div className="h-7 w-10 bg-muted animate-pulse rounded" />
                ) : (
                  <div className="font-heading text-xl font-bold leading-tight">
                    {item.value}
                  </div>
                )}
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {item.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="flex overflow-x-auto gap-3 pb-2 mb-6 md:overflow-visible">
          <Link href="/map" className="flex-shrink-0">
            <div className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-2 hover:shadow-md transition-shadow">
              <MapPin className="size-4 text-blue-500" />
              <span className="text-sm font-medium whitespace-nowrap">Map</span>
            </div>
          </Link>
          <Link href="/messages" className="flex-shrink-0">
            <div className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-2 hover:shadow-md transition-shadow">
              <MessageCircle className="size-4 text-violet-500" />
              <span className="text-sm font-medium whitespace-nowrap">
                Messages{unreadMessages ? ` (${unreadMessages})` : ""}
              </span>
            </div>
          </Link>
          <Link href="/community" className="flex-shrink-0">
            <div className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-2 hover:shadow-md transition-shadow">
              <Users className="size-4 text-emerald-500" />
              <span className="text-sm font-medium whitespace-nowrap">Community</span>
            </div>
          </Link>
          <Link href="/support" className="flex-shrink-0">
            <div className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-2 hover:shadow-md transition-shadow">
              <HeartHandshake className="size-4 text-rose-500" />
              <span className="text-sm font-medium whitespace-nowrap">
                {isFamily ? "Get Support" : "Offer Help"}
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop two-column layout for updates + warriors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Updates - Timeline */}
          <section>
            <h2 className="section-label mb-4">Recent Updates</h2>
            {recentUpdates && recentUpdates.length > 0 ? (
              <div className="space-y-0">
                {recentUpdates.map((update, index) => {
                  const IconComponent =
                    statusIconMap[update.status as keyof typeof statusIconMap];
                  return (
                    <div
                      key={update._id}
                      className={`flex items-start gap-3 py-3 ${
                        index < recentUpdates.length - 1
                          ? "border-b border-border"
                          : ""
                      }`}
                    >
                      <div className="icon-box">
                        {IconComponent ? (
                          <IconComponent className="size-5 text-primary" />
                        ) : (
                          <Activity className="size-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-sm">
                          <span className="text-primary font-semibold">
                            {update.warrior?.name}
                          </span>
                          {" is "}
                          <StatusBadge
                            status={update.status as WarriorStatus}
                            size="sm"
                          />
                        </p>
                        {update.context && (
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            &quot;{update.context}&quot;
                          </p>
                        )}
                        <p className="text-muted-foreground text-sm mt-0.5">
                          {update.updatedByName} &middot;{" "}
                          {formatTimeAgo(update._creationTime)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-medium">
                  No activity yet
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Status updates from your warriors will appear here
                </p>
              </div>
            )}
          </section>

          {/* Warriors Section */}
          {isFamily && (
            <section>
              <h2 className="section-label mb-4">Your Warriors</h2>
              <WarriorList
                warriors={(warriors || []).map((w) => ({
                  ...w,
                  _id: w._id.toString(),
                }))}
                onStatusChange={handleStatusChange}
                onWarriorClick={(warrior) =>
                  router.push(`/profile/warrior/${warrior._id}`)
                }
                canEdit
              />
            </section>
          )}
        </div>
      </ContentPanel>
    </>
  );
}

export default function DashboardPage() {
  return (
    <>
      <AuthLoading>
        <DashboardSkeleton />
      </AuthLoading>
      <Unauthenticated>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please sign in</h1>
            <Link href="/signin">
              <Button>Sign In</Button>
            </Link>
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <DashboardContent />
      </Authenticated>
    </>
  );
}
