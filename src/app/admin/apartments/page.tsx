import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminApartmentsPage() {
  const apartments = await prisma.apartment.findMany();
  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Apartments</h1>
      <ul className="grid gap-2 text-sm text-neutral-600">
        {apartments.map((apartment) => (
          <li key={apartment.id} className="rounded border bg-white/80 p-2">
            {apartment.name} • {apartment.slug} • {apartment.maximumGuests} max guests
          </li>
        ))}
      </ul>
    </main>
  );
}
