import { convexTest } from "convex-test";
import { describe, expect, it, beforeEach } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";
import {
  createAccount,
  createThread,
  createComment,
  resetFactoryCounter,
} from "./test.factories";

beforeEach(() => {
  resetFactoryCounter();
});

// ─── getThreads ──────────────────────────────────────────────────────────────

describe("getThreads", () => {
  it("returns all threads when no filters applied", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });

    await createThread(t, { authorId: accountId, title: "Thread A", category: "general" });
    await createThread(t, { authorId: accountId, title: "Thread B", category: "support" });

    const threads = await t.query(api.threads.getThreads, {});
    expect(threads).toHaveLength(2);
  });

  it("filters by category", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });

    await createThread(t, { authorId: accountId, category: "general" });
    await createThread(t, { authorId: accountId, category: "support" });
    await createThread(t, { authorId: accountId, category: "general" });

    const threads = await t.query(api.threads.getThreads, { category: "general" });
    expect(threads).toHaveLength(2);
    expect(threads.every((t: { category: string }) => t.category === "general")).toBe(true);
  });

  it("sorts by popular (viewCount + commentCount*2)", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });

    await createThread(t, { authorId: accountId, title: "Low", viewCount: 1, commentCount: 0 });
    await createThread(t, { authorId: accountId, title: "High", viewCount: 10, commentCount: 5 });
    await createThread(t, { authorId: accountId, title: "Medium", viewCount: 5, commentCount: 2 });

    const threads = await t.query(api.threads.getThreads, { sortBy: "popular" });
    expect(threads[0].title).toBe("High"); // 10 + 5*2 = 20
    expect(threads[1].title).toBe("Medium"); // 5 + 2*2 = 9
    expect(threads[2].title).toBe("Low"); // 1 + 0*2 = 1
  });

  it("respects limit", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });

    await createThread(t, { authorId: accountId });
    await createThread(t, { authorId: accountId });
    await createThread(t, { authorId: accountId });

    const threads = await t.query(api.threads.getThreads, { limit: 2 });
    expect(threads).toHaveLength(2);
  });

  it("enriches with author info", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });

    await createThread(t, { authorId: accountId, title: "My Thread" });

    const threads = await t.query(api.threads.getThreads, {});
    expect(threads[0].authorName).toBe("Alice");
  });

  it("works without authentication", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });
    await createThread(t, { authorId: accountId });

    const threads = await t.query(api.threads.getThreads, {});
    expect(threads).toHaveLength(1);
  });
});

// ─── getThread ───────────────────────────────────────────────────────────────

describe("getThread", () => {
  it("returns thread with nested comments structure", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const { threadId } = await createThread(t, { authorId: accountId, title: "My Thread" });

    // Root comment
    const { commentId: rootComment } = await createComment(t, {
      threadId,
      authorId: bobId,
      content: "Root comment",
    });

    // Reply to root
    await createComment(t, {
      threadId,
      parentId: rootComment,
      authorId: accountId,
      content: "Reply to root",
    });

    const result = await t.query(api.threads.getThread, { threadId });
    expect(result).not.toBeNull();
    expect(result!.title).toBe("My Thread");
    expect(result!.authorName).toBe("Alice");
    expect(result!.comments).toHaveLength(1); // One root comment
    expect(result!.comments[0].content).toBe("Root comment");
    expect(result!.comments[0].replies).toHaveLength(1);
    expect(result!.comments[0].replies[0].content).toBe("Reply to root");
  });

  it("returns null for non-existent thread", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });
    const { threadId } = await createThread(t, { authorId: accountId });

    // Delete the thread
    await t.run(async (ctx) => ctx.db.delete(threadId));

    const result = await t.query(api.threads.getThread, { threadId });
    expect(result).toBeNull();
  });

  it("enriches comments with author info", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });
    const { threadId } = await createThread(t, { authorId: accountId });

    await createComment(t, { threadId, authorId: accountId, content: "My comment" });

    const result = await t.query(api.threads.getThread, { threadId });
    expect(result!.comments[0].authorName).toBe("Alice");
  });

  it("respects commentLimit", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });
    const { threadId } = await createThread(t, { authorId: accountId });

    await createComment(t, { threadId, authorId: accountId, content: "Comment 1" });
    await createComment(t, { threadId, authorId: accountId, content: "Comment 2" });
    await createComment(t, { threadId, authorId: accountId, content: "Comment 3" });

    const result = await t.query(api.threads.getThread, { threadId, commentLimit: 2 });
    expect(result!.comments.length).toBeLessThanOrEqual(2);
    expect(result!.hasMoreComments).toBe(true);
  });
});

