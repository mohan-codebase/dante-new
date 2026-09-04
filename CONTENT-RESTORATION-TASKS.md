# Content restoration tasks — old site → new site

Source of truth for the "before" text is the live old site at `https://drdantegonzales.com/`.
Fetch the old page listed in each task and copy the exact wording back into the new page.

Rules:
- This is a **content** fix, not a redesign. Keep the new layout, styling and components. Drop the old markup in as new-site components.
- Match the old text exactly unless a note says otherwise. Do not paraphrase.
- Do not remove any content the new site added.
- Where a task says "confirm with the client", make the change but flag it in your summary rather than guessing.

---

## 1. `before-after.html` — largest content loss
Old page: https://drdantegonzales.com/before-after.php

Restore all of the following, which are absent from the new page:

- Heading **"Transforming Smiles, Changing Lives"** and the paragraph beneath it beginning
  "Dr. Gonzales is an Diamond Invisalign Provider in Dublin and Tracy, CA. Invisalign straightens your teeth using series of clear, plastic aligners…"
  (fix the "is an Diamond" typo to "is a Diamond")
- The five gallery category labels: **Brightening Smiles / Straightening Smiles / Perfecting Smiles / Restoring Smiles / Transforming Smiles**
- The paragraph beginning **"Gonzales is a science and an art…"**
- The inline **"Make an Appointment"** form section — first/last name, phone, email, age, Male / Female / Child, Dublin / Tracy office choice, "Tell us about your teeth", Submit. The new page only links out to the contact page. Reuse the form component from `index.html` and give the section `id="appointment"`.
- The three cards: **Advanced Technology**, **Healthcare Solutions** (including the "Tom Terry Certified facility" wording), and **24/7 Availability**

---

## 2. `braces.html` — missing appointment form + dead anchor
Old page: https://drdantegonzales.com/braces.php

- The old inline **"Make an Appointment"** form section (Male / Female / Child options, Submit Query) is gone. Restore it using the `index.html` form component, with `id="appointment"`.
- Bug: the header CTA uses `href="#appointment"` but `braces.html` has no element with that id, so the button does nothing. Adding the form above fixes it. If the client would rather not have a second form, change the header CTA to `index.html#appointment` instead — the hero CTA already does this correctly.
- Check every other new page for the same dead `#appointment` anchor and fix consistently.

---

## 3. `about-us.html` — missing CTA phone + inconsistent hours
Old page: https://drdantegonzales.com/dublin-california-ca-orthodontics-office.php

- The old closing CTA is gone: *"Call 925.209.2982 today for your complimentary consultation for braces and Invisalign at our conveniently located orthodontics office in Dublin and Tracy CA."* The number **925.209.2982** appears nowhere on the new site. **Confirm with the client** whether this number is still in service before restoring it — if it is dead, drop the number but restore the CTA sentence.
- **Footer hours are inconsistent with the rest of the new site.** `about-us.html` shows `Friday 8.00 am – 5.00 pm` / `Saturday 8.15 am – 1.30 pm`; the old site and every other new page show `Friday 8.00 am – 4.00 pm` / `Saturday 8.30 am – 1.30 pm`. Pick one and make the footer identical sitewide — ideally by extracting the footer into a single shared partial/include so this cannot drift again.
- Note (no action unless the client disagrees): "10,000 smiles transformed" was updated to "12,000" here and across the site; copyright updated 2024 → 2026.

---

## 4. `meet-our-founder.html` — shortened service area, lost first-person voice
Old page: https://drdantegonzales.com/about.php

- Restore the full service-area list from the old H2 subhead. The new page dropped **Castro Valley, San Leandro, Hayward and Fremont**. Full old list: Dublin, Pleasanton, San Ramon, Danville, Livermore, Castro Valley, Tracy, San Leandro, Hayward, and Fremont, California (CA).
- Dr. Gonzales's first-person quote *"I became an orthodontist because of my own experience…"* was rewritten into third person. The facts survived but the direct quote did not — restore it as a quote.

---

## 5. `meet-our-orthodontists.html` — a doctor and two bio sentences dropped
Old page: https://drdantegonzales.com/meet-our-orthodontists-in-dublin-ca.php

- The old H2 read *"MEET OUR 5-STAR-RATED ORTHODONTISTS IN DUBLIN AND TRACY, CA, DR. DANTE GONZALES & DR. GABRIELLE WAINWRIGHT"*. **Dr. Gabrielle Wainwright** no longer appears anywhere on the new site. The old page carried no bio for her, so this may be deliberate — **confirm with the client whether she is still with the practice** before restoring the name.
- Restore these two sentences to **Dr. Paul J. Kim's** bio:
  - "committed to providing exceptional, evidence-based orthodontic care with a personalized approach"
  - "Outside the office, he enjoys connecting with patients and helping them achieve confident, healthy smiles."
- Restore the full service-area list (same four cities as task 4).
- Do **not** restore the old "Qualifications of Dr. John Maxwell" section — it was lorem-style placeholder text and was correctly removed.

