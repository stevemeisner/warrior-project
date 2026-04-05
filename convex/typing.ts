import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { auth } from "./auth";

const TYPING_TIMEOUT_MS = 3000; // Typing indicator expires after 3 seconds

// Set typing indicator (called while user is typing)
export const setTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) throw new Error("Account not found");

    // Verify the user is a participant or authorized caregiver
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return;

    let hasAccess = conversation.participants.includes(account._id);
    if (!hasAccess) {
      for (const participantId of conversation.participants) {
        const caregiverRelation = await ctx.db
          .query("caregivers")
          .withIndex("by_caregiver", (q) => q.eq("caregiverAccountId", account._id))
          .filter((q) => q.eq(q.field("accountId"), participantId))
          .first();
        if (
          caregiverRelation?.inviteStatus === "accepted" &&
          conversation.caregiverAccess &&
          (caregiverRelation.permissions === "canMessage" ||
            caregiverRelation.permissions === "canUpdate" ||
            caregiverRelation.permissions === "fullAccess")
        ) {
          hasAccess = true;
          break;
        }
      }
    }
    if (!hasAccess) return;

    // Check if there's already a typing indicator for this user in this conversation
    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .filter((q) => q.eq(q.field("accountId"), account._id))
      .first();

    const expiresAt = Date.now() + TYPING_TIMEOUT_MS;

    if (existing) {
      // Update the expiry
      await ctx.db.patch(existing._id, { expiresAt });
    } else {
      // Create new indicator
      await ctx.db.insert("typingIndicators", {
        conversationId: args.conversationId,
        accountId: account._id,
        expiresAt,
      });
    }
  },
});

// Clear typing indicator (called when user stops typing or sends a message)
export const clearTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) return;

    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .filter((q) => q.eq(q.field("accountId"), account._id))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// Get who's typing in a conversation (excluding the current user)
export const getTypingUsers = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) return [];

    // Verify the user is a participant or authorized caregiver
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return [];

    let hasAccess = conversation.participants.includes(account._id);
    if (!hasAccess) {
      for (const participantId of conversation.participants) {
        const caregiverRelation = await ctx.db
          .query("caregivers")
          .withIndex("by_caregiver", (q) => q.eq("caregiverAccountId", account._id))
          .filter((q) => q.eq(q.field("accountId"), participantId))
          .first();
        if (
          caregiverRelation?.inviteStatus === "accepted" &&
          conversation.caregiverAccess &&
          (caregiverRelation.permissions === "canMessage" ||
            caregiverRelation.permissions === "canUpdate" ||
            caregiverRelation.permissions === "fullAccess")
        ) {
          hasAccess = true;
          break;
        }
      }
    }
    if (!hasAccess) return [];

    const now = Date.now();

    const indicators = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    // Filter out expired indicators and current user
    const activeTypers = indicators.filter(
      (ind) => ind.accountId !== account._id && ind.expiresAt > now
    );

    // Enrich with names
    const typingUsers = await Promise.all(
      activeTypers.map(async (ind) => {
        const typingAccount = await ctx.db.get(ind.accountId);
        return typingAccount
          ? { _id: typingAccount._id, name: typingAccount.name }
          : null;
      })
    );

    return typingUsers.filter(Boolean);
  },
});

// Cleanup expired typing indicators (run periodically)
export const cleanupExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const expired = await ctx.db
      .query("typingIndicators")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .collect();

    for (const indicator of expired) {
      await ctx.db.delete(indicator._id);
    }

    return expired.length;
  },
});
