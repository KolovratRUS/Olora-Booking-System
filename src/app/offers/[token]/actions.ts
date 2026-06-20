"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  overlaps,
  canTransition,
  isExpired,
  guestCountExceedsCapacity,
} from "@/lib/services/bookingService";

export type GuestActionState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

type AcceptOfferInput = {
  token: string;
};

type DeclineOfferInput = {
  token: string;
  reason?: string;
};

function alreadyAccepted(): GuestActionState {
  return { status: "error", message: "You have already accepted this offer." };
}

function alreadyDeclined(): GuestActionState {
  return { status: "error", message: "You have already declined this offer." };
}

function offerExpired(): GuestActionState {
  return { status: "error", message: "This offer has expired." };
}

function availabilityConflict(): GuestActionState {
  return { status: "error", message: "These dates are no longer available." };
}

function requestProgressed(): GuestActionState {
  return {
    status: "error",
    message: "This booking request has already moved to the next step.",
  };
}

function offerCancelled(): GuestActionState {
  return {
    status: "error",
    message: "This offer has been cancelled.",
  };
}

function genericFailure(message?: string): GuestActionState {
  return {
    status: "error",
    message:
      message ??
      "We could not complete this action. Please refresh the page and try again.",
  };
}

async function acceptOfferCore(token: string): Promise<GuestActionState> {
  const currentOffer = await prisma.bookingOffer.findUnique({
    where: { token },
    include: {
      bookingRequest: { include: { apartment: true } },
      apartment: true,
    },
  });

  if (!currentOffer) {
    return genericFailure("Offer not found.");
  }

  if (currentOffer.status === "cancelled") {
    return offerCancelled();
  }

  if (currentOffer.status === "accepted") {
    return alreadyAccepted();
  }

  if (currentOffer.status === "declined") {
    return alreadyDeclined();
  }

  if (currentOffer.status !== "pending") {
    return offerExpired();
  }

  if (isExpired(currentOffer.expiresAt)) {
    return offerExpired();
  }

  const request = currentOffer.bookingRequest;

  if (!request) {
    return genericFailure("Booking request not found.");
  }

  if (!canTransition(request.status, "guest_accepted")) {
    return requestProgressed();
  }

  const conflictingBlocks = await prisma.availabilityBlock.findMany({
    where: {
      apartmentId: currentOffer.apartmentId,
      blockStart: { lt: currentOffer.checkOut },
      blockEnd: { gt: currentOffer.checkIn },
    },
  });

  const conflict = conflictingBlocks.find((block) =>
    overlaps(
      block.blockStart,
      block.blockEnd,
      currentOffer.checkIn,
      currentOffer.checkOut,
    ),
  );

  if (conflict) {
    return availabilityConflict();
  }

  if (
    guestCountExceedsCapacity(
      currentOffer.apartmentId,
      currentOffer.numberOfGuests,
      currentOffer.apartment.maximumGuests,
    )
  ) {
    return {
      status: "error",
      message: "Guest count exceeds apartment capacity.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.bookingOffer.update({
      where: { id: currentOffer.id },
      data: { status: "accepted", acceptedAt: new Date() },
    });

    await tx.statusHistory.create({
      data: {
        entityType: "BookingOffer",
        entityId: currentOffer.id,
        bookingOfferId: currentOffer.id,
        bookingRequestId: currentOffer.bookingRequestId,
        fromStatus: currentOffer.status,
        toStatus: "accepted",
        note: "Guest accepted alternative offer",
        changedBy: "guest",
      },
    });

    await tx.bookingRequest.update({
      where: { id: request.id },
      data: {
        status: "guest_accepted",
        apartmentId: currentOffer.apartmentId,
        checkIn: currentOffer.checkIn,
        checkOut: currentOffer.checkOut,
        numberOfGuests: currentOffer.numberOfGuests,
        updatedAt: new Date(),
      },
    });

    await tx.statusHistory.create({
      data: {
        entityType: "BookingRequest",
        entityId: request.id,
        bookingRequestId: request.id,
        fromStatus: request.status,
        toStatus: "guest_accepted",
        note: `Guest accepted offer ${currentOffer.token}`,
        changedBy: "guest",
      },
    });

    await tx.bookingOffer.updateMany({
      where: {
        bookingRequestId: request.id,
        NOT: { id: currentOffer.id },
        status: "pending",
      },
      data: { status: "cancelled" },
    });
  });

  revalidatePath("/offers/[token]");
  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${request.id}`);

  return { status: "success" };
}

async function declineOfferCore(
  token: string,
  reason?: string,
): Promise<GuestActionState> {
  const currentOffer = await prisma.bookingOffer.findUnique({
    where: { token },
    include: { bookingRequest: true },
  });

  if (!currentOffer) {
    return genericFailure("Offer not found.");
  }

  if (currentOffer.status === "cancelled") {
    return offerCancelled();
  }

  if (isExpired(currentOffer.expiresAt)) {
    return offerExpired();
  }

  if (currentOffer.status === "accepted") {
    return alreadyAccepted();
  }

  if (currentOffer.status === "declined") {
    return alreadyDeclined();
  }

  if (currentOffer.status !== "pending") {
    return offerExpired();
  }

  const request = currentOffer.bookingRequest;

  if (!request) {
    return genericFailure("Booking request not found.");
  }

  const nextRequestStatus = canTransition(request.status, "declined")
    ? "declined"
    : request.status;

  await prisma.$transaction(async (tx) => {
    await tx.bookingOffer.update({
      where: { id: currentOffer.id },
      data: { status: "declined", declinedAt: new Date() },
    });

    await tx.statusHistory.create({
      data: {
        entityType: "BookingOffer",
        entityId: currentOffer.id,
        bookingOfferId: currentOffer.id,
        bookingRequestId: currentOffer.bookingRequestId,
        fromStatus: currentOffer.status,
        toStatus: "declined",
        note: reason ?? "Guest declined alternative offer",
        changedBy: "guest",
      },
    });

    if (nextRequestStatus !== request.status) {
      await tx.bookingRequest.update({
        where: { id: request.id },
        data: { status: nextRequestStatus, updatedAt: new Date() },
      });

      await tx.statusHistory.create({
        data: {
          entityType: "BookingRequest",
          entityId: request.id,
          bookingRequestId: request.id,
          fromStatus: request.status,
          toStatus: nextRequestStatus,
          note: reason ?? "Guest declined alternative offer",
          changedBy: "guest",
        },
      });
    }
  });

  revalidatePath("/offers/[token]");
  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${request.id}`);

  return { status: "success" };
}

export async function acceptOfferAction(
  prevState: GuestActionState,
  form: FormData,
): Promise<GuestActionState> {
  const token = form.get("token");
  if (typeof token !== "string") {
    return { status: "error", message: "Invalid accept offer form data." };
  }
  return acceptOfferCore(token);
}

export async function declineOfferAction(
  prevState: GuestActionState,
  form: FormData,
): Promise<GuestActionState> {
  const token = form.get("token");
  const reason = form.get("reason");
  if (typeof token !== "string") {
    return { status: "error", message: "Invalid decline offer form data." };
  }
  return declineOfferCore(token, typeof reason === "string" ? reason : undefined);
}
