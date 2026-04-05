import { convexTest } from "convex-test";
import { describe, expect, it, beforeEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";
import {
  createAccount,
  createConversation,
  resetFactoryCounter,
} from "./test.factories";

beforeEach(() => {
  resetFactoryCounter();
});

// ─── setTyping ──────────────────────────────────────────────────────────────

describe("setTyping", () => {
  it("non-participant cannot set typing in a conversation", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });
    const { asUser: asCharlie } = await createAccount(t, { name: "Charlie" });

    const { conversationId } = await createConversation(t, {
      participants: [aliceId, bobId],
    });

    // Charlie is not a participant — setTyping silently returns without creating an indicator
    await asCharlie.mutation(api.typing.setTyping, { conversationId });

    // Verify no typing indicators were created
    const indicators = await t.run(async (ctx) => {
      return await ctx.db
        .query("typingIndicators")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
        .collect();
    });

    expect(indicators).toHaveLength(0);
  });

  it("participant can set typing indicator", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId, asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const { conversationId } = await createConversation(t, {
      participants: [aliceId, bobId],
    });

    await asAlice.mutation(api.typing.setTyping, { conversationId });

    const indicators = await t.run(async (ctx) => {
      return await ctx.db
        .query("typingIndicators")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
        .collect();
    });

    expect(indicators).toHaveLength(1);
    expect(indicators[0].accountId).toEqual(aliceId);
  });

  it("throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const { conversationId } = await createConversation(t, {
      participants: [aliceId, bobId],
    });

    await expect(
      t.mutation(api.typing.setTyping, { conversationId })
    ).rejects.toThrow("Not authenticated");
  });
});

// ─── getTypingUsers ─────────────────────────────────────────────────────────

describe("getTypingUsers", () => {
  it("filters out expired typing indicators", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId, asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const { conversationId } = await createConversation(t, {
      participants: [aliceId, bobId],
    });

    // Directly insert an expired typing indicator for Bob
    await t.run(async (ctx) => {
      await ctx.db.insert("typingIndicators", {
        conversationId,
        accountId: bobId,
        expiresAt: Date.now() - 5000, // expired 5 seconds ago
      });
    });

    const result = await asAlice.query(api.typing.getTypingUsers, { conversationId });
    expect(result).toHaveLength(0);
  });

  it("filters out current user from typing indicators", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId, asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const { conversationId } = await createConversation(t, {
      participants: [aliceId, bobId],
    });

    // Insert a non-expired typing indicator for Alice herself
    await t.run(async (ctx) => {
      await ctx.db.insert("typingIndicators", {
        conversationId,
        accountId: aliceId,
        expiresAt: Date.now() + 10000, // far in the future
      });
    });

    const result = await asAlice.query(api.typing.getTypingUsers, { conversationId });
    // Alice should not see herself in the typing list
    expect(result).toHaveLength(0);
  });

  it("returns active typing users excluding self and expired", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId, asUser: asAlice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const { conversationId } = await createConversation(t, {
      participants: [aliceId, bobId],
    });

    // Insert a valid typing indicator for Bob
    await t.run(async (ctx) => {
      await ctx.db.insert("typingIndicators", {
        conversationId,
        accountId: bobId,
        expiresAt: Date.now() + 10000,
      });
    });

    const result = await asAlice.query(api.typing.getTypingUsers, { conversationId });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ _id: bobId, name: "Bob" });
  });

  it("non-participant gets empty array", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });
    const { asUser: asCharlie } = await createAccount(t, { name: "Charlie" });

    const { conversationId } = await createConversation(t, {
      participants: [aliceId, bobId],
    });

    // Bob is typing
    await t.run(async (ctx) => {
      await ctx.db.insert("typingIndicators", {
        conversationId,
        accountId: bobId,
        expiresAt: Date.now() + 10000,
      });
    });

    const result = await asCharlie.query(api.typing.getTypingUsers, { conversationId });
    expect(result).toHaveLength(0);
  });

  it("returns empty for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const { conversationId } = await createConversation(t, {
      participants: [aliceId, bobId],
    });

    const result = await t.query(api.typing.getTypingUsers, { conversationId });
    expect(result).toHaveLength(0);
  });
});
