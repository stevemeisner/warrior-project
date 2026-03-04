import { convexTest } from "convex-test";
import { describe, expect, it, beforeEach } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";
import {
  createAccount,
  createWarrior,
  createCaregiverRelation,
  createStatusUpdate,
  resetFactoryCounter,
} from "./test.factories";

beforeEach(() => {
  resetFactoryCounter();
});

// ─── updateStatus ────────────────────────────────────────────────────────────

describe("updateStatus", () => {
  it("owner can update their warrior's status", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice", role: "family" });
    const { warriorId } = await createWarrior(t, { accountId, name: "Warrior1" });

    const statusUpdateId = await asUser.mutation(api.status.updateStatus, {
      warriorId,
      status: "thriving",
      context: "Feeling great today",
    });

    expect(statusUpdateId).toBeDefined();

    // Verify warrior's currentStatus was updated
    const warrior = await t.run(async (ctx) => ctx.db.get(warriorId));
    expect(warrior!.currentStatus).toBe("thriving");
    expect(warrior!.isFeather).toBe(false);
  });

  it("sets isFeather to true when status is feather", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });
    const { warriorId } = await createWarrior(t, { accountId });

    await asUser.mutation(api.status.updateStatus, {
      warriorId,
      status: "feather",
    });

    const warrior = await t.run(async (ctx) => ctx.db.get(warriorId));
    expect(warrior!.currentStatus).toBe("feather");
    expect(warrior!.isFeather).toBe(true);
  });

  it("creates a statusUpdate record with correct fields", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });
    const { warriorId } = await createWarrior(t, { accountId });

    const statusUpdateId = await asUser.mutation(api.status.updateStatus, {
      warriorId,
      status: "struggling",
      context: "Hard day",
      visibility: "private",
    });

    const statusUpdate = await t.run(async (ctx) => ctx.db.get(statusUpdateId));
    expect(statusUpdate).not.toBeNull();
    expect(statusUpdate!.status).toBe("struggling");
    expect(statusUpdate!.context).toBe("Hard day");
    expect(statusUpdate!.visibility).toBe("private");
    expect(statusUpdate!.updatedBy).toEqual(accountId);
    expect(statusUpdate!.warriorId).toEqual(warriorId);
  });

  it("uses warrior visibility as default when no visibility arg provided", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t);
    const { warriorId } = await createWarrior(t, { accountId, visibility: "connections" });

    const statusUpdateId = await asUser.mutation(api.status.updateStatus, {
      warriorId,
      status: "stable",
    });

    const statusUpdate = await t.run(async (ctx) => ctx.db.get(statusUpdateId));
    expect(statusUpdate!.visibility).toBe("connections");
  });

  it("caregiver with canUpdate can update status", async () => {
    const t = convexTest(schema, modules);
    const { accountId: ownerId } = await createAccount(t, { name: "Owner" });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(t, {
      name: "Caregiver",
      role: "caregiver",
    });
    const { warriorId } = await createWarrior(t, { accountId: ownerId });

    await createCaregiverRelation(t, {
      accountId: ownerId,
      caregiverAccountId: caregiverId,
      permissions: "canUpdate",
      inviteStatus: "accepted",
    });

    const statusUpdateId = await asCaregiver.mutation(api.status.updateStatus, {
      warriorId,
      status: "hospitalized",
    });

    expect(statusUpdateId).toBeDefined();
    const warrior = await t.run(async (ctx) => ctx.db.get(warriorId));
    expect(warrior!.currentStatus).toBe("hospitalized");
  });

  it("caregiver with fullAccess can update status", async () => {
    const t = convexTest(schema, modules);
    const { accountId: ownerId } = await createAccount(t, { name: "Owner" });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(t, {
      name: "Caregiver",
      role: "caregiver",
    });
    const { warriorId } = await createWarrior(t, { accountId: ownerId });

    await createCaregiverRelation(t, {
      accountId: ownerId,
      caregiverAccountId: caregiverId,
      permissions: "fullAccess",
      inviteStatus: "accepted",
    });

    const statusUpdateId = await asCaregiver.mutation(api.status.updateStatus, {
      warriorId,
      status: "stable",
    });

    expect(statusUpdateId).toBeDefined();
  });

  it("caregiver with viewOnly is rejected", async () => {
    const t = convexTest(schema, modules);
    const { accountId: ownerId } = await createAccount(t, { name: "Owner" });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(t, {
      name: "Caregiver",
      role: "caregiver",
    });
    const { warriorId } = await createWarrior(t, { accountId: ownerId });

    await createCaregiverRelation(t, {
      accountId: ownerId,
      caregiverAccountId: caregiverId,
      permissions: "viewOnly",
      inviteStatus: "accepted",
    });

    await expect(
      asCaregiver.mutation(api.status.updateStatus, {
        warriorId,
        status: "thriving",
      })
    ).rejects.toThrow("Not authorized");
  });

  it("caregiver with canMessage is rejected", async () => {
    const t = convexTest(schema, modules);
    const { accountId: ownerId } = await createAccount(t, { name: "Owner" });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(t, {
      name: "Caregiver",
      role: "caregiver",
    });
    const { warriorId } = await createWarrior(t, { accountId: ownerId });

    await createCaregiverRelation(t, {
      accountId: ownerId,
      caregiverAccountId: caregiverId,
      permissions: "canMessage",
      inviteStatus: "accepted",
    });

    await expect(
      asCaregiver.mutation(api.status.updateStatus, {
        warriorId,
        status: "thriving",
      })
    ).rejects.toThrow("Not authorized");
  });

  it("pending caregiver is rejected", async () => {
    const t = convexTest(schema, modules);
    const { accountId: ownerId } = await createAccount(t, { name: "Owner" });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(t, {
      name: "Caregiver",
      role: "caregiver",
    });
    const { warriorId } = await createWarrior(t, { accountId: ownerId });

    await createCaregiverRelation(t, {
      accountId: ownerId,
      caregiverAccountId: caregiverId,
      permissions: "canUpdate",
      inviteStatus: "pending",
    });

    await expect(
      asCaregiver.mutation(api.status.updateStatus, {
        warriorId,
        status: "thriving",
      })
    ).rejects.toThrow("Not authorized");
  });

  it("unrelated user is rejected", async () => {
    const t = convexTest(schema, modules);
    const { accountId: ownerId } = await createAccount(t, { name: "Owner" });
    const { asUser: asStranger } = await createAccount(t, { name: "Stranger" });
    const { warriorId } = await createWarrior(t, { accountId: ownerId });

    await expect(
      asStranger.mutation(api.status.updateStatus, {
        warriorId,
        status: "thriving",
      })
    ).rejects.toThrow("Not authorized");
  });

  it("throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t);
    const { warriorId } = await createWarrior(t, { accountId });

    await expect(
      t.mutation(api.status.updateStatus, {
        warriorId,
        status: "thriving",
      })
    ).rejects.toThrow("Not authenticated");
  });

  it("creates notifications for accepted caregivers", async () => {
    const t = convexTest(schema, modules);
    const { accountId: ownerId, asUser: asOwner } = await createAccount(t, { name: "Owner" });
    const { accountId: caregiverId } = await createAccount(t, {
      name: "Caregiver",
      role: "caregiver",
    });
    const { warriorId } = await createWarrior(t, { accountId: ownerId, name: "WarriorKid" });

    await createCaregiverRelation(t, {
      accountId: ownerId,
      caregiverAccountId: caregiverId,
      permissions: "viewOnly",
      inviteStatus: "accepted",
    });

    await asOwner.mutation(api.status.updateStatus, {
      warriorId,
      status: "thriving",
    });

    // Verify notification was created for the caregiver
    const notifications = await t.run(async (ctx) => {
      return await ctx.db
        .query("notifications")
        .withIndex("by_account", (q) => q.eq("accountId", caregiverId))
        .collect();
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("statusChange");
    expect(notifications[0].message).toContain("WarriorKid");
    expect(notifications[0].message).toContain("thriving");
    expect(notifications[0].relatedWarriorId).toEqual(warriorId);
  });

  it("does not create notifications for pending caregivers", async () => {
    const t = convexTest(schema, modules);
    const { accountId: ownerId, asUser: asOwner } = await createAccount(t, { name: "Owner" });
    const { accountId: caregiverId } = await createAccount(t, {
      name: "Caregiver",
      role: "caregiver",
    });
    const { warriorId } = await createWarrior(t, { accountId: ownerId });

    await createCaregiverRelation(t, {
      accountId: ownerId,
      caregiverAccountId: caregiverId,
      permissions: "viewOnly",
      inviteStatus: "pending",
    });

    await asOwner.mutation(api.status.updateStatus, {
      warriorId,
      status: "thriving",
    });

    const notifications = await t.run(async (ctx) => {
      return await ctx.db
        .query("notifications")
        .withIndex("by_account", (q) => q.eq("accountId", caregiverId))
        .collect();
    });

    expect(notifications).toHaveLength(0);
  });
});

