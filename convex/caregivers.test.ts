import { convexTest } from "convex-test";
import { describe, expect, it, beforeEach } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";
import {
  createAccount,
  createWarrior,
  createCaregiverRelation,
  resetFactoryCounter,
} from "./test.factories";

beforeEach(() => {
  resetFactoryCounter();
});

// ─── getMyCaregivers ────────────────────────────────────────────────────────

describe("getMyCaregivers", () => {
  it("returns empty array for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.caregivers.getMyCaregivers);
    expect(result).toEqual([]);
  });

  it("returns caregivers with account details for a family user", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId, asUser: asFamily } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: caregiverId } = await createAccount(t, {
      name: "Caregiver Carol",
      email: "carol@example.com",
      role: "caregiver",
    });

    await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: caregiverId,
      permissions: "viewOnly",
      inviteStatus: "accepted",
    });

    const result = await asFamily.query(api.caregivers.getMyCaregivers);
    expect(result).toHaveLength(1);
    expect(result[0].caregiverAccount).not.toBeNull();
    expect(result[0].caregiverAccount!.name).toBe("Caregiver Carol");
    expect(result[0].permissions).toBe("viewOnly");
    expect(result[0].inviteStatus).toBe("accepted");
  });

  it("returns multiple caregivers including pending ones", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId, asUser: asFamily } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: cg1 } = await createAccount(t, {
      name: "CG1",
      role: "caregiver",
    });
    const { accountId: cg2 } = await createAccount(t, {
      name: "CG2",
      role: "caregiver",
    });

    await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: cg1,
      inviteStatus: "accepted",
    });
    await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: cg2,
      inviteStatus: "pending",
    });

    const result = await asFamily.query(api.caregivers.getMyCaregivers);
    expect(result).toHaveLength(2);
  });

  it("does not return caregivers from other families", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyA, asUser: asFamilyA } = await createAccount(t, {
      name: "Family A",
      role: "family",
    });
    const { accountId: familyB } = await createAccount(t, {
      name: "Family B",
      role: "family",
    });
    const { accountId: cg } = await createAccount(t, {
      name: "CG",
      role: "caregiver",
    });

    await createCaregiverRelation(t, {
      accountId: familyB,
      caregiverAccountId: cg,
      inviteStatus: "accepted",
    });

    const result = await asFamilyA.query(api.caregivers.getMyCaregivers);
    expect(result).toHaveLength(0);
  });

  it("returns empty array for user with no caregivers", async () => {
    const t = convexTest(schema, modules);
    const { asUser: asFamily } = await createAccount(t, {
      name: "Lonely Family",
      role: "family",
    });

    const result = await asFamily.query(api.caregivers.getMyCaregivers);
    expect(result).toEqual([]);
  });
});

// ─── getMyFamilies ──────────────────────────────────────────────────────────

describe("getMyFamilies", () => {
  it("returns empty array for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.caregivers.getMyFamilies);
    expect(result).toEqual([]);
  });

  it("returns accepted families with warriors for a caregiver", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Alice Family",
      role: "family",
    });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(
      t,
      { name: "Carol Caregiver", role: "caregiver" },
    );

    await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: caregiverId,
      inviteStatus: "accepted",
    });

    await createWarrior(t, {
      accountId: familyId,
      name: "Little Warrior",
    });

    const result = await asCaregiver.query(api.caregivers.getMyFamilies);
    expect(result).toHaveLength(1);
    expect(result[0].familyAccount).not.toBeNull();
    expect(result[0].familyAccount!.name).toBe("Alice Family");
    expect(result[0].warriors).toHaveLength(1);
    expect(result[0].warriors[0].name).toBe("Little Warrior");
  });

  it("does not return pending or declined families", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyA } = await createAccount(t, {
      name: "Family A",
      role: "family",
    });
    const { accountId: familyB } = await createAccount(t, {
      name: "Family B",
      role: "family",
    });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(
      t,
      { name: "Caregiver", role: "caregiver" },
    );

    await createCaregiverRelation(t, {
      accountId: familyA,
      caregiverAccountId: caregiverId,
      inviteStatus: "pending",
    });
    await createCaregiverRelation(t, {
      accountId: familyB,
      caregiverAccountId: caregiverId,
      inviteStatus: "declined",
    });

    const result = await asCaregiver.query(api.caregivers.getMyFamilies);
    expect(result).toHaveLength(0);
  });

  it("returns multiple accepted families", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyA } = await createAccount(t, {
      name: "Family A",
      role: "family",
    });
    const { accountId: familyB } = await createAccount(t, {
      name: "Family B",
      role: "family",
    });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(
      t,
      { name: "Caregiver", role: "caregiver" },
    );

    await createCaregiverRelation(t, {
      accountId: familyA,
      caregiverAccountId: caregiverId,
      inviteStatus: "accepted",
    });
    await createCaregiverRelation(t, {
      accountId: familyB,
      caregiverAccountId: caregiverId,
      inviteStatus: "accepted",
    });

    const result = await asCaregiver.query(api.caregivers.getMyFamilies);
    expect(result).toHaveLength(2);
  });
});

