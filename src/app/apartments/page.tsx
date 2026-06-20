import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ApartmentsPage() {
  const apartments = await prisma.apartment.findMany({ where: { isActive: true } });

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <h1 className="text-3xl font-semibold">Apartments</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {apartments.map((apartment) => (
          <a key={apartment.id} href={`/apartments/${apartment.slug}`} className="rounded-lg border bg-white/70 p-4">
            <h2 className="text-lg font-semibold">{apartment.name}</h2>
            <p className="text-sm text-neutral-600">{apartment.shortDescription}</p>
            <p className="text-xs text-neutral-500">{apartment.maximumGuests} max guests</p>
          </a>
        ))}
      </div>
    </main>
  );
}
