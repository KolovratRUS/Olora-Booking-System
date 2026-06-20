import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatCentsToMoney(valueCents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valueCents / 100);
}

export default async function ApartmentsPage() {
  const apartments = await prisma.apartment.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Apartments</h1>
        <p className="text-sm text-[var(--olora-muted)]">
          Choose an Olora apartment and request your stay directly.
        </p>
      </header>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {apartments.map((apartment) => (
          <a
            key={apartment.id}
            href={`/apartments/${apartment.slug}`}
            className="group block rounded-2xl border border-[var(--olora-border)] bg-white transition hover:shadow-sm hover:border-[var(--olora-muted)]"
          >
            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-100">
              <div className="flex h-full items-center justify-center text-xs text-[var(--olora-muted)]">
                Photo coming soon
              </div>
            </div>
            <div className="space-y-1.5 p-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold group-hover:underline">{apartment.name}</h2>
                <span className="text-sm font-semibold text-[var(--olora-accent)]">
                  {formatCentsToMoney(apartment.nightlyPriceCents, apartment.currency)}/night
                </span>
              </div>
              <p className="text-sm text-[var(--olora-muted)] line-clamp-2">{apartment.shortDescription}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--olora-muted)]">
                <span>{apartment.maximumGuests} guests</span>
                {apartment.bedrooms != null ? <span>• {apartment.bedrooms} bedrooms</span> : null}
                {apartment.beds != null ? <span>• {apartment.beds} beds</span> : null}
                {apartment.bathrooms != null ? <span>• {apartment.bathrooms} baths</span> : null}
              </div>
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}
