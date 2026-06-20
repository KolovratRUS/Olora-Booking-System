import { prisma } from "@/lib/prisma";
import BookingRequestForm from "@/app/booking/request-form";

export const dynamic = "force-dynamic";

export default async function ApartmentDetailPage({ params }: { params: { slug: string } }) {
  const apartment = await prisma.apartment.findUnique({
    where: { slug: params.slug },
    include: { amenities: { include: { amenity: true } } },
  });
  if (!apartment) return <p className="p-6">Apartment not found.</p>;

  return (
    <section className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-3xl font-semibold">{apartment.name}</h1>
      <p className="whitespace-pre-line text-neutral-700">{apartment.fullDescription}</p>
      <BookingRequestForm apartmentId={apartment.id} />
    </section>
  );
}
