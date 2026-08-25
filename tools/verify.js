#!/usr/bin/env node
// Word-for-word check: every word the legacy page rendered must appear in the
// rebuilt page. Compares multisets, so a word used three times on the old page
// must appear at least three times on the new one.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…', deg: '°', reg: '®', copy: '©', trade: '™' };
const decode = (s) => s
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => (n.toLowerCase() in ENTITIES ? ENTITIES[n.toLowerCase()] : m));

const words = (html) => decode(
  html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]*>/g, ' ')
).toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, ' ').split(/\s+/).filter(Boolean);

const tally = (arr) => arr.reduce((m, w) => m.set(w, (m.get(w) || 0) + 1), new Map());

function verify(slug) {
  const rec = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content', slug + '.json'), 'utf8'));
  const built = fs.readFileSync(path.join(ROOT, slug + '.html'), 'utf8');
  const main = built.match(/<main id="main">([\s\S]*?)<\/main>/i);
  if (!main) throw new Error(`${slug}.html has no <main>`);

  const legacy = tally(rec.words);
  const now = tally(words(main[1]));

  const missing = [];
  for (const [w, n] of legacy) {
    const have = now.get(w) || 0;
    if (have < n) missing.push({ word: w, expected: n, found: have });
  }
  const added = [];
  for (const [w, n] of now) {
    const had = legacy.get(w) || 0;
    if (n > had) added.push({ word: w, added: n - had });
  }

  return { slug, legacyWords: rec.words.length, builtWords: words(main[1]).length, missing, added };
}

const slugs = process.argv.slice(2);
let fail = 0;
for (const slug of slugs) {
  const r = verify(slug);
  const ok = r.missing.length === 0;
  if (!ok) fail = 1;
  console.log(`\n${ok ? 'PASS' : 'FAIL'}  ${r.slug}   legacy ${r.legacyWords} words -> built ${r.builtWords} words`);
  if (r.missing.length) {
    console.log(`  MISSING (${r.missing.length} distinct):`);
    for (const m of r.missing.slice(0, 40)) console.log(`    "${m.word}"  expected ${m.expected}, found ${m.found}`);
    if (r.missing.length > 40) console.log(`    ... and ${r.missing.length - 40} more`);
  }
  if (r.added.length) {
    console.log(`  added by the redesign (${r.added.length} distinct): ${r.added.slice(0, 30).map((a) => a.word + (a.added > 1 ? '×' + a.added : '')).join(', ')}${r.added.length > 30 ? ', …' : ''}`);
  }
}
process.exit(fail);