// ─── getStatusHistory ────────────────────────────────────────────────────────

describe("getStatusHistory", () => {
  it("owner sees all visibility levels", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });
    const { warriorId } = await createWarrior(t, { accountId });

    await createStatusUpdate(t, { warriorId, updatedBy: accountId, visibility: "public", status: "stable" });
    await createStatusUpdate(t, { warriorId, updatedBy: accountId, visibility: "private", status: "struggling" });
    await createStatusUpdate(t, { warriorId, updatedBy: accountId, visibility: "connections", status: "thriving" });

    const history = await asUser.query(api.status.getStatusHistory, { warriorId });
    expect(history).toHaveLength(3);
  });

  it("caregiver with accepted status sees all visibility levels", async () => {
    const t = convexTest(schema, modules);
    const { accountId: ownerId } = await createAccount(t, { name: "Owner" });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(t, {
      name: "Caregiver",
      role: "caregiver",
    });
    const { warriorId } = await createWarrior(t, { accountId: ownerId });

    await createCaregiverRelation(t, {
      accountId: ownerId,
      caregiverAccountId: caregiverId,
      permissions: "viewOnly",
      inviteStatus: "accepted",
    });

    await createStatusUpdate(t, { warriorId, updatedBy: ownerId, visibility: "private", status: "struggling" });
    await createStatusUpdate(t, { warriorId, updatedBy: ownerId, visibility: "public", status: "stable" });

    const history = await asCaregiver.query(api.status.getStatusHistory, { warriorId });
    expect(history).toHaveLength(2);
  });

  it("unrelated user sees only public updates", async () => {
    const t = convexTest(schema, modules);
    const { accountId: ownerId } = await createAccount(t, { name: "Owner" });
    const { asUser: asStranger } = await createAccount(t, { name: "Stranger" });
    const { warriorId } = await createWarrior(t, { accountId: ownerId });

    await createStatusUpdate(t, { warriorId, updatedBy: ownerId, visibility: "public", status: "stable" });
    await createStatusUpdate(t, { warriorId, updatedBy: ownerId, visibility: "private", status: "struggling" });
    await createStatusUpdate(t, { warriorId, updatedBy: ownerId, visibility: "connections", status: "thriving" });

    const history = await asStranger.query(api.status.getStatusHistory, { warriorId });
    expect(history).toHaveLength(1);
    expect(history[0].visibility).toBe("public");
  });

  it("unauthenticated user sees only public updates", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Owner" });
    const { warriorId } = await createWarrior(t, { accountId });

    await createStatusUpdate(t, { warriorId, updatedBy: accountId, visibility: "public", status: "stable" });
    await createStatusUpdate(t, { warriorId, updatedBy: accountId, visibility: "private", status: "struggling" });

    const history = await t.query(api.status.getStatusHistory, { warriorId });
    expect(history).toHaveLength(1);
    expect(history[0].visibility).toBe("public");
  });

  it("returns updates ordered descending by creation", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });
    const { warriorId } = await createWarrior(t, { accountId });

    await createStatusUpdate(t, { warriorId, updatedBy: accountId, status: "stable" });
    await createStatusUpdate(t, { warriorId, updatedBy: accountId, status: "thriving" });

    const history = await asUser.query(api.status.getStatusHistory, { warriorId });
    expect(history).toHaveLength(2);
    // Desc order: most recent first
    expect(history[0].createdAt).toBeGreaterThanOrEqual(history[1].createdAt);
  });

  it("enriches with updatedByName", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { name: "Alice" });
    const { warriorId } = await createWarrior(t, { accountId });

    await createStatusUpdate(t, { warriorId, updatedBy: accountId, status: "stable" });

    const history = await asUser.query(api.status.getStatusHistory, { warriorId });
    expect(history[0].updatedByName).toBe("Alice");
  });

  it("respects limit argument", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t);
    const { warriorId } = await createWarrior(t, { accountId });

    await createStatusUpdate(t, { warriorId, updatedBy: accountId, status: "stable" });
    await createStatusUpdate(t, { warriorId, updatedBy: accountId, status: "thriving" });
    await createStatusUpdate(t, { warriorId, updatedBy: accountId, status: "struggling" });

    const history = await asUser.query(api.status.getStatusHistory, { warriorId, limit: 2 });
    expect(history).toHaveLength(2);
  });

  it("returns empty array when warrior does not exist", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t);
    const { warriorId } = await createWarrior(t, { accountId });

    // Delete the warrior
    await t.run(async (ctx) => ctx.db.delete(warriorId));

    const history = await asUser.query(api.status.getStatusHistory, { warriorId });
    expect(history).toEqual([]);
  });
});

