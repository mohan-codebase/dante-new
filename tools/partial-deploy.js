#!/usr/bin/env node
// Assemble an upload bundle for a PARTIAL cutover.
//
// Only the pages listed in PUBLISH go live as static .html; the rest of the
// site keeps serving from the old PHP install. That means the published pages
// must not link to .html files that do not exist yet — every link to an
// un-migrated page is rewritten back to its legacy .php URL.
//
//   node tools/partial-deploy.js
//
// Output lands in dist-partial/, mirroring the paths to upload to the web root.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist-partial');
const HOST = 'https://www.drdantegonzales.com';

// The pages going live in this batch.
const PUBLISH = [
  'index.html',
  'invisalign.html',
  'braces.html',
  'about.html',
  'dublin-ca-orthodontic-office-contact.html',
  'tracy-ca-orthodontic-office-contact.html',
  'before-after.html',
  'blog.html',
  'blog/braces-create-small-gap-between-front-teeth-is-it-normal.html',
  'blog/braces-vs-invisalign.html',
  'blog/can-braces-fix-an-overbite-permanently.html',
  'blog/can-invisalign-fix-protruding-front-teeth.html',
  'blog/can-orthodontic-treatment-help-sleep-apnea.html',
  'blog/can-tmj-dysfuntion-cause-ear-pain.html',
  'blog/can-you-chew-gum-with-invisalign-without-affecting-your-treatment.html',
  'blog/can-you-chew-gum-with-invisalign.html',
  'blog/can-you-drink-with-invisalign.html',
  'blog/can-you-eat-with-invisalign.html',
  'blog/can-you-get-braces-with-missing-teeth-heres-what-orthodontists-say.html',
  'blog/can-you-really-straighten-teeth-without-braces.html',
  'blog/crowded-teeth-before-and-after.html',
  'blog/do-braces-hurt-how-long-the-pain-lasts-and-how-to-cope.html',
  'blog/do-braces-or-invisalign-hurt-what-to-expect-during-your-first-week.html',
  'blog/does-invisalign-hurt-more-than-braces.html',
  'blog/does-invisalign-hurt.html',
  'blog/how-braces-can-correct-crooked-teeth-a-complete-guide.html',
  'blog/how-braces-can-lead-to-white-marks-and-what-you-can-do-about-it.html',
  'blog/how-to-brush-teeth-with-braces.html',
  'blog/how-to-clean-invisalign-properly.html',
  'blog/how-to-fix-a-gap-between-teeth-treatment-options-compared.html',
  'blog/invisalign-vs-braces-choosing-the-right-option-for-your-smile.html',
  'blog/jaw-pain-on-one-side.html',
  'blog/overbite-vs-underbite.html',
  'blog/the-best-solutions-on-how-to-fix-crowded-teeth-effectively.html',
  'blog/the-best-techniques-to-floss-teeth-with-braces-effectively.html',
  'blog/what-causes-crowded-teeth-and-how-dentists-fix-them.html',
  'blog/what-is-a-deep-bite.html',
  'blog/what-is-an-underbite.html',
  'blog/what-is-malocclusion-of-teeth.html',
  'blog/what-is-sleep-apnea-caused-by.html',
  'blog/what-is-teeth-protrusion.html',
];

const published = new Set(PUBLISH);

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const write = (rel, data) => {
  const dest = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, data);
};

// --------------------------------------------------------------- link fixup --
// A link to a page in this batch stays .html; anything else points back at the
// legacy .php that is still serving it.
const SKIP = /^(https?:|\/\/|#|mailto:|tel:|data:)/;

function relink(html, page) {
  const pageDir = path.dirname(page);
  const rewritten = new Set();
  const out = html.replace(/\b(href|src)="([^"]+)"/g, (m, attr, url) => {
    if (SKIP.test(url)) return m;
    const [pathPart, hash = ''] = url.split(/(#.*)$/);
    if (!pathPart.endsWith('.html')) return m;
    const resolved = path.normalize(path.join(pageDir, pathPart));
    if (published.has(resolved)) return m;
    rewritten.add(resolved);
    return `${attr}="${pathPart.replace(/\.html$/, '.php')}${hash}"`;
  });
  return { out, rewritten };
}

// ------------------------------------------------------------------- pages --
fs.rmSync(OUT, { recursive: true, force: true });

const assets = new Set();
let totalRewrites = 0;
const allRewritten = new Set();

