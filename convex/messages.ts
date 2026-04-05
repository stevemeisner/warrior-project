import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id, Doc } from "./_generated/dataModel";
import { auth } from "./auth";
import { isBlocked } from "./blockedUsers";
import { checkRateLimit } from "./rateLimit";

// Get all conversations for the current user (with pagination)
export const getMyConversations = query({
  args: {
    cursor: v.optional(v.number()), // lastMessageAt timestamp to paginate from
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const emptyResult = { conversations: [] as any[], nextCursor: undefined as number | undefined, hasMore: false };

    const userId = await auth.getUserId(ctx);
    if (!userId) return emptyResult;

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) return emptyResult;

    // Use junction table for O(1) membership lookup, then fetch conversations
    const limit = args.limit || 50;

    // Get all conversation IDs this user belongs to
    const memberships = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_account", (q) => q.eq("accountId", account._id))
      .collect();

    // Fetch conversations and sort by lastMessageAt
    const conversations = await Promise.all(
      memberships.map((m) => ctx.db.get(m.conversationId))
    );

    const validConversations = conversations
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => (b.lastMessageAt ?? b.createdAt) - (a.lastMessageAt ?? a.createdAt));

    // Apply cursor-based pagination
    const cursor = args.cursor;
    const afterCursor = cursor !== undefined
      ? validConversations.filter((c) => (c.lastMessageAt ?? c.createdAt) < cursor)
      : validConversations;

    const myConversations = afterCursor.slice(0, limit);

    // Dedup participant lookups across all conversations
    const allParticipantIds = [...new Set(myConversations.flatMap((c) => c.participants))];
    const participantMap = new Map<string, { _id: Id<"accounts">; name: string; profilePhoto?: string }>();
    for (const pId of allParticipantIds) {
      const p = await ctx.db.get(pId);
      if (p) participantMap.set(pId, { _id: p._id, name: p.name, profilePhoto: p.profilePhoto });
    }

    // Enrich with participant info and last message
    const enrichedConversations = await Promise.all(
      myConversations.map(async (conv) => {
        const participants = conv.participants
          .map((pId) => participantMap.get(pId) ?? null);

        // Get last message
        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("by_conversation_and_created", (q) =>
            q.eq("conversationId", conv._id)
          )
          .order("desc")
          .first();

        // Get unread count from denormalized table
        const unreadRecord = await ctx.db
          .query("unreadCounts")
          .withIndex("by_conversation_and_account", (q) =>
            q.eq("conversationId", conv._id).eq("accountId", account._id)
          )
          .first();
        const unreadCount = unreadRecord?.count ?? 0;

        return {
          ...conv,
          participants: participants.filter(Boolean),
          lastMessage: lastMessage
            ? {
                content:
                  lastMessage.content.length > 50
                    ? lastMessage.content.substring(0, 50) + "..."
                    : lastMessage.content,
                createdAt: lastMessage.createdAt,
              }
            : null,
          unreadCount,
        };
      })
    );

    // Return with pagination info
    const lastConv = myConversations[myConversations.length - 1];
    return {
      conversations: enrichedConversations,
      nextCursor: lastConv?.lastMessageAt ?? lastConv?.createdAt,
      hasMore: myConversations.length === limit,
    };
  },
});

// Get a single conversation with messages (with pagination for older messages)
export const getConversation = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
    beforeTimestamp: v.optional(v.number()), // Load messages before this timestamp
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) return null;

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    // Check if user is a participant
    if (!conversation.participants.includes(account._id)) {
      // Check if user is a caregiver with message access
      let hasAccess = false;
      for (const participantId of conversation.participants) {
        const caregiverRelation = await ctx.db
          .query("caregivers")
          .withIndex("by_caregiver", (q) => q.eq("caregiverAccountId", account._id))
          .filter((q) => q.eq(q.field("accountId"), participantId))
          .first();

        if (
          caregiverRelation?.inviteStatus === "accepted" &&
          conversation.caregiverAccess &&
          (caregiverRelation.permissions === "canMessage" ||
            caregiverRelation.permissions === "canUpdate" ||
            caregiverRelation.permissions === "fullAccess")
        ) {
          hasAccess = true;
          break;
        }
      }

      if (!hasAccess) return null;
    }

    // Get messages (with optional pagination for loading older messages)
    const limit = args.limit || 100;
    const beforeTimestamp = args.beforeTimestamp;

    let messages;
    if (beforeTimestamp !== undefined) {
      // Load older messages (before the given timestamp)
      messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation_and_created", (q) =>
          q.eq("conversationId", args.conversationId)
        )
        .filter((q) => q.lt(q.field("createdAt"), beforeTimestamp))
        .order("desc")
        .take(limit);
    } else {
      // Load most recent messages
      messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation_and_created", (q) =>
          q.eq("conversationId", args.conversationId)
        )
        .order("desc")
        .take(limit);
    }
    // Reverse to get chronological order for display
    messages.reverse();

    // Enrich with sender info (dedup sender lookups)
    const uniqueSenderIds = [...new Set(messages.map((m) => m.senderId))];
    const senderMap = new Map<string, Doc<"accounts">>();
    for (const id of uniqueSenderIds) {
      const s = await ctx.db.get(id);
      if (s) senderMap.set(id, s);
    }

    const enrichedMessages = messages.map((msg) => {
      const sender = senderMap.get(msg.senderId);
      return {
        ...msg,
        senderName: sender?.name || "Unknown",
        senderPhoto: sender?.profilePhoto,
      };
    });

    // Get participant info
    const participants = await Promise.all(
      conversation.participants.map(async (pId) => {
        const participant = await ctx.db.get(pId);
        return participant
          ? {
              _id: participant._id,
              name: participant.name,
              profilePhoto: participant.profilePhoto,
            }
          : null;
      })
    );

    // Pagination info for loading older messages
    const oldestMessage = enrichedMessages[0];
    return {
      ...conversation,
      currentAccountId: account._id,
      participants: participants.filter(Boolean),
      messages: enrichedMessages,
      oldestMessageTimestamp: oldestMessage?.createdAt,
      hasMoreMessages: messages.length === limit,
    };
  },
});