// ─── getRecentUpdates ────────────────────────────────────────────────────────

describe("getRecentUpdates", () => {
  it("returns recent public updates enriched with warrior info", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { name: "Alice" });
    const { warriorId } = await createWarrior(t, { accountId, name: "WarriorKid" });

    await createStatusUpdate(t, { warriorId, updatedBy: accountId, visibility: "public", status: "thriving" });

    const updates = await t.query(api.status.getRecentUpdates, {});
    expect(updates).toHaveLength(1);
    expect(updates[0].warrior).not.toBeNull();
    expect(updates[0].warrior!.name).toBe("WarriorKid");
    expect(updates[0].updatedByName).toBe("Alice");
  });

  it("filters out non-public updates", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t);
    const { warriorId } = await createWarrior(t, { accountId });

    await createStatusUpdate(t, { warriorId, updatedBy: accountId, visibility: "public", status: "stable" });
    await createStatusUpdate(t, { warriorId, updatedBy: accountId, visibility: "private", status: "struggling" });
    await createStatusUpdate(t, { warriorId, updatedBy: accountId, visibility: "connections", status: "thriving" });

    const updates = await t.query(api.status.getRecentUpdates, {});
    expect(updates).toHaveLength(1);
    expect(updates[0].status).toBe("stable");
  });

  it("filters out updates where warrior is null (deleted)", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t);
    const { warriorId } = await createWarrior(t, { accountId });

    await createStatusUpdate(t, { warriorId, updatedBy: accountId, visibility: "public", status: "stable" });

    // Delete the warrior
    await t.run(async (ctx) => ctx.db.delete(warriorId));

    const updates = await t.query(api.status.getRecentUpdates, {});
    expect(updates).toHaveLength(0);
  });

  it("respects limit argument", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t);
    const { warriorId } = await createWarrior(t, { accountId });

    await createStatusUpdate(t, { warriorId, updatedBy: accountId, visibility: "public", status: "stable" });
    await createStatusUpdate(t, { warriorId, updatedBy: accountId, visibility: "public", status: "thriving" });
    await createStatusUpdate(t, { warriorId, updatedBy: accountId, visibility: "public", status: "struggling" });

    const updates = await t.query(api.status.getRecentUpdates, { limit: 2 });
    expect(updates).toHaveLength(2);
  });

  it("works for unauthenticated users", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t);
    const { warriorId } = await createWarrior(t, { accountId });

    await createStatusUpdate(t, { warriorId, updatedBy: accountId, visibility: "public", status: "stable" });

    const updates = await t.query(api.status.getRecentUpdates, {});
    expect(updates).toHaveLength(1);
  });
});

