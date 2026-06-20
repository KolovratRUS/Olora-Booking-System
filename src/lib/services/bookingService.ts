import { prisma } from "@/lib/prisma";
import { BookingRequestStatus, OfferStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export function overlaps(requestedStart: Date, requestedEnd: Date, existingStart: Date, existingEnd: Date): boolean {
  const start = new Date(requestedStart);
  const end = new Date(requestedEnd);
  const exStart = new Date(existingStart);
  const exEnd = new Date(existingEnd);
  return start.getTime() < exEnd.getTime() && end.getTime() > exStart.getTime();
}

export function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
}

export function isExpired(expiresAt?: Date | null): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() < Date.now();
}

export async function getActiveBlocks(apartmentId: string) {
  return prisma.availabilityBlock.findMany({ where: { apartmentId } });
}

export async function hasAvailabilityConflict(
  apartmentId: string,
  checkIn: Date,
  checkOut: Date
): Promise<boolean> {
  const blocks = await getActiveBlocks(apartmentId);
  for (const block of blocks) {
    if (overlaps(checkIn, checkOut, block.blockStart, block.blockEnd)) {
      return true;
    }
  }
  return false;
}

export const allowedTransitions: Record<BookingRequestStatus, BookingRequestStatus[]> = {
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

export function canTransition(from: BookingRequestStatus, to: BookingRequestStatus): boolean {
  return allowedTransitions[from]?.includes(to) ?? false;
}

export function guestCountExceedsCapacity(_apartmentId: string, guests: number, _capacity: number): boolean {
  return guests > _capacity;
}

export async function transitionRequest(
  requestId: string,
  to: BookingRequestStatus,
  note?: string
): Promise<{ request: Awaited<ReturnType<(typeof prisma)["bookingRequest"]["update"]>> }> {
  const request = await prisma.bookingRequest.findUnique({ where: { id: requestId } });
  if (!request) {
    throw new Error(`Booking request ${requestId} not found`);
  }
  const from = request.status as BookingRequestStatus;
  if (!canTransition(from, to)) {
    throw new Error(`Cannot transition from ${from} to ${to}`);
  }
  const updated = await prisma.bookingRequest.update({
    where: { id: requestId },
    data: { status: to },
  });
  await prisma.statusHistory.create({
    data: {
      entityType: "BookingRequest",
      entityId: requestId,
      fromStatus: from,
      toStatus: to,
      note,
      changedBy: "admin",
      changedAt: new Date(),
    },
  });
  return { request: updated };
}

export const bookingService = {
  overlaps,
  isPast,
  isExpired,
  hasAvailabilityConflict,
  getActiveBlocks,
  guestCountExceedsCapacity,
  canTransition,
  transitionRequest,
};
