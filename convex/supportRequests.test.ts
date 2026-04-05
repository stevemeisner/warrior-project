import { convexTest } from "convex-test";
import { describe, expect, it, beforeEach } from "vitest";
import { api } from "./_generated/api";
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

// Helper to insert a support request directly via t.run (bypasses rate limit + notifications)
async function insertSupportRequest(
  t: ReturnType<typeof convexTest>,
  opts: {
    accountId: Parameters<typeof import("./_generated/dataModel").Id<"accounts">>[0] & string;
    warriorId?: string;
    helpTypes?: string[];
    description?: string;
    isActive?: boolean;
  }
) {
  const now = Date.now();
  return await t.run(async (ctx) => {
    return await ctx.db.insert("supportRequests", {
      accountId: opts.accountId as any,
      warriorId: opts.warriorId as any,
      isActive: opts.isActive ?? true,
      helpTypes: opts.helpTypes ?? ["meals"],
      description: opts.description,
      createdAt: now,
      updatedAt: now,
    });
  });
}

// ─── createSupportRequest ───────────────────────────────────────────────────

describe("createSupportRequest", () => {
  it("creates a support request for a family account", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { role: "family" });
    const { warriorId } = await createWarrior(t, { accountId });

    const requestId = await asUser.mutation(api.supportRequests.createSupportRequest, {
      warriorId,
      helpTypes: ["meals", "transportation"],
      description: "Need help this week",
    });

    expect(requestId).toBeDefined();

    // Verify the request was persisted
    const request = await t.run(async (ctx) => ctx.db.get(requestId));
    expect(request).not.toBeNull();
    expect(request!.accountId).toBe(accountId);
    expect(request!.warriorId).toBe(warriorId);
    expect(request!.helpTypes).toEqual(["meals", "transportation"]);
    expect(request!.description).toBe("Need help this week");
    expect(request!.isActive).toBe(true);
  });

  it("throws for unauthenticated users", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.supportRequests.createSupportRequest, {
        helpTypes: ["meals"],
      })
    ).rejects.toThrow("Not authenticated");
  });

  it("throws for caregiver role", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await createAccount(t, { role: "caregiver" });

    await expect(
      asUser.mutation(api.supportRequests.createSupportRequest, {
        helpTypes: ["meals"],
      })
    ).rejects.toThrow("Only family accounts can create support requests");
  });

  it("throws for empty helpTypes", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await createAccount(t, { role: "family" });

    await expect(
      asUser.mutation(api.supportRequests.createSupportRequest, {
        helpTypes: [],
      })
    ).rejects.toThrow("At least one help type is required");
  });

  it("throws for invalid help types", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await createAccount(t, { role: "family" });

    await expect(
      asUser.mutation(api.supportRequests.createSupportRequest, {
        helpTypes: ["meals", "wizardry", "teleportation"],
      })
    ).rejects.toThrow("Invalid help types: wizardry, teleportation");
  });

  it("throws for description exceeding 5000 characters", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await createAccount(t, { role: "family" });

    await expect(
      asUser.mutation(api.supportRequests.createSupportRequest, {
        helpTypes: ["meals"],
        description: "x".repeat(5001),
      })
    ).rejects.toThrow("Description must be 5000 characters or less");
  });

  it("throws on 4th request within rate limit window", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { role: "family" });
    const { warriorId } = await createWarrior(t, { accountId });

    // First 3 requests should succeed (limit is 3 per hour)
    for (let i = 0; i < 3; i++) {
      await asUser.mutation(api.supportRequests.createSupportRequest, {
        warriorId,
        helpTypes: ["meals"],
        description: `Request ${i + 1}`,
      });
    }

    // 4th request should be rate limited
    await expect(
      asUser.mutation(api.supportRequests.createSupportRequest, {
        warriorId,
        helpTypes: ["meals"],
        description: "Request 4",
      })
    ).rejects.toThrow("Rate limit exceeded");
  });

  it("throws when warrior is not owned by the family", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await createAccount(t, { role: "family" });
    // Create a warrior owned by a different family
    const { accountId: otherAccountId } = await createAccount(t, { role: "family" });
    const { warriorId } = await createWarrior(t, { accountId: otherAccountId });

    await expect(
      asUser.mutation(api.supportRequests.createSupportRequest, {
        warriorId,
        helpTypes: ["meals"],
      })
    ).rejects.toThrow("Warrior not found or not yours");
  });
});

