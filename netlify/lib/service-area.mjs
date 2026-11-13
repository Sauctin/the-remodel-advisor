const SERVICE_AREA_ZIPS = new Set(`
41001 41007 41011 41012 41014 41015 41016 41017 41018 41019 41021 41025
41042 41051 41053 41059 41071 41072 41073 41074 41075 41076 41085 41099
45011 45014 45015 45034 45036 45039 45040 45050 45051 45054 45055 45061
45065 45067 45069 45071 45102 45103 45106 45107 45111 45113 45114 45118
45119 45120 45122 45130 45140 45142 45147 45148 45150 45152 45153 45154
45156 45157 45158 45160 45162 45174 45176 45201 45202 45203 45204 45205
45206 45207 45208 45209 45211 45212 45213 45214 45215 45216 45217 45218
45219 45220 45221 45222 45223 45224 45225 45226 45227 45229 45230 45231
45232 45233 45234 45235 45236 45237 45238 45239 45240 45241 45242 45243
45244 45245 45246 45247 45248 45249 45250 45251 45252 45253 45254 45255
45258 45262 45263 45264 45267 45268 45269 45270 45271 45273 45274 45275
45277 45280 45296 45298 45299 45999
`.trim().split(/\s+/));

export function isWithinServiceArea(postalCode, state) {
  return ["OH", "KY"].includes(state) && SERVICE_AREA_ZIPS.has(postalCode.slice(0, 5));
}

// ---------------------------------------------------------------------------
// Address-level check: geocode the street address (US Census Bureau geocoder,
// free, no key) and measure straight-line distance from the center of ZIP
// 45150. Falls back to the ZIP list above when the address can't be matched.
// ---------------------------------------------------------------------------

// Census 2023 ZCTA internal point for 45150 (Milford, OH).
export const SERVICE_CENTER = Object.freeze({ lat: 39.166469, lon: -84.230391 });
export const SERVICE_RADIUS_MILES = 25;
const CENSUS_GEOCODER = "https://geocoding.geo.census.gov/geocoder/locations/address";

export function milesFromCenter(lat, lon, center = SERVICE_CENTER) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat - center.lat);
  const dLon = toRad(lon - center.lon);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(center.lat)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(a));
}

// address uses Square's shape: address_line_1, locality, administrative_district_level_1, postal_code
export async function geocodeAddress(address, fetchImpl = fetch) {
  const url = new URL(CENSUS_GEOCODER);
  url.searchParams.set("street", address.address_line_1);
  url.searchParams.set("city", address.locality);
  url.searchParams.set("state", address.administrative_district_level_1);
  url.searchParams.set("zip", address.postal_code.slice(0, 5));
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("format", "json");
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);
  const match = (await response.json())?.result?.addressMatches?.[0];
  if (!match?.coordinates) return null;
  return { lat: Number(match.coordinates.y), lon: Number(match.coordinates.x), matchedAddress: match.matchedAddress };
}

export async function checkServiceArea(address, { geocode = geocodeAddress } = {}) {
  let point = null;
  try {
    point = await geocode(address);
  } catch (error) {
    console.error("Service-area geocoding failed; falling back to ZIP list", error?.name || "Error");
  }
  if (point && Number.isFinite(point.lat) && Number.isFinite(point.lon)) {
    const miles = Math.round(milesFromCenter(point.lat, point.lon) * 10) / 10;
    return { within: miles <= SERVICE_RADIUS_MILES, miles, method: "address" };
  }
  return {
    within: isWithinServiceArea(address.postal_code, address.administrative_district_level_1),
    miles: null,
    method: "zip",
  };
}

export function serviceAreaMessage(result) {
  if (result.method === "address" && result.within) {
    return `This address is about ${result.miles} miles from ZIP code 45150, within the at-home service area.`;
  }
  if (result.method === "address") {
    return `This address is about ${result.miles} miles from ZIP code 45150, outside the ${SERVICE_RADIUS_MILES}-mile at-home area. Choose a video call, or call (513) 409-1625 to ask.`;
  }
  if (result.within) {
    return "We couldn't pinpoint this street address, but its ZIP code is within the at-home service area.";
  }
  return `At-home appointments are limited to within ${SERVICE_RADIUS_MILES} miles of ZIP code 45150. Choose a video call, or call (513) 409-1625 if you're near the edge.`;
}
