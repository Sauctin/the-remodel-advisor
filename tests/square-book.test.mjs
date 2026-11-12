import assert from "node:assert/strict";
import test from "node:test";
import { SquareError } from "../netlify/lib/square.mjs";
import { validateRequest } from "../netlify/functions/square-book.mjs";

const validRequest = {
  serviceId: "estimate-review",
  givenName: "Ada",
  familyName: "Lovelace",
  email: " ADA@example.com ",
  phone: "+1 (513) 555-0100",
  sourceId: "cnon:card-nonce-ok",
  idempotencyKey: "1b671a64-40d5-491e-99b0-da01ff1f3341",
  locationType: "CUSTOMER_LOCATION",
  address: {
    line1: "123 Main Street",
    city: "Cincinnati",
    state: "OH",
    postalCode: "45202",
  },
  startAt: "2030-01-02T15:00:00.000Z",
  teamMemberId: "TMABC123",
  serviceVariationVersion: 1,
};

test("validates and normalizes a customer-location booking", () => {
  const result = validateRequest(validRequest);
  assert.equal(result.email, "ada@example.com");
  assert.equal(result.service.priceCents, 5000);
  assert.equal(result.address.country, "US");
  assert.equal(result.startAt, "2030-01-02T15:00:00.000Z");
  assert.equal("priceCents" in result, false);
});

test("uses the server-side service price regardless of client input", () => {
  const result = validateRequest({ ...validRequest, priceCents: 1 });
  assert.equal(result.service.priceCents, 5000);
});

test("rejects incomplete or out-of-area at-home addresses", () => {
  assert.throws(
    () => validateRequest({ ...validRequest, address: { ...validRequest.address, state: "CA" } }),
    (error) => error instanceof SquareError && /Greater Cincinnati/.test(error.message),
  );
  assert.throws(
    () => validateRequest({ ...validRequest, address: { ...validRequest.address, postalCode: "" } }),
    (error) => error instanceof SquareError && /complete service address/.test(error.message),
  );
});

test("rejects malformed booking and payment identifiers", () => {
  assert.throws(
    () => validateRequest({ ...validRequest, idempotencyKey: "not-a-uuid" }),
    (error) => error instanceof SquareError && error.statusCode === 400,
  );
  assert.throws(
    () => validateRequest({ ...validRequest, serviceId: "unknown" }),
    (error) => error instanceof SquareError && error.statusCode === 400,
  );
});

test("allows video consultations without an at-home address", () => {
  const result = validateRequest({ ...validRequest, locationType: "VIDEO_CONFERENCE", address: undefined });
  assert.equal(result.locationType, "VIDEO_CONFERENCE");
  assert.equal(result.address, null);
});
