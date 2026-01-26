import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { auth } from "./auth";
import { notificationTypes } from "./schema";

// Get notifications for the current user
export const getMyNotifications = query({
  args: {
    unreadOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) return [];

    let notifications;

    if (args.unreadOnly) {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_account_and_read", (q) =>
          q.eq("accountId", account._id).eq("isRead", false)
        )
        .order("desc")
        .take(args.limit || 50);
    } else {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_account_and_created", (q) => q.eq("accountId", account._id))
        .order("desc")
        .take(args.limit || 50);
    }

    // Enrich with related entity info
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notif) => {
        let relatedAccount = null;
        let relatedWarrior = null;

        if (notif.relatedAccountId) {
          const acc = await ctx.db.get(notif.relatedAccountId);
          relatedAccount = acc
            ? { _id: acc._id, name: acc.name, profilePhoto: acc.profilePhoto }
            : null;
        }

        if (notif.relatedWarriorId) {
          const warrior = await ctx.db.get(notif.relatedWarriorId);
          relatedWarrior = warrior
            ? { _id: warrior._id, name: warrior.name, profilePhoto: warrior.profilePhoto }
            : null;
        }

        return {
          ...notif,
          relatedAccount,
          relatedWarrior,
        };
      })
    );

    return enrichedNotifications;
  },
});

// Get unread notification count
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return 0;

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) return 0;

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_account_and_read", (q) =>
        q.eq("accountId", account._id).eq("isRead", false)
      )
      .collect();

    return unreadNotifications.length;
  },
});

// Mark a notification as read
export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) {
      throw new Error("Account not found");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.accountId !== account._id) {
      throw new Error("Not authorized to update this notification");
    }

    await ctx.db.patch(args.notificationId, {
      isRead: true,
    });

    return args.notificationId;
  },
});

// Mark all notifications as read
export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) {
      throw new Error("Account not found");
    }

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_account_and_read", (q) =>
        q.eq("accountId", account._id).eq("isRead", false)
      )
      .collect();

    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, {
        isRead: true,
      });
    }

    return unreadNotifications.length;
  },
});

// Delete a notification
export const deleteNotification = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) {
      throw new Error("Account not found");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.accountId !== account._id) {
      throw new Error("Not authorized to delete this notification");
    }

    await ctx.db.delete(args.notificationId);

    return args.notificationId;
  },
});

// Internal function to create notifications (called from other mutations)
export const createNotification = internalMutation({
  args: {
    accountId: v.id("accounts"),
    type: notificationTypes,
    title: v.string(),
    message: v.string(),
    relatedAccountId: v.optional(v.id("accounts")),
    relatedWarriorId: v.optional(v.id("warriors")),
    relatedConversationId: v.optional(v.id("conversations")),
    relatedThreadId: v.optional(v.id("threads")),
  },
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert("notifications", {
      accountId: args.accountId,
      type: args.type,
      title: args.title,
      message: args.message,
      relatedAccountId: args.relatedAccountId,
      relatedWarriorId: args.relatedWarriorId,
      relatedConversationId: args.relatedConversationId,
      relatedThreadId: args.relatedThreadId,
      isRead: false,
      createdAt: Date.now(),
    });

    return notificationId;
  },
});

// Clear old notifications (run periodically via cron)
export const clearOldNotifications = internalMutation({
  args: { olderThanDays: v.number() },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.olderThanDays * 24 * 60 * 60 * 1000;

    const oldNotifications = await ctx.db
      .query("notifications")
      .filter((q) => q.lt(q.field("createdAt"), cutoff))
      .collect();

    let deleted = 0;
    for (const notification of oldNotifications) {
      if (notification.isRead) {
        await ctx.db.delete(notification._id);
        deleted++;
      }
    }

    return deleted;
  },
});
