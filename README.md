# The Remodel Advisor

Static site for The Remodel Advisor, Ted's independent remodeling consulting business (Greater Cincinnati and virtual). Plain HTML/CSS/JS, no build step. Live at https://askremodel.com. Netlify publishes the repo root on every push to `main`.

## Structure

| File | What it is |
| --- | --- |
| `index.html` | Home: hero, services, how it works, about teaser, reviews, FAQ |
| `services.html` | Detail for each service, comparison table, scope (what's included and what isn't) |
| `book.html` | On-site service picker, scheduler, and payment flow |
| `documents.html` | Netlify form with file uploads for estimates, photos, and plans |
| `about.html` | Ted's story, what he brings, project gallery |
| `terms.html`, `privacy.html` | Draft legal pages |
| `js/components.js` | Shared header/footer, icons, **site config** (`SITE`, `SERVICES`) |
| `css/styles.css` | All styles; design tokens are at the top |
| `assets/img/` | Logo SVGs (mark, horizontal, stacked; dark and light) and the OG image |

Shared pieces are filled in by JS: `<span data-icon="name">` becomes an icon, and `<div class="ph" data-ph="…">` becomes a photo placeholder. To use a real photo, replace the `.ph` div with an `<img>`.

## Before launch

- [ ] **Square Appointments:** create Sandbox and production developer app credentials, configure the Netlify environment, test the full booking/payment flow in Sandbox, confirm applicable taxes and service area, then authorize and enable production. Existing Square-hosted booking links remain available until on-site checkout is fully configured.
- [ ] **Photos:** every "Photo needed" placeholder (hero, about, services, gallery)
- [ ] **Reviews:** replace the three "Sample review" cards on the home page with real ones, or remove the section
- [ ] **Copy flagged `.todo`:** travel radius, Ted's story, psychology background
- [ ] **Legal:** review `terms.html` and `privacy.html` and set effective dates
- [ ] **Email:** set `SITE.email` once there's a working address; add it to the Netlify form notifications
- [x] **Domain:** askremodel.com (Cloudflare Registrar; A `@` → 75.2.60.5 and CNAME `www` → the-remodel-advisor.netlify.app, both DNS-only/grey cloud)
- [ ] **Indexing:** remove the `X-Robots-Tag` block in `netlify.toml` and change `robots.txt` to allow crawling

### On-site Square booking setup

The custom booking flow uses Square's Bookings API and Web Payments SDK through Netlify Functions. Do not put Square access tokens or application secrets in client-side files.

1. Create a Square developer application in Sandbox and production. Register the exact `/.netlify/functions/square-oauth-callback` URL for the deployment context used by each environment; the production URL is `https://askremodel.com/.netlify/functions/square-oauth-callback`.
2. The integration requests only `APPOINTMENTS_READ`, `APPOINTMENTS_WRITE`, `CUSTOMERS_WRITE`, and `PAYMENTS_WRITE`. Square allows buyer-level booking creation with `APPOINTMENTS_WRITE`; seller-level booking writes require Appointments Plus or Premium.
3. Configure Netlify environment variables separately by deploy context. Set `SQUARE_APPLICATION_ID`, `SQUARE_APPLICATION_SECRET`, `SQUARE_LOCATION_ID`, `SQUARE_REDIRECT_URI`, `SQUARE_OAUTH_SETUP_KEY`, `SQUARE_ENVIRONMENT` (`sandbox` for testing, `production` only after approval), and `SQUARE_TIME_ZONE` (`America/New_York`). Sandbox and production require their matching credentials and location IDs. Set `SQUARE_MERCHANT_ID` if available to bind OAuth to the expected seller account.
4. For Sandbox, create matching service variations and set `SQUARE_ESTIMATE_REVIEW_VARIATION_ID`, `SQUARE_MATERIAL_SELECTION_VARIATION_ID`, and `SQUARE_RENOVATION_CONSULTATION_VARIATION_ID` in the Sandbox deploy context. Production uses the existing Square service variation IDs by default.
5. Visit `/.netlify/functions/square-oauth-start` in the matching environment and authorize the app. The endpoint is protected by HTTP Basic auth: username `square-admin`, password the value of `SQUARE_OAUTH_SETUP_KEY`.
6. Add the test deployment domain to the Sandbox Web Payments SDK domain allowlist, and `https://askremodel.com` and `https://www.askremodel.com` to the production allowlist. Sandbox and production require their matching Application IDs.
7. Test the complete booking, customer-location/video option, card payment, cancellation-on-payment-failure, and confirmation flow in Sandbox before configuring production credentials.

The website falls back to the existing Square-hosted service links until the on-site integration is configured. Do not enable production until Sandbox tests pass and tax treatment/service area have been confirmed. Never commit secrets, paste them into chat, or use production credentials for testing.

The on-site payment endpoint charges the listed service price as-is; it does not calculate or add sales tax. The business owner confirmed no tax is due for the current consultations; re-confirm with a tax professional for any new service or jurisdiction before changing that treatment.

At-home bookings accept ZIP codes whose GeoNames postal-code centroid is within 25 miles of ZIP code 45150. This is an approximate ZIP-level boundary, not a rooftop-distance check; customers near the boundary are asked to call for confirmation. The allowlist is derived from the [GeoNames US postal-code dataset](https://download.geonames.org/export/zip/US.zip) (CC BY 4.0; see [GeoNames](https://www.geonames.org/)).

## Local preview

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```
