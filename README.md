# Dante Gonzales Orthodontics — website

A static rebuild of drdantegonzales.com: plain HTML, CSS and vanilla
JavaScript. No framework, no build step. What is in the repo is what ships —
edit the files directly and serve the folder.

## Layout

```
index.html                 homepage
*.html                      25 more top-level pages (about, invisalign, braces, …)
blog/*.html                 49 blog posts
css/styles.css              design tokens + every component
js/main.js                  nav, reveal, counters, before/after, carousel, tabs, forms, video
404.html                    error page (wired via .htaccess)

.htaccess                   legacy .php -> .html 301s, HTTPS + host canonicalisation
sitemap.xml                 published URLs
robots.txt

assets/brand/               logo, favicon
assets/hero/                page banner photography
assets/team/                Dr. Gonzales and staff portraits
assets/cases/               before-and-after cases
assets/treatments/          braces, Invisalign, surgical, accelerated
assets/locations/           Dublin and Tracy page imagery
assets/blog/                per-post imagery, one folder per slug
assets/photos/              general photography, report + book art
assets/ui/                  badges, partner logos, quiz options
assets/video/               video posters
assets/docs/                downloadable PDFs

page-status-tracker.csv     migration / deploy checklist (.xlsx is the same data)
```

## Working locally

Serve the repo root over HTTP — **not** `file://`, and not a subfolder:

```
python3 -m http.server 8899
# then open http://localhost:8899/
```

`css/styles.css` and `js/main.js` are linked with paths relative to the site
root (`css/styles.css`, or `../css/styles.css` from `blog/`), so the page must
be served from this directory to resolve them. Opening an `.html` file directly
from disk will render it unstyled.

Edit any `.html` file, `css/styles.css` or `js/main.js` and refresh
(hard-refresh — `Cmd/Ctrl+Shift+R` — after CSS changes, the browser caches the
stylesheet).

The site-wide header, footer and `<head>` are duplicated into every page. To
change the nav or footer, edit it across all files (find-and-replace).

## Notes for deployment

* **Appointment form** (`index.html`) posts to `contact-form1.php`, the same
  endpoint the old site uses. Re-add the reCAPTCHA v3 script and populate the
  hidden `#recaptchaResponse` field before going live.
* **Newsletter form** validates in the browser and shows an inline
  confirmation; wire it to your list provider to actually capture addresses.
* **Office hours** appear twice, as on the old site: the detailed set in
  "Visit us in Dublin or Tracy" and the summary set in the footer. They
  disagree on Friday and Saturday — reconcile with the practice.
* **Host canonicalisation** (www vs non-www) — review the top block of
  `.htaccess` before deploy. Both hosts currently answer 200; the canonical
  tags say `www`.
* **`sitemap.xml`** currently lists 58 URLs; the 16 newest blog posts are not
  in it yet.
* **Images** are served as WebP/AVIF with JPEG/PNG fallbacks where available.

## Browser support

Evergreen Chrome, Safari, Firefox and Edge. Respects
`prefers-reduced-motion`; the page is readable with JavaScript disabled.
