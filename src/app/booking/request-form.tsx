"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email(),
  phoneNumber: z.string().optional().default(""),
  numberGuests: z.coerce.number().int().min(1),
  checkIn: z.string().min(1, "Required"),
  checkOut: z.string().min(1, "Required"),
  message: z.string().optional().default(""),
});

export type FormValues = z.infer<typeof schema>;

type BookingRequestFormProps = {
  apartmentId: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
};

export default function BookingRequestForm({
  apartmentId,
  initialCheckIn,
  initialCheckOut,
  initialGuests,
}: BookingRequestFormProps) {
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      phoneNumber: "",
      message: "",
      checkIn: initialCheckIn ?? "",
      checkOut: initialCheckOut ?? "",
      numberGuests: initialGuests ?? 1,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSubmitted(null);
    const checkIn = new Date(values.checkIn);
    const checkOut = new Date(values.checkOut);
    const response = await fetch("/api/booking-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apartmentId,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phoneNumber: values.phoneNumber || null,
        numberOfGuests: values.numberGuests,
        checkIn,
        checkOut,
        guestMessage: values.message,
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error || "Failed to submit request");
      return;
    }
    const payload = (await response.json()) as { reference: string };
    setSubmitted(payload.reference);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-[var(--olora-muted)]" htmlFor="firstName">
            First name
          </label>
          <input
            id="firstName"
            className="h-10 rounded-lg border border-[var(--olora-border)] bg-white px-3 text-sm outline-none focus:border-[var(--olora-accent)]"
            placeholder="First name"
            {...register("firstName")}
          />
          {errors.firstName ? <p className="text-xs text-red-600">{errors.firstName.message}</p> : null}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-[var(--olora-muted)]" htmlFor="lastName">
            Last name
          </label>
          <input
            id="lastName"
            className="h-10 rounded-lg border border-[var(--olora-border)] bg-white px-3 text-sm outline-none focus:border-[var(--olora-accent)]"
            placeholder="Last name"
            {...register("lastName")}
          />
          {errors.lastName ? <p className="text-xs text-red-600">{errors.lastName.message}</p> : null}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-[var(--olora-muted)]" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="h-10 rounded-lg border border-[var(--olora-border)] bg-white px-3 text-sm outline-none focus:border-[var(--olora-accent)]"
            type="email"
            placeholder="Email"
            {...register("email")}
          />
          {errors.email ? <p className="text-xs text-red-600">{errors.email.message}</p> : null}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-[var(--olora-muted)]" htmlFor="phoneNumber">
            Phone
          </label>
          <input
            id="phoneNumber"
            className="h-10 rounded-lg border border-[var(--olora-border)] bg-white px-3 text-sm outline-none focus:border-[var(--olora-accent)]"
            placeholder="Phone"
            {...register("phoneNumber")}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-[var(--olora-muted)]" htmlFor="numberGuests">
            Guests
          </label>
          <input
            id="numberGuests"
            className="h-10 rounded-lg border border-[var(--olora-border)] bg-white px-3 text-sm outline-none focus:border-[var(--olora-accent)]"
            type="number"
            min={1}
            placeholder="Guests"
            {...register("numberGuests")}
          />
          {errors.numberGuests ? <p className="text-xs text-red-600">{errors.numberGuests.message}</p> : null}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-[var(--olora-muted)]" htmlFor="checkIn">
            Check-in
          </label>
          <input
            id="checkIn"
            className="h-10 rounded-lg border border-[var(--olora-border)] bg-white px-3 text-sm outline-none focus:border-[var(--olora-accent)]"
            type="date"
            {...register("checkIn")}
          />
          {errors.checkIn ? <p className="text-xs text-red-600">{errors.checkIn.message}</p> : null}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-[var(--olora-muted)]" htmlFor="checkOut">
            Check-out
          </label>
          <input
            id="checkOut"
            className="h-10 rounded-lg border border-[var(--olora-border)] bg-white px-3 text-sm outline-none focus:border-[var(--olora-accent)]"
            type="date"
            {...register("checkOut")}
          />
          {errors.checkOut ? <p className="text-xs text-red-600">{errors.checkOut.message}</p> : null}
        </div>
        <div className="md:col-span-1 flex flex-col justify-end">
          <div className="space-y-1">
            <label className="text-sm font-medium text-[var(--olora-muted)]" htmlFor="message">
              Special requests
            </label>
            <textarea
              id="message"
              className="h-28 rounded-lg border border-[var(--olora-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--olora-accent)]"
              placeholder="Any special requests or notes"
              {...register("message")}
            />
          </div>
        </div>
      </div>
      <button
        disabled={isSubmitting}
        type="submit"
        className="h-10 w-full rounded-lg bg-[var(--olora-accent)] text-sm font-semibold text-white transition hover:bg-[var(--olora-accent-hover)] disabled:opacity-60"
      >
        {isSubmitting ? "Submitting…" : "Submit booking request"}
      </button>
      {submitted && <p className="text-sm text-green-700">Request submitted. Ref: {submitted}</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <p className="text-xs text-[var(--olora-muted)]">
        A booking request is not confirmed until Olora approves the dates and payment is completed.
      </p>
    </form>
  );
}
