import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";
import { accountRoles, authProviders, visibilitySettings } from "./schema";

// Get auth user info (for Google OAuth onboarding)
export const getAuthUserInfo = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    // Query the auth users table for email/name
    const user = await ctx.db.get(userId);
    return user;
  },
});

// Get the currently authenticated user's account
export const getCurrentAccount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    return account;
  },
});

// Get an account by ID (returns public fields only for other users)
export const getAccount = query({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);

    const account = await ctx.db.get(args.accountId);
    if (!account) return null;

    // If viewing own account, return all fields
    if (userId) {
      const viewerAccount = await ctx.db
        .query("accounts")
        .withIndex("by_authId", (q) => q.eq("authId", userId))
        .first();

      if (viewerAccount?._id === account._id) {
        return account;
      }
    }

    // For other users, return only public profile fields
    return {
      _id: account._id,
      name: account.name,
      role: account.role,
      profilePhoto: account.profilePhoto,
      location: account.privacySettings?.showLocation ? account.location : undefined,
      createdAt: account.createdAt,
      // Exclude: email, authId, authProvider, privacySettings, notificationPreferences
    };
  },
});

// Get an account by email (authenticated users only, returns public fields for others)
export const getAccountByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null; // Require authentication

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!account) return null;

    // If viewing own account, return all fields
    const viewerAccount = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (viewerAccount?._id === account._id) {
      return account;
    }

    // For other users, return only public profile fields (minimal for caregiver invite flow)
    return {
      _id: account._id,
      name: account.name,
      profilePhoto: account.profilePhoto,
      // Exclude most fields to prevent email enumeration abuse
    };
  },
});

// Create a new account (called after auth signup)
export const createAccount = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: accountRoles,
    authProvider: authProviders,
    profilePhoto: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if account already exists
    const existingAccount = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (existingAccount) {
      throw new Error("Account already exists");
    }

    const now = Date.now();

    const accountId = await ctx.db.insert("accounts", {
      email: args.email,
      name: args.name,
      role: args.role,
      authProvider: args.authProvider,
      authId: userId,
      profilePhoto: args.profilePhoto,
      privacySettings: {
        showLocation: true,
        showEmail: false,
        defaultVisibility: "public",
      },
      notificationPreferences: {
        emailStatusChanges: true,
        emailNewMessages: true,
        emailSupportRequests: true,
        inAppStatusChanges: true,
        inAppNewMessages: true,
        inAppSupportRequests: true,
      },
      createdAt: now,
      updatedAt: now,
    });

    return accountId;
  },
});

// Mark onboarding as complete
export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) throw new Error("Account not found");

    await ctx.db.patch(account._id, {
      onboardingComplete: true,
      updatedAt: Date.now(),
    });

    return account._id;
  },
});

// Update account profile
export const updateAccount = mutation({
  args: {
    name: v.optional(v.string()),
    profilePhoto: v.optional(v.string()),
    location: v.optional(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
      })
    ),
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

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.profilePhoto !== undefined) updates.profilePhoto = args.profilePhoto;
    if (args.location !== undefined) updates.location = args.location;

    await ctx.db.patch(account._id, updates);

    return account._id;
  },
});

// Update privacy settings
export const updatePrivacySettings = mutation({
  args: {
    showLocation: v.optional(v.boolean()),
    showEmail: v.optional(v.boolean()),
    defaultVisibility: v.optional(visibilitySettings),
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

    const currentSettings = account.privacySettings || {
      showLocation: true,
      showEmail: false,
      defaultVisibility: "public" as const,
    };

    await ctx.db.patch(account._id, {
      privacySettings: {
        showLocation: args.showLocation ?? currentSettings.showLocation,
        showEmail: args.showEmail ?? currentSettings.showEmail,
        defaultVisibility: args.defaultVisibility ?? currentSettings.defaultVisibility,
      },
      updatedAt: Date.now(),
    });

    return account._id;
  },
});

// Update notification preferences
export const updateNotificationPreferences = mutation({
  args: {
    emailStatusChanges: v.optional(v.boolean()),
    emailNewMessages: v.optional(v.boolean()),
    emailSupportRequests: v.optional(v.boolean()),
    inAppStatusChanges: v.optional(v.boolean()),
    inAppNewMessages: v.optional(v.boolean()),
    inAppSupportRequests: v.optional(v.boolean()),
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

    const currentPrefs = account.notificationPreferences || {
      emailStatusChanges: true,
      emailNewMessages: true,
      emailSupportRequests: true,
      inAppStatusChanges: true,
      inAppNewMessages: true,
      inAppSupportRequests: true,
    };

    await ctx.db.patch(account._id, {
      notificationPreferences: {
        emailStatusChanges: args.emailStatusChanges ?? currentPrefs.emailStatusChanges,
        emailNewMessages: args.emailNewMessages ?? currentPrefs.emailNewMessages,
        emailSupportRequests: args.emailSupportRequests ?? currentPrefs.emailSupportRequests,
        inAppStatusChanges: args.inAppStatusChanges ?? currentPrefs.inAppStatusChanges,
        inAppNewMessages: args.inAppNewMessages ?? currentPrefs.inAppNewMessages,
        inAppSupportRequests: args.inAppSupportRequests ?? currentPrefs.inAppSupportRequests,
      },
      updatedAt: Date.now(),
    });

    return account._id;
  },
});
