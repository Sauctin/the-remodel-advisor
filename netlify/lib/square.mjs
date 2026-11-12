import { getStore } from "@netlify/blobs";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const SQUARE_VERSION = "2025-10-16";
export const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID || "";
export const SQUARE_TIME_ZONE = process.env.SQUARE_TIME_ZONE || "America/New_York";
export const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox";

export const SERVICES = Object.freeze({
  "estimate-review": {
    name: "Estimate Review",
    priceCents: 5000,
    durationMinutes: 60,
    variationId: process.env.SQUARE_ESTIMATE_REVIEW_VARIATION_ID
      || (SQUARE_ENVIRONMENT === "production" ? "ZQE4R7GQLSG7QZUCOTPICHGL" : ""),
  },
  "material-selection": {
    name: "Material Selection",
    priceCents: 4000,
    durationMinutes: 60,
    variationId: process.env.SQUARE_MATERIAL_SELECTION_VARIATION_ID
      || (SQUARE_ENVIRONMENT === "production" ? "DEZVENR2UHZBZ4ZQ44WPX7ZS" : ""),
  },
  "renovation-consultation": {
    name: "Renovation Consultation",
    priceCents: 10000,
    durationMinutes: 120,
    variationId: process.env.SQUARE_RENOVATION_CONSULTATION_VARIATION_ID
      || (SQUARE_ENVIRONMENT === "production" ? "CCRPQ3SXFOGDSHMAY3UP2DNQ" : ""),
  },
});

export class SquareError extends Error {
  constructor(message, statusCode = 502, codes = [], uncertain = false) {
    super(message);
    this.name = "SquareError";
    this.statusCode = statusCode;
    this.codes = codes;
    this.uncertain = uncertain;
  }
}

export function jsonResponse(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

export function methodNotAllowed(allow) {
  return jsonResponse(405, { error: "Method not allowed." }, { Allow: allow });
}

export function isSameOrigin(event) {
  const origin = event.headers?.origin || event.headers?.Origin;
  if (!origin) return false;
  const allowed = new Set([
    process.env.PUBLIC_SITE_ORIGIN || "https://askremodel.com",
    "https://askremodel.com",
    "https://www.askremodel.com",
  ]);
  if (process.env.CONTEXT === "dev") {
    allowed.add("http://localhost:8888");
    allowed.add("http://localhost:8765");
  }
  return allowed.has(origin);
}

export function parseJsonBody(event) {
  try {
    return JSON.parse(event.body || "");
  } catch {
    throw new SquareError("The request body must be valid JSON.", 400);
  }
}

export function store() {
  return getStore(`square-booking-${SQUARE_ENVIRONMENT}`);
}

function baseUrl() {
  return SQUARE_ENVIRONMENT === "sandbox"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";
}

export function appId() {
  return process.env.SQUARE_APPLICATION_ID || "";
}

export function redirectUri(event) {
  return process.env.SQUARE_REDIRECT_URI
    || `${new URL(event.rawUrl).origin}/.netlify/functions/square-oauth-callback`;
}

export function createOAuthState() {
  const state = randomUUID();
  const signature = createHmac("sha256", process.env.SQUARE_OAUTH_SETUP_KEY)
    .update(state)
    .digest("base64url");
  return { state, signature };
}

export function verifyOAuthState(state, signature) {
  if (!state || !signature || !process.env.SQUARE_OAUTH_SETUP_KEY) return false;
  const expected = createHmac("sha256", process.env.SQUARE_OAUTH_SETUP_KEY)
    .update(state)
    .digest();
  let actual;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    return false;
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function hasSquareConfig() {
  return Boolean(
    appId()
    && SQUARE_LOCATION_ID
    && process.env.SQUARE_APPLICATION_SECRET
    && Object.values(SERVICES).every((service) => service.variationId),
  );
}

export async function isSquareConnected() {
  const tokens = await store().get("oauth-tokens", { type: "json" });
  return Boolean(tokens?.access_token && tokens?.refresh_token);
}

async function exchangeRefreshToken(refreshToken) {
  let response;
  try {
    response = await fetch(`${baseUrl()}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: appId(),
        client_secret: process.env.SQUARE_APPLICATION_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
  } catch {
    throw new SquareError("Square could not be reached. Please try again.", 503, [], true);
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token) {
    const codes = (result.errors || []).map((error) => error.code).filter(Boolean);
    console.error("Square OAuth refresh failed", { status: response.status, codes });
    throw new SquareError(
      "Square authorization needs attention. Please contact the site owner.",
      503,
      codes,
      response.status >= 500,
    );
  }

  const tokens = {
    access_token: result.access_token,
    refresh_token: result.refresh_token || refreshToken,
    expires_at: result.expires_at || new Date(Date.now() + (result.expires_in || 2592000) * 1000).toISOString(),
    merchant_id: result.merchant_id,
  };
  await store().setJSON("oauth-tokens", tokens);
  return tokens.access_token;
}

export async function getAccessToken() {
  const tokens = await store().get("oauth-tokens", { type: "json" });
  if (!tokens?.refresh_token) {
    throw new SquareError("Online booking is not connected to Square yet.", 503);
  }
  if (tokens.access_token && Date.parse(tokens.expires_at) > Date.now() + 120000) {
    return tokens.access_token;
  }
  return exchangeRefreshToken(tokens.refresh_token);
}

export async function squareRequest(path, { method = "POST", body } = {}) {
  const token = await getAccessToken();
  let response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Square-Version": SQUARE_VERSION,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new SquareError("Square could not confirm the request. Please try again.", 503, [], true);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const codes = (payload.errors || []).map((error) => error.code).filter(Boolean);
    console.error("Square API request failed", { path, status: response.status, codes });
    throw new SquareError("Square could not complete the request. Please try again.", response.status, codes, response.status >= 500);
  }
  return payload;
}

export function publicError(error) {
  if (error instanceof SquareError) {
    return { statusCode: error.statusCode, message: error.message, uncertain: error.uncertain };
  }
  console.error("Unexpected booking integration error", error?.name || "Error");
  return { statusCode: 500, message: "We couldn't complete the request. Please try again." };
}

export function validIsoDate(value) {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export function makeSearchQuery(service, startAt, endAt) {
  return {
    query: {
      filter: {
        start_at_range: { start_at: startAt, end_at: endAt },
        location_id: SQUARE_LOCATION_ID,
        segment_filters: [{
          service_variation_id: service.variationId,
          team_member_id_filter: { any: true },
        }],
      },
    },
  };
}

export async function findAvailability(service, startAt, endAt) {
  const result = await squareRequest("/v2/bookings/availability/search", {
    body: makeSearchQuery(service, startAt, endAt),
  });
  if (result.errors?.length) {
    const codes = result.errors.map((error) => error.code).filter(Boolean);
    console.error("Square availability search returned errors", { codes });
    throw new SquareError("We couldn't load available times. Please try again.", 502, codes);
  }
  return result.availabilities || [];
}

export function formatLocalDate(isoDate, timeZone = SQUARE_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(isoDate));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function parseBasicAuth(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || "";
  const expectedKey = process.env.SQUARE_OAUTH_SETUP_KEY || "";
  if (!expectedKey || !header.startsWith("Basic ")) return false;
  let supplied;
  try {
    supplied = Buffer.from(header.slice(6), "base64").toString("utf8");
  } catch {
    return false;
  }
  const expected = `square-admin:${expectedKey}`;
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}