// ─── getMyPendingInvites ────────────────────────────────────────────────────

describe("getMyPendingInvites", () => {
  it("returns empty array for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.caregivers.getMyPendingInvites);
    expect(result).toEqual([]);
  });

  it("returns pending invites matched by email", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(
      t,
      { name: "Caregiver", email: "cg@example.com", role: "caregiver" },
    );

    await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: caregiverId,
      inviteStatus: "pending",
      inviteEmail: "cg@example.com",
    });

    const result = await asCaregiver.query(api.caregivers.getMyPendingInvites);
    expect(result).toHaveLength(1);
    expect(result[0].inviteStatus).toBe("pending");
    expect(result[0].familyAccount).not.toBeNull();
    expect(result[0].familyAccount!.name).toBe("Family");
  });

  it("does not return accepted or declined invites", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyA } = await createAccount(t, {
      name: "Family A",
      role: "family",
    });
    const { accountId: familyB } = await createAccount(t, {
      name: "Family B",
      role: "family",
    });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(
      t,
      { name: "Caregiver", email: "cg@example.com", role: "caregiver" },
    );

    await createCaregiverRelation(t, {
      accountId: familyA,
      caregiverAccountId: caregiverId,
      inviteStatus: "accepted",
      inviteEmail: "cg@example.com",
    });
    await createCaregiverRelation(t, {
      accountId: familyB,
      caregiverAccountId: caregiverId,
      inviteStatus: "declined",
      inviteEmail: "cg@example.com",
    });

    const result = await asCaregiver.query(api.caregivers.getMyPendingInvites);
    expect(result).toHaveLength(0);
  });

  it("does not return invites for other emails", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: otherId } = await createAccount(t, {
      name: "Other",
      role: "caregiver",
    });
    const { asUser: asCaregiver } = await createAccount(t, {
      name: "Me",
      email: "me@example.com",
      role: "caregiver",
    });

    await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: otherId,
      inviteStatus: "pending",
      inviteEmail: "other@example.com",
    });

    const result = await asCaregiver.query(api.caregivers.getMyPendingInvites);
    expect(result).toHaveLength(0);
  });
});

// ─── inviteCaregiver ────────────────────────────────────────────────────────

