import crypto from "node:crypto";

export const TAX_RATE = 0;
export const CLEANING_FEE_CENTS = 3000;

export function calculateTotal(nightlyCents: number, nights: number) {
  const subtotal = nightlyCents * nights;
  return subtotal + CLEANING_FEE_CENTS;
}

export { calculatePrice } from "@/lib/services/bookingService";

export function randomToken() {
  return crypto.randomBytes(24).toString("hex");
}
