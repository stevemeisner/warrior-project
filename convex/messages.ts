import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

// Get all conversations for the current user
export const getMyConversations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (!account) return [];

    // Get all conversations where user is a participant
    const allConversations = await ctx.db.query("conversations").collect();
    const myConversations = allConversations.filter((conv) =>
      conv.participants.includes(account._id)
    );

    // Sort by last message
    myConversations.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));

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

    return enrichedConversations;
  },
});

// Get a single conversation with messages
export const getConversation = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
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

    // Get messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_and_created", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .take(args.limit || 100);

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

    return {
      ...conversation,
      participants: participants.filter(Boolean),
      messages: enrichedMessages,
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

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Check if user can send messages
    const isParticipant = conversation.participants.includes(account._id);
    let canSend = isParticipant;

    if (!isParticipant) {
      // Check caregiver access
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

    // Get all conversations
    const allConversations = await ctx.db.query("conversations").collect();
    const myConversations = allConversations.filter((conv) =>
      conv.participants.includes(account._id)
    );

    let totalUnread = 0;
    for (const conv of myConversations) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .collect();

      totalUnread += messages.filter(
        (m) => !m.readBy.includes(account._id) && m.senderId !== account._id
      ).length;
    }

    return totalUnread;
  },
});
