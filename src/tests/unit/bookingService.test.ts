import { describe, it, expect } from "vitest";
import { overlaps, nightsBetween, isExpired, calculatePrice, guestCountExceedsCapacity, canTransition } from "../../lib/services/bookingService";

describe("availability and booking helpers", () => {
  it("overlaps when start < existing end", () => {
    expect(overlaps(new Date("2026-07-20"), new Date("2026-07-25"), new Date("2026-07-22"), new Date("2026-07-28"))).toBe(true);
  });
  it("no overlap when checkout equals existing start", () => {
    expect(overlaps(new Date("2026-07-10"), new Date("2026-07-20"), new Date("2026-07-20"), new Date("2026-07-28"))).toBe(false);
  });
  it("computes nights between check-in and check-out", () => {
    expect(nightsBetween(new Date("2026-07-20"), new Date("2026-07-25"))).toBe(5);
    expect(nightsBetween(new Date("2026-07-25"), new Date("2026-07-20"))).toBe(0);
  });
});

describe("pricing", () => {
  it("computes total from nightly rate, nights, cleaning, discount", () => {
    const checkin = new Date("2026-07-20T00:00:00.000Z");
    const checkout = new Date("2026-07-25T00:00:00.000Z"); // 5 nights
    const res = calculatePrice({ nightlyPriceCents: 100, checkOut: checkout, checkIn: checkin, cleaningFeeCents: 50, discountCents: 10, taxCents: 0, currency: "USD" });
    expect(res.nights).toBe(5);
    expect(res.subtotalCents).toBe(5 * 100);
    expect(res.totalCents).toBe(540); // 500 + 50 - 10 + 0
  });
});

describe("expiry", () => {
  it("treats an offer with pass expiresAt as expired", () => {
    expect(isExpired(new Date(Date.now() + 1000))).toBe(false);
    expect(isExpired(new Date(Date.now() - 1000))).toBe(true);
  });
});

describe("capacity and transitions", () => {
  it("flags excessive guest counts", () => {
    expect(guestCountExceedsCapacity("apartment-1", 4, 3)).toBe(true);
    expect(guestCountExceedsCapacity("apartment-1", 2, 3)).toBe(false);
  });
  it("allows valid state transitions", () => {
    expect(canTransition("pending_review", "guest_accepted")).toBe(true);
    expect(canTransition("confirmed", "cancelled")).toBe(true);
    expect(canTransition("confirmed", "declined")).toBe(false);
    expect(canTransition("pending_review", "invalid")).toBe(false);
  });
});
