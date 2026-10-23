import { differenceInHours } from "date-fns";
import type { Booking } from "@/types";

/** Free cancellation ends this long before the travel date (matches the server). */
export const FREE_CANCELLATION_HOURS = 24;

/** The short reference shown to travellers and support. */
export const bookingReference = (id: string) => id.slice(-8).toUpperCase();

/** Whether the traveller can still cancel for free, and until when. */
export function cancellationWindow(booking: Pick<Booking, "status" | "travelDate">) {
    const deadline = new Date(new Date(booking.travelDate).getTime() - FREE_CANCELLATION_HOURS * 36e5);
    const open = (booking.status === "pending" || booking.status === "confirmed")
        && differenceInHours(new Date(booking.travelDate), new Date()) >= FREE_CANCELLATION_HOURS;
    return { open, deadline };
}
