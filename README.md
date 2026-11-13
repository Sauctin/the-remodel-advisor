# The Remodel Advisor

Static site for The Remodel Advisor, Ted's independent remodeling consulting business (Greater Cincinnati and virtual). Plain HTML/CSS/JS, no build step. Live at https://askremodel.com. Netlify publishes the repo root on every push to `main`.

## Structure

| File | What it is |
| --- | --- |
| `index.html` | Home: hero, services, how it works, about teaser, reviews, FAQ |
| `services.html` | Detail for each service, comparison table, scope (what's included and what isn't) |
| `book.html` | On-site booking and payment through Square (see below) |
| `documents.html` | Netlify form with file uploads for estimates, photos, and plans |
| `woodworking.html` | Custom woodworking: what Ted makes, portfolio, materials, process, FAQ, and the `woodworking-request` Netlify form (thanks page: `woodworking-thanks.html`) |
| `about.html` | Ted's story, what he brings, project gallery |
| `terms.html`, `privacy.html` | Draft legal pages |
| `js/components.js` | Shared header/footer, icons, **site config** (`SITE`, `SERVICES`) |
| `css/styles.css` | All styles; design tokens are at the top |
| `assets/img/` | Logo SVGs (mark, horizontal, stacked; dark and light) and the OG image |

Shared pieces are filled in by JS: `<span data-icon="name">` becomes an icon, and `<div class="ph" data-ph="…">` becomes a photo placeholder. To use a real photo, replace the `.ph` div with an `<img>`.

## Before launch

- [ ] **Square booking:** Ted connects his account (setup link below), then makes and refunds one real test booking
- [ ] **Photos:** every "Photo needed" placeholder (hero, about, services, gallery)
- [ ] **Reviews:** replace the three "Sample review" cards on the home page with real ones, or remove the section
- [ ] **Woodworking page:** real photos with wood/size/finish captions, starting prices, deposit, lead times, delivery/shipping, guarantee, joinery, follow-up time (all flagged `.todo` or "Photo needed"); add an email notification for the `woodworking-request` form in Netlify
- [ ] **Copy flagged `.todo`:** travel radius, Ted's story, psychology background
- [ ] **Legal:** review `terms.html` and `privacy.html` and set effective dates
- [ ] **Email:** set `SITE.email` once there's a working address; add it to the Netlify form notifications
- [x] **Domain:** askremodel.com (Cloudflare Registrar; A `@` → 75.2.60.5 and CNAME `www` → the-remodel-advisor.netlify.app, both DNS-only/grey cloud)
- [ ] **Indexing:** remove the `X-Robots-Tag` block in `netlify.toml` and change `robots.txt` to allow crawling

### Square booking (on-site)

`book.html` runs the whole booking on askremodel.com: service, date and time, customer details, and Square's secure card field (Web Payments SDK). Netlify functions in `netlify/functions/` talk to Square:

| Function | Job |
| --- | --- |
| `square-config` | Tells the page whether Square is connected (`ready`) |
| `square-availability` | Open times for a service on a date |
| `square-book` | Creates the customer and appointment, charges the card, cancels the appointment if the charge fails |
| `square-oauth-start` / `square-oauth-callback` | One-time connection to Ted's Square account (OAuth, buyer-level scopes, so it works on Square Appointments Free) |

Netlify environment variables: `SQUARE_ENVIRONMENT=production`, `SQUARE_APPLICATION_ID`, `SQUARE_APPLICATION_SECRET`, `SQUARE_LOCATION_ID`, `SQUARE_OAUTH_SETUP_KEY` (password for the connect link, username `square-admin`), and optionally `SQUARE_MERCHANT_ID` to lock the connection to Ted's account. Tokens live in Netlify Blobs (`square-booking-production`) and refresh automatically.

To connect or reconnect: open `/.netlify/functions/square-oauth-start`, sign in with `square-admin` and the setup key, then approve in Square. You land on `/book?square=connected`.

If Square isn't connected, the page falls back to a "Continue to Square" button for the hosted booking page (links in `SITE.booking`). Prices are hard-coded in both `js/components.js` and `netlify/lib/square.mjs`, and must match Square.

## Local preview

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```
