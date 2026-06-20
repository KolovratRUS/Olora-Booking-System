import { BookingRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

const STATUS_GROUPS: { status: BookingRequestStatus; label: string }[] = [
  { status: "pending_review", label: "Pending review" },
  { status: "alternative_offered", label: "Alternative offered" },
  { status: "guest_countered", label: "Guest countered" },
  { status: "guest_accepted", label: "Guest accepted" },
  { status: "awaiting_payment", label: "Awaiting payment" },
  { status: "confirmed", label: "Confirmed" },
  { status: "declined", label: "Declined" },
  { status: "expired", label: "Expired" },
  { status: "cancelled", label: "Cancelled" },
];

export default async function AdminPage() {
  const groups = await Promise.all(
    STATUS_GROUPS.map(async ({ status, label }) => {
      const requests = await prisma.bookingRequest.findMany({
        where: { status },
        orderBy: { createdAt: "desc" },
        include: {
          guest: true,
          apartment: true,
        },
      });
      return { status, label, requests };
    })
  );

  const populated = groups.filter((group) => group.requests.length > 0);

  return (
    <section className="mx-auto max-w-6xl space-y-8 p-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Admin dashboard</h1>
        <p className="text-sm text-neutral-500">
          Review requests, approve alternatives, and oversee direct booking workflow statuses.
        </p>
      </header>

      {populated.length === 0 && (
        <p className="text-neutral-600">No booking requests yet.</p>
      )}

      <div className="space-y-12">
        {populated.map(({ status, label, requests }) => (
          <section key={status} className="space-y-4">
            <h2 className="text-xl font-semibold">{label}</h2>
            {requests.length === 0 ? (
              <p className="text-sm text-neutral-500">No {label.toLowerCase()} requests.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Reference</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Apartment</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Guest</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Dates</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Guests</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 bg-white/80">
                    {requests.map((request) => (
                      <tr key={request.id} className="hover:bg-neutral-50">
                        <td className="whitespace-nowrap px-3 py-3 text-sm text-neutral-900">
                          <Link href={`/admin/requests/${request.id}`} className="underline">
                            {request.reference}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-sm text-neutral-900">{request.apartment.name}</td>
                        <td className="px-3 py-3 text-sm text-neutral-900">
                          {request.guest.firstName} {request.guest.lastName}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm text-neutral-600">
                          <div>Check-in: {format(request.checkIn, "dd/MM/yyyy")}</div>
                          <div>Check-out: {format(request.checkOut, "dd/MM/yyyy")}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm text-neutral-600">{request.numberOfGuests}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm text-neutral-600">
                          {format(request.createdAt, "yyyy-MM-dd")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}
