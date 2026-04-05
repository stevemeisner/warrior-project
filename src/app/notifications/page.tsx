"use client";

import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { NotificationsSkeleton } from "@/components/skeleton-loaders";
import { GradientHeader, ContentPanel } from "@/components/gradient-header";
import {
  Activity,
  MessageCircle,
  HeartHandshake,
  Users,
  MessageSquare,
  AtSign,
  Bell,
  Check,
  Trash2,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";

const notificationIcons: Record<string, { Icon: LucideIcon; color: string }> = {
  statusChange: { Icon: Activity, color: "bg-blue-100 text-blue-600" },
  newMessage: { Icon: MessageCircle, color: "bg-violet-100 text-violet-600" },
  supportRequest: { Icon: HeartHandshake, color: "bg-rose-100 text-rose-600" },
  caregiverInvite: { Icon: Users, color: "bg-green-100 text-green-600" },
  threadReply: { Icon: MessageSquare, color: "bg-amber-100 text-amber-600" },
  mention: { Icon: AtSign, color: "bg-purple-100 text-purple-600" },
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

  const handleNotificationClick = async (notification: NonNullable<typeof notifications>[0]) => {
    if (!notification.isRead) {
      await markAsRead({ notificationId: notification._id as any });
    }

    if (notification.type === "newMessage" && notification.relatedConversationId) {
      router.push("/messages");
    } else if (notification.type === "threadReply" && notification.relatedThreadId) {
      router.push(`/community?thread=${notification.relatedThreadId}`);
    } else if (notification.type === "statusChange" && notification.relatedWarriorId) {
      router.push(`/profile/warrior/${notification.relatedWarriorId}`);
    } else if (notification.type === "caregiverInvite") {
      router.push("/caregivers");
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
    <>
      <GradientHeader>
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-white/80" />
            <h1 className="text-2xl font-heading font-bold text-white">Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <span className="bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>
      </GradientHeader>

      <ContentPanel>
        {unreadCount > 0 && (
          <div className="flex justify-end mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-muted-foreground text-xs"
            >
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Mark all as read
            </Button>
          </div>
        )}

        {notifications === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-start gap-4 py-4 border-b border-border">
                <div className="h-10 w-10 rounded-xl bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 bg-muted rounded" />
                  <div className="h-3 w-3/4 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length > 0 ? (
          <div>
            {notifications.map((notification, idx) => {
              const iconInfo = notificationIcons[notification.type] || {
                Icon: Bell,
                color: "bg-muted text-muted-foreground",
              };
              const IconComp = iconInfo.Icon;
              return (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "flex items-start gap-4 py-4 cursor-pointer transition-colors",
                    idx < notifications.length - 1 && "border-b border-border",
                    !notification.isRead && "bg-primary/3 -mx-5 px-5 rounded-lg"
                  )}
                >
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                      iconInfo.color
                    )}
                  >
                    <IconComp className="h-5 w-5" strokeWidth={1.75} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm leading-snug", !notification.isRead ? "font-semibold" : "font-medium")}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
                          {notification.message}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!notification.isRead && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {notification.relatedAccount && (
                      <div className="flex items-center gap-2 mt-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={notification.relatedAccount.profilePhoto} />
                          <AvatarFallback className="text-xs">
                            {notification.relatedAccount.name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {notification.relatedAccount.name}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 mt-2">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification._id.toString());
                          }}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Mark read
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification._id.toString());
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center text-muted-foreground">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-muted mb-4">
              <Bell className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.75} />
            </div>
            <p className="font-heading font-semibold text-foreground mb-1">All caught up</p>
            <p className="text-sm">
              You&apos;ll see updates here when there&apos;s activity.
            </p>
          </div>
        )}
      </ContentPanel>
    </>
  );
}

export default function NotificationsPage() {
  return (
    <>
      <AuthLoading>
        <NotificationsSkeleton />
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
