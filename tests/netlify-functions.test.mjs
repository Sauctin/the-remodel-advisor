import assert from "node:assert/strict";
import test from "node:test";
import availability from "../netlify/functions/square-availability.mjs";
import booking from "../netlify/functions/square-book.mjs";
import config from "../netlify/functions/square-config.mjs";
import oauthCallback from "../netlify/functions/square-oauth-callback.mjs";
import oauthStart from "../netlify/functions/square-oauth-start.mjs";

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
