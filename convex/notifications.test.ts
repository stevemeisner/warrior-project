import { convexTest } from "convex-test";
import { describe, expect, it, beforeEach } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";
import {
  createAccount,
  createWarrior,
  createNotification,
  resetFactoryCounter,
} from "./test.factories";

beforeEach(() => {
  resetFactoryCounter();
});

// ─── getMyNotifications ──────────────────────────────────────────────────────

describe("getMyNotifications", () => {
  it("returns notifications for the current user", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });

    await createNotification(t, { accountId, title: "Notif 1" });
    await createNotification(t, { accountId, title: "Notif 2" });

    const notifications = await asUser.query(api.notifications.getMyNotifications, {});
    expect(notifications).toHaveLength(2);
  });

  it("does not return notifications for other users", async () => {
    const t = convexTest(schema, modules);
    const { asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    await createNotification(t, { accountId: bobId, title: "Bob's Notif" });

    const notifications = await asAlice.query(api.notifications.getMyNotifications, {});
    expect(notifications).toHaveLength(0);
  });

  it("filters by unreadOnly when set to true", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });

    await createNotification(t, { accountId, isRead: false, title: "Unread" });
    await createNotification(t, { accountId, isRead: true, title: "Read" });

    const notifications = await asUser.query(api.notifications.getMyNotifications, {
      unreadOnly: true,
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe("Unread");
  });

  it("returns all notifications when unreadOnly is not set", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });

    await createNotification(t, { accountId, isRead: false });
    await createNotification(t, { accountId, isRead: true });

    const notifications = await asUser.query(api.notifications.getMyNotifications, {});
    expect(notifications).toHaveLength(2);
  });

  it("enriches with relatedAccount info", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    await createNotification(t, {
      accountId,
      relatedAccountId: bobId,
    });

    const notifications = await asUser.query(api.notifications.getMyNotifications, {});
    expect(notifications[0].relatedAccount).not.toBeNull();
    expect(notifications[0].relatedAccount!.name).toBe("Bob");
  });

  it("enriches with relatedWarrior info", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });
    const { warriorId } = await createWarrior(t, { accountId, name: "WarriorKid" });

    await createNotification(t, {
      accountId,
      relatedWarriorId: warriorId,
    });

    const notifications = await asUser.query(api.notifications.getMyNotifications, {});
    expect(notifications[0].relatedWarrior).not.toBeNull();
    expect(notifications[0].relatedWarrior!.name).toBe("WarriorKid");
  });

  it("respects limit argument", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });

    await createNotification(t, { accountId });
    await createNotification(t, { accountId });
    await createNotification(t, { accountId });

    const notifications = await asUser.query(api.notifications.getMyNotifications, { limit: 2 });
    expect(notifications).toHaveLength(2);
  });

  it("returns empty array for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const notifications = await t.query(api.notifications.getMyNotifications, {});
    expect(notifications).toEqual([]);
  });
});

// ─── getUnreadCount ──────────────────────────────────────────────────────────

describe("getUnreadCount (notifications)", () => {
  it("returns count of unread notifications", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });

    await createNotification(t, { accountId, isRead: false });
    await createNotification(t, { accountId, isRead: false });
    await createNotification(t, { accountId, isRead: true });

    const count = await asUser.query(api.notifications.getUnreadCount, {});
    expect(count).toBe(2);
  });

  it("returns 0 when all are read", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });

    await createNotification(t, { accountId, isRead: true });

    const count = await asUser.query(api.notifications.getUnreadCount, {});
    expect(count).toBe(0);
  });

  it("returns 0 for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const count = await t.query(api.notifications.getUnreadCount, {});
    expect(count).toBe(0);
  });

  it("does not count other users' notifications", async () => {
    const t = convexTest(schema, modules);
    const { asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    await createNotification(t, { accountId: bobId, isRead: false });

    const count = await asAlice.query(api.notifications.getUnreadCount, {});
    expect(count).toBe(0);
  });
});

// ─── markAsRead ──────────────────────────────────────────────────────────────

