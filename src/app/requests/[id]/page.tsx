import { format } from "date-fns";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RequestStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const request = await prisma.bookingRequest.findUnique({
    where: { id },
    include: {
      guest: true,
      apartment: true,
      offers: true,
    },
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
      <h1 className="text-3xl font-semibold">
        Request {request.reference}
      </h1>

      <p className="text-sm font-semibold">
        {request.guest.firstName} {request.guest.lastName}
      </p>

      <p className="text-xs text-neutral-600">
        {request.apartment.name} • Check-in: {format(request.checkIn, "dd/MM/yyyy")} – Check-out:{" "}
        {format(request.checkOut, "dd/MM/yyyy")}
      </p>

      <p className="text-sm text-neutral-500">
        Status: {request.status}
      </p>
    </main>
  );
}
