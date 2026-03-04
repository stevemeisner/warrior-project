import { convexTest } from "convex-test";
import { describe, expect, it, beforeEach } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";
import {
  createAccount,
  createConversation,
  createMessage,
  createCaregiverRelation,
  resetFactoryCounter,
} from "./test.factories";

beforeEach(() => {
  resetFactoryCounter();
});

// ─── getMyConversations ──────────────────────────────────────────────────────

describe("getMyConversations", () => {
  it("returns conversations where user is a participant", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId, asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    await createConversation(t, { participants: [aliceId, bobId] });

    const result = await asAlice.query(api.messages.getMyConversations, {});
    expect(result.conversations).toHaveLength(1);
    expect(result.conversations[0].participants).toHaveLength(2);
  });

  it("does not return conversations where user is not a participant", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });
    const { asUser: asCharlie } = await createAccount(t, { name: "Charlie" });

    await createConversation(t, { participants: [aliceId, bobId] });

    const result = await asCharlie.query(api.messages.getMyConversations, {});
    expect(result.conversations).toHaveLength(0);
  });

  it("returns empty for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.messages.getMyConversations, {});
    expect(result).toEqual([]);
  });

  it("enriches with last message and unread count", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId, asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const { conversationId } = await createConversation(t, {
      participants: [aliceId, bobId],
      lastMessageAt: Date.now(),
    });

    // Bob sends a message (not read by Alice)
    await createMessage(t, {
      conversationId,
      senderId: bobId,
      content: "Hello Alice",
      readBy: [bobId],
    });

    const result = await asAlice.query(api.messages.getMyConversations, {});
    expect(result.conversations).toHaveLength(1);
    expect(result.conversations[0].lastMessage).not.toBeNull();
    expect(result.conversations[0].lastMessage!.content).toBe("Hello Alice");
    expect(result.conversations[0].unreadCount).toBe(1);
  });

  it("returns pagination info", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId, asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    await createConversation(t, { participants: [aliceId, bobId] });

    const result = await asAlice.query(api.messages.getMyConversations, { limit: 10 });
    expect(result).toHaveProperty("conversations");
    expect(result).toHaveProperty("nextCursor");
    expect(result).toHaveProperty("hasMore");
    // Only 1 conversation, less than limit of 10
    expect(result.hasMore).toBe(false);
  });

  it("truncates long last messages to 50 chars", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId, asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const { conversationId } = await createConversation(t, {
      participants: [aliceId, bobId],
      lastMessageAt: Date.now(),
    });

    const longContent = "A".repeat(100);
    await createMessage(t, {
      conversationId,
      senderId: bobId,
      content: longContent,
      readBy: [bobId],
    });

    const result = await asAlice.query(api.messages.getMyConversations, {});
    const lastMsg = result.conversations[0].lastMessage!.content;
    expect(lastMsg.length).toBeLessThanOrEqual(53); // 50 + "..."
    expect(lastMsg).toContain("...");
  });
});

// ─── getConversation ─────────────────────────────────────────────────────────

