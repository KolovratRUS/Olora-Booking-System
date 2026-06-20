"use server";

import { prisma } from "@/lib/prisma";
import { randomToken } from "@/lib/services/pricing";
import {
  overlaps,
  calculatePrice,
  canTransition,
  guestCountExceedsCapacity,
} from "@/lib/services/bookingService";
import { revalidatePath } from "next/cache";

export async function declineRequest(requestId: string, reason: string) {
  const request = await prisma.bookingRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("Booking request not found");

  if (!canTransition(request.status, "declined")) {
    throw new Error(`Cannot decline a request from status ${request.status}`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const requestUpdate = await tx.bookingRequest.update({
      where: { id: requestId },
      data: { status: "declined" },
    });

    await tx.statusHistory.create({
      data: {
        entityType: "BookingRequest",
        entityId: requestId,
        bookingRequestId: requestId,
        fromStatus: request.status,
        toStatus: "declined",
        note: reason,
        changedBy: "admin",
      },
    });

    return requestUpdate;
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/requests/${requestId}`);

  return updated;
}

export async function cancelRequest(requestId: string, reason: string) {
  const request = await prisma.bookingRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("Booking request not found");

  if (!canTransition(request.status, "cancelled")) {
    throw new Error(`Cannot cancel a request from status ${request.status}`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const requestUpdate = await tx.bookingRequest.update({
      where: { id: requestId },
      data: { status: "cancelled" },
    });

    await tx.statusHistory.create({
      data: {
        entityType: "BookingRequest",
        entityId: requestId,
        bookingRequestId: requestId,
        fromStatus: request.status,
        toStatus: "cancelled",
        note: reason,
        changedBy: "admin",
      },
    });

    return requestUpdate;
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/requests/${requestId}`);

  return updated;
}

export async function addAdminNote(requestId: string, note: string) {
  const request = await prisma.bookingRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("Booking request not found");

  const created = await prisma.adminNote.create({
    data: { bookingRequestId: requestId, note },
  });

  revalidatePath(`/admin/requests/${requestId}`);
  return created;
}

export async function markAirbnbChecked({ requestId, checked }: { requestId: string; checked: boolean }) {
  const request = await prisma.bookingRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("Booking request not found");

  const updated = await prisma.bookingRequest.update({
    where: { id: requestId },
    data: {
      airbnbSyncStatus: checked ? "checked" : "not_checked",
      updatedAt: new Date(),
    },
  });

  revalidatePath(`/admin/requests/${requestId}`);
  return updated;
}

export async function markAirbnbBlocked(requestId: string) {
  const request = await prisma.bookingRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("Booking request not found");

  const updated = await prisma.bookingRequest.update({
    where: { id: requestId },
    data: {
      airbnbSyncStatus: "blocked",
      updatedAt: new Date(),
    },
  });

  revalidatePath(`/admin/requests/${requestId}`);
  return updated;
}

export async function transitionToAwaitingPayment(requestId: string, note: string) {
  const request = await prisma.bookingRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("Booking request not found");

  if (!canTransition(request.status, "awaiting_payment")) {
    throw new Error(`Cannot move request to awaiting payment from status ${request.status}`);
  }

  if (!["checked", "blocked"].includes(request.airbnbSyncStatus)) {
    throw new Error("Airbnb availability must be checked and blocked before moving to awaiting payment");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const requestUpdate = await tx.bookingRequest.update({
      where: { id: requestId },
      data: { status: "awaiting_payment", updatedAt: new Date() },
    });

    await tx.statusHistory.create({
      data: {
        entityType: "BookingRequest",
        entityId: requestId,
        bookingRequestId: requestId,
        fromStatus: request.status,
        toStatus: "awaiting_payment",
        note,
        changedBy: "admin",
      },
    });

    return requestUpdate;
  });

  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${requestId}`);

  return updated;
}

export async function approveIntoConfirmed(requestId: string, note: string) {
  const request = await prisma.bookingRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("Booking request not found");

  if (!canTransition(request.status, "confirmed")) {
    throw new Error(`Cannot confirm a request from status ${request.status}`);
  }

  if (request.status !== "awaiting_payment") {
    throw new Error("Only requests in awaiting_payment can be confirmed");
  }

  if (!["checked", "blocked"].includes(request.airbnbSyncStatus)) {
    throw new Error("Airbnb availability must be checked and blocked before confirming");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const requestUpdate = await tx.bookingRequest.update({
      where: { id: requestId },
      data: { status: "confirmed", updatedAt: new Date() },
    });

    await tx.statusHistory.create({
      data: {
        entityType: "BookingRequest",
        entityId: requestId,
        bookingRequestId: requestId,
        fromStatus: request.status,
        toStatus: "confirmed",
        note,
        changedBy: "admin",
      },
    });

    return requestUpdate;
  });

  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${requestId}`);

  return updated;
}

