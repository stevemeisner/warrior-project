import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Helper to check if the current user is an admin
async function requireAdmin(ctx: MutationCtx | QueryCtx) {
  const userId = await auth.getUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const account = await ctx.db
    .query("accounts")
    .withIndex("by_authId", (q) => q.eq("authId", userId))
    .first();

  if (!account) throw new Error("Account not found");
  if (!account.isAdmin) throw new Error("Admin access required");

  return account;
}

// Helper to get the current account
async function requireAuth(ctx: MutationCtx | QueryCtx) {
  const userId = await auth.getUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const account = await ctx.db
    .query("accounts")
    .withIndex("by_authId", (q) => q.eq("authId", userId))
    .first();

  if (!account) throw new Error("Account not found");
  return account;
}

// Submit a report
export const submitReport = mutation({
  args: {
    targetType: v.union(
      v.literal("thread"),
      v.literal("comment"),
      v.literal("account"),
      v.literal("message")
    ),
    targetId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const account = await requireAuth(ctx);

    if (args.reason.length > 1000) {
      throw new Error("Report reason must be 1000 characters or less");
    }

    // Check if user already reported this target
    const existingReport = await ctx.db
      .query("reports")
      .withIndex("by_reporter", (q) => q.eq("reporterId", account._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("targetType"), args.targetType),
          q.eq(q.field("targetId"), args.targetId)
        )
      )
      .first();

    if (existingReport) {
      throw new Error("You have already reported this content");
    }

    const reportId = await ctx.db.insert("reports", {
      reporterId: account._id,
      targetType: args.targetType,
      targetId: args.targetId,
      reason: args.reason,
      status: "pending",
      createdAt: Date.now(),
    });

    return reportId;
  },
});

// Admin: Get pending reports
export const getPendingReports = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const reports = await ctx.db
      .query("reports")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .take(args.limit || 50);

    // Enrich with reporter info
    const enriched = await Promise.all(
      reports.map(async (report) => {
        const reporter = await ctx.db.get(report.reporterId);
        return {
          ...report,
          reporterName: reporter?.name || "Unknown",
        };
      })
    );

    return enriched;
  },
});

// Admin: Review a report (mark as reviewed or dismissed)
export const reviewReport = mutation({
  args: {
    reportId: v.id("reports"),
    status: v.union(v.literal("reviewed"), v.literal("dismissed")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");

    await ctx.db.patch(args.reportId, {
      status: args.status,
      reviewedBy: admin._id,
    });

    return args.reportId;
  },
});

// Admin: Pin/unpin a thread
export const togglePinThread = mutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");

    await ctx.db.patch(args.threadId, {
      isPinned: !thread.isPinned,
    });

    return { isPinned: !thread.isPinned };
  },
});

// Admin: Lock/unlock a thread
export const toggleLockThread = mutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");

    await ctx.db.patch(args.threadId, {
      isLocked: !thread.isLocked,
    });

    return { isLocked: !thread.isLocked };
  },
});

// Admin: Delete a thread (with all comments)
export const adminDeleteThread = mutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");

    // Delete all comments
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();

    for (const comment of comments) {
      // Delete comment likes
      const likes = await ctx.db
        .query("commentLikes")
        .withIndex("by_comment", (q) => q.eq("commentId", comment._id))
        .collect();
      for (const like of likes) {
        await ctx.db.delete(like._id);
      }
      await ctx.db.delete(comment._id);
    }

    await ctx.db.delete(args.threadId);
    return args.threadId;
  },
});

// Admin: Delete a comment
export const adminDeleteComment = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    const thread = await ctx.db.get(comment.threadId);

    // Delete child comments recursively
    const deleteChildren = async (parentId: Id<"comments">) => {
      const children = await ctx.db
        .query("comments")
        .withIndex("by_parent", (q) => q.eq("parentId", parentId))
        .collect();

      for (const child of children) {
        await deleteChildren(child._id);
        const likes = await ctx.db
          .query("commentLikes")
          .withIndex("by_comment", (q) => q.eq("commentId", child._id))
          .collect();
        for (const like of likes) {
          await ctx.db.delete(like._id);
        }
        await ctx.db.delete(child._id);
      }
    };

    await deleteChildren(args.commentId);

    // Delete this comment's likes
    const likes = await ctx.db
      .query("commentLikes")
      .withIndex("by_comment", (q) => q.eq("commentId", args.commentId))
      .collect();
    for (const like of likes) {
      await ctx.db.delete(like._id);
    }

    await ctx.db.delete(args.commentId);

    // Update thread comment count
    if (thread) {
      const remaining = await ctx.db
        .query("comments")
        .withIndex("by_thread", (q) => q.eq("threadId", comment.threadId))
        .collect();

      await ctx.db.patch(comment.threadId, {
        commentCount: remaining.length,
      });
    }

    return args.commentId;
  },
});

// Check if current user is admin (for UI conditionals)
export const isCurrentUserAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return false;

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    return account?.isAdmin === true;
  },
});
