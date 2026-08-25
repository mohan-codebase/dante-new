#!/usr/bin/env node
// Generic composer for interior pages.
//
// Every string it emits comes from src/content/<slug>.json by block index, so
// the copy cannot drift from the legacy source. The layout is driven by the
// structure of the blocks themselves:
//
//   h1 + leading <li>s      -> page hero with breadcrumb
//   each h2                 -> a new section
//   runs of <li>            -> tick list
//   th x3 + td x3n          -> comparison table
//   repeated h4 + p pairs   -> card grid, or an accordion under an FAQ heading
//   images                  -> split copy/media row, or a media grid
//   the shared reviews tail -> testimonials + review badges
//
// Run: node tools/compose.js <slug> [<slug> ...]

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Blog posts were mirrored one directory deeper than interior pages, so their
// image paths carry a leading "../" that does not apply once flattened here.
const src = (s) => String(s || '').replace(/^(\.\.\/)+/, '');
const isH = (b) => b && /^h[1-6]$/.test(b.type);
const isText = (b) => b && (b.type === 'p' || b.type === 'text');

// Legacy links point at .php files; this rebuild serves .html. Absolute
// links back to this same domain are rewritten to relative .html too.
const href = (h) => {
  if (!h) return 'index.html';
  const same = h.match(/^https?:\/\/(?:www\.)?drdantegonzales\.com\/?(.*)$/i);
  if (same) h = same[1] || 'index.php';
  if (/^(tel:|mailto:|https?:|#|assets\/)/i.test(h)) return h;
  const m = h.match(/([a-z0-9._-]+)\.php$/i);
  if (m) return (m[1] === 'index' ? 'index' : m[1]) + '.html';
  return h || 'index.html';
};

// A text run that is nothing but a link is a call-to-action button.
const asCta = (b) => {
  if (!b.links || b.links.length === 0) return null;
  const joined = b.links.map((l) => l.text).join(' ').replace(/\s+/g, ' ').trim();
  if (joined.toLowerCase() !== (b.text || '').replace(/\s+/g, ' ').trim().toLowerCase()) return null;
  return `      <div class="cta-row" data-reveal>\n` + b.links.map((l, n) =>
    `        <a class="btn ${n === 0 ? 'btn--primary' : 'btn--outline'} btn--lg" href="${href(l.href)}">${esc(l.text)}</a>`
  ).join('\n') + `\n      </div>`;
};
const warnings = [];

// Blog posts carry their breadcrumb as one text run ("Home Blog 31 Mar,
// 2026") rather than a run of <li>s. If the run starts with its own link
// texts in order, split it into crumbs + a trailing publish-date string.
function splitBreadcrumbText(block) {
  if (!block || block.type !== 'text' || !block.links || !block.links.length) return null;
  let rest = block.text;
  for (const l of block.links) {
    rest = rest.replace(/^\s+/, '');
    if (!rest.startsWith(l.text)) return null;
    rest = rest.slice(l.text.length);
  }
  return { crumbs: block.links.map((l) => ({ text: l.text, href: l.href })), meta: rest.trim() };
}

// ---------------------------------------------------------------- reviews --
function reviewsSection(blocks, start, slug) {
  const b = blocks;
  const heading = b[start], subtitle = b[start + 1];
  const items = [];
  let i = start + 2;
  while (i < b.length && isText(b[i]) && b[i + 1] && b[i + 1].type === 'h4') {
    items.push({ quote: b[i], name: b[i + 1] });
    i += (b[i + 2] && b[i + 2].type === 'img') ? 3 : 2;
  }
  const badges = [];
  while (i < b.length && b[i] && b[i].type === 'img') { badges.push(b[i]); i++; }

  const cards = items.map((it, n) => `        <li class="quote" data-reveal data-reveal-delay="${(n % 3) + 1}">
          <div class="quote__stars" aria-label="Five out of five stars">
            <img src="assets/img/star.png" alt="" width="96" height="18" loading="lazy" decoding="async">
          </div>
          <blockquote class="quote__body"><p>${esc(it.quote.text)}</p></blockquote>
          <p class="quote__by">${esc(it.name.text)}</p>
        </li>`).join('\n');

  const badgeAlts = ['Google reviews', 'Yelp reviews', 'Facebook reviews', 'Healthgrades reviews'];
  const badgeHtml = badges.map((im, n) =>
    `      <li><img src="${src(im.src)}" alt="${badgeAlts[n] || 'Patient review site'}" width="120" height="44" loading="lazy" decoding="async"></li>`
  ).join('\n');

  return {
    html: `<!-- =========================================================== TESTIMONIALS -->
<section class="section testimonials" aria-labelledby="reviews-title">
  <div class="shell">
    <div class="section__head section__head--center">
      <h2 class="section__title" id="reviews-title" data-reveal>${esc(heading.text)}</h2>
      <p class="section__lede" data-reveal data-reveal-delay="1">${esc(subtitle.text)}</p>
    </div>
      <ul class="cards cards--3">
${cards}
      </ul>
${badgeHtml ? `    <ul class="review-badges" data-reveal>\n${badgeHtml}\n    </ul>` : ''}
  </div>
</section>`,
    end: i,
  };
}

// Some legacy pages collapse an entire FAQ into one unstructured text run
// ("1. Question? Answer... 2. Question? Answer..."). Split it back into pairs,
// but only if every word survives the split - otherwise keep the raw text.
function splitNumberedFaq(text) {
  const re = /(\d+\s*[.)]\s*[^?]*\?)\s*([\s\S]*?)(?=\s*\d+\s*[.)]\s*[^?]*\?|$)/g;
  const pairs = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const q = m[1].trim(), a = m[2].trim();
    if (q && a) pairs.push({ q, a });
  }
  if (pairs.length < 2) return null;
  const words = (x) => x.toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, ' ').split(/\s+/).filter(Boolean);
  const before = words(text).sort().join(' ');
  const after = words(pairs.map((x) => x.q + ' ' + x.a).join(' ')).sort().join(' ');
  return before === after ? pairs : null;
}