// ─── createThread ────────────────────────────────────────────────────────────

describe("createThread", () => {
  it("creates a thread with correct defaults", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });

    const threadId = await asUser.mutation(api.threads.createThread, {
      title: "My Thread",
      content: "Thread content here",
      category: "general",
    });

    expect(threadId).toBeDefined();

    const thread = await t.run(async (ctx) => ctx.db.get(threadId));
    expect(thread!.title).toBe("My Thread");
    expect(thread!.content).toBe("Thread content here");
    expect(thread!.category).toBe("general");
    expect(thread!.authorId).toEqual(accountId);
    expect(thread!.viewCount).toBe(0);
    expect(thread!.commentCount).toBe(0);
    expect(thread!.isPinned).toBe(false);
    expect(thread!.isLocked).toBe(false);
  });

  it("throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.threads.createThread, {
        title: "My Thread",
        content: "Content",
        category: "general",
      })
    ).rejects.toThrow("Not authenticated");
  });
});

// ─── updateThread ────────────────────────────────────────────────────────────

describe("updateThread", () => {
  it("author can update their thread", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });
    const { threadId } = await createThread(t, { authorId: accountId, title: "Original" });

    await asUser.mutation(api.threads.updateThread, {
      threadId,
      title: "Updated Title",
      content: "Updated Content",
      category: "support",
    });

    const thread = await t.run(async (ctx) => ctx.db.get(threadId));
    expect(thread!.title).toBe("Updated Title");
    expect(thread!.content).toBe("Updated Content");
    expect(thread!.category).toBe("support");
  });

  it("partial update only changes specified fields", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });
    const { threadId } = await createThread(t, {
      authorId: accountId,
      title: "Original",
      content: "Original Content",
      category: "general",
    });

    await asUser.mutation(api.threads.updateThread, {
      threadId,
      title: "New Title",
    });

    const thread = await t.run(async (ctx) => ctx.db.get(threadId));
    expect(thread!.title).toBe("New Title");
    expect(thread!.content).toBe("Original Content");
    expect(thread!.category).toBe("general");
  });

  it("non-author is rejected", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });
    const { asUser: asBob } = await createAccount(t, { name: "Bob" });
    const { threadId } = await createThread(t, { authorId: accountId });

    await expect(
      asBob.mutation(api.threads.updateThread, {
        threadId,
        title: "Hijacked!",
      })
    ).rejects.toThrow("Not authorized");
  });

  it("throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });
    const { threadId } = await createThread(t, { authorId: accountId });

    await expect(
      t.mutation(api.threads.updateThread, {
        threadId,
        title: "Updated",
      })
    ).rejects.toThrow("Not authenticated");
  });
});

// ─── deleteThread ────────────────────────────────────────────────────────────

describe("deleteThread", () => {
  it("author can delete their thread", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });
    const { threadId } = await createThread(t, { authorId: accountId });

    await asUser.mutation(api.threads.deleteThread, { threadId });

    const thread = await t.run(async (ctx) => ctx.db.get(threadId));
    expect(thread).toBeNull();
  });

  it("cascades delete to all comments", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });
    const { threadId } = await createThread(t, { authorId: accountId });

    await createComment(t, { threadId, authorId: accountId, content: "Comment 1" });
    await createComment(t, { threadId, authorId: accountId, content: "Comment 2" });

    await asUser.mutation(api.threads.deleteThread, { threadId });

    const comments = await t.run(async (ctx) => {
      return await ctx.db
        .query("comments")
        .withIndex("by_thread", (q) => q.eq("threadId", threadId))
        .collect();
    });

    expect(comments).toHaveLength(0);
  });

  it("non-author is rejected", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });
    const { asUser: asBob } = await createAccount(t, { name: "Bob" });
    const { threadId } = await createThread(t, { authorId: accountId });

    await expect(
      asBob.mutation(api.threads.deleteThread, { threadId })
    ).rejects.toThrow("Not authorized");
  });

  it("throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });
    const { threadId } = await createThread(t, { authorId: accountId });

    await expect(
      t.mutation(api.threads.deleteThread, { threadId })
    ).rejects.toThrow("Not authenticated");
  });
});

// ─── incrementViewCount ──────────────────────────────────────────────────────

