import { BookingRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import RequestDetailActions from "@/app/admin/requests/[id]/actions";
import { allowedTransitions } from "@/lib/services/bookingService";

export const dynamic = "force-dynamic";

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
  const request = await prisma.bookingRequest.findUnique({
    where: { id: params.id },
    include: { guest: true, apartment: true, offers: true, guestCounteredOffers: true, statusHistory: { orderBy: { changedAt: "desc" } } },
  });
  if (!request) return <main className="p-6">Request not found.</main>;
  const nextStatus = allowedTransitions[request.status][0] ?? null;
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <section>
        <h1 className="text-3xl font-semibold">Booking request {request.reference}</h1>
        <p className="text-sm text-neutral-600">
          {request.guest.firstName} {request.guest.lastName} • {request.apartment.name} •
          {request.checkIn.toISOString().slice(0, 10)} → {request.checkOut.toISOString().slice(0, 10)}
        </p>
      </section>
      <RequestDetailActions requestId={request.id} nextStatus={nextStatus} currentStatus={request.status} />
      <section className="rounded border bg-white/80 p-4">
        <h2 className="text-lg font-semibold">Status history</h2>
        <ul className="mt-2 space-y-1 text-sm text-neutral-700">
          {request.statusHistory.map((entry) => (
            <li key={entry.id}>{entry.fromStatus} → {entry.toStatus}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
