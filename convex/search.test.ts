import { convexTest } from "convex-test";
import { describe, expect, it, beforeEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";
import {
  createAccount,
  createWarrior,
  createThread,
  resetFactoryCounter,
} from "./test.factories";

beforeEach(() => {
  resetFactoryCounter();
});

// ─── search ─────────────────────────────────────────────────────────────────

describe("search", () => {
  it("throws when not authenticated", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.query(api.search.search, { query: "test" })
    ).rejects.toThrow("Not authenticated");
  });

  it("returns empty results for empty query string", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await createAccount(t, { name: "Alice" });

    const results = await asUser.query(api.search.search, { query: "" });
    expect(results).toEqual({ accounts: [], warriors: [], threads: [] });
  });

  it("returns empty results for whitespace-only query", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await createAccount(t, { name: "Alice" });

    const results = await asUser.query(api.search.search, { query: "   " });
    expect(results).toEqual({ accounts: [], warriors: [], threads: [] });
  });

  it("caps limit at 20 even if larger value is provided", async () => {
    const t = convexTest(schema, modules);
    const { asUser, accountId } = await createAccount(t, { name: "Alice" });

    // Create 25 threads so we can verify the cap
    for (let i = 0; i < 25; i++) {
      await createThread(t, {
        authorId: accountId,
        title: `Searchable Thread ${i}`,
      });
    }

    const results = await asUser.query(api.search.search, {
      query: "Searchable",
      limit: 100,
    });
    // Should be capped at 20
    expect(results.threads.length).toBeLessThanOrEqual(20);
  });

  it("uses default limit of 5 when limit not provided", async () => {
    const t = convexTest(schema, modules);
    const { asUser, accountId } = await createAccount(t, { name: "Alice" });

    // Create 10 threads
    for (let i = 0; i < 10; i++) {
      await createThread(t, {
        authorId: accountId,
        title: `Findable Thread ${i}`,
      });
    }

    const results = await asUser.query(api.search.search, {
      query: "Findable",
    });
    // Default limit is 5
    expect(results.threads.length).toBeLessThanOrEqual(5);
  });

  it("finds accounts by name", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await createAccount(t, { name: "Searcher" });
    await createAccount(t, { name: "Banana Smith" });
    await createAccount(t, { name: "Cherry Jones" });

    const results = await asUser.query(api.search.search, {
      query: "Banana",
    });
    expect(results.accounts.length).toBeGreaterThanOrEqual(1);
    expect(results.accounts.some((a: { name: string }) => a.name === "Banana Smith")).toBe(true);
  });

  it("returns expected account fields", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await createAccount(t, { name: "Searcher" });
    await createAccount(t, {
      name: "Target User",
      role: "caregiver",
      profilePhoto: "https://example.com/photo.jpg",
    });

    const results = await asUser.query(api.search.search, {
      query: "Target",
    });
    expect(results.accounts.length).toBeGreaterThanOrEqual(1);
    const target = results.accounts.find(
      (a: { name: string }) => a.name === "Target User"
    );
    expect(target).toBeDefined();
    expect(target).toHaveProperty("_id");
    expect(target).toHaveProperty("name", "Target User");
    expect(target).toHaveProperty("role", "caregiver");
    expect(target).toHaveProperty("profilePhoto", "https://example.com/photo.jpg");
  });

  it("finds public warriors by name", async () => {
    const t = convexTest(schema, modules);
    const { asUser, accountId } = await createAccount(t, { name: "Searcher" });

    await createWarrior(t, {
      accountId,
      name: "Luna Warrior",
      visibility: "public",
    });

    const results = await asUser.query(api.search.search, {
      query: "Luna",
    });
    expect(results.warriors.length).toBeGreaterThanOrEqual(1);
    expect(
      results.warriors.some((w: { name: string }) => w.name === "Luna Warrior")
    ).toBe(true);
  });

  it("excludes private warriors from search results", async () => {
    const t = convexTest(schema, modules);
    const { asUser, accountId } = await createAccount(t, { name: "Searcher" });

    await createWarrior(t, {
      accountId,
      name: "Secret Warrior",
      visibility: "private",
    });
    await createWarrior(t, {
      accountId,
      name: "Secret Public",
      visibility: "public",
    });

    const results = await asUser.query(api.search.search, {
      query: "Secret",
    });
    // The private warrior should not appear
    expect(
      results.warriors.every((w: { name: string }) => w.name !== "Secret Warrior")
    ).toBe(true);
  });

  it("returns warrior results with account name", async () => {
    const t = convexTest(schema, modules);
    const { asUser, accountId } = await createAccount(t, {
      name: "Parent User",
    });

    await createWarrior(t, {
      accountId,
      name: "Star Warrior",
      visibility: "public",
      condition: "epilepsy",
    });

    const results = await asUser.query(api.search.search, {
      query: "Star",
    });
    const warrior = results.warriors.find(
      (w: { name: string }) => w.name === "Star Warrior"
    );
    expect(warrior).toBeDefined();
    expect(warrior).toHaveProperty("accountName", "Parent User");
    expect(warrior).toHaveProperty("condition");
    expect(warrior).toHaveProperty("currentStatus");
  });

  it("finds threads by title", async () => {
    const t = convexTest(schema, modules);
    const { asUser, accountId } = await createAccount(t, { name: "Searcher" });

    await createThread(t, {
      authorId: accountId,
      title: "Unique Discussion Topic",
      category: "general",
    });

    const results = await asUser.query(api.search.search, {
      query: "Unique Discussion",
    });
    expect(results.threads.length).toBeGreaterThanOrEqual(1);
    expect(
      results.threads.some(
        (th: { title: string }) => th.title === "Unique Discussion Topic"
      )
    ).toBe(true);
  });

  it("returns thread results with author name and comment count", async () => {
    const t = convexTest(schema, modules);
    const { asUser, accountId } = await createAccount(t, {
      name: "Thread Author",
    });

    await createThread(t, {
      authorId: accountId,
      title: "Specific Thread Title",
      category: "support",
      commentCount: 7,
    });

    const results = await asUser.query(api.search.search, {
      query: "Specific Thread",
    });
    const thread = results.threads.find(
      (th: { title: string }) => th.title === "Specific Thread Title"
    );
    expect(thread).toBeDefined();
    expect(thread).toHaveProperty("authorName", "Thread Author");
    expect(thread).toHaveProperty("category", "support");
    expect(thread).toHaveProperty("commentCount", 7);
  });

  it("searches across all three collections simultaneously", async () => {
    const t = convexTest(schema, modules);
    const { asUser, accountId } = await createAccount(t, {
      name: "Cosmic Searcher",
    });

    // Create data with "Cosmic" in each collection
    await createAccount(t, { name: "Cosmic Friend" });
    await createWarrior(t, {
      accountId,
      name: "Cosmic Warrior",
      visibility: "public",
    });
    await createThread(t, {
      authorId: accountId,
      title: "Cosmic Thread",
    });

    const results = await asUser.query(api.search.search, {
      query: "Cosmic",
    });
    // Should have results in all three categories
    expect(results.accounts.length).toBeGreaterThanOrEqual(1);
    expect(results.warriors.length).toBeGreaterThanOrEqual(1);
    expect(results.threads.length).toBeGreaterThanOrEqual(1);
  });
});
