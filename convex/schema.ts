import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// Status enum values for warriors
export const statusValues = v.union(
  v.literal("thriving"),
  v.literal("stable"),
  v.literal("struggling"),
  v.literal("hospitalized"),
  v.literal("needsSupport"),
  v.literal("feather")
);

// Permission levels for caregivers
export const permissionLevels = v.union(
  v.literal("viewOnly"),
  v.literal("canMessage"),
  v.literal("canUpdate"),
  v.literal("fullAccess")
);

// Account role types
export const accountRoles = v.union(
  v.literal("family"),
  v.literal("caregiver")
);

// Auth provider types
export const authProviders = v.union(
  v.literal("google"),
  v.literal("email")
);

// Conversation types
export const conversationTypes = v.union(
  v.literal("dm"),
  v.literal("group")
);

// Thread categories
export const threadCategories = v.union(
  v.literal("general"),
  v.literal("support"),
  v.literal("resources"),
  v.literal("celebrations"),
  v.literal("questions")
);

// Notification types
export const notificationTypes = v.union(
  v.literal("statusChange"),
  v.literal("newMessage"),
  v.literal("supportRequest"),
  v.literal("caregiverInvite"),
  v.literal("threadReply"),
  v.literal("mention")
);

// Visibility settings
export const visibilitySettings = v.union(
  v.literal("public"),
  v.literal("connections"),
  v.literal("private")
);

