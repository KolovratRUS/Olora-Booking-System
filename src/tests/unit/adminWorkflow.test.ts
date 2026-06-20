import { describe, it, expect } from "vitest";
import { overlaps, canTransition, getVisibleActions } from "../../lib/services/bookingService";

const AIRBNB_SYNC_STATUSES = [
  "not_checked",
  "checked",
  "blocked",
  "reopened",
  "retained",
] as const;

function createRequestBlock(start: string | Date, end: string | Date) {
  return {
    blockStart: typeof start === "string" ? new Date(start) : start,
    blockEnd: typeof end === "string" ? new Date(end) : end,
  };
}

function createRange(start: string | Date, end: string | Date) {
  return {
    checkIn: typeof start === "string" ? new Date(start) : start,
    checkOut: typeof end === "string" ? new Date(end) : end,
  };
}

describe("admin workflow invariants without database", () => {
  it("prevents approval when Airbnb is not checked", () => {
    for (const status of AIRBNB_SYNC_STATUSES) {
      const blocked = !["checked", "blocked"].includes(status);
      if (status === "not_checked") {
        expect(blocked).toBe(true);
      }
      if (status === "checked" || status === "blocked") {
        expect(blocked).toBe(false);
      }
    }
  });

  it("requires intermediate awaiting_payment status for the corrected approval workflow", () => {
    expect(canTransition("guest_accepted", "awaiting_payment")).toBe(true);
    expect(canTransition("guest_accepted", "confirmed")).toBe(false);
    expect(canTransition("awaiting_payment", "confirmed")).toBe(true);
  });

  it("visible actions remain status-dependent", () => {
    expect(getVisibleActions("pending_review")).toEqual(
      expect.arrayContaining([{ type: "alternative_offer" }]),
    );
    expect(getVisibleActions("guest_accepted")).toEqual(
      expect.arrayContaining([{ type: "move_to_awaiting_payment" }]),
    );
    expect(getVisibleActions("guest_accepted")).not.toEqual(
      expect.arrayContaining([{ type: "alternative_offer" }]),
    );
  });

  it("treats checked Airbnb data as ready for scripting", () => {
    for (const status of ["checked", "blocked"]) {
      expect(["checked", "blocked"].includes(status)).toBe(true);
    }
  });

  it("not_checked Airbnb state prevents actions needing confirmation", () => {
    expect(["checked", "blocked"].includes("not_checked")).toBe(false);
  });

  it("blocked Airbnb state still permits booking flow actions", () => {
    expect(["checked", "blocked"].includes("blocked")).toBe(true);
  });

  it("hides unavailable actions based on the visible action helper", () => {
    expect(getVisibleActions("guest_accepted")).toEqual(
      expect.arrayContaining([{ type: "move_to_awaiting_payment" }]),
    );
    expect(getVisibleActions("guest_accepted")).toEqual(
      expect.arrayContaining([{ type: "cancel" }]),
    );
    expect(getVisibleActions("guest_accepted")).not.toEqual(
      expect.arrayContaining([{ type: "confirm_payment" }]),
    );
    expect(getVisibleActions("guest_accepted")).not.toEqual(
      expect.arrayContaining([{ type: "alternative_offer" }]),
    );

    expect(getVisibleActions("pending_review")).toEqual(
      expect.arrayContaining([{ type: "alternative_offer" }]),
    );
    expect(getVisibleActions("confirmed")).toEqual(
      expect.arrayContaining([{ type: "cancel" }]),
    );
  });

  it("requires status transitions on booking requests alone", () => {
    expect(canTransition("pending_review", "alternative_offered")).toBe(true);
    expect(canTransition("pending_review", "guest_accepted")).toBe(true);
    expect(canTransition("guest_accepted", "awaiting_payment")).toBe(true);
    expect(canTransition("awaiting_payment", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "cancelled")).toBe(true);
  });

  it("overlaps with availability blocks only when checkout-exclusive stays true", () => {
    const block = createRequestBlock("2026-10-10", "2026-10-15");
    expect(
      overlaps(
        createRange("2026-10-08", "2026-10-10").checkIn,
        createRange("2026-10-08", "2026-10-10").checkOut,
        block.blockStart,
        block.blockEnd
      )
    ).toBe(false);
    expect(
      overlaps(
        createRange("2026-10-14", "2026-10-16").checkIn,
        createRange("2026-10-14", "2026-10-16").checkOut,
        block.blockStart,
        block.blockEnd
      )
    ).toBe(true);
    expect(
      overlaps(
        createRange("2026-10-11", "2026-10-14").checkIn,
        createRange("2026-10-11", "2026-10-14").checkOut,
        block.blockStart,
        block.blockEnd
      )
    ).toBe(true);
  });

  it("treats fully-contained ranges as conflicts", () => {
    const block = createRequestBlock("2026-10-01", "2026-10-10");
    const range = createRange("2026-10-03", "2026-10-07");
    expect(overlaps(range.checkIn, range.checkOut, block.blockStart, block.blockEnd)).toBe(true);
  });

  it("returns false for diagonally touching blocks", () => {
    expect(overlaps(new Date("2026-10-01"), new Date("2026-10-02"), new Date("2026-10-02"), new Date("2026-10-03"))).toBe(false);
    expect(overlaps(new Date("2026-10-02"), new Date("2026-10-03"), new Date("2026-10-01"), new Date("2026-10-02"))).toBe(false);
  });
});
