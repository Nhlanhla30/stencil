"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBookingRequest, getBooking, markDepositPaid, performArtistAction } from "@/lib/store";
import type { ArtistAction } from "@/lib/types";

/* Client submits the booking form on an artist's public page */
export async function submitBookingRequest(formData: FormData) {
  const artistSlug = String(formData.get("artistSlug") || "");
  const booking = await createBookingRequest({
    artistSlug,
    client: {
      name: String(formData.get("name") || "").slice(0, 120),
      email: String(formData.get("email") || "").slice(0, 200),
      phone: String(formData.get("phone") || "").slice(0, 30),
    },
    type: String(formData.get("type") || "Custom piece"),
    size: String(formData.get("size") || "Medium"),
    placement: String(formData.get("placement") || "").slice(0, 60),
    preferredSlot: String(formData.get("preferredSlot") || "").slice(0, 120),
    brief: String(formData.get("brief") || "").slice(0, 4000),
  });
  redirect(`/b/${booking.id}`);
}

/* Artist acts on a booking from the dashboard */
export async function dashboardAction(formData: FormData) {
  const bookingId = String(formData.get("bookingId") || "");
  const action = String(formData.get("action") || "") as ArtistAction;
  await performArtistAction(bookingId, action);
  revalidatePath("/dashboard");
  revalidatePath(`/b/${bookingId}`);
}

/* Simulated checkout: client "pays" the deposit */
export async function simulatePayDeposit(formData: FormData) {
  const bookingId = String(formData.get("bookingId") || "");
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  await markDepositPaid(bookingId);
  revalidatePath("/dashboard");
  redirect(`/b/${bookingId}?paid=1`);
}
