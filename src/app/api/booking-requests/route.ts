import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { calculatePrice, randomToken } from "@/lib/services/pricing";

const schema = z.object({
  apartmentId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phoneNumber: z.string().optional().nullable(),
  numberOfGuests: z.coerce.number().int().positive(),
  checkIn: z.coerce.date(),
  checkOut: z.coerce.date(),
  guestMessage: z.string().optional().default(""),
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    return NextResponse.json({ error: `Invalid booking request payload: ${issues}` }, { status: 400 });
  }

  const { apartmentId, firstName, lastName, email, phoneNumber, numberOfGuests, checkIn, checkOut, guestMessage } = parsed.data;

  const apartment = await prisma.apartment.findUnique({ where: { id: apartmentId } });
  if (!apartment) {
    return NextResponse.json({ error: "Apartment not found" }, { status: 404 });
  }
  if (numberOfGuests > apartment.maximumGuests) {
    return NextResponse.json({ error: "Too many guests for selected apartment" }, { status: 400 });
  }
  if (checkOut <= checkIn) {
    return NextResponse.json({ error: "Check-out must be after check-in" }, { status: 400 });
  }
  if (checkIn.getTime() < Date.now()) {
    return NextResponse.json({ error: "Check-in date cannot be in the past" }, { status: 400 });
  }

  const pricing = calculatePrice({
    nightlyPriceCents: apartment.nightlyPriceCents,
    checkIn,
    checkOut,
    cleaningFeeCents: apartment.cleaningFeeCents,
  });

  const result = await prisma.$transaction(async (tx) => {
    const guest = await tx.guest.upsert({
      where: { email },
      update: { firstName, lastName, phoneNumber: phoneNumber ?? undefined },
      create: { firstName, lastName, email, phoneNumber: phoneNumber ?? undefined },
    });

    const bookingRequest = await tx.bookingRequest.create({
      data: {
        apartmentId,
        guestId: guest.id,
        numberOfGuests,
        checkIn,
        checkOut,
        message: guestMessage,
        reference: randomToken(),
      },
    });

    await tx.availabilityBlock.create({
      data: {
        apartmentId,
        blockStart: checkIn,
        blockEnd: checkOut,
        source: "direct_request",
        refId: bookingRequest.reference,
        note: "New direct request",
      },
    });

    return { bookingRequest, guest };
  });

  return NextResponse.json(
    {
      id: result.bookingRequest.id,
      reference: result.bookingRequest.reference,
      totalCents: pricing.totalCents,
      nights: pricing.nights,
    },
    { status: 201 }
  );
}
