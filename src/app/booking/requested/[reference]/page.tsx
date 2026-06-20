export default async function BookingRequestedPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;

  return <p className="p-6">Placeholder booking requested page for reference: {reference}</p>;
}
