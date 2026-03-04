import { convexTest } from "convex-test";
import { describe, expect, it, beforeEach } from "vitest";
import { api } from "./_generated/api";
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

// ─── getMyWarriors ──────────────────────────────────────────────────────────

describe("getMyWarriors", () => {
  it("returns empty array for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.warriors.getMyWarriors);
    expect(result).toEqual([]);
  });

  it("returns warriors belonging to the authenticated user's account", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, {
      name: "Alice",
      role: "family",
    });

    await createWarrior(t, { accountId, name: "Warrior A" });
    await createWarrior(t, { accountId, name: "Warrior B" });

    const result = await asUser.query(api.warriors.getMyWarriors);
    expect(result).toHaveLength(2);
    const names = result.map((w: { name: string }) => w.name);
    expect(names).toContain("Warrior A");
    expect(names).toContain("Warrior B");
  });

  it("does not return warriors belonging to other accounts", async () => {
    const t = convexTest(schema, modules);
    const { accountId: aliceId, asUser: asAlice } = await createAccount(t, {
      name: "Alice",
      role: "family",
    });
    const { accountId: bobId } = await createAccount(t, {
      name: "Bob",
      role: "family",
    });

    await createWarrior(t, { accountId: aliceId, name: "Alice Warrior" });
    await createWarrior(t, { accountId: bobId, name: "Bob Warrior" });

    const result = await asAlice.query(api.warriors.getMyWarriors);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice Warrior");
  });

  it("returns empty array when user has no warriors", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await createAccount(t, {
      name: "Alice",
      role: "family",
    });

    const result = await asUser.query(api.warriors.getMyWarriors);
    expect(result).toEqual([]);
  });
});

// ─── getWarrior ─────────────────────────────────────────────────────────────

describe("getWarrior", () => {
  it("returns null for nonexistent warrior", async () => {
    const t = convexTest(schema, modules);
    // Create a warrior just to get a valid-format ID, then use a different one
    const { warriorId } = await createWarrior(t);

    // Delete it so it does not exist
    await t.run(async (ctx) => {
      await ctx.db.delete(warriorId);
    });

    const result = await t.query(api.warriors.getWarrior, { warriorId });
    expect(result).toBeNull();
  });

  it("owner can see their own warrior regardless of visibility", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, {
      name: "Alice",
      role: "family",
    });

    const { warriorId } = await createWarrior(t, {
      accountId,
      name: "Private Warrior",
      visibility: "private",
    });

    const result = await asUser.query(api.warriors.getWarrior, { warriorId });
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Private Warrior");
  });

  it("accepted caregiver can see all warriors of the family", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(
      t,
      { name: "Caregiver", role: "caregiver" },
    );

    await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: caregiverId,
      inviteStatus: "accepted",
      permissions: "viewOnly",
    });

    const { warriorId } = await createWarrior(t, {
      accountId: familyId,
      name: "Private Warrior",
      visibility: "private",
    });

    const result = await asCaregiver.query(api.warriors.getWarrior, {
      warriorId,
    });
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Private Warrior");
  });

  it("pending caregiver cannot see private warriors", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(
      t,
      { name: "Caregiver", role: "caregiver" },
    );

    await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: caregiverId,
      inviteStatus: "pending",
    });

    const { warriorId } = await createWarrior(t, {
      accountId: familyId,
      visibility: "private",
    });

    const result = await asCaregiver.query(api.warriors.getWarrior, {
      warriorId,
    });
    expect(result).toBeNull();
  });

  it("unrelated user can see public warriors", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { asUser: asStranger } = await createAccount(t, {
      name: "Stranger",
    });

    const { warriorId } = await createWarrior(t, {
      accountId: familyId,
      visibility: "public",
      name: "Public Warrior",
    });

    const result = await asStranger.query(api.warriors.getWarrior, {
      warriorId,
    });
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Public Warrior");
  });

  it("unrelated user cannot see private warriors", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { asUser: asStranger } = await createAccount(t, {
      name: "Stranger",
    });

    const { warriorId } = await createWarrior(t, {
      accountId: familyId,
      visibility: "private",
    });

    const result = await asStranger.query(api.warriors.getWarrior, {
      warriorId,
    });
    expect(result).toBeNull();
  });

  it("unauthenticated user can see public warriors", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { role: "family" });

    const { warriorId } = await createWarrior(t, {
      accountId,
      visibility: "public",
      name: "Public Warrior",
    });

    const result = await t.query(api.warriors.getWarrior, { warriorId });
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Public Warrior");
  });

  it("unauthenticated user cannot see private warriors", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { role: "family" });

    const { warriorId } = await createWarrior(t, {
      accountId,
      visibility: "private",
    });

    const result = await t.query(api.warriors.getWarrior, { warriorId });
    expect(result).toBeNull();
  });

  it("unrelated user cannot see connections-only warriors", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { asUser: asStranger } = await createAccount(t, {
      name: "Stranger",
    });

    const { warriorId } = await createWarrior(t, {
      accountId: familyId,
      visibility: "connections",
    });

    const result = await asStranger.query(api.warriors.getWarrior, {
      warriorId,
    });
    expect(result).toBeNull();
  });
});

