import { describe, expect, it } from "vitest";
import { getEventState, referralAttributionIssue, safeStudentName } from "./academy.logic";

describe("academy campaign rules", () => {
  const start = new Date("2026-08-12T18:00:00.000Z");

  it("derives event lifecycle states without relying on client input", () => {
    expect(getEventState({ startDate: start, replayAvailable: false, replayMode: "unavailable" }, new Date("2026-08-12T17:59:59.000Z"))).toBe("upcoming");
    expect(getEventState({ startDate: start, replayAvailable: false, replayMode: "unavailable" }, new Date("2026-08-12T19:00:00.000Z"))).toBe("live");
    expect(getEventState({ startDate: start, replayAvailable: true, replayMode: "free" }, new Date("2026-08-12T22:00:01.000Z"))).toBe("replay");
    expect(getEventState({ startDate: start, replayAvailable: false, replayMode: "unavailable" }, new Date("2026-08-12T22:00:01.000Z"))).toBe("ended");
  });

  it("rejects invalid, self, and duplicate referral attribution", () => {
    expect(referralAttributionIssue({ referrerUserId: null, currentUserId: 7, alreadyAttributed: false, hasExistingRecord: false })).toBe("invalid");
    expect(referralAttributionIssue({ referrerUserId: 7, currentUserId: 7, alreadyAttributed: false, hasExistingRecord: false })).toBe("self");
    expect(referralAttributionIssue({ referrerUserId: 4, currentUserId: 7, alreadyAttributed: true, hasExistingRecord: false })).toBe("duplicate");
    expect(referralAttributionIssue({ referrerUserId: 4, currentUserId: 7, alreadyAttributed: false, hasExistingRecord: false })).toBeNull();
  });

  it("formats safe public leaderboard names", () => {
    expect(safeStudentName("Amina Ibrahim")).toBe("Amina I.");
    expect(safeStudentName("Amina")).toBe("Amina");
    expect(safeStudentName(null)).toBe("BuduTech Student");
  });
});