describe("inviteCaregiver", () => {
  it("family can invite a caregiver by email", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId, asUser: asFamily } = await createAccount(t, {
      name: "Alice Family",
      role: "family",
    });

    const caregiverId = await asFamily.mutation(
      api.caregivers.inviteCaregiver,
      { email: "newcaregiver@example.com", permissions: "viewOnly" },
    );

    expect(caregiverId).toBeDefined();

    // Verify the invite record
    const invite = await t.run(async (ctx) => ctx.db.get(caregiverId));
    expect(invite).not.toBeNull();
    expect(invite!.accountId).toEqual(familyId);
    expect(invite!.inviteEmail).toBe("newcaregiver@example.com");
    expect(invite!.inviteStatus).toBe("pending");
    expect(invite!.permissions).toBe("viewOnly");
  });

  it("creates notification when caregiver already has an account", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId, asUser: asFamily } = await createAccount(t, {
      name: "Alice Family",
      role: "family",
    });
    const { accountId: existingCgId } = await createAccount(t, {
      name: "Existing Caregiver",
      email: "existing@example.com",
      role: "caregiver",
    });

    await asFamily.mutation(api.caregivers.inviteCaregiver, {
      email: "existing@example.com",
      permissions: "fullAccess",
    });

    // Verify notification was created for the existing caregiver
    const notifications = await t.run(async (ctx) => {
      return await ctx.db
        .query("notifications")
        .withIndex("by_account", (q) => q.eq("accountId", existingCgId))
        .collect();
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("caregiverInvite");
    expect(notifications[0].title).toBe("Caregiver invitation");
    expect(notifications[0].relatedAccountId).toEqual(familyId);
  });

  it("sets caregiverAccountId to existing account when it exists", async () => {
    const t = convexTest(schema, modules);
    const { asUser: asFamily } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: existingCgId } = await createAccount(t, {
      name: "Existing CG",
      email: "existing@example.com",
      role: "caregiver",
    });

    const caregiverId = await asFamily.mutation(
      api.caregivers.inviteCaregiver,
      { email: "existing@example.com", permissions: "viewOnly" },
    );

    const invite = await t.run(async (ctx) => ctx.db.get(caregiverId));
    expect(invite!.caregiverAccountId).toEqual(existingCgId);
  });

  it("uses family's own accountId as placeholder when caregiver has no account", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId, asUser: asFamily } = await createAccount(t, {
      name: "Family",
      role: "family",
    });

    const caregiverId = await asFamily.mutation(
      api.caregivers.inviteCaregiver,
      { email: "nobody@example.com", permissions: "viewOnly" },
    );

    const invite = await t.run(async (ctx) => ctx.db.get(caregiverId));
    // When no account exists for the email, it uses the family's own ID as placeholder
    expect(invite!.caregiverAccountId).toEqual(familyId);
  });

  it("throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.caregivers.inviteCaregiver, {
        email: "test@example.com",
        permissions: "viewOnly",
      }),
    ).rejects.toThrow("Not authenticated");
  });

  it("throws for caregiver accounts (only family can invite)", async () => {
    const t = convexTest(schema, modules);
    const { asUser: asCaregiver } = await createAccount(t, {
      name: "Caregiver",
      role: "caregiver",
    });

    await expect(
      asCaregiver.mutation(api.caregivers.inviteCaregiver, {
        email: "someone@example.com",
        permissions: "viewOnly",
      }),
    ).rejects.toThrow("Only family accounts can invite caregivers");
  });

  it("throws when inviting the same email twice", async () => {
    const t = convexTest(schema, modules);
    const { asUser: asFamily } = await createAccount(t, {
      name: "Family",
      role: "family",
    });

    await asFamily.mutation(api.caregivers.inviteCaregiver, {
      email: "duplicate@example.com",
      permissions: "viewOnly",
    });

    await expect(
      asFamily.mutation(api.caregivers.inviteCaregiver, {
        email: "duplicate@example.com",
        permissions: "fullAccess",
      }),
    ).rejects.toThrow("This person has already been invited");
  });

  it("different families can invite the same email", async () => {
    const t = convexTest(schema, modules);
    const { asUser: asFamilyA } = await createAccount(t, {
      name: "Family A",
      role: "family",
    });
    const { asUser: asFamilyB } = await createAccount(t, {
      name: "Family B",
      role: "family",
    });

    const id1 = await asFamilyA.mutation(api.caregivers.inviteCaregiver, {
      email: "shared@example.com",
      permissions: "viewOnly",
    });
    const id2 = await asFamilyB.mutation(api.caregivers.inviteCaregiver, {
      email: "shared@example.com",
      permissions: "fullAccess",
    });

    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toEqual(id2);
  });
});

// ─── acceptInvite ───────────────────────────────────────────────────────────

