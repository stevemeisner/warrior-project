import { convexTest } from "convex-test";
import { describe, expect, it, beforeEach } from "vitest";
import { api } from "./_generated/api";
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

// ── Helpers ─────────────────────────────────────────────────────────────────

async function makeAdmin(t: ReturnType<typeof convexTest>, accountId: any) {
  await t.run(async (ctx) => {
    await ctx.db.patch(accountId, { isAdmin: true });
  });
}

async function createCommentLike(
  t: ReturnType<typeof convexTest>,
  commentId: any,
  accountId: any,
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("commentLikes", {
      commentId,
      accountId,
      createdAt: Date.now(),
    });
  });
}

async function createThreadView(
  t: ReturnType<typeof convexTest>,
  threadId: any,
  accountId: any,
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("threadViews", {
      threadId,
      accountId,
      lastViewedAt: Date.now(),
    });
  });
}

// ── isCurrentUserAdmin ──────────────────────────────────────────────────────

describe("isCurrentUserAdmin", () => {
  it("returns false for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.moderation.isCurrentUserAdmin, {});
    expect(result).toBe(false);
  });

  it("returns false for non-admin user", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await createAccount(t, { name: "Regular User" });
    const result = await asUser.query(api.moderation.isCurrentUserAdmin, {});
    expect(result).toBe(false);
  });

  it("returns true for admin user", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Admin" });
    await makeAdmin(t, accountId);
    const result = await asUser.query(api.moderation.isCurrentUserAdmin, {});
    expect(result).toBe(true);
  });
});

// ── submitReport ────────────────────────────────────────────────────────────

describe("submitReport", () => {
  it("successfully submits a report", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await createAccount(t, { name: "Reporter" });
    const { threadId } = await createThread(t);

    const reportId = await asUser.mutation(api.moderation.submitReport, {
      targetType: "thread",
      targetId: threadId,
      reason: "Inappropriate content",
    });

    expect(reportId).toBeDefined();

    // Verify the report was created
    const report = await t.run(async (ctx) => ctx.db.get(reportId));
    expect(report).not.toBeNull();
    expect(report!.reason).toBe("Inappropriate content");
    expect(report!.status).toBe("pending");
    expect(report!.targetType).toBe("thread");
    expect(report!.targetId).toBe(threadId);
  });

  it("throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { threadId } = await createThread(t);

    await expect(
      t.mutation(api.moderation.submitReport, {
        targetType: "thread",
        targetId: threadId,
        reason: "Spam",
      }),
    ).rejects.toThrow("Not authenticated");
  });

  it("throws for duplicate report on the same target", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await createAccount(t, { name: "Reporter" });
    const { threadId } = await createThread(t);

    // First report succeeds
    await asUser.mutation(api.moderation.submitReport, {
      targetType: "thread",
      targetId: threadId,
      reason: "Spam",
    });

    // Duplicate report throws
    await expect(
      asUser.mutation(api.moderation.submitReport, {
        targetType: "thread",
        targetId: threadId,
        reason: "Still spam",
      }),
    ).rejects.toThrow("You have already reported this content");
  });

  it("throws for reason exceeding 1000 characters", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await createAccount(t, { name: "Reporter" });
    const { threadId } = await createThread(t);

    const longReason = "x".repeat(1001);

    await expect(
      asUser.mutation(api.moderation.submitReport, {
        targetType: "thread",
        targetId: threadId,
        reason: longReason,
      }),
    ).rejects.toThrow("Report reason must be 1000 characters or less");
  });
});

// ── getPendingReports ───────────────────────────────────────────────────────

describe("getPendingReports", () => {
  it("throws for non-admin user", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await createAccount(t, { name: "Regular User" });

    await expect(
      asUser.query(api.moderation.getPendingReports, {}),
    ).rejects.toThrow("Admin access required");
  });

  it("returns pending reports with reporter info for admin", async () => {
    const t = convexTest(schema, modules);
    const reporter = await createAccount(t, { name: "Reporter Alice" });
    const admin = await createAccount(t, { name: "Admin Bob" });
    await makeAdmin(t, admin.accountId);
    const { threadId } = await createThread(t);

    // Submit a report
    await reporter.asUser.mutation(api.moderation.submitReport, {
      targetType: "thread",
      targetId: threadId,
      reason: "Offensive content",
    });

    const reports = await admin.asUser.query(api.moderation.getPendingReports, {});
    expect(reports).toHaveLength(1);
    expect(reports[0].reason).toBe("Offensive content");
    expect(reports[0].status).toBe("pending");
    expect(reports[0].reporterName).toBe("Reporter Alice");
  });
});

// ── reviewReport ────────────────────────────────────────────────────────────

