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

    // The smile arch and the wordmark wipe are pure CSS — nothing to trigger
    // from here.

    // One full pass of the arch: teeth in, straighten, archwire through.
    var LOAD_DURATION = 2800;
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

  /* ------------------------------------------------ consultation pop-up */
  (function consultationModal() {
    var triggers = $$('.header__cta');
    if (!triggers.length) return;

    var lastFocused = null;
    var modal = document.createElement('section');
    modal.className = 'consultation-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML =
      '<div class="consultation-modal__backdrop" data-modal-close></div>' +
      '<div class="consultation-modal__panel" role="dialog" aria-modal="true" aria-labelledby="consultation-modal-title">' +
        '<button class="consultation-modal__close" type="button" aria-label="Close consultation form" data-modal-close>&times;</button>' +
        '<p class="eyebrow">Your new smile starts here</p>' +
        '<h2 id="consultation-modal-title">Request a complimentary consultation</h2>' +
        '<p class="consultation-modal__intro">Share your details and our team will be in touch to find a time that works for you.</p>' +
        '<form class="form consultation-modal__form" action="contact-form1.php" method="post" novalidate data-validate>' +
          '<div class="form__grid">' +
            '<div class="field"><label class="field__label" for="modal-fname">First name <span aria-hidden="true">*</span></label><input class="field__input" type="text" id="modal-fname" name="fname" autocomplete="given-name" required aria-describedby="modal-err-fname"><p class="field__error" id="modal-err-fname" data-error-for="fname"></p></div>' +
            '<div class="field"><label class="field__label" for="modal-lname">Last name <span aria-hidden="true">*</span></label><input class="field__input" type="text" id="modal-lname" name="lname" autocomplete="family-name" required aria-describedby="modal-err-lname"><p class="field__error" id="modal-err-lname" data-error-for="lname"></p></div>' +
            '<div class="field"><label class="field__label" for="modal-phone">Phone <span aria-hidden="true">*</span></label><input class="field__input" type="tel" id="modal-phone" name="phone" autocomplete="tel" inputmode="tel" required aria-describedby="modal-err-phone"><p class="field__error" id="modal-err-phone" data-error-for="phone"></p></div>' +
            '<div class="field"><label class="field__label" for="modal-email">Email <span aria-hidden="true">*</span></label><input class="field__input" type="email" id="modal-email" name="email" autocomplete="email" required aria-describedby="modal-err-email"><p class="field__error" id="modal-err-email" data-error-for="email"></p></div>' +
            '<fieldset class="field field--full"><legend class="field__label">Preferred office <span aria-hidden="true">*</span></legend><div class="radios" aria-describedby="modal-err-office"><label class="radio"><input type="radio" name="office" value="Dublin" required><span class="radio__mark" aria-hidden="true"></span><span class="radio__text"><strong>Dublin</strong><em>4532 Dublin Blvd</em></span></label><label class="radio"><input type="radio" name="office" value="Tracy" required><span class="radio__mark" aria-hidden="true"></span><span class="radio__text"><strong>Tracy</strong><em>1417 N Tracy Blvd</em></span></label></div><p class="field__error" id="modal-err-office" data-error-for="office"></p></fieldset>' +
          '</div>' +
          '<input type="hidden" name="recaptcha_response" value="">' +
          '<div class="form__foot"><button class="btn btn--primary btn--lg" type="submit" name="submit">Request consultation</button><p class="form__note">Your information stays private and is only used to contact you.</p></div><p class="form__summary" role="alert" data-form-summary hidden></p>' +
        '</form>' +
      '</div>';
    document.body.appendChild(modal);

    // Blog pages are one directory deeper than the form handler.
    var form = $('[data-validate]', modal);
    if (form && /\/blog\//.test(window.location.pathname)) form.action = '../contact-form1.php';

    function close() {
      if (!modal.classList.contains('is-open')) return;
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-modal-open');
      if (lastFocused) lastFocused.focus();
    }
    function open(trigger) {
      lastFocused = trigger;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-modal-open');
      window.setTimeout(function () { var first = $('input', modal); if (first) first.focus(); }, 30);
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function (e) { e.preventDefault(); open(trigger); });
    });
    $$('[data-modal-close]', modal).forEach(function (button) { button.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var focusable = $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])', modal);
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
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
    var rules = {
      fname:  { label: 'first name', test: function (v) { return v.trim().length > 1; }, msg: 'Please enter your first name.' },
      lname:  { label: 'last name',  test: function (v) { return v.trim().length > 1; }, msg: 'Please enter your last name.' },
      phone:  { label: 'phone',      test: function (v) { return v.replace(/[^\d]/g, '').length >= 10; }, msg: 'Please enter a phone number with at least 10 digits.' },
      email:  { label: 'email',      test: function (v) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()); }, msg: 'Please enter a valid email address.' },
      age:    { label: 'age',        optional: true, test: function (v) { var n = Number(v); return v === '' || (n > 0 && n < 121); }, msg: 'Please enter an age between 1 and 120.' },
      office: { label: 'office',     radio: true, msg: 'Please choose the office you prefer.' }
    };

    $$('[data-validate]').forEach(function (form) {
      var summary = $('[data-form-summary]', form);
      var attempted = false;

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
        // Not every form carries every field (the quiz and the modal both skip
        // `age`). Without this guard the missing field throws, the exception
        // unwinds the submit handler, and the form posts unvalidated.
        if (!input) return true;
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

  /* --------------------------------------------------- blog article rails */
  (function articleRails() {
    var body = $('.article-body');
    if (!body) return;

    /* ---- table of contents ---- */
    var toc = $('.article-toc');
    var heads = $$('h2.section__title', body).filter(function (h) { return h.id; });
    if (toc && heads.length >= 2) {
      var ol = document.createElement('ol');
      heads.forEach(function (h) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = h.textContent.trim();
        li.appendChild(a);
        ol.appendChild(li);
      });
      toc.appendChild(ol);

      var links = $$('a', ol);
      var byId = {};
      links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });

      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          links.forEach(function (a) { a.classList.remove('is-active'); });
          var a = byId[e.target.id];
          if (a) a.classList.add('is-active');
        });
      }, { rootMargin: '-15% 0px -70% 0px' });
      heads.forEach(function (h) { spy.observe(h); });
    } else if (toc) {
      toc.remove();
    }

    /* ---- share links ---- */
    var share = $('.article-share');
    if (share) {
      var canonical = $('link[rel="canonical"]');
      var url = canonical ? canonical.href : window.location.href;
      var title = (document.querySelector('h1') || {}).textContent || document.title;
      var u = encodeURIComponent(url);
      var t = encodeURIComponent(title.trim());
      var targets = [
        ['X', 'https://twitter.com/intent/tweet?text=' + t + '&url=' + u,
          '<path d="M17.5 2h2.8l-6.1 7 7.2 9.6h-5.6l-4.4-5.8L6 18.6H3.2l6.5-7.5L2.8 2h5.8l4 5.3L17.5 2Zm-1 15h1.5L7.6 3.6H6L16.5 17Z"/>'],
        ['LinkedIn', 'https://www.linkedin.com/sharing/share-offsite/?url=' + u,
          '<path d="M4.98 3.5A2.5 2.5 0 1 1 0 3.5a2.5 2.5 0 0 1 4.98 0ZM.24 8.02h4.48V24H.24V8.02ZM8.34 8.02h4.3v2.18h.06c.6-1.14 2.06-2.34 4.24-2.34 4.54 0 5.38 2.98 5.38 6.86V24h-4.48v-6.4c0-1.52-.03-3.48-2.12-3.48-2.12 0-2.44 1.66-2.44 3.37V24H8.34V8.02Z"/>'],
        ['WhatsApp', 'https://api.whatsapp.com/send?text=' + t + '%20' + u,
          '<path d="M12 2a9.94 9.94 0 0 0-8.5 15.16L2 22l4.96-1.46A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-2.94.86.87-2.87-.2-.31A8.2 8.2 0 1 1 12 20.2Zm4.5-6.13c-.25-.12-1.46-.72-1.69-.8-.22-.09-.39-.13-.55.12-.16.25-.63.8-.77.96-.14.16-.28.18-.53.06a6.72 6.72 0 0 1-3.3-2.9c-.25-.42.25-.4.7-1.3.08-.16.04-.3-.02-.42-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.3c-.22.25-.86.84-.86 2.05s.88 2.38 1 2.54c.13.17 1.74 2.66 4.22 3.73 1.57.68 2.19.74 2.98.62.48-.07 1.46-.6 1.67-1.18.2-.58.2-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z"/>']
      ];

      var label = document.createElement('span');
      label.className = 'article-share__label';
      label.textContent = 'Share article';
      share.appendChild(label);

      targets.forEach(function (row) {
        var a = document.createElement('a');
        a.setAttribute('aria-label', 'Share on ' + row[0]);
        a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + row[2] + '</svg>';
        a.href = row[1];
        a.target = '_blank';
        a.rel = 'noopener';
        share.appendChild(a);
      });
    }
  })();

  /* -------------------------------------------------------- whatsapp fab */
  (function initWhatsAppFab() {
    var wrap = document.getElementById('whatsappFabWrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'whatsapp-fab-wrap';
      wrap.id = 'whatsappFabWrap';
      wrap.innerHTML =
        '<div class="whatsapp-card" id="whatsappCard" role="dialog" aria-modal="false" aria-labelledby="waCardTitle">' +
          '<div class="whatsapp-card__head">' +
            '<div class="whatsapp-card__brand">' +
              '<div class="whatsapp-card__avatar" aria-hidden="true">' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#075e54" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
              '</div>' +
              '<div>' +
                '<h3 class="whatsapp-card__title" id="waCardTitle">Dante Gonzales Ortho</h3>' +
                '<span class="whatsapp-card__status">Online &bull; Available to chat</span>' +
              '</div>' +
            '</div>' +
            '<button class="whatsapp-card__close" type="button" id="whatsappCardClose" aria-label="Close chat options">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
            '</button>' +
          '</div>' +
          '<div class="whatsapp-card__body">' +
            '<p class="whatsapp-card__msg">' +
              'Hi there! 👋 Which office would you like to message on WhatsApp?' +
            '</p>' +
            '<ul class="whatsapp-card__options">' +
              '<li>' +
                '<a class="whatsapp-card__link" href="https://wa.me/19258282244?text=Hi%2C%20I%20have%20a%20question%20about%20orthodontic%20treatment%20at%20the%20Dublin%20office." target="_blank" rel="noopener noreferrer">' +
                  '<div>' +
                    '<strong>Dublin Office</strong>' +
                    '<span>4532 Dublin Blvd &bull; 925-828-2244</span>' +
                  '</div>' +
                  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>' +
                '</a>' +
              '</li>' +
              '<li>' +
                '<a class="whatsapp-card__link" href="https://wa.me/12098350977?text=Hi%2C%20I%20have%20a%20question%20about%20orthodontic%20treatment%20at%20the%20Tracy%20office." target="_blank" rel="noopener noreferrer">' +
                  '<div>' +
                    '<strong>Tracy Office</strong>' +
                    '<span>1417 N Tracy Blvd &bull; 209-835-0977</span>' +
                  '</div>' +
                  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>' +
                '</a>' +
              '</li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
        '<a class="whatsapp-fab" id="whatsappFabBtn" href="https://wa.me/19258282244?text=Hi%2C%20I%20have%20a%20question%20about%20orthodontic%20treatment%20at%20Dante%20Gonzales%20Orthodontics." target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp" aria-haspopup="dialog" aria-expanded="false">' +
          '<span class="whatsapp-fab__pulse" aria-hidden="true"></span>' +
          '<span class="whatsapp-fab__label">Chat on WhatsApp</span>' +
          '<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">' +
            '<path d="M16 2.5C8.544 2.5 2.5 8.544 2.5 16c0 2.656.772 5.131 2.1 7.222L3 30.5l7.5-1.575A13.43 13.43 0 0 0 16 29.5c7.456 0 13.5-6.044 13.5-13.5S23.456 2.5 16 2.5zm0 24.5c-2.222 0-4.316-.628-6.103-1.716l-.438-.266-4.453.934.95-4.341-.291-.459A10.932 10.932 0 0 1 5 16c0-6.065 4.935-11 11-11s11 4.935 11 11-4.935 11-11 11zm6.05-8.275c-.331-.166-1.956-.966-2.26-1.075-.303-.112-.525-.166-.747.166-.222.331-.859 1.075-1.053 1.297-.194.222-.388.25-.719.084-.331-.166-1.4-.516-2.666-1.644-.984-.878-1.65-1.962-1.844-2.294-.194-.331-.022-.51.144-.675.15-.147.331-.388.497-.581.166-.194.222-.331.331-.553.112-.222.056-.416-.028-.581-.084-.166-.747-1.8-1.025-2.466-.269-.65-.544-.562-.747-.572l-.637-.012c-.222 0-.581.084-.887.416-.303.331-1.162 1.134-1.162 2.766s1.191 3.206 1.356 3.428c.166.222 2.344 3.578 5.678 5.019.794.344 1.412.55 1.894.703.797.253 1.522.219 2.097.134.641-.097 1.956-.8 2.234-1.572.278-.772.278-1.434.194-1.572-.083-.14-.305-.224-.636-.39z"/>' +
          '</svg>' +
        '</a>';
      document.body.appendChild(wrap);
    }

    var btn = wrap.querySelector('#whatsappFabBtn');
    var card = wrap.querySelector('#whatsappCard');
    var closeBtn = wrap.querySelector('#whatsappCardClose');
    if (!btn || !card) return;

    function toggleCard(open) {
      var willOpen = typeof open === 'boolean' ? open : !card.classList.contains('is-open');
      card.classList.toggle('is-open', willOpen);
      btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    }

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      toggleCard();
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        toggleCard(false);
        btn.focus();
      });
    }

    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target) && card.classList.contains('is-open')) {
        toggleCard(false);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && card.classList.contains('is-open')) {
        toggleCard(false);
        btn.focus();
      }
    });

    wrap.querySelectorAll('.whatsapp-card__link').forEach(function (link) {
      link.addEventListener('click', function () {
        toggleCard(false);
      });
    });
  })();

  /* ----------------------------------------------------- right for you card */
  (function initRfyCard() {
    var card = $('#rfyCard');
    if (!card) return;

    var options = $$('.rfy__options li', card);
    var continueBtn = $('#rfyContinue', card);

    options.forEach(function (item) {
      function select() {
        options.forEach(function (opt) {
          opt.classList.remove('is-picked');
          opt.setAttribute('aria-checked', 'false');
        });
        item.classList.add('is-picked');
        item.setAttribute('aria-checked', 'true');
      }

      item.addEventListener('click', function () {
        select();
      });

      item.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          select();
        }
      });
    });
  })();

})();
