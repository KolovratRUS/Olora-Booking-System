import { describe, it, expect } from "vitest";
import {
  overlaps,
  canTransition,
  guestCountExceedsCapacity,
  calculatePrice,
  allowedTransitions,
  getVisibleActions,
} from "../../lib/services/bookingService";

describe("status transitions contract", () => {
  const validFromStatuses = Object.keys(allowedTransitions);

  it("allows transitions explicitly defined in allowed transitions", () => {
    for (const [fromStatus, toStatus] of Object.entries(allowedTransitions)) {
      for (const target of toStatus) {
        expect(canTransition(fromStatus, target)).toBe(true);
      }
    }
  });

  it("rejects transitions not explicitly defined", () => {
    expect(canTransition("pending_review", "confirmed")).toBe(false);
    expect(canTransition("guest_accepted", "confirmed")).toBe(false);
    expect(canTransition("awaiting_payment", "declined")).toBe(false);
    expect(canTransition("confirmed", "pending_review")).toBe(false);
    expect(canTransition("declined", "pending_review")).toBe(false);
  });

  it("allows the corrected approval workflow without changing the transition map", () => {
    expect(canTransition("guest_accepted", "awaiting_payment")).toBe(true);
    expect(canTransition("awaiting_payment", "confirmed")).toBe(true);
  });

  it("rejects the invalid direct guest_accepted to confirmed shortcut", () => {
    expect(canTransition("guest_accepted", "confirmed")).toBe(false);
  });

  it("does not allow alternative offer from guest_accepted", () => {
    expect(canTransition("guest_accepted", "alternative_offered")).toBe(false);
  });

  it("does not allow finite-state machines to have non-empty final transitions", () => {
    expect(allowedTransitions["declined"]).toEqual([]);
    expect(allowedTransitions["expired"]).toEqual([]);
    expect(allowedTransitions["cancelled"]).toEqual([]);
  });
});

describe("action visibility derived from allowed transitions", () => {
  it("shows move to awaiting_payment only when that transition is valid", () => {
    expect(getVisibleActions("pending_review")).toEqual(
      expect.arrayContaining([{ type: "alternative_offer" }]),
    );
    expect(getVisibleActions("pending_review")).not.toEqual(
      expect.arrayContaining([{ type: "move_to_awaiting_payment" }]),
    );
    expect(getVisibleActions("guest_accepted")).toEqual(
      expect.arrayContaining([{ type: "move_to_awaiting_payment" }]),
    );
  });

  it("shows confirm_payment only when confirmed is in allowed transitions", () => {
    expect(getVisibleActions("awaiting_payment")).toEqual(
      expect.arrayContaining([{ type: "confirm_payment" }]),
    );
    expect(getVisibleActions("guest_accepted")).not.toEqual(
      expect.arrayContaining([{ type: "confirm_payment" }]),
    );
  });

  it("shows alternative_offer only when alternative_offered is in allowed transitions", () => {
    expect(getVisibleActions("pending_review")).toEqual(
      expect.arrayContaining([{ type: "alternative_offer" }]),
    );
    expect(getVisibleActions("guest_accepted")).not.toEqual(
      expect.arrayContaining([{ type: "alternative_offer" }]),
    );
  });
});

describe("availability overlays and capacity enforcement", () => {
  it("detects overlaps inside a single range", () => {
    expect(overlaps(new Date("2026-08-01"), new Date("2026-08-06"), new Date("2026-08-03"), new Date("2026-08-09"))).toBe(true);
  });

  it("treats checkout-exclusive boundaries as non-overlapping", () => {
    expect(overlaps(new Date("2026-08-01"), new Date("2026-08-03"), new Date("2026-08-03"), new Date("2026-08-04"))).toBe(false);
  });

  it("treats checkin-exclusive boundaries as non-overlapping", () => {
    expect(overlaps(new Date("2026-08-03"), new Date("2026-08-05"), new Date("2026-08-01"), new Date("2026-08-03"))).toBe(false);
  });

  it("allows capacity at the exact limit", () => {
    expect(guestCountExceedsCapacity("apartment-1", 3, 3)).toBe(false);
  });

  it("rejects reservations beyond capacity", () => {
    expect(guestCountExceedsCapacity("apartment-1", 4, 3)).toBe(true);
  });
});

describe("alternative-offer pricing calculation", () => {
  it("computes total using nightly rate, nights, cleaning fee, and discount", () => {
    const checkin = new Date("2026-09-01");
    const checkout = new Date("2026-09-06"); // 5 nights
    const res = calculatePrice({
      nightlyPriceCents: 1200,
      checkIn: checkin,
      checkOut: checkout,
      cleaningFeeCents: 500,
      discountCents: 200,
      taxCents: 0,
      currency: "USD",
    });

    expect(res.nights).toBe(5);
    expect(res.subtotalCents).toBe(6_000);
    expect(res.cleaningFeeCents).toBe(500);
    expect(res.discountCents).toBe(200);
    expect(res.totalCents).toBe(6_300);
  });

  it("never produces a negative total after discounts", () => {
    const res = calculatePrice({
      nightlyPriceCents: 50,
      checkIn: new Date("2026-09-01"),
      checkOut: new Date("2026-09-02"),
      cleaningFeeCents: 0,
      discountCents: 100,
    });

    expect(res.totalCents).toBeGreaterThanOrEqual(0);
  });

  it("returns zero nights when check-in equals check-out", () => {
    const res = calculatePrice({
      nightlyPriceCents: 100,
      checkIn: new Date("2026-09-01"),
      checkOut: new Date("2026-09-01"),
    });

    expect(res.nights).toBe(0);
    expect(res.subtotalCents).toBe(0);
    expect(res.totalCents).toBeGreaterThanOrEqual(0);
  });
});
