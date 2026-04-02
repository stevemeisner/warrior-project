import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import { isBlocked } from "./blockedUsers";

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

    // Get conversations where user is a participant (with cursor-based pagination)
    // Note: This filters in memory since Convex doesn't support array membership queries well
    const limit = args.limit || 50;
    const cursor = args.cursor;

    // Fetch conversations, filtering by cursor if provided
    let allConversations;
    if (cursor !== undefined) {
      allConversations = await ctx.db.query("conversations")
        .withIndex("by_last_message")
        .order("desc")
        .filter((q) => q.lt(q.field("lastMessageAt"), cursor))
        .take(limit * 3);
    } else {
      allConversations = await ctx.db.query("conversations")
        .withIndex("by_last_message")
        .order("desc")
        .take(limit * 3);
    }
    const myConversations = allConversations
      .filter((conv) => conv.participants.includes(account._id))
      .slice(0, limit);

    // Enrich with participant info and last message
    const enrichedConversations = await Promise.all(
      myConversations.map(async (conv) => {
        const participants = await Promise.all(
          conv.participants.map(async (pId) => {
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

        // Get last message
        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("by_conversation_and_created", (q) =>
            q.eq("conversationId", conv._id)
          )
          .order("desc")
          .first();

        // Get unread count
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
          .collect();
        const unreadCount = messages.filter(
          (m) => !m.readBy.includes(account._id) && m.senderId !== account._id
        ).length;

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

    // Enrich with sender info
    const enrichedMessages = await Promise.all(
      messages.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);
        return {
          ...msg,
          senderName: sender?.name || "Unknown",
          senderPhoto: sender?.profilePhoto,
        };
      })
    );

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
      const existingConversations = await ctx.db
        .query("conversations")
        .collect();

      const existingDM = existingConversations.find(
        (conv) =>
          conv.type === "dm" &&
          conv.participants.length === 2 &&
          conv.participants.includes(allParticipants[0]) &&
          conv.participants.includes(allParticipants[1])
      );

      if (existingDM) {
        return existingDM._id;
      }
    }

    const conversationType = allParticipants.length > 2 ? "group" : "dm";

    const conversationId = await ctx.db.insert("conversations", {
      participants: allParticipants,
      type: conversationType,
      name: conversationType === "group" ? args.name : undefined,
      caregiverAccess: args.caregiverAccess ?? true,
      createdAt: Date.now(),
    });

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

    // Create notifications for other participants
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

    if (!conversation.participants.includes(account._id)) {
      throw new Error("Not a participant in this conversation");
    }

    // Get all unread messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    const unreadMessages = messages.filter(
      (m) => !m.readBy.includes(account._id)
    );

    // Mark as read
    for (const message of unreadMessages) {
      await ctx.db.patch(message._id, {
        readBy: [...message.readBy, account._id],
      });
    }

    return unreadMessages.length;
  },
});

// Get unread message count
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

    // Get recent conversations (limited for performance)
    // Note: For accurate counts with many conversations, consider denormalizing unread count
    const allConversations = await ctx.db.query("conversations")
      .withIndex("by_last_message")
      .order("desc")
      .take(100);
    const myConversations = allConversations.filter((conv) =>
      conv.participants.includes(account._id)
    );

    let totalUnread = 0;
    for (const conv of myConversations) {
      // Only check recent messages for performance
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation_and_created", (q) => q.eq("conversationId", conv._id))
        .order("desc")
        .take(50);

      totalUnread += messages.filter(
        (m) => !m.readBy.includes(account._id) && m.senderId !== account._id
      ).length;
    }

    return totalUnread;
  },
});