// ─── getMySupportRequests ───────────────────────────────────────────────────

describe("getMySupportRequests", () => {
  it("returns empty array for unauthenticated users", async () => {
    const t = convexTest(schema, modules);

    const result = await t.query(api.supportRequests.getMySupportRequests, {});
    expect(result).toEqual([]);
  });

  it("returns own support requests with warrior info", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { role: "family" });
    const { warriorId } = await createWarrior(t, { accountId, name: "Luna" });

    await insertSupportRequest(t, {
      accountId: accountId as any,
      warriorId: warriorId as any,
      helpTypes: ["meals"],
      description: "Request 1",
    });
    await insertSupportRequest(t, {
      accountId: accountId as any,
      helpTypes: ["childcare"],
      description: "Request 2",
    });

    const requests = await asUser.query(api.supportRequests.getMySupportRequests, {});
    expect(requests).toHaveLength(2);
    // Should include warrior name when warriorId is present
    const withWarrior = requests.find((r: any) => r.warriorName === "Luna");
    expect(withWarrior).toBeDefined();
    // Without warrior should have undefined warriorName
    const withoutWarrior = requests.find((r: any) => r.warriorName === undefined);
    expect(withoutWarrior).toBeDefined();
  });

  it("filters active-only requests", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { role: "family" });

    await insertSupportRequest(t, {
      accountId: accountId as any,
      helpTypes: ["meals"],
      isActive: true,
    });
    await insertSupportRequest(t, {
      accountId: accountId as any,
      helpTypes: ["childcare"],
      isActive: false,
    });

    const activeOnly = await asUser.query(api.supportRequests.getMySupportRequests, {
      activeOnly: true,
    });
    expect(activeOnly).toHaveLength(1);
    expect(activeOnly[0].helpTypes).toEqual(["meals"]);

    const all = await asUser.query(api.supportRequests.getMySupportRequests, {});
    expect(all).toHaveLength(2);
  });

  it("does not return other users' requests", async () => {
    const t = convexTest(schema, modules);
    const { accountId: family1Id, asUser: asFamily1 } = await createAccount(t, { role: "family" });
    const { accountId: family2Id } = await createAccount(t, { role: "family" });

    await insertSupportRequest(t, { accountId: family1Id as any, helpTypes: ["meals"] });
    await insertSupportRequest(t, { accountId: family2Id as any, helpTypes: ["childcare"] });

    const requests = await asFamily1.query(api.supportRequests.getMySupportRequests, {});
    expect(requests).toHaveLength(1);
    expect(requests[0].helpTypes).toEqual(["meals"]);
  });
});

// ─── getAvailableSupportRequests ────────────────────────────────────────────