describe("markAsRead (notifications)", () => {
  it("marks a notification as read", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });
    const { notificationId } = await createNotification(t, { accountId, isRead: false });

    await asUser.mutation(api.notifications.markAsRead, { notificationId });

    const notif = await t.run(async (ctx) => ctx.db.get(notificationId));
    expect(notif!.isRead).toBe(true);
  });

  it("only owner can mark as read", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });
    const { asUser: asBob } = await createAccount(t, { name: "Bob" });
    const { notificationId } = await createNotification(t, { accountId, isRead: false });

    await expect(
      asBob.mutation(api.notifications.markAsRead, { notificationId })
    ).rejects.toThrow("Not authorized");
  });

  it("throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });
    const { notificationId } = await createNotification(t, { accountId });

    await expect(
      t.mutation(api.notifications.markAsRead, { notificationId })
    ).rejects.toThrow("Not authenticated");
  });
});

// ─── markAllAsRead ───────────────────────────────────────────────────────────

describe("markAllAsRead", () => {
  it("marks all unread notifications as read", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });

    await createNotification(t, { accountId, isRead: false });
    await createNotification(t, { accountId, isRead: false });
    await createNotification(t, { accountId, isRead: true });

    const count = await asUser.mutation(api.notifications.markAllAsRead, {});
    expect(count).toBe(2);

    // Verify all are now read
    const unread = await t.run(async (ctx) => {
      return await ctx.db
        .query("notifications")
        .withIndex("by_account_and_read", (q) =>
          q.eq("accountId", accountId).eq("isRead", false)
        )
        .collect();
    });

    expect(unread).toHaveLength(0);
  });

  it("returns 0 when no unread notifications exist", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });

    await createNotification(t, { accountId, isRead: true });

    const count = await asUser.mutation(api.notifications.markAllAsRead, {});
    expect(count).toBe(0);
  });

  it("does not affect other users' notifications", async () => {
    const t = convexTest(schema, modules);
    const { asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const { notificationId: bobNotifId } = await createNotification(t, {
      accountId: bobId,
      isRead: false,
    });

    await asAlice.mutation(api.notifications.markAllAsRead, {});

    const bobNotif = await t.run(async (ctx) => ctx.db.get(bobNotifId));
    expect(bobNotif!.isRead).toBe(false);
  });

  it("throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.notifications.markAllAsRead, {})
    ).rejects.toThrow("Not authenticated");
  });
});

// ─── deleteNotification ──────────────────────────────────────────────────────

describe("deleteNotification", () => {
  it("owner can delete their notification", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });
    const { notificationId } = await createNotification(t, { accountId });

    await asUser.mutation(api.notifications.deleteNotification, { notificationId });

    const notif = await t.run(async (ctx) => ctx.db.get(notificationId));
    expect(notif).toBeNull();
  });

  it("non-owner is rejected", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });
    const { asUser: asBob } = await createAccount(t, { name: "Bob" });
    const { notificationId } = await createNotification(t, { accountId });

    await expect(
      asBob.mutation(api.notifications.deleteNotification, { notificationId })
    ).rejects.toThrow("Not authorized");
  });

  it("throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });
    const { notificationId } = await createNotification(t, { accountId });

    await expect(
      t.mutation(api.notifications.deleteNotification, { notificationId })
    ).rejects.toThrow("Not authenticated");
  });
});

// ─── createNotification (internal) ───────────────────────────────────────────

describe("createNotification (internal)", () => {
  it("creates a notification with correct fields", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });
    const { accountId: relatedId } = await createAccount(t, { name: "Bob" });
    const { warriorId } = await createWarrior(t, { accountId, name: "WarriorKid" });

    const notificationId = await t.mutation(internal.notifications.createNotification, {
      accountId,
      type: "statusChange",
      title: "Status Update",
      message: "Warrior's status changed",
      relatedAccountId: relatedId,
      relatedWarriorId: warriorId,
    });

    expect(notificationId).toBeDefined();

    const notif = await t.run(async (ctx) => ctx.db.get(notificationId));
    expect(notif!.accountId).toEqual(accountId);
    expect(notif!.type).toBe("statusChange");
    expect(notif!.title).toBe("Status Update");
    expect(notif!.message).toBe("Warrior's status changed");
    expect(notif!.relatedAccountId).toEqual(relatedId);
    expect(notif!.relatedWarriorId).toEqual(warriorId);
    expect(notif!.isRead).toBe(false);
    expect(notif!.createdAt).toBeDefined();
  });

  it("creates notification without optional related fields", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });

    const notificationId = await t.mutation(internal.notifications.createNotification, {
      accountId,
      type: "newMessage",
      title: "New Message",
      message: "You have a new message",
    });

    const notif = await t.run(async (ctx) => ctx.db.get(notificationId));
    expect(notif!.relatedAccountId).toBeUndefined();
    expect(notif!.relatedWarriorId).toBeUndefined();
    expect(notif!.relatedConversationId).toBeUndefined();
    expect(notif!.relatedThreadId).toBeUndefined();
  });
});

