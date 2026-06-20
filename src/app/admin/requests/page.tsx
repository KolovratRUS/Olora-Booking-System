import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminRequestsPage() {
  const requests = await prisma.bookingRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      guest: true,
      apartment: true,
    },
  });

  if (requests.length === 0) {
    return (
      <main className="mx-auto max-w-4xl p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Booking requests</h1>
        <p className="text-neutral-600">No booking requests yet.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Booking requests</h1>
      <div className="space-y-4">
        {requests.map((request) => (
          <Link
            key={request.id}
            href={`/admin/requests/${request.id}`}
            className="block border border-neutral-200 rounded-lg p-4 hover:bg-neutral-50 transition-colors"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-neutral-600">Reference</p>
                <p className="font-semibold">{request.reference}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-600">Apartment</p>
                <p className="font-semibold">{request.apartment.name}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-600">Guest</p>
                <p className="font-semibold">
                  {request.guest.firstName} {request.guest.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600">Status</p>
                <p className="font-semibold">{request.status}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-600">Check-in</p>
                <p className="font-semibold">{request.checkIn.toISOString().slice(0, 10)}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-600">Check-out</p>
                <p className="font-semibold">{request.checkOut.toISOString().slice(0, 10)}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