describe("getConversation", () => {
  it("participant can view conversation with messages", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId, asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const { conversationId } = await createConversation(t, { participants: [aliceId, bobId] });

    await createMessage(t, { conversationId, senderId: aliceId, content: "Hi Bob" });
    await createMessage(t, { conversationId, senderId: bobId, content: "Hi Alice" });

    const result = await asAlice.query(api.messages.getConversation, { conversationId });
    expect(result).not.toBeNull();
    expect(result!.messages).toHaveLength(2);
    expect(result!.participants).toHaveLength(2);
  });

  it("messages are returned in chronological order", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId, asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const { conversationId } = await createConversation(t, { participants: [aliceId, bobId] });

    await createMessage(t, { conversationId, senderId: aliceId, content: "First" });
    await createMessage(t, { conversationId, senderId: bobId, content: "Second" });

    const result = await asAlice.query(api.messages.getConversation, { conversationId });
    expect(result!.messages[0].content).toBe("First");
    expect(result!.messages[1].content).toBe("Second");
  });

  it("non-participant without caregiver access returns null", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });
    const { asUser: asCharlie } = await createAccount(t, { name: "Charlie" });

    const { conversationId } = await createConversation(t, { participants: [aliceId, bobId] });

    const result = await asCharlie.query(api.messages.getConversation, { conversationId });
    expect(result).toBeNull();
  });

  it("caregiver with canMessage and caregiverAccess can view", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(t, {
      name: "Caregiver",
      role: "caregiver",
    });

    const { conversationId } = await createConversation(t, {
      participants: [aliceId, bobId],
      caregiverAccess: true,
    });

    await createCaregiverRelation(t, {
      accountId: aliceId,
      caregiverAccountId: caregiverId,
      permissions: "canMessage",
      inviteStatus: "accepted",
    });

    const result = await asCaregiver.query(api.messages.getConversation, { conversationId });
    expect(result).not.toBeNull();
  });

  it("caregiver is blocked when caregiverAccess is false", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(t, {
      name: "Caregiver",
      role: "caregiver",
    });

    const { conversationId } = await createConversation(t, {
      participants: [aliceId, bobId],
      caregiverAccess: false,
    });

    await createCaregiverRelation(t, {
      accountId: aliceId,
      caregiverAccountId: caregiverId,
      permissions: "canMessage",
      inviteStatus: "accepted",
    });

    const result = await asCaregiver.query(api.messages.getConversation, { conversationId });
    expect(result).toBeNull();
  });

  it("caregiver with viewOnly cannot view conversation", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(t, {
      name: "Caregiver",
      role: "caregiver",
    });

    const { conversationId } = await createConversation(t, {
      participants: [aliceId, bobId],
      caregiverAccess: true,
    });

    await createCaregiverRelation(t, {
      accountId: aliceId,
      caregiverAccountId: caregiverId,
      permissions: "viewOnly",
      inviteStatus: "accepted",
    });

    const result = await asCaregiver.query(api.messages.getConversation, { conversationId });
    expect(result).toBeNull();
  });

  it("returns null for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const { conversationId } = await createConversation(t, { participants: [aliceId, bobId] });

    const result = await t.query(api.messages.getConversation, { conversationId });
    expect(result).toBeNull();
  });

  it("enriches messages with sender info", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId, asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const { conversationId } = await createConversation(t, { participants: [aliceId, bobId] });
    await createMessage(t, { conversationId, senderId: aliceId, content: "Hi" });

    const result = await asAlice.query(api.messages.getConversation, { conversationId });
    expect(result!.messages[0].senderName).toBe("Alice");
  });
});

// ─── startConversation ───────────────────────────────────────────────────────

describe("startConversation", () => {
  it("creates a new DM conversation between two users", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId, asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const conversationId = await asAlice.mutation(api.messages.startConversation, {
      participantIds: [bobId],
    });

    expect(conversationId).toBeDefined();

    const conv = await t.run(async (ctx) => ctx.db.get(conversationId));
    expect(conv!.type).toBe("dm");
    expect(conv!.participants).toHaveLength(2);
    expect(conv!.participants).toContain(aliceId);
    expect(conv!.participants).toContain(bobId);
  });

  it("returns existing DM if one already exists", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId, asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const convId1 = await asAlice.mutation(api.messages.startConversation, {
      participantIds: [bobId],
    });

    const convId2 = await asAlice.mutation(api.messages.startConversation, {
      participantIds: [bobId],
    });

    expect(convId1).toEqual(convId2);
  });

  it("creates a group conversation for 3+ participants", async () => {
    const t = convexTest(schema, modules);
    const { asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });
    const { accountId: charlieId } = await createAccount(t, { name: "Charlie" });

    const conversationId = await asAlice.mutation(api.messages.startConversation, {
      participantIds: [bobId, charlieId],
      name: "Group Chat",
    });

    const conv = await t.run(async (ctx) => ctx.db.get(conversationId));
    expect(conv!.type).toBe("group");
    expect(conv!.participants).toHaveLength(3);
    expect(conv!.name).toBe("Group Chat");
  });

  it("adds current user to participants automatically", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId, asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const conversationId = await asAlice.mutation(api.messages.startConversation, {
      participantIds: [bobId],
    });

    const conv = await t.run(async (ctx) => ctx.db.get(conversationId));
    expect(conv!.participants).toContain(aliceId);
  });

  it("deduplicates if current user is also in participantIds", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId, asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const conversationId = await asAlice.mutation(api.messages.startConversation, {
      participantIds: [aliceId, bobId],
    });

    const conv = await t.run(async (ctx) => ctx.db.get(conversationId));
    expect(conv!.participants).toHaveLength(2);
  });

  it("defaults caregiverAccess to true", async () => {
    const t = convexTest(schema, modules);
    const { asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const conversationId = await asAlice.mutation(api.messages.startConversation, {
      participantIds: [bobId],
    });

    const conv = await t.run(async (ctx) => ctx.db.get(conversationId));
    expect(conv!.caregiverAccess).toBe(true);
  });

  it("throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    await expect(
      t.mutation(api.messages.startConversation, {
        participantIds: [bobId],
      })
    ).rejects.toThrow("Not authenticated");
  });
});

