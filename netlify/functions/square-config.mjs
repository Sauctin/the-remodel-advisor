import {
  appId,
  hasSquareConfig,
  isSquareConnected,
  jsonResponse,
  methodNotAllowed,
  SQUARE_ENVIRONMENT,
} from "../lib/square.mjs";

export default async function handler(event) {
  if (event.httpMethod !== "GET") return methodNotAllowed("GET");
  return jsonResponse(200, {
    ready: hasSquareConfig() && await isSquareConnected(),
    applicationId: appId(),
    locationId: process.env.SQUARE_LOCATION_ID || "",
    environment: SQUARE_ENVIRONMENT,
    timeZone: process.env.SQUARE_TIME_ZONE || "America/New_York",
  });
}
