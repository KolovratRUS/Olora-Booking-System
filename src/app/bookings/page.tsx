import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const bookings = await prisma.booking.findMany({
    include: { apartment: true, guest: true, bookingRequest: true },
    orderBy: { confirmedAt: "desc" },
    take: 25,
  });
  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <h1 className="text-3xl font-semibold">Confirmed bookings</h1>
      <div className="space-y-3">
        {bookings.length === 0 && <p className="text-sm text-neutral-500">No confirmed bookings yet.</p>}
        {bookings.map((booking) => (
          <div key={booking.id} className="rounded border bg-white/80 p-3">
            <p className="text-sm font-semibold">{booking.apartment.name}</p>
            <p className="text-xs text-neutral-600">
              {booking.bookingRequest.reference} • {booking.guest.firstName} {booking.guest.lastName}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
