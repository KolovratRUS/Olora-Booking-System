import { format } from "date-fns";
import { getRequestDetail, declineRequestFormAction, cancelRequestFormAction, addAdminNoteFormAction, markAirbnbCheckedFormAction, markAirbnbBlockedFormAction, createAlternativeOfferFormAction, transitionToAwaitingPaymentFormAction, confirmPaymentFormAction } from "./actions";
import { canTransition, getVisibleActions } from "@/lib/services/bookingService";

function statusBadge(_status: string) {
  return `inline-flex rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-800`;
}

function syncBadge(status: string) {
  const map: Record<string, string> = {
    not_checked: "bg-neutral-100 text-neutral-700",
    checked: "bg-blue-100 text-blue-800",
    blocked: "bg-emerald-100 text-emerald-800",
    reopened: "bg-yellow-100 text-yellow-800",
    retained: "bg-purple-100 text-purple-800",
  };

  return map[status] ?? "bg-neutral-100 text-neutral-700";
}

const OFFER_DEV_PATH = "/offers";

export const dynamic = "force-dynamic";

export default async function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getRequestDetail(id);
  const { request, visibleConflicts, spaceBlockingRequests, activeApartments } =
    detail;

  const nights =
    request.checkOut.getTime() > request.checkIn.getTime()
      ? (request.checkOut.getTime() - request.checkIn.getTime()) / (1000 * 60 * 60 * 24)
      : 0;

  const subtotalCents = nights * request.apartment.nightlyPriceCents;

  const airbnbReady = ["checked", "blocked"].includes(request.airbnbSyncStatus);
  const visibleActions = getVisibleActions(request.status);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Booking request {request.reference}</h1>
          <span className={statusBadge(request.status)}>{request.status}</span>
        </div>
        <p className="text-sm text-neutral-600">
          Created {format(request.createdAt, "yyyy-MM-dd HH:mm")} • Updated{" "}
          {format(request.updatedAt, "yyyy-MM-dd HH:mm")}
        </p>
      </header>

      <section className="rounded border bg-white/80 p-4">
        <h2 className="text-lg font-semibold">Guest details</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <p className="text-xs text-neutral-500">Name</p>
            <p className="text-sm font-medium text-neutral-900">
              {request.guest.firstName} {request.guest.lastName}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Email</p>
            <p className="text-sm font-medium text-neutral-900">{request.guest.email}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Phone</p>
            <p className="text-sm font-medium text-neutral-900">{request.guest.phoneNumber ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Apartment</p>
            <p className="text-sm font-medium text-neutral-900">{request.apartment.name}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Dates</p>
            <div className="text-sm font-medium text-neutral-900 space-y-1">
              <div>Check-in: {format(request.checkIn, "dd/MM/yyyy")}</div>
              <div>Check-out: {format(request.checkOut, "dd/MM/yyyy")}</div>
            </div>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Guests</p>
            <p className="text-sm font-medium text-neutral-900">
              {request.numberOfGuests} of {request.apartment.maximumGuests}
            </p>
          </div>
        </div>
        {request.message && (
          <div className="mt-4">
            <p className="text-xs text-neutral-500">Guest message</p>
            <p className="whitespace-pre-line text-sm text-neutral-900">{request.message}</p>
          </div>
        )}
      </section>

      <section className="rounded border bg-white/80 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Airbnb sync</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${syncBadge(request.airbnbSyncStatus)}`}>
            {request.airbnbSyncStatus}
          </span>
        </div>
        <p className="mt-2 text-sm text-neutral-600">
          {airbnbReady
            ? "Admin has marked this request as checked and confirmed for Airbnb availability."
            : "This request needs an admin Airbnb availability check before it can proceed."}
        </p>
      </section>

      <section className="rounded border bg-white/80 p-4">
        <h2 className="text-lg font-semibold">Pricing preview</h2>
        <div className="mt-3 text-sm text-neutral-800">
          <p>Nightly rate: {request.apartment.nightlyPriceCents} cents</p>
          <p>Cleaning fee: {request.apartment.cleaningFeeCents} cents</p>
          <p>Nights: {Math.round(nights)}</p>
          <p>Subtotal: {subtotalCents} cents</p>
        </div>
      </section>

      <section className="rounded border bg-white/80 p-4">
        <h2 className="text-lg font-semibold">Availability checks</h2>
        {visibleConflicts.length > 0 && (
          <p className="mt-2 text-sm text-red-800">
            Warning: {visibleConflicts.length} availability block(s) overlap with these dates.
          </p>
        )}
        {spaceBlockingRequests.length > 0 && (
          <p className="mt-2 text-sm text-neutral-700">
            Additional in-flight booking requests on this apartment: {spaceBlockingRequests.length}
          </p>
        )}
        {visibleConflicts.length === 0 && spaceBlockingRequests.length === 0 && (
          <p className="mt-2 text-sm text-neutral-600">No obvious date conflicts detected from existing data.</p>
        )}
      </section>

      <section className="rounded border bg-white/80 p-4">
        <h2 className="text-lg font-semibold">Offers</h2>
        {request.offers.length === 0 && (
          <p className="mt-2 text-sm text-neutral-600">No offers have been created yet.</p>
        )}
        <ul className="mt-3 space-y-3 text-sm text-neutral-800">
          {request.offers.map((offer) => (
            <li key={offer.id} className="rounded border bg-white p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-900">Offer {offer.token}</h3>
                <span className={statusBadge(offer.status)}>{offer.status}</span>
              </div>
              <p className="mt-2 text-sm text-neutral-700">
                {offer.apartment.name} • Check-in: {format(offer.checkIn, "dd/MM/yyyy")} – Check-out:{" "}
                {format(offer.checkOut, "dd/MM/yyyy")}
              </p>
              <p className="text-sm text-neutral-700">Guests: {offer.numberOfGuests}</p>
              <p className="text-sm text-neutral-700">
                Total: {offer.totalCents} cents (discount: {offer.discountCents} cents)
              </p>
              <p className="text-sm text-neutral-700">Expires: {format(offer.expiresAt, "yyyy-MM-dd HH:mm")}</p>
              <a
                className="mt-2 inline-block text-sm text-blue-700 underline"
                href={`${OFFER_DEV_PATH}/${offer.token}`}
              >
                Open guest offer link
              </a>
            </li>
          ))}
        </ul>
      </section>

      <form action={transitionToAwaitingPaymentFormAction} className="rounded border bg-white/80 p-4 space-y-2">
        <h2 className="text-lg font-semibold">Move to awaiting payment</h2>
        <p className="text-sm text-neutral-600">
          Mark this guest-accepted request as awaiting payment. Requires completed Airbnb check.
        </p>
        <input type="hidden" name="requestId" value={request.id} />
        <label className="block text-sm">
          Note
          <textarea
            name="note"
            className="mt-1 w-full rounded border p-2 text-sm"
            placeholder="Optional note"
          />
        </label>
        <button
          type="submit"
          disabled={!airbnbReady || !canTransition(request.status, "awaiting_payment")}
          className="rounded bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          Move to awaiting payment
        </button>
        {!airbnbReady && (
          <p className="text-xs text-neutral-600">Complete Airbnb status first.</p>
        )}
      </form>

      <form action={confirmPaymentFormAction} className="rounded border bg-white/80 p-4 space-y-2">
        <h2 className="text-lg font-semibold">Confirm payment</h2>
        <p className="text-sm text-neutral-600">
          Finalise the booking once payment is received. Requires completed Airbnb check and awaiting_payment status.
        </p>
        <input type="hidden" name="requestId" value={request.id} />
        <label className="block text-sm">
          Note
          <textarea
            name="note"
            className="mt-1 w-full rounded border p-2 text-sm"
            placeholder="Optional confirmation note"
          />
        </label>
        <button
          type="submit"
          disabled={!airbnbReady || !canTransition(request.status, "confirmed")}
          className="rounded bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          Confirm payment
        </button>
        {!airbnbReady && (
          <p className="text-xs text-neutral-600">Complete Airbnb status first.</p>
        )}
      </form>

      {visibleActions.some((action) => action.type === "alternative_offer") && (
        <form action={createAlternativeOfferFormAction} className="rounded border bg-white/80 p-4 space-y-2">
          <h2 className="text-lg font-semibold">Create alternative offer</h2>
          <p className="text-sm text-neutral-600">Check Airbnb availability before sending an alternative offer.</p>
          <input type="hidden" name="requestId" value={request.id} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <label className="block text-sm">
              Apartment
              <select
                name="apartmentId"
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
                defaultValue={format(request.checkIn, "yyyy-MM-dd")}
              />
            </label>
            <label className="block text-sm">
              Check-out
              <input
                name="checkOut"
                type="date"
                className="mt-1 w-full rounded border p-2 text-sm"
                defaultValue={format(request.checkOut, "yyyy-MM-dd")}
              />
            </label>
            <label className="block text-sm">
              Guests
              <input
                name="numberOfGuests"
                type="number"
                className="mt-1 w-full rounded border p-2 text-sm"
                defaultValue={request.numberOfGuests}
              />
            </label>
            <label className="block text-sm">
              Nightly price (cents)
              <input
                name="nightlyPriceCents"
                type="number"
                className="mt-1 w-full rounded border p-2 text-sm"
                defaultValue={request.apartment.nightlyPriceCents}
              />
            </label>
            <label className="block text-sm">
              Cleaning fee (cents)
              <input
                name="cleaningFeeCents"
                type="number"
                className="mt-1 w-full rounded border p-2 text-sm"
                defaultValue={request.apartment.cleaningFeeCents}
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
          <button
            type="submit"
            disabled={!airbnbReady || !canTransition(request.status, "alternative_offered")}
            className="rounded bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Create alternative offer
          </button>
          {!airbnbReady && (
            <p className="text-xs text-neutral-600">Complete Airbnb status first.</p>
          )}
        </form>
      )}

      {visibleActions.some((action) => action.type === "decline") && (
        <form action={declineRequestFormAction} className="rounded border bg-white/80 p-4 space-y-2">
          <h2 className="text-lg font-semibold">Decline request</h2>
          <input type="hidden" name="requestId" value={request.id} />
          <label className="block text-sm">
            Decline reason
            <textarea
              name="reason"
              className="mt-1 w-full rounded border p-2 text-sm"
              placeholder="Reason for decline"
            />
          </label>
          <button type="submit" className="rounded bg-red-600 px-3 py-2 text-sm text-white">
            Decline
          </button>
        </form>
      )}

      {visibleActions.some((action) => action.type === "cancel") && (
        <form action={cancelRequestFormAction} className="rounded border bg-white/80 p-4 space-y-2">
          <h2 className="text-lg font-semibold">Cancel request</h2>
          <input type="hidden" name="requestId" value={request.id} />
          <label className="block text-sm">
            Cancellation reason
            <textarea
              name="reason"
              className="mt-1 w-full rounded border p-2 text-sm"
              placeholder="Reason for cancellation"
            />
          </label>
          <button type="submit" className="rounded bg-orange-600 px-3 py-2 text-sm text-white">
            Cancel request
          </button>
        </form>
      )}

      <form action={addAdminNoteFormAction} className="rounded border bg-white/80 p-4 space-y-2">
        <h2 className="text-lg font-semibold">Add admin note</h2>
        <input type="hidden" name="requestId" value={request.id} />
        <label className="block text-sm">
          Note
          <textarea
            name="note"
            className="mt-1 w-full rounded border p-2 text-sm"
            placeholder="Add an admin note"
          />
        </label>
        <button type="submit" className="rounded bg-neutral-800 px-3 py-2 text-sm text-white">
          Add note
        </button>
      </form>

      <form action={markAirbnbCheckedFormAction} className="rounded border bg-white/80 p-4 space-y-2">
        <h2 className="text-lg font-semibold">Airbnb check</h2>
        <input type="hidden" name="requestId" value={request.id} />
        <input type="hidden" name="checked" value="true" />
        <button type="submit" className="rounded bg-blue-600 px-3 py-2 text-sm text-white">
          Mark Airbnb checked
        </button>
      </form>

      <form action={markAirbnbBlockedFormAction} className="rounded border bg-white/80 p-4 space-y-2">
        <h2 className="text-lg font-semibold">Airbnb block</h2>
        <input type="hidden" name="requestId" value={request.id} />
        <button type="submit" className="rounded bg-emerald-700 px-3 py-2 text-sm text-white">
          Mark Airbnb blocked
        </button>
      </form>

      <section className="rounded border bg-white/80 p-4">
        <h2 className="text-lg font-semibold">Status history</h2>
        {request.history.length === 0 && (
          <p className="mt-2 text-sm text-neutral-600">
            No status changes have been recorded for this request yet.
          </p>
        )}
        <ol className="mt-3 space-y-2 text-sm text-neutral-800">
          {(request.history as Array<{
            id: string;
            fromStatus?: string | null;
            toStatus: string;
            note?: string | null;
            changedBy?: string | null;
            changedAt: Date;
          }>).map((entry) => (
            <li key={entry.id} className="flex flex-col gap-1">
              <span className="font-semibold">
                {entry.fromStatus ?? "(none)"} → {entry.toStatus}
              </span>
              {entry.note && <span className="text-neutral-600">{entry.note}</span>}
              <span className="text-xs text-neutral-500">
                {entry.changedBy ?? "system"} • {format(entry.changedAt, "yyyy-MM-dd HH:mm")}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded border bg-white/80 p-4">
        <h2 className="text-lg font-semibold">Admin notes</h2>
        {request.adminNotes.length === 0 && (
          <p className="mt-2 text-sm text-neutral-600">No admin notes recorded.</p>
        )}
        <ul className="mt-3 space-y-2 text-sm text-neutral-800">
          {(request.adminNotes as Array<{ id: string; note: string; createdAt: Date }>).map((note) => (
            <li key={note.id}>
              <p>{note.note}</p>
              <p className="text-xs text-neutral-500">{format(note.createdAt, "yyyy-MM-dd HH:mm")}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
