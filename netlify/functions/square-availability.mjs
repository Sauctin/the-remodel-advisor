import {
  findAvailability,
  formatLocalDate,
  jsonResponse,
  methodNotAllowed,
  publicError,
  SquareError,
  SERVICES,
  SQUARE_TIME_ZONE,
  validIsoDate,
} from "../lib/square.mjs";

export function availabilityErrorResponse(error) {
  const result = publicError(error);
  return jsonResponse(result.statusCode, {
    error: result.message,
    ...(error instanceof SquareError && error.codes.length
      ? { squareErrorCodes: error.codes }
      : {}),
  });
}

export default async function handler(request) {
  if (request.method !== "GET") return methodNotAllowed("GET");
  const url = new URL(request.url);
  const service = SERVICES[url.searchParams.get("service")];
  const date = url.searchParams.get("date");
  if (!service || !validIsoDate(date)) {
    return jsonResponse(400, { error: "Choose a valid service and date." });
  }
  if (Date.parse(`${date}T23:59:59Z`) < Date.now()) {
    return jsonResponse(400, { error: "Choose a future date." });
  }

  try {
    // Square wants a future window of 24 hours to 32 days, so never start before now.
    const center = Date.parse(`${date}T12:00:00Z`);
    const start = Math.max(center - 24 * 60 * 60 * 1000, Date.now() + 60 * 1000);
    const end = Math.max(center + 36 * 60 * 60 * 1000, start + 24 * 60 * 60 * 1000);
    const availabilities = await findAvailability(
      service,
      new Date(start).toISOString(),
      new Date(end).toISOString(),
    );
    const slots = availabilities
      .filter((availability) => formatLocalDate(availability.start_at, SQUARE_TIME_ZONE) === date)
      .flatMap((availability) => (availability.appointment_segments || []).map((segment) => ({
        startAt: availability.start_at,
        teamMemberId: segment.team_member_id,
        serviceVariationVersion: segment.service_variation_version,
        serviceVariationId: segment.service_variation_id,
        durationMinutes: segment.duration_minutes,
      })))
      .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
    return jsonResponse(200, { date, timeZone: SQUARE_TIME_ZONE, slots });
  } catch (error) {
    return availabilityErrorResponse(error);
  }
}
