"use client";

import { useActionState } from "react";
import { createAlternativeOfferFormAction } from "./actions";
import type { AdminActionState } from "./actions";

export function CreateAlternativeOfferForm({
  requestId,
  activeApartments,
  defaultCheckIn,
  defaultCheckOut,
  defaultGuests,
  defaultNightlyPriceCents,
  defaultCleaningFeeCents,
}: {
  requestId: string;
  activeApartments: Array<{ id: string; name: string }>;
  defaultCheckIn: string;
  defaultCheckOut: string;
  defaultGuests: number;
  defaultNightlyPriceCents: number;
  defaultCleaningFeeCents: number;
}) {
  const [state, formAction] = useActionState(
    createAlternativeOfferFormAction,
    { status: "idle" } satisfies AdminActionState,
  );

  return (
    <form action={formAction} className="rounded border bg-white/80 p-4 space-y-2">
      <h2 className="text-lg font-semibold">Create alternative offer</h2>
      <p className="text-sm text-neutral-600">Check Airbnb availability before sending an alternative offer.</p>
      <input type="hidden" name="requestId" value={requestId} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <label className="block text-sm">
          Apartment
          <select
            name="apartmentId"
            required
            className="mt-1 w-full rounded border p-2 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              Select an apartment
            </option>
            {activeApartments.map((apartment) => (
              <option key={apartment.id} value={apartment.id}>
                {apartment.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Check-in
          <input
            name="checkIn"
            type="date"
            className="mt-1 w-full rounded border p-2 text-sm"
            defaultValue={defaultCheckIn}
            required
          />
        </label>
        <label className="block text-sm">
          Check-out
          <input
            name="checkOut"
            type="date"
            className="mt-1 w-full rounded border p-2 text-sm"
            defaultValue={defaultCheckOut}
            required
          />
        </label>
        <label className="block text-sm">
          Guests
          <input
            name="numberOfGuests"
            type="number"
            className="mt-1 w-full rounded border p-2 text-sm"
            defaultValue={defaultGuests}
            required
          />
        </label>
        <label className="block text-sm">
          Nightly price (cents)
          <input
            name="nightlyPriceCents"
            type="number"
            className="mt-1 w-full rounded border p-2 text-sm"
            defaultValue={defaultNightlyPriceCents}
            required
          />
        </label>
        <label className="block text-sm">
          Cleaning fee (cents)
          <input
            name="cleaningFeeCents"
            type="number"
            className="mt-1 w-full rounded border p-2 text-sm"
            defaultValue={defaultCleaningFeeCents}
            required
          />
        </label>
        <label className="block text-sm">
          Discount (cents)
          <input
            name="discountCents"
            type="number"
            className="mt-1 w-full rounded border p-2 text-sm"
            defaultValue={0}
          />
        </label>
        <label className="block text-sm">
          Optional message
          <textarea
            name="adminMessage"
            className="mt-1 w-full rounded border p-2 text-sm"
            rows={3}
          />
        </label>
      </div>
      {state.status === "error" && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{state.message}</p>
      )}
      <button type="submit" className="rounded bg-indigo-600 px-3 py-2 text-sm text-white">
        Create alternative offer
      </button>
    </form>
  );
}
