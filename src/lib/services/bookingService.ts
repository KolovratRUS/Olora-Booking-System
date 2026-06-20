export function overlaps(
  requestedStart: Date,
  requestedEnd: Date,
  existingStart: Date,
  existingEnd: Date,
): boolean {
  const start = new Date(requestedStart);
  const end = new Date(requestedEnd);
  const exStart = new Date(existingStart);
  const exEnd = new Date(existingEnd);
  return start.getTime() < exEnd.getTime() && end.getTime() > exStart.getTime();
}

export function nightsBetween(start: Date, end: Date): number {
  return Math.max(
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)),
    0,
  );
}

export function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
}

export function isExpired(expiresAt?: Date | null): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() < Date.now();
}

export function calculatePrice(input: {
  nightlyPriceCents: number;
  checkIn: Date;
  checkOut: Date;
  cleaningFeeCents?: number;
  discountCents?: number;
  taxCents?: number;
  currency?: string;
}) {
  const nights = Math.max(
    Math.round((input.checkOut.getTime() - input.checkIn.getTime()) / (1000 * 60 * 60 * 24)),
    0,
  );
  const cleaning = input.cleaningFeeCents ?? 0;
  const discount = input.discountCents ?? 0;
  const tax = input.taxCents ?? 0;
  const subtotal = nights * input.nightlyPriceCents;
  const total = Math.max(subtotal + cleaning - discount + tax, 0);
  return {
    nights,
    subtotalCents: subtotal,
    cleaningFeeCents: cleaning,
    discountCents: discount,
    taxCents: tax,
    totalCents: total,
    currency: input.currency ?? "USD",
  };
}

export function guestCountExceedsCapacity(_apartmentId: string, guests: number, _capacity: number): boolean {
  return guests > _capacity;
}

export const allowedTransitions: Record<string, string[]> = {
  pending_review: ["alternative_offered", "guest_accepted", "declined", "cancelled"],
  alternative_offered: ["guest_countered", "guest_accepted", "declined", "expired", "cancelled"],
  guest_countered: ["alternative_offered", "guest_accepted", "declined", "expired", "cancelled"],
  guest_accepted: ["awaiting_payment", "cancelled"],
  awaiting_payment: ["confirmed", "expired", "cancelled"],
  confirmed: ["cancelled"],
  declined: [],
  expired: [],
  cancelled: [],
};

export function canTransition(from: string, to: string): boolean {
  return allowedTransitions[from]?.includes(to) ?? false;
}

export type VisibleAction =
  | { type: "move_to_awaiting_payment" }
  | { type: "confirm_payment" }
  | { type: "alternative_offer" }
  | { type: "decline" }
  | { type: "cancel" };

export function getVisibleActions(status: string): VisibleAction[] {
  const actions: VisibleAction[] = [];
  if (canTransition(status, "awaiting_payment")) actions.push({ type: "move_to_awaiting_payment" });
  if (canTransition(status, "confirmed")) actions.push({ type: "confirm_payment" });
  if (canTransition(status, "alternative_offered")) actions.push({ type: "alternative_offer" });
  if (canTransition(status, "declined")) actions.push({ type: "decline" });
  if (canTransition(status, "cancelled")) actions.push({ type: "cancel" });
  return actions;
}
