import { convexTest } from "convex-test";
import { describe, expect, it, beforeEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";
import { createAccount, resetFactoryCounter } from "./test.factories";

beforeEach(() => {
  resetFactoryCounter();
});

describe("blockUser", () => {
  it("successfully blocks another user", async () => {
    const t = convexTest(schema, modules);
    const { asUser: alice, accountId: aliceId } = await createAccount(t, {
      name: "Alice",
    });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const result = await alice.mutation(api.blockedUsers.blockUser, {
      accountId: bobId,
    });
    expect(result).toEqual({ success: true });

    // Verify the block exists
    const isBlocked = await alice.query(api.blockedUsers.isUserBlocked, {
      accountId: bobId,
    });
    expect(isBlocked).toBe(true);
  });

  it("throws 'Not authenticated' for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    await expect(
      t.mutation(api.blockedUsers.blockUser, { accountId: bobId })
    ).rejects.toThrow("Not authenticated");
  });

  it("throws 'Cannot block yourself'", async () => {
    const t = convexTest(schema, modules);
    const { asUser: alice, accountId: aliceId } = await createAccount(t, {
      name: "Alice",
    });

    await expect(
      alice.mutation(api.blockedUsers.blockUser, { accountId: aliceId })
    ).rejects.toThrow("Cannot block yourself");
  });

  it("throws 'User is already blocked' on double-block", async () => {
    const t = convexTest(schema, modules);
    const { asUser: alice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    await alice.mutation(api.blockedUsers.blockUser, { accountId: bobId });

    await expect(
      alice.mutation(api.blockedUsers.blockUser, { accountId: bobId })
    ).rejects.toThrow("User is already blocked");
  });
});

describe("unblockUser", () => {
  it("successfully unblocks a blocked user", async () => {
    const t = convexTest(schema, modules);
    const { asUser: alice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    await alice.mutation(api.blockedUsers.blockUser, { accountId: bobId });

    const result = await alice.mutation(api.blockedUsers.unblockUser, {
      accountId: bobId,
    });
    expect(result).toEqual({ success: true });

    // Verify the block no longer exists
    const isBlocked = await alice.query(api.blockedUsers.isUserBlocked, {
      accountId: bobId,
    });
    expect(isBlocked).toBe(false);
  });

  it("throws 'Not authenticated' for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    await expect(
      t.mutation(api.blockedUsers.unblockUser, { accountId: bobId })
    ).rejects.toThrow("Not authenticated");
  });

  it("throws 'User is not blocked' when not blocked", async () => {
    const t = convexTest(schema, modules);
    const { asUser: alice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    await expect(
      alice.mutation(api.blockedUsers.unblockUser, { accountId: bobId })
    ).rejects.toThrow("User is not blocked");
  });
});

describe("getBlockedUsers", () => {
  it("returns empty array for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.blockedUsers.getBlockedUsers);
    expect(result).toEqual([]);
  });

  it("returns list with blockedAccount details", async () => {
    const t = convexTest(schema, modules);
    const { asUser: alice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });
    const { accountId: carolId } = await createAccount(t, { name: "Carol" });

    await alice.mutation(api.blockedUsers.blockUser, { accountId: bobId });
    await alice.mutation(api.blockedUsers.blockUser, { accountId: carolId });

    const blocked = await alice.query(api.blockedUsers.getBlockedUsers);
    expect(blocked).toHaveLength(2);

    const names = blocked.map((b: any) => b.blockedAccount?.name).sort();
    expect(names).toEqual(["Bob", "Carol"]);

    // Each entry should have blockedAccount details
    for (const entry of blocked) {
      expect(entry.blockedAccount).not.toBeNull();
      expect(entry.blockedAccount).toHaveProperty("_id");
      expect(entry.blockedAccount).toHaveProperty("name");
      expect(entry.blockerId).toBeDefined();
      expect(entry.blockedId).toBeDefined();
    }
  });
});

describe("isUserBlocked", () => {
  it("returns false for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const result = await t.query(api.blockedUsers.isUserBlocked, {
      accountId: bobId,
    });
    expect(result).toBe(false);
  });

  it("returns true when blocked, false when not", async () => {
    const t = convexTest(schema, modules);
    const { asUser: alice } = await createAccount(t, { name: "Alice" });
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });
    const { accountId: carolId } = await createAccount(t, { name: "Carol" });

    // Neither blocked yet
    expect(
      await alice.query(api.blockedUsers.isUserBlocked, { accountId: bobId })
    ).toBe(false);

    // Block Bob
    await alice.mutation(api.blockedUsers.blockUser, { accountId: bobId });

    // Bob is blocked, Carol is not
    expect(
      await alice.query(api.blockedUsers.isUserBlocked, { accountId: bobId })
    ).toBe(true);
    expect(
      await alice.query(api.blockedUsers.isUserBlocked, { accountId: carolId })
    ).toBe(false);
  });
});

describe("getBlockStatus", () => {
  it("returns correct bidirectional status", async () => {
    const t = convexTest(schema, modules);
    const { asUser: alice, accountId: aliceId } = await createAccount(t, {
      name: "Alice",
    });
    const { asUser: bob, accountId: bobId } = await createAccount(t, {
      name: "Bob",
    });

    // No blocks yet
    const statusBefore = await alice.query(api.blockedUsers.getBlockStatus, {
      accountId: bobId,
    });
    expect(statusBefore).toEqual({ blockedByMe: false, blockedByThem: false });

    // Alice blocks Bob
    await alice.mutation(api.blockedUsers.blockUser, { accountId: bobId });

    // From Alice's perspective: blockedByMe=true, blockedByThem=false
    const aliceStatus = await alice.query(api.blockedUsers.getBlockStatus, {
      accountId: bobId,
    });
    expect(aliceStatus).toEqual({ blockedByMe: true, blockedByThem: false });

    // From Bob's perspective: blockedByMe=false, blockedByThem=true
    const bobStatus = await bob.query(api.blockedUsers.getBlockStatus, {
      accountId: aliceId,
    });
    expect(bobStatus).toEqual({ blockedByMe: false, blockedByThem: true });

    // Bob also blocks Alice — now both directions
    await bob.mutation(api.blockedUsers.blockUser, { accountId: aliceId });

    const aliceStatusAfter = await alice.query(
      api.blockedUsers.getBlockStatus,
      { accountId: bobId }
    );
    expect(aliceStatusAfter).toEqual({
      blockedByMe: true,
      blockedByThem: true,
    });

    const bobStatusAfter = await bob.query(api.blockedUsers.getBlockStatus, {
      accountId: aliceId,
    });
    expect(bobStatusAfter).toEqual({ blockedByMe: true, blockedByThem: true });
  });

  it("returns both false for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { accountId: bobId } = await createAccount(t, { name: "Bob" });

    const result = await t.query(api.blockedUsers.getBlockStatus, {
      accountId: bobId,
    });
    expect(result).toEqual({ blockedByMe: false, blockedByThem: false });
  });
});