describe("acceptInvite", () => {
  it("caregiver can accept a pending invite", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(
      t,
      { name: "Caregiver", email: "cg@example.com", role: "caregiver" },
    );

    const { caregiverId: inviteId } = await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: caregiverId,
      inviteStatus: "pending",
      inviteEmail: "cg@example.com",
    });

    const result = await asCaregiver.mutation(api.caregivers.acceptInvite, {
      caregiverId: inviteId,
    });
    expect(result).toEqual(inviteId);

    // Verify the invite is now accepted
    const invite = await t.run(async (ctx) => ctx.db.get(inviteId));
    expect(invite!.inviteStatus).toBe("accepted");
    expect(invite!.caregiverAccountId).toEqual(caregiverId);
    expect(invite!.acceptedAt).toBeDefined();
  });

  it("throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { caregiverId: inviteId } = await createCaregiverRelation(t, {
      inviteStatus: "pending",
    });

    await expect(
      t.mutation(api.caregivers.acceptInvite, { caregiverId: inviteId }),
    ).rejects.toThrow("Not authenticated");
  });

  it("throws when invite email does not match account email", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: wrongCg } = await createAccount(t, {
      name: "Wrong CG",
      role: "caregiver",
    });
    const { asUser: asWrongPerson } = await createAccount(t, {
      name: "Wrong Person",
      email: "wrong@example.com",
      role: "caregiver",
    });

    const { caregiverId: inviteId } = await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: wrongCg,
      inviteStatus: "pending",
      inviteEmail: "correct@example.com",
    });

    await expect(
      asWrongPerson.mutation(api.caregivers.acceptInvite, {
        caregiverId: inviteId,
      }),
    ).rejects.toThrow("This invite is not for you");
  });

  it("throws when invite is already accepted", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(
      t,
      { name: "Caregiver", email: "cg@example.com", role: "caregiver" },
    );

    const { caregiverId: inviteId } = await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: caregiverId,
      inviteStatus: "accepted",
      inviteEmail: "cg@example.com",
    });

    await expect(
      asCaregiver.mutation(api.caregivers.acceptInvite, {
        caregiverId: inviteId,
      }),
    ).rejects.toThrow("This invite has already been responded to");
  });

  it("throws when invite is already declined", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(
      t,
      { name: "Caregiver", email: "cg@example.com", role: "caregiver" },
    );

    const { caregiverId: inviteId } = await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: caregiverId,
      inviteStatus: "declined",
      inviteEmail: "cg@example.com",
    });

    await expect(
      asCaregiver.mutation(api.caregivers.acceptInvite, {
        caregiverId: inviteId,
      }),
    ).rejects.toThrow("This invite has already been responded to");
  });

  it("throws for nonexistent invite", async () => {
    const t = convexTest(schema, modules);
    const { asUser: asCaregiver } = await createAccount(t, {
      name: "Caregiver",
      role: "caregiver",
    });

    // Create and delete an invite to get a stale ID
    const { caregiverId: inviteId } = await createCaregiverRelation(t, {
      inviteStatus: "pending",
    });
    await t.run(async (ctx) => {
      await ctx.db.delete(inviteId);
    });

    await expect(
      asCaregiver.mutation(api.caregivers.acceptInvite, {
        caregiverId: inviteId,
      }),
    ).rejects.toThrow("Invite not found");
  });
});

// ─── declineInvite ──────────────────────────────────────────────────────────

