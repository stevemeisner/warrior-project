import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id, Doc } from "./_generated/dataModel";
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

    // Create notifications for caregivers who follow this warrior
    const caregiverRelations = await ctx.db
      .query("caregivers")
      .withIndex("by_account", (q) => q.eq("accountId", warrior.accountId))
      .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
      .collect();

    for (const relation of caregiverRelations) {
      await ctx.runMutation(internal.notifications.createNotification, {
        accountId: relation.caregiverAccountId,
        type: "statusChange",
        title: "Status update",
        message: `${warrior.name}'s status changed to ${args.status}`,
        relatedAccountId: account._id,
        relatedWarriorId: args.warriorId,
      });

      // Send email if caregiver has emailStatusChanges enabled
      const caregiverAccount = await ctx.db.get(relation.caregiverAccountId);
      if (
        caregiverAccount?.email &&
        caregiverAccount._id !== account._id &&
        (caregiverAccount.notificationPreferences?.emailStatusChanges ?? true)
      ) {
        await ctx.scheduler.runAfter(0, internal.email.sendStatusChangeEmail, {
          toEmail: caregiverAccount.email,
          warriorName: warrior.name,
          status: args.status,
          context: args.context,
        });
      }
    }

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

    // Check if viewer is a connection (caregiver relation in either direction)
    let isConnection = false;
    if (!hasFullAccess && userId) {
      const viewerAccount = await ctx.db
        .query("accounts")
        .withIndex("by_authId", (q) => q.eq("authId", userId))
        .first();

      if (viewerAccount) {
        // Check if viewer is a caregiver for the warrior's owner
        const asCaregiverForOwner = await ctx.db
          .query("caregivers")
          .withIndex("by_caregiver", (q) =>
            q.eq("caregiverAccountId", viewerAccount._id)
          )
          .filter((q) =>
            q.and(
              q.eq(q.field("accountId"), warrior.accountId),
              q.eq(q.field("inviteStatus"), "accepted")
            )
          )
          .first();

        // Check if warrior's owner is a caregiver for the viewer
        const ownerAsCaregiverForViewer = await ctx.db
          .query("caregivers")
          .withIndex("by_caregiver", (q) =>
            q.eq("caregiverAccountId", warrior.accountId)
          )
          .filter((q) =>
            q.and(
              q.eq(q.field("accountId"), viewerAccount._id),
              q.eq(q.field("inviteStatus"), "accepted")
            )
          )
          .first();

        isConnection = !!(asCaregiverForOwner || ownerAsCaregiverForViewer);
      }
    }

    // If not owner/caregiver, filter by visibility
    const visibleUpdates = hasFullAccess
      ? statusUpdates
      : statusUpdates.filter((u) =>
          u.visibility === "public" || (isConnection && u.visibility === "connections")
        );

    // Get updater info (dedup lookups)
    const uniqueUpdaterIds = [...new Set(visibleUpdates.map((u) => u.updatedBy))];
    const updaterMap = new Map<string, Doc<"accounts">>();
    for (const id of uniqueUpdaterIds) {
      const u = await ctx.db.get(id);
      if (u) updaterMap.set(id, u);
    }

    const updatesWithInfo = visibleUpdates.map((update) => {
      const updater = updaterMap.get(update.updatedBy);
      return {
        ...update,
        updatedByName: updater?.name || "Unknown",
      };
    });

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
    // Take a larger batch to ensure enough public results after filtering
    const desiredCount = args.limit || 20;
    const recentUpdates = await ctx.db
      .query("statusUpdates")
      .withIndex("by_created")
      .order("desc")
      .take(desiredCount * 10);

    // Filter by visibility
    const publicUpdates = recentUpdates
      .filter((u) => u.visibility === "public")
      .slice(0, desiredCount);

    // Dedup all entity lookups
    const warriorIds = [...new Set(publicUpdates.map((u) => u.warriorId))];
    const updaterIds = [...new Set(publicUpdates.map((u) => u.updatedBy))];

    const warriorMap = new Map<string, Doc<"warriors">>();
    for (const id of warriorIds) {
      const w = await ctx.db.get(id);
      if (w) warriorMap.set(id, w);
    }

    // Collect all account IDs (updaters + warrior owners) and fetch once
    const allAccountIds = new Set<Id<"accounts">>(updaterIds);
    for (const w of warriorMap.values()) {
      allAccountIds.add(w.accountId);
    }

    const accountMap = new Map<string, Doc<"accounts">>();
    for (const id of allAccountIds) {
      const a = await ctx.db.get(id);
      if (a) accountMap.set(id, a);
    }

    const enrichedUpdates = publicUpdates.map((update) => {
      const warrior = warriorMap.get(update.warriorId);
      const updater = accountMap.get(update.updatedBy);
      const ownerAccount = warrior ? accountMap.get(warrior.accountId) : null;

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
        accountName: ownerAccount?.name || "Unknown",
      };
    });

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