---

## 6. `meet-our-dublin-team.html` — shortened intro
Old page: https://drdantegonzales.com/meet-our-orthodontics-team.php

All 13 staff members and their bios survived. The intro paragraph lost these sentences — restore them:

- "We are especially interested in making all our patients feel right at home!"
- "We put your needs first to achieve efficient and comprehensive treatment"
- "Our staff is trained and skilled, and we strive to provide energetic and fun-loving service to each patient"
- "years of experience in treating patients with the highest level of care" (the new page replaced this with "welcoming patients and navigating insurance")

Also restore to **Derrick's** bio: *"He is most likely one of the first voices you will hear and meet."*

---

## 7. `meet-our-tracy-team.html` — same shortened intro
Old page: https://drdantegonzales.com/meet-the-tracy-orthodontics-team.php

All 5 staff members survived. Restore the same intro sentences as task 6, plus:
- "our office staff has years of experience in treating patients with the highest level of care"

---

## 8. Blog publication dates are shifted by one slot

Six articles carry the wrong date. The dates appear to have slipped one position down a list during migration. Fix the date on each article page **and** on its teaser card in `blog.html`:

| File | Currently shows | Correct date |
| --- | --- | --- |
| `blog/does-invisalign-work-for-crowded-teeth.html` | August 1, 2026 | **August 19, 2026** |
| `blog/tmj-headaches.html` | July 17, 2026 | **August 1, 2026** |
| `blog/what-is-tmj-disorder.html` | June 2, 2026 | **July 17, 2026** |
| `blog/invisalign-for-adults.html` | June 1, 2026 | **June 2, 2026** |
| `blog/can-invisalign-fix-an-underbite.html` | May 19, 2026 | **June 1, 2026** |
| `blog/crowded-teeth-before-and-after.html` | February 18, 2025 | **May 21, 2025** |

Note: `blog/botox-for-tmj.html` legitimately carries July 17, 2026 — leave it alone.
After fixing, re-check the whole `blog.html` listing for any other date that no longer matches its article.

Also: every teaser card on the old `blog.php` carried the author byline **"drdanteblogs"**, which the new cards replaced with a category tag. Ask the client whether they want a byline back; if yes, use a real author name rather than the old CMS username.

---

## 9. Dropped outbound citation links

The new pages kept the sentences but stripped the `<a>` tags. Restore the anchors:

- `blog/can-invisalign-fix-protruding-front-teeth.html` — in the intro, link the words **"recent study"** to
  `https://www.researchgate.net/publication/383079419_Deep_overbite_reduction_in_adolescent_patients_treated_with_Invisalign_A_retrospective_analysis`
- `blog/crowded-teeth-before-and-after.html` — in the intro, link the words **"orthodontic treatment"** to
  `https://www.mdpi.com/2076-3417/13/6/4035`

While in `can-invisalign-fix-protruding-front-teeth.html`: the Pros/Cons nested list was flattened, so the labels merged into the first bullet of each group ("Pros Discreet appearance", "Cons Can sometimes cost more…"). All items are present — restore **Pros** and **Cons** as their own headings above their lists.

---

## 10. Five old URLs with no new page — decide and document

These were never migrated. Each needs a decision, then a redirect rule so no old inbound link 404s:

| Old URL | Situation | Suggested action |
| --- | --- | --- |
| `/blogs.php` | Already broken on the old site (returns a raw MySQL "Access denied" error) | 301 → `/blog.html` |
| `/blog1.php` | Blank/placeholder carousel page, no extractable content | 301 → `/index.html` |
| `/blog2.php` | Blank/placeholder carousel page, no extractable content | 301 → `/index.html` |
| `/blog/best-age-for-braces.php` | Near-duplicate of `whats-the-best-age-for-braces` (different meta title only) | 301 → `/blog/whats-the-best-age-for-braces.html` |
| `/blog/is-invisalign-worth-it-for-adults.php` | Near-duplicate of `invisalign-treatment-for-adults-cost-timeline` | 301 → `/blog/invisalign-treatment-for-adults-cost-timeline.html` |

Add these to `vercel.json` redirects (or the equivalent) and confirm none of them are currently ranking pages the client wants to keep separate.

---

## Out of scope — already verified as correct

Do not spend time on these; a full old-vs-new comparison found them intact:

- All treatment/service pages (braces variants, Invisalign, Invisalign Teen, accelerated, both surgical pages, all three sleep apnea pages)
- Both contact pages — address, phone, email and day-by-day hours match the old site exactly
- `why-dante-gonzales.html`, `impression-techniques.html`, `invisalign-quiz.html`, `braces-and-invisalign.html`
- 43 of the 49 migrated blog articles, verbatim including tables, statistics and FAQ sets

## Definition of done

- Every task above is either implemented or listed in your summary as blocked on a client decision.
- No content that the new site added has been removed.
- Footer hours are identical on every page.
- No dead `#appointment` anchors anywhere.
- `blog.html` teaser dates match their article pages.