// ─── sendMessage ─────────────────────────────────────────────────────────────

describe("sendMessage", () => {
  it("participant can send a message", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId, asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const { conversationId } = await createConversation(t, { participants: [aliceId, bobId] });

    const messageId = await asAlice.mutation(api.messages.sendMessage, {
      conversationId,
      content: "Hello Bob!",
    });

    expect(messageId).toBeDefined();

    const msg = await t.run(async (ctx) => ctx.db.get(messageId));
    expect(msg!.content).toBe("Hello Bob!");
    expect(msg!.senderId).toEqual(aliceId);
    expect(msg!.readBy).toContain(aliceId);
  });

  it("updates conversation lastMessageAt", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId, asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const { conversationId } = await createConversation(t, { participants: [aliceId, bobId] });

    await asAlice.mutation(api.messages.sendMessage, {
      conversationId,
      content: "Hello!",
    });

    const conv = await t.run(async (ctx) => ctx.db.get(conversationId));
    expect(conv!.lastMessageAt).toBeDefined();
  });

  it("creates notifications for other participants", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId, asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const { conversationId } = await createConversation(t, { participants: [aliceId, bobId] });

    await asAlice.mutation(api.messages.sendMessage, {
      conversationId,
      content: "Hello!",
    });

    // Bob should receive a notification
    const notifications = await t.run(async (ctx) => {
      return await ctx.db
        .query("notifications")
        .withIndex("by_account", (q) => q.eq("accountId", bobId))
        .collect();
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("newMessage");
    expect(notifications[0].relatedConversationId).toEqual(conversationId);
  });

  it("does not create notification for sender", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId, asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const { conversationId } = await createConversation(t, { participants: [aliceId, bobId] });

    await asAlice.mutation(api.messages.sendMessage, {
      conversationId,
      content: "Hello!",
    });

    const aliceNotifs = await t.run(async (ctx) => {
      return await ctx.db
        .query("notifications")
        .withIndex("by_account", (q) => q.eq("accountId", aliceId))
        .collect();
    });

    expect(aliceNotifs).toHaveLength(0);
  });

  it("caregiver with canMessage and caregiverAccess can send", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(t, {
      name: "Caregiver",
      role: "caregiver",
    });

    const { conversationId } = await createConversation(t, {
      participants: [aliceId, bobId],
      caregiverAccess: true,
    });

    await createCaregiverRelation(t, {
      accountId: aliceId,
      caregiverAccountId: caregiverId,
      permissions: "canMessage",
      inviteStatus: "accepted",
    });

    const messageId = await asCaregiver.mutation(api.messages.sendMessage, {
      conversationId,
      content: "Caregiver here",
    });

    expect(messageId).toBeDefined();
  });

  it("non-participant without caregiver access is rejected", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });
    const { asUser: asCharlie } = await createAccount(t, { name: "Charlie" });

    const { conversationId } = await createConversation(t, { participants: [aliceId, bobId] });

    await expect(
      asCharlie.mutation(api.messages.sendMessage, {
        conversationId,
        content: "Intruder!",
      })
    ).rejects.toThrow("Not authorized");
  });

  it("throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const { conversationId } = await createConversation(t, { participants: [aliceId, bobId] });

    await expect(
      t.mutation(api.messages.sendMessage, {
        conversationId,
        content: "Hello",
      })
    ).rejects.toThrow("Not authenticated");
  });
});