export default defineSchema({
  // Auth tables from @convex-dev/auth
  ...authTables,

  // User accounts - both family and caregiver accounts
  accounts: defineTable({
    email: v.string(),
    name: v.string(),
    role: accountRoles,
    authProvider: authProviders,
    authId: v.string(), // External auth provider ID
    profilePhoto: v.optional(v.string()),
    profilePhotoStorageId: v.optional(v.id("_storage")), // Convex file storage
    isAdmin: v.optional(v.boolean()), // Admin flag for moderation
    onboardingComplete: v.optional(v.boolean()), // Whether user completed guided onboarding

    // Location for map features (optional)
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
    })),

    // Privacy settings
    privacySettings: v.optional(v.object({
      showLocation: v.boolean(),
      showEmail: v.boolean(),
      defaultVisibility: visibilitySettings,
    })),

    // Notification preferences
    notificationPreferences: v.optional(v.object({
      emailStatusChanges: v.boolean(),
      emailNewMessages: v.boolean(),
      emailSupportRequests: v.boolean(),
      inAppStatusChanges: v.boolean(),
      inAppNewMessages: v.boolean(),
      inAppSupportRequests: v.boolean(),
    })),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_authId", ["authId"])
    .index("by_role", ["role"]),

  // Warriors - children with special needs
  warriors: defineTable({
    accountId: v.id("accounts"), // The family account this warrior belongs to
    name: v.string(),
    dateOfBirth: v.optional(v.string()), // ISO date string
    condition: v.optional(v.string()),
    currentStatus: statusValues,
    isFeather: v.boolean(), // Whether this warrior has passed away
    profilePhoto: v.optional(v.string()),
    profilePhotoStorageId: v.optional(v.id("_storage")), // Convex file storage

    // Additional info
    bio: v.optional(v.string()),

    // Visibility setting for this warrior
    visibility: visibilitySettings,

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_account", ["accountId"])
    .index("by_status", ["currentStatus"])
    .index("by_visibility", ["visibility"]),

  // Caregivers - linked to family accounts with specific permissions
  caregivers: defineTable({
    accountId: v.id("accounts"),        // The family account they're caregiving for
    caregiverAccountId: v.id("accounts"), // The caregiver's own account
    permissions: permissionLevels,
    inviteStatus: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined")
    ),
    inviteEmail: v.optional(v.string()), // Email used for pending invites
    invitedAt: v.number(),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_account", ["accountId"])
    .index("by_caregiver", ["caregiverAccountId"])
    .index("by_invite_email", ["inviteEmail"])
    .index("by_status", ["inviteStatus"]),

  // Status updates - history of warrior status changes
  statusUpdates: defineTable({
    warriorId: v.id("warriors"),
    status: statusValues,
    context: v.optional(v.string()), // Optional description
    updatedBy: v.id("accounts"), // Who made this update
    visibility: visibilitySettings,
    createdAt: v.number(),
  })
    .index("by_warrior", ["warriorId"])
    .index("by_created", ["createdAt"])
    .index("by_warrior_and_created", ["warriorId", "createdAt"]),

  // Conversations - for direct messaging
  conversations: defineTable({
    participants: v.array(v.id("accounts")),
    type: conversationTypes,
    name: v.optional(v.string()), // For group conversations
    caregiverAccess: v.boolean(), // Whether caregivers can see this conversation
    dmKey: v.optional(v.string()), // Sorted participant IDs for O(1) DM dedup lookup
    lastMessageAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_participant", ["participants"])
    .index("by_last_message", ["lastMessageAt"])
    .index("by_dmKey", ["dmKey"]),

  // Denormalized unread message counts per user per conversation
  unreadCounts: defineTable({
    conversationId: v.id("conversations"),
    accountId: v.id("accounts"),
    count: v.number(),
  })
    .index("by_conversation_and_account", ["conversationId", "accountId"])
    .index("by_account", ["accountId"]),

  // Messages - individual messages in conversations
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("accounts"),
    content: v.string(),
    readBy: v.array(v.id("accounts")),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_and_created", ["conversationId", "createdAt"])
    .index("by_sender_and_created", ["senderId", "createdAt"]),

  // Threads - community discussion posts
  threads: defineTable({
    authorId: v.id("accounts"),
    title: v.string(),
    content: v.string(),
    category: threadCategories,

    // Engagement metrics
    viewCount: v.number(),
    commentCount: v.number(),

    // Flags
    isPinned: v.boolean(),
    isLocked: v.boolean(),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_author", ["authorId"])
    .index("by_category", ["category"])
    .index("by_created", ["createdAt"])
    .index("by_pinned_and_created", ["isPinned", "createdAt"]),

  // Comments - replies to threads (supports nesting)
  comments: defineTable({
    threadId: v.id("threads"),
    parentId: v.optional(v.id("comments")), // For nested replies
    authorId: v.id("accounts"),
    content: v.string(),

    // Engagement
    likeCount: v.number(),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_thread", ["threadId"])
    .index("by_parent", ["parentId"])
    .index("by_thread_and_created", ["threadId", "createdAt"]),

  // Notifications - in-app notification system
  notifications: defineTable({
    accountId: v.id("accounts"), // Recipient
    type: notificationTypes,
    title: v.string(),
    message: v.string(),

    // Related entities (optional)
    relatedAccountId: v.optional(v.id("accounts")),
    relatedWarriorId: v.optional(v.id("warriors")),
    relatedConversationId: v.optional(v.id("conversations")),
    relatedThreadId: v.optional(v.id("threads")),

    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_account", ["accountId"])
    .index("by_account_and_read", ["accountId", "isRead"])
    .index("by_account_and_created", ["accountId", "createdAt"]),

  // Support requests - when families need help
  supportRequests: defineTable({
    accountId: v.id("accounts"),
    warriorId: v.optional(v.id("warriors")),
    isActive: v.boolean(),
    helpTypes: v.array(v.string()), // e.g., ["meals", "childcare", "transportation"]
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_account", ["accountId"])
    .index("by_active", ["isActive"])
    .index("by_warrior", ["warriorId"]),

  // Comment likes - tracks who liked which comment (prevents duplicates)
  commentLikes: defineTable({
    commentId: v.id("comments"),
    accountId: v.id("accounts"),
    createdAt: v.number(),
  })
    .index("by_comment", ["commentId"])
    .index("by_comment_and_account", ["commentId", "accountId"])
    .index("by_account", ["accountId"]),

  // Blocked users - for privacy/moderation
  blockedUsers: defineTable({
    blockerId: v.id("accounts"),
    blockedId: v.id("accounts"),
    createdAt: v.number(),
  })
    .index("by_blocker", ["blockerId"])
    .index("by_blocked", ["blockedId"]),

  // Reports - user-submitted reports for moderation
  reports: defineTable({
    reporterId: v.id("accounts"),
    targetType: v.union(
      v.literal("thread"),
      v.literal("comment"),
      v.literal("account"),
      v.literal("message")
    ),
    targetId: v.string(), // ID of the reported entity
    reason: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("dismissed")
    ),
    reviewedBy: v.optional(v.id("accounts")),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_target", ["targetType", "targetId"])
    .index("by_reporter", ["reporterId"]),

  // Typing indicators - transient presence data for messages
  typingIndicators: defineTable({
    conversationId: v.id("conversations"),
    accountId: v.id("accounts"),
    expiresAt: v.number(), // Auto-expire after a few seconds
  })
    .index("by_conversation", ["conversationId"])
    .index("by_account", ["accountId"])
    .index("by_expires", ["expiresAt"]),
});