// ─── getWarriorsByAccount ───────────────────────────────────────────────────

describe("getWarriorsByAccount", () => {
  it("owner sees all their warriors regardless of visibility", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, {
      name: "Alice",
      role: "family",
    });

    await createWarrior(t, { accountId, visibility: "public" });
    await createWarrior(t, { accountId, visibility: "private" });
    await createWarrior(t, { accountId, visibility: "connections" });

    const result = await asUser.query(api.warriors.getWarriorsByAccount, {
      accountId,
    });
    expect(result).toHaveLength(3);
  });

  it("accepted caregiver sees all warriors of the family", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(
      t,
      { name: "Caregiver", role: "caregiver" },
    );

    await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: caregiverId,
      inviteStatus: "accepted",
    });

    await createWarrior(t, { accountId: familyId, visibility: "public" });
    await createWarrior(t, { accountId: familyId, visibility: "private" });

    const result = await asCaregiver.query(api.warriors.getWarriorsByAccount, {
      accountId: familyId,
    });
    expect(result).toHaveLength(2);
  });

  it("unrelated user sees only public warriors", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { asUser: asStranger } = await createAccount(t, {
      name: "Stranger",
    });

    await createWarrior(t, {
      accountId: familyId,
      visibility: "public",
      name: "Public",
    });
    await createWarrior(t, {
      accountId: familyId,
      visibility: "private",
      name: "Private",
    });

    const result = await asStranger.query(api.warriors.getWarriorsByAccount, {
      accountId: familyId,
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Public");
  });

  it("unauthenticated user sees only public warriors", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { role: "family" });

    await createWarrior(t, { accountId, visibility: "public" });
    await createWarrior(t, { accountId, visibility: "private" });
    await createWarrior(t, { accountId, visibility: "connections" });

    const result = await t.query(api.warriors.getWarriorsByAccount, {
      accountId,
    });
    expect(result).toHaveLength(1);
  });

  it("pending caregiver sees only public warriors", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(
      t,
      { name: "Caregiver", role: "caregiver" },
    );

    await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: caregiverId,
      inviteStatus: "pending",
    });

    await createWarrior(t, { accountId: familyId, visibility: "public" });
    await createWarrior(t, { accountId: familyId, visibility: "private" });

    const result = await asCaregiver.query(api.warriors.getWarriorsByAccount, {
      accountId: familyId,
    });
    expect(result).toHaveLength(1);
  });
});

// ─── createWarrior ──────────────────────────────────────────────────────────

