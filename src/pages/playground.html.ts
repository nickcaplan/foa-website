import { MAIL_ICON_SVG } from "../lib/icons.ts";
import type { APIRoute } from "astro";
import stylesheet from "../styles/global.css?inline";
import { withBase } from "../lib/urls";

export const prerender = true;

const navigation = [
  ["/", "Home"],
  ["/whats-on/", "What's On"],
  ["/get-involved/", "Get Involved"],
  ["/uniform/", "Uniform"],
];

const footerLinks = [
  ["/whats-on/", "What's On"], ["/get-involved/", "Get Involved"],
  ["/committee/", "Committee"], ["/reps/", "Reps Hub"],
  ["/uniform/", "Uniform"], ["/newsletter/", "Newsletter"],
  ["/about/", "About The FOA"], ["/contact/", "Contact Us"],
];

const links = (items: string[][]) => items
  .map(([href, label]) => `<a href="${withBase(href)}">${label}</a>`)
  .join("");

export const GET: APIRoute = () => new Response(`<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <meta name="description" content="Experimental embedded Google Form preview for The Friends of Ashley.">
    <title>Contact Us Playground | The Friends of Ashley</title>
    <style>${stylesheet}</style>
    <style>
      .contact-form-card { overflow: hidden; }
      .contact-form { display: block; width: 100%; min-height: 55.2rem; margin-top: 1.5rem; border: 0; }
    </style>
  </head>
  <body class="playground-page">
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <header class="site-header">
      <div class="site-width header-inner">
        <a class="brand" href="${withBase("/")}" aria-label="The Friends of Ashley home">
          <img class="brand-logo" src="${withBase("/brand/foa-logo-ivory.svg")}" alt="" width="68" height="68">
          <span class="brand-copy"><strong>The Friends of Ashley</strong><span>Ashley C of E Primary School PTA</span></span>
        </a>
        <nav class="desktop-nav" aria-label="Primary navigation">${links(navigation)}</nav>
        <button class="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu" data-menu-toggle><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"></path></svg></button>
      </div>
    </header>
    <div class="mobile-menu" id="mobile-menu" aria-hidden="true" data-mobile-menu>
      <div class="mobile-menu-panel">
        <div class="mobile-menu-head"><strong>Explore The FOA</strong><button class="menu-close" type="button" aria-label="Close menu" data-menu-close>&times;</button></div>
        <nav aria-label="Mobile navigation">${links(navigation)}<a href="${withBase("/contact/")}">Contact Us</a></nav>
      </div>
    </div>
    <main id="main-content">
      <section class="view-hero">
        <div class="site-width"><p class="eyebrow">Contact The FOA</p><h1>Start with the shared inbox.</h1><p>Questions, ideas and offers of help are welcome.</p></div>
      </section>
      <section class="content-section content-section--compact">
        <div class="site-width split-layout">
          <div>
            <h2 class="editorial-heading">Get in touch</h2>
            <p class="section-copy">Use the shared address for The FOA so the right committee member can respond.</p>
            <a class="button button--primary" href="mailto:thefriendsofashley@gmail.com"><span class="cta-label">Email The Friends of <span class="cta-tail">Ashley${MAIL_ICON_SVG}</span></span></a>
          </div>
          <article class="info-card contact-form-card">
            <h2>Send us a message</h2>
            <p>Use our Google Form if you would prefer to send your question online.</p>
            <iframe class="contact-form" src="https://docs.google.com/forms/d/e/1FAIpQLSfZSFWNhPmuDj6sH_nbNvSTDqahaekJOaefneAgGXpToltH7w/viewform?embedded=true" title="The Friends of Ashley contact form" loading="lazy">Loading The Friends of Ashley contact form...</iframe>
          </article>
        </div>
      </section>
    </main>
    <footer class="site-footer">
      <div class="site-width">
        <div class="footer-grid">
          <div class="footer-brand"><h2>The Friends of Ashley</h2><p>The parent teacher association for Ashley C of E Primary School, Walton-on-Thames.</p></div>
          <nav class="footer-links" aria-label="Footer navigation">${links(footerLinks)}</nav>
        </div>
        <div class="footer-bottom"><span>Registered charity 1024028</span></div>
      </div>
    </footer>
    <script>
      const menu = document.querySelector("[data-mobile-menu]");
      const openButton = document.querySelector("[data-menu-toggle]");
      const closeButton = document.querySelector("[data-menu-close]");
      const setMenu = (open) => {
        if (!menu || !openButton) return;
        menu.classList.toggle("is-open", open);
        menu.setAttribute("aria-hidden", String(!open));
        openButton.setAttribute("aria-expanded", String(open));
        document.body.classList.toggle("menu-open", open);
        (open ? closeButton : openButton)?.focus();
      };
      openButton?.addEventListener("click", () => setMenu(true));
      closeButton?.addEventListener("click", () => setMenu(false));
      menu?.addEventListener("click", (event) => {
        if (event.target === menu || event.target.closest("a")) setMenu(false);
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && menu?.classList.contains("is-open")) setMenu(false);
      });
    </script>
  </body>
</html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