describe("incrementViewCount", () => {
  it("increments view count for authenticated user", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });
    const { threadId } = await createThread(t, { authorId: accountId, viewCount: 5 });

    await asUser.mutation(api.threads.incrementViewCount, { threadId });

    const thread = await t.run(async (ctx) => ctx.db.get(threadId));
    expect(thread!.viewCount).toBe(6);
  });

  it("silently returns null for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });
    const { threadId } = await createThread(t, { authorId: accountId, viewCount: 5 });

    const result = await t.mutation(api.threads.incrementViewCount, { threadId });
    expect(result).toBeNull();

    // View count should not change
    const thread = await t.run(async (ctx) => ctx.db.get(threadId));
    expect(thread!.viewCount).toBe(5);
  });
});

// ─── addComment ──────────────────────────────────────────────────────────────

describe("addComment", () => {
  it("creates a root comment and increments commentCount", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });
    const { threadId } = await createThread(t, { authorId: accountId, commentCount: 0 });

    const commentId = await asUser.mutation(api.threads.addComment, {
      threadId,
      content: "Great post!",
    });

    expect(commentId).toBeDefined();

    const comment = await t.run(async (ctx) => ctx.db.get(commentId));
    expect(comment!.content).toBe("Great post!");
    expect(comment!.authorId).toEqual(accountId);
    expect(comment!.parentId).toBeUndefined();
    expect(comment!.likeCount).toBe(0);

    const thread = await t.run(async (ctx) => ctx.db.get(threadId));
    expect(thread!.commentCount).toBe(1);
  });

  it("creates a reply to an existing comment", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });
    const { threadId } = await createThread(t, { authorId: accountId });

    const { commentId: parentId } = await createComment(t, {
      threadId,
      authorId: accountId,
      content: "Root",
    });

    const replyId = await asUser.mutation(api.threads.addComment, {
      threadId,
      parentId,
      content: "Reply!",
    });

    const reply = await t.run(async (ctx) => ctx.db.get(replyId));
    expect(reply!.parentId).toEqual(parentId);
  });

  it("creates notification for thread author when commenter is different", async () => {
    const t = convexTest(schema, modules);
    const { accountId: authorId } = await createAccount(t, { name: "Alice" });
    const { accountId: commenterId, asUser: asCommenter } = await createAccount(t, {
      name: "Bob",
    });
    const { threadId } = await createThread(t, { authorId, title: "Alice's Thread" });

    await asCommenter.mutation(api.threads.addComment, {
      threadId,
      content: "Nice thread!",
    });

    const notifications = await t.run(async (ctx) => {
      return await ctx.db
        .query("notifications")
        .withIndex("by_account", (q) => q.eq("accountId", authorId))
        .collect();
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("threadReply");
    expect(notifications[0].relatedThreadId).toEqual(threadId);
    expect(notifications[0].message).toContain("Bob");
  });

  it("does not create notification when author comments on own thread", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });
    const { threadId } = await createThread(t, { authorId: accountId });

    await asUser.mutation(api.threads.addComment, {
      threadId,
      content: "Self-comment",
    });

    const notifications = await t.run(async (ctx) => {
      return await ctx.db
        .query("notifications")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect();
    });

    expect(notifications).toHaveLength(0);
  });

  it("rejects comment on locked thread", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });
    const { threadId } = await createThread(t, { authorId: accountId, isLocked: true });

    await expect(
      asUser.mutation(api.threads.addComment, {
        threadId,
        content: "Can't comment!",
      })
    ).rejects.toThrow("locked");
  });

  it("throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });
    const { threadId } = await createThread(t, { authorId: accountId });

    await expect(
      t.mutation(api.threads.addComment, {
        threadId,
        content: "Hello",
      })
    ).rejects.toThrow("Not authenticated");
  });
});

// ─── updateComment ───────────────────────────────────────────────────────────

describe("updateComment", () => {
  it("author can update their comment", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });
    const { threadId } = await createThread(t, { authorId: accountId });
    const { commentId } = await createComment(t, {
      threadId,
      authorId: accountId,
      content: "Original",
    });

    await asUser.mutation(api.threads.updateComment, {
      commentId,
      content: "Updated comment",
    });

    const comment = await t.run(async (ctx) => ctx.db.get(commentId));
    expect(comment!.content).toBe("Updated comment");
  });

  it("non-author is rejected", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });
    const { asUser: asBob } = await createAccount(t, { name: "Bob" });
    const { threadId } = await createThread(t, { authorId: accountId });
    const { commentId } = await createComment(t, {
      threadId,
      authorId: accountId,
      content: "Alice's comment",
    });

    await expect(
      asBob.mutation(api.threads.updateComment, {
        commentId,
        content: "Hijacked!",
      })
    ).rejects.toThrow("Not authorized");
  });

  it("throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });
    const { threadId } = await createThread(t, { authorId: accountId });
    const { commentId } = await createComment(t, {
      threadId,
      authorId: accountId,
    });

    await expect(
      t.mutation(api.threads.updateComment, {
        commentId,
        content: "Updated",
      })
    ).rejects.toThrow("Not authenticated");
  });
});

