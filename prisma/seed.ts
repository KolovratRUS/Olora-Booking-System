import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const amenities = [
    { name: "Fast Wi-Fi" },
    { name: "Air Conditioning" },
    { name: "Kitchen" },
    { name: "Washer" },
    { name: "TV" },
    { name: "Coffee Machine" },
    { name: "Balcony" },
    { name: "Terrace" },
    { name: "Garden View" },
    { name: "Parking" },
  ];
  const amenityRecords = await Promise.all(
    amenities.map((a) => prisma.amenity.upsert({ where: { name: a.name }, update: {}, create: a }))
  );
  const byName = new Map(amenityRecords.map((r) => [r.name, r.id]));
  const apartments = [
    {
      name: "Olora Studio", slug: "olora-studio", maximumGuests: 2, bedrooms: 1, beds: 1, bathrooms: 1,
      nightlyPriceCents: 8500, cleaningFeeCents: 3000,
      shortDescription: "Cozy studio with city vibe.", fullDescription: "Compact, modern, and efficient.",
      amenities: ["Fast Wi-Fi", "Air Conditioning", "TV", "Coffee Machine"],
    },
    {
      name: "Olora Garden Suite", slug: "olora-garden-suite", maximumGuests: 3, bedrooms: 1, beds: 2, bathrooms: 1,
      nightlyPriceCents: 10000, cleaningFeeCents: 3500,
      shortDescription: "Peaceful garden suite with natural light.",
      fullDescription: "Warm and airy retreat near the garden.",
      amenities: ["Fast Wi-Fi", "Air Conditioning", "Kitchen", "Garden View", "Coffee Machine"],
    },
    {
      name: "Olora Terrace Apartment", slug: "olora-terrace-apartment", maximumGuests: 4, bedrooms: 2, beds: 3, bathrooms: 1,
      nightlyPriceCents: 13500, cleaningFeeCents: 4000,
      shortDescription: "Bright apartment with terrace sunsets.",
      fullDescription: "A welcoming home with terrace access.",
      amenities: ["Fast Wi-Fi", "Air Conditioning", "Kitchen", "Terrace", "TV", "Coffee Machine"],
    },
    {
      name: "Olora Family Residence", slug: "olora-family-residence", maximumGuests: 5, bedrooms: 2, beds: 4, bathrooms: 2,
      nightlyPriceCents: 16000, cleaningFeeCents: 5000,
      shortDescription: "Spacious residence for families.",
      fullDescription: "Room to spread out while staying close to everything.",
      amenities: ["Fast Wi-Fi", "Air Conditioning", "Kitchen", "Washer", "TV", "Coffee Machine", "Parking"],
    },
    {
      name: "Olora Courtyard Loft", slug: "olora-courtyard-loft", maximumGuests: 4, bedrooms: 2, beds: 3, bathrooms: 2,
      nightlyPriceCents: 15000, cleaningFeeCents: 4500,
      shortDescription: "Industrial loft with open-plan living.",
      fullDescription: "Stylish loft opening onto a private courtyard.",
      amenities: ["Fast Wi-Fi", "Air Conditioning", "Kitchen", "Balcony", "TV", "Coffee Machine"],
    },
    {
      name: "Olora Penthouse", slug: "olora-penthouse", maximumGuests: 6, bedrooms: 3, beds: 4, bathrooms: 3,
      nightlyPriceCents: 22000, cleaningFeeCents: 7000,
      shortDescription: "Top-floor penthouse with panoramic views.",
      fullDescription: "The crown jewel of Olora with sweeping views.",
      amenities: ["Fast Wi-Fi", "Air Conditioning", "Kitchen", "Washer", "TV", "Coffee Machine", "Parking", "Balcony", "Terrace"],
    },
  ];
  for (const a of apartments) {
    const created = await prisma.apartment.upsert({ where: { slug: a.slug }, update: {}, create: {
      name: a.name, slug: a.slug, maximumGuests: a.maximumGuests, bedrooms: a.bedrooms, beds: a.beds, bathrooms: a.bathrooms,
      nightlyPriceCents: a.nightlyPriceCents, cleaningFeeCents: a.cleaningFeeCents,
      shortDescription: a.shortDescription, fullDescription: a.fullDescription,
      amenities: { create: a.amenities.map((name, idx) => ({ amenityId: byName.get(name)!, order: idx })) },
    }});
    console.log("apartment", created.name);
  }
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => prisma.$disconnect());