export async function createAlternativeOffer({
  requestId,
  apartmentId,
  checkIn,
  checkOut,
  numberOfGuests,
  nightlyPriceCents,
  cleaningFeeCents,
  discountCents,
  adminMessage,
  expiresAt,
}: {
  requestId: string;
  apartmentId: string;
  checkIn: Date;
  checkOut: Date;
  numberOfGuests: number;
  nightlyPriceCents: number;
  cleaningFeeCents: number;
  discountCents: number;
  adminMessage?: string;
  expiresAt?: Date;
}) {
  const request = await prisma.bookingRequest.findUnique({
    where: { id: requestId },
    include: { apartment: true },
  });
  if (!request) throw new Error("Booking request not found");

  if (!canTransition(request.status, "alternative_offered")) {
    throw new Error(`Cannot create alternative offer from status ${request.status}`);
  }

  if (!["checked", "blocked"].includes(request.airbnbSyncStatus)) {
    throw new Error("Airbnb availability must be checked before creating an alternative offer");
  }

  const apartment = await prisma.apartment.findUnique({ where: { id: apartmentId } });
  if (!apartment || !apartment.isActive) {
    throw new Error("Selected apartment is not available");
  }

  if (checkOut <= checkIn) {
    throw new Error("Check-out must be after check-in");
  }

  if (guestCountExceedsCapacity(apartmentId, numberOfGuests, apartment.maximumGuests)) {
    throw new Error(`Apartment capacity is ${apartment.maximumGuests} guests`);
  }

  const pricing = calculatePrice({
    nightlyPriceCents,
    checkIn,
    checkOut,
    cleaningFeeCents,
    discountCents,
    taxCents: 0,
  });

  const token = randomToken();
  const now = new Date();

  const offerExpiresAt =
    expiresAt && Number.isFinite(expiresAt.getTime())
      ? expiresAt
      : new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);

  const conflictingBlocks = await prisma.availabilityBlock.findMany({
    where: {
      apartmentId,
      blockStart: { lt: checkOut },
      blockEnd: { gt: checkIn },
    },
  });

  const conflict = conflictingBlocks.find((block) =>
    overlaps(block.blockStart, block.blockEnd, checkIn, checkOut)
  );
  if (conflict) {
    throw new Error("Selected dates conflict with existing availability block");
  }

  const overlappingOffer = await prisma.bookingOffer.findFirst({
    where: {
      apartmentId,
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
      status: { in: ["pending", "accepted"] },
      expiresAt: { gte: now },
    },
  });
  if (overlappingOffer) {
    throw new Error("Selected dates overlap with an existing offer");
  }

  const overlappingRequest = await prisma.bookingRequest.findFirst({
    where: {
      apartmentId,
      NOT: {
        id: requestId,
        status: { in: ["declined", "cancelled", "expired"] },
      },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
  });
  if (overlappingRequest) {
    throw new Error("Selected dates are already occupied by another request");
  }

  const created = await prisma.$transaction(
    async (tx) => {
      const offer = await tx.bookingOffer.create({
        data: {
          token,
          bookingRequestId: requestId,
          apartmentId,
          checkIn,
          checkOut,
          numberOfGuests,
          nightlyPriceCents,
          cleaningFeeCents,
          discountCents,
          taxCents: 0,
          totalCents: pricing.totalCents,
          adminMessage: adminMessage ?? null,
          status: "pending",
          expiresAt: offerExpiresAt,
        },
      });

      await tx.bookingRequest.update({
        where: { id: requestId },
        data: {
          status: "alternative_offered",
          updatedAt: new Date(),
        },
      });

      await tx.statusHistory.create({
        data: {
          entityType: "BookingRequest",
          entityId: requestId,
          bookingRequestId: requestId,
          fromStatus: request.status,
          toStatus: "alternative_offered",
          note: `Alternative offer created (${offer.id})`,
          changedBy: "admin",
        },
      });

      return offer;
    },
    { maxWait: 5000, timeout: 10000 }
  );

  revalidatePath("/admin");
  revalidatePath(`/admin/requests/${requestId}`);

  return created;
}

