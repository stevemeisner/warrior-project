"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { WarriorList } from "@/components/warrior-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { WarriorStatus } from "@/components/status-selector";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useRouter } from "next/navigation";

function DashboardContent() {
  const router = useRouter();
  const account = useQuery(api.accounts.getCurrentAccount);
  const warriors = useQuery(api.warriors.getMyWarriors);
  const recentUpdates = useQuery(api.status.getRecentUpdates, { limit: 10 });
  const unreadMessages = useQuery(api.messages.getUnreadCount);
  const notifications = useQuery(api.notifications.getUnreadCount);

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
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your account...</p>
        </div>
      </div>
    );
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {account.name}</h1>
          <p className="text-muted-foreground">
            {isFamily ? "Manage your warriors and connect with others" : "View updates from families you care for"}
          </p>
        </div>
        {isFamily && (
          <Link href="/profile/warrior/new">
            <Button>Add Warrior</Button>
          </Link>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            {warriors === undefined ? (
              <div className="h-8 w-12 bg-muted animate-pulse rounded"></div>
            ) : (
              <div className="text-2xl font-bold">{warriors.length}</div>
            )}
            <p className="text-sm text-muted-foreground">Warriors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            {unreadMessages === undefined ? (
              <div className="h-8 w-12 bg-muted animate-pulse rounded"></div>
            ) : (
              <div className="text-2xl font-bold">{unreadMessages}</div>
            )}
            <p className="text-sm text-muted-foreground">Unread Messages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            {notifications === undefined ? (
              <div className="h-8 w-12 bg-muted animate-pulse rounded"></div>
            ) : (
              <div className="text-2xl font-bold">{notifications}</div>
            )}
            <p className="text-sm text-muted-foreground">Notifications</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            {recentUpdates === undefined ? (
              <div className="h-8 w-12 bg-muted animate-pulse rounded"></div>
            ) : (
              <div className="text-2xl font-bold">{recentUpdates.length}</div>
            )}
            <p className="text-sm text-muted-foreground">Recent Updates</p>
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
        <div className="grid grid-cols-3 gap-4">
          <Link href="/map">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="pt-6 text-center">
                <span className="text-4xl mb-2 block">📍</span>
                <p className="font-medium">Map</p>
                <p className="text-sm text-muted-foreground">Find warriors nearby</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/messages">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="pt-6 text-center">
                <span className="text-4xl mb-2 block">💬</span>
                <p className="font-medium">Messages</p>
                <p className="text-sm text-muted-foreground">
                  {unreadMessages ? `${unreadMessages} unread` : "Start chatting"}
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/community">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="pt-6 text-center">
                <span className="text-4xl mb-2 block">🏠</span>
                <p className="font-medium">Community</p>
                <p className="text-sm text-muted-foreground">Join discussions</p>
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
              <ul className="space-y-3">
                {recentUpdates.map((update) => (
                  <li
                    key={update._id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                  >
                    <span className="text-2xl">
                      {update.status === "thriving" && "🌟"}
                      {update.status === "stable" && "💙"}
                      {update.status === "struggling" && "🌧️"}
                      {update.status === "hospitalized" && "🏥"}
                      {update.status === "needsSupport" && "💜"}
                      {update.status === "feather" && "🪶"}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{update.warrior?.name}</span>
                        {" is "}
                        <span className="font-medium">{update.status}</span>
                      </p>
                      {update.context && (
                        <p className="text-sm text-muted-foreground">
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
              <p className="text-muted-foreground text-center py-8">
                No recent activity yet
              </p>
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
        <div className="flex items-center justify-center min-h-screen">
          <p>Loading...</p>
        </div>
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