// ------------------------------------------------------- section internals --
// The column count is usually just the leading run of <th> cells. But some
// legacy tables also mark each row's leading (label) cell as <th>, which
// inflates that run - e.g. "Benefit|Explanation" header (2 <th>) followed by
// rows shaped [<th> label, <td> value] reads as a run of 3 leading <th>.
// Find the true width structurally: the largest candidate no bigger than the
// leading run for which every row it implies has a <th> only in its first
// cell and <td> everywhere else.
function renderTable(items) {
  let leadingTh = 0;
  while (items[leadingTh] && items[leadingTh].type === 'th') leadingTh++;
  let cols = leadingTh || 3;
  for (let c = leadingTh; c >= 2; c--) {
    const body = items.slice(c);
    if (!body.length || body.length % c !== 0) continue;
    let ok = true;
    for (let r = 0; ok && r < body.length; r += c) {
      for (let k = 1; k < c; k++) if (body[r + k].type !== 'td') ok = false;
    }
    if (ok) { cols = c; break; }
  }
  const header = items.slice(0, cols);
  const body = items.slice(cols);
  const rows = [];
  for (let i = 0; i < body.length; i += cols) {
    const cells = body.slice(i, i + cols);
    rows.push(`          <tr>\n            <th scope="row">${esc(cells[0].text)}</th>\n` +
      cells.slice(1).map((c) => `            <td>${esc(c.text)}</td>`).join('\n') +
      `\n          </tr>`);
  }
  return `      <div class="table-scroll" data-reveal>
        <table class="compare">
          <caption class="sr-only">Comparison table</caption>
          <thead>
            <tr>${header.map((c) => `<th scope="col">${esc(c.text)}</th>`).join('')}</tr>
          </thead>
          <tbody>
${rows.join('\n')}
          </tbody>
        </table>
      </div>`;
}

function renderPairs(pairs, asFaq) {
  if (asFaq) {
    return `      <div class="faq">\n` + pairs.map((p) =>
      `        <details class="faq__item" data-reveal>
          <summary class="faq__q">${esc(p.h.text)}</summary>
          <div class="faq__a"><p>${esc(p.p.text)}</p></div>
        </details>`).join('\n') + `\n      </div>`;
  }
  return `      <ul class="promises promises--grid">\n` + pairs.map((p, n) =>
    `        <li class="promise" data-reveal data-reveal-delay="${(n % 3) + 1}">
          <div class="promise__head">
            <span class="promise__title">${esc(p.h.text)}</span>
          </div>
          <p class="promise__text">${esc(p.p.text)}</p>
        </li>`).join('\n') + `\n      </ul>`;
}

