import { prisma } from "@/lib/prisma";
import BookingSelector from "@/app/booking/booking-selector";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Olora apartments",
  description: "Browse Olora apartments and request a stay.",
};

function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export default async function ApartmentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const apartment = await prisma.apartment.findUnique({
    where: { slug },
    include: {
      amenities: {
        orderBy: { order: "asc" },
        include: { amenity: true },
      },
    },
  });

  if (!apartment) {
    return (
      <main className="mx-auto max-w-[1200px] px-4 py-6 md:px-6">
        <p className="text-sm text-[var(--olora-muted)]">Apartment not found.</p>
      </main>
    );
  }

  const primaryImage = apartment.primaryImageUrl || apartment.imageUrl;
  const galleryItems = [
    { label: "Living area", src: primaryImage ?? null },
    { label: "Bedroom", src: null },
    { label: "Kitchen", src: null },
    { label: "Outdoor space", src: null },
    { label: "Bathroom", src: null },
  ];
  const hasRealImages = galleryItems.some((item) => Boolean(item.src));
  const mainGallery = galleryItems[0];
  const sideGallery = galleryItems.slice(1);

  const detailFacts = [
    apartment.bedrooms != null ? `${apartment.bedrooms} bedrooms` : null,
    apartment.beds != null ? `${apartment.beds} beds` : null,
    apartment.bathrooms != null ? `${apartment.bathrooms} bathrooms` : null,
    `${apartment.maximumGuests} guests`,
  ].filter(Boolean);

  const amenityNames = (apartment.amenities ?? [])
    .map((link) => link.amenity.name)
    .filter((name) => typeof name === "string" && name.trim().length > 0);

  const hasSleepingDetails = Boolean(apartment.bedrooms || apartment.beds);

  const highlightFacts = [
    apartment.bedrooms != null && apartment.bedrooms > 0
      ? `${apartment.bedrooms} bedroom${apartment.bedrooms > 1 ? "s" : ""}`
      : null,
    apartment.beds != null && apartment.beds > 0
      ? `${apartment.beds} bed${apartment.beds > 1 ? "s" : ""}`
      : null,
    apartment.bathrooms != null && apartment.bathrooms > 0
      ? `${apartment.bathrooms} bathroom${apartment.bathrooms > 1 ? "s" : ""}`
      : null,
  ].filter(Boolean);

  return (
    <main className="apartment-experience">
      <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-6">
        <div className="mb-4">
          <Link
            href="/apartments"
            className="inline-flex items-center gap-1 rounded-full border border-[var(--olora-border)] bg-white px-3 py-1 text-xs font-medium transition hover:border-[var(--olora-muted)]"
          >
            <span aria-hidden="true">←</span>
            All apartments
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--olora-text)]">
              {apartment.name}
            </h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled
                className="rounded-full border border-[var(--olora-border)] bg-white px-3 py-1 text-xs font-medium text-[var(--olora-muted)] opacity-70"
              >
                Share
              </button>
              <button
                type="button"
                disabled
                className="rounded-full border border-[var(--olora-border)] bg-white px-3 py-1 text-xs font-medium text-[var(--olora-muted)] opacity-70"
              >
                Save
              </button>
            </div>
          </div>
          {apartment.shortDescription ? (
            <p className="text-[var(--olora-muted)]">{apartment.shortDescription}</p>
          ) : null}
          <p className="text-sm text-[var(--olora-muted)]">{detailFacts.join(" · ")}</p>
        </div>

        <div className="mt-6">
          <div className="md:hidden">
            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-200">
              {mainGallery.src ? (
                <img
                  alt={`${apartment.name} living area`}
                  src={mainGallery.src}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-xs font-medium text-neutral-500">{mainGallery.label}</span>
                </div>
              )}
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--olora-border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--olora-text)]"
              >
                Show all photos
              </button>
            </div>
          </div>
          <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-2 md:grid h-[440px]">
            <div className="overflow-hidden rounded-l-2xl bg-gradient-to-br from-neutral-100 to-neutral-200">
              {mainGallery.src ? (
                <img
                  alt={`${apartment.name} living area`}
                  src={mainGallery.src}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-xs font-medium text-neutral-500">{mainGallery.label}</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 grid-rows-2 gap-2 rounded-r-2xl overflow-hidden">
              {sideGallery.map((item, idx) => (
                <div key={item.label} className={`bg-gradient-to-br from-neutral-100 to-neutral-200 ${idx === sideGallery.length - 1 ? "relative" : ""}`}>
                  {item.src ? (
                    <img
                      alt={item.label}
                      src={item.src}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="text-xs font-medium text-neutral-500">{item.label}</span>
                    </div>
                  )}
                  {idx === sideGallery.length - 1 ? (
                    <div className="absolute bottom-2 right-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg border border-white/70 bg-black/40 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm"
                      >
                        Show all photos
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          {!hasRealImages ? (
            <p className="mt-2 text-xs text-[var(--olora-muted)]">
              Photos are placeholders and will be replaced with apartment gallery images.
            </p>
          ) : null}
        </div>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
          <div className="space-y-0">
            <section aria-label="Property summary" className="border-b border-[var(--olora-border)] py-6">
              <h2 className="text-xl font-semibold text-[var(--olora-text)]">About this apartment</h2>
              <div className="mt-3">
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-[var(--olora-text)]">
                  {apartment.fullDescription}
                </p>
              </div>
            </section>

            <section aria-label="Host" className="border-b border-[var(--olora-border)] py-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full border border-[var(--olora-border)] bg-[var(--olora-text)] text-sm font-medium text-white">
                  O
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--olora-text)]">Hosted by Olora</p>
                  <p className="text-xs text-[var(--olora-muted)]">Local hospitality partner</p>
                </div>
              </div>
              {highlightFacts.length > 0 ? (
                <div className="mt-3 grid gap-2">
                  {highlightFacts.map((fact) => (
                    <div key={fact} className="flex items-start gap-2 text-sm text-[var(--olora-text)]">
                      <span aria-hidden="true">•</span>
                      <span>{fact}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            {hasSleepingDetails ? (
              <section aria-label="Sleeping arrangements" className="border-b border-[var(--olora-border)] py-6">
                <h2 className="text-xl font-semibold text-[var(--olora-text)]">Where you&apos;ll sleep</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[var(--olora-border)] bg-white px-4 py-3 text-sm text-[var(--olora-text)]">
                    {apartment.bedrooms ?? 1} bedroom{apartment.bedrooms && apartment.bedrooms > 1 ? "s" : ""}
                  </div>
                  <div className="rounded-xl border border-[var(--olora-border)] bg-white px-4 py-3 text-sm text-[var(--olora-text)]">
                    {apartment.beds ?? 1} bed{apartment.beds && apartment.beds > 1 ? "s" : ""}
                  </div>
                </div>
              </section>
            ) : null}

            <section
              id="amenities"
              aria-label="Amenities"
              className="border-b border-[var(--olora-border)] py-6"
            >
              <h2 className="text-xl font-semibold text-[var(--olora-text)]">What this place offers</h2>
              {amenityNames.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--olora-muted)]">More property details will be added soon.</p>
              ) : (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-sm text-[var(--olora-text)]">
                  {amenityNames.map((name) => (
                    <li key={name} className="flex items-start gap-2">
                      <span aria-hidden="true" className="mt-0.5 inline-flex">•</span>
                      <span>{name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section id="availability" aria-label="Availability" className="border-b border-[var(--olora-border)] py-6">
              <h2 className="text-xl font-semibold text-[var(--olora-text)]">Availability</h2>
              <p className="mt-2 text-sm text-[var(--olora-muted)]">Availability calendar coming soon.</p>
            </section>

            <section id="location" aria-label="Location" className="border-b border-[var(--olora-border)] py-6">
              <h2 className="text-xl font-semibold text-[var(--olora-text)]">Where you&apos;ll be</h2>
              <p className="mt-2 text-sm text-[var(--olora-muted)]">Location details will be provided after approval.</p>
              <div className="mt-3 aspect-[16/9] overflow-hidden rounded-2xl bg-neutral-100">
                <div className="flex h-full items-center justify-center text-xs text-[var(--olora-muted)]">
                  Map placeholder
                </div>
              </div>
            </section>

            <section aria-label="Things to know" className="py-6">
              <h2 className="text-xl font-semibold text-[var(--olora-text)]">Things to know</h2>
              <div className="mt-3 grid gap-4 md:grid-cols-3 text-sm">
                <div>
                  <h3 className="font-semibold text-[var(--olora-text)]">Booking</h3>
                  <p className="mt-1 text-[var(--olora-muted)]">This booking request is subject to host approval.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--olora-text)]">Payment</h3>
                  <p className="mt-1 text-[var(--olora-muted)]">Dates are not confirmed until payment is completed.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--olora-text)]">Cancellation</h3>
                  <p className="mt-1 text-[var(--olora-muted)]">Cancellation terms will be shared after your request is reviewed.</p>
                </div>
              </div>
            </section>
          </div>

          <aside className="self-start lg:sticky lg:top-24">
            <div className="rounded-2xl border border-[var(--olora-border)] bg-white p-5 shadow-sm">
              <div className="space-y-1">
                <p className="text-xs text-[var(--olora-muted)]">Nightly</p>
                {apartment.nightlyPriceCents != null ? (
                  <p className="text-2xl font-semibold text-[var(--olora-text)]">
                    {money(apartment.nightlyPriceCents, apartment.currency)}
                  </p>
                ) : null}
                {apartment.cleaningFeeCents != null && apartment.cleaningFeeCents > 0 ? (
                  <p className="text-xs text-[var(--olora-muted)]">
                    Cleaning fee {money(apartment.cleaningFeeCents, apartment.currency)}
                  </p>
                ) : null}
                <p className="text-xs text-[var(--olora-muted)]">Total shown after request approval</p>
              </div>
              <div className="mt-3 space-y-1">
                <h3 className="text-sm font-semibold text-[var(--olora-text)]">Request to book</h3>
                <p className="text-xs text-[var(--olora-muted)]">
                  This is not an instant booking. Your request will be reviewed and then payment will be completed.
                </p>
              </div>
              <BookingSelector
                apartmentSlug={apartment.slug}
                maximumGuests={apartment.maximumGuests}
                nightlyPriceCents={apartment.nightlyPriceCents}
                currency={apartment.currency}
              />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