// ─── markAsRead ──────────────────────────────────────────────────────────────

describe("markAsRead", () => {
  it("marks all unread messages as read for the user", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId, asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const { conversationId } = await createConversation(t, { participants: [aliceId, bobId] });

    // Bob sends messages (not read by Alice)
    const { messageId: msg1 } = await createMessage(t, {
      conversationId,
      senderId: bobId,
      content: "Message 1",
      readBy: [bobId],
    });
    const { messageId: msg2 } = await createMessage(t, {
      conversationId,
      senderId: bobId,
      content: "Message 2",
      readBy: [bobId],
    });

    const count = await asAlice.mutation(api.messages.markAsRead, { conversationId });
    expect(count).toBe(2);

    // Verify messages now include Alice in readBy
    const message1 = await t.run(async (ctx) => ctx.db.get(msg1));
    const message2 = await t.run(async (ctx) => ctx.db.get(msg2));
    expect(message1!.readBy).toContain(aliceId);
    expect(message2!.readBy).toContain(aliceId);
  });

  it("does not double-add user to readBy", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId, asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const { conversationId } = await createConversation(t, { participants: [aliceId, bobId] });

    await createMessage(t, {
      conversationId,
      senderId: aliceId,
      content: "My own message",
      readBy: [aliceId],
    });

    const count = await asAlice.mutation(api.messages.markAsRead, { conversationId });
    expect(count).toBe(0); // Already read
  });

  it("non-participant is rejected", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });
    const { asUser: asCharlie } = await createAccount(t, { name: "Charlie" });

    const { conversationId } = await createConversation(t, { participants: [aliceId, bobId] });

    await expect(
      asCharlie.mutation(api.messages.markAsRead, { conversationId })
    ).rejects.toThrow("Not a participant");
  });

  it("throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const { conversationId } = await createConversation(t, { participants: [aliceId, bobId] });

    await expect(
      t.mutation(api.messages.markAsRead, { conversationId })
    ).rejects.toThrow("Not authenticated");
  });
});

// ─── getUnreadCount ──────────────────────────────────────────────────────────

describe("getUnreadCount", () => {
  it("returns count of unread messages across conversations", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId, asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const { conversationId } = await createConversation(t, {
      participants: [aliceId, bobId],
      lastMessageAt: Date.now(),
    });

    // Bob sends 3 messages not read by Alice
    await createMessage(t, { conversationId, senderId: bobId, content: "Msg 1", readBy: [bobId] });
    await createMessage(t, { conversationId, senderId: bobId, content: "Msg 2", readBy: [bobId] });
    await createMessage(t, { conversationId, senderId: bobId, content: "Msg 3", readBy: [bobId] });

    const count = await asAlice.query(api.messages.getUnreadCount, {});
    expect(count).toBe(3);
  });

  it("excludes own messages from unread count", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId, asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const { conversationId } = await createConversation(t, {
      participants: [aliceId, bobId],
      lastMessageAt: Date.now(),
    });

    // Alice sends a message (not in her own readBy for some reason)
    await createMessage(t, { conversationId, senderId: aliceId, content: "My msg", readBy: [] });

    const count = await asAlice.query(api.messages.getUnreadCount, {});
    expect(count).toBe(0);
  });

  it("returns 0 for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const count = await t.query(api.messages.getUnreadCount, {});
    expect(count).toBe(0);
  });

  it("returns 0 when no unread messages exist", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId, asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const { conversationId } = await createConversation(t, {
      participants: [aliceId, bobId],
      lastMessageAt: Date.now(),
    });

    // Bob sends a message already read by Alice
    await createMessage(t, { conversationId, senderId: bobId, content: "Msg", readBy: [bobId, aliceId] });

    const count = await asAlice.query(api.messages.getUnreadCount, {});
    expect(count).toBe(0);
  });
});
