/* Dante Gonzales Orthodontics — branded preloader.
   ------------------------------------------------------------------
   A preloader on a lead-generation site is a conversion risk: every
   millisecond it holds is a millisecond a parent looking for an
   orthodontist is staring at a logo instead of a phone number. So
   this one is built around getting out of the way:

     · it never appears for a repeat view in the same session
     · it never appears for a deep link, a restored scroll position,
       or a visitor who has asked for reduced motion
     · it hard-caps at 1100ms no matter what is still downloading
     · the first scroll, tap or keypress dismisses it immediately —
       intent to read always outranks the animation
     · a page opened in a background tab skips it outright: rAF is
       paused there, so an animated exit would stall and leave the
       panel up until the tab is focused
     · it does not lock scrolling, so it can never cause a shift

   The progress bar tracks real milestones (fonts, hero image, load)
   rather than a fake timer, and the exit hands straight off into the
   hero entrance so the two read as one motion.
   ------------------------------------------------------------------ */
(function (window, document) {
  'use strict';

  var root = document.documentElement;
  var panel = document.querySelector('[data-preloader]');
  var gsap = window.gsap;

  var HERO_SEL = '[data-hero-intro]';
  var SESSION_KEY = 'dgo:intro-seen';
  var MAX_MS = 1100;

  /* Reveals the hero and lets the rest of the page get on with it.
     Every exit path funnels through here exactly once. */
  var done = false;
  function finish() {
    if (done) return;
    done = true;
    root.classList.add('hero-ready');
    /* Drop any from-state the exit timeline had already written, so a
       bail-out can never leave the hero stranded at opacity 0. */
    if (gsap) gsap.set(HERO_SEL, { clearProps: 'all' });
    if (panel && panel.parentNode) panel.remove();
    if (window.Motion) window.Motion.refresh();
    document.dispatchEvent(new CustomEvent('site:ready'));
  }

  /* ---- Should it run at all? -------------------------------------- */
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var deepLink = !!window.location.hash || window.scrollY > 0;
  var seen = false;
  try { seen = window.sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { /* private mode */ }

  if (!panel || !gsap || reduced || deepLink || seen || document.hidden) {
    finish();
    return;
  }

  try { window.sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) { /* private mode */ }

  /* ---- Real loading progress --------------------------------------
     Weighted milestones, plus a slow creep so the bar is never frozen
     while a slow font request decides what it is doing. */
  var bar = panel.querySelector('[data-preloader-bar]');
  var logo = panel.querySelector('.pl-logo');
  var progress = 0.08;

  function advance(amount) {
    progress = Math.min(progress + amount, 1);
    if (bar) gsap.to(bar, { scaleX: progress, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { advance(0.32); });
  } else {
    advance(0.32);
  }

  var hero = document.querySelector('[data-hero-img]');
  if (hero && !hero.complete) {
    hero.addEventListener('load', function () { advance(0.36); }, { once: true });
    hero.addEventListener('error', function () { advance(0.36); }, { once: true });
  } else {
    advance(0.36);
  }

  window.addEventListener('load', function () { advance(0.3); }, { once: true });

  var creep = setInterval(function () { advance(0.03); }, 160);

  var poll;

  /* ---- Exit ---------------------------------------------------------
     Panel wipes up; the hero content is already rising underneath it
     before the wipe clears, which is what makes the handoff read as
     one continuous move rather than two separate animations. */
  function exit() {
    if (done) return;
    clearInterval(creep);
    clearInterval(poll);

    /* No rAF in a hidden tab — animating here would stall mid-wipe. */
    if (document.hidden) { finish(); return; }

    window.removeEventListener('scroll', exit);
    window.removeEventListener('keydown', exit);
    window.removeEventListener('pointerdown', exit);

    var heroBits = document.querySelectorAll(HERO_SEL);
    var tl = gsap.timeline({ onComplete: function () { finish(); } });

    /* Phase 1 — completion flourish */
    if (bar) tl.to(bar, { scaleX: 1, duration: 0.18, ease: 'power2.out' });

    /* Phase 2 — logo exits with scale + fade */
    if (logo) {
      tl.to(logo, {
        y: -10, opacity: 0, scale: 0.92,
        duration: 0.28, ease: 'power2.in'
      }, '-=0.05');
    }

    /* Phase 3 — panel reveals page with a smooth wipe.
       clipPath inset creates a curtain-open feel that is more refined
       than a simple slide. Falls back to yPercent on browsers without
       clipPath animation support. */
    var supportsClipPath = CSS.supports && CSS.supports('clip-path', 'inset(0)');
    if (supportsClipPath) {
      tl.to(panel, {
        clipPath: 'inset(0 0 100% 0)',
        duration: 0.55,
        ease: 'power3.inOut'
      }, '-=0.10');
    } else {
      tl.to(panel, {
        yPercent: -100,
        duration: 0.6,
        ease: 'power3.inOut'
      }, '-=0.10');
    }

    /* Phase 4 — hero copy enters under the lifting panel. */
    if (heroBits.length) {
      root.classList.add('hero-ready');
      tl.fromTo(heroBits,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out', stagger: 0.06, clearProps: 'transform' },
        '-=0.35');
    }
  }

  /* Whichever comes first: everything loaded, the ceiling, or the
     visitor showing they would rather be reading. */
  poll = setInterval(function () {
    if (progress >= 1) { exit(); }
  }, 80);
  setTimeout(function () { clearInterval(poll); exit(); }, MAX_MS);

  /* Last-resort backstop, independent of the exit timeline. If anything
     at all goes wrong above, the page is handed over anyway — a stuck
     panel on a lead-generation site is the worst failure mode there is. */
  setTimeout(finish, MAX_MS + 1500);

  window.addEventListener('scroll', exit, { passive: true, once: true });
  window.addEventListener('keydown', exit, { once: true });
  window.addEventListener('pointerdown', exit, { once: true });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) finish();
  });
})(window, document);
