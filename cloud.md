# Warrior Project - Convex Development Guide

This document serves as a comprehensive reference for developing with Convex in this Next.js application.

## Table of Contents

1. [Setup & Configuration](#setup--configuration)
2. [Project Structure](#project-structure)
3. [Schema Reference](#schema-reference)
4. [Convex Functions Reference](#convex-functions-reference)
5. [Query Patterns](#query-patterns)
6. [Mutation Patterns](#mutation-patterns)
7. [Authentication Patterns](#authentication-patterns)
8. [Permission System](#permission-system)
9. [Component Patterns](#component-patterns)

---

## Setup & Configuration

### Environment Variables

```env
# Convex
CONVEX_DEPLOYMENT=your-deployment-id
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Auth (Google OAuth)
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret

# Site URL (for auth callbacks)
CONVEX_SITE_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=your-resend-api-key

# Map (Mapbox)
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token

# App URL (for email templates)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Auth Configuration

Authentication is handled by `@convex-dev/auth` with two providers:

- **Google OAuth** - Social login
- **Email/Password** - Traditional credentials

```typescript
// convex/auth.ts
import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google, Password],
});
```

---

## Project Structure

```
warrior-project/
├── convex/                    # Backend (Convex functions)
│   ├── _generated/           # Auto-generated types
│   ├── schema.ts             # Database schema
│   ├── auth.ts               # Auth configuration
│   ├── accounts.ts           # Account queries/mutations
│   ├── warriors.ts           # Warrior queries/mutations
│   ├── status.ts             # Status update queries/mutations
│   ├── caregivers.ts         # Caregiver queries/mutations
│   ├── messages.ts           # Messaging queries/mutations
│   ├── threads.ts            # Community thread queries/mutations
│   ├── notifications.ts      # Notification queries/mutations
│   ├── email.ts              # Email sending actions
│   └── http.ts               # HTTP routes (auth endpoints)
│
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── (auth)/          # Auth pages (signin, signup, onboarding)
│   │   ├── dashboard/       # Main dashboard
│   │   ├── profile/         # User profile + warrior management
│   │   ├── messages/        # Messaging
│   │   ├── community/       # Discussion threads
│   │   ├── map/             # Warrior map view
│   │   ├── notifications/   # Notification center
│   │   └── settings/        # User settings
│   │
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── auth/            # Auth forms (SignInForm, SignUpForm)
│   │   ├── navigation.tsx   # Main navigation
│   │   ├── providers.tsx    # Convex provider setup
│   │   ├── warrior-card.tsx # Warrior display components
│   │   ├── warrior-form.tsx # Warrior create/edit form
│   │   └── status-selector.tsx # Status selection UI
│   │
│   └── lib/
│       ├── utils.ts         # Utility functions (cn)
│       └── convex.ts        # Convex client instance
```

---

## Schema Reference

### Enums

```typescript
// Status values for warriors
type WarriorStatus = "thriving" | "stable" | "struggling" | "hospitalized" | "needsSupport" | "feather";

// Permission levels for caregivers
type PermissionLevel = "viewOnly" | "canMessage" | "canUpdate" | "fullAccess";

// Account roles
type AccountRole = "family" | "caregiver";

// Auth providers
type AuthProvider = "google" | "email";

// Visibility settings
type Visibility = "public" | "connections" | "private";

// Thread categories
type ThreadCategory = "general" | "support" | "resources" | "celebrations" | "questions";

// Notification types
type NotificationType = "statusChange" | "newMessage" | "supportRequest" | "caregiverInvite" | "threadReply" | "mention";
```

### Tables

#### `accounts`
User accounts for both families and caregivers.

| Field | Type | Description |
|-------|------|-------------|
| email | string | User email |
| name | string | Display name |
| role | AccountRole | "family" or "caregiver" |
| authProvider | AuthProvider | "google" or "email" |
| authId | string | External auth ID (links to auth tables) |
| profilePhoto | string? | Profile image URL |
| location | object? | { latitude, longitude, city?, state? } |
| privacySettings | object? | { showLocation, showEmail, defaultVisibility } |
| notificationPreferences | object? | Email and in-app preferences |
| createdAt | number | Timestamp |
| updatedAt | number | Timestamp |

**Indexes:** `by_email`, `by_authId`, `by_role`

#### `warriors`
Children with special needs belonging to family accounts.

| Field | Type | Description |
|-------|------|-------------|
| accountId | Id<"accounts"> | Owning family account |
| name | string | Warrior's name |
| dateOfBirth | string? | ISO date string |
| condition | string? | Medical condition/diagnosis |
| currentStatus | WarriorStatus | Current status |
| isFeather | boolean | Whether warrior has passed away |
| profilePhoto | string? | Profile image URL |
| bio | string? | About text |
| visibility | Visibility | Who can see this warrior |
| createdAt | number | Timestamp |
| updatedAt | number | Timestamp |

**Indexes:** `by_account`, `by_status`, `by_visibility`

#### `caregivers`
Links caregivers to family accounts with permissions.

| Field | Type | Description |
|-------|------|-------------|
| accountId | Id<"accounts"> | Family account being cared for |
| caregiverAccountId | Id<"accounts"> | Caregiver's account |
| permissions | PermissionLevel | Access level |
| inviteStatus | "pending" \| "accepted" \| "declined" | Invite state |
| inviteEmail | string? | Email for pending invites |
| invitedAt | number | Timestamp |
| acceptedAt | number? | Timestamp |

**Indexes:** `by_account`, `by_caregiver`, `by_invite_email`, `by_status`

#### `statusUpdates`
History of warrior status changes.

| Field | Type | Description |
|-------|------|-------------|
| warriorId | Id<"warriors"> | Related warrior |
| status | WarriorStatus | Status value |
| context | string? | Optional description |
| updatedBy | Id<"accounts"> | Who made the update |
| visibility | Visibility | Who can see this update |
| createdAt | number | Timestamp |

**Indexes:** `by_warrior`, `by_created`, `by_warrior_and_created`

#### `conversations`
Messaging conversations between users.

| Field | Type | Description |
|-------|------|-------------|
| participants | Id<"accounts">[] | Participant account IDs |
| type | "dm" \| "group" | Conversation type |
| name | string? | For group conversations |
| caregiverAccess | boolean | Whether caregivers can access |
| lastMessageAt | number? | Last message timestamp |
| createdAt | number | Timestamp |

**Indexes:** `by_participant`, `by_last_message`

#### `messages`
Individual messages in conversations.

| Field | Type | Description |
|-------|------|-------------|
| conversationId | Id<"conversations"> | Parent conversation |
| senderId | Id<"accounts"> | Message sender |
| content | string | Message text |
| readBy | Id<"accounts">[] | Who has read this |
| createdAt | number | Timestamp |

**Indexes:** `by_conversation`, `by_conversation_and_created`

#### `threads`
Community discussion posts.

| Field | Type | Description |
|-------|------|-------------|
| authorId | Id<"accounts"> | Thread author |
| title | string | Thread title |
| content | string | Thread body |
| category | ThreadCategory | Category classification |
| viewCount | number | View counter |
| commentCount | number | Comment counter |
| isPinned | boolean | Pinned to top |
| isLocked | boolean | Prevents new comments |
| createdAt | number | Timestamp |
| updatedAt | number | Timestamp |

**Indexes:** `by_author`, `by_category`, `by_created`, `by_pinned_and_created`

#### `comments`
Replies to threads (supports nesting).

| Field | Type | Description |
|-------|------|-------------|
| threadId | Id<"threads"> | Parent thread |
| parentId | Id<"comments">? | For nested replies |
| authorId | Id<"accounts"> | Comment author |
| content | string | Comment text |
| likeCount | number | Like counter |
| createdAt | number | Timestamp |
| updatedAt | number | Timestamp |

**Indexes:** `by_thread`, `by_parent`, `by_thread_and_created`

#### `notifications`
In-app notification system.

| Field | Type | Description |
|-------|------|-------------|
| accountId | Id<"accounts"> | Recipient |
| type | NotificationType | Notification type |
| title | string | Notification title |
| message | string | Notification body |
| relatedAccountId | Id<"accounts">? | Related account |
| relatedWarriorId | Id<"warriors">? | Related warrior |
| relatedConversationId | Id<"conversations">? | Related conversation |
| relatedThreadId | Id<"threads">? | Related thread |
| isRead | boolean | Read status |
| createdAt | number | Timestamp |

**Indexes:** `by_account`, `by_account_and_read`, `by_account_and_created`

---

## Convex Functions Reference

### accounts.ts

| Function | Type | Description |
|----------|------|-------------|
| `getAuthUserInfo` | query | Get raw auth user info for onboarding |
| `getCurrentAccount` | query | Get current user's account |
| `getAccount` | query | Get account by ID |
| `getAccountByEmail` | query | Get account by email |
| `createAccount` | mutation | Create new account after auth |
| `updateAccount` | mutation | Update account profile |
| `updatePrivacySettings` | mutation | Update privacy settings |
| `updateNotificationPreferences` | mutation | Update notification prefs |

### warriors.ts

| Function | Type | Description |
|----------|------|-------------|
| `getMyWarriors` | query | Get all warriors for current user |
| `getWarrior` | query | Get single warrior by ID |
| `getWarriorsByAccount` | query | Get warriors for account (with visibility check) |
| `getPublicWarriors` | query | Get public warriors (for map) |
| `createWarrior` | mutation | Create new warrior (family only) |
| `updateWarrior` | mutation | Update warrior details |
| `deleteWarrior` | mutation | Delete warrior and status history |

### status.ts

| Function | Type | Description |
|----------|------|-------------|
| `getStatusHistory` | query | Get status history for warrior |
| `getRecentUpdates` | query | Get recent public status updates |
| `getStatusStats` | query | Get status counts by type |
| `updateStatus` | mutation | Update warrior status (creates notification) |

### caregivers.ts

| Function | Type | Description |
|----------|------|-------------|
| `getMyCaregivers` | query | Get caregivers for current family |
| `getMyFamilies` | query | Get families for current caregiver |
| `getMyPendingInvites` | query | Get pending invites by email |
| `inviteCaregiver` | mutation | Invite caregiver (sends email) |
| `acceptInvite` | mutation | Accept caregiver invite |
| `declineInvite` | mutation | Decline caregiver invite |
| `updateCaregiverPermissions` | mutation | Update caregiver permissions |
| `removeCaregiver` | mutation | Remove caregiver |

### messages.ts

| Function | Type | Description |
|----------|------|-------------|
| `getMyConversations` | query | Get all conversations with metadata |
| `getConversation` | query | Get conversation with messages |
| `getUnreadCount` | query | Get total unread message count |
| `startConversation` | mutation | Create new conversation |
| `sendMessage` | mutation | Send message (creates notification) |
| `markAsRead` | mutation | Mark conversation as read |

### threads.ts

| Function | Type | Description |
|----------|------|-------------|
| `getThreads` | query | Get threads with filtering/sorting |
| `getThread` | query | Get thread with comments |
| `createThread` | mutation | Create new thread |
| `updateThread` | mutation | Update thread (author only) |
| `deleteThread` | mutation | Delete thread and comments |
| `incrementViewCount` | mutation | Increment view counter |
| `addComment` | mutation | Add comment (creates notification) |
| `updateComment` | mutation | Update comment (author only) |
| `deleteComment` | mutation | Delete comment and children |
| `likeComment` | mutation | Like a comment |

### notifications.ts

| Function | Type | Description |
|----------|------|-------------|
| `getMyNotifications` | query | Get notifications for current user |
| `getUnreadCount` | query | Get unread notification count |
| `markAsRead` | mutation | Mark notification as read |
| `markAllAsRead` | mutation | Mark all as read |
| `deleteNotification` | mutation | Delete notification |
| `createNotification` | internalMutation | Create notification (called from other mutations) |
| `clearOldNotifications` | internalMutation | Clear old read notifications |

### email.ts

| Function | Type | Description |
|----------|------|-------------|
| `sendEmail` | action | Send templated email via Resend |
| `sendCaregiverInviteEmail` | internalAction | Send caregiver invite email |

---

## Query Patterns

### Loading State Check

Convex queries return `undefined` while loading. Always check for this:

```typescript
const account = useQuery(api.accounts.getCurrentAccount);

// Loading state (query in flight)
if (account === undefined) {
  return <LoadingSpinner />;
}

// No data found
if (account === null) {
  return <NotFound />;
}

// Data loaded - safe to use
return <div>{account.name}</div>;
```

### Conditional Query Execution

Skip queries that depend on optional parameters:

```typescript
const [selectedId, setSelectedId] = useState<string | null>(null);

// Query only runs when selectedId is truthy
const conversation = useQuery(
  api.messages.getConversation,
  selectedId ? { conversationId: selectedId as any } : "skip"
);
```

### Query with Parameters

```typescript
const threads = useQuery(api.threads.getThreads, {
  category: selectedCategory === "all" ? undefined : selectedCategory,
  sortBy: "recent",
  limit: 50,
});
```

### Skeleton Loading Pattern

```typescript
<Card>
  <CardContent>
    {warriors === undefined ? (
      <div className="h-8 w-12 bg-muted animate-pulse rounded"></div>
    ) : (
      <div className="text-2xl font-bold">{warriors.length}</div>
    )}
  </CardContent>
</Card>
```

---

## Mutation Patterns

### Standard Mutation with Loading State

```typescript
const updateAccount = useMutation(api.accounts.updateAccount);
const [isSaving, setIsSaving] = useState(false);

const handleSave = async () => {
  setIsSaving(true);
  try {
    await updateAccount({ name: name.trim() });
    toast.success("Profile updated");
  } catch (error) {
    toast.error("Failed to update profile");
    console.error(error);
  } finally {
    setIsSaving(false);
  }
};
```

### Mutation with Form

```typescript
const createWarrior = useMutation(api.warriors.createWarrior);
const router = useRouter();

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    await createWarrior({
      name,
      dateOfBirth: dateOfBirth || undefined,
      condition: condition || undefined,
      visibility,
    });
    toast.success("Warrior created");
    router.push("/dashboard");
  } catch (error) {
    toast.error("Failed to create warrior");
  } finally {
    setIsLoading(false);
  }
};
```

### Creating Notifications from Mutations

```typescript
// In your mutation handler (server-side):
import { internal } from "./_generated/api";

// After main operation succeeds:
await ctx.runMutation(internal.notifications.createNotification, {
  accountId: recipientAccountId,
  type: "statusChange",
  title: "Status update",
  message: `${warrior.name}'s status changed to ${status}`,
  relatedWarriorId: warriorId,
});
```

### Scheduling Async Actions

```typescript
// Schedule email to send asynchronously:
await ctx.scheduler.runAfter(0, internal.email.sendCaregiverInviteEmail, {
  toEmail: email,
  inviterName: account.name,
  permissions,
});
```

---

## Authentication Patterns

### Auth Provider Setup

```typescript
// src/components/providers.tsx
"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthProvider client={convex}>
      {children}
    </ConvexAuthProvider>
  );
}
```

### Sign In/Sign Out

```typescript
import { useAuthActions } from "@convex-dev/auth/react";

function AuthComponent() {
  const { signIn, signOut } = useAuthActions();

  // Email/password sign in
  const handleEmailSignIn = async () => {
    await signIn("password", {
      email,
      password,
      flow: "signIn", // or "signUp"
    });
  };

  // Google OAuth
  const handleGoogleSignIn = async () => {
    await signIn("google", { redirectTo: "/dashboard" });
  };

  // Sign out
  const handleSignOut = async () => {
    await signOut();
  };
}
```

### Protected Routes

```typescript
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";

export default function ProtectedPage() {
  return (
    <>
      <AuthLoading>
        <LoadingSpinner />
      </AuthLoading>
      <Unauthenticated>
        <SignInPrompt />
      </Unauthenticated>
      <Authenticated>
        <ProtectedContent />
      </Authenticated>
    </>
  );
}
```

### Account Creation After Auth

```typescript
// After successful auth, create account in Convex:
const createAccount = useMutation(api.accounts.createAccount);

await createAccount({
  email,
  name,
  role: "family", // or "caregiver"
  authProvider: "google", // or "email"
  profilePhoto: authUser.image,
});
```

### OAuth Role Persistence

Store role in session storage during OAuth flow:

```typescript
// Before OAuth redirect
sessionStorage.setItem("pendingRole", role);
await signIn("google", { redirectTo: "/onboarding" });

// In onboarding page
const pendingRole = sessionStorage.getItem("pendingRole");
sessionStorage.removeItem("pendingRole");
```

---

## Permission System

### Role-Based Access

```typescript
// Account roles determine core capabilities
type AccountRole = "family" | "caregiver";

// Family accounts can:
// - Create warriors
// - Invite caregivers
// - Update warrior status
// - Delete warriors

// Caregiver accounts can:
// - View assigned families and warriors
// - Message families (if permitted)
// - Update warrior status (if permitted)
```

### Caregiver Permission Levels

```typescript
type PermissionLevel =
  | "viewOnly"     // Can view warrior info and status
  | "canMessage"   // + Can participate in conversations
  | "canUpdate"    // + Can update warrior status
  | "fullAccess";  // + Can update all warrior info
```

### Access Check Pattern (Server-Side)

```typescript
export const updateWarrior = mutation({
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();
    if (!account) throw new Error("Account not found");

    const warrior = await ctx.db.get(args.warriorId);
    if (!warrior) throw new Error("Warrior not found");

    // Check ownership
    const isOwner = warrior.accountId === account._id;
    let hasAccess = isOwner;

    // Check caregiver permissions if not owner
    if (!isOwner) {
      const caregiverRelation = await ctx.db
        .query("caregivers")
        .withIndex("by_caregiver", (q) => q.eq("caregiverAccountId", account._id))
        .filter((q) => q.eq(q.field("accountId"), warrior.accountId))
        .first();

      hasAccess =
        caregiverRelation?.inviteStatus === "accepted" &&
        caregiverRelation?.permissions === "fullAccess";
    }

    if (!hasAccess) throw new Error("Not authorized");

    // Proceed with update...
  },
});
```

### Visibility Filtering

```typescript
// Return full data to owner/caregiver, public only to others
const visibleData = hasFullAccess
  ? allData
  : allData.filter((item) => item.visibility === "public");
```

---

## Component Patterns

### UI Component Library

Using shadcn/ui built on Radix UI:

```typescript
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
```

### Toast Notifications

```typescript
import { toast } from "sonner";

toast.success("Profile updated");
toast.error("Failed to save");
toast.info("Processing...");
```

### Status Selector

```typescript
import { StatusSelector, StatusBadge, WarriorStatus } from "@/components/status-selector";

// Interactive selector
<StatusSelector
  currentStatus={warrior.currentStatus}
  onStatusChange={(status) => handleStatusChange(status)}
  disabled={isUpdating}
/>

// Display only
<StatusBadge status={warrior.currentStatus} size="lg" />
```

### Warrior List

```typescript
import { WarriorList } from "@/components/warrior-card";

<WarriorList
  warriors={warriors.map((w) => ({
    ...w,
    _id: w._id.toString(),
  }))}
  onStatusChange={handleStatusChange}
  onWarriorClick={(warrior) => router.push(`/profile/warrior/${warrior._id}`)}
  canEdit={isOwner}
  compact={false}
/>
```

### Utility Classes

```typescript
import { cn } from "@/lib/utils";

// Merge class names conditionally
<button
  className={cn(
    "base-classes",
    isActive && "active-classes",
    disabled && "disabled-classes"
  )}
>
```

---

## Best Practices

### 1. Always Check Query Loading States

```typescript
// BAD: Treats undefined and null the same
if (!data) return <Loading />;

// GOOD: Distinguishes loading from empty
if (data === undefined) return <Loading />;
if (data === null) return <NotFound />;
```

### 2. Use Proper Type Assertions for IDs

```typescript
// Convex IDs need type assertion when passing from frontend
await updateStatus({
  warriorId: warriorId as Id<"warriors">,
  status,
});
```

### 3. Handle Errors Gracefully

```typescript
try {
  await mutation({ ... });
  toast.success("Success");
} catch (error) {
  toast.error("Failed - please try again");
  console.error(error);
}
```

### 4. Use Indexes for Queries

```typescript
// GOOD: Uses defined index
ctx.db.query("accounts")
  .withIndex("by_email", (q) => q.eq("email", email))
  .first();

// BAD: Full table scan
ctx.db.query("accounts")
  .filter((q) => q.eq(q.field("email"), email))
  .first();
```

### 5. Create Notifications for Important Events

```typescript
// After status change, message send, etc.
await ctx.runMutation(internal.notifications.createNotification, {
  accountId: recipientId,
  type: "statusChange",
  title: "Status Update",
  message: `${warrior.name} is now ${status}`,
  relatedWarriorId: warriorId,
});
```

---

## Common Gotchas

1. **Convex IDs are objects** - Convert to string for URLs: `warrior._id.toString()`

2. **Query returns undefined while loading** - Not the same as null (no data)

3. **useEffect dependencies with mutations** - Mutation functions are stable, but state changes can cause infinite loops

4. **Session storage for OAuth** - Not shared across tabs, cleared on browser close

5. **Internal functions** - Use `internalMutation`/`internalAction` for functions called only from other Convex functions

6. **Scheduler for async work** - Use `ctx.scheduler.runAfter()` for email sending, etc.
