/* Dante Gonzales Orthodontics — motion system.
   ------------------------------------------------------------------
   One place that owns every scroll-driven animation on the site.
   Markup declares intent with data attributes; nothing here is
   hard-coded to a section, so new pages get the same behaviour for
   free by adding an attribute.

     data-anim="fade-up|fade|fade-left|fade-right|scale|mask|clip"
     data-anim-text                  per-word stagger on headings
     data-anim-delay="120"          delay in ms
     data-anim-start="top 85%"      ScrollTrigger start override
     data-anim-group                stagger this element's children
     data-anim-group="selector"     ...or just the matching descendants
     data-anim-stagger="70"         per-child offset in ms
     data-count-to="12000"          count-up when scrolled into view
     data-parallax="30"             px of scrubbed drift (desktop only)

   Design rules this file sticks to:
   · transform + opacity only, so the compositor does the work
   · every entrance runs `once` and disposes its own ScrollTrigger
   · gsap.matchMedia() owns all registration, so a breakpoint change
     or a reduced-motion toggle tears down and rebuilds cleanly
   · reduced motion is a real branch, not a speed reduction
   ------------------------------------------------------------------ */
(function (window, document) {
  'use strict';

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  var root = document.documentElement;

  /* If the bundle failed to arrive, the <head> watchdog has already
     revealed everything. Bail out rather than half-initialising. */
  if (!gsap || !ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  var EASE = 'power2.out';
  var DUR = 0.7;

  /* ---- Helpers --------------------------------------------------- */
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };
  var ms = function (v, fallback) {
    var n = parseFloat(v);
    return isNaN(n) ? fallback : n / 1000;
  };

  /* The from-state for each animation name. Mirrors the pre-paint CSS
     in input.css — if you change one, change both. */
  var FROM = {
    'fade':       { opacity: 0 },
    'fade-up':    { opacity: 0, y: 24 },
    'fade-right': { opacity: 0, x: -24 },
    'fade-left':  { opacity: 0, x: 24 },
    'scale':      { opacity: 0, scale: 0.96 },
    'clip':       { opacity: 0 }
  };

  /* GSAP attaches internal bookkeeping to the vars objects it is handed,
     so each tween gets its own copy rather than sharing one literal
     across all forty-odd animated elements. */
  var from = function (name) {
    var src = FROM[name] || FROM['fade-up'];
    var out = {};
    for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) out[k] = src[k];
    return out;
  };

  /* GSAP owns `opacity` and `transform` on animated elements. If CSS also
     declares a transition for either — Tailwind's bare `transition`
     utility lists both — the browser tries to interpolate every frame
     GSAP writes, and the reveal rubber-bands on the way in then drifts
     again when clearProps fires. Rather than rely on every author
     remembering that, the system suspends transitions for the duration
     of the entrance and restores them afterwards. */
  var suspendTransitions = function () {
    this.targets().forEach(function (t) { t.style.transitionProperty = 'none'; });
  };
  var restoreTransitions = function () {
    this.targets().forEach(function (t) { t.style.transitionProperty = ''; });
  };

  /* Elements inside a stagger group are driven by their parent, so they
     must not also register a trigger of their own. */
  var isGrouped = function (el) {
    var group = el.closest('[data-anim-group]');
    return !!group && group !== el;
  };

  /* ---- mask: a curtain slides off, the image settles from a slight
     over-scale. Both transforms, so it stays off the main thread. --- */
  var buildMask = function (el) {
    var cover = el.querySelector('.anim-cover');
    if (!cover) {
      cover = document.createElement('span');
      cover.className = 'anim-cover';
      cover.setAttribute('aria-hidden', 'true');
      el.appendChild(cover);
    }
    return { cover: cover, media: el.querySelector('img, video') };
  };

  /* ---- Text reveals: per-word stagger for key headings ----------
     Opt in with data-anim-text on a heading. Words are wrapped in
     spans once on init — the DOM mutation is minimal and happens
     before the first paint. */
  function registerTextReveals() {
    $$('[data-anim-text]').forEach(function (el) {
      if (el.querySelector('.anim-word')) return;

      var html = el.innerHTML;
      el.innerHTML = html.replace(/(\S+)/g, '<span class="anim-word" style="display:inline-block">$1</span>');

      var words = $$('.anim-word', el);
      if (!words.length) return;

      gsap.fromTo(words,
        { opacity: 0, y: 12, rotateX: -8 },
        {
          opacity: 1, y: 0, rotateX: 0,
          duration: 0.6, ease: EASE,
          stagger: 0.03,
          clearProps: 'transform',
          onStart: suspendTransitions,
          onComplete: restoreTransitions,
          scrollTrigger: {
            trigger: el,
            start: el.dataset.animStart || 'top 85%',
            once: true
          }
        }
      );
    });
  }

  /* ---- Entrance animations --------------------------------------- */
  function registerEntrances() {
    $$('[data-anim]').forEach(function (el) {
      if (isGrouped(el)) return;

      var name = el.dataset.anim || 'fade-up';
      var start = el.dataset.animStart || 'top 88%';
      var delay = ms(el.dataset.animDelay, 0);

      if (name === 'mask') {
        var parts = buildMask(el);
        var tl = gsap.timeline({
          defaults: { ease: 'power3.inOut' },
          scrollTrigger: { trigger: el, start: start, once: true },
          delay: delay
        });
        tl.fromTo(parts.cover, { scaleY: 1 }, { scaleY: 0, duration: 0.9 });
        if (parts.media) {
          tl.fromTo(parts.media, { scale: 1.12 }, { scale: 1, duration: 1.1, ease: 'power2.out' }, 0);
        }
        // The curtain has no job once it has run.
        tl.eventCallback('onComplete', function () { parts.cover.remove(); });
        return;
      }

      /* clip: a clip-path inset wipe. Falls back to fade-up on browsers
         that don't support clip-path animation. */
      if (name === 'clip') {
        var supportsClip = CSS.supports && CSS.supports('clip-path', 'inset(0)');
        if (supportsClip) {
          gsap.fromTo(el,
            { opacity: 0, clipPath: 'inset(8% 0% 8% 0%)' },
            {
              opacity: 1, clipPath: 'inset(0% 0% 0% 0%)',
              duration: 0.9, ease: 'power2.out', delay: delay,
              clearProps: 'clipPath',
              onStart: suspendTransitions,
              onComplete: restoreTransitions,
              scrollTrigger: { trigger: el, start: start, once: true }
            }
          );
        } else {
          gsap.fromTo(el, from('fade-up'), {
            opacity: 1, x: 0, y: 0, scale: 1,
            duration: DUR, ease: EASE, delay: delay,
            clearProps: 'transform',
            onStart: suspendTransitions,
            onComplete: restoreTransitions,
            scrollTrigger: { trigger: el, start: start, once: true }
          });
        }
        return;
      }

      gsap.fromTo(el, from(name), {
        opacity: 1, x: 0, y: 0, scale: 1,
        duration: DUR, ease: EASE, delay: delay,
        clearProps: 'transform',
        onStart: suspendTransitions,
        onComplete: restoreTransitions,
        scrollTrigger: { trigger: el, start: start, once: true }
      });
    });
  }

  /* ---- Staggered groups -------------------------------------------
     One trigger per group instead of one per card: fewer observers,
     and the children land in reading order rather than at random. */
  function registerGroups() {
    $$('[data-anim-group]').forEach(function (group) {
      var sel = group.dataset.animGroup;
      var kids = sel ? $$(sel, group) : Array.prototype.slice.call(group.children);
      kids = kids.filter(function (k) { return k.hasAttribute('data-anim'); });
      if (!kids.length) return;

      var name = kids[0].dataset.anim || 'fade-up';
      var each = ms(group.dataset.animStagger, 0.07);

      gsap.fromTo(kids, from(name), {
        opacity: 1, x: 0, y: 0, scale: 1,
        duration: DUR, ease: EASE,
        stagger: each,
        clearProps: 'transform',
        onStart: suspendTransitions,
        onComplete: restoreTransitions,
        scrollTrigger: {
          trigger: group,
          start: group.dataset.animStart || 'top 85%',
          once: true
        }
      });
    });
  }

  /* ---- Count-up ----------------------------------------------------
     The number is the message here, so it animates on arrival and is
     written as plain text the whole way (screen readers read the
     final value once the tween settles). */
  function registerCounters() {
    $$('[data-count-to]').forEach(function (el) {
      var target = parseInt(el.dataset.countTo, 10);
      if (isNaN(target)) return;
      var proxy = { v: 0 };

      gsap.to(proxy, {
        v: target,
        duration: 1.6,
        ease: 'power2.out',
        onUpdate: function () { el.textContent = Math.round(proxy.v).toLocaleString(); },
        scrollTrigger: { trigger: el, start: 'top 92%', once: true }
      });
    });
  }

  /* ---- Parallax ----------------------------------------------------
     Deliberately tiny and desktop-only. On a phone the viewport is
     short enough that drift reads as misalignment, not depth. */
  function registerParallax() {
    $$('[data-parallax]').forEach(function (el) {
      var dist = parseFloat(el.dataset.parallax) || 24;
      gsap.fromTo(el, { y: -dist }, {
        y: dist,
        ease: 'none',
        scrollTrigger: {
          trigger: el.closest('section, footer') || el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.6,
          invalidateOnRefresh: true
        }
      });
    });
  }

  /* ---- Scroll progress --------------------------------------------
     Useful on a page this long: it answers "how much is left?" while
     costing one scaleX per frame. */
  function registerProgress() {
    var bar = document.querySelector('[data-scroll-progress]');
    if (!bar) return;

    gsap.to(bar, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.3,
        onUpdate: function (self) {
          bar.classList.toggle('is-active', self.progress > 0.02);
        }
      }
    });
  }

  /* ---- Registration ------------------------------------------------ */
  var mm = gsap.matchMedia();

  /* Full experience. matchMedia tears every trigger below down if the
     user flips the reduced-motion switch or crosses the breakpoint. */
  mm.add('(prefers-reduced-motion: no-preference)', function () {
    registerTextReveals();
    registerEntrances();
    registerGroups();
    registerCounters();
    registerProgress();
  });

  mm.add('(prefers-reduced-motion: no-preference) and (min-width: 1024px)', function () {
    registerParallax();
  });

  /* Reduced motion: content is already visible via CSS. Counters still
     need their final value, and the progress bar is a static indicator
     rather than a moving one — both are information, not decoration. */
  mm.add('(prefers-reduced-motion: reduce)', function () {
    $$('[data-anim]').forEach(function (el) {
      gsap.set(el, { clearProps: 'all' });
      var cover = el.querySelector('.anim-cover');
      if (cover) cover.remove();
    });
    $$('[data-anim-text] .anim-word').forEach(function (w) {
      gsap.set(w, { clearProps: 'all' });
    });
    $$('[data-count-to]').forEach(function (el) {
      var n = parseInt(el.dataset.countTo, 10);
      if (!isNaN(n)) el.textContent = n.toLocaleString();
    });
    registerProgress();
  });

  /* Hand off from the CSS pre-state. Everything above has already
     written its inline from-values, so this swap is invisible. */
  root.classList.add('motion-ready');
  window.__motionInit = true;

  /* Lazy images and late fonts change element positions after the
     first measurement pass — re-measure once each settles. */
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }

  /* Small, deliberate public surface for page-level scripts. */
  window.Motion = {
    refresh: function () { ScrollTrigger.refresh(); },
    reduced: function () { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; },
    ease: EASE
  };

  document.dispatchEvent(new CustomEvent('motion:ready'));
})(window, document);