describe("getAvailableSupportRequests", () => {
  it("returns empty array for unauthenticated users", async () => {
    const t = convexTest(schema, modules);

    const result = await t.query(api.supportRequests.getAvailableSupportRequests, {});
    expect(result).toEqual([]);
  });

  it("returns active requests from connected families for caregivers", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, { role: "family", name: "Smith Family" });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(t, {
      role: "caregiver",
    });

    // Create accepted caregiver relation
    await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: caregiverId,
    });

    // Insert active and inactive requests for the family
    await insertSupportRequest(t, {
      accountId: familyId as any,
      helpTypes: ["meals"],
      isActive: true,
    });
    await insertSupportRequest(t, {
      accountId: familyId as any,
      helpTypes: ["childcare"],
      isActive: false,
    });

    const requests = await asCaregiver.query(api.supportRequests.getAvailableSupportRequests, {});
    // Only active requests should be returned
    expect(requests).toHaveLength(1);
    expect(requests[0].helpTypes).toEqual(["meals"]);
    expect(requests[0].familyName).toBe("Smith Family");
  });

  it("does not return requests from unconnected families", async () => {
    const t = convexTest(schema, modules);
    const { accountId: connectedFamilyId } = await createAccount(t, { role: "family" });
    const { accountId: unconnectedFamilyId } = await createAccount(t, { role: "family" });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(t, {
      role: "caregiver",
    });

    // Only connect to one family
    await createCaregiverRelation(t, {
      accountId: connectedFamilyId,
      caregiverAccountId: caregiverId,
    });

    await insertSupportRequest(t, {
      accountId: connectedFamilyId as any,
      helpTypes: ["meals"],
      isActive: true,
    });
    await insertSupportRequest(t, {
      accountId: unconnectedFamilyId as any,
      helpTypes: ["transportation"],
      isActive: true,
    });

    const requests = await asCaregiver.query(api.supportRequests.getAvailableSupportRequests, {});
    expect(requests).toHaveLength(1);
    expect(requests[0].helpTypes).toEqual(["meals"]);
  });

  it("does not return requests from pending (not accepted) caregiver relations", async () => {
    const t = convexTest(schema, modules);
    const { accountId: familyId } = await createAccount(t, { role: "family" });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(t, {
      role: "caregiver",
    });

    await createCaregiverRelation(t, {
      accountId: familyId,
      caregiverAccountId: caregiverId,
      inviteStatus: "pending",
    });

    await insertSupportRequest(t, {
      accountId: familyId as any,
      helpTypes: ["meals"],
      isActive: true,
    });

    const requests = await asCaregiver.query(api.supportRequests.getAvailableSupportRequests, {});
    expect(requests).toHaveLength(0);
  });
});

// ─── updateSupportRequest ───────────────────────────────────────────────────

describe("updateSupportRequest", () => {
  it("allows owner to update their support request", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { role: "family" });

    const requestId = await insertSupportRequest(t, {
      accountId: accountId as any,
      helpTypes: ["meals"],
      description: "Original",
    });

    await asUser.mutation(api.supportRequests.updateSupportRequest, {
      requestId,
      helpTypes: ["meals", "transportation"],
      description: "Updated description",
      isActive: false,
    });

    const updated = await t.run(async (ctx) => ctx.db.get(requestId));
    expect(updated!.helpTypes).toEqual(["meals", "transportation"]);
    expect(updated!.description).toBe("Updated description");
    expect(updated!.isActive).toBe(false);
  });

  it("throws for unauthenticated users", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { role: "family" });

    const requestId = await insertSupportRequest(t, {
      accountId: accountId as any,
      helpTypes: ["meals"],
    });

    await expect(
      t.mutation(api.supportRequests.updateSupportRequest, {
        requestId,
        helpTypes: ["childcare"],
      })
    ).rejects.toThrow("Not authenticated");
  });

  it("throws when non-owner tries to update", async () => {
    const t = convexTest(schema, modules);
    const { accountId: ownerId } = await createAccount(t, { role: "family" });
    const { asUser: asOtherUser } = await createAccount(t, { role: "family" });

    const requestId = await insertSupportRequest(t, {
      accountId: ownerId as any,
      helpTypes: ["meals"],
    });

    await expect(
      asOtherUser.mutation(api.supportRequests.updateSupportRequest, {
        requestId,
        helpTypes: ["childcare"],
      })
    ).rejects.toThrow("Not authorized to update this request");
  });

  it("validates helpTypes on update", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { role: "family" });

    const requestId = await insertSupportRequest(t, {
      accountId: accountId as any,
      helpTypes: ["meals"],
    });

    // Empty helpTypes
    await expect(
      asUser.mutation(api.supportRequests.updateSupportRequest, {
        requestId,
        helpTypes: [],
      })
    ).rejects.toThrow("At least one help type is required");

    // Invalid helpTypes
    await expect(
      asUser.mutation(api.supportRequests.updateSupportRequest, {
        requestId,
        helpTypes: ["invalid"],
      })
    ).rejects.toThrow("Invalid help types: invalid");
  });

  it("validates description length on update", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { role: "family" });

    const requestId = await insertSupportRequest(t, {
      accountId: accountId as any,
      helpTypes: ["meals"],
    });

    await expect(
      asUser.mutation(api.supportRequests.updateSupportRequest, {
        requestId,
        description: "y".repeat(5001),
      })
    ).rejects.toThrow("Description must be 5000 characters or less");
  });
});

