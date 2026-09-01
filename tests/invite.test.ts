import { describe, it, expect, beforeEach } from "vitest";
import {
  generateInviteCode,
  normalizeInviteCode,
  formatDisplayCode,
  getInviteExpirationDate,
  isInviteExpired,
} from "../lib/utils/invite";

describe("Invite Code Utility Functions", () => {
  it("normalizes invite code by stripping prefix, whitespace, and converting to uppercase", () => {
    expect(normalizeInviteCode("dorm-vahla4")).toBe("VAHLA4");
    expect(normalizeInviteCode("DORM-VAHLA4")).toBe("VAHLA4");
    expect(normalizeInviteCode("  vahla4  ")).toBe("VAHLA4");
    expect(normalizeInviteCode("DORM_VAHLA4")).toBe("VAHLA4");
    expect(normalizeInviteCode("v-a-h-l-a-4")).toBe("VAHLA4");
  });

  it("formats display code with standard DORM- prefix", () => {
    expect(formatDisplayCode("VAHLA4")).toBe("DORM-VAHLA4");
    expect(formatDisplayCode("dorm-vahla4")).toBe("DORM-VAHLA4");
  });

  it("generates a 6-character unambiguous alphanumeric code", () => {
    const code = generateInviteCode(6);
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
  });

  it("correctly identifies expired invites", () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 24 hours from now

    expect(isInviteExpired(pastDate)).toBe(true);
    expect(isInviteExpired(futureDate)).toBe(false);
  });
});

describe("Invite Code Reusability & Validation Logic (Multi-User Join)", () => {
  let mockInvites: Array<{
    id: string;
    dorm_id: string;
    code: string;
    invited_by: string;
    expires_at: string;
    is_used: boolean;
    created_at: string;
  }>;

  let mockDorms: Array<{
    id: string;
    name: string;
    created_by: string;
  }>;

  let mockMembers: Array<{
    id: string;
    dorm_id: string;
    user_id: string;
    role: string;
    status: string;
    move_in_date: string;
  }>;

  beforeEach(() => {
    mockInvites = [
      {
        id: "invite-1",
        dorm_id: "dorm-1",
        code: "VAHLA4",
        invited_by: "user-admin",
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24h validity
        is_used: false,
        created_at: new Date().toISOString(),
      },
      {
        id: "invite-expired",
        dorm_id: "dorm-1",
        code: "EXP123",
        invited_by: "user-admin",
        expires_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // Expired 1h ago
        is_used: false,
        created_at: new Date().toISOString(),
      },
      {
        id: "invite-revoked",
        dorm_id: "dorm-1",
        code: "REVOK1",
        invited_by: "user-admin",
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        is_used: true, // Revoked by admin
        created_at: new Date().toISOString(),
      },
    ];

    mockDorms = [
      {
        id: "dorm-1",
        name: "Dorm 402 - Sampaloc",
        created_by: "user-admin",
      },
    ];

    mockMembers = [
      {
        id: "member-admin",
        dorm_id: "dorm-1",
        user_id: "user-admin",
        role: "admin",
        status: "active",
        move_in_date: "2026-08-01",
      },
    ];
  });

  // Pure validation simulation matching DormContext.validateInviteCode
  function simulateValidateInviteCode(inputCode: string) {
    const cleanCode = normalizeInviteCode(inputCode);
    if (!cleanCode) return { valid: false, error: "Please enter an invite code" };

    const invite = mockInvites.find((i) => i.code === cleanCode);
    if (!invite) {
      return { valid: false, error: "Invalid invite code. Please check and try again." };
    }

    if (isInviteExpired(invite.expires_at)) {
      return { valid: false, error: "This invite code has expired (24-hour limit)." };
    }

    if (invite.is_used) {
      return { valid: false, error: "This invite code is no longer active." };
    }

    const dorm = mockDorms.find((d) => d.id === invite.dorm_id);
    if (!dorm) {
      return { valid: false, error: "Dorm not found for this invite code." };
    }

    return { valid: true, dorm, invite };
  }

  // Pure join simulation matching DormContext.joinDormByCode (Reusable Model)
  function simulateJoinDorm(userId: string, inputCode: string, moveInDate = "2026-09-01") {
    const validation = simulateValidateInviteCode(inputCode);
    if (!validation.valid || !validation.dorm || !validation.invite) {
      throw new Error(validation.error || "Invalid invite code");
    }

    const dorm = validation.dorm;
    const existingMember = mockMembers.find(
      (m) => m.dorm_id === dorm.id && m.user_id === userId
    );

    if (existingMember) {
      if (existingMember.status === "active") {
        throw new Error("You are already an active member of this dorm!");
      } else {
        existingMember.status = "active";
        existingMember.move_in_date = moveInDate;
      }
    } else {
      mockMembers.push({
        id: `member-${userId}`,
        dorm_id: dorm.id,
        user_id: userId,
        role: "member",
        status: "active",
        move_in_date: moveInDate,
      });
    }

    // Code MUST remain valid and reusable for remaining roommates
    return dorm;
  }

  it("allows multiple different roommates to join using the same valid invite code", () => {
    // 1. Roommate 1 joins
    const dormForUser1 = simulateJoinDorm("user-roommate-1", "DORM-VAHLA4");
    expect(dormForUser1.name).toBe("Dorm 402 - Sampaloc");
    expect(mockMembers.some((m) => m.user_id === "user-roommate-1")).toBe(true);

    // 2. Roommate 2 joins using the EXACT SAME CODE
    const validation2 = simulateValidateInviteCode("DORM-VAHLA4");
    expect(validation2.valid).toBe(true);
    const dormForUser2 = simulateJoinDorm("user-roommate-2", "DORM-VAHLA4");
    expect(dormForUser2.name).toBe("Dorm 402 - Sampaloc");
    expect(mockMembers.some((m) => m.user_id === "user-roommate-2")).toBe(true);

    // 3. Roommate 3 joins using raw code without prefix
    const dormForUser3 = simulateJoinDorm("user-roommate-3", "vahla4");
    expect(dormForUser3.name).toBe("Dorm 402 - Sampaloc");
    expect(mockMembers.some((m) => m.user_id === "user-roommate-3")).toBe(true);

    // Total members is now 4 (1 admin + 3 roommates)
    expect(mockMembers.filter((m) => m.dorm_id === "dorm-1")).toHaveLength(4);
  });

  it("returns distinct, accurate error message when invite code is expired", () => {
    const res = simulateValidateInviteCode("DORM-EXP123");
    expect(res.valid).toBe(false);
    expect(res.error).toBe("This invite code has expired (24-hour limit).");
  });

  it("returns distinct, accurate error message when invite code does not exist", () => {
    const res = simulateValidateInviteCode("DORM-NONEXIST");
    expect(res.valid).toBe(false);
    expect(res.error).toBe("Invalid invite code. Please check and try again.");
  });

  it("returns distinct, accurate error message when invite code was revoked", () => {
    const res = simulateValidateInviteCode("DORM-REVOK1");
    expect(res.valid).toBe(false);
    expect(res.error).toBe("This invite code is no longer active.");
  });

  it("blocks user if they are already an active member without burning the code", () => {
    expect(() => {
      simulateJoinDorm("user-admin", "DORM-VAHLA4");
    }).toThrow("You are already an active member of this dorm!");

    // Other roommates can still use the code
    const res = simulateValidateInviteCode("DORM-VAHLA4");
    expect(res.valid).toBe(true);
  });
});
