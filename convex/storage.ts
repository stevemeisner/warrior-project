import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

// Generate an upload URL for Convex file storage
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.storage.generateUploadUrl();
  },
});

// Get a serving URL for a stored file
export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Update account profile photo with stored file
export const updateAccountPhoto = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) throw new Error("Account not found");

    // Delete old stored photo if exists
    if (account.profilePhotoStorageId) {
      await ctx.storage.delete(account.profilePhotoStorageId);
    }

    // Get the URL for the new photo
    const url = await ctx.storage.getUrl(args.storageId);

    await ctx.db.patch(account._id, {
      profilePhotoStorageId: args.storageId,
      profilePhoto: url || undefined,
      updatedAt: Date.now(),
    });

    return account._id;
  },
});

// Update warrior profile photo with stored file
export const updateWarriorPhoto = mutation({
  args: {
    warriorId: v.id("warriors"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) throw new Error("Account not found");

    const warrior = await ctx.db.get(args.warriorId);
    if (!warrior) throw new Error("Warrior not found");

    // Check ownership or caregiver access
    if (warrior.accountId !== account._id) {
      const caregiverRelation = await ctx.db
        .query("caregivers")
        .withIndex("by_caregiver", (q) => q.eq("caregiverAccountId", account._id))
        .filter((q) => q.eq(q.field("accountId"), warrior.accountId))
        .first();

      if (
        !caregiverRelation ||
        caregiverRelation.inviteStatus !== "accepted" ||
        (caregiverRelation.permissions !== "canUpdate" &&
          caregiverRelation.permissions !== "fullAccess")
      ) {
        throw new Error("Not authorized to update this warrior's photo");
      }
    }

    // Delete old stored photo if exists
    if (warrior.profilePhotoStorageId) {
      await ctx.storage.delete(warrior.profilePhotoStorageId);
    }

    const url = await ctx.storage.getUrl(args.storageId);

    await ctx.db.patch(args.warriorId, {
      profilePhotoStorageId: args.storageId,
      profilePhoto: url || undefined,
      updatedAt: Date.now(),
    });

    return args.warriorId;
  },
});
