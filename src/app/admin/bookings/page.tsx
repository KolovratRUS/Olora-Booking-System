import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  const bookings = await prisma.booking.findMany({
    include: { apartment: true, guest: true },
    orderBy: { confirmedAt: "desc" },
    take: 50,
  });
  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Confirmed bookings</h1>
      <ul className="grid gap-2 text-sm text-neutral-600">
        {bookings.map((booking) => (
          <li key={booking.id} className="rounded border bg-white/80 p-2">
            {booking.apartment.name} • {booking.guest.firstName} {booking.guest.lastName} • {booking.status}
          </li>
        ))}
      </ul>
    </main>
  );
}