describe("createWarrior", () => {
  it("family account can create a warrior", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, {
      name: "Alice",
      role: "family",
    });

    const warriorId = await asUser.mutation(api.warriors.createWarrior, {
      name: "My Warrior",
      condition: "Autism",
      bio: "A brave little fighter",
    });

    expect(warriorId).toBeDefined();

    // Verify the warrior in the DB
    const warrior = await t.run(async (ctx) => ctx.db.get(warriorId));
    expect(warrior).not.toBeNull();
    expect(warrior!.name).toBe("My Warrior");
    expect(warrior!.condition).toBe("Autism");
    expect(warrior!.bio).toBe("A brave little fighter");
    expect(warrior!.accountId).toEqual(accountId);
    expect(warrior!.currentStatus).toBe("stable");
    expect(warrior!.isFeather).toBe(false);
    expect(warrior!.visibility).toBe("public");
  });

  it("creates an initial status update record", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, {
      name: "Alice",
      role: "family",
    });

    const warriorId = await asUser.mutation(api.warriors.createWarrior, {
      name: "My Warrior",
    });

    // Verify initial status update was created
    const statusUpdates = await t.run(async (ctx) => {
      return await ctx.db
        .query("statusUpdates")
        .withIndex("by_warrior", (q) => q.eq("warriorId", warriorId))
        .collect();
    });

    expect(statusUpdates).toHaveLength(1);
    expect(statusUpdates[0].status).toBe("stable");
    expect(statusUpdates[0].updatedBy).toEqual(accountId);
    expect(statusUpdates[0].visibility).toBe("public");
  });

  it("defaults visibility to public", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await createAccount(t, { role: "family" });

    const warriorId = await asUser.mutation(api.warriors.createWarrior, {
      name: "Public Warrior",
    });

    const warrior = await t.run(async (ctx) => ctx.db.get(warriorId));
    expect(warrior!.visibility).toBe("public");
  });

  it("respects custom visibility setting", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await createAccount(t, { role: "family" });

    const warriorId = await asUser.mutation(api.warriors.createWarrior, {
      name: "Private Warrior",
      visibility: "private",
    });

    const warrior = await t.run(async (ctx) => ctx.db.get(warriorId));
    expect(warrior!.visibility).toBe("private");

    // Also verify status update inherits the visibility
    const statusUpdates = await t.run(async (ctx) => {
      return await ctx.db
        .query("statusUpdates")
        .withIndex("by_warrior", (q) => q.eq("warriorId", warriorId))
        .collect();
    });
    expect(statusUpdates[0].visibility).toBe("private");
  });

  it("throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.warriors.createWarrior, { name: "Test" }),
    ).rejects.toThrow("Not authenticated");
  });

  it("throws for caregiver accounts", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await createAccount(t, {
      name: "Bob",
      role: "caregiver",
    });

    await expect(
      asUser.mutation(api.warriors.createWarrior, { name: "Test" }),
    ).rejects.toThrow("Only family accounts can create warriors");
  });

  it("stores optional fields correctly", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await createAccount(t, { role: "family" });

    const warriorId = await asUser.mutation(api.warriors.createWarrior, {
      name: "Full Warrior",
      dateOfBirth: "2020-01-15",
      condition: "Epilepsy",
      profilePhoto: "https://example.com/photo.jpg",
      bio: "A detailed bio",
      visibility: "connections",
    });

    const warrior = await t.run(async (ctx) => ctx.db.get(warriorId));
    expect(warrior!.dateOfBirth).toBe("2020-01-15");
    expect(warrior!.condition).toBe("Epilepsy");
    expect(warrior!.profilePhoto).toBe("https://example.com/photo.jpg");
    expect(warrior!.bio).toBe("A detailed bio");
    expect(warrior!.visibility).toBe("connections");
  });
});

// ─── updateWarrior ──────────────────────────────────────────────────────────

