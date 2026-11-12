/* ==========================================================================
   The Remodel Advisor — shared header, footer, icons, and page behaviors
   Each page includes:
     <body data-page="home">     (home | services | book | documents | about | terms | privacy)
     <div id="site-header"></div>
     <script src="js/components.js"></script>   (no defer; directly after the header placeholder)
     ... <div id="site-footer"></div>
   ========================================================================== */

(function () {
  "use strict";

  document.documentElement.classList.add("js");

  const SITE = {
    name: "The Remodel Advisor",
    phone: "(513) 409-1625",
    phoneHref: "tel:+15134091625",
    // No working email yet (theremodeladvisor.com is not owned). Leave empty to hide it.
    email: "",
    area: "Greater Cincinnati & virtual",
    // Scheduler booking links per service (Cal.com, Calendly, Square, Acuity…).
    // While a link is empty, the Book page shows a placeholder for that service.
    booking: {
      "estimate-review": "",
      "material-selection": "",
      "renovation-consultation": "",
    },
  };

  const SERVICES = [
    { id: "estimate-review", name: "Estimate Review", length: "1 hour", price: 50,
      blurb: "An independent read on a contractor's bid before you sign." },
    { id: "material-selection", name: "Material Selection", length: "1 hour", price: 40,
      blurb: "Pick the right materials for the job, with every option explained." },
    { id: "renovation-consultation", name: "Renovation Consultation", length: "2 hours", price: 100,
      blurb: "Plan a remodel start to finish with an experienced guide." },
  ];

  const ICONS = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="M5 12.5 10 17l9-10"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
    xCircle: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>',
    home: '<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>',
    hammer: '<path d="m14 6 4 4M4 20l9-9"/><path d="m11 4 3-1 7 7-1 3-3-3-2 2-6-6z"/>',
    ruler: '<rect x="2" y="8" width="20" height="8" rx="1.5"/><path d="M6 8v3M10 8v4M14 8v3M18 8v4"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/>',
    shield: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1L3.2 9.4l6.1-.8z" fill="currentColor" stroke="none"/>',
    doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9.5" r="1.8"/><path d="m21 16-5-5-9 9"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  };
  const icon = (name, cls = "") =>
    `<svg${cls ? ` class="${cls}"` : ""} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;

  // Expose for page scripts
  window.TRA = { SITE, SERVICES, icon };

  const NAV = [
    { id: "services", label: "Services", href: "services.html" },
    { id: "process", label: "How It Works", href: "index.html#process" },
    { id: "about", label: "About", href: "about.html" },
    { id: "documents", label: "Send Documents", href: "documents.html" },
  ];

  const page = document.body.dataset.page || "";
  const current = (id) => (id === page ? ' aria-current="page"' : "");

  const header = `
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header">
      <div class="container site-header__inner">
        <a class="brand" href="index.html" aria-label="${SITE.name} home">
          <img src="assets/img/logo-horizontal.svg" alt="${SITE.name}" width="221" height="56">
        </a>
        <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
          <span class="visually-hidden">Menu</span>
          <span class="nav-toggle__bars" aria-hidden="true"></span>
        </button>
        <nav class="nav" id="site-nav" aria-label="Primary">
          <ul class="nav__list">
            ${NAV.map((l) => `<li><a class="nav__link" href="${l.href}"${current(l.id)}>${l.label}</a></li>`).join("")}
          </ul>
          <div class="nav__cta">
            <a class="nav__phone" href="${SITE.phoneHref}">${icon("phone")}${SITE.phone}</a>
            <a class="btn btn--sm" href="book.html"${current("book")}>Book a Consultation</a>
          </div>
        </nav>
      </div>
    </header>`;

  const footer = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer__grid">
          <div class="footer__brand">
            <img src="assets/img/logo-horizontal-light.svg" alt="${SITE.name}" width="221" height="56" loading="lazy">
            <p>Independent residential remodeling and construction consulting. Straight answers from someone who isn't bidding on your job.</p>
          </div>
          <div>
            <h2 class="footer__title">Services</h2>
            <ul class="footer__links">
              ${SERVICES.map((s) => `<li><a href="services.html#${s.id}">${s.name}</a></li>`).join("")}
            </ul>
          </div>
          <div>
            <h2 class="footer__title">Company</h2>
            <ul class="footer__links">
              <li><a href="about.html">About</a></li>
              <li><a href="index.html#process">How It Works</a></li>
              <li><a href="index.html#faq">FAQ</a></li>
              <li><a href="documents.html">Send Documents</a></li>
            </ul>
          </div>
          <div>
            <h2 class="footer__title">Contact</h2>
            <ul class="footer__links footer__contact">
              <li>${icon("phone")}<a href="${SITE.phoneHref}">${SITE.phone}</a></li>
              ${SITE.email ? `<li>${icon("mail")}<a href="mailto:${SITE.email}">${SITE.email}</a></li>` : ""}
              <li>${icon("pin")}<span>${SITE.area}</span></li>
            </ul>
          </div>
        </div>
        <div class="footer__bottom">
          <span>&copy; ${new Date().getFullYear()} ${SITE.name}. All rights reserved.</span>
          <ul>
            <li><a href="terms.html">Terms</a></li>
            <li><a href="privacy.html">Privacy</a></li>
          </ul>
        </div>
      </div>
    </footer>`;

  const headerSlot = document.getElementById("site-header");
  if (headerSlot) headerSlot.outerHTML = header;

  function onReady() {
    const footerSlot = document.getElementById("site-footer");
    if (footerSlot) footerSlot.outerHTML = footer;

    // Mobile nav
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.getElementById("site-nav");
    if (toggle && nav) {
      toggle.addEventListener("click", () => {
        const open = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!open));
        nav.classList.toggle("is-open", !open);
      });
      nav.addEventListener("click", (e) => {
        if (e.target.closest("a")) {
          toggle.setAttribute("aria-expanded", "false");
          nav.classList.remove("is-open");
        }
      });
    }

    // Header shadow on scroll
    const head = document.querySelector(".site-header");
    const onScroll = () => head && head.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Icons: <span data-icon="clock"></span> → inline SVG
    document.querySelectorAll("[data-icon]").forEach((el) => {
      el.outerHTML = icon(el.dataset.icon, el.className);
    });

    // Photo placeholders: <div class="ph" data-ph="What the photo should show"></div>
    document.querySelectorAll(".ph[data-ph]").forEach((el) => {
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", "Photo placeholder: " + el.dataset.ph);
      el.innerHTML = `<div class="ph__inner">${icon("camera")}<span class="ph__tag">Photo needed</span><p class="ph__text">${el.dataset.ph}</p></div>`;
    });

    // Scroll reveal
    const reveals = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window && reveals.length) {
      const io = new IntersectionObserver(
        (entries) => entries.forEach((en) => {
          if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
        }),
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );
      reveals.forEach((el) => io.observe(el));
    } else {
      reveals.forEach((el) => el.classList.add("is-in"));
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", onReady);
  else onReady();
})();
