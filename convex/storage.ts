import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

async function validateImageUpload(ctx: MutationCtx, storageId: Id<"_storage">) {
  const metadata = await ctx.db.system.get(storageId);
  if (!metadata) {
    throw new Error("Uploaded file not found");
  }
  if (!metadata.contentType || !ALLOWED_IMAGE_TYPES.includes(metadata.contentType)) {
    // Clean up the invalid file
    await ctx.storage.delete(storageId);
    throw new Error(
      `Invalid file type: ${metadata.contentType || "unknown"}. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`
    );
  }
}

// Generate an upload URL for Convex file storage
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.storage.generateUploadUrl();
  },
});

// Get a serving URL for a stored file (authenticated only)
export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

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

    await validateImageUpload(ctx, args.storageId);

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

    await validateImageUpload(ctx, args.storageId);

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