// ─── getStatusStats ──────────────────────────────────────────────────────────

describe("getStatusStats", () => {
  it("owner can view stats with correct counts", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t);
    const { warriorId } = await createWarrior(t, { accountId });

    await createStatusUpdate(t, { warriorId, updatedBy: accountId, status: "stable" });
    await createStatusUpdate(t, { warriorId, updatedBy: accountId, status: "stable" });
    await createStatusUpdate(t, { warriorId, updatedBy: accountId, status: "thriving" });
    await createStatusUpdate(t, { warriorId, updatedBy: accountId, status: "hospitalized" });

    const stats = await asUser.query(api.status.getStatusStats, { warriorId });
    expect(stats).not.toBeNull();
    expect(stats!.total).toBe(4);
    expect(stats!.byStatus.stable).toBe(2);
    expect(stats!.byStatus.thriving).toBe(1);
    expect(stats!.byStatus.hospitalized).toBe(1);
    expect(stats!.byStatus.struggling).toBe(0);
    expect(stats!.byStatus.feather).toBe(0);
    expect(stats!.byStatus.needsSupport).toBe(0);
  });

  it("returns null for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t);
    const { warriorId } = await createWarrior(t, { accountId });

    const stats = await t.query(api.status.getStatusStats, { warriorId });
    expect(stats).toBeNull();
  });

  it("returns null for non-owner", async () => {
    const t = convexTest(schema, modules);
    const { accountId: ownerId } = await createAccount(t, { name: "Owner" });
    const { asUser: asStranger } = await createAccount(t, { name: "Stranger" });
    const { warriorId } = await createWarrior(t, { accountId: ownerId });

    const stats = await asStranger.query(api.status.getStatusStats, { warriorId });
    expect(stats).toBeNull();
  });

  it("returns null when warrior does not exist", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t);
    const { warriorId } = await createWarrior(t, { accountId });

    await t.run(async (ctx) => ctx.db.delete(warriorId));

    const stats = await asUser.query(api.status.getStatusStats, { warriorId });
    expect(stats).toBeNull();
  });

  it("returns stats with zero total when no updates exist", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t);
    const { warriorId } = await createWarrior(t, { accountId });

    const stats = await asUser.query(api.status.getStatusStats, { warriorId });
    expect(stats).not.toBeNull();
    expect(stats!.total).toBe(0);
  });
});
