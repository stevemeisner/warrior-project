import { v } from "convex/values";
import { query } from "./_generated/server";
import { auth } from "./auth";

// Search across accounts, warriors, and threads
export const search = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const searchQuery = args.query.trim();
    const limit = Math.min(args.limit || 5, 20);

    if (!searchQuery) {
      return { accounts: [], warriors: [], threads: [] };
    }

    // Search accounts by name using search index
    const matchedAccounts = await ctx.db
      .query("accounts")
      .withSearchIndex("search_name", (q) => q.search("name", searchQuery))
      .take(limit);

    const accountResults = matchedAccounts.map((a) => ({
      _id: a._id,
      name: a.name,
      role: a.role,
      profilePhoto: a.profilePhoto,
    }));

    // Search warriors by name — only public ones, using search index
    const publicWarriors = await ctx.db
      .query("warriors")
      .withSearchIndex("search_name", (q) =>
        q.search("name", searchQuery).eq("visibility", "public")
      )
      .take(limit);

    const warriorsWithAccounts = await Promise.all(
      publicWarriors.map(async (w) => {
        const account = await ctx.db.get(w.accountId);
        return {
          _id: w._id,
          name: w.name,
          condition: w.condition,
          currentStatus: w.currentStatus,
          profilePhoto: w.profilePhoto,
          accountId: w.accountId,
          accountName: account?.name || "Unknown",
        };
      })
    );

    // Search threads by title using search index
    const matchedThreads = await ctx.db
      .query("threads")
      .withSearchIndex("search_title", (q) => q.search("title", searchQuery))
      .take(limit);

    const threadResults = await Promise.all(
      matchedThreads.map(async (t) => {
        const author = await ctx.db.get(t.authorId);
        return {
          _id: t._id,
          title: t.title,
          category: t.category,
          authorName: author?.name || "Unknown",
          commentCount: t.commentCount,
        };
      })
    );

    return {
      accounts: accountResults,
      warriors: warriorsWithAccounts,
      threads: threadResults,
    };
  },
});
