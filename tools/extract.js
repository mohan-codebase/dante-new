#!/usr/bin/env node
// Pull the exact content of each mirrored legacy page into a JSON record.
// Nothing here paraphrases: every heading, paragraph, list item, image and
// link is copied verbatim from the saved HTML, in document order.

const fs = require('fs');
const path = require('path');

const MIRROR = process.argv[2];
const OUT = process.argv[3];

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  ndash: '–', mdash: '—', hellip: '…', eacute: 'é',
  deg: '°', reg: '®', copy: '©', trade: '™',
};

function decode(s) {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => (n.toLowerCase() in ENTITIES ? ENTITIES[n.toLowerCase()] : m));
}

const strip = (html) => decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

// Drop everything that is chrome or non-content before walking the body.
function contentRegion(html) {
  let s = html;
  s = s.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<style\b[\s\S]*?<\/style>/gi, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<noscript\b[\s\S]*?<\/noscript>/gi, '');

  const body = s.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  s = body ? body[1] : s;

  // Some legacy pages embed a whole second HTML document mid-page. Its <head>
  // and <title> never render, so they must not count as page content.
  s = s.replace(/<head\b[\s\S]*?<\/head>/gi, '');
  s = s.replace(/<title\b[\s\S]*?<\/title>/gi, '');
  s = s.replace(/<!DOCTYPE[^>]*>/gi, '');

  // Legacy chrome: preloader, top bar, the sticky nav header, and the footer.
  s = s.replace(/<div class="se-pre-con"[\s\S]*?<\/div>/i, '');
  s = s.replace(/<div class="top-bar-area[\s\S]*?(?=<header)/i, '');
  const navEnd = s.search(/<\/header>/i);
  if (navEnd !== -1) s = s.slice(navEnd + '</header>'.length);
  const footStart = s.search(/<footer\b/i);
  const footer = footStart !== -1 ? s.slice(footStart) : '';
  if (footStart !== -1) s = s.slice(0, footStart);

  return { main: s, footer };
}

const meta = (html, name) => {
  const re = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i');
  const alt = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, 'i');
  const m = html.match(re) || html.match(alt);
  return m ? decode(m[1]).trim() : null;
};

const prop = (html, p) => {
  const m = html.match(new RegExp(`<meta[^>]+property=["']${p}["'][^>]+content=["']([^"']*)["']`, 'i'));
  return m ? decode(m[1]).trim() : null;
};

function blocks(main) {
  const out = [];
  // Known block-level elements, plus images.
  const re = /<(h[1-6]|p|li|blockquote|td|th|figcaption)\b[^>]*>([\s\S]*?)<\/\1>|<img\b([^>]*)>/gi;

  const linksIn = (html) => [...html.matchAll(/<a\b[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((a) => ({ href: decode(a[1]).trim(), text: strip(a[2]) }))
    .filter((l) => l.text);

  // Text that sits directly in a <div>, <span> or <a> never lands in one of the
  // tags above, but it still renders. Capture those runs in document order so
  // nothing on the page is invisible to the composer.
  const orphan = (html) => {
    const text = strip(html);
    if (!text) return;
    const block = { type: 'text', text };
    const l = linksIn(html);
    if (l.length) block.links = l;
    out.push(block);
  };

  let last = 0;
  let m;
  while ((m = re.exec(main)) !== null) {
    if (m.index > last) orphan(main.slice(last, m.index));
    last = re.lastIndex;

    if (m[3] !== undefined) {
      const attrs = m[3];
      const at = (n) => {
        const a = attrs.match(new RegExp(`${n}=["']([^"']*)["']`, 'i'));
        return a ? decode(a[1]).trim() : null;
      };
      out.push({ type: 'img', src: at('src') || at('data-src'), alt: at('alt') || '', title: at('title') });
      continue;
    }

    const tag = m[1].toLowerCase();
    const inner = m[2];
    const text = strip(inner);
    if (!text && !/<img/i.test(inner)) continue;
    const block = { type: tag, text };
    const l = linksIn(inner);
    if (l.length) block.links = l;
    out.push(block);
  }
  if (last < main.length) orphan(main.slice(last));

  return out;
}

// Every word the live page renders, for the word-for-word verifier.
const wordStream = (main) => strip(main).toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, ' ').split(/\s+/).filter(Boolean);

fs.mkdirSync(OUT, { recursive: true });
const files = fs.readdirSync(MIRROR).filter((f) => f.endsWith('.php'));
const index = [];

for (const file of files) {
  const html = fs.readFileSync(path.join(MIRROR, file), 'utf8');
  if (html.trim().length < 500) { index.push({ file, skipped: 'empty or error response' }); continue; }

  const { main, footer } = contentRegion(html);
  const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const canonM = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i);
  const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((s) => s[1].trim());

  const rec = {
    source: file,
    url: 'https://drdantegonzales.com/' + (file === 'index.php' ? 'index.php' : file.replace(/__/g, '/')),
    meta: {
      title: titleM ? decode(titleM[1]).trim() : null,
      description: meta(html, 'description'),
      keywords: meta(html, 'keywords'),
      robots: meta(html, 'robots'),
      canonical: canonM ? decode(canonM[1]).trim() : null,
      ogTitle: prop(html, 'og:title'),
      ogDescription: prop(html, 'og:description'),
      ogImage: prop(html, 'og:image'),
    },
    jsonLd: ld,
    blocks: blocks(main),
    words: wordStream(main),
  };
  rec.wordCount = rec.words.length;
  rec.imageCount = rec.blocks.filter((b) => b.type === 'img').length;

  const slug = file.replace(/\.php$/, '').replace(/__/g, '/');
  const outFile = path.join(OUT, slug.replace(/\//g, '__') + '.json');
  fs.writeFileSync(outFile, JSON.stringify(rec, null, 2));
  index.push({ file, slug, title: rec.meta.title, words: rec.wordCount, images: rec.imageCount, headings: rec.blocks.filter((b) => /^h[1-6]$/.test(b.type)).length });
}

fs.writeFileSync(path.join(OUT, '_index.json'), JSON.stringify(index, null, 2));
console.log(`extracted ${index.filter((i) => !i.skipped).length} pages -> ${OUT}`);
for (const i of index) {
  if (i.skipped) console.log(`  SKIP  ${i.file}  (${i.skipped})`);
}