describe("updateWarrior", () => {
  it("owner can update their warrior", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, {
      name: "Alice",
      role: "family",
    });

    const { warriorId } = await createWarrior(t, {
      accountId,
      name: "Original Name",
    });

    await asUser.mutation(api.warriors.updateWarrior, {
      warriorId,
      name: "Updated Name",
      bio: "New bio",
    });

    const warrior = await t.run(async (ctx) => ctx.db.get(warriorId));
    expect(warrior!.name).toBe("Updated Name");
    expect(warrior!.bio).toBe("New bio");
  });

  it("caregiver with fullAccess can update", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(
      t,
      { name: "Caregiver", role: "caregiver" },
    );

    await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: caregiverId,
      permissions: "fullAccess",
      inviteStatus: "accepted",
    });

    const { warriorId } = await createWarrior(t, {
      accountId: familyId,
      name: "Original",
    });

    await asCaregiver.mutation(api.warriors.updateWarrior, {
      warriorId,
      name: "Updated by Caregiver",
    });

    const warrior = await t.run(async (ctx) => ctx.db.get(warriorId));
    expect(warrior!.name).toBe("Updated by Caregiver");
  });

  it("caregiver with viewOnly cannot update", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(
      t,
      { name: "Caregiver", role: "caregiver" },
    );

    await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: caregiverId,
      permissions: "viewOnly",
      inviteStatus: "accepted",
    });

    const { warriorId } = await createWarrior(t, { accountId: familyId });

    await expect(
      asCaregiver.mutation(api.warriors.updateWarrior, {
        warriorId,
        name: "Hacked",
      }),
    ).rejects.toThrow("Not authorized to update this warrior");
  });

  it("caregiver with canMessage cannot update", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(
      t,
      { name: "Caregiver", role: "caregiver" },
    );

    await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: caregiverId,
      permissions: "canMessage",
      inviteStatus: "accepted",
    });

    const { warriorId } = await createWarrior(t, { accountId: familyId });

    await expect(
      asCaregiver.mutation(api.warriors.updateWarrior, {
        warriorId,
        name: "Hacked",
      }),
    ).rejects.toThrow("Not authorized to update this warrior");
  });

  it("caregiver with canUpdate can update", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(
      t,
      { name: "Caregiver", role: "caregiver" },
    );

    await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: caregiverId,
      permissions: "canUpdate",
      inviteStatus: "accepted",
    });

    const { warriorId } = await createWarrior(t, { accountId: familyId });

    await asCaregiver.mutation(api.warriors.updateWarrior, {
      warriorId,
      name: "Updated by canUpdate Caregiver",
    });

    const warrior = await t.run(async (ctx) => ctx.db.get(warriorId));
    expect(warrior!.name).toBe("Updated by canUpdate Caregiver");
  });

  it("throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { warriorId } = await createWarrior(t);

    await expect(
      t.mutation(api.warriors.updateWarrior, {
        warriorId,
        name: "Hacked",
      }),
    ).rejects.toThrow("Not authenticated");
  });

  it("throws for nonexistent warrior", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await createAccount(t, { role: "family" });
    const { warriorId } = await createWarrior(t);

    // Delete the warrior so the ID is stale
    await t.run(async (ctx) => {
      await ctx.db.delete(warriorId);
    });

    await expect(
      asUser.mutation(api.warriors.updateWarrior, {
        warriorId,
        name: "Ghost",
      }),
    ).rejects.toThrow("Warrior not found");
  });

  it("unrelated user cannot update another family's warrior", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { asUser: asOtherFamily } = await createAccount(t, {
      name: "Other Family",
      role: "family",
    });

    const { warriorId } = await createWarrior(t, { accountId: familyId });

    await expect(
      asOtherFamily.mutation(api.warriors.updateWarrior, {
        warriorId,
        name: "Stolen",
      }),
    ).rejects.toThrow("Not authorized to update this warrior");
  });

  it("updates only specified fields, leaving others unchanged", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { role: "family" });

    const { warriorId } = await createWarrior(t, {
      accountId,
      name: "Original",
      condition: "Autism",
      bio: "Original bio",
    });

    await asUser.mutation(api.warriors.updateWarrior, {
      warriorId,
      name: "Updated",
    });

    const warrior = await t.run(async (ctx) => ctx.db.get(warriorId));
    expect(warrior!.name).toBe("Updated");
    expect(warrior!.condition).toBe("Autism");
    expect(warrior!.bio).toBe("Original bio");
  });
});

// ─── deleteWarrior ──────────────────────────────────────────────────────────

describe("deleteWarrior", () => {
  it("owner can delete their warrior", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, {
      name: "Alice",
      role: "family",
    });

    const { warriorId } = await createWarrior(t, { accountId });

    const result = await asUser.mutation(api.warriors.deleteWarrior, {
      warriorId,
    });
    expect(result).toEqual(warriorId);

    // Verify warrior is deleted
    const warrior = await t.run(async (ctx) => ctx.db.get(warriorId));
    expect(warrior).toBeNull();
  });

  it("cascades deletion to associated status updates", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, {
      name: "Alice",
      role: "family",
    });

    const { warriorId } = await createWarrior(t, { accountId });

    // Create multiple status updates
    await createStatusUpdate(t, {
      warriorId,
      updatedBy: accountId,
      status: "thriving",
    });
    await createStatusUpdate(t, {
      warriorId,
      updatedBy: accountId,
      status: "struggling",
    });

    // Verify status updates exist before delete
    const beforeDelete = await t.run(async (ctx) => {
      return await ctx.db
        .query("statusUpdates")
        .withIndex("by_warrior", (q) => q.eq("warriorId", warriorId))
        .collect();
    });
    expect(beforeDelete).toHaveLength(2);

    // Delete the warrior
    await asUser.mutation(api.warriors.deleteWarrior, { warriorId });

    // Verify status updates are also deleted
    const afterDelete = await t.run(async (ctx) => {
      return await ctx.db
        .query("statusUpdates")
        .withIndex("by_warrior", (q) => q.eq("warriorId", warriorId))
        .collect();
    });
    expect(afterDelete).toHaveLength(0);
  });

  it("throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { warriorId } = await createWarrior(t);

    await expect(
      t.mutation(api.warriors.deleteWarrior, { warriorId }),
    ).rejects.toThrow("Not authenticated");
  });

  it("throws for non-owner (another family)", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { asUser: asOtherFamily } = await createAccount(t, {
      name: "Other Family",
      role: "family",
    });

    const { warriorId } = await createWarrior(t, { accountId: familyId });

    await expect(
      asOtherFamily.mutation(api.warriors.deleteWarrior, { warriorId }),
    ).rejects.toThrow("Not authorized to delete this warrior");
  });

  it("caregiver with fullAccess cannot delete (only owner can)", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(
      t,
      { name: "Caregiver", role: "caregiver" },
    );

    await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: caregiverId,
      permissions: "fullAccess",
      inviteStatus: "accepted",
    });

    const { warriorId } = await createWarrior(t, { accountId: familyId });

    await expect(
      asCaregiver.mutation(api.warriors.deleteWarrior, { warriorId }),
    ).rejects.toThrow("Not authorized to delete this warrior");
  });

  it("throws for nonexistent warrior", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await createAccount(t, { role: "family" });
    const { warriorId } = await createWarrior(t);

    await t.run(async (ctx) => {
      await ctx.db.delete(warriorId);
    });

    await expect(
      asUser.mutation(api.warriors.deleteWarrior, { warriorId }),
    ).rejects.toThrow("Warrior not found");
  });
});

