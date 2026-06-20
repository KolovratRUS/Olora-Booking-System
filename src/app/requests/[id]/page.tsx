import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RequestStatusPage({ params }: { params: { id: string } }) {
  const request = await prisma.bookingRequest.findUnique({
    where: { id: params.id },
    include: { guest: true, apartment: true, offers: true },
  });

  if (!request) {
    return (
      <main className="mx-auto max-w-5xl space-y-4 p-6">
        <h1 className="text-3xl font-semibold">Request not found</h1>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <h1 className="text-3xl font-semibold">Request {request.reference}</h1>
      <p className="text-sm font-semibold">
        {request.guest.firstName} {request.guest.lastName}
      </p>
      <p className="text-xs text-neutral-600">
        {request.apartment.name} • {request.checkIn.toISOString().slice(0, 10)} - {request.checkOut.toISOString().slice(0, 10)}
      </p>
    </main>
  );
}
