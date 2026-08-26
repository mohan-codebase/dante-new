# Dante Gonzales Orthodontics — homepage

A ground-up redesign of the drdantegonzales.com homepage, built as static
HTML, CSS and vanilla JavaScript. No framework, no build step: open
`index.html` (or serve the folder) and it runs.

```
index.html          the whole homepage
css/styles.css      design tokens + every component
js/main.js          nav, reveal, counters, before/after, carousel, tabs, forms, video
assets/brand/       logo, favicon, signature
assets/hero/        page banner photography
assets/team/        Dr. Gonzales and staff portraits
assets/cases/       before-and-after cases
assets/treatments/  braces, Invisalign, surgical, accelerated
assets/locations/   Dublin and Tracy page imagery
assets/blog/        per-post imagery, one folder per slug
assets/photos/      general photography, report + book art
assets/ui/          badges, partner logos, quiz options
assets/video/       video posters
assets/docs/        downloadable PDFs
assets/_archive/    kept but unreferenced by any page
legacy/             the previous Tailwind build, kept for reference
```

## Content

Every section of the original homepage is represented: utility bar, full
navigation, mission, 30-second quiz, the free Top-10 report, patient-intent
cards, both offices with hours and maps, the "right for you" prompt, the
*Setting Them Straight* book, the 12,000-smiles service area, the Dear Friend
founder letter, before-and-afters, the "proudly offered" brands, all five
patient testimonials, the appointment form, the three core benefits, the intro
video, the newsletter sign-up and the complete footer.

## Notes for deployment

* **Appointment form** posts to `contact-form1.php`, the same endpoint the
  current site uses. Re-add the reCAPTCHA v3 script and populate the hidden
  `#recaptchaResponse` field before going live.
* **Newsletter form** validates in the browser and shows an inline
  confirmation; wire it to your list provider to actually capture addresses.
* **Office hours** appear twice, exactly as on the current site: the detailed
  set in “Visit us in Dublin or Tracy”, and the summary set in the footer.
  They disagree on Friday and Saturday — worth reconciling with the practice.
* **Images** are served as WebP with JPEG/PNG fallbacks. Sources live beside
  the derivatives in `assets/photos/`.

## Browser support

Evergreen Chrome, Safari, Firefox and Edge. Respects
`prefers-reduced-motion`; the page is fully readable with JavaScript disabled.
