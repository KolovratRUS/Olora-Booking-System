import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const blocks = await prisma.availabilityBlock.findMany({
    include: { apartment: true },
    orderBy: { blockStart: "asc" },
    take: 40,
  });
  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <h1 className="text-3xl font-semibold">Calendar</h1>
      <div className="space-y-2">
        {blocks.length === 0 && <p className="text-sm text-neutral-500">No availability blocks yet.</p>}
        {blocks.map((block) => (
          <div key={block.id} className="rounded border bg-white/80 p-3 text-sm">
            <span className="font-semibold">{block.apartment.name}</span>
            <span className="ml-2 text-neutral-600">
              {block.blockStart.toISOString().slice(0, 10)} - {block.blockEnd.toISOString().slice(0, 10)} • {block.source}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
