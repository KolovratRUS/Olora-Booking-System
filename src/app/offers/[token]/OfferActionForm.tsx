"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { acceptOfferAction, declineOfferAction, type GuestActionState } from "./actions";

function OfferActionForm({ token }: { token: string }) {
  const router = useRouter();
  const [acceptedState, acceptFormAction, accepting] = useActionState(
    acceptOfferAction,
    { status: "idle" } as GuestActionState
  );
  const [declinedState, declineFormAction, declining] = useActionState(
    declineOfferAction,
    { status: "idle" } as GuestActionState
  );

  useEffect(() => {
    if (declinedState.status === "success") {
      router.refresh();
    }
  }, [declinedState, router]);

  const renderStatus = () => {
    if (acceptedState.status === "success") {
      return (
        <div className="rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">Offer accepted — thank you.</p>
          <p className="mt-1">
            Your response has been received. The host will review the booking
            and contact you with the next steps. No payment was taken on this
            page.
          </p>
        </div>
      );
    }

    if (acceptedState.status === "error") {
      return (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {acceptedState.message}
        </p>
      );
    }

    if (declinedState.status === "error") {
      return (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {declinedState.message}
        </p>
      );
    }

    return null;
  };

  const reusableButtonBase =
    "w-full rounded px-3 py-2 text-sm text-white disabled:opacity-50";

  const hideActions = acceptedState.status === "success";

  return (
    <div className="space-y-3">
      {renderStatus()}
      {!hideActions && (
        <>
          <form action={acceptFormAction} className="space-y-2">
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              disabled={accepting}
              className={`${reusableButtonBase} bg-emerald-600`}
            >
              Accept offer
            </button>
          </form>
          <form action={declineFormAction} className="space-y-2">
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              disabled={declining}
              className={`${reusableButtonBase} bg-red-600`}
            >
              Decline offer
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export { OfferActionForm };
