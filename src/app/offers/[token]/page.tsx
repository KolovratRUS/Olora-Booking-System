import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { OfferActionForm } from "./OfferActionForm";

export const dynamic = "force-dynamic";

type OfferPendingViewModel = {
  kind: "pending";
  apartment: { name: string; maximumGuests: number; currency: string };
  requestReference: string;
  dates: { checkIn: string; checkOut: string };
  numberOfGuests: number;
  nightlyPriceCents: number;
  nights: number;
  subtotalCents: number;
  cleaningFeeCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  adminMessage: string;
  expiresAt: string;
  token: string;
  status: "pending";
};

type OfferAcceptedViewModel = {
  kind: "accepted";
};

type OfferDeclinedViewModel = {
  kind: "declined";
};

type OfferExpiredViewModel = {
  kind: "expired";
};

type OfferCancelledViewModel = {
  kind: "cancelled";
};

type OfferNotFoundViewModel = {
  kind: "not_found";
};

type OfferInactiveViewModel = {
  kind: "inactive";
};

type OfferViewModel =
  | OfferPendingViewModel
  | OfferAcceptedViewModel
  | OfferDeclinedViewModel
  | OfferExpiredViewModel
  | OfferCancelledViewModel
  | OfferNotFoundViewModel
  | OfferInactiveViewModel;

const actionMessages: Record<string, string> = {
  accepted:
    "You have already accepted this offer. The host will contact you with the next steps. No payment was taken on this page.",
  declined: "You have already declined this offer.",
  expired: "This offer has expired.",
  cancelled: "This offer has been cancelled.",
  inactive: "This booking request has already moved to the next step.",
};

export default async function OfferPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await loadOffer(token);

  if (data.kind !== "pending") {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <div className="rounded border bg-white p-6">
          <h1 className="text-2xl font-semibold text-neutral-900">Offer</h1>
          <p className="mt-4 text-sm text-neutral-700">
            {actionMessages[data.kind] ??
              "This offer is no longer available."}
          </p>
        </div>
      </main>
    );
  }

  return <OfferView data={data} />;
}

function OfferView({
  data,
}: {
  data: OfferPendingViewModel;
}) {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-4">
          <div className="rounded border bg-white p-4">
            <h1 className="text-2xl font-semibold text-neutral-900">
              {data.apartment.name}
            </h1>
            <p className="text-sm text-neutral-600">
              Reference: {data.requestReference}
            </p>
            <div className="mt-2 text-sm text-neutral-700 space-y-1">
              <p>Check-in: {data.dates.checkIn}</p>
              <p>Check-out: {data.dates.checkOut}</p>
            </div>
            <p className="text-sm text-neutral-700">
              Guests: {data.numberOfGuests}
            </p>
            <p className="text-sm text-neutral-700">
              Nightly rate: {data.nightlyPriceCents} {data.currency}
            </p>
            <p className="text-sm text-neutral-700">Nights: {data.nights}</p>
          </div>

          {data.adminMessage && (
            <div className="rounded border bg-white p-4">
              <h2 className="text-lg font-semibold text-neutral-900">
                Message from us
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm text-neutral-700">
                {data.adminMessage}
              </p>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="rounded border bg-white p-4">
            <h2 className="text-lg font-semibold text-neutral-900">
              Price summary
            </h2>
            <div className="mt-3 space-y-2 text-sm text-neutral-800">
              <div className="flex justify-between">
                <span>Nightly rate</span>
                <span>
                  {data.nightlyPriceCents} {data.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Nights</span>
                <span>{data.nights}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>
                  {data.subtotalCents} {data.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Cleaning fee</span>
                <span>
                  {data.cleaningFeeCents} {data.currency}
                </span>
              </div>
              {data.discountCents > 0 && (
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>
                    -{data.discountCents} {data.currency}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax</span>
                <span>
                  {data.taxCents} {data.currency}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-semibold">
                <span>Total</span>
                <span>
                  {data.totalCents} {data.currency}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded border bg-white p-4">
            <p className="text-sm text-neutral-700">
              This offer expires on {data.expiresAt}.
            </p>
            <p className="mt-2 text-xs text-neutral-600">
              Accepting does not yet begin payment. Dates will be confirmed after
              the admin completes the next step.
            </p>
          </div>

          <OfferActionForm token={data.token} />
        </section>
      </div>
    </main>
  );
}

async function loadOffer(token: string): Promise<OfferViewModel> {
  const offer = await prisma.bookingOffer.findUnique({
    where: { token },
    include: {
      bookingRequest: { include: { apartment: true } },
      apartment: true,
    },
  });

  if (!offer) {
    return { kind: "not_found" };
  }

  if (offer.status === "cancelled") {
    return { kind: "cancelled" };
  }

  if (offer.status === "accepted") {
    return { kind: "accepted" };
  }

  if (offer.status === "declined") {
    return { kind: "declined" };
  }

  if (offer.status === "expired" || isExpired(offer.expiresAt)) {
    return { kind: "expired" };
  }

  const request = offer.bookingRequest;

  if (
    !canTransition(request.status, "guest_accepted") &&
    request.status !== "alternative_offered"
  ) {
    return { kind: "inactive" };
  }

  const nights = Math.round(
    (offer.checkOut.getTime() - offer.checkIn.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  return {
    kind: "pending",
    apartment: {
      name: offer.apartment.name,
      maximumGuests: offer.apartment.maximumGuests,
      currency: offer.apartment.currency,
    },
    requestReference: request.reference,
    dates: {
      checkIn: format(new Date(offer.checkIn), "dd/MM/yyyy"),
      checkOut: format(new Date(offer.checkOut), "dd/MM/yyyy"),
    },
    numberOfGuests: offer.numberOfGuests,
    nightlyPriceCents: offer.nightlyPriceCents,
    nights,
    subtotalCents: nights * offer.nightlyPriceCents,
    cleaningFeeCents: offer.cleaningFeeCents,
    discountCents: offer.discountCents,
    taxCents: offer.taxCents,
    totalCents: offer.totalCents,
    currency: offer.apartment.currency,
    adminMessage: offer.adminMessage ?? "",
    expiresAt: format(new Date(offer.expiresAt), "dd/MM/yyyy HH:mm"),
    token: offer.token,
    status: "pending",
  };
}

function isExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() < Date.now();
}

function canTransition(from: string, to: string): boolean {
  const allowedTransitions: Record<string, string[]> = {
    pending_review: ["alternative_offered", "guest_accepted", "declined", "cancelled"],
    alternative_offered: ["guest_countered", "guest_accepted", "declined", "expired", "cancelled"],
    guest_countered: ["alternative_offered", "guest_accepted", "declined", "expired", "cancelled"],
    guest_accepted: ["awaiting_payment", "cancelled"],
    awaiting_payment: ["confirmed", "expired", "cancelled"],
    confirmed: ["cancelled"],
    declined: [],
    expired: [],
    cancelled: [],
  };
  return allowedTransitions[from]?.includes(to) ?? false;
}
