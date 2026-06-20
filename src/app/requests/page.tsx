import { BookingRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const statuses = Object.values(BookingRequestStatus);
  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <h1 className="text-3xl font-semibold">Booking requests</h1>
      <p className="text-sm text-neutral-500">Review requests by status.</p>
      <ul className="grid gap-2 text-sm text-neutral-600">
        {statuses.map((status) => (
          <li key={status}>
            <a href={`/requests/${status}`} className="text-blue-600 underline">
              {status}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
