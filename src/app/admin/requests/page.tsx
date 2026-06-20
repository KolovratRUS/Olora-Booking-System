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
      <p className="text-sm text-neutral-500">Use the admin dashboard for grouped status views.</p>
      <div className="space-y-3">
        {requests.map((request) => (
          <Link
            key={request.id}
            href={`/admin/requests/${request.id}`}
            className="flex items-center justify-between rounded border border-neutral-200 px-4 py-3 hover:bg-neutral-50"
          >
            <div className="space-y-1">
              <p className="text-sm font-semibold text-neutral-900">
                {request.reference}
              </p>
              <p className="text-sm text-neutral-700">
                {request.apartment.name} • {request.guest.firstName} {request.guest.lastName}
              </p>
            </div>
            <span className="text-xs text-neutral-500">{request.status}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