// Start a new conversation
export const startConversation = mutation({
  args: {
    participantIds: v.array(v.id("accounts")),
    caregiverAccess: v.optional(v.boolean()),
    name: v.optional(v.string()),
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

    // Include current user in participants
    const allParticipants = [...new Set([account._id, ...args.participantIds])];

    // Check if any participant has blocked the other
    for (const participantId of args.participantIds) {
      if (await isBlocked(ctx, account._id, participantId)) {
        throw new Error("Cannot start a conversation with this user");
      }
    }

    // Check if DM already exists between these participants
    if (allParticipants.length === 2) {
      const dmKey = [...allParticipants].sort().join("_");
      const existingDM = await ctx.db
        .query("conversations")
        .withIndex("by_dmKey", (q) => q.eq("dmKey", dmKey))
        .first();

      if (existingDM) {
        return existingDM._id;
      }
    }

    const conversationType = allParticipants.length > 2 ? "group" : "dm";
    const sortedIds = [...allParticipants].sort();
    const dmKey = conversationType === "dm" ? sortedIds.join("_") : undefined;
    const groupKey = conversationType === "group" ? sortedIds.join("_") : undefined;

    // Check for existing group conversation with same participants
    if (groupKey) {
      const existingGroup = await ctx.db
        .query("conversations")
        .withIndex("by_groupKey", (q) => q.eq("groupKey", groupKey))
        .first();

      if (existingGroup) {
        return existingGroup._id;
      }
    }

    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      participants: allParticipants,
      type: conversationType,
      name: conversationType === "group" ? args.name : undefined,
      dmKey,
      groupKey,
      caregiverAccess: args.caregiverAccess ?? true,
      lastMessageAt: now,
      createdAt: now,
    });

    // Populate junction table for O(1) "my conversations" lookup
    for (const participantId of allParticipants) {
      await ctx.db.insert("conversationParticipants", {
        conversationId,
        accountId: participantId,
      });
    }

    return conversationId;
  },
});

