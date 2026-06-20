"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type BookingSelectorProps = {
  apartmentSlug: string;
  maximumGuests: number;
  nightlyPriceCents?: number | null;
  currency?: string;
};

function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export default function BookingSelector({
  apartmentSlug,
  maximumGuests,
  nightlyPriceCents,
  currency = "USD",
}: BookingSelectorProps) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validate = () => {
    setError(null);

    const inDate = checkIn ? new Date(checkIn) : null;
    const outDate = checkOut ? new Date(checkOut) : null;
    const guestCount = guests ? parseInt(guests, 10) : NaN;

    if (!checkIn || !checkOut) {
      setError("Please select check-in and check-out dates.");
      return;
    }

    if (!inDate || Number.isNaN(inDate.getTime())) {
      setError("Please enter a valid check-in date.");
      return;
    }

    if (!outDate || Number.isNaN(outDate.getTime())) {
      setError("Please enter a valid check-out date.");
      return;
    }

    if (outDate.getTime() <= inDate.getTime()) {
      setError("Check-out must be after check-in.");
      return;
    }

    if (Number.isNaN(guestCount) || guestCount < 1) {
      setError("Guest count must be at least 1.");
      return;
    }

    if (guestCount > maximumGuests) {
      setError(`This apartment accommodates up to ${maximumGuests} guests.`);
      return;
    }

    const params = new URLSearchParams({
      checkIn,
      checkOut,
      guests: String(guestCount),
    });

    router.push(`/apartments/${apartmentSlug}/request?${params.toString()}`);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs text-[var(--olora-muted)]">Nightly</p>
        {nightlyPriceCents != null ? (
          <p className="text-2xl font-semibold text-[var(--olora-text)]">
            {formatMoney(nightlyPriceCents, currency)}
          </p>
        ) : null}
        <p className="text-xs text-[var(--olora-muted)]">Total shown after request approval</p>
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-[var(--olora-text)]">Request to book</h3>
        <p className="text-xs text-[var(--olora-muted)]">
          This is not an instant booking. Your request will be reviewed and then payment will be completed.
        </p>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--olora-muted)]" htmlFor="selector-checkin">
              Check-in
            </label>
            <input
              id="selector-checkin"
              type="date"
              className="h-9 rounded-lg border border-[var(--olora-border)] bg-white px-2.5 text-sm outline-none focus:border-[var(--olora-accent)]"
              value={checkIn}
              onChange={(event) => setCheckIn(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--olora-muted)]" htmlFor="selector-checkout">
              Check-out
            </label>
            <input
              id="selector-checkout"
              type="date"
              className="h-9 rounded-lg border border-[var(--olora-border)] bg-white px-2.5 text-sm outline-none focus:border-[var(--olora-accent)]"
              value={checkOut}
              onChange={(event) => setCheckOut(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--olora-muted)]" htmlFor="selector-guests">
            Guests
          </label>
          <select
            id="selector-guests"
            className="h-9 w-full rounded-lg border border-[var(--olora-border)] bg-white px-2.5 text-sm outline-none focus:border-[var(--olora-accent)]"
            value={guests}
            onChange={(event) => setGuests(event.target.value)}
          >
            <option value="">Select guests</option>
            {Array.from({ length: maximumGuests }, (_, idx) => idx + 1).map((count) => (
              <option key={count} value={count}>
                {count} guest{count === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={validate}
          className="h-10 w-full rounded-lg bg-[var(--olora-accent)] text-sm font-semibold text-white transition hover:bg-[var(--olora-accent-hover)]"
        >
          Request to book
        </button>

        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
