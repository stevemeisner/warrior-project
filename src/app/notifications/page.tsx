"use client";

import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const notificationIcons: Record<string, string> = {
  statusChange: "📊",
  newMessage: "💬",
  supportRequest: "💜",
  caregiverInvite: "👥",
  threadReply: "💭",
  mention: "@",
};

function NotificationsContent() {
  const router = useRouter();
  const notifications = useQuery(api.notifications.getMyNotifications, {
    limit: 50,
  });
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const deleteNotification = useMutation(api.notifications.deleteNotification);

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead({ notificationId: notificationId as any });
  };

  // Navigate to the relevant page based on notification type
  const handleNotificationClick = async (notification: NonNullable<typeof notifications>[0]) => {
    // Mark as read first
    if (!notification.isRead) {
      await markAsRead({ notificationId: notification._id as any });
    }

    // Navigate based on notification type and related entities
    if (notification.type === "newMessage" && notification.relatedConversationId) {
      router.push("/messages");
    } else if (notification.type === "threadReply" && notification.relatedThreadId) {
      router.push(`/community?thread=${notification.relatedThreadId}`);
    } else if (notification.type === "statusChange" && notification.relatedWarriorId) {
      router.push(`/profile/warrior/${notification.relatedWarriorId}`);
    } else if (notification.type === "caregiverInvite") {
      router.push("/settings");
    } else if (notification.type === "supportRequest" && notification.relatedAccountId) {
      router.push(`/profile/${notification.relatedAccountId}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead({});
  };

  const handleDelete = async (notificationId: string) => {
    await deleteNotification({ notificationId: notificationId as any });
  };

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllAsRead}>
            Mark all as read
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {notifications && notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "p-4 flex items-start gap-4 hover:bg-muted/50 transition-colors cursor-pointer",
                    !notification.isRead && "bg-primary/5"
                  )}
                >
                  <div className="text-2xl">
                    {notificationIcons[notification.type] || "🔔"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{notification.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {notification.relatedAccount && (
                      <div className="flex items-center gap-2 mt-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage
                            src={notification.relatedAccount.profilePhoto}
                          />
                          <AvatarFallback className="text-xs">
                            {notification.relatedAccount.name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">
                          {notification.relatedAccount.name}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification._id.toString());
                          }}
                        >
                          Mark as read
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification._id.toString());
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <span className="text-4xl block mb-4">🔔</span>
              <p>No notifications yet</p>
              <p className="text-sm mt-1">
                You&apos;ll see updates here when there&apos;s activity
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function NotificationsPage() {
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
        <NotificationsContent />
      </Authenticated>
    </>
  );
}