describe("reviewReport", () => {
  it("throws for non-admin user", async () => {
    const t = convexTest(schema, modules);
    const reporter = await createAccount(t, { name: "Reporter" });
    const nonAdmin = await createAccount(t, { name: "Non-Admin" });
    const { threadId } = await createThread(t);

    const reportId = await reporter.asUser.mutation(api.moderation.submitReport, {
      targetType: "thread",
      targetId: threadId,
      reason: "Bad content",
    });

    await expect(
      nonAdmin.asUser.mutation(api.moderation.reviewReport, {
        reportId,
        status: "reviewed",
      }),
    ).rejects.toThrow("Admin access required");
  });

  it("marks report as reviewed for admin", async () => {
    const t = convexTest(schema, modules);
    const reporter = await createAccount(t, { name: "Reporter" });
    const admin = await createAccount(t, { name: "Admin" });
    await makeAdmin(t, admin.accountId);
    const { threadId } = await createThread(t);

    const reportId = await reporter.asUser.mutation(api.moderation.submitReport, {
      targetType: "thread",
      targetId: threadId,
      reason: "Bad content",
    });

    await admin.asUser.mutation(api.moderation.reviewReport, {
      reportId,
      status: "reviewed",
    });

    const report = await t.run(async (ctx) => ctx.db.get(reportId));
    expect(report!.status).toBe("reviewed");
    expect(report!.reviewedBy).toBe(admin.accountId);
  });

  it("throws when reportId does not exist", async () => {
    const t = convexTest(schema, modules);
    const admin = await createAccount(t, { name: "Admin" });
    await makeAdmin(t, admin.accountId);

    // Fabricate a non-existent report ID by creating then deleting a report
    const reporter = await createAccount(t, { name: "Reporter" });
    const { threadId } = await createThread(t);
    const reportId = await reporter.asUser.mutation(api.moderation.submitReport, {
      targetType: "thread",
      targetId: threadId,
      reason: "Temp report",
    });
    await t.run(async (ctx) => {
      await ctx.db.delete(reportId);
    });

    await expect(
      admin.asUser.mutation(api.moderation.reviewReport, {
        reportId,
        status: "reviewed",
      }),
    ).rejects.toThrow("Report not found");
  });

  it("marks report as dismissed for admin", async () => {
    const t = convexTest(schema, modules);
    const reporter = await createAccount(t, { name: "Reporter" });
    const admin = await createAccount(t, { name: "Admin" });
    await makeAdmin(t, admin.accountId);
    const { threadId } = await createThread(t);

    const reportId = await reporter.asUser.mutation(api.moderation.submitReport, {
      targetType: "thread",
      targetId: threadId,
      reason: "Not that bad",
    });

    await admin.asUser.mutation(api.moderation.reviewReport, {
      reportId,
      status: "dismissed",
    });

    const report = await t.run(async (ctx) => ctx.db.get(reportId));
    expect(report!.status).toBe("dismissed");
  });
});

// ── togglePinThread ─────────────────────────────────────────────────────────

describe("togglePinThread", () => {
  it("throws for non-admin user", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await createAccount(t, { name: "Regular User" });
    const { threadId } = await createThread(t);

    await expect(
      asUser.mutation(api.moderation.togglePinThread, { threadId }),
    ).rejects.toThrow("Admin access required");
  });

  it("toggles thread pinned state for admin", async () => {
    const t = convexTest(schema, modules);
    const admin = await createAccount(t, { name: "Admin" });
    await makeAdmin(t, admin.accountId);
    const { threadId } = await createThread(t, { isPinned: false });

    // Pin it
    const result1 = await admin.asUser.mutation(api.moderation.togglePinThread, {
      threadId,
    });
    expect(result1.isPinned).toBe(true);

    const thread1 = await t.run(async (ctx) => ctx.db.get(threadId));
    expect(thread1!.isPinned).toBe(true);

    // Unpin it
    const result2 = await admin.asUser.mutation(api.moderation.togglePinThread, {
      threadId,
    });
    expect(result2.isPinned).toBe(false);

    const thread2 = await t.run(async (ctx) => ctx.db.get(threadId));
    expect(thread2!.isPinned).toBe(false);
  });
});

// ── toggleLockThread ────────────────────────────────────────────────────────

describe("toggleLockThread", () => {
  it("throws for non-admin user", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await createAccount(t, { name: "Regular User" });
    const { threadId } = await createThread(t);

    await expect(
      asUser.mutation(api.moderation.toggleLockThread, { threadId }),
    ).rejects.toThrow("Admin access required");
  });

  it("toggles thread locked state for admin", async () => {
    const t = convexTest(schema, modules);
    const admin = await createAccount(t, { name: "Admin" });
    await makeAdmin(t, admin.accountId);
    const { threadId } = await createThread(t, { isLocked: false });

    // Lock it
    const result1 = await admin.asUser.mutation(api.moderation.toggleLockThread, {
      threadId,
    });
    expect(result1.isLocked).toBe(true);

    const thread1 = await t.run(async (ctx) => ctx.db.get(threadId));
    expect(thread1!.isLocked).toBe(true);

    // Unlock it
    const result2 = await admin.asUser.mutation(api.moderation.toggleLockThread, {
      threadId,
    });
    expect(result2.isLocked).toBe(false);

    const thread2 = await t.run(async (ctx) => ctx.db.get(threadId));
    expect(thread2!.isLocked).toBe(false);
  });
});