// Send a message
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
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

    if (args.content.length > 5000) {
      throw new Error("Message must be 5,000 characters or less");
    }

    // Rate limit check
    await checkRateLimit(ctx, "sendMessage", account._id);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Check if any participant has blocked the sender (or vice versa)
    for (const participantId of conversation.participants) {
      if (participantId !== account._id && await isBlocked(ctx, account._id, participantId)) {
        throw new Error("Cannot send messages in this conversation");
      }
    }

    // Check if user can send messages
    const isParticipant = conversation.participants.includes(account._id);
    let canSend = isParticipant;

    if (!isParticipant) {
      // Check caregiver access
      for (const participantId of conversation.participants) {
        // Non-participant senders must also pass the block check
        if (await isBlocked(ctx, account._id, participantId)) {
          throw new Error("Cannot send messages in this conversation");
        }

        const caregiverRelation = await ctx.db
          .query("caregivers")
          .withIndex("by_caregiver", (q) => q.eq("caregiverAccountId", account._id))
          .filter((q) => q.eq(q.field("accountId"), participantId))
          .first();

        if (
          caregiverRelation?.inviteStatus === "accepted" &&
          conversation.caregiverAccess &&
          (caregiverRelation.permissions === "canMessage" ||
            caregiverRelation.permissions === "canUpdate" ||
            caregiverRelation.permissions === "fullAccess")
        ) {
          canSend = true;
          break;
        }
      }
    }

    if (!canSend) {
      throw new Error("Not authorized to send messages in this conversation");
    }

    const now = Date.now();

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: account._id,
      content: args.content,
      readBy: [account._id],
      createdAt: now,
    });

    // Update conversation last message time
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
    });

    // Collect all account IDs who should get unread count bumps:
    // participants + caregivers with message access
    const recipientIds = new Set<Id<"accounts">>();
    for (const pid of conversation.participants) {
      if (pid !== account._id) recipientIds.add(pid);
    }

    if (conversation.caregiverAccess) {
      for (const participantId of conversation.participants) {
        const caregiverRelations = await ctx.db
          .query("caregivers")
          .withIndex("by_account", (q) => q.eq("accountId", participantId))
          .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
          .collect();

        for (const rel of caregiverRelations) {
          if (
            rel.caregiverAccountId !== account._id &&
            (rel.permissions === "canMessage" ||
              rel.permissions === "canUpdate" ||
              rel.permissions === "fullAccess")
          ) {
            recipientIds.add(rel.caregiverAccountId);
          }
        }
      }
    }

    // Increment unread counts for all recipients
    for (const recipientId of recipientIds) {
      const existing = await ctx.db
        .query("unreadCounts")
        .withIndex("by_conversation_and_account", (q) =>
          q.eq("conversationId", args.conversationId).eq("accountId", recipientId)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { count: existing.count + 1 });
      } else {
        await ctx.db.insert("unreadCounts", {
          conversationId: args.conversationId,
          accountId: recipientId,
          count: 1,
        });
      }
    }

    // Create notifications for other participants
    const preview = args.content.length > 100
      ? args.content.substring(0, 100) + "..."
      : args.content;

    for (const participantId of conversation.participants) {
      if (participantId !== account._id) {
        await ctx.runMutation(internal.notifications.createNotification, {
          accountId: participantId,
          type: "newMessage",
          title: "New message",
          message: `${account.name} sent you a message`,
          relatedAccountId: account._id,
          relatedConversationId: args.conversationId,
        });

        // Send email if participant has emailNewMessages enabled
        const participantAccount = await ctx.db.get(participantId);
        if (
          participantAccount?.email &&
          (participantAccount.notificationPreferences?.emailNewMessages ?? true)
        ) {
          await ctx.scheduler.runAfter(0, internal.email.sendNewMessageEmail, {
            toEmail: participantAccount.email,
            senderName: account.name,
            preview,
          });
        }
      }
    }

    // Send email to caregivers with message access
    if (conversation.caregiverAccess) {
      for (const participantId of conversation.participants) {
        const caregiverRelations = await ctx.db
          .query("caregivers")
          .withIndex("by_account", (q) => q.eq("accountId", participantId))
          .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
          .collect();

        for (const rel of caregiverRelations) {
          if (
            rel.caregiverAccountId !== account._id &&
            (rel.permissions === "canMessage" ||
              rel.permissions === "canUpdate" ||
              rel.permissions === "fullAccess")
          ) {
            const caregiverAccount = await ctx.db.get(rel.caregiverAccountId);
            if (
              caregiverAccount?.email &&
              (caregiverAccount.notificationPreferences?.emailNewMessages ?? true)
            ) {
              await ctx.scheduler.runAfter(0, internal.email.sendNewMessageEmail, {
                toEmail: caregiverAccount.email,
                senderName: account.name,
                preview,
              });
            }
          }
        }
      }
    }

    return messageId;
  },
});

// Mark messages as read
export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
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

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Check if user is a participant or an authorized caregiver
    let hasAccess = conversation.participants.includes(account._id);

    if (!hasAccess) {
      for (const participantId of conversation.participants) {
        const caregiverRelation = await ctx.db
          .query("caregivers")
          .withIndex("by_caregiver", (q) => q.eq("caregiverAccountId", account._id))
          .filter((q) => q.eq(q.field("accountId"), participantId))
          .first();

        if (
          caregiverRelation?.inviteStatus === "accepted" &&
          conversation.caregiverAccess &&
          (caregiverRelation.permissions === "canMessage" ||
            caregiverRelation.permissions === "canUpdate" ||
            caregiverRelation.permissions === "fullAccess")
        ) {
          hasAccess = true;
          break;
        }
      }
    }

    if (!hasAccess) {
      throw new Error("Not a participant in this conversation");
    }

    // Get recent messages (most unread will be recent) — scan at most 500 to avoid
    // hitting Convex mutation limits on very active conversations
    const recentMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_and_created", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .take(500);

    const unreadMessages = recentMessages.filter(
      (m) => !m.readBy.includes(account._id)
    );

    // Mark as read
    for (const message of unreadMessages) {
      await ctx.db.patch(message._id, {
        readBy: [...message.readBy, account._id],
      });
    }

    // Reset denormalized unread count
    const unreadRecord = await ctx.db
      .query("unreadCounts")
      .withIndex("by_conversation_and_account", (q) =>
        q.eq("conversationId", args.conversationId).eq("accountId", account._id)
      )
      .first();

    if (unreadRecord) {
      await ctx.db.patch(unreadRecord._id, { count: 0 });
    }

    return unreadMessages.length;
  },
});

// Get unread message count (from denormalized unreadCounts table)
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return 0;

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) return 0;

    const unreadRecords = await ctx.db
      .query("unreadCounts")
      .withIndex("by_account", (q) => q.eq("accountId", account._id))
      .collect();

    return unreadRecords.reduce((sum, r) => sum + r.count, 0);
  },
});
