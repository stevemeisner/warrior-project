"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { WarriorList } from "@/components/warrior-card";
import { DashboardSkeleton } from "@/components/skeleton-loaders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { WarriorStatus } from "@/components/status-selector";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useRouter } from "next/navigation";
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

const STATUS_COLORS: Record<string, string> = {
  thriving: "bg-emerald-400",
  stable: "bg-blue-400",
  struggling: "bg-gray-400",
  hospitalized: "bg-red-400",
  needsSupport: "bg-purple-400",
  feather: "bg-amber-300",
};

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
  if (account === null) {
    router.push("/onboarding");
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
    );
  }

  const isFamily = account.role === "family";

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Greeting Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            {getGreeting()}, {account.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isFamily
              ? "Here\u2019s how your warriors are doing today"
              : "Here are the latest updates from families you care for"}
          </p>
        </div>
        {isFamily && (
          <Link href="/profile/warrior/new">
            <Button>Add Warrior</Button>
          </Link>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {/* Warriors */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                {warriors === undefined ? (
                  <div className="h-8 w-12 bg-muted animate-pulse rounded" />
                ) : (
                  <div className="text-2xl font-bold">{warriors.length}</div>
                )}
                <p className="text-sm text-muted-foreground">Warriors</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="border-l-4 border-l-violet-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/10">
                <MessageCircle className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                {unreadMessages === undefined ? (
                  <div className="h-8 w-12 bg-muted animate-pulse rounded" />
                ) : (
                  <div className="text-2xl font-bold">{unreadMessages}</div>
                )}
                <p className="text-sm text-muted-foreground">Unread Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                <Bell className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                {notifications === undefined ? (
                  <div className="h-8 w-12 bg-muted animate-pulse rounded" />
                ) : (
                  <div className="text-2xl font-bold">{notifications}</div>
                )}
                <p className="text-sm text-muted-foreground">Notifications</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Updates */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                <Activity className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                {recentUpdates === undefined ? (
                  <div className="h-8 w-12 bg-muted animate-pulse rounded" />
                ) : (
                  <div className="text-2xl font-bold">{recentUpdates.length}</div>
                )}
                <p className="text-sm text-muted-foreground">Recent Updates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support Requests */}
        <Card className="border-l-4 border-l-rose-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/10">
                <HeartHandshake className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                {supportCount === undefined ? (
                  <div className="h-8 w-12 bg-muted animate-pulse rounded" />
                ) : (
                  <div className="text-2xl font-bold">{supportCount}</div>
                )}
                <p className="text-sm text-muted-foreground">Support Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warriors Section */}
      {isFamily && (
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Your Warriors</h2>
          <WarriorList
            warriors={(warriors || []).map((w) => ({
              ...w,
              _id: w._id.toString(),
            }))}
            onStatusChange={handleStatusChange}
            onWarriorClick={(warrior) => router.push(`/profile/warrior/${warrior._id}`)}
            canEdit
          />
        </section>
      )}

      {/* Quick Navigation */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/map">
            <Card className="card-hover cursor-pointer">
              <CardContent className="pt-6 text-center">
                <div className="flex h-12 w-12 mx-auto mb-3 items-center justify-center rounded-full bg-blue-500/10">
                  <MapPin className="h-6 w-6 text-blue-500" />
                </div>
                <p className="font-medium">Map</p>
                <p className="text-sm text-muted-foreground">Find warriors nearby</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/messages">
            <Card className="card-hover cursor-pointer">
              <CardContent className="pt-6 text-center">
                <div className="flex h-12 w-12 mx-auto mb-3 items-center justify-center rounded-full bg-violet-500/10">
                  <MessageCircle className="h-6 w-6 text-violet-500" />
                </div>
                <p className="font-medium">Messages</p>
                <p className="text-sm text-muted-foreground">
                  {unreadMessages ? `${unreadMessages} unread` : "Start chatting"}
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/community">
            <Card className="card-hover cursor-pointer">
              <CardContent className="pt-6 text-center">
                <div className="flex h-12 w-12 mx-auto mb-3 items-center justify-center rounded-full bg-emerald-500/10">
                  <Users className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="font-medium">Community</p>
                <p className="text-sm text-muted-foreground">Join discussions</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/support">
            <Card className="card-hover cursor-pointer">
              <CardContent className="pt-6 text-center">
                <div className="flex h-12 w-12 mx-auto mb-3 items-center justify-center rounded-full bg-rose-500/10">
                  <HeartHandshake className="h-6 w-6 text-rose-500" />
                </div>
                <p className="font-medium">Support</p>
                <p className="text-sm text-muted-foreground">
                  {isFamily ? "Ask for help" : "Offer your help"}
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
        <Card>
          <CardContent className="pt-6">
            {recentUpdates && recentUpdates.length > 0 ? (
              <ul className="space-y-1">
                {recentUpdates.map((update) => (
                  <li
                    key={update._id}
                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50"
                  >
                    {/* Colored timeline dot */}
                    <div className="flex flex-col items-center pt-1.5">
                      <div
                        className={`h-3 w-3 rounded-full ${STATUS_COLORS[update.status] || "bg-muted"}`}
                      />
                    </div>

                    {/* Status emoji */}
                    <span className="text-2xl shrink-0" aria-hidden="true">
                      {update.status === "thriving" && "\ud83c\udf1f"}
                      {update.status === "stable" && "\ud83d\udc99"}
                      {update.status === "struggling" && "\ud83c\udf27\ufe0f"}
                      {update.status === "hospitalized" && "\ud83c\udfe5"}
                      {update.status === "needsSupport" && "\ud83d\udc9c"}
                      {update.status === "feather" && "\ud83e\udeb6"}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{update.warrior?.name}</span>
                        {" is "}
                        <span className="font-medium">{update.status}</span>
                      </p>
                      {update.context && (
                        <p className="text-sm text-muted-foreground truncate">
                          &quot;{update.context}&quot;
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Updated by {update.updatedByName}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
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
          </CardContent>
        </Card>
      </section>
    </div>
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
