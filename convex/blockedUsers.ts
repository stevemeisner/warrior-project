import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";
import { Id } from "./_generated/dataModel";
import { QueryCtx, MutationCtx } from "./_generated/server";

// Helper: check if either user has blocked the other
export async function isBlocked(
  ctx: QueryCtx | MutationCtx,
  accountId1: Id<"accounts">,
  accountId2: Id<"accounts">
): Promise<boolean> {
  const block1 = await ctx.db
    .query("blockedUsers")
    .withIndex("by_blocker", (q) => q.eq("blockerId", accountId1))
    .filter((q) => q.eq(q.field("blockedId"), accountId2))
    .first();

  if (block1) return true;

  const block2 = await ctx.db
    .query("blockedUsers")
    .withIndex("by_blocker", (q) => q.eq("blockerId", accountId2))
    .filter((q) => q.eq(q.field("blockedId"), accountId1))
    .first();

  return !!block2;
}

// Get the current user's blocked users list
export const getBlockedUsers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) return [];

    const blocks = await ctx.db
      .query("blockedUsers")
      .withIndex("by_blocker", (q) => q.eq("blockerId", account._id))
      .collect();

    const blockedWithDetails = await Promise.all(
      blocks.map(async (block) => {
        const blockedAccount = await ctx.db.get(block.blockedId);
        return {
          ...block,
          blockedAccount: blockedAccount
            ? {
                _id: blockedAccount._id,
                name: blockedAccount.name,
                profilePhoto: blockedAccount.profilePhoto,
              }
            : null,
        };
      })
    );

    return blockedWithDetails;
  },
});

// Check if a specific user is blocked by the current user
export const isUserBlocked = query({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return false;

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) return false;

    const block = await ctx.db
      .query("blockedUsers")
      .withIndex("by_blocker", (q) => q.eq("blockerId", account._id))
      .filter((q) => q.eq(q.field("blockedId"), args.accountId))
      .first();

    return !!block;
  },
});

// Block a user
export const blockUser = mutation({
  args: { accountId: v.id("accounts") },
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

    if (account._id === args.accountId) {
      throw new Error("Cannot block yourself");
    }

    // Check if already blocked
    const existingBlock = await ctx.db
      .query("blockedUsers")
      .withIndex("by_blocker", (q) => q.eq("blockerId", account._id))
      .filter((q) => q.eq(q.field("blockedId"), args.accountId))
      .first();

    if (existingBlock) {
      throw new Error("User is already blocked");
    }

    await ctx.db.insert("blockedUsers", {
      blockerId: account._id,
      blockedId: args.accountId,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Unblock a user
export const unblockUser = mutation({
  args: { accountId: v.id("accounts") },
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

    const block = await ctx.db
      .query("blockedUsers")
      .withIndex("by_blocker", (q) => q.eq("blockerId", account._id))
      .filter((q) => q.eq(q.field("blockedId"), args.accountId))
      .first();

    if (!block) {
      throw new Error("User is not blocked");
    }

    await ctx.db.delete(block._id);

    return { success: true };
  },
});