// ── adminDeleteThread ───────────────────────────────────────────────────────

describe("adminDeleteThread", () => {
  it("throws for non-admin user", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await createAccount(t, { name: "Regular User" });
    const { threadId } = await createThread(t);

    await expect(
      asUser.mutation(api.moderation.adminDeleteThread, { threadId }),
    ).rejects.toThrow("Admin access required");
  });

  it("deletes thread, comments, commentLikes, and threadViews", async () => {
    const t = convexTest(schema, modules);
    const admin = await createAccount(t, { name: "Admin" });
    await makeAdmin(t, admin.accountId);
    const author = await createAccount(t, { name: "Author" });
    const liker = await createAccount(t, { name: "Liker" });

    const { threadId } = await createThread(t, { authorId: author.accountId });
    const { commentId: comment1Id } = await createComment(t, {
      threadId,
      authorId: author.accountId,
    });
    const { commentId: comment2Id } = await createComment(t, {
      threadId,
      authorId: author.accountId,
    });

    // Add likes to comments
    const like1Id = await createCommentLike(t, comment1Id, liker.accountId);
    const like2Id = await createCommentLike(t, comment2Id, liker.accountId);

    // Add thread views
    const viewId = await createThreadView(t, threadId, liker.accountId);

    // Delete the thread
    await admin.asUser.mutation(api.moderation.adminDeleteThread, { threadId });

    // Verify everything is gone
    const thread = await t.run(async (ctx) => ctx.db.get(threadId));
    expect(thread).toBeNull();

    const c1 = await t.run(async (ctx) => ctx.db.get(comment1Id));
    expect(c1).toBeNull();

    const c2 = await t.run(async (ctx) => ctx.db.get(comment2Id));
    expect(c2).toBeNull();

    const l1 = await t.run(async (ctx) => ctx.db.get(like1Id));
    expect(l1).toBeNull();

    const l2 = await t.run(async (ctx) => ctx.db.get(like2Id));
    expect(l2).toBeNull();

    const v = await t.run(async (ctx) => ctx.db.get(viewId));
    expect(v).toBeNull();
  });
});

// ── adminDeleteComment ──────────────────────────────────────────────────────

describe("adminDeleteComment", () => {
  it("throws for non-admin user", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await createAccount(t, { name: "Regular User" });
    const { commentId } = await createComment(t);

    await expect(
      asUser.mutation(api.moderation.adminDeleteComment, { commentId }),
    ).rejects.toThrow("Admin access required");
  });

  it("recursively deletes comment, children, and likes", async () => {
    const t = convexTest(schema, modules);
    const admin = await createAccount(t, { name: "Admin" });
    await makeAdmin(t, admin.accountId);
    const author = await createAccount(t, { name: "Author" });
    const liker = await createAccount(t, { name: "Liker" });

    const { threadId } = await createThread(t, {
      authorId: author.accountId,
      commentCount: 0,
    });

    // Parent comment
    const { commentId: parentId } = await createComment(t, {
      threadId,
      authorId: author.accountId,
    });

    // Child comment
    const { commentId: childId } = await createComment(t, {
      threadId,
      authorId: author.accountId,
      parentId,
    });

    // Grandchild comment
    const { commentId: grandchildId } = await createComment(t, {
      threadId,
      authorId: author.accountId,
      parentId: childId,
    });

    // A sibling comment that should survive
    const { commentId: siblingId } = await createComment(t, {
      threadId,
      authorId: author.accountId,
    });

    // Add likes
    const parentLikeId = await createCommentLike(t, parentId, liker.accountId);
    const childLikeId = await createCommentLike(t, childId, liker.accountId);
    const grandchildLikeId = await createCommentLike(t, grandchildId, liker.accountId);

    // Delete the parent comment
    await admin.asUser.mutation(api.moderation.adminDeleteComment, {
      commentId: parentId,
    });

    // Parent and descendants should be gone
    const parent = await t.run(async (ctx) => ctx.db.get(parentId));
    expect(parent).toBeNull();

    const child = await t.run(async (ctx) => ctx.db.get(childId));
    expect(child).toBeNull();

    const grandchild = await t.run(async (ctx) => ctx.db.get(grandchildId));
    expect(grandchild).toBeNull();

    // All likes on deleted comments should be gone
    const pl = await t.run(async (ctx) => ctx.db.get(parentLikeId));
    expect(pl).toBeNull();

    const cl = await t.run(async (ctx) => ctx.db.get(childLikeId));
    expect(cl).toBeNull();

    const gl = await t.run(async (ctx) => ctx.db.get(grandchildLikeId));
    expect(gl).toBeNull();

    // Sibling should still exist
    const sibling = await t.run(async (ctx) => ctx.db.get(siblingId));
    expect(sibling).not.toBeNull();

    // Thread comment count should be updated (only sibling remains)
    const thread = await t.run(async (ctx) => ctx.db.get(threadId));
    expect(thread!.commentCount).toBe(1);
  });
});
