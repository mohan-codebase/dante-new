#!/usr/bin/env node
// Assemble static pages from shared partials + per-page body/meta.
// Output is plain HTML committed to the repo root: no runtime templating,
// no client-side includes, nothing for a crawler to miss.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const PARTIALS = path.join(SRC, 'partials');
const PAGES = path.join(SRC, 'pages');

const read = (p) => fs.readFileSync(p, 'utf8');
const head = read(path.join(PARTIALS, 'head.html'));
const header = read(path.join(PARTIALS, 'header.html'));
const footer = read(path.join(PARTIALS, 'footer.html'));
const tail = read(path.join(PARTIALS, 'tail.html'));

const DEFAULTS = {
  ogType: 'website',
  ogImage: 'https://www.drdantegonzales.com/assets/photos/hero-smile.jpg',
  ogImageAlt: 'Patient of Dante Gonzales Orthodontics laughing with a confident smile',
  preload: '',
  jsonLd: [],
};

const esc = (s) => String(s == null ? '' : s).replace(/&(?!(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;').replace(/"/g, '&quot;');

// `blog__` groups the blog sources together in one flat directory; on the live
// site those posts sit in a real /blog/ subdirectory. Publishing them there
// keeps every URL identical to production apart from the extension.
//   src/pages/blog__does-invisalign-hurt.body.html -> blog/does-invisalign-hurt.html
const publicPath = (slug) => slug.replace(/^blog__/, 'blog/') + '.html';

// Every path in the partials is relative to the site root, so a page published
// into a subdirectory needs those walked back up. Absolute, protocol-relative,
// fragment-only, and scheme URLs are left alone.
function reroot(html, depth) {
  if (!depth) return html;
  const up = '../'.repeat(depth);
  return html.replace(/\b(href|src)="([^"]*)"/g, (m, attr, url) =>
    /^(https?:|\/\/|\/|#|mailto:|tel:|data:)/.test(url) ? m : `${attr}="${up}${url}"`);
}

function build(slug) {
  const cfg = { ...DEFAULTS, ...JSON.parse(read(path.join(PAGES, slug + '.json'))) };
  const body = read(path.join(PAGES, slug + '.body.html'));

  const filled = head
    .replace(/{{TITLE}}/g, esc(cfg.title))
    .replace(/{{DESCRIPTION}}/g, esc(cfg.description))
    .replace(/{{CANONICAL}}/g, esc(cfg.canonical))
    .replace(/{{OG_TYPE}}/g, esc(cfg.ogType))
    .replace(/{{OG_TITLE}}/g, esc(cfg.ogTitle || cfg.title))
    .replace(/{{OG_DESCRIPTION}}/g, esc(cfg.ogDescription || cfg.description))
    .replace(/{{OG_IMAGE}}/g, esc(cfg.ogImage))
    .replace(/{{OG_IMAGE_ALT}}/g, esc(cfg.ogImageAlt))
    .replace(/{{PRELOAD}}/g, cfg.preload);

  // Mark the current page in the nav so it renders as active.
  let nav = header;
  if (cfg.navMatch) {
    nav = nav.replace(new RegExp(`(<a\\b[^>]*href="${cfg.navMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}")`, 'g'), '$1 aria-current="page"');
  }

  const ld = (cfg.jsonLd || []).map((o) => `<script type="application/ld+json">\n${JSON.stringify(o, null, 2)}\n</script>`).join('\n\n');

  const out = [
    filled,
    nav,
    '',
    '<main id="main">',
    '',
    body.trim(),
    '',
    '</main>',
    '',
    footer,
    '',
    tail.replace('<script src="js/main.js" defer></script>', (ld ? ld + '\n\n' : '') + '<script src="js/main.js" defer></script>'),
    '</body>',
    '</html>',
    '',
  ].join('\n');

  const rel = publicPath(slug);
  const dest = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, reroot(out, rel.split('/').length - 1));
  return out.length;
}

const targets = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(PAGES).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));

for (const slug of targets) {
  const bytes = build(slug);
  console.log(`built ${publicPath(slug)}  (${(bytes / 1024).toFixed(1)} KB)`);
}
