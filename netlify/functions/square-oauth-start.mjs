import {
  appId,
  createOAuthState,
  jsonResponse,
  methodNotAllowed,
  parseBasicAuth,
  redirectUri,
  SQUARE_ENVIRONMENT,
} from "../lib/square.mjs";

const SCOPES = [
  "APPOINTMENTS_READ",
  "APPOINTMENTS_WRITE",
  "CUSTOMERS_WRITE",
  "PAYMENTS_WRITE",
];

export default async function handler(event) {
  if (event.httpMethod !== "GET") return methodNotAllowed("GET");
  if (!parseBasicAuth(event)) {
    const response = jsonResponse(401, { error: "Square setup authorization is required." });
    response.headers["WWW-Authenticate"] = 'Basic realm="Square booking setup", charset="UTF-8"';
    return response;
  }
  if (!appId() || !process.env.SQUARE_APPLICATION_SECRET || !process.env.SQUARE_OAUTH_SETUP_KEY) {
    return jsonResponse(503, { error: "Square OAuth environment variables are not configured." });
  }

  const { state, signature } = createOAuthState();
  const authorizeUrl = new URL(
    SQUARE_ENVIRONMENT === "sandbox"
      ? "https://connect.squareupsandbox.com/oauth2/authorize"
      : "https://connect.squareup.com/oauth2/authorize",
  );
  authorizeUrl.searchParams.set("client_id", appId());
  authorizeUrl.searchParams.set("scope", SCOPES.join(" "));
  authorizeUrl.searchParams.set("session", "false");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri(event));

  return {
    statusCode: 302,
    headers: {
      Location: authorizeUrl.toString(),
      "Cache-Control": "no-store",
      "Set-Cookie": `square_oauth_state=${state}.${signature}; HttpOnly; Secure; SameSite=Lax; Path=/.netlify/functions/square-oauth-callback; Max-Age=600`,
    },
    body: "",
  };
}