export async function getRequestDetail(requestId: string) {
  const request = await prisma.bookingRequest.findUnique({
    where: { id: requestId },
    include: {
      guest: true,
      apartment: true,
      offers: { orderBy: { createdAt: "desc" }, include: { apartment: true } },
      history: { orderBy: { changedAt: "desc" } },
      adminNotes: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!request) {
    throw new Error("Booking request not found");
  }

  const [blockingBlocks, spaceBlockingRequests, activeApartments] =
    await Promise.all([
      prisma.availabilityBlock.findMany({
        where: {
          apartmentId: request.apartmentId,
          blockStart: { lt: request.checkOut },
          blockEnd: { gt: request.checkIn },
        },
        orderBy: { blockStart: "asc" },
      }),
      prisma.bookingRequest.findMany({
        where: {
          apartmentId: request.apartmentId,
          NOT: {
            id: request.id,
            OR: [{ status: "declined" }, { status: "cancelled" }, { status: "expired" }],
          },
          checkIn: { lt: request.checkOut },
          checkOut: { gt: request.checkIn },
        },
        include: { guest: true },
        orderBy: { checkIn: "asc" },
      }),
      prisma.apartment.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

  const visibleConflicts = blockingBlocks.filter((block) =>
    overlaps(block.blockStart, block.blockEnd, request.checkIn, request.checkOut)
  );

  return { request, visibleConflicts, spaceBlockingRequests, activeApartments };
}

export async function declineRequestFormAction(form: FormData) {
  const requestId = form.get("requestId");
  const reason = form.get("reason");
  if (typeof requestId !== "string" || typeof reason !== "string") {
    throw new Error("Invalid decline request form data");
  }
  await declineRequest(requestId, reason);
}

export async function cancelRequestFormAction(form: FormData) {
  const requestId = form.get("requestId");
  const reason = form.get("reason");
  if (typeof requestId !== "string" || typeof reason !== "string") {
    throw new Error("Invalid cancel request form data");
  }
  await cancelRequest(requestId, reason);
}

export async function addAdminNoteFormAction(form: FormData) {
  const requestId = form.get("requestId");
  const note = form.get("note");
  if (typeof requestId !== "string" || typeof note !== "string") {
    throw new Error("Invalid admin note form data");
  }
  await addAdminNote(requestId, note);
}

export async function markAirbnbCheckedFormAction(form: FormData) {
  const requestId = form.get("requestId");
  const checked = form.get("checked");
  if (typeof requestId !== "string" || typeof checked !== "string") {
    throw new Error("Invalid Airbnb checked form data");
  }
  await markAirbnbChecked({ requestId, checked: checked !== "false" });
}

export async function markAirbnbBlockedFormAction(form: FormData) {
  const requestId = form.get("requestId");
  if (typeof requestId !== "string") {
    throw new Error("Invalid Airbnb blocked form data");
  }
  await markAirbnbBlocked(requestId);
}

export async function approveRequestFormAction(form: FormData) {
  const requestId = form.get("requestId");
  const note = form.get("note");
  if (typeof requestId !== "string" || typeof note !== "string") {
    throw new Error("Invalid approval form data");
  }
  await approveIntoConfirmed(requestId, note);
}

export async function transitionToAwaitingPaymentFormAction(form: FormData) {
  const requestId = form.get("requestId");
  const note = form.get("note");
  if (typeof requestId !== "string" || typeof note !== "string") {
    throw new Error("Invalid move-to-awaiting-payment form data");
  }
  await transitionToAwaitingPayment(requestId, note);
}

export async function confirmPaymentFormAction(form: FormData) {
  const requestId = form.get("requestId");
  const note = form.get("note");
  if (typeof requestId !== "string" || typeof note !== "string") {
    throw new Error("Invalid confirm-payment form data");
  }
  await approveIntoConfirmed(requestId, note);
}

export async function createAlternativeOfferFormAction(form: FormData) {
  const requestId = form.get("requestId");
  const apartmentId = form.get("apartmentId");
  const checkInRaw = form.get("checkIn");
  const checkOutRaw = form.get("checkOut");
  const numberOfGuestsRaw = form.get("numberOfGuests");
  const nightlyPriceCentsRaw = form.get("nightlyPriceCents");
  const cleaningFeeCentsRaw = form.get("cleaningFeeCents");
  const discountCentsRaw = form.get("discountCents");
  const adminMessageRaw = form.get("adminMessage");

  if (
    typeof requestId !== "string" ||
    typeof apartmentId !== "string" ||
    typeof checkInRaw !== "string" ||
    typeof checkOutRaw !== "string" ||
    typeof numberOfGuestsRaw !== "string" ||
    typeof nightlyPriceCentsRaw !== "string" ||
    typeof cleaningFeeCentsRaw !== "string" ||
    typeof discountCentsRaw !== "string"
  ) {
    throw new Error("Invalid alternative offer form data");
  }

  const checkIn = new Date(checkInRaw);
  if (Number.isNaN(checkIn.getTime())) {
    throw new Error("Invalid check-in date");
  }

  const checkOut = new Date(checkOutRaw);
  if (Number.isNaN(checkOut.getTime())) {
    throw new Error("Invalid check-out date");
  }

  const numberOfGuests = Number(numberOfGuestsRaw);
  const nightlyPriceCents = Number(nightlyPriceCentsRaw);
  const cleaningFeeCents = Number(cleaningFeeCentsRaw);
  const discountCents = Number(discountCentsRaw);

  if (
    !Number.isFinite(numberOfGuests) ||
    !Number.isFinite(nightlyPriceCents) ||
    !Number.isFinite(cleaningFeeCents) ||
    !Number.isFinite(discountCents)
  ) {
    throw new Error("Invalid numeric alternative offer values");
  }

  await createAlternativeOffer({
    requestId,
    apartmentId,
    checkIn,
    checkOut,
    numberOfGuests,
    nightlyPriceCents,
    cleaningFeeCents,
    discountCents,
    adminMessage: typeof adminMessageRaw === "string" ? adminMessageRaw : undefined,
  });
}
