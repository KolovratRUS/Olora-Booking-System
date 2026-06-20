import { BookingRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function fetchRequests(status: BookingRequestStatus) {
  return prisma.bookingRequest.findMany({
    where: { status },
    include: {
      apartment: true,
      guest: true,
      offers: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function approveRequest(requestId: string, note: string) {
  const request = await prisma.bookingRequest.findUnique({ where: { id: requestId } });
  if (!request) {
    return;
  }
  if (!bookingService.canTransition(request.status, "guest_accepted")) {
    console.error("Disallowed transition", { requestId, from: request.status, to: "guest_accepted" });
    return;
  }

  const [updated] = await prisma.$transaction([
    prisma.bookingRequest.update({
      where: { id: requestId },
      data: { status: "guest_accepted" },
    }),
    prisma.statusHistory.create({
      data: {
        entityType: "BookingRequest",
        entityId: requestId,
        fromStatus: request.status,
        toStatus: "guest_accepted",
        note,
        changedBy: "admin",
      },
    }),
  ]);
  revalidatePath("/admin");
  return updated;
}

async function declineRequest(requestId: string, note: string) {
  const request = await prisma.bookingRequest.findUnique({ where: { id: requestId } });
  if (!request) {
    return;
  }
  if (!bookingService.canTransition(request.status, "declined")) {
    console.error("Disallowed transition", { requestId, from: request.status, to: "declined" });
    return;
  }

  const [updated] = await prisma.$transaction([
    prisma.bookingRequest.update({
      where: { id: requestId },
      data: { status: "declined" },
    }),
    prisma.statusHistory.create({
      data: {
        entityType: "BookingRequest",
        entityId: requestId,
        fromStatus: request.status,
        toStatus: "declined",
        note,
        changedBy: "admin",
      },
    }),
  ]);
  revalidatePath("/admin");
  return updated;
}

async function offerAlternative(requestId: string, note: string) {
  const request = await prisma.bookingRequest.findUnique({ where: { id: requestId } });
  if (!request) {
    return;
  }
  if (!bookingService.canTransition(request.status, "alternative_offered")) {
    console.error("Disallowed transition", { requestId, from: request.status, to: "alternative_offered" });
    return;
  }

  const [updated] = await prisma.$transaction([
    prisma.bookingRequest.update({
      where: { id: requestId },
      data: { status: "alternative_offered" },
    }),
    prisma.statusHistory.create({
      data: {
        entityType: "BookingRequest",
        entityId: requestId,
        fromStatus: request.status,
        toStatus: "alternative_offered",
        note,
        changedBy: "admin",
      },
    }),
  ]);
  revalidatePath("/admin");
  return updated;
}

async function transitionAction(formData: FormData) {
  "use server";
  const requestId = String(formData.get("requestId") || "");
  const action = String(formData.get("action") || "");
  const note = String(formData.get("note") || "");

  if (!requestId) {
    return;
  }

  switch (action) {
    case "approve":
      await approveRequest(requestId, note);
      break;
    case "decline":
      await declineRequest(requestId, note);
      break;
    case "alternative_offered":
      await offerAlternative(requestId, note);
      break;
    default:
      console.error("Unknown action", { requestId, action });
  }
}

type Request = {
  id: string;
  reference: string;
  status: BookingRequestStatus;
  checkIn: string;
  checkOut: string;
  numberOfGuests: number;
  apartment: { name: string };
  guest: { firstName: string; lastName: string; email?: string };
  offers: Array<{ id: string; status: string; totalCents: number; expiresAt: Date }>;
};

function PendingRequestQueue({ requests, action }: { requests: Request[]; action: (formData: FormData) => Promise<void> }) {
  return (
    <article className="space-y-4 rounded-lg border border-dashed border-gray-300 p-4">
      <h2 className="text-xl font-semibold">Pending review</h2>
      {requests.length === 0 && <p className="text-sm text-neutral-500">No pending requests for manual triage.</p>}
      <div className="space-y-3">
        {requests.map((request) => (
          <form key={request.id} action={action} className="flex flex-col gap-3 rounded border bg-white/80 p-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-neutral-900">{request.apartment.name}</span>
              <span className="text-sm text-neutral-600">
                {request.guest.firstName} {request.guest.lastName} • {request.guest.email ?? ""}
              </span>
              <span className="text-xs text-neutral-500">
                {request.checkIn} → {request.checkOut} • {request.numberOfGuests} guest(s)
              </span>
              <span className="text-xs text-neutral-500">{request.reference}</span>
            </div>
            <input name="requestId" type="hidden" value={request.id} />
            <input name="note" className="rounded border px-2 py-1 text-sm" placeholder="Admin note" />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                name="action"
                value="approve"
                className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Approve
              </button>
              <button
                type="submit"
                name="action"
                value="alternative_offered"
                className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Alternative offer
              </button>
              <button
                type="submit"
                name="action"
                value="decline"
                className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Decline
              </button>
            </div>
          </form>
        ))}
      </div>
    </article>
  );
}

function AcceptedRequestQueue({ requests, action }: { requests: Request[]; action: (formData: FormData) => Promise<void> }) {
  return (
    <article className="space-y-4 rounded-lg border border-dashed border-gray-300 p-4">
      <h2 className="text-xl font-semibold">Awaiting payment confirmation</h2>
      {requests.length === 0 && <p className="text-sm text-neutral-500">No accepted requests awaiting payment.</p>}
      <div className="space-y-3">
        {requests.map((request) => (
          <form key={request.id} action={action} className="flex flex-col gap-3 rounded border bg-white/80 p-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-neutral-900">{request.apartment.name}</span>
              <span className="text-xs text-neutral-500">
                {request.checkIn} → {request.checkOut} • {request.numberOfGuests} guest(s)
              </span>
              <span className="text-xs text-neutral-500">{request.reference}</span>
            </div>
            <input name="requestId" type="hidden" value={request.id} />
            <input name="note" className="rounded border px-2 py-1 text-sm" placeholder="Admin note" />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                name="action"
                value="approve"
                className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Confirm payment
              </button>
              <button
                type="submit"
                name="action"
                value="decline"
                className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Decline
              </button>
            </div>
          </form>
        ))}
      </div>
    </article>
  );
}

export default async function AdminPage() {
  const pendingRequests = await fetchRequests("pending_review");
  const acceptedRequests = await fetchRequests("guest_accepted");
  return (
    <section className="mx-auto max-w-6xl space-y-8 p-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Admin dashboard</h1>
        <p className="text-sm text-neutral-500">
          Review requests, approve alternatives, and oversee direct booking workflow statuses.
        </p>
      </header>
      <section className="grid gap-6 md:grid-cols-2">
        <PendingRequestQueue requests={pendingRequests} action={transitionAction} />
        <AcceptedRequestQueue requests={acceptedRequests} action={transitionAction} />
      </section>
    </section>
  );
}
