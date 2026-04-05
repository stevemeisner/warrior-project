import { MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

interface RateLimitConfig {
  maxActions: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  sendMessage: { maxActions: 30, windowMs: 60_000 }, // 30 messages per minute
  createThread: { maxActions: 5, windowMs: 300_000 }, // 5 threads per 5 minutes
  addComment: { maxActions: 20, windowMs: 60_000 }, // 20 comments per minute
  createSupportRequest: { maxActions: 3, windowMs: 3_600_000 }, // 3 per hour
};

/**
 * Check rate limit by counting recent actions in the relevant table.
 * Throws if the limit is exceeded.
 */
export async function checkRateLimit(
  ctx: MutationCtx,
  action: keyof typeof RATE_LIMITS,
  accountId: Id<"accounts">
): Promise<void> {
  const config = RATE_LIMITS[action];
  if (!config) return;

  const windowStart = Date.now() - config.windowMs;

  let count = 0;

  switch (action) {
    case "sendMessage": {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_sender_and_created", (q) =>
          q.eq("senderId", accountId).gte("createdAt", windowStart)
        )
        .take(config.maxActions + 1);
      count = messages.length;
      break;
    }
    case "createThread": {
      const threads = await ctx.db
        .query("threads")
        .withIndex("by_author", (q) => q.eq("authorId", accountId))
        .filter((q) => q.gte(q.field("createdAt"), windowStart))
        .take(config.maxActions + 1);
      count = threads.length;
      break;
    }
    case "addComment": {
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_author_and_created", (q) =>
          q.eq("authorId", accountId).gte("createdAt", windowStart)
        )
        .take(config.maxActions + 1);
      count = comments.length;
      break;
    }
    case "createSupportRequest": {
      const requests = await ctx.db
        .query("supportRequests")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .filter((q) => q.gte(q.field("createdAt"), windowStart))
        .take(config.maxActions + 1);
      count = requests.length;
      break;
    }
  }

  if (count >= config.maxActions) {
    const windowDescription =
      config.windowMs >= 3_600_000
        ? `${config.windowMs / 3_600_000} hour(s)`
        : config.windowMs >= 60_000
          ? `${config.windowMs / 60_000} minute(s)`
          : `${config.windowMs / 1_000} second(s)`;

    throw new Error(
      `Rate limit exceeded: maximum ${config.maxActions} actions per ${windowDescription}. Please try again later.`
    );
  }
}