// Walk one section's blocks and emit its inner HTML.
function renderBody(items, sectionTitle) {
  const isFaq = /frequently asked|faqs?\b/i.test(sectionTitle || '');

  // An FAQ whose Q&As collapsed into one unstructured run: split it back out.
  if (isFaq) {
    const texts = items.filter((x) => x.type === 'text' || x.type === 'p');
    if (texts.length === 1 && items.every((x) => x === texts[0] || x.type === 'img')) {
      const pairs = splitNumberedFaq(texts[0].text);
      if (pairs) {
        return {
          html: `      <div class="faq">\n` + pairs.map((x) =>
            `        <details class="faq__item" data-reveal>
          <summary class="faq__q">${esc(x.q)}</summary>
          <div class="faq__a"><p>${esc(x.a)}</p></div>
        </details>`).join('\n') + `\n      </div>`,
          images: items.filter((x) => x.type === 'img'),
        };
      }
    }
  }
  const out = [];
  const images = [];
  let i = 0;
  let prose = [];

  const flushProse = () => {
    if (!prose.length) return;
    out.push(`      <div class="prose" data-reveal>\n${prose.join('\n')}\n      </div>`);
    prose = [];
  };

  while (i < items.length) {
    const b = items[i];

    if (b.type === 'th' || b.type === 'td') {
      const run = [];
      while (i < items.length && (items[i].type === 'th' || items[i].type === 'td')) run.push(items[i++]);
      flushProse();
      out.push(renderTable(run));
      continue;
    }

    if (b.type === 'li') {
      const run = [];
      while (i < items.length && items[i].type === 'li') run.push(items[i++]);
      flushProse();
      out.push(`      <ul class="ticks" data-reveal>\n` +
        run.map((x) => `        <li>${esc(x.text)}</li>`).join('\n') + `\n      </ul>`);
      continue;
    }

    // repeated "h4 then paragraph" -> cards or an accordion
    if (b.type === 'h4' && isText(items[i + 1])) {
      const pairs = [];
      let j = i;
      while (items[j] && items[j].type === 'h4' && isText(items[j + 1])) {
        pairs.push({ h: items[j], p: items[j + 1] });
        j += 2;
      }
      if (pairs.length >= 3 || isFaq) {
        flushProse();
        out.push(renderPairs(pairs, isFaq));
        i = j;
        continue;
      }
    }

    if (b.type === 'img') { images.push(b); i++; continue; }

    if (isH(b)) { prose.push(`        <${b.type}>${esc(b.text)}</${b.type}>`); i++; continue; }
    if (b.type === 'text') {
      const cta = asCta(b);
      if (cta) { flushProse(); out.push(cta); } else { prose.push(`        <p>${esc(b.text)}</p>`); }
      i++; continue;
    }
    if (b.type === 'p') { prose.push(`        <p>${esc(b.text)}</p>`); i++; continue; }
    if (b.type === 'blockquote') { prose.push(`        <blockquote><p>${esc(b.text)}</p></blockquote>`); i++; continue; }
    i++;
  }
  flushProse();
  return { html: out.join('\n\n'), images };
}

function renderSection(sec, n) {
  const alt = n % 2 === 1 ? ' section--alt' : '';
  const id = 'sec-' + n;
  const { html, images } = renderBody(sec.items, sec.title);

  const media = images.length
    ? `      <div class="split__media" data-reveal data-reveal-delay="2">\n` +
      images.map((im) => `        <img src="${src(im.src)}" alt="${esc(im.alt || '')}" loading="lazy" decoding="async">`).join('\n') +
      `\n      </div>`
    : '';

  const head = sec.title
    ? `    <div class="section__head">
      <h2 class="section__title" id="${id}" data-reveal>${esc(sec.title)}</h2>
    </div>`
    : '';

  // One or two images sit beside the copy; more than that go underneath.
  if (images.length && images.length <= 2 && html) {
    return `<section class="section${alt}"${sec.title ? ` aria-labelledby="${id}"` : ''}>
  <div class="shell">
    <div class="split${n % 4 === 3 ? ' split--reverse' : ''}">
      <div class="split__copy">
${sec.title ? `        <h2 class="section__title" id="${id}" data-reveal>${esc(sec.title)}</h2>` : ''}
${html}
      </div>
${media}
    </div>
  </div>
</section>`;
  }

  return `<section class="section${alt}"${sec.title ? ` aria-labelledby="${id}"` : ''}>
  <div class="shell${/promises--grid|table-scroll|faq/.test(html) ? '' : ' shell--narrow'}">
${head}
${html}
${images.length ? `    <div class="media-grid" data-reveal>\n` + images.map((im) => `      <img src="${src(im.src)}" alt="${esc(im.alt || '')}" loading="lazy" decoding="async">`).join('\n') + `\n    </div>` : ''}
  </div>
</section>`;
}

