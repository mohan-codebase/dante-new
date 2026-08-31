/* =============================================================================
   Dante Gonzales Orthodontics — homepage behaviour
   Vanilla ES2019. Every module is optional: if its markup is absent it exits.
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var desktopNav   = window.matchMedia('(min-width: 1181px)');

  /* ------------------------------------------------------------ preloader */
  (function initPreloader() {
    var preloader = $('#preloader');
    if (!preloader) return;

    // Trigger smooth progress bar fill
    window.requestAnimationFrame(function () {
      preloader.classList.add('is-animating');
    });

    // Run for 2 seconds on every load / refresh
    var LOAD_DURATION = 2000;
    window.setTimeout(function () {
      preloader.classList.add('is-done');
      window.setTimeout(function () {
        if (preloader && preloader.parentNode) preloader.remove();
      }, 650);
    }, LOAD_DURATION);
  })();

  /* --------------------------------------------------------------- header */
  (function initHeader() {
    var header = $('#header');
    var toTop  = $('#toTop');

    var ticking = false;
    var shrunk = false;
    function update() {
      var scrollY = window.scrollY || window.pageYOffset;
      if (header) {
        var next = scrollY > 20;
        if (next !== shrunk) {
          shrunk = next;
          header.classList.toggle('is-scrolled', next);
          // The bar narrows on scroll, so a flyout left open while the page
          // moves has to be re-measured once the width has settled.
          if (header.classList.contains('is-flyout-open')) {
            window.setTimeout(function () {
              var inner = header.querySelector('.nav__item--has-menu.is-open .mega__inner');
              header.style.setProperty('--flyout-h', inner ? inner.offsetHeight + 'px' : '0px');
            }, 460);
          }
        }
      }
      if (toTop) {
        var show = scrollY > window.innerHeight * 0.9;
        toTop.hidden = !show;
        toTop.classList.toggle('is-visible', show);
      }
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();
  })();

  /* ------------------------------------------------------------------ nav */
  /* apple.com-style global nav. On desktop a top-level item is opened by CLICK
     and the panel grows out of the bar: JS measures the panel's content and
     publishes it as --flyout-h, which the curtain (the glass under the bar)
     and every panel animate their height to. Because all panels read the same
     variable, switching menus keeps the glass and the clipping in lockstep.
     On mobile the same markup collapses into a full-height sheet with in-place
     accordions. */
  (function navigation() {
    var header = $('#header');
    var nav    = $('#nav');
    var burger = $('#burger');
    var scrim  = $('.nav-scrim');
    if (!header || !nav || !burger) return;

    var items = $$('.nav__item--has-menu', nav);

    function openItem() {
      return items.filter(function (i) { return i.classList.contains('is-open'); })[0] || null;
    }

    /* ---- the curtain ---- */
    function setFlyout(item) {
      if (!desktopNav.matches) return;
      var inner = item && $('.mega__inner', item);
      header.style.setProperty('--flyout-h', inner ? inner.offsetHeight + 'px' : '0px');
      header.classList.toggle('is-flyout-open', !!item);
    }

    function showScrim(on) {
      if (!scrim) return;
      if (on) {
        scrim.hidden = false;
        window.requestAnimationFrame(function () { scrim.classList.add('is-visible'); });
      } else {
        scrim.classList.remove('is-visible');
        window.setTimeout(function () {
          if (!scrim.classList.contains('is-visible')) scrim.hidden = true;
        }, 320);
      }
    }

    function closeAll(except) {
      items.forEach(function (item) {
        if (item === except) return;
        item.classList.remove('is-open');
        var t = $('.nav__toggle', item);
        if (t) t.setAttribute('aria-expanded', 'false');
      });
      if (!except) {
        setFlyout(null);
        if (desktopNav.matches) showScrim(false);
      }
    }

    function toggleItem(item, open) {
      var toggle = $('.nav__toggle', item);
      var next = typeof open === 'boolean' ? open : !item.classList.contains('is-open');
      if (next) closeAll(item);
      item.classList.toggle('is-open', next);
      if (toggle) toggle.setAttribute('aria-expanded', String(next));

      if (desktopNav.matches) {
        setFlyout(next ? item : null);
        showScrim(next);
      }
    }

    /* ---- hover intent (desktop, real pointers only) ----
       Pointing at an item opens it after a short beat, so brushing past the
       bar on the way somewhere else never flashes a panel. Once one panel is
       open, moving along the bar swaps instantly -- the curtain is already
       down, so a second delay would just feel sticky. Leaving keeps the panel
       up for a grace period, which is what lets the mouse cut a diagonal from
       the link to the far side of the panel. */
    var hoverPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    var HOVER_OPEN_DELAY  = 90;
    var HOVER_CLOSE_DELAY = 220;
    var hoverTimer = null;

    function hoverNav() { return desktopNav.matches && hoverPointer.matches; }
    function clearHoverTimer() {
      if (hoverTimer) { window.clearTimeout(hoverTimer); hoverTimer = null; }
    }

    items.forEach(function (item) {
      var toggle = $('.nav__toggle', item);
      if (!toggle) return;
      toggle.addEventListener('click', function (e) {
        // Desktop pointer users get a real link: it goes to the section's
        // landing page, and the menu is already there on hover / focus.
        if (hoverNav()) return;
        // Mobile sheet and no-hover devices: the link can't take you anywhere
        // useful on its own, so it expands the submenu in place instead --
        // that is the only route to the sub-pages here.
        e.preventDefault();
        clearHoverTimer();
        toggleItem(item);
      });

      // Keyboard: focusing the link on desktop opens its menu, so the links
      // inside can be tabbed to. Enter still follows the link.
      toggle.addEventListener('focus', function () {
        if (!hoverNav()) return;
        clearHoverTimer();
        if (!item.classList.contains('is-open')) toggleItem(item, true);
      });

      // the panel is a child of the item, so moving down into it never leaves
      item.addEventListener('mouseenter', function () {
        if (!hoverNav()) return;
        clearHoverTimer();
        if (item.classList.contains('is-open')) return;
        var delay = openItem() ? 0 : HOVER_OPEN_DELAY;
        if (!delay) { toggleItem(item, true); return; }
        hoverTimer = window.setTimeout(function () {
          hoverTimer = null;
          toggleItem(item, true);
        }, delay);
      });

      item.addEventListener('mouseleave', function () {
        if (!hoverNav()) return;
        clearHoverTimer();
        hoverTimer = window.setTimeout(function () {
          hoverTimer = null;
          closeAll();
        }, HOVER_CLOSE_DELAY);
      });
    });

    // leaving the bar entirely gets the same grace period, so a pointer that
    // clips the edge of the header on its way back in keeps the panel up
    header.addEventListener('mouseleave', function () {
      if (!hoverNav()) return;
      clearHoverTimer();
      hoverTimer = window.setTimeout(function () {
        hoverTimer = null;
        closeAll();
      }, HOVER_CLOSE_DELAY);
    });
    header.addEventListener('mouseenter', function () {
      if (hoverNav()) clearHoverTimer();
    });

    // a flyout is part of the bar, so a click anywhere else dismisses it
    document.addEventListener('click', function (e) {
      if (!desktopNav.matches) return;
      if (!header.contains(e.target)) { clearHoverTimer(); closeAll(); }
    });

    /* ---- mobile sheet ---- */
    var lastFocused = null;

    function openSheet() {
      lastFocused = document.activeElement;
      header.classList.add('is-nav-open');
      nav.classList.add('is-open');
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Close menu');
      document.body.classList.add('is-locked');
      showScrim(true);
    }

    function closeSheet() {
      header.classList.remove('is-nav-open');
      nav.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Open menu');
      document.body.classList.remove('is-locked');
      showScrim(false);
      closeAll();
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    }

    burger.addEventListener('click', function () {
      nav.classList.contains('is-open') ? closeSheet() : openSheet();
    });
    $$('[data-nav-close]').forEach(function (el) {
      el.addEventListener('click', function () {
        desktopNav.matches ? closeAll() : closeSheet();
      });
    });

    // close the sheet after following a link out of it
    $$('a', nav).forEach(function (a) {
      // the parent links only expand a submenu on mobile -- they must not
      // collapse the whole sheet
      if (a.classList.contains('nav__toggle')) return;
      a.addEventListener('click', function () {
        if (!desktopNav.matches && nav.classList.contains('is-open')) closeSheet();
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      clearHoverTimer();
      if (!desktopNav.matches && nav.classList.contains('is-open')) { closeSheet(); return; }
      var open = openItem();
      if (open) {
        var toggle = $('.nav__toggle', open);
        closeAll();
        if (toggle) toggle.focus();
      }
    });

    // tabbing past the last link in an open flyout should close it
    nav.addEventListener('focusout', function (e) {
      if (!desktopNav.matches) return;
      var open = openItem();
      if (open && e.relatedTarget && !open.contains(e.relatedTarget) &&
          e.relatedTarget !== $('.nav__toggle', open)) {
        closeAll();
      }
    });

    // keep focus inside the sheet while it is open
    nav.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || desktopNav.matches || !nav.classList.contains('is-open')) return;
      var focusables = [burger].concat($$('a[href], button:not([disabled])', nav))
        .filter(function (el) { return el.offsetParent !== null; });
      if (!focusables.length) return;
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // a resize changes the panel's natural height, so re-measure it
    var resizeTick;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTick);
      resizeTick = window.setTimeout(function () {
        var open = openItem();
        if (open && desktopNav.matches) setFlyout(open);
      }, 120);
    });

    // lazily-loaded images inside a panel can change its height after opening
    $$('.mega img', nav).forEach(function (img) {
      img.addEventListener('load', function () {
        var open = openItem();
        if (open && desktopNav.matches && open.contains(img)) setFlyout(open);
      });
    });

    desktopNav.addEventListener('change', function () {
      clearHoverTimer();
      closeAll();
      header.style.setProperty('--flyout-h', '0px');
      header.classList.remove('is-flyout-open');
      if (desktopNav.matches && nav.classList.contains('is-open')) closeSheet();
    });
  })();

  /* --------------------------------------------------------------- reveal */
  (function reveal() {
    var els = $$('[data-reveal]');
    if (!els.length) return;

    els.forEach(function (el) {
      var d = el.getAttribute('data-reveal-delay');
      if (d) el.style.setProperty('--reveal-delay', d);
    });

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    els.forEach(function (el) { io.observe(el); });

    // Failsafe: if the observer never gets a chance to run (background tab on
    // first paint, an odd engine), nothing on screen should stay invisible.
    function sweep() {
      els.forEach(function (el) {
        if (el.classList.contains('is-in')) return;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          el.classList.add('is-in');
          io.unobserve(el);
        }
      });
    }
    window.addEventListener('load', sweep);
    window.setTimeout(sweep, 3000);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) sweep();
    });
  })();

  /* ------------------------------------------------------------- counters */
  (function counters() {
    var els = $$('[data-count]');
    if (!els.length) return;

    function run(el) {
      var target = parseFloat(el.getAttribute('data-count')) || 0;
      var suffix = el.getAttribute('data-count-suffix') || '';
      if (reduceMotion.matches) { el.textContent = target.toLocaleString('en-US') + suffix; return; }

      var start = null, dur = 1500, done = false;
      function finish() {
        if (done) return;
        done = true;
        el.textContent = target.toLocaleString('en-US') + suffix;
      }
      function step(ts) {
        if (done) return;
        if (start === null) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString('en-US') + suffix;
        if (p < 1) window.requestAnimationFrame(step); else finish();
      }
      window.requestAnimationFrame(step);
      // never leave a throttled tab showing a half-counted number
      window.setTimeout(finish, dur + 400);
    }

    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        run(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ------------------------------------------------------------- parallax */
  (function parallax() {
    var els = $$('[data-parallax]');
    if (!els.length || reduceMotion.matches || window.innerWidth < 900) return;

    var ticking = false;
    function update() {
      var vh = window.innerHeight;
      els.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var amount = parseFloat(el.getAttribute('data-parallax')) || 10;
        var progress = (r.top + r.height / 2 - vh / 2) / vh;   // -1 … 1
        el.style.transform = 'translate3d(0,' + (-progress * amount).toFixed(2) + 'px,0)';
      });
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  })();

  /* --------------------------------------------------- before / after slider */
  (function beforeAfter() {
    var root = $('[data-ba]');
    if (!root) return;

    var stage  = $('.ba__stage', root);
    var range  = $('[data-ba-range]', root);
    var before = $('[data-ba-before]', root);
    var after  = $('[data-ba-after]', root);
    var thumbs = $$('[data-ba-case]', root);
    if (!stage || !range || !before || !after) return;

    function setPos(value) {
      var v = Math.max(0, Math.min(100, value));
      stage.style.setProperty('--ba-pos', v + '%');
      range.value = String(v);
      range.setAttribute('aria-valuetext', Math.round(v) + '% before, ' + Math.round(100 - v) + '% after');
    }

    range.addEventListener('input', function () { setPos(parseFloat(range.value)); });

    function pointerPos(clientX) {
      var r = stage.getBoundingClientRect();
      setPos(((clientX - r.left) / r.width) * 100);
    }

    var dragging = false;

    // The panes are <img>, which Chrome and Firefox will happily start a native
    // drag-and-drop on: that fires pointercancel a few pixels into the gesture
    // and the handle freezes mid-drag. Refuse the drag outright.
    stage.addEventListener('dragstart', function (e) { e.preventDefault(); });

    function endDrag(e) {
      dragging = false;
      if (e && stage.hasPointerCapture && stage.hasPointerCapture(e.pointerId)) {
        stage.releasePointerCapture(e.pointerId);
      }
    }

    stage.addEventListener('pointerdown', function (e) {
      // Mouse: left button only. A right-click would otherwise start a drag that
      // never ends -- contextmenu eats the pointerup -- leaving the handle glued
      // to the cursor. Touch and pen always report button 0.
      if (e.button !== 0) return;
      e.preventDefault();                 // also suppresses the native image drag
      dragging = true;
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
      pointerPos(e.clientX);
    });
    stage.addEventListener('pointermove', function (e) { if (dragging) pointerPos(e.clientX); });
    stage.addEventListener('pointerup', function (e) {
      if (dragging) pointerPos(e.clientX);   // land exactly where released
      endDrag(e);
    });
    stage.addEventListener('pointercancel', endDrag);
    // If capture is lost some other way (alt-tab, a native gesture), stop dragging.
    stage.addEventListener('lostpointercapture', endDrag);

    thumbs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var n = btn.getAttribute('data-ba-case');
        // files are zero-padded: assets/cases/case-01-before.webp
        var pad = String(n).length < 2 ? '0' + n : String(n);
        before.src = 'assets/cases/case-' + pad + '-before.webp';
        after.src  = 'assets/cases/case-' + pad + '-after.webp';
        before.alt = 'Patient ' + n + '’s teeth before orthodontic treatment at Dante Gonzales Orthodontics';
        after.alt  = 'Patient ' + n + '’s teeth after orthodontic treatment at Dante Gonzales Orthodontics';
        thumbs.forEach(function (b) {
          var active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-selected', String(active));
        });
        setPos(50);
      });

      btn.addEventListener('keydown', function (e) {
        var i = thumbs.indexOf(btn);
        var next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
        if (next < 0 || next >= thumbs.length) return;
        e.preventDefault();
        thumbs[next].focus();
        thumbs[next].click();
      });
    });

    setPos(50);
  })();

  /* ------------------------------------------------------- rotating banner */
  /* The homepage hero holds several banners on the same spot and crossfades
     between them. Everything is read off the markup — the dots, the "n of m"
     announcement and the slide count all come from however many
     [data-banner-slide] elements are present — so a banner is added or removed
     in index.html alone. Each slide declares the tone of its photograph
     (data-tone); the active one is published onto the section, and onto the
     header, so the copy and the nav over it stay legible either way. */
  (function banner() {
    var root = $('[data-banner]');
    if (!root) return;

    var slides = $$('[data-banner-slide]', root);
    if (!slides.length) return;

    var header = $('#header');
    var prev   = $('[data-banner-prev]', root);
    var next   = $('[data-banner-next]', root);
    var toggle = $('[data-banner-toggle]', root);
    var dotsEl = $('[data-banner-dots]', root);
    var status = $('[data-banner-status]', root);

    var interval = parseInt(root.getAttribute('data-banner-interval'), 10) || 7000;
    root.style.setProperty('--banner-interval', interval + 'ms');

    var index = Math.max(0, slides.indexOf($('[data-banner-slide].is-active', root)));
    var dots  = [];
    var timer = null;
    // paused by the visitor, as opposed to by a hover or a hidden tab: only
    // this one survives the pointer leaving the banner
    var stopped = false;
    // a single banner, or a visitor who asked for less motion, gets no timer
    var canRotate = slides.length > 1 && !reduceMotion.matches;

    slides.forEach(function (slide, i) {
      slide.setAttribute('aria-label', (i + 1) + ' of ' + slides.length);
    });

    if (dotsEl && slides.length > 1) {
      slides.forEach(function (slide, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'hero__dot';
        b.setAttribute('role', 'tab');
        var label = $('.hero__headline', slide);
        b.setAttribute('aria-label', label ? label.textContent.trim() : 'Banner ' + (i + 1));
        b.addEventListener('click', function () { go(i, true); });
        dotsEl.appendChild(b);
        dots.push(b);
      });
    }

    // one slide, or no autoplay: the dot's timer fill has nothing to count
    if (!canRotate) root.classList.add('is-static');
    if (slides.length < 2) {
      if (prev) prev.hidden = true;
      if (next) next.hidden = true;
      if (toggle) toggle.hidden = true;
      if (dotsEl) dotsEl.hidden = true;
    } else if (toggle && !canRotate) {
      toggle.hidden = true;
    }

    function apply() {
      slides.forEach(function (slide, i) {
        var on = i === index;
        slide.classList.toggle('is-active', on);
        slide.setAttribute('aria-hidden', String(!on));
        // visibility:hidden already drops the off slides out of the tab order;
        // this keeps them out during the fade, while both are still visible
        $$('a, button', slide).forEach(function (el) { el.tabIndex = on ? 0 : -1; });
      });

      dots.forEach(function (d, i) {
        var on = i === index;
        d.classList.toggle('is-active', on);
        d.setAttribute('aria-selected', String(on));
        d.tabIndex = on ? 0 : -1;
      });

      var tone = slides[index].getAttribute('data-tone') === 'dark' ? 'dark' : 'light';
      root.setAttribute('data-active-tone', tone);
      if (header) header.classList.toggle('is-banner-dark', tone === 'dark');

      if (status) status.textContent = 'Banner ' + (index + 1) + ' of ' + slides.length;
    }

    function go(n, byHand) {
      index = (n + slides.length) % slides.length;
      apply();
      if (byHand) {
        // a deliberate move restarts the clock rather than leaving the next
        // turn to land a fraction of a second later
        stopped = false;
        root.classList.remove('is-paused');
        if (toggle) toggle.setAttribute('aria-pressed', 'false');
        play();
      }
    }

    // The active dot doubles as the timer's read-out, so whenever the clock is
    // restarted its fill has to start over with it — a paused fill resumes
    // where it stopped, but a fresh interval does not.
    function restartFill() {
      var d = dots[index];
      if (!d) return;
      d.classList.remove('is-active');
      void d.offsetWidth;
      d.classList.add('is-active');
    }

    function play() {
      pause();
      if (!canRotate || stopped) return;
      timer = window.setInterval(function () { go(index + 1); }, interval);
      root.classList.remove('is-paused');
      restartFill();
    }
    function pause() {
      if (timer) { window.clearInterval(timer); timer = null; }
      if (canRotate) root.classList.add('is-paused');
    }

    if (prev) prev.addEventListener('click', function () { go(index - 1, true); });
    if (next) next.addEventListener('click', function () { go(index + 1, true); });

    if (toggle) {
      toggle.addEventListener('click', function () {
        stopped = !stopped;
        toggle.setAttribute('aria-pressed', String(stopped));
        toggle.setAttribute('aria-label', stopped ? 'Play the banner' : 'Pause the banner');
        // is-stopped drives the icon, is-paused only holds the timer's fill:
        // a momentary hold should not make the button claim it was pressed
        root.classList.toggle('is-stopped', stopped);
        stopped ? pause() : play();
      });
    }

    // Hovering is NOT a pause here: the banner fills the viewport, so the
    // pointer rests over it most of the time and a hover-pause would leave it
    // stuck on slide one. Only the foot holds off — so a pointer travelling to
    // the dots does not have them move first — along with keyboard focus, a
    // hidden tab, and the explicit pause button.
    var foot = $('.hero__foot', root);
    if (foot) {
      foot.addEventListener('mouseenter', pause);
      foot.addEventListener('mouseleave', play);
    }
    root.addEventListener('focusin', pause);
    root.addEventListener('focusout', function (e) {
      if (!root.contains(e.relatedTarget)) play();
    });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); go(index - 1, true); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1, true); }
    });
    document.addEventListener('visibilitychange', function () {
      document.hidden ? pause() : play();
    });
    reduceMotion.addEventListener('change', function () {
      canRotate = slides.length > 1 && !reduceMotion.matches;
      root.classList.toggle('is-static', !canRotate);
      if (toggle) toggle.hidden = !canRotate;
      canRotate ? play() : pause();
    });

    apply();
    play();
  })();

  /* ------------------------------------------------------ testimonial carousel */
  (function carousel() {
    var root = $('[data-carousel]');
    if (!root) return;

    var track  = $('[data-carousel-track]', root);
    var slides = $$('[data-slide]', root);
    var prev   = $('[data-carousel-prev]', root);
    var next   = $('[data-carousel-next]', root);
    var dotsEl = $('[data-carousel-dots]', root);
    var status = $('[data-carousel-status]', root);
    if (!track || slides.length < 2) return;

    var index = 0, perView = 1, maxIndex = 0, timer = null;

    function measure() {
      var trackW = track.getBoundingClientRect().width;
      var slideW = slides[0].getBoundingClientRect().width;
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
      perView = Math.max(1, Math.round((trackW + gap) / (slideW + gap)));
      maxIndex = Math.max(0, slides.length - perView);
      index = Math.min(index, maxIndex);
      buildDots();
      apply();
    }

    function apply() {
      var slideW = slides[0].getBoundingClientRect().width;
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
      track.style.transform = 'translate3d(' + (-index * (slideW + gap)) + 'px,0,0)';

      slides.forEach(function (s, i) {
        var visible = i >= index && i < index + perView;
        s.setAttribute('aria-hidden', String(!visible));
        $$('a, button', s).forEach(function (el) { el.tabIndex = visible ? 0 : -1; });
      });

      $$('.carousel__dot', dotsEl).forEach(function (d, i) {
        var on = i === index;
        d.classList.toggle('is-active', on);
        d.setAttribute('aria-selected', String(on));
        d.tabIndex = on ? 0 : -1;
      });

      if (prev) prev.disabled = index === 0;
      if (next) next.disabled = index >= maxIndex;
      if (status) status.textContent = 'Review ' + (index + 1) + ' of ' + (maxIndex + 1);
    }

    function buildDots() {
      if (!dotsEl) return;
      dotsEl.innerHTML = '';
      for (var i = 0; i <= maxIndex; i++) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'carousel__dot';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-label', 'Show review ' + (i + 1));
        (function (n) { b.addEventListener('click', function () { go(n, true); }); })(i);
        dotsEl.appendChild(b);
      }
    }

    function go(n, stop) {
      index = Math.max(0, Math.min(n, maxIndex));
      apply();
      if (stop) pause();
    }

    function play() {
      if (reduceMotion.matches || maxIndex === 0) return;
      pause();
      timer = window.setInterval(function () { go(index >= maxIndex ? 0 : index + 1); }, 6500);
    }
    function pause() { if (timer) { window.clearInterval(timer); timer = null; } }

    if (prev) prev.addEventListener('click', function () { go(index - 1, true); });
    if (next) next.addEventListener('click', function () { go(index + 1, true); });

    root.addEventListener('mouseenter', pause);
    root.addEventListener('mouseleave', play);
    root.addEventListener('focusin', pause);
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); go(index - 1, true); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1, true); }
    });
    document.addEventListener('visibilitychange', function () { document.hidden ? pause() : play(); });

    var rt;
    window.addEventListener('resize', function () {
      window.clearTimeout(rt);
      rt = window.setTimeout(measure, 160);
    });

    measure();
    play();
  })();

  /* ----------------------------------------------------------- office tabs */
  (function officeTabs() {
    var root = $('[data-tabs]');
    if (!root) return;

    var tabs  = $$('[data-tab]', root);
    var panes = $$('[data-pane]', root);
    if (!tabs.length) return;

    function activate(name, focus) {
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-tab') === name;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (on && focus) t.focus();
      });
      panes.forEach(function (p) {
        var on = p.getAttribute('data-pane') === name;
        p.hidden = !on;
        if (!on) return;
        var frame = $('iframe[data-src]', p);      // maps load on first view only
        if (frame) { frame.src = frame.getAttribute('data-src'); frame.removeAttribute('data-src'); }
      });
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { activate(tab.getAttribute('data-tab')); });
      tab.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
        if (n < 0 || n >= tabs.length) return;
        e.preventDefault();
        activate(tabs[n].getAttribute('data-tab'), true);
      });
    });
  })();

  /* ------------------------------------------------------ appointment form */
  (function appointmentForm() {
    var form = $('[data-validate]');
    if (!form) return;

    var summary = $('[data-form-summary]', form);
    var attempted = false;

    var rules = {
      fname:  { label: 'first name', test: function (v) { return v.trim().length > 1; }, msg: 'Please enter your first name.' },
      lname:  { label: 'last name',  test: function (v) { return v.trim().length > 1; }, msg: 'Please enter your last name.' },
      phone:  { label: 'phone',      test: function (v) { return v.replace(/[^\d]/g, '').length >= 10; }, msg: 'Please enter a phone number with at least 10 digits.' },
      email:  { label: 'email',      test: function (v) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()); }, msg: 'Please enter a valid email address.' },
      age:    { label: 'age',        optional: true, test: function (v) { var n = Number(v); return v === '' || (n > 0 && n < 121); }, msg: 'Please enter an age between 1 and 120.' },
      office: { label: 'office',     radio: true, msg: 'Please choose the office you prefer.' }
    };

    function fieldWrap(el) { return el.closest('.field'); }

    function showError(name, message) {
      var out = $('[data-error-for="' + name + '"]', form);
      var input = form.elements[name];
      var el = input && input.length ? input[0] : input;
      if (out) out.textContent = message || '';
      var wrap = el && fieldWrap(el);
      if (wrap) wrap.classList.toggle('has-error', Boolean(message));
      if (el && el.setAttribute && !rules[name].radio) el.setAttribute('aria-invalid', message ? 'true' : 'false');
    }

    function validateField(name) {
      var rule = rules[name];
      if (!rule) return true;
      var input = form.elements[name];
      var ok;
      if (rule.radio) {
        ok = Array.prototype.some.call(input, function (r) { return r.checked; });
      } else {
        var value = input.value || '';
        ok = rule.optional && value.trim() === '' ? true : rule.test(value);
      }
      showError(name, ok ? '' : rule.msg);
      return ok;
    }

    Object.keys(rules).forEach(function (name) {
      var input = form.elements[name];
      if (!input) return;
      var list = input.length ? Array.prototype.slice.call(input) : [input];
      list.forEach(function (el) {
        el.addEventListener('blur', function () { if (attempted) validateField(name); });
        el.addEventListener('change', function () { if (attempted) validateField(name); });
        el.addEventListener('input', function () {
          if (attempted && fieldWrap(el) && fieldWrap(el).classList.contains('has-error')) validateField(name);
        });
      });
    });

    form.addEventListener('submit', function (e) {
      attempted = true;
      var invalid = Object.keys(rules).filter(function (name) { return !validateField(name); });

      if (invalid.length) {
        e.preventDefault();
        if (summary) {
          summary.hidden = false;
          summary.textContent = invalid.length === 1
            ? 'Please check the ' + rules[invalid[0]].label + ' field and try again.'
            : 'Please complete the ' + invalid.length + ' highlighted fields and try again.';
        }
        var first = form.elements[invalid[0]];
        var el = first && first.length ? first[0] : first;
        if (el && el.focus) el.focus();
        return;
      }
      if (summary) { summary.hidden = true; summary.textContent = ''; }
    });
  })();

  /* ---------------------------------------------------------- newsletter */
  (function newsletter() {
    var form = $('[data-newsletter]');
    if (!form) return;
    var status = $('[data-newsletter-status]');
    var input = form.elements.email;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = (input.value || '').trim();
      var ok = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value);
      if (!status) return;
      status.classList.toggle('is-error', !ok);
      status.textContent = ok
        ? 'Thank you — we will be in touch about your complimentary Gonzales Smile Assessment.'
        : 'Please enter a valid email address.';
      if (ok) form.reset();
      else input.focus();
    });
  })();

  /* --------------------------------------------------------- video facade */
  (function videoFacade() {
    var facade = $('[data-video]');
    if (!facade) return;
    var btn = $('[data-video-play]', facade);
    if (!btn) return;

    btn.addEventListener('click', function () {
      var id = facade.getAttribute('data-video');
      var frame = document.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      frame.title = 'Dante Gonzales Orthodontics introduction video';
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      frame.allowFullscreen = true;
      frame.setAttribute('loading', 'lazy');
      facade.innerHTML = '';
      facade.appendChild(frame);
      frame.focus();
    });
  })();

})();
