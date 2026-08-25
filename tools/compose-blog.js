#!/usr/bin/env node
// One-off composer for the blog index (blog.php -> blog.html). The generic
// composer assumes prose sections; this page is a repeating card grid, so it
// gets its own small builder instead of being forced through that shape.
//
// Every card's title/excerpt/byline text is copied verbatim from
// src/content/blog.json, in document order, so nothing here paraphrases.
//
// Run: node tools/compose-blog.js

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const rec = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content/blog.json'), 'utf8'));
const b = rec.blocks;

// Which posts actually got mirrored, extracted and composed into a real page.
const builtSlugs = new Set(
  fs.readdirSync(path.join(ROOT, 'src/pages'))
    .filter((f) => f.startsWith('blog__') && f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
);

function resolveHref(phpHref) {
  const m = phpHref.match(/^blog\/([a-z0-9-]+)\.php$/i);
  if (!m) return '404.html';
  const slug = 'blog__' + m[1];
  return builtSlugs.has(slug) ? slug + '.html' : '404.html';
}

// index3: a "latest post" byline that duplicates the first card's own byline
// (a leftover of the source template's widget markup). Surface it once as a
// kicker above the grid so its words are not dropped.
const kicker = b[3] && b[3].type === 'text' ? b[3].text.trim() : null;

const cards = [];
for (let i = 4; i < b.length - 1; i += 2) {
  const h3 = b[i], txt = b[i + 1];
  if (!h3 || h3.type !== 'h3' || !txt) continue;
  const readMore = (txt.links || []).find((l) => l.text === 'READ MORE');
  if (!readMore) continue;
  const cut = txt.text.indexOf('READ MORE');
  const excerpt = txt.text.slice(0, cut).trim();
  const byline = txt.text.slice(cut + 'READ MORE'.length).trim();
  cards.push({ title: h3.text, excerpt, byline, href: resolveHref(readMore.href) });
}

const cardsHtml = cards.map((c, n) => `        <li class="post-card" data-reveal data-reveal-delay="${(n % 3) + 1}">
          <a class="post-card__link" href="${c.href}">
            <h3 class="post-card__title">${esc(c.title)}</h3>
            <p class="post-card__excerpt">${esc(c.excerpt)}</p>
            <span class="post-card__cta">Read More</span>
            <span class="post-card__meta">${esc(c.byline)}</span>
          </a>
        </li>`).join('\n');

const body = `<!-- ============================================================== PAGE HERO -->
<section class="page-hero" aria-labelledby="page-title">
  <div class="page-hero__wash" aria-hidden="true"></div>
  <div class="shell page-hero__inner">
    <nav class="crumbs" aria-label="Breadcrumb">
      <ol>
        <li><a href="index.html">Home</a></li>
        <li aria-current="page">Blog</li>
      </ol>
    </nav>
    <h1 class="page-hero__title" id="page-title" data-reveal>${esc(b[0].text)}</h1>
${kicker ? `    <p class="page-hero__meta" data-reveal data-reveal-delay="1">${esc(kicker)}</p>` : ''}
    <p class="page-hero__lede" data-reveal data-reveal-delay="1">${esc(rec.meta.description)}</p>
  </div>
</section>

<section class="section">
  <div class="shell">
    <ul class="cards cards--3 post-grid">
${cardsHtml}
    </ul>
  </div>
</section>
`;

fs.writeFileSync(path.join(ROOT, 'src/pages/blog.body.html'), body);

const cfg = {
  title: rec.meta.title,
  description: rec.meta.description,
  canonical: 'https://www.drdantegonzales.com/blog.html',
  ogType: 'website',
  jsonLd: [{
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.drdantegonzales.com/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://www.drdantegonzales.com/blog.html' },
    ],
  }],
};
fs.writeFileSync(path.join(ROOT, 'src/pages/blog.json'), JSON.stringify(cfg, null, 2) + '\n');

console.log(`composed blog  (${cards.length} cards, ${cards.filter((c) => c.href !== '404.html').length} linked, ${cards.filter((c) => c.href === '404.html').length} placeholder)`);
