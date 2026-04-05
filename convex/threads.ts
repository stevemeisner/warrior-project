import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import { threadCategories } from "./schema";
import { checkRateLimit } from "./rateLimit";

// Get threads with optional filtering
export const getThreads = query({
  args: {
    category: v.optional(threadCategories),
    limit: v.optional(v.number()),
    sortBy: v.optional(v.union(v.literal("recent"), v.literal("popular"))),
  },
  handler: async (ctx, args) => {
    let query;

    if (args.category) {
      query = ctx.db
        .query("threads")
        .withIndex("by_category", (q) => q.eq("category", args.category!));
    } else {
      query = ctx.db
        .query("threads")
        .withIndex("by_pinned_and_created");
    }

    const threads = await query.order("desc").take(Math.min(args.limit || 50, 200));

    // Sort by popularity if requested
    let sortedThreads = threads;
    if (args.sortBy === "popular") {
      sortedThreads = [...threads].sort(
        (a, b) => b.viewCount + b.commentCount * 2 - (a.viewCount + a.commentCount * 2)
      );
    }

    // Enrich with author info
    const enrichedThreads = await Promise.all(
      sortedThreads.map(async (thread) => {
        const author = await ctx.db.get(thread.authorId);
        return {
          ...thread,
          authorName: author?.name || "Unknown",
          authorPhoto: author?.profilePhoto,
        };
      })
    );

    return enrichedThreads;
  },
});

// Get a single thread with comments
export const getThread = query({
  args: {
    threadId: v.id("threads"),
    commentLimit: v.optional(v.number()), // Default 200, can request more
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) return null;

    const author = await ctx.db.get(thread.authorId);

    // Get comments for this thread
    const limit = args.commentLimit || 200;
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_thread_and_created", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .take(limit + 1); // Fetch one extra to check if there are more

    const hasMoreComments = comments.length > limit;
    const displayComments = hasMoreComments ? comments.slice(0, limit) : comments;

    // Enrich comments with author info
    const enrichedComments = await Promise.all(
      displayComments.map(async (comment) => {
        const commentAuthor = await ctx.db.get(comment.authorId);
        return {
          ...comment,
          authorName: commentAuthor?.name || "Unknown",
          authorPhoto: commentAuthor?.profilePhoto,
        };
      })
    );

    // Build nested structure
    const rootComments = enrichedComments.filter((c) => !c.parentId);
    const childComments = enrichedComments.filter((c) => c.parentId);

    const buildNestedComments = (parentId: string): typeof enrichedComments => {
      return childComments
        .filter((c) => c.parentId?.toString() === parentId)
        .map((comment) => ({
          ...comment,
          replies: buildNestedComments(comment._id.toString()),
        }));
    };

    const nestedComments = rootComments.map((comment) => ({
      ...comment,
      replies: buildNestedComments(comment._id.toString()),
    }));

    return {
      ...thread,
      authorName: author?.name || "Unknown",
      authorPhoto: author?.profilePhoto,
      comments: nestedComments,
      hasMoreComments,
      totalCommentCount: thread.commentCount,
    };
  },
});

// Create a new thread
export const createThread = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    category: threadCategories,
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

    if (args.title.length > 200) {
      throw new Error("Title must be 200 characters or less");
    }
    if (args.content.length > 10000) {
      throw new Error("Content must be 10,000 characters or less");
    }

    // Rate limit check
    await checkRateLimit(ctx, "createThread", account._id);

    const now = Date.now();

    const threadId = await ctx.db.insert("threads", {
      authorId: account._id,
      title: args.title,
      content: args.content,
      category: args.category,
      viewCount: 0,
      commentCount: 0,
      isPinned: false,
      isLocked: false,
      createdAt: now,
      updatedAt: now,
    });

    return threadId;
  },
});

// Update a thread
export const updateThread = mutation({
  args: {
    threadId: v.id("threads"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    category: v.optional(threadCategories),
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

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error("Thread not found");
    }

    if (thread.authorId !== account._id) {
      throw new Error("Not authorized to update this thread");
    }

    if (thread.isLocked) {
      throw new Error("Cannot edit a locked thread");
    }

    if (args.title !== undefined && args.title.length > 200) {
      throw new Error("Title must be 200 characters or less");
    }
    if (args.content !== undefined && args.content.length > 10000) {
      throw new Error("Content must be 10,000 characters or less");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) updates.title = args.title;
    if (args.content !== undefined) updates.content = args.content;
    if (args.category !== undefined) updates.category = args.category;

    await ctx.db.patch(args.threadId, updates);

    return args.threadId;
  },
});

// Delete a thread
export const deleteThread = mutation({
  args: { threadId: v.id("threads") },
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

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error("Thread not found");
    }

    if (thread.authorId !== account._id) {
      throw new Error("Not authorized to delete this thread");
    }

    if (thread.isLocked) {
      throw new Error("Cannot delete a locked thread");
    }

    // Delete all comments and their likes
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();

    for (const comment of comments) {
      const likes = await ctx.db
        .query("commentLikes")
        .withIndex("by_comment", (q) => q.eq("commentId", comment._id))
        .collect();
      for (const like of likes) {
        await ctx.db.delete(like._id);
      }
      await ctx.db.delete(comment._id);
    }

    // Delete thread views
    const views = await ctx.db
      .query("threadViews")
      .withIndex("by_thread_and_account", (q) => q.eq("threadId", args.threadId))
      .collect();
    for (const view of views) {
      await ctx.db.delete(view._id);
    }

    // Delete the thread
    await ctx.db.delete(args.threadId);

    return args.threadId;
  },
});

