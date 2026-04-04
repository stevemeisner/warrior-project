import type { TestConvex } from "convex-test";
import type { Id } from "./_generated/dataModel";
import type schema from "./schema";

type T = TestConvex<typeof schema>;

let counter = 0;
function nextId() {
  return ++counter;
}

export function resetFactoryCounter() {
  counter = 0;
}

// ── Helper: create auth identity and account ─────────────────────────────────

/**
 * Creates a full auth user + account, returning the account ID and
 * a `withIdentity` wrapper for authenticated calls.
 *
 * auth.getUserId(ctx) reads identity.subject, splits by "|", takes [0] as userId.
 * So we set subject = `${authUserId}|${sessionId}`.
 */
export async function createAccount(
  t: T,
  overrides: {
    name?: string;
    email?: string;
    role?: "family" | "caregiver";
    authProvider?: "google" | "email";
    profilePhoto?: string;
    location?: {
      latitude: number;
      longitude: number;
      city?: string;
      state?: string;
    };
    privacySettings?: {
      showLocation: boolean;
      showEmail: boolean;
      defaultVisibility: "public" | "connections" | "private";
    };
    notificationPreferences?: {
      emailStatusChanges: boolean;
      emailNewMessages: boolean;
      emailSupportRequests: boolean;
      inAppStatusChanges: boolean;
      inAppNewMessages: boolean;
      inAppSupportRequests: boolean;
    };
  } = {},
) {
  const n = nextId();
  const now = Date.now();

  // 1. Create auth user in the users table (from authTables)
  const authUserId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  // 2. Create auth session (needed for the subject format)
  const sessionId = await t.run(async (ctx) => {
    return await ctx.db.insert("authSessions", {
      userId: authUserId,
      expirationTime: now + 1000 * 60 * 60 * 24 * 30,
    });
  });

  // 3. Create the application account
  const accountId = await t.run(async (ctx) => {
    return await ctx.db.insert("accounts", {
      email: overrides.email ?? `test${n}@example.com`,
      name: overrides.name ?? `Test User ${n}`,
      role: overrides.role ?? "family",
      authProvider: overrides.authProvider ?? "email",
      authId: authUserId,
      profilePhoto: overrides.profilePhoto,
      location: overrides.location,
      privacySettings: overrides.privacySettings ?? {
        showLocation: true,
        showEmail: false,
        defaultVisibility: "public",
      },
      notificationPreferences: overrides.notificationPreferences ?? {
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
  });

  // 4. Create identity for authenticated test calls
  // auth.getUserId splits subject by "|" and returns first part as userId
  const asUser = t.withIdentity({
    subject: `${authUserId}|${sessionId}`,
  });

  return { accountId, authUserId, sessionId, asUser };
}

// ── warriors ─────────────────────────────────────────────────────────────────

export async function createWarrior(
  t: T,
  overrides: {
    accountId?: Id<"accounts">;
    name?: string;
    dateOfBirth?: string;
    condition?: string;
    currentStatus?:
      | "thriving"
      | "stable"
      | "struggling"
      | "hospitalized"
      | "needsSupport"
      | "feather";
    isFeather?: boolean;
    profilePhoto?: string;
    bio?: string;
    visibility?: "public" | "connections" | "private";
  } = {},
) {
  const n = nextId();
  const now = Date.now();

  // Create account if not provided
  let accountId = overrides.accountId;
  if (!accountId) {
    const result = await createAccount(t);
    accountId = result.accountId;
  }

  const warriorId = await t.run(async (ctx) => {
    return await ctx.db.insert("warriors", {
      accountId: accountId!,
      name: overrides.name ?? `Warrior ${n}`,
      dateOfBirth: overrides.dateOfBirth,
      condition: overrides.condition,
      currentStatus: overrides.currentStatus ?? "stable",
      isFeather: overrides.isFeather ?? false,
      profilePhoto: overrides.profilePhoto,
      bio: overrides.bio,
      visibility: overrides.visibility ?? "public",
      createdAt: now,
      updatedAt: now,
    });
  });

  return { warriorId, accountId };
}

// ── caregivers ───────────────────────────────────────────────────────────────

export async function createCaregiverRelation(
  t: T,
  overrides: {
    accountId?: Id<"accounts">;
    caregiverAccountId?: Id<"accounts">;
    permissions?: "viewOnly" | "canMessage" | "canUpdate" | "fullAccess";
    inviteStatus?: "pending" | "accepted" | "declined";
    inviteEmail?: string;
  } = {},
) {
  const now = Date.now();

  const accountId =
    overrides.accountId ?? (await createAccount(t)).accountId;
  const caregiverAccountId =
    overrides.caregiverAccountId ??
    (await createAccount(t, { role: "caregiver" })).accountId;

  // Get caregiver email for inviteEmail
  let inviteEmail = overrides.inviteEmail;
  if (!inviteEmail) {
    const caregiverAcc = await t.run(async (ctx) => ctx.db.get(caregiverAccountId));
    inviteEmail = caregiverAcc?.email ?? "caregiver@example.com";
  }

  const caregiverId = await t.run(async (ctx) => {
    return await ctx.db.insert("caregivers", {
      accountId,
      caregiverAccountId,
      permissions: overrides.permissions ?? "viewOnly",
      inviteStatus: overrides.inviteStatus ?? "accepted",
      inviteEmail,
      invitedAt: now,
      acceptedAt: overrides.inviteStatus === "pending" ? undefined : now,
    });
  });

  return { caregiverId, accountId, caregiverAccountId };
}

// ── status updates ───────────────────────────────────────────────────────────

export async function createStatusUpdate(
  t: T,
  overrides: {
    warriorId?: Id<"warriors">;
    status?:
      | "thriving"
      | "stable"
      | "struggling"
      | "hospitalized"
      | "needsSupport"
      | "feather";
    context?: string;
    updatedBy?: Id<"accounts">;
    visibility?: "public" | "connections" | "private";
  } = {},
) {
  const now = Date.now();

  let warriorId = overrides.warriorId;
  let updatedBy = overrides.updatedBy;

  if (!warriorId) {
    const result = await createWarrior(t);
    warriorId = result.warriorId;
    updatedBy = updatedBy ?? result.accountId;
  }

  if (!updatedBy) {
    // Get warrior's account
    const warrior = await t.run(async (ctx) => ctx.db.get(warriorId!));
    updatedBy = warrior!.accountId;
  }

  const statusUpdateId = await t.run(async (ctx) => {
    return await ctx.db.insert("statusUpdates", {
      warriorId: warriorId!,
      status: overrides.status ?? "stable",
      context: overrides.context,
      updatedBy: updatedBy!,
      visibility: overrides.visibility ?? "public",
      createdAt: now,
    });
  });

  return { statusUpdateId, warriorId, updatedBy };
}

// ── conversations ────────────────────────────────────────────────────────────

export async function createConversation(
  t: T,
  overrides: {
    participants?: Id<"accounts">[];
    type?: "dm" | "group";
    name?: string;
    caregiverAccess?: boolean;
    lastMessageAt?: number;
  } = {},
) {
  const now = Date.now();

  let participants = overrides.participants;
  if (!participants || participants.length === 0) {
    const user1 = await createAccount(t);
    const user2 = await createAccount(t);
    participants = [user1.accountId, user2.accountId];
  }

  const type = overrides.type ?? (participants!.length > 2 ? "group" : "dm");
  const dmKey = type === "dm" ? [...participants!].sort().join("_") : undefined;

  const conversationId = await t.run(async (ctx) => {
    const convId = await ctx.db.insert("conversations", {
      participants: participants!,
      type,
      name: overrides.name,
      dmKey,
      caregiverAccess: overrides.caregiverAccess ?? true,
      lastMessageAt: overrides.lastMessageAt ?? now,
      createdAt: now,
    });

    // Populate junction table
    for (const pId of participants!) {
      await ctx.db.insert("conversationParticipants", {
        conversationId: convId,
        accountId: pId,
      });
    }

    return convId;
  });

  return { conversationId, participants };
}

// ── messages ─────────────────────────────────────────────────────────────────

export async function createMessage(
  t: T,
  overrides: {
    conversationId?: Id<"conversations">;
    senderId?: Id<"accounts">;
    content?: string;
    readBy?: Id<"accounts">[];
  } = {},
) {
  const n = nextId();
  const now = Date.now();

  let conversationId = overrides.conversationId;
  let senderId = overrides.senderId;

  if (!conversationId) {
    const result = await createConversation(t);
    conversationId = result.conversationId;
    senderId = senderId ?? result.participants[0];
  }

  if (!senderId) {
    const conv = await t.run(async (ctx) => ctx.db.get(conversationId!));
    senderId = conv!.participants[0];
  }

  const messageId = await t.run(async (ctx) => {
    return await ctx.db.insert("messages", {
      conversationId: conversationId!,
      senderId: senderId!,
      content: overrides.content ?? `Test message ${n}`,
      readBy: overrides.readBy ?? [senderId!],
      createdAt: now,
    });
  });

  return { messageId, conversationId, senderId };
}

// ── unread counts ───────────────────────────────────────────────────────────

export async function createUnreadCount(
  t: T,
  overrides: {
    conversationId: Id<"conversations">;
    accountId: Id<"accounts">;
    count: number;
  },
) {
  const unreadCountId = await t.run(async (ctx) => {
    return await ctx.db.insert("unreadCounts", {
      conversationId: overrides.conversationId,
      accountId: overrides.accountId,
      count: overrides.count,
    });
  });

  return { unreadCountId };
}

// ── threads ──────────────────────────────────────────────────────────────────

export async function createThread(
  t: T,
  overrides: {
    authorId?: Id<"accounts">;
    title?: string;
    content?: string;
    category?: "general" | "support" | "resources" | "celebrations" | "questions";
    viewCount?: number;
    commentCount?: number;
    isPinned?: boolean;
    isLocked?: boolean;
  } = {},
) {
  const n = nextId();
  const now = Date.now();

  const authorId =
    overrides.authorId ?? (await createAccount(t)).accountId;

  const threadId = await t.run(async (ctx) => {
    return await ctx.db.insert("threads", {
      authorId,
      title: overrides.title ?? `Thread ${n}`,
      content: overrides.content ?? `Content for thread ${n}`,
      category: overrides.category ?? "general",
      viewCount: overrides.viewCount ?? 0,
      commentCount: overrides.commentCount ?? 0,
      isPinned: overrides.isPinned ?? false,
      isLocked: overrides.isLocked ?? false,
      createdAt: now,
      updatedAt: now,
    });
  });

  return { threadId, authorId };
}

// ── comments ─────────────────────────────────────────────────────────────────

export async function createComment(
  t: T,
  overrides: {
    threadId?: Id<"threads">;
    parentId?: Id<"comments">;
    authorId?: Id<"accounts">;
    content?: string;
    likeCount?: number;
  } = {},
) {
  const n = nextId();
  const now = Date.now();

  const threadId =
    overrides.threadId ?? (await createThread(t)).threadId;
  const authorId =
    overrides.authorId ?? (await createAccount(t)).accountId;

  const commentId = await t.run(async (ctx) => {
    return await ctx.db.insert("comments", {
      threadId,
      parentId: overrides.parentId,
      authorId,
      content: overrides.content ?? `Comment ${n}`,
      likeCount: overrides.likeCount ?? 0,
      createdAt: now,
      updatedAt: now,
    });
  });

  return { commentId, threadId, authorId };
}

// ── notifications ────────────────────────────────────────────────────────────

export async function createNotification(
  t: T,
  overrides: {
    accountId?: Id<"accounts">;
    type?:
      | "statusChange"
      | "newMessage"
      | "supportRequest"
      | "caregiverInvite"
      | "threadReply"
      | "mention";
    title?: string;
    message?: string;
    relatedAccountId?: Id<"accounts">;
    relatedWarriorId?: Id<"warriors">;
    relatedConversationId?: Id<"conversations">;
    relatedThreadId?: Id<"threads">;
    isRead?: boolean;
  } = {},
) {
  const n = nextId();
  const now = Date.now();

  const accountId =
    overrides.accountId ?? (await createAccount(t)).accountId;

  const notificationId = await t.run(async (ctx) => {
    return await ctx.db.insert("notifications", {
      accountId,
      type: overrides.type ?? "statusChange",
      title: overrides.title ?? `Notification ${n}`,
      message: overrides.message ?? `Notification message ${n}`,
      relatedAccountId: overrides.relatedAccountId,
      relatedWarriorId: overrides.relatedWarriorId,
      relatedConversationId: overrides.relatedConversationId,
      relatedThreadId: overrides.relatedThreadId,
      isRead: overrides.isRead ?? false,
      createdAt: now,
    });
  });

  return { notificationId, accountId };
}
