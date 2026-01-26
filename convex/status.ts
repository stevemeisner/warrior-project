import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";
import { statusValues, visibilitySettings } from "./schema";

// Update a warrior's status
export const updateStatus = mutation({
  args: {
    warriorId: v.id("warriors"),
    status: statusValues,
    context: v.optional(v.string()),
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

    // Check if user is owner or has canUpdate/fullAccess permissions
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
        (caregiverRelation?.permissions === "canUpdate" ||
          caregiverRelation?.permissions === "fullAccess");
    }

    if (!hasAccess) {
      throw new Error("Not authorized to update this warrior's status");
    }

    const now = Date.now();
    const visibility = args.visibility || warrior.visibility;

    // Create status update record
    const statusUpdateId = await ctx.db.insert("statusUpdates", {
      warriorId: args.warriorId,
      status: args.status,
      context: args.context,
      updatedBy: account._id,
      visibility,
      createdAt: now,
    });

    // Update warrior's current status
    const isFeather = args.status === "feather";
    await ctx.db.patch(args.warriorId, {
      currentStatus: args.status,
      isFeather,
      updatedAt: now,
    });

    // TODO: Create notifications for followers/connections
    // TODO: Send email notifications based on user preferences

    return statusUpdateId;
  },
});

// Get status history for a warrior
export const getStatusHistory = query({
  args: {
    warriorId: v.id("warriors"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);

    const warrior = await ctx.db.get(args.warriorId);
    if (!warrior) {
      return [];
    }

    // Check access
    let hasFullAccess = false;
    if (userId) {
      const viewerAccount = await ctx.db
        .query("accounts")
        .withIndex("by_authId", (q) => q.eq("authId", userId))
        .first();

      if (viewerAccount) {
        hasFullAccess = warrior.accountId === viewerAccount._id;

        if (!hasFullAccess) {
          const caregiverRelation = await ctx.db
            .query("caregivers")
            .withIndex("by_caregiver", (q) =>
              q.eq("caregiverAccountId", viewerAccount._id)
            )
            .filter((q) => q.eq(q.field("accountId"), warrior.accountId))
            .first();

          hasFullAccess =
            caregiverRelation?.inviteStatus === "accepted";
        }
      }
    }

    const statusUpdates = await ctx.db
      .query("statusUpdates")
      .withIndex("by_warrior_and_created", (q) => q.eq("warriorId", args.warriorId))
      .order("desc")
      .take(args.limit || 50);

    // If not owner/caregiver, filter by visibility
    const visibleUpdates = hasFullAccess
      ? statusUpdates
      : statusUpdates.filter((u) => u.visibility === "public");

    // Get updater info
    const updatesWithInfo = await Promise.all(
      visibleUpdates.map(async (update) => {
        const updater = await ctx.db.get(update.updatedBy);
        return {
          ...update,
          updatedByName: updater?.name || "Unknown",
        };
      })
    );

    return updatesWithInfo;
  },
});

// Get recent status updates across all visible warriors
export const getRecentUpdates = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);

    let viewerAccount = null;
    if (userId) {
      viewerAccount = await ctx.db
        .query("accounts")
        .withIndex("by_authId", (q) => q.eq("authId", userId))
        .first();
    }

    // Get recent public status updates
    const recentUpdates = await ctx.db
      .query("statusUpdates")
      .withIndex("by_created")
      .order("desc")
      .take(100);

    // Filter by visibility and enrich with warrior/account data
    const enrichedUpdates = await Promise.all(
      recentUpdates
        .filter((u) => u.visibility === "public")
        .slice(0, args.limit || 20)
        .map(async (update) => {
          const warrior = await ctx.db.get(update.warriorId);
          const updater = await ctx.db.get(update.updatedBy);
          const account = warrior ? await ctx.db.get(warrior.accountId) : null;

          return {
            ...update,
            warrior: warrior
              ? {
                  _id: warrior._id,
                  name: warrior.name,
                  profilePhoto: warrior.profilePhoto,
                }
              : null,
            updatedByName: updater?.name || "Unknown",
            accountName: account?.name || "Unknown",
          };
        })
    );

    return enrichedUpdates.filter((u) => u.warrior !== null);
  },
});

// Get status update counts by type for analytics
export const getStatusStats = query({
  args: { warriorId: v.id("warriors") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) return null;

    const warrior = await ctx.db.get(args.warriorId);
    if (!warrior || warrior.accountId !== account._id) return null;

    const statusUpdates = await ctx.db
      .query("statusUpdates")
      .withIndex("by_warrior", (q) => q.eq("warriorId", args.warriorId))
      .collect();

    const stats = {
      total: statusUpdates.length,
      byStatus: {
        thriving: 0,
        stable: 0,
        struggling: 0,
        hospitalized: 0,
        needsSupport: 0,
        feather: 0,
      },
    };

    for (const update of statusUpdates) {
      stats.byStatus[update.status]++;
    }

    return stats;
  },
});
