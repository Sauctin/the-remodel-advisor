import { isSameOrigin, jsonResponse, methodNotAllowed, parseJsonBody, publicError } from "../lib/square.mjs";
import { checkServiceArea, serviceAreaMessage } from "../lib/service-area.mjs";
import { validAddress } from "./square-book.mjs";

// Lets the booking page tell a customer whether their address is in the
// at-home service area before they enter a card. square-book re-checks.
export default async function handler(request) {
  if (request.method !== "POST") return methodNotAllowed("POST");
  if (!isSameOrigin(request)) return jsonResponse(403, { error: "This request isn't allowed." });
  try {
    const address = validAddress(await parseJsonBody(request));
    if (!address) return jsonResponse(400, { error: "Enter a complete service address, including its ZIP code." });
    if (!["OH", "KY"].includes(address.administrative_district_level_1)) {
      const result = { within: false, miles: null, method: "zip" };
      return jsonResponse(200, { ...result, message: serviceAreaMessage(result) });
    }
    const result = await checkServiceArea(address);
    return jsonResponse(200, { ...result, message: serviceAreaMessage(result) });
  } catch (error) {
    const result = publicError(error);
    return jsonResponse(result.statusCode, { error: result.message });
  }
}