// ------------------------------------------------------------------ page ---
function compose(slug) {
  const rec = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content', slug + '.json'), 'utf8'));
  const b = rec.blocks;

  const h1 = b.find((x) => x.type === 'h1');
  const h1i = b.indexOf(h1);

  // breadcrumb: the <li>s that immediately follow the h1 (or, on blog posts,
  // one text run of "Home Blog <date>" carrying its own links)
  const crumbs = [];
  let i = h1i + 1;
  let meta = null;
  while (b[i] && b[i].type === 'li' && crumbs.length < 3) crumbs.push(b[i++]);
  if (!crumbs.length) {
    const bc = splitBreadcrumbText(b[i]);
    if (bc) {
      crumbs.push(...bc.crumbs);
      meta = bc.meta || null;
      i++;
    }
  }

  const tailStart = b.findIndex((x) => x.type === 'h2' && /5-?star/i.test(x.text || ''));
  const reviews = tailStart >= 0 ? reviewsSection(b, tailStart, slug) : null;

  // The reviews block is not always last: on several pages real content follows
  // it. Treat it as one item in document order rather than as the page tail.
  const pre = b.slice(i, tailStart >= 0 ? tailStart : b.length);
  const post = reviews ? b.slice(reviews.end) : [];

  // hero lede: the first paragraph of the body, hoisted out of section one
  let lede = null;
  if (pre[0] && pre[0].type === 'h2' && isText(pre[1])) {
    lede = pre[1];
    pre.splice(1, 1);
  }

  // Most legacy pages use h2 for section breaks, but several blog posts skip
  // h2 entirely and use h3 instead. Pick whichever level is actually present.
  const toSections = (list) => {
    const level = list.some((x) => x.type === 'h2') ? 'h2' : (list.some((x) => x.type === 'h3') ? 'h3' : null);
    const acc = [];
    let cur = { title: null, items: [] };
    for (const blk of list) {
      if (level && blk.type === level) {
        if (cur.title || cur.items.length) acc.push(cur);
        cur = { title: blk.text, items: [] };
      } else cur.items.push(blk);
    }
    if (cur.title || cur.items.length) acc.push(cur);
    return acc;
  };

  const sectionsPre = toSections(pre);
  const sectionsPost = toSections(post);
  const sections = [...sectionsPre, ...sectionsPost];

  const hero = `<!-- ============================================================== PAGE HERO -->
<section class="page-hero" aria-labelledby="page-title">
  <div class="page-hero__wash" aria-hidden="true"></div>
  <div class="shell page-hero__inner">
${crumbs.length ? `    <nav class="crumbs" aria-label="Breadcrumb">
      <ol>
        <li><a href="index.html">${esc(crumbs[0].text)}</a></li>
${crumbs.slice(1).map((c) => c.href ? `        <li><a href="${href(c.href)}">${esc(c.text)}</a></li>` : `        <li aria-current="page">${esc(c.text)}</li>`).join('\n')}
      </ol>
    </nav>` : ''}
    <h1 class="page-hero__title" id="page-title" data-reveal>${esc(h1 ? h1.text : rec.meta.title)}</h1>
${meta ? `    <p class="page-hero__meta" data-reveal data-reveal-delay="1">${esc(meta)}</p>` : ''}
${lede ? `    <p class="page-hero__lede" data-reveal data-reveal-delay="1">${esc(lede.text)}</p>` : ''}
    <div class="page-hero__actions" data-reveal data-reveal-delay="2">
      <a class="btn btn--primary btn--lg" href="index.html#appointment">Request Consultation</a>
      <a class="btn btn--ghost btn--lg" href="invisalign-quiz.html">Take the 30-second quiz</a>
    </div>
  </div>
</section>`;

  let n = 0;
  const body = [hero, ...sectionsPre.map((sec) => renderSection(sec, n++))];
  if (reviews) body.push(reviews.html);
  body.push(...sectionsPost.map((sec) => renderSection(sec, n++)));

  fs.writeFileSync(path.join(ROOT, 'src/pages', slug + '.body.html'), body.join('\n\n') + '\n');

  const cfg = {
    title: rec.meta.title,
    description: rec.meta.description,
    canonical: `https://www.drdantegonzales.com/${slug}.html`,
    ogType: 'article',
    jsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.drdantegonzales.com/' },
        ...(crumbs[1] ? [{ '@type': 'ListItem', position: 2, name: crumbs[1].text, item: `https://www.drdantegonzales.com/${slug}.html` }] : []),
      ],
    }],
  };

  // an FAQ section earns FAQPage schema
  const faqSec = sections.find((s) => /frequently asked|faqs?\b/i.test(s.title || ''));
  if (faqSec) {
    const entries = [];
    for (let k = 0; k < faqSec.items.length - 1; k++) {
      if (faqSec.items[k].type === 'h4' && isText(faqSec.items[k + 1])) {
        entries.push({ '@type': 'Question', name: faqSec.items[k].text, acceptedAnswer: { '@type': 'Answer', text: faqSec.items[k + 1].text } });
      }
    }
    if (entries.length) cfg.jsonLd.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: entries });
  }

  fs.writeFileSync(path.join(ROOT, 'src/pages', slug + '.json'), JSON.stringify(cfg, null, 2) + '\n');
  return { slug, sections: sections.length, reviews: !!reviews };
}

for (const slug of process.argv.slice(2)) {
  const r = compose(slug);
  console.log(`composed ${r.slug}  (${r.sections} sections${r.reviews ? ', reviews' : ''})`);
}
if (warnings.length) {
  console.log('\nWARNINGS');
  for (const w of warnings) console.log('  ! ' + w);
}
