import assert from "node:assert/strict";
import test from "node:test";
import { makeSearchQuery, SERVICES, SquareError } from "../netlify/lib/square.mjs";
import { validateRequest } from "../netlify/functions/square-book.mjs";
import { checkServiceArea, milesFromCenter, serviceAreaMessage } from "../netlify/lib/service-area.mjs";

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

test("availability search leaves team-member filtering unrestricted", () => {
  const query = makeSearchQuery(
    SERVICES["estimate-review"],
    "2030-01-02T00:00:00.000Z",
    "2030-01-03T00:00:00.000Z",
  );
  assert.deepEqual(query.query.filter.segment_filters, [{
    service_variation_id: SERVICES["estimate-review"].variationId,
  }]);
});

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

test("rejects incomplete or out-of-radius at-home addresses", () => {
  assert.throws(
    () => validateRequest({ ...validRequest, address: { ...validRequest.address, postalCode: "" } }),
    (error) => error instanceof SquareError && /complete service address/.test(error.message),
  );
  assert.throws(
    () => validateRequest({ ...validRequest, address: { ...validRequest.address, state: "CA" } }),
    (error) => error instanceof SquareError && /25 miles of ZIP code 45150/.test(error.message),
  );
});

test("accepts an eligible Kentucky ZIP in the service radius", () => {
  const result = validateRequest({
    ...validRequest,
    address: { ...validRequest.address, city: "Covington", state: "KY", postalCode: "41011" },
  });
  assert.equal(result.address.administrative_district_level_1, "KY");
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

const ohioAddress = { address_line_1: "1 Main St", locality: "Milford", administrative_district_level_1: "OH", postal_code: "45150" };

test("measures the street address against the 25-mile radius", async () => {
  // Downtown Cincinnati is roughly 14 miles from the 45150 center; Columbus is ~85.
  const near = await checkServiceArea(ohioAddress, { geocode: async () => ({ lat: 39.1031, lon: -84.512 }) });
  assert.equal(near.method, "address");
  assert.equal(near.within, true);
  assert.ok(near.miles > 10 && near.miles < 20);
  const far = await checkServiceArea(ohioAddress, { geocode: async () => ({ lat: 39.9612, lon: -82.9988 }) });
  assert.equal(far.within, false);
  assert.match(serviceAreaMessage(far), /outside the 25-mile at-home area/);
});

test("falls back to the ZIP list when the address can't be matched", async () => {
  const inZip = await checkServiceArea(ohioAddress, { geocode: async () => null });
  assert.deepEqual([inZip.method, inZip.within], ["zip", true]);
  const outZip = await checkServiceArea({ ...ohioAddress, postal_code: "43001" }, { geocode: async () => { throw new Error("down"); } });
  assert.deepEqual([outZip.method, outZip.within], ["zip", false]);
});

test("distance math is sane", () => {
  assert.equal(milesFromCenter(39.166469, -84.230391), 0);
});
