import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const requests = await prisma.bookingRequest.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <h1 className="text-3xl font-semibold">Booking requests</h1>
      <p className="text-sm text-neutral-500">Review requests by status.</p>
      <ul className="grid gap-2 text-sm text-neutral-600">
        {requests.map((request) => (
          <li key={request.id}>
            <a href={`/requests/${request.id}`} className="text-blue-600 underline">{request.reference}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
