import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";
import { statusValues, visibilitySettings } from "./schema";

// Get all warriors for the current account
export const getMyWarriors = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) return [];

    return await ctx.db
      .query("warriors")
      .withIndex("by_account", (q) => q.eq("accountId", account._id))
      .collect();
  },
});

// Get a single warrior by ID
export const getWarrior = query({
  args: { warriorId: v.id("warriors") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.warriorId);
  },
});

// Get warriors for a specific account (with visibility check)
export const getWarriorsByAccount = query({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);

    const warriors = await ctx.db
      .query("warriors")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .collect();

    // If viewing own account, return all warriors
    if (userId) {
      const viewerAccount = await ctx.db
        .query("accounts")
        .withIndex("by_authId", (q) => q.eq("authId", userId))
        .first();

      if (viewerAccount) {
        if (viewerAccount._id === args.accountId) {
          return warriors;
        }

        // Check if viewer is a caregiver for this account
        const caregiverRelation = await ctx.db
          .query("caregivers")
          .withIndex("by_caregiver", (q) => q.eq("caregiverAccountId", viewerAccount._id))
          .filter((q) => q.eq(q.field("accountId"), args.accountId))
          .first();

        if (caregiverRelation && caregiverRelation.inviteStatus === "accepted") {
          return warriors;
        }
      }
    }

    // For others, only return public warriors
    return warriors.filter((w) => w.visibility === "public");
  },
});

// Create a new warrior
export const createWarrior = mutation({
  args: {
    name: v.string(),
    dateOfBirth: v.optional(v.string()),
    condition: v.optional(v.string()),
    profilePhoto: v.optional(v.string()),
    bio: v.optional(v.string()),
    visibility: v.optional(visibilitySettings),
  },
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

    if (account.role !== "family") {
      throw new Error("Only family accounts can create warriors");
    }

    const now = Date.now();

    const warriorId = await ctx.db.insert("warriors", {
      accountId: account._id,
      name: args.name,
      dateOfBirth: args.dateOfBirth,
      condition: args.condition,
      currentStatus: "stable",
      isFeather: false,
      profilePhoto: args.profilePhoto,
      bio: args.bio,
      visibility: args.visibility || "public",
      createdAt: now,
      updatedAt: now,
    });

    // Create initial status update
    await ctx.db.insert("statusUpdates", {
      warriorId,
      status: "stable",
      updatedBy: account._id,
      visibility: args.visibility || "public",
      createdAt: now,
    });

    return warriorId;
  },
});

// Update a warrior
export const updateWarrior = mutation({
  args: {
    warriorId: v.id("warriors"),
    name: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    condition: v.optional(v.string()),
    profilePhoto: v.optional(v.string()),
    bio: v.optional(v.string()),
    visibility: v.optional(visibilitySettings),
  },
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

    const warrior = await ctx.db.get(args.warriorId);
    if (!warrior) {
      throw new Error("Warrior not found");
    }

    // Check ownership or caregiver with fullAccess
    const isOwner = warrior.accountId === account._id;
    let hasAccess = isOwner;

    if (!isOwner) {
      const caregiverRelation = await ctx.db
        .query("caregivers")
        .withIndex("by_caregiver", (q) => q.eq("caregiverAccountId", account._id))
        .filter((q) => q.eq(q.field("accountId"), warrior.accountId))
        .first();

      hasAccess =
        caregiverRelation?.inviteStatus === "accepted" &&
        caregiverRelation?.permissions === "fullAccess";
    }

    if (!hasAccess) {
      throw new Error("Not authorized to update this warrior");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.dateOfBirth !== undefined) updates.dateOfBirth = args.dateOfBirth;
    if (args.condition !== undefined) updates.condition = args.condition;
    if (args.profilePhoto !== undefined) updates.profilePhoto = args.profilePhoto;
    if (args.bio !== undefined) updates.bio = args.bio;
    if (args.visibility !== undefined) updates.visibility = args.visibility;

    await ctx.db.patch(args.warriorId, updates);

    return args.warriorId;
  },
});

// Delete a warrior
export const deleteWarrior = mutation({
  args: { warriorId: v.id("warriors") },
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

    const warrior = await ctx.db.get(args.warriorId);
    if (!warrior) {
      throw new Error("Warrior not found");
    }

    // Only the owner can delete a warrior
    if (warrior.accountId !== account._id) {
      throw new Error("Not authorized to delete this warrior");
    }

    // Delete all status updates for this warrior
    const statusUpdates = await ctx.db
      .query("statusUpdates")
      .withIndex("by_warrior", (q) => q.eq("warriorId", args.warriorId))
      .collect();

    for (const update of statusUpdates) {
      await ctx.db.delete(update._id);
    }

    // Delete the warrior
    await ctx.db.delete(args.warriorId);

    return args.warriorId;
  },
});

// Get public warriors with optional status filter (for map view)
export const getPublicWarriors = query({
  args: {
    status: v.optional(statusValues),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("warriors")
      .withIndex("by_visibility", (q) => q.eq("visibility", "public"));

    const warriors = await query.collect();

    let filtered = warriors;
    if (args.status) {
      filtered = warriors.filter((w) => w.currentStatus === args.status);
    }

    // Get account info for each warrior
    const warriorsWithAccounts = await Promise.all(
      filtered.slice(0, args.limit || 100).map(async (warrior) => {
        const account = await ctx.db.get(warrior.accountId);
        return {
          ...warrior,
          account: account
            ? {
                _id: account._id,
                name: account.name,
                location: account.privacySettings?.showLocation
                  ? account.location
                  : undefined,
              }
            : null,
        };
      })
    );

    return warriorsWithAccounts;
  },
});
