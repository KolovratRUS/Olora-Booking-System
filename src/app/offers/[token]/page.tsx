export default async function OfferPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <p className="p-6">Placeholder offer page for token: {token}</p>;
}
