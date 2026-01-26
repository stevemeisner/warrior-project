import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";
import { permissionLevels } from "./schema";

// Get caregivers for the current account (family viewing their caregivers)
export const getMyCaregivers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) return [];

    const caregivers = await ctx.db
      .query("caregivers")
      .withIndex("by_account", (q) => q.eq("accountId", account._id))
      .collect();

    // Get caregiver account details
    const caregiversWithDetails = await Promise.all(
      caregivers.map(async (caregiver) => {
        const caregiverAccount = await ctx.db.get(caregiver.caregiverAccountId);
        return {
          ...caregiver,
          caregiverAccount: caregiverAccount
            ? {
                _id: caregiverAccount._id,
                name: caregiverAccount.name,
                email: caregiverAccount.email,
                profilePhoto: caregiverAccount.profilePhoto,
              }
            : null,
        };
      })
    );

    return caregiversWithDetails;
  },
});

// Get families the current caregiver is caring for
export const getMyFamilies = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) return [];

    const caregiverRelations = await ctx.db
      .query("caregivers")
      .withIndex("by_caregiver", (q) => q.eq("caregiverAccountId", account._id))
      .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
      .collect();

    // Get family account details and their warriors
    const familiesWithDetails = await Promise.all(
      caregiverRelations.map(async (relation) => {
        const familyAccount = await ctx.db.get(relation.accountId);
        const warriors = await ctx.db
          .query("warriors")
          .withIndex("by_account", (q) => q.eq("accountId", relation.accountId))
          .collect();

        return {
          ...relation,
          familyAccount: familyAccount
            ? {
                _id: familyAccount._id,
                name: familyAccount.name,
                email: familyAccount.email,
                profilePhoto: familyAccount.profilePhoto,
              }
            : null,
          warriors,
        };
      })
    );

    return familiesWithDetails;
  },
});

// Get pending caregiver invites for the current user
export const getMyPendingInvites = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) return [];

    // Check for invites by email
    const invitesByEmail = await ctx.db
      .query("caregivers")
      .withIndex("by_invite_email", (q) => q.eq("inviteEmail", account.email))
      .filter((q) => q.eq(q.field("inviteStatus"), "pending"))
      .collect();

    // Get family account details
    const invitesWithDetails = await Promise.all(
      invitesByEmail.map(async (invite) => {
        const familyAccount = await ctx.db.get(invite.accountId);
        return {
          ...invite,
          familyAccount: familyAccount
            ? {
                _id: familyAccount._id,
                name: familyAccount.name,
                profilePhoto: familyAccount.profilePhoto,
              }
            : null,
        };
      })
    );

    return invitesWithDetails;
  },
});

// Invite a caregiver by email
export const inviteCaregiver = mutation({
  args: {
    email: v.string(),
    permissions: permissionLevels,
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
      throw new Error("Only family accounts can invite caregivers");
    }

    // Check if already invited
    const existingInvite = await ctx.db
      .query("caregivers")
      .withIndex("by_invite_email", (q) => q.eq("inviteEmail", args.email))
      .filter((q) => q.eq(q.field("accountId"), account._id))
      .first();

    if (existingInvite) {
      throw new Error("This person has already been invited");
    }

    // Check if the caregiver already has an account
    const caregiverAccount = await ctx.db
      .query("accounts")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    const caregiverId = await ctx.db.insert("caregivers", {
      accountId: account._id,
      caregiverAccountId: caregiverAccount?._id || account._id, // Placeholder if no account yet
      permissions: args.permissions,
      inviteStatus: "pending",
      inviteEmail: args.email,
      invitedAt: Date.now(),
    });

    // TODO: Send email notification via Resend

    return caregiverId;
  },
});

// Accept a caregiver invite
export const acceptInvite = mutation({
  args: { caregiverId: v.id("caregivers") },
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

    const invite = await ctx.db.get(args.caregiverId);
    if (!invite) {
      throw new Error("Invite not found");
    }

    if (invite.inviteEmail !== account.email) {
      throw new Error("This invite is not for you");
    }

    if (invite.inviteStatus !== "pending") {
      throw new Error("This invite has already been responded to");
    }

    await ctx.db.patch(args.caregiverId, {
      caregiverAccountId: account._id,
      inviteStatus: "accepted",
      acceptedAt: Date.now(),
    });

    return args.caregiverId;
  },
});

// Decline a caregiver invite
export const declineInvite = mutation({
  args: { caregiverId: v.id("caregivers") },
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

    const invite = await ctx.db.get(args.caregiverId);
    if (!invite) {
      throw new Error("Invite not found");
    }

    if (invite.inviteEmail !== account.email) {
      throw new Error("This invite is not for you");
    }

    if (invite.inviteStatus !== "pending") {
      throw new Error("This invite has already been responded to");
    }

    await ctx.db.patch(args.caregiverId, {
      inviteStatus: "declined",
    });

    return args.caregiverId;
  },
});

// Update caregiver permissions (family only)
export const updateCaregiverPermissions = mutation({
  args: {
    caregiverId: v.id("caregivers"),
    permissions: permissionLevels,
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

    const caregiver = await ctx.db.get(args.caregiverId);
    if (!caregiver) {
      throw new Error("Caregiver not found");
    }

    if (caregiver.accountId !== account._id) {
      throw new Error("Not authorized to update this caregiver");
    }

    await ctx.db.patch(args.caregiverId, {
      permissions: args.permissions,
    });

    return args.caregiverId;
  },
});

// Remove a caregiver (family only)
export const removeCaregiver = mutation({
  args: { caregiverId: v.id("caregivers") },
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

    const caregiver = await ctx.db.get(args.caregiverId);
    if (!caregiver) {
      throw new Error("Caregiver not found");
    }

    if (caregiver.accountId !== account._id) {
      throw new Error("Not authorized to remove this caregiver");
    }

    await ctx.db.delete(args.caregiverId);

    return args.caregiverId;
  },
});
