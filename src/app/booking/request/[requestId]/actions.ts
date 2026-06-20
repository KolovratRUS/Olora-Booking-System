'use server';
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { BookingRequestStatus } from "@prisma/client";
import { allowedTransitions } from "@/lib/services/bookingService";

async function getNextStatus(status: BookingRequestStatus) {
  return allowedTransitions[status][0] ?? null;
}

export async function transitionBookingRequest(formData: FormData) {
  const requestId = String(formData.get('requestId') || '');
  const note = String(formData.get('note') || '');
  const request = await prisma.bookingRequest.findUnique({ where: { id: requestId } });
  if (!request) return null;
  const nextStatus = getNextStatus(request.status);
  if (!nextStatus) return request;
  await prisma.bookingRequest.update({ where: { id: requestId }, data: { status: nextStatus } });
  await prisma.statusHistory.create({
    data: {
      entityType: 'BookingRequest',
      entityId: requestId,
      fromStatus: request.status,
      toStatus: nextStatus,
      note,
      changedBy: 'admin',
    },
  });
  revalidatePath('/admin');
  revalidatePath(`/admin/requests/${requestId}`);
  return prisma.bookingRequest.findUnique({ where: { id: requestId } });
}
