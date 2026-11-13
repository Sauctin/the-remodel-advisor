import { randomUUID } from "node:crypto";
import {
  findAvailability,
  formatLocalDate,
  isSameOrigin,
  jsonResponse,
  methodNotAllowed,
  parseJsonBody,
  publicError,
  SquareError,
  squareRequest,
  SERVICES,
  SQUARE_LOCATION_ID,
  SQUARE_TIME_ZONE,
} from "../lib/square.mjs";
import { checkServiceArea, serviceAreaMessage } from "../lib/service-area.mjs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9().\-\s]{9,24}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function validAddress(value) {
  if (!value || typeof value !== "object") return null;
  const address = {
    address_line_1: cleanText(value.line1, 120),
    address_line_2: cleanText(value.line2, 120),
    locality: cleanText(value.city, 80),
    administrative_district_level_1: cleanText(value.state, 2).toUpperCase(),
    postal_code: cleanText(value.postalCode, 12),
    country: "US",
  };
  if (!address.address_line_1 || !address.locality || !/^[A-Z]{2}$/.test(address.administrative_district_level_1)
      || !/^\d{5}(?:-\d{4})?$/.test(address.postal_code)) {
    return null;
  }
  if (!address.address_line_2) delete address.address_line_2;
  return address;
}

export function validateRequest(input) {
  if (!input || typeof input !== "object") throw new SquareError("Complete the booking form and try again.", 400);
  const service = SERVICES[input.serviceId];
  const givenName = cleanText(input.givenName, 100);
  const familyName = cleanText(input.familyName, 100);
  const email = cleanText(input.email, 254).toLowerCase();
  const phone = cleanText(input.phone, 24);
  const sourceId = cleanText(input.sourceId, 200);
  const idempotencyKey = cleanText(input.idempotencyKey, 64);
  const locationType = input.locationType;
  const startAt = cleanText(input.startAt, 40);

  if (!service || !givenName || !familyName || !EMAIL_PATTERN.test(email)
      || !PHONE_PATTERN.test(phone) || !sourceId || !UUID_PATTERN.test(idempotencyKey)
      || !Number.isFinite(Date.parse(startAt))
      || !["CUSTOMER_LOCATION", "VIDEO_CONFERENCE"].includes(locationType)) {
    throw new SquareError("Check your booking details and try again.", 400);
  }
  const address = locationType === "CUSTOMER_LOCATION" ? validAddress(input.address) : null;
  if (locationType === "CUSTOMER_LOCATION" && !address) {
    throw new SquareError("Enter a complete service address, including its ZIP code.", 400);
  }
  // Quick guard; the distance check itself runs in the handler (it needs a network lookup).
  if (address && !["OH", "KY"].includes(address.administrative_district_level_1)) {
    throw new SquareError("At-home appointments are limited to within 25 miles of ZIP code 45150. Choose a video call, or call (513) 409-1625 if you're near the edge.", 400);
  }

  return {
    service,
    givenName,
    familyName,
    email,
    phone,
    sourceId,
    idempotencyKey,
    locationType,
    address,
    startAt: new Date(startAt).toISOString(),
    teamMemberId: cleanText(input.teamMemberId, 64),
    serviceVariationVersion: Number(input.serviceVariationVersion),
  };
}

async function cancelBooking(booking, idempotencyKey) {
  if (!booking?.id) return false;
  try {
    await squareRequest(`/v2/bookings/${encodeURIComponent(booking.id)}/cancel`, {
      body: {
        booking_version: booking.version,
        idempotency_key: `${idempotencyKey}-cancel`,
      },
    });
    return true;
  } catch (error) {
    const codes = error instanceof SquareError ? error.codes : [];
    console.error("Could not release booking after payment failure", { codes });
    return false;
  }
}