// ─── deleteSupportRequest ───────────────────────────────────────────────────

describe("deleteSupportRequest", () => {
  it("allows owner to delete their support request", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { role: "family" });

    const requestId = await insertSupportRequest(t, {
      accountId: accountId as any,
      helpTypes: ["meals"],
    });

    await asUser.mutation(api.supportRequests.deleteSupportRequest, { requestId });

    const deleted = await t.run(async (ctx) => ctx.db.get(requestId));
    expect(deleted).toBeNull();
  });

  it("throws for unauthenticated users", async () => {
    const t = convexTest(schema, modules);
    const { accountId } = await createAccount(t, { role: "family" });

    const requestId = await insertSupportRequest(t, {
      accountId: accountId as any,
      helpTypes: ["meals"],
    });

    await expect(
      t.mutation(api.supportRequests.deleteSupportRequest, { requestId })
    ).rejects.toThrow("Not authenticated");
  });

  it("throws when non-owner tries to delete", async () => {
    const t = convexTest(schema, modules);
    const { accountId: ownerId } = await createAccount(t, { role: "family" });
    const { asUser: asOtherUser } = await createAccount(t, { role: "family" });

    const requestId = await insertSupportRequest(t, {
      accountId: ownerId as any,
      helpTypes: ["meals"],
    });

    await expect(
      asOtherUser.mutation(api.supportRequests.deleteSupportRequest, { requestId })
    ).rejects.toThrow("Not authorized to delete this request");
  });
});

// ─── getActiveCount ─────────────────────────────────────────────────────────

describe("getActiveCount", () => {
  it("returns 0 for unauthenticated users", async () => {
    const t = convexTest(schema, modules);

    const count = await t.query(api.supportRequests.getActiveCount, {});
    expect(count).toBe(0);
  });

  it("returns own active count for family accounts", async () => {
    const t = convexTest(schema, modules);
    const { accountId, asUser } = await createAccount(t, { role: "family" });

    await insertSupportRequest(t, {
      accountId: accountId as any,
      helpTypes: ["meals"],
      isActive: true,
    });
    await insertSupportRequest(t, {
      accountId: accountId as any,
      helpTypes: ["childcare"],
      isActive: true,
    });
    await insertSupportRequest(t, {
      accountId: accountId as any,
      helpTypes: ["transportation"],
      isActive: false,
    });

    const count = await asUser.query(api.supportRequests.getActiveCount, {});
    expect(count).toBe(2);
  });

  it("returns active count from connected families for caregivers", async () => {
    const t = convexTest(schema, modules);
    const { accountId: family1Id } = await createAccount(t, { role: "family" });
    const { accountId: family2Id } = await createAccount(t, { role: "family" });
    const { accountId: unconnectedFamilyId } = await createAccount(t, { role: "family" });
    const { accountId: caregiverId, asUser: asCaregiver } = await createAccount(t, {
      role: "caregiver",
    });

    // Connect to family1 and family2, but not unconnectedFamily
    await createCaregiverRelation(t, {
      accountId: family1Id,
      caregiverAccountId: caregiverId,
    });
    await createCaregiverRelation(t, {
      accountId: family2Id,
      caregiverAccountId: caregiverId,
    });

    // family1: 2 active, 1 inactive
    await insertSupportRequest(t, { accountId: family1Id as any, helpTypes: ["meals"], isActive: true });
    await insertSupportRequest(t, { accountId: family1Id as any, helpTypes: ["childcare"], isActive: true });
    await insertSupportRequest(t, { accountId: family1Id as any, helpTypes: ["other"], isActive: false });

    // family2: 1 active
    await insertSupportRequest(t, { accountId: family2Id as any, helpTypes: ["emotional"], isActive: true });

    // unconnected family: 1 active (should not count)
    await insertSupportRequest(t, { accountId: unconnectedFamilyId as any, helpTypes: ["financial"], isActive: true });

    const count = await asCaregiver.query(api.supportRequests.getActiveCount, {});
    expect(count).toBe(3); // 2 from family1 + 1 from family2
  });
});
