export default async function PaymentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <p className="p-6">Placeholder payment page for token: {token}</p>;
}