// ─── clearOldNotifications (internal) ────────────────────────────────────────

describe("clearOldNotifications (internal)", () => {
  it("deletes old read notifications", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });

    // Create an old read notification (91 days ago)
    const oldTime = Date.now() - 91 * 24 * 60 * 60 * 1000;
    await t.run(async (ctx) => {
      await ctx.db.insert("notifications", {
        accountId,
        type: "statusChange",
        title: "Old Notif",
        message: "Old message",
        isRead: true,
        createdAt: oldTime,
      });
    });

    const deleted = await t.mutation(internal.notifications.clearOldNotifications, {
      olderThanDays: 90,
    });

    expect(deleted).toBe(1);

    const remaining = await t.run(async (ctx) => {
      return await ctx.db
        .query("notifications")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect();
    });
    expect(remaining).toHaveLength(0);
  });

  it("does not delete old unread notifications", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });

    // Create an old UNREAD notification
    const oldTime = Date.now() - 91 * 24 * 60 * 60 * 1000;
    await t.run(async (ctx) => {
      await ctx.db.insert("notifications", {
        accountId,
        type: "statusChange",
        title: "Old Unread",
        message: "Still unread",
        isRead: false,
        createdAt: oldTime,
      });
    });

    const deleted = await t.mutation(internal.notifications.clearOldNotifications, {
      olderThanDays: 90,
    });

    expect(deleted).toBe(0);

    const remaining = await t.run(async (ctx) => {
      return await ctx.db
        .query("notifications")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect();
    });
    expect(remaining).toHaveLength(1);
  });

  it("does not delete recent read notifications", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });

    // Create a recent read notification (1 day ago)
    const recentTime = Date.now() - 1 * 24 * 60 * 60 * 1000;
    await t.run(async (ctx) => {
      await ctx.db.insert("notifications", {
        accountId,
        type: "statusChange",
        title: "Recent Read",
        message: "Recent",
        isRead: true,
        createdAt: recentTime,
      });
    });

    const deleted = await t.mutation(internal.notifications.clearOldNotifications, {
      olderThanDays: 90,
    });

    expect(deleted).toBe(0);
  });

  it("handles mixed old/new and read/unread correctly", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });

    const oldTime = Date.now() - 100 * 24 * 60 * 60 * 1000;
    const recentTime = Date.now() - 10 * 24 * 60 * 60 * 1000;

    await t.run(async (ctx) => {
      // Old + read -> should be deleted
      await ctx.db.insert("notifications", {
        accountId, type: "statusChange", title: "A", message: "a",
        isRead: true, createdAt: oldTime,
      });
      // Old + unread -> should NOT be deleted
      await ctx.db.insert("notifications", {
        accountId, type: "statusChange", title: "B", message: "b",
        isRead: false, createdAt: oldTime,
      });
      // Recent + read -> should NOT be deleted
      await ctx.db.insert("notifications", {
        accountId, type: "statusChange", title: "C", message: "c",
        isRead: true, createdAt: recentTime,
      });
      // Recent + unread -> should NOT be deleted
      await ctx.db.insert("notifications", {
        accountId, type: "statusChange", title: "D", message: "d",
        isRead: false, createdAt: recentTime,
      });
    });

    const deleted = await t.mutation(internal.notifications.clearOldNotifications, {
      olderThanDays: 30,
    });

    expect(deleted).toBe(1);

    const remaining = await t.run(async (ctx) => {
      return await ctx.db
        .query("notifications")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect();
    });
    expect(remaining).toHaveLength(3);
  });
});
