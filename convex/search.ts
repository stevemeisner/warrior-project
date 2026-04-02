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

    const searchQuery = args.query.toLowerCase().trim();
    const limit = args.limit || 5;

    if (!searchQuery) {
      return { accounts: [], warriors: [], threads: [] };
    }

    // Search accounts by name
    const allAccounts = await ctx.db.query("accounts").collect();
    const matchedAccounts = allAccounts
      .filter((a) => a.name.toLowerCase().includes(searchQuery))
      .slice(0, limit)
      .map((a) => ({
        _id: a._id,
        name: a.name,
        role: a.role,
        profilePhoto: a.profilePhoto,
      }));

    // Search warriors by name — only public ones
    const allWarriors = await ctx.db.query("warriors").collect();
    const publicWarriors = allWarriors.filter(
      (w) =>
        w.visibility === "public" &&
        w.name.toLowerCase().includes(searchQuery)
    );

    const warriorsWithAccounts = await Promise.all(
      publicWarriors.slice(0, limit).map(async (w) => {
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

    // Search threads by title
    const allThreads = await ctx.db.query("threads").collect();
    const matchedThreads = await Promise.all(
      allThreads
        .filter((t) => t.title.toLowerCase().includes(searchQuery))
        .slice(0, limit)
        .map(async (t) => {
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
      accounts: matchedAccounts,
      warriors: warriorsWithAccounts,
      threads: matchedThreads,
    };
  },
});
