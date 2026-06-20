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

export default function BookingRequestForm({ apartmentId }: { apartmentId: string }) {
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { phoneNumber: "", message: "" },
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
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <input className="rounded border px-3 py-2" placeholder="First name" {...register("firstName")} />
        <input className="rounded border px-3 py-2" placeholder="Last name" {...register("lastName")} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <input className="rounded border px-3 py-2" type="email" placeholder="Email" {...register("email")} />
        <input className="rounded border px-3 py-2" placeholder="Phone" {...register("phoneNumber")} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <input className="rounded border px-3 py-2" type="number" min={1} placeholder="Guests" {...register("numberGuests")} />
        <input className="rounded border px-3 py-2" type="date" {...register("checkIn")} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <input className="rounded border px-3 py-2" type="date" {...register("checkOut")} />
        <textarea className="rounded border px-3 py-2" placeholder="Special requests" {...register("message")} />
      </div>
      <button disabled={formState.isSubmitting} type="submit" className="rounded bg-blue-600 px-4 py-2 text-sm text-white">
        Submit booking request
      </button>
      {submitted && <p className="text-sm text-green-600">Request submitted. Ref: {submitted}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-neutral-500">
        A booking request is not confirmed until Olora approves the dates and payment is completed.
      </p>
    </form>
  );
}
