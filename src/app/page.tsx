import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      <h1>Olora</h1>
      <Link href="/apartments">Browse apartments</Link>
    </div>
  );
}
