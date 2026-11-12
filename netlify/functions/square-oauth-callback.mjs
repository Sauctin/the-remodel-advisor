import {
  appId,
  jsonResponse,
  redirectUri,
  SQUARE_ENVIRONMENT,
  store,
  verifyOAuthState,
} from "../lib/square.mjs";

function redirect(path) {
  return {
    statusCode: 302,
    headers: {
      Location: path,
      "Cache-Control": "no-store",
      "Set-Cookie": "square_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/.netlify/functions/square-oauth-callback; Max-Age=0",
    },
    body: "",
  };
}

export default async function handler(event) {
  if (event.httpMethod !== "GET") {
    return { ...jsonResponse(405, { error: "Method not allowed." }), headers: { Allow: "GET" } };
  }
  const url = new URL(event.rawUrl);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookie = (event.headers?.cookie || event.headers?.Cookie || "")
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith("square_oauth_state="))
    ?.slice("square_oauth_state=".length);
  const [cookieState, signature] = (cookie || "").split(".");

  if (url.searchParams.has("error")) return redirect("/book.html?square=authorization-denied");
  if (!code || state !== cookieState || !verifyOAuthState(state, signature)) {
    return redirect("/book.html?square=authorization-failed");
  }
  if (!appId() || !process.env.SQUARE_APPLICATION_SECRET) {
    return redirect("/book.html?square=configuration-error");
  }

  const baseUrl = SQUARE_ENVIRONMENT === "sandbox"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";
  let response;
  try {
    response = await fetch(`${baseUrl}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: appId(),
        client_secret: process.env.SQUARE_APPLICATION_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri(event),
      }),
    });
  } catch {
    console.error("Square OAuth token exchange could not reach Square");
    return redirect("/book.html?square=authorization-failed");
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token || !result.refresh_token || !result.merchant_id) {
    const codes = (result.errors || []).map((error) => error.code).filter(Boolean);
    console.error("Square OAuth token exchange failed", { status: response.status, codes });
    return redirect("/book.html?square=authorization-failed");
  }
  if (process.env.SQUARE_MERCHANT_ID && result.merchant_id !== process.env.SQUARE_MERCHANT_ID) {
    console.error("Square OAuth merchant did not match configured merchant ID");
    return redirect("/book.html?square=wrong-account");
  }

  try {
    await store().setJSON("oauth-tokens", {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      expires_at: result.expires_at || new Date(Date.now() + (result.expires_in || 2592000) * 1000).toISOString(),
      merchant_id: result.merchant_id,
    });
  } catch (error) {
    console.error("Square OAuth tokens could not be stored", error?.name || "Error");
    return redirect("/book.html?square=storage-error");
  }

  return redirect("/book.html?square=connected");
}