describe("declineInvite", () => {
  it("caregiver can decline a pending invite", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(
      t,
      { name: "Caregiver", email: "cg@example.com", role: "caregiver" },
    );

    const { caregiverId: inviteId } = await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: caregiverId,
      inviteStatus: "pending",
      inviteEmail: "cg@example.com",
    });

    const result = await asCaregiver.mutation(api.caregivers.declineInvite, {
      caregiverId: inviteId,
    });
    expect(result).toEqual(inviteId);

    // Verify the invite is now declined
    const invite = await t.run(async (ctx) => ctx.db.get(inviteId));
    expect(invite!.inviteStatus).toBe("declined");
  });

  it("throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { caregiverId: inviteId } = await createCaregiverRelation(t, {
      inviteStatus: "pending",
    });

    await expect(
      t.mutation(api.caregivers.declineInvite, { caregiverId: inviteId }),
    ).rejects.toThrow("Not authenticated");
  });

  it("throws when invite email does not match", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: otherCg } = await createAccount(t, {
      name: "Other",
      role: "caregiver",
    });
    const { asUser: asWrongPerson } = await createAccount(t, {
      name: "Wrong",
      email: "wrong@example.com",
      role: "caregiver",
    });

    const { caregiverId: inviteId } = await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: otherCg,
      inviteStatus: "pending",
      inviteEmail: "correct@example.com",
    });

    await expect(
      asWrongPerson.mutation(api.caregivers.declineInvite, {
        caregiverId: inviteId,
      }),
    ).rejects.toThrow("This invite is not for you");
  });

  it("throws when invite is already accepted", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(
      t,
      { name: "Caregiver", email: "cg@example.com", role: "caregiver" },
    );

    const { caregiverId: inviteId } = await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: caregiverId,
      inviteStatus: "accepted",
      inviteEmail: "cg@example.com",
    });

    await expect(
      asCaregiver.mutation(api.caregivers.declineInvite, {
        caregiverId: inviteId,
      }),
    ).rejects.toThrow("This invite has already been responded to");
  });

  it("throws for nonexistent invite", async () => {
    const t = convexTest(schema, modules);
    const { asUser: asCaregiver } = await createAccount(t, {
      name: "Caregiver",
      role: "caregiver",
    });

    const { caregiverId: inviteId } = await createCaregiverRelation(t, {
      inviteStatus: "pending",
    });
    await t.run(async (ctx) => {
      await ctx.db.delete(inviteId);
    });

    await expect(
      asCaregiver.mutation(api.caregivers.declineInvite, {
        caregiverId: inviteId,
      }),
    ).rejects.toThrow("Invite not found");
  });
});

// ─── updateCaregiverPermissions ─────────────────────────────────────────────

describe("updateCaregiverPermissions", () => {
  it("family can update caregiver permissions", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId, asUser: asFamily } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: caregiverId } = await createAccount(t, {
      name: "Caregiver",
      role: "caregiver",
    });

    const { caregiverId: relationId } = await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: caregiverId,
      permissions: "viewOnly",
      inviteStatus: "accepted",
    });

    const result = await asFamily.mutation(
      api.caregivers.updateCaregiverPermissions,
      { caregiverId: relationId, permissions: "fullAccess" },
    );
    expect(result).toEqual(relationId);

    // Verify update
    const relation = await t.run(async (ctx) => ctx.db.get(relationId));
    expect(relation!.permissions).toBe("fullAccess");
  });

  it("throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { caregiverId: relationId } = await createCaregiverRelation(t);

    await expect(
      t.mutation(api.caregivers.updateCaregiverPermissions, {
        caregiverId: relationId,
        permissions: "fullAccess",
      }),
    ).rejects.toThrow("Not authenticated");
  });

  it("throws when non-owner family tries to update", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyA } = await createAccount(t, {
      name: "Family A",
      role: "family",
    });
    const { asUser: asFamilyB } = await createAccount(t, {
      name: "Family B",
      role: "family",
    });
    const { accountId: cgId } = await createAccount(t, {
      name: "CG",
      role: "caregiver",
    });

    const { caregiverId: relationId } = await createCaregiverRelation(t, {
      accountId: familyA,
      caregiverAccountId: cgId,
      inviteStatus: "accepted",
    });

    await expect(
      asFamilyB.mutation(api.caregivers.updateCaregiverPermissions, {
        caregiverId: relationId,
        permissions: "fullAccess",
      }),
    ).rejects.toThrow("Not authorized to update this caregiver");
  });

  it("caregiver cannot update their own permissions", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(
      t,
      { name: "Caregiver", role: "caregiver" },
    );

    const { caregiverId: relationId } = await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: caregiverId,
      permissions: "viewOnly",
      inviteStatus: "accepted",
    });

    await expect(
      asCaregiver.mutation(api.caregivers.updateCaregiverPermissions, {
        caregiverId: relationId,
        permissions: "fullAccess",
      }),
    ).rejects.toThrow("Not authorized to update this caregiver");
  });

  it("throws for nonexistent caregiver relation", async () => {
    const t = convexTest(schema, modules);
    const { asUser: asFamily } = await createAccount(t, {
      name: "Family",
      role: "family",
    });

    const { caregiverId: relationId } = await createCaregiverRelation(t);
    await t.run(async (ctx) => {
      await ctx.db.delete(relationId);
    });

    await expect(
      asFamily.mutation(api.caregivers.updateCaregiverPermissions, {
        caregiverId: relationId,
        permissions: "fullAccess",
      }),
    ).rejects.toThrow("Caregiver not found");
  });

  it("can cycle through all permission levels", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId, asUser: asFamily } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: cgId } = await createAccount(t, {
      name: "CG",
      role: "caregiver",
    });

    const { caregiverId: relationId } = await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: cgId,
      permissions: "viewOnly",
      inviteStatus: "accepted",
    });

    const levels = [
      "canMessage",
      "canUpdate",
      "fullAccess",
      "viewOnly",
    ] as const;
    for (const perm of levels) {
      await asFamily.mutation(api.caregivers.updateCaregiverPermissions, {
        caregiverId: relationId,
        permissions: perm,
      });
      const relation = await t.run(async (ctx) => ctx.db.get(relationId));
      expect(relation!.permissions).toBe(perm);
    }
  });
});

