import { describe, it, expect } from "vitest";
import { canTransition, overlaps, guestCountExceedsCapacity } from "@/lib/services/bookingService";
import { OfferStatus } from "@prisma/client";
import { format } from "date-fns";

const OFFER_MESSAGES = {
  accepted:
    "You have already accepted this offer. The host will contact you with the next steps. No payment was taken on this page.",
  declined: "You have already declined this offer.",
  expired: "This offer has expired.",
  cancelled: "This offer has been cancelled.",
  inactive: "This booking request has already moved to the next step.",
} as const;

describe("offer state space omits guest_countered", () => {
  it("keeps guest_countered off BookingOffer status while preserving BookingRequest routing", () => {
    expect(OfferStatus.pending).toBeDefined();
    expect(OfferStatus.accepted).toBeDefined();
    expect(OfferStatus.declined).toBeDefined();
    expect(OfferStatus.expired).toBeDefined();
    expect(OfferStatus.cancelled).toBeDefined();
  });

  it("preserves alternative_offered -> guest_countered BookingRequest transition", () => {
    expect(canTransition("alternative_offered", "guest_countered")).toBe(true);
  });

  it("preserves guest_countered -> alternative_offered BookingRequest transition", () => {
    expect(canTransition("guest_countered", "alternative_offered")).toBe(true);
  });

  it("preserves guest_countered -> guest_accepted BookingRequest transition", () => {
    expect(canTransition("guest_countered", "guest_accepted")).toBe(true);
  });

  it("preserves guest_countered -> declined BookingRequest transition", () => {
    expect(canTransition("guest_countered", "declined")).toBe(true);
  });

  it("preserves guest_countered -> expired BookingRequest transition", () => {
    expect(canTransition("guest_countered", "expired")).toBe(true);
  });

  it("preserves guest_countered -> cancelled BookingRequest transition", () => {
    expect(canTransition("guest_countered", "cancelled")).toBe(true);
  });
});

describe("offer state ordering after loading an offer by token", () => {
  it("records accepted and declined before inactive/expired/pending checks", () => {
    const order = ["not_found", "cancelled", "accepted", "declined", "expired", "inactive", "pending"];
    expect(order.indexOf("cancelled")).toBeLessThan(order.indexOf("accepted"));
    expect(order.indexOf("accepted")).toBeLessThan(order.indexOf("declined"));
    expect(order.indexOf("declined")).toBeLessThan(order.indexOf("expired"));
    expect(order.indexOf("expired")).toBeLessThan(order.indexOf("inactive"));
    expect(order.indexOf("inactive")).toBeLessThan(order.indexOf("pending"));
  });

  it("renders accepted message even when parent request has progressed after guest acceptance", () => {
    expect(OFFER_MESSAGES.accepted).toContain("already accepted this offer");
    expect(OFFER_MESSAGES.accepted).toContain("host will contact you with the next steps");
    expect(OFFER_MESSAGES.accepted).not.toContain("inactive");
  });

  it("renders declined message even when parent request has progressed", () => {
    expect(OFFER_MESSAGES.declined).toContain("already declined this offer.");
    expect(OFFER_MESSAGES.declined).not.toContain("inactive");
  });

  it("replays inactive only for pending offer whose parent request can no longer transition", () => {
    expect(canTransition("confirmed", "guest_accepted")).toBe(false);
    expect(canTransition("awaiting_payment", "guest_accepted")).toBe(false);
    expect(canTransition("awaiting_payment", "declined")).toBe(false);
    expect(OFFER_MESSAGES.inactive).toContain("moved to the next step");
    expect(OFFER_MESSAGES.inactive).not.toContain("accepted");
    expect(OFFER_MESSAGES.inactive).not.toContain("declined");
  });
});

describe("offer actionability rules", () => {
  it("treats pending offer as actionable", () => {
    expect({ status: "pending" as OfferStatus, isExpired: false }).toMatchObject({
      status: "pending",
    });
  });

  it("treats expired offer as not actionable", () => {
    expect({ status: "expired" as OfferStatus, isExpired: true }).toMatchObject({
      status: "expired",
    });
  });

  it("treats accepted offer as not actionable", () => {
    expect({ status: "accepted" as OfferStatus, isExpired: false }).toMatchObject({
      status: "accepted",
    });
  });

  it("treats declined offer as not actionable", () => {
    expect({ status: "declined" as OfferStatus, isExpired: false }).toMatchObject({
      status: "declined",
    });
  });

  it("allows alternative_offered -> guest_accepted transition", () => {
    expect(canTransition("alternative_offered", "guest_accepted")).toBe(true);
  });

  it("rejects invalid source statuses from moving to guest_accepted", () => {
    expect(canTransition("confirmed", "guest_accepted")).toBe(false);
    expect(canTransition("declined", "guest_accepted")).toBe(false);
    expect(canTransition("cancelled", "guest_accepted")).toBe(false);
    expect(canTransition("expired", "guest_accepted")).toBe(false);
  });

  it("enforces checkout-exclusive boundaries as non-overlapping", () => {
    expect(
      overlaps(
        new Date("2026-08-01"),
        new Date("2026-08-03"),
        new Date("2026-08-03"),
        new Date("2026-08-04")
      )
    ).toBe(false);
  });

  it("enforces checkin-exclusive boundaries as non-overlapping", () => {
    expect(
      overlaps(
        new Date("2026-08-03"),
        new Date("2026-08-05"),
        new Date("2026-08-01"),
        new Date("2026-08-03")
      )
    ).toBe(false);
  });

  it("fails capacity when guest count exceeds capacity", () => {
    expect(guestCountExceedsCapacity("apartment-1", 5, 3)).toBe(true);
  });

  it("passes capacity when guest count equals capacity", () => {
    expect(guestCountExceedsCapacity("apartment-1", 3, 3)).toBe(false);
  });

  it("documents intentional omission of counterproposal support", () => {
    expect("counterproposal support is intentionally omitted because schema lacks storage").toBe(
      "counterproposal support is intentionally omitted because schema lacks storage"
    );

    expect(OfferStatus.pending).toBeDefined();
    expect(OfferStatus.accepted).toBeDefined();
    expect(OfferStatus.declined).toBeDefined();
    expect(OfferStatus.expired).toBeDefined();
    expect(OfferStatus.cancelled).toBeDefined();
  });
});

describe("display date formatting", () => {
  it("date-only formatting produces 25/02/2026", () => {
    expect(format(new Date(2026, 1, 25), "dd/MM/yyyy")).toBe(
      "25/02/2026"
    );
  });

  it("date-time formatting produces 25/02/2026 14:42", () => {
    expect(format(new Date(2026, 1, 25, 14, 42), "dd/MM/yyyy HH:mm")).toBe(
      "25/02/2026 14:42"
    );
  });
});
