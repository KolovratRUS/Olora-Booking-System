import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Olora",
  description: "Direct booking for Olora apartments",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <nav>
            <Link href="/">Home</Link>{" "}
            <Link href="/apartments">Apartments</Link>{" "}
            <Link href="/requests">Requests</Link>{" "}
            <Link href="/bookings">Bookings</Link>{" "}
            <Link href="/calendar">Calendar</Link>{" "}
            <Link href="/admin">Admin</Link>
          </nav>
        </header>
        {children}
        <footer>Olora booking MVP</footer>
      </body>
    </html>
  );
}
