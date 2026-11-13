# The Remodel Advisor

Static site for The Remodel Advisor, Ted's independent remodeling consulting business (Greater Cincinnati and virtual). Plain HTML/CSS/JS, no build step. Live at https://askremodel.com. Netlify publishes the repo root on every push to `main`.

## Structure

| File | What it is |
| --- | --- |
| `index.html` | Home: hero, services, how it works, about teaser, reviews, FAQ |
| `services.html` | Detail for each service, comparison table, scope (what's included and what isn't) |
| `book.html` | Square Appointments booking flow embedded on the site |
| `documents.html` | Netlify form with file uploads for estimates, photos, and plans |
| `about.html` | Ted's story, what he brings, project gallery |
| `terms.html`, `privacy.html` | Draft legal pages |
| `js/components.js` | Shared header/footer, icons, **site config** (`SITE`, `SERVICES`) |
| `css/styles.css` | All styles; design tokens are at the top |
| `assets/img/` | Logo SVGs (mark, horizontal, stacked; dark and light) and the OG image |

Shared pieces are filled in by JS: `<span data-icon="name">` becomes an icon, and `<div class="ph" data-ph="…">` becomes a photo placeholder. To use a real photo, replace the `.ph` div with an `<img>`.

## Before launch

- [ ] **Square Appointments:** confirm services, prices, payment policy, and service-area options in Square, then test booking from the embedded flow.
- [ ] **Photos:** every "Photo needed" placeholder (hero, about, services, gallery)
- [ ] **Reviews:** replace the three "Sample review" cards on the home page with real ones, or remove the section
- [ ] **Copy flagged `.todo`:** travel radius, Ted's story, psychology background
- [ ] **Legal:** review `terms.html` and `privacy.html` and set effective dates
- [ ] **Email:** set `SITE.email` once there's a working address; add it to the Netlify form notifications
- [x] **Domain:** askremodel.com (Cloudflare Registrar; A `@` → 75.2.60.5 and CNAME `www` → the-remodel-advisor.netlify.app, both DNS-only/grey cloud)
- [ ] **Indexing:** remove the `X-Robots-Tag` block in `netlify.toml` and change `robots.txt` to allow crawling

### Square Appointments booking

The booking page uses Square's official Appointments embed, which lets customers select a service and book through Square without a separate Netlify booking integration. The embed code is configured for The Remodel Advisor's Square location. To manage or regenerate it, open Square Dashboard → Appointments → Online booking → Channels → Add your booking flow to an existing site → Get started → Get embed code.

Keep the Square booking page and its booking policies active. Confirm service prices, prepayment/tax treatment, and whether in-person or video appointments are offered in Square Appointments; changes there apply to the embedded flow. The page also provides a direct booking link if the embed cannot load.

## Local preview

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```