for (const page of PUBLISH) {
  const pageDir = path.dirname(page);
  const { out, rewritten } = relink(read(page), page);
  rewritten.forEach((r) => allRewritten.add(r));

  // collect every non-page asset this file needs, including the responsive
  // variants that only ever appear inside a srcset
  const want = (url) => {
    if (SKIP.test(url)) return;
    const cleanUrl = url.split('#')[0].split('?')[0];
    if (!cleanUrl || cleanUrl.endsWith('.html') || cleanUrl.endsWith('.php')) return;
    const p = path.normalize(path.join(pageDir, cleanUrl));
    assets.add(p);
  };
  for (const [, , url] of out.matchAll(/\b(href|src)="([^"]+)"/g)) want(url);
  for (const [, set] of out.matchAll(/\bsrcset="([^"]+)"/g)) {
    for (const cand of set.split(',')) want(cand.trim().split(/\s+/)[0]);
  }

  const before = (read(page).match(/\.html"/g) || []).length;
  const after = (out.match(/\.html"/g) || []).length;
  totalRewrites += before - after;
  write(page, out);
  console.log(`page   ${page}`);
}

// ------------------------------------------------------------------ assets --
let copied = 0;
for (const a of [...assets].sort()) {
  const src = path.join(ROOT, a);
  if (!fs.existsSync(src)) { console.log(`MISSING ASSET  ${a}`); continue; }
  const dest = path.join(OUT, a);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  copied++;
}

// ---------------------------------------------------------------- htaccess --
// Deliberately minimal. Only the five migrated slugs redirect; every other
// legacy URL is left completely untouched so the PHP site keeps serving it.
const slugs = PUBLISH.filter((p) => p !== 'index.html').map((p) => p.replace(/\.html$/, ''));
write('.htaccess', `# =============================================================================
# PARTIAL CUTOVER — ${PUBLISH.length} pages are static, the rest still run on PHP.
#
# Only the migrated slugs redirect. Every other .php URL is left alone so the
# old site keeps serving it untouched. Replace this with the full .htaccess in
# the repo root once the remaining pages are migrated.
# =============================================================================

# Serve the new static homepage for "/" ahead of the old index.php.
# NOTE: index.html must be uploaded, or "/" falls through to index.php and the
# redirect below turns into a loop.
DirectoryIndex index.html index.php

<IfModule mod_rewrite.c>
  RewriteEngine On

  # Force HTTPS (safe for the whole site).
  RewriteCond %{HTTPS} !=on
  RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]

  # The homepage was reachable at both / and /index.php.
  RewriteRule ^index\\.php$ / [R=301,L]

  # The migrated pages: legacy .php -> new .html
  RewriteRule ^(${slugs.join('|')})\\.php$ /$1.html [R=301,L]
</IfModule>

# NOT included in this partial bundle, on purpose:
#   * ErrorDocument 404 /404.html  — 404.html is not part of this batch.
#   * non-www -> www canonicalisation — a site-wide change affecting the 53
#     pages still on PHP. Do it at full cutover, not mid-migration.
`);

// ----------------------------------------------------------------- sitemap --
// The published pages at their new .html URLs, plus every page still on PHP at
// its existing URL, so nothing drops out of the index mid-migration.
const liveXml = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
const legacy = JSON.parse(fs.readFileSync(path.join(__dirname, 'legacy-urls.json'), 'utf8'));
const publishedSlugs = new Set(PUBLISH.map((p) => p.replace(/\.html$/, '')));

const rows = [];
for (const p of PUBLISH) {
  const loc = p === 'index.html' ? `${HOST}/` : `${HOST}/${p}`;
  rows.push(`  <url>\n    <loc>${loc}</loc>\n    <priority>${p === 'index.html' ? '1.00' : '0.80'}</priority>\n  </url>`);
}
for (const u of legacy) {
  const slug = u.replace(/\.php$/, '');
  if (publishedSlugs.has(slug)) continue;
  rows.push(`  <url>\n    <loc>${HOST}/${u}</loc>\n    <priority>0.64</priority>\n  </url>`);
}
write('sitemap.xml',
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + rows.join('\n') + '\n</urlset>\n');

console.log(`\nbundle: dist-partial/`);
console.log(`  pages          : ${PUBLISH.length}`);
console.log(`  assets copied  : ${copied}`);
console.log(`  links sent to .php : ${totalRewrites} across ${allRewritten.size} distinct targets`);
console.log(`  sitemap URLs   : ${rows.length}  (${PUBLISH.length} new .html + ${rows.length - PUBLISH.length} still on .php)`);
