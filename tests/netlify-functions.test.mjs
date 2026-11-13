import assert from "node:assert/strict";
import test from "node:test";
import availability, { availabilityErrorResponse } from "../netlify/functions/square-availability.mjs";
import booking from "../netlify/functions/square-book.mjs";
import config from "../netlify/functions/square-config.mjs";
import oauthCallback from "../netlify/functions/square-oauth-callback.mjs";
import oauthStart from "../netlify/functions/square-oauth-start.mjs";
import { SquareError } from "../netlify/lib/square.mjs";

test("Netlify handlers return standard Response objects", async () => {
  const responses = await Promise.all([
    config(new Request("https://askremodel.com/.netlify/functions/square-config")),
    availability(new Request("https://askremodel.com/.netlify/functions/square-availability")),
    oauthStart(new Request("https://askremodel.com/.netlify/functions/square-oauth-start")),
    oauthCallback(new Request("https://askremodel.com/.netlify/functions/square-oauth-callback")),
    booking(new Request("https://askremodel.com/.netlify/functions/square-book", { method: "GET" })),
  ]);
  assert.ok(responses.every((response) => response instanceof Response));
  assert.deepEqual(responses.map((response) => response.status), [200, 400, 401, 302, 405]);
});

test("booking endpoint rejects cross-origin requests", async () => {
  const response = await booking(new Request("https://askremodel.com/.netlify/functions/square-book", {
    method: "POST",
    headers: { Origin: "https://not-askremodel.com", "Content-Type": "application/json" },
    body: "{}",
  }));
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "This booking request isn't allowed.");
});

test("availability errors expose only Square error codes for diagnosis", async () => {
  const response = availabilityErrorResponse(
    new SquareError(
      "Square could not complete the request. Please try again.",
      404,
      ["NOT_FOUND"],
      false,
      ["query.filter.segment_filters[0].service_variation_id"],
      ["The service variation was not found."],
    ),
    "service-variation-id",
  );
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: "Square could not complete the request. Please try again.",
    squareErrorCodes: ["NOT_FOUND"],
    squareErrorFields: ["query.filter.segment_filters[0].service_variation_id"],
    squareErrorDetails: ["The service variation was not found."],
    squareServiceVariationId: "service-variation-id",
  });
});