// ─── removeCaregiver ────────────────────────────────────────────────────────

describe("removeCaregiver", () => {
  it("family can remove a caregiver", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId, asUser: asFamily } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: cgId } = await createAccount(t, {
      name: "CG",
      role: "caregiver",
    });

    const { caregiverId: relationId } = await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: cgId,
      inviteStatus: "accepted",
    });

    const result = await asFamily.mutation(api.caregivers.removeCaregiver, {
      caregiverId: relationId,
    });
    expect(result).toEqual(relationId);

    // Verify deletion
    const relation = await t.run(async (ctx) => ctx.db.get(relationId));
    expect(relation).toBeNull();
  });

  it("throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { caregiverId: relationId } = await createCaregiverRelation(t);

    await expect(
      t.mutation(api.caregivers.removeCaregiver, {
        caregiverId: relationId,
      }),
    ).rejects.toThrow("Not authenticated");
  });

  it("throws when non-owner family tries to remove", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyA } = await createAccount(t, {
      name: "Family A",
      role: "family",
    });
    const { asUser: asFamilyB } = await createAccount(t, {
      name: "Family B",
      role: "family",
    });
    const { accountId: cgId } = await createAccount(t, {
      name: "CG",
      role: "caregiver",
    });

    const { caregiverId: relationId } = await createCaregiverRelation(t, {
      accountId: familyA,
      caregiverAccountId: cgId,
      inviteStatus: "accepted",
    });

    await expect(
      asFamilyB.mutation(api.caregivers.removeCaregiver, {
        caregiverId: relationId,
      }),
    ).rejects.toThrow("Not authorized to remove this caregiver");
  });

  it("caregiver cannot remove themselves", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: cgId, asUser: asCaregiver } = await createAccount(t, {
      name: "CG",
      role: "caregiver",
    });

    const { caregiverId: relationId } = await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: cgId,
      inviteStatus: "accepted",
    });

    await expect(
      asCaregiver.mutation(api.caregivers.removeCaregiver, {
        caregiverId: relationId,
      }),
    ).rejects.toThrow("Not authorized to remove this caregiver");
  });

  it("throws for nonexistent caregiver relation", async () => {
    const t = convexTest(schema, modules);
    const { asUser: asFamily } = await createAccount(t, {
      name: "Family",
      role: "family",
    });

    const { caregiverId: relationId } = await createCaregiverRelation(t);
    await t.run(async (ctx) => {
      await ctx.db.delete(relationId);
    });

    await expect(
      asFamily.mutation(api.caregivers.removeCaregiver, {
        caregiverId: relationId,
      }),
    ).rejects.toThrow("Caregiver not found");
  });

  it("family can remove a pending invite (not just accepted ones)", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId, asUser: asFamily } = await createAccount(t, {
      name: "Family",
      role: "family",
    });
    const { accountId: cgId } = await createAccount(t, {
      name: "CG",
      role: "caregiver",
    });

    const { caregiverId: relationId } = await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: cgId,
      inviteStatus: "pending",
    });

    await asFamily.mutation(api.caregivers.removeCaregiver, {
      caregiverId: relationId,
    });

    const relation = await t.run(async (ctx) => ctx.db.get(relationId));
    expect(relation).toBeNull();
  });
});
