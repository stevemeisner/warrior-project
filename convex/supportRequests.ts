import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import { checkRateLimit } from "./rateLimit";

const helpTypeValues = [
  "meals",
  "transportation",
  "childcare",
  "emotional",
  "financial",
  "medical",
  "other",
] as const;

// Create a support request
export const createSupportRequest = mutation({
  args: {
    warriorId: v.optional(v.id("warriors")),
    helpTypes: v.array(v.string()),
    description: v.optional(v.string()),
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
      throw new Error("Only family accounts can create support requests");
    }

    if (args.helpTypes.length === 0) {
      throw new Error("At least one help type is required");
    }

    const invalidTypes = args.helpTypes.filter(
      (t) => !(helpTypeValues as readonly string[]).includes(t)
    );
    if (invalidTypes.length > 0) {
      throw new Error(`Invalid help types: ${invalidTypes.join(", ")}`);
    }

    if (args.description && args.description.length > 5000) {
      throw new Error("Description must be 5000 characters or less");
    }

    // Rate limit check
    await checkRateLimit(ctx, "createSupportRequest", account._id);

    // If warrior specified, verify ownership
    if (args.warriorId) {
      const warrior = await ctx.db.get(args.warriorId);
      if (!warrior || warrior.accountId !== account._id) {
        throw new Error("Warrior not found or not yours");
      }
    }

    const now = Date.now();

    const requestId = await ctx.db.insert("supportRequests", {
      accountId: account._id,
      warriorId: args.warriorId,
      isActive: true,
      helpTypes: args.helpTypes,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });

    // Notify caregivers about the support request
    const caregiverRelations = await ctx.db
      .query("caregivers")
      .withIndex("by_account", (q) => q.eq("accountId", account._id))
      .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
      .collect();

    for (const relation of caregiverRelations) {
      await ctx.runMutation(internal.notifications.createNotification, {
        accountId: relation.caregiverAccountId,
        type: "supportRequest",
        title: "Support request",
        message: `${account.name} is asking for help: ${args.helpTypes.join(", ")}`,
        relatedAccountId: account._id,
      });

      // Send email if caregiver has emailSupportRequests enabled
      const caregiverAccount = await ctx.db.get(relation.caregiverAccountId);
      if (
        caregiverAccount?.email &&
        (caregiverAccount.notificationPreferences?.emailSupportRequests ?? true)
      ) {
        await ctx.scheduler.runAfter(0, internal.email.sendSupportRequestEmail, {
          toEmail: caregiverAccount.email,
          familyName: account.name,
          helpTypes: args.helpTypes,
          location: account.location
            ? [account.location.city, account.location.state].filter(Boolean).join(", ") || undefined
            : undefined,
        });
      }
    }

    return requestId;
  },
});

// Get my support requests (for families)
export const getMySupportRequests = query({
  args: {
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) return [];

    let requests;
    if (args.activeOnly) {
      requests = await ctx.db
        .query("supportRequests")
        .withIndex("by_account_and_active", (q) =>
          q.eq("accountId", account._id).eq("isActive", true)
        )
        .collect();
    } else {
      requests = await ctx.db
        .query("supportRequests")
        .withIndex("by_account", (q) => q.eq("accountId", account._id))
        .collect();
    }

    // Enrich with warrior info
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const warrior = request.warriorId
          ? await ctx.db.get(request.warriorId)
          : null;
        return {
          ...request,
          warriorName: warrior?.name,
        };
      })
    );

    return enrichedRequests.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get support requests from families I care for (for caregivers)
export const getAvailableSupportRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) return [];

    // Get families this caregiver is connected to
    const caregiverRelations = await ctx.db
      .query("caregivers")
      .withIndex("by_caregiver", (q) => q.eq("caregiverAccountId", account._id))
      .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
      .collect();

    const familyIds = caregiverRelations.map((r) => r.accountId);

    // Get active support requests per family using composite index
    const relevantRequests = [];
    for (const familyId of familyIds) {
      const requests = await ctx.db
        .query("supportRequests")
        .withIndex("by_account_and_active", (q) =>
          q.eq("accountId", familyId).eq("isActive", true)
        )
        .collect();
      relevantRequests.push(...requests);
    }

    // Enrich with family and warrior info
    const enrichedRequests = await Promise.all(
      relevantRequests.map(async (request) => {
        const familyAccount = await ctx.db.get(request.accountId);
        const warrior = request.warriorId
          ? await ctx.db.get(request.warriorId)
          : null;
        return {
          ...request,
          familyName: familyAccount?.name || "Unknown",
          familyPhoto: familyAccount?.profilePhoto,
          warriorName: warrior?.name,
        };
      })
    );

    return enrichedRequests.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Update a support request
export const updateSupportRequest = mutation({
  args: {
    requestId: v.id("supportRequests"),
    helpTypes: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
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

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Support request not found");
    }

    if (request.accountId !== account._id) {
      throw new Error("Not authorized to update this request");
    }

    if (args.description && args.description.length > 5000) {
      throw new Error("Description must be 5000 characters or less");
    }

    if (args.helpTypes !== undefined && args.helpTypes.length === 0) {
      throw new Error("At least one help type is required");
    }

    if (args.helpTypes !== undefined) {
      const invalidTypes = args.helpTypes.filter(
        (t) => !(helpTypeValues as readonly string[]).includes(t)
      );
      if (invalidTypes.length > 0) {
        throw new Error(`Invalid help types: ${invalidTypes.join(", ")}`);
      }
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.helpTypes !== undefined) updates.helpTypes = args.helpTypes;
    if (args.description !== undefined) updates.description = args.description;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.requestId, updates);

    return args.requestId;
  },
});

// Delete a support request
export const deleteSupportRequest = mutation({
  args: { requestId: v.id("supportRequests") },
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

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Support request not found");
    }

    if (request.accountId !== account._id) {
      throw new Error("Not authorized to delete this request");
    }

    await ctx.db.delete(request._id);

    return args.requestId;
  },
});

// Get count of active support requests (for dashboard stats)
export const getActiveCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return 0;

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) return 0;

    if (account.role === "family") {
      // Family: count their own active requests
      const requests = await ctx.db
        .query("supportRequests")
        .withIndex("by_account_and_active", (q) =>
          q.eq("accountId", account._id).eq("isActive", true)
        )
        .collect();
      return requests.length;
    } else {
      // Caregiver: count active requests from families they care for
      const relations = await ctx.db
        .query("caregivers")
        .withIndex("by_caregiver", (q) => q.eq("caregiverAccountId", account._id))
        .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
        .collect();

      const familyIds = relations.map((r) => r.accountId);
      let count = 0;
      for (const familyId of familyIds) {
        const requests = await ctx.db
          .query("supportRequests")
          .withIndex("by_account_and_active", (q) =>
            q.eq("accountId", familyId).eq("isActive", true)
          )
          .collect();
        count += requests.length;
      }
      return count;
    }
  },
});