// ─── deleteComment ───────────────────────────────────────────────────────────

describe("deleteComment", () => {
  it("author can delete their comment", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });
    const { threadId } = await createThread(t, { authorId: accountId, commentCount: 1 });
    const { commentId } = await createComment(t, {
      threadId,
      authorId: accountId,
      content: "To delete",
    });

    await asUser.mutation(api.threads.deleteComment, { commentId });

    const comment = await t.run(async (ctx) => ctx.db.get(commentId));
    expect(comment).toBeNull();
  });

  it("recursively deletes child comments", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });
    const { threadId } = await createThread(t, { authorId: accountId, commentCount: 3 });

    const { commentId: rootId } = await createComment(t, {
      threadId,
      authorId: accountId,
      content: "Root",
    });
    const { commentId: childId } = await createComment(t, {
      threadId,
      parentId: rootId,
      authorId: accountId,
      content: "Child",
    });
    await createComment(t, {
      threadId,
      parentId: childId,
      authorId: accountId,
      content: "Grandchild",
    });

    await asUser.mutation(api.threads.deleteComment, { commentId: rootId });

    // All three should be deleted
    const remaining = await t.run(async (ctx) => {
      return await ctx.db
        .query("comments")
        .withIndex("by_thread", (q) => q.eq("threadId", threadId))
        .collect();
    });

    expect(remaining).toHaveLength(0);
  });

  it("updates thread commentCount after deletion", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });
    const { threadId } = await createThread(t, { authorId: accountId, commentCount: 2 });

    const { commentId: c1 } = await createComment(t, {
      threadId,
      authorId: accountId,
      content: "Keep",
    });
    const { commentId: c2 } = await createComment(t, {
      threadId,
      authorId: accountId,
      content: "Delete",
    });

    await asUser.mutation(api.threads.deleteComment, { commentId: c2 });

    const thread = await t.run(async (ctx) => ctx.db.get(threadId));
    expect(thread!.commentCount).toBe(1);
  });

  it("non-author is rejected", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });
    const { asUser: asBob } = await createAccount(t, { name: "Bob" });
    const { threadId } = await createThread(t, { authorId: accountId });
    const { commentId } = await createComment(t, {
      threadId,
      authorId: accountId,
    });

    await expect(
      asBob.mutation(api.threads.deleteComment, { commentId })
    ).rejects.toThrow("Not authorized");
  });

  it("throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });
    const { threadId } = await createThread(t, { authorId: accountId });
    const { commentId } = await createComment(t, {
      threadId,
      authorId: accountId,
    });

    await expect(
      t.mutation(api.threads.deleteComment, { commentId })
    ).rejects.toThrow("Not authenticated");
  });
});

// ─── likeComment ─────────────────────────────────────────────────────────────

describe("likeComment", () => {
  it("increments likeCount for authenticated user", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });
    const { threadId } = await createThread(t, { authorId: accountId });
    const { commentId } = await createComment(t, {
      threadId,
      authorId: accountId,
      likeCount: 3,
    });

    await asUser.mutation(api.threads.likeComment, { commentId });

    const comment = await t.run(async (ctx) => ctx.db.get(commentId));
    expect(comment!.likeCount).toBe(4);
  });

  it("throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });
    const { threadId } = await createThread(t, { authorId: accountId });
    const { commentId } = await createComment(t, { threadId, authorId: accountId });

    await expect(
      t.mutation(api.threads.likeComment, { commentId })
    ).rejects.toThrow("Not authenticated");
  });

  it("allows multiple likes (no deduplication)", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });
    const { threadId } = await createThread(t, { authorId: accountId });
    const { commentId } = await createComment(t, {
      threadId,
      authorId: accountId,
      likeCount: 0,
    });

    await asUser.mutation(api.threads.likeComment, { commentId });
    await asUser.mutation(api.threads.likeComment, { commentId });

    const comment = await t.run(async (ctx) => ctx.db.get(commentId));
    expect(comment!.likeCount).toBe(2);
  });
});
