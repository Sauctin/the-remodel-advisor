# The Remodel Advisor

Static site for The Remodel Advisor, Ted's independent remodeling consulting business (Greater Cincinnati and virtual). Plain HTML/CSS/JS, no build step. Netlify publishes the repo root on every push to `main`.

## Structure

| File | What it is |
| --- | --- |
| `index.html` | Home: hero, services, how it works, about teaser, reviews, FAQ |
| `services.html` | Detail for each service, comparison table, scope (what's included and what isn't) |
| `book.html` | Service picker plus scheduler embed (one booking link per service) |
| `documents.html` | Netlify form with file uploads for estimates, photos, and plans |
| `about.html` | Ted's story, what he brings, project gallery |
| `terms.html`, `privacy.html` | Draft legal pages |
| `js/components.js` | Shared header/footer, icons, **site config** (`SITE`, `SERVICES`) |
| `css/styles.css` | All styles; design tokens are at the top |
| `assets/img/` | Logo SVGs (mark, horizontal, stacked; dark and light) and the OG image |

Shared pieces are filled in by JS: `<span data-icon="name">` becomes an icon, and `<div class="ph" data-ph="…">` becomes a photo placeholder. To use a real photo, replace the `.ph` div with an `<img>`.

## Before launch

- [ ] **Scheduler:** create one booking type per service (Cal.com, Calendly, Square, etc.) and paste the links into `SITE.booking` in `js/components.js`
- [ ] **Photos:** every "Photo needed" placeholder (hero, about, services, gallery)
- [ ] **Reviews:** replace the three "Sample review" cards on the home page with real ones, or remove the section
- [ ] **Copy flagged `.todo`:** cancellation policy, travel radius, Ted's story, psychology background
- [ ] **Legal:** review `terms.html` and `privacy.html`, set effective dates, name the scheduler provider
- [ ] **Email:** set `SITE.email` once there's a working address; add it to the Netlify form notifications
- [ ] **Domain:** when one is bought, update `canonical`/`og:url` links, `robots.txt`, and `sitemap.xml`
- [ ] **Indexing:** remove the `X-Robots-Tag` block in `netlify.toml` and change `robots.txt` to allow crawling

## Local preview

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```
