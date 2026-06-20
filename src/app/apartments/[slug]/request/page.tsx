import { prisma } from "@/lib/prisma";
import BookingRequestForm from "@/app/booking/request-form";
import Link from "next/link";

function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function isValidDate(value?: string | string[]): boolean {
  if (!value || typeof value !== "string") return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export const dynamic = "force-dynamic";

export default async function BookingRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ checkIn?: string; checkOut?: string; guests?: string }>;
}) {
  const { slug } = await params;
  const { checkIn = "", checkOut = "", guests = "" } = await searchParams;

  if (!isValidDate(checkIn) || !isValidDate(checkOut)) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <div className="space-y-3 rounded-2xl border border-[var(--olora-border)] bg-white p-6">
          <p className="text-sm text-red-700">Please provide valid check-in and check-out dates.</p>
          <Link
            href={`/apartments/${slug}`}
            className="inline-flex h-9 items-center rounded-lg border border-[var(--olora-border)] bg-white px-3 text-xs font-medium text-[var(--olora-text)] transition hover:border-[var(--olora-muted)]"
          >
            Back to apartment
          </Link>
        </div>
      </main>
    );
  }

  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);

  if (outDate.getTime() <= inDate.getTime()) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <div className="space-y-3 rounded-2xl border border-[var(--olora-border)] bg-white p-6">
          <p className="text-sm text-red-700">Check-out must be after check-in.</p>
          <Link
            href={`/apartments/${slug}`}
            className="inline-flex h-9 items-center rounded-lg border border-[var(--olora-border)] bg-white px-3 text-xs font-medium text-[var(--olora-text)] transition hover:border-[var(--olora-muted)]"
          >
            Back to apartment
          </Link>
        </div>
      </main>
    );
  }

  const guestCount = guests ? parseInt(guests, 10) : NaN;
  if (Number.isNaN(guestCount) || guestCount < 1) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <div className="space-y-3 rounded-2xl border border-[var(--olora-border)] bg-white p-6">
          <p className="text-sm text-red-700">Guest count must be a positive number.</p>
          <Link
            href={`/apartments/${slug}`}
            className="inline-flex h-9 items-center rounded-lg border border-[var(--olora-border)] bg-white px-3 text-xs font-medium text-[var(--olora-text)] transition hover:border-[var(--olora-muted)]"
          >
            Back to apartment
          </Link>
        </div>
      </main>
    );
  }

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
      <main className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <p className="text-sm text-[var(--olora-muted)]">Apartment not found.</p>
        <Link href="/apartments" className="mt-3 inline-flex text-sm font-medium text-[var(--olora-accent)]">
          Browse apartments
        </Link>
      </main>
    );
  }

  if (guestCount > apartment.maximumGuests) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <div className="space-y-3 rounded-2xl border border-[var(--olora-border)] bg-white p-6">
          <p className="text-sm text-red-700">
            Selected guest count exceeds the apartment maximum of {apartment.maximumGuests} guests.
          </p>
          <Link
            href={`/apartments/${slug}`}
            className="inline-flex h-9 items-center rounded-lg border border-[var(--olora-border)] bg-white px-3 text-xs font-medium text-[var(--olora-text)] transition hover:border-[var(--olora-muted)]"
          >
            Back to apartment
          </Link>
        </div>
      </main>
    );
  }

  const nights = Math.max(
    Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)),
    0,
  );

  return (
    <main className="apartment-experience">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <Link
          href={`/apartments/${slug}`}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--olora-border)] bg-white px-3 py-1 text-xs font-medium text-[var(--olora-text)] transition hover:border-[var(--olora-muted)]"
        >
          <span aria-hidden="true">←</span>
          {apartment.name}
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold text-[var(--olora-text)]">Request to book</h1>

            <div className="rounded-2xl border border-[var(--olora-border)] bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-[var(--olora-text)]">Stay summary</h2>
              <dl className="mt-3 space-y-2 text-sm text-[var(--olora-text)]">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-[var(--olora-muted)]">Apartment</dt>
                  <dd className="font-medium text-right">{apartment.name}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-[var(--olora-muted)]">Check-in</dt>
                  <dd className="font-medium text-right">{checkIn}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-[var(--olora-muted)]">Check-out</dt>
                  <dd className="font-medium text-right">{checkOut}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-[var(--olora-muted)]">Guests</dt>
                  <dd className="font-medium text-right">{guestCount}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-[var(--olora-muted)]">Nights</dt>
                  <dd className="font-medium text-right">{nights}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-[var(--olora-muted)]">Nightly rate</dt>
                  <dd className="font-medium text-right">{money(apartment.nightlyPriceCents, apartment.currency)}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-[var(--olora-border)] bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-[var(--olora-text)]">Before you continue</h2>
              <ul className="mt-3 space-y-2 text-sm text-[var(--olora-text)]">
                <li>• Your booking request is subject to host approval.</li>
                <li>• Dates are not confirmed until approval and payment is completed.</li>
                <li>• No charge occurs at this stage.</li>
              </ul>
            </div>
          </div>

          <div>
            <BookingRequestForm
              apartmentId={apartment.id}
              initialCheckIn={checkIn}
              initialCheckOut={checkOut}
              initialGuests={guestCount}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