// ─── getPublicWarriors ──────────────────────────────────────────────────────

describe("getPublicWarriors", () => {
  it("returns only public warriors", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { role: "family" });

    await createWarrior(t, {
      accountId,
      visibility: "public",
      name: "Public One",
    });
    await createWarrior(t, {
      accountId,
      visibility: "private",
      name: "Private One",
    });
    await createWarrior(t, {
      accountId,
      visibility: "connections",
      name: "Connections One",
    });

    const result = await t.query(api.warriors.getPublicWarriors, {});
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Public One");
  });

  it("returns warriors with account info", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, {
      name: "Alice Family",
      role: "family",
      privacySettings: {
        showLocation: true,
        showEmail: false,
        defaultVisibility: "public",
      },
      location: {
        latitude: 40.7128,
        longitude: -74.006,
        city: "New York",
        state: "NY",
      },
    });

    await createWarrior(t, {
      accountId,
      visibility: "public",
      name: "Alice Warrior",
    });

    const result = await t.query(api.warriors.getPublicWarriors, {});
    expect(result).toHaveLength(1);
    expect(result[0].account).not.toBeNull();
    expect(result[0].account!.name).toBe("Alice Family");
    expect(result[0].account!.location).toBeDefined();
    expect(result[0].account!.location!.city).toBe("New York");
  });

  it("hides location when showLocation is false", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, {
      name: "Private Location Family",
      role: "family",
      privacySettings: {
        showLocation: false,
        showEmail: false,
        defaultVisibility: "public",
      },
      location: {
        latitude: 40.7128,
        longitude: -74.006,
        city: "New York",
        state: "NY",
      },
    });

    await createWarrior(t, { accountId, visibility: "public" });

    const result = await t.query(api.warriors.getPublicWarriors, {});
    expect(result).toHaveLength(1);
    expect(result[0].account!.location).toBeUndefined();
  });

  it("filters by status when provided", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { role: "family" });

    await createWarrior(t, {
      accountId,
      visibility: "public",
      currentStatus: "thriving",
      name: "Thriving",
    });
    await createWarrior(t, {
      accountId,
      visibility: "public",
      currentStatus: "struggling",
      name: "Struggling",
    });

    const result = await t.query(api.warriors.getPublicWarriors, {
      status: "thriving",
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Thriving");
  });

  it("respects the limit parameter", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { role: "family" });

    for (let i = 0; i < 5; i++) {
      await createWarrior(t, {
        accountId,
        visibility: "public",
        name: `Warrior ${i}`,
      });
    }

    const result = await t.query(api.warriors.getPublicWarriors, { limit: 2 });
    expect(result).toHaveLength(2);
  });

  it("returns empty array when no public warriors exist", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { role: "family" });

    await createWarrior(t, { accountId, visibility: "private" });

    const result = await t.query(api.warriors.getPublicWarriors, {});
    expect(result).toHaveLength(0);
  });

  it("works for unauthenticated users", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { role: "family" });

    await createWarrior(t, {
      accountId,
      visibility: "public",
      name: "Public",
    });

    const result = await t.query(api.warriors.getPublicWarriors, {});
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Public");
  });
});