// Increment view count (deduplicated per user — each user counts once per thread)
export const incrementViewCount = mutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) return null;

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error("Thread not found");
    }

    // Dedup: only count once per user per thread
    const existingView = await ctx.db
      .query("threadViews")
      .withIndex("by_thread_and_account", (q) =>
        q.eq("threadId", args.threadId).eq("accountId", account._id)
      )
      .first();

    if (existingView) {
      // Already viewed — update timestamp but don't increment count
      await ctx.db.patch(existingView._id, { lastViewedAt: Date.now() });
      return args.threadId;
    }

    // First view by this user — increment and record
    await ctx.db.patch(args.threadId, {
      viewCount: thread.viewCount + 1,
    });

    await ctx.db.insert("threadViews", {
      threadId: args.threadId,
      accountId: account._id,
      lastViewedAt: Date.now(),
    });

    return args.threadId;
  },
});

// Add a comment
export const addComment = mutation({
  args: {
    threadId: v.id("threads"),
    parentId: v.optional(v.id("comments")),
    content: v.string(),
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

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error("Thread not found");
    }

    if (thread.isLocked) {
      throw new Error("This thread is locked");
    }

    // Validate parentId belongs to this thread
    if (args.parentId) {
      const parentComment = await ctx.db.get(args.parentId);
      if (!parentComment) {
        throw new Error("Parent comment not found");
      }
      if (parentComment.threadId !== args.threadId) {
        throw new Error("Parent comment does not belong to this thread");
      }
    }

    if (args.content.length > 5000) {
      throw new Error("Comment must be 5,000 characters or less");
    }

    // Rate limit check
    await checkRateLimit(ctx, "addComment", account._id);

    const now = Date.now();

    const commentId = await ctx.db.insert("comments", {
      threadId: args.threadId,
      parentId: args.parentId,
      authorId: account._id,
      content: args.content,
      likeCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Update thread comment count
    await ctx.db.patch(args.threadId, {
      commentCount: thread.commentCount + 1,
      updatedAt: now,
    });

    // Create notification for thread author (if not the same as commenter)
    if (thread.authorId !== account._id) {
      await ctx.runMutation(internal.notifications.createNotification, {
        accountId: thread.authorId,
        type: "threadReply",
        title: "New comment on your thread",
        message: `${account.name} commented on "${thread.title}"`,
        relatedAccountId: account._id,
        relatedThreadId: args.threadId,
      });
    }

    return commentId;
  },
});

// Update a comment
export const updateComment = mutation({
  args: {
    commentId: v.id("comments"),
    content: v.string(),
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

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.authorId !== account._id) {
      throw new Error("Not authorized to update this comment");
    }

    // Check if the parent thread is locked
    const thread = await ctx.db.get(comment.threadId);
    if (thread?.isLocked) {
      throw new Error("Cannot edit a comment on a locked thread");
    }

    if (args.content.length > 5000) {
      throw new Error("Comment must be 5,000 characters or less");
    }

    await ctx.db.patch(args.commentId, {
      content: args.content,
      updatedAt: Date.now(),
    });

    return args.commentId;
  },
});

// Delete a comment
export const deleteComment = mutation({
  args: { commentId: v.id("comments") },
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

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.authorId !== account._id) {
      throw new Error("Not authorized to delete this comment");
    }

    const thread = await ctx.db.get(comment.threadId);

    // Delete child comments recursively (including their likes)
    const deleteChildComments = async (parentId: typeof args.commentId) => {
      const children = await ctx.db
        .query("comments")
        .withIndex("by_parent", (q) => q.eq("parentId", parentId))
        .collect();

      for (const child of children) {
        await deleteChildComments(child._id);
        const childLikes = await ctx.db
          .query("commentLikes")
          .withIndex("by_comment", (q) => q.eq("commentId", child._id))
          .collect();
        for (const like of childLikes) {
          await ctx.db.delete(like._id);
        }
        await ctx.db.delete(child._id);
      }
    };

    await deleteChildComments(args.commentId);

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
      const remainingComments = await ctx.db
        .query("comments")
        .withIndex("by_thread", (q) => q.eq("threadId", comment.threadId))
        .collect();

      await ctx.db.patch(comment.threadId, {
        commentCount: remainingComments.length,
      });
    }

    return args.commentId;
  },
});

// Like/unlike a comment (toggles)
export const likeComment = mutation({
  args: { commentId: v.id("comments") },
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

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    // Check if already liked
    const existingLike = await ctx.db
      .query("commentLikes")
      .withIndex("by_comment_and_account", (q) =>
        q.eq("commentId", args.commentId).eq("accountId", account._id)
      )
      .first();

    if (existingLike) {
      // Unlike: remove the like record
      await ctx.db.delete(existingLike._id);
    } else {
      // Like: create a like record
      await ctx.db.insert("commentLikes", {
        commentId: args.commentId,
        accountId: account._id,
        createdAt: Date.now(),
      });
    }

    // Derive count from source of truth to avoid drift
    const likes = await ctx.db
      .query("commentLikes")
      .withIndex("by_comment", (q) => q.eq("commentId", args.commentId))
      .collect();
    await ctx.db.patch(args.commentId, { likeCount: likes.length });

    return { liked: !existingLike };
  },
});
