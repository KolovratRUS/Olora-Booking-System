import { format } from "date-fns";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type BlockRow = {
  id: string;
  blockStart: Date;
  blockEnd: Date;
  source: string;
  apartment: { name: string };
};

export default async function AdminCalendarPage() {
  const rows = (await prisma.availabilityBlock.findMany({
    include: { apartment: true },
    orderBy: { blockStart: "asc" },
    take: 50,
  })) as BlockRow[];

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Calendar</h1>
      <ul className="grid gap-2 text-sm text-neutral-600">
        {rows.length === 0 && <li className="text-neutral-500">No availability blocks yet.</li>}
        {rows.map((block) => (
          <li key={block.id} className="rounded border bg-white/80 p-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="font-semibold">{block.apartment.name}</span>
              <span className="text-neutral-600">Check-in: {format(block.blockStart, "dd/MM/yyyy")}</span>
              <span className="text-neutral-600">Check-out: {format(block.blockEnd, "dd/MM/yyyy")}</span>
              <span className="text-neutral-600">• {block.source}</span>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