export default async function handler(request) {
  if (request.method !== "POST") return methodNotAllowed("POST");
  if (!isSameOrigin(request)) return jsonResponse(403, { error: "This booking request isn't allowed." });

  let booking;
  let input;
  try {
    input = validateRequest(await parseJsonBody(request));
    if (input.address) {
      const area = await checkServiceArea(input.address);
      if (!area.within) return jsonResponse(400, { error: serviceAreaMessage(area) });
    }
    if (Date.parse(input.startAt) < Date.now() + 24 * 60 * 60 * 1000) {
      return jsonResponse(409, { error: "That time no longer meets the 24-hour booking notice. Choose another time." });
    }

    // Square only accepts search windows of 24 hours to 32 days, so search the
    // day starting just before the chosen time and match that exact slot below.
    const windowStart = Date.parse(input.startAt) - 60 * 1000;
    const availabilities = await findAvailability(
      input.service,
      new Date(windowStart).toISOString(),
      new Date(windowStart + 24 * 60 * 60 * 1000).toISOString(),
    );
    const slot = availabilities.find((availability) =>
      Date.parse(availability.start_at) === Date.parse(input.startAt)
      && (availability.appointment_segments || []).some((segment) =>
        segment.team_member_id === input.teamMemberId
        && segment.service_variation_id === input.service.variationId
        && Number(segment.service_variation_version) === input.serviceVariationVersion
        && Number(segment.duration_minutes) === input.service.durationMinutes
      ),
    );
    const segment = slot?.appointment_segments?.find((item) =>
      item.team_member_id === input.teamMemberId
      && item.service_variation_id === input.service.variationId
      && Number(item.service_variation_version) === input.serviceVariationVersion
      && Number(item.duration_minutes) === input.service.durationMinutes,
    );
    if (!slot || !segment) {
      return jsonResponse(409, { error: "That time was just booked. Choose another available time." });
    }

    const customerResult = await squareRequest("/v2/customers", {
      body: {
        idempotency_key: `${input.idempotencyKey}-customer`,
        given_name: input.givenName,
        family_name: input.familyName,
        email_address: input.email,
        phone_number: input.phone,
        ...(input.address ? { address: input.address } : {}),
      },
    });
    if (!customerResult.customer?.id) {
      throw new SquareError("Square couldn't create the customer record. Please try again.", 502);
    }

    const customerNote = input.locationType === "VIDEO_CONFERENCE"
      ? "Booked through askremodel.com as a video consultation."
      : "Booked through askremodel.com at the customer's location.";
    const bookingResult = await squareRequest("/v2/bookings", {
      body: {
        idempotency_key: `${input.idempotencyKey}-booking`,
        booking: {
          start_at: slot.start_at,
          location_id: SQUARE_LOCATION_ID,
          // Square's booking location types are business, customer, or phone (no video),
          // so video calls leave it unset; the customer note records "video consultation".
          ...(input.locationType === "CUSTOMER_LOCATION" ? { location_type: "CUSTOMER_LOCATION" } : {}),
          ...(input.address ? { address: input.address } : {}),
          customer_id: customerResult.customer.id,
          customer_note: customerNote,
          appointment_segments: [{
            duration_minutes: segment.duration_minutes,
            service_variation_id: segment.service_variation_id,
            service_variation_version: segment.service_variation_version,
            team_member_id: segment.team_member_id,
          }],
        },
      },
    });
    booking = bookingResult.booking;
    if (!booking?.id) throw new SquareError("Square couldn't confirm the appointment. Please try again.", 502);

    let paymentResult;
    try {
      paymentResult = await squareRequest("/v2/payments", {
        body: {
          source_id: input.sourceId,
          idempotency_key: `${input.idempotencyKey}-payment`,
          amount_money: { amount: input.service.priceCents, currency: "USD" },
          location_id: SQUARE_LOCATION_ID,
          customer_id: customerResult.customer.id,
          buyer_email_address: input.email,
          reference_id: booking.id.slice(0, 40),
          note: `${input.service.name} appointment`,
          autocomplete: true,
        },
      });
    } catch (error) {
      if (error instanceof SquareError && error.uncertain) {
        return jsonResponse(503, {
          error: "We couldn't confirm the payment status. Don't submit again; call (513) 409-1625 so we can verify it.",
          pending: true,
        });
      }
      const released = await cancelBooking(booking, input.idempotencyKey);
      return jsonResponse(402, {
        error: released
          ? "Payment wasn't accepted and no charge was completed. Check your card details or use another card."
          : "Payment wasn't accepted. Please call (513) 409-1625 before trying again so we can check the appointment.",
        retryable: released,
        pending: !released,
      });
    }

    if (paymentResult.payment?.status !== "COMPLETED") {
      return jsonResponse(202, {
        error: "The payment is still processing. Don't submit again; call (513) 409-1625 so we can verify your appointment.",
        pending: true,
      });
    }

    return jsonResponse(200, {
      bookingId: booking.id,
      startAt: booking.start_at || slot.start_at,
      service: input.service.name,
      amountCents: input.service.priceCents,
      paymentStatus: paymentResult.payment.status,
      timeZone: SQUARE_TIME_ZONE,
    });
  } catch (error) {
    const result = publicError(error);
    return jsonResponse(result.statusCode, {
      error: result.message,
      ...(result.uncertain ? { pending: true } : {}),
    });
  }
}
