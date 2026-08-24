/* Dante Gonzales Orthodontics — homepage behaviour.
   Scroll-reveal, stagger, counters and parallax live in motion.js;
   this file owns interactive components only. */
(function (window, document) {
  'use strict';

  var gsap = window.gsap;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };

  /* ================================================================
     STICKY HEADER
     Two states, both driven from one rAF-throttled scroll read:
       at rest   — transparent, sitting over the hero banner
       floating  — detached pill with blur and shadow (past 24px)

     The bar stays pinned for the whole scroll. It used to retreat on
     scroll-down and return on scroll-up, which meant the nav and the
     "Book" call to action kept disappearing mid-page; holding the
     4.75rem is worth having them always in reach.
     ================================================================ */
  var header = document.querySelector('[data-header]');
  var navPanel = document.querySelector('[data-nav-panel]');
  var navBtn = document.querySelector('[data-nav-toggle]');

  if (header) {
    var FLOAT_AT = 24;
    var ticking = false;

    var readScroll = function () {
      header.classList.toggle('is-floating', window.scrollY > FLOAT_AT);
      ticking = false;
    };

    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(readScroll);
    };

    readScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ================================================================
     MOBILE NAVIGATION
     Adds Escape-to-close, a focus trap and focus restoration on top
     of the original toggle — the panel is a modal surface, so it
     should behave like one.
     ================================================================ */
  if (navBtn && navPanel) {
    var card = navPanel.querySelector('.nav-panel__card') || navPanel;
    var FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea';

    var setOpen = function (open) {
      if (open) navPanel.removeAttribute('hidden');
      else navPanel.setAttribute('hidden', '');
      navBtn.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('overflow-hidden', open);

      if (open && gsap && !reduced.matches) {
        gsap.fromTo(card,
          { opacity: 0, y: -12, scale: 0.985 },
          { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: 'power2.out', clearProps: 'transform' });
        gsap.fromTo($$(FOCUSABLE, card),
          { opacity: 0, y: -6 },
          { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out', stagger: 0.022, clearProps: 'all' });
      }
      if (!open) navBtn.focus();
    };

    navBtn.addEventListener('click', function () {
      setOpen(navPanel.hasAttribute('hidden'));
    });

    navPanel.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (navPanel.hasAttribute('hidden')) return;

      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key !== 'Tab') return;

      var items = $$(FOCUSABLE, navPanel).filter(function (el) { return el.offsetParent !== null; });
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];

      if (e.shiftKey && (document.activeElement === first || document.activeElement === navBtn)) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });
  }

  /* ---- Submenus (click on mobile, hover handled by CSS on desktop) */
  $$('[data-submenu-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = btn.nextElementSibling;
      var open = panel.hasAttribute('hidden');
      open ? panel.removeAttribute('hidden') : panel.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', String(open));
      if (open && gsap && !reduced.matches) {
        gsap.fromTo(panel.children,
          { opacity: 0, y: -4 },
          { opacity: 1, y: 0, duration: 0.24, ease: 'power2.out', stagger: 0.02, clearProps: 'all' });
      }
    });
  });



  /* ================================================================
     HERO SLIDER
     Native scroll-snap does the transport; JS handles autoplay,
     dot state, touch/keyboard interactions, and a slow scale drift.
     ================================================================ */
  var slider = document.querySelector('[data-slider]');
  if (slider) {
    var heroSection = slider.closest('section') || slider;
    var slides = $$('.slide', slider);
    var dots = $$('[data-slide-dot]');
    var prevBtn = document.querySelector('[data-slide-prev]');
    var nextBtn = document.querySelector('[data-slide-next]');
    var timer = null;
    var current2 = 0;
    var isNavigating = false;
    var navTimeout = null;
    var isPaused = false;

    var paint = function (idx) {
      var activeIdx = typeof idx === 'number' ? idx : current2;
      dots.forEach(function (d, i) {
        var isActive = i === activeIdx;
        d.setAttribute('aria-current', String(isActive));
        d.setAttribute('aria-label', 'Slide ' + (i + 1) + (isActive ? ' (current)' : ''));
        d.className = isActive
          ? 'h-2.5 rounded-full bg-brand-500 transition-all w-8'
          : 'h-2.5 rounded-full bg-white/50 transition-all w-2.5 hover:bg-white/80';
      });
    };

    var driftIn = function (slide) {
      if (!gsap || reduced.matches || !slide) return;
      slides.forEach(function (s) {
        if (s !== slide) {
          var otherImg = s.querySelector('img');
          if (otherImg) gsap.set(otherImg, { scale: 1 });
        }
      });
      var img = slide.querySelector('img');
      if (!img) return;
      gsap.fromTo(img, { scale: 1 }, { scale: 1.04, duration: 7, ease: 'none', overwrite: 'auto' });
    };

    var stop = function () {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    var start = function () {
      stop();
      if (reduced.matches || isPaused || document.hidden) return;
      timer = setInterval(function () {
        goTo(current2 + 1);
      }, 6500);
    };

    var goTo = function (i, immediate) {
      stop();
      current2 = (i + slides.length) % slides.length;
      paint(current2);
      isNavigating = true;
      if (navTimeout) clearTimeout(navTimeout);

      var targetSlide = slides[current2];
      if (targetSlide) {
        slider.scrollTo({
          left: targetSlide.offsetLeft,
          behavior: immediate ? 'auto' : 'smooth'
        });
      }

      navTimeout = setTimeout(function () {
        isNavigating = false;
        driftIn(slides[current2]);
        if (!isPaused) start();
      }, immediate ? 50 : 550);
    };

    // IntersectionObserver tracks slide changes from user's manual swipes/scrolls
    var io = new IntersectionObserver(function (entries) {
      if (isNavigating) return;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var idx = slides.indexOf(en.target);
        if (idx !== -1 && idx !== current2) {
          current2 = idx;
          paint(current2);
          driftIn(en.target);
          if (!isPaused) {
            stop();
            start();
          }
        }
      });
    }, { root: slider, threshold: 0.6 });

    slides.forEach(function (s) { io.observe(s); });

    // Dot navigation
    dots.forEach(function (d, i) {
      d.addEventListener('click', function () {
        goTo(i);
      });
    });

    // Arrow navigation
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        goTo(current2 - 1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        goTo(current2 + 1);
      });
    }

    // Hover & focus on the entire hero section (including slider and floating controls)
    heroSection.addEventListener('pointerenter', function () {
      isPaused = true;
      stop();
    });
    heroSection.addEventListener('pointerleave', function () {
      isPaused = false;
      start();
    });
    heroSection.addEventListener('focusin', function () {
      isPaused = true;
      stop();
    });
    heroSection.addEventListener('focusout', function (e) {
      if (!heroSection.contains(e.relatedTarget)) {
        isPaused = false;
        start();
      }
    });

    // Touch events for mobile swiping
    slider.addEventListener('touchstart', function () {
      isPaused = true;
      stop();
    }, { passive: true });

    slider.addEventListener('touchend', function () {
      isPaused = false;
      setTimeout(function () {
        if (!isPaused) start();
      }, 1000);
    }, { passive: true });

    // Page visibility
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        stop();
      } else if (!isPaused) {
        start();
      }
    });

    // Keep active slide centered on window resize
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (slides[current2]) {
          slider.scrollTo({ left: slides[current2].offsetLeft, behavior: 'auto' });
        }
      }, 100);
    }, { passive: true });

    paint(0);

    /* Autoplay starts once intro preloader is dismissed or via fallback */
    var started = false;
    var begin = function () {
      if (started) return;
      started = true;
      paint(0);
      driftIn(slides[0]);
      start();
    };
    document.addEventListener('site:ready', begin, { once: true });
    setTimeout(begin, 2600);
  }

  /* ================================================================
     BACK TO TOP
     Earns its place on a page this long. Appears only once returning
     by scroll would be tedious, and sits above the mobile call bar.
     ================================================================ */
  var toTop = document.querySelector('[data-to-top]');
  if (toTop) {
    var toTopTick = false;
    var checkTop = function () {
      toTop.classList.toggle('is-visible', window.scrollY > window.innerHeight * 1.5);
      toTopTick = false;
    };
    window.addEventListener('scroll', function () {
      if (toTopTick) return;
      toTopTick = true;
      window.requestAnimationFrame(checkTop);
    }, { passive: true });
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced.matches ? 'auto' : 'smooth' });
    });
    checkTop();
  }

  /* ---- FAQ / accordion ------------------------------------------ */
  $$('[data-accordion] button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = btn.parentElement.querySelector('[data-panel]');
      var open = panel.hasAttribute('hidden');
      btn.closest('[data-accordion]').querySelectorAll('[data-panel]').forEach(function (p) {
        p.setAttribute('hidden', '');
        p.parentElement.querySelector('button').setAttribute('aria-expanded', 'false');
      });
      if (open) { panel.removeAttribute('hidden'); btn.setAttribute('aria-expanded', 'true'); }
    });
  });

  /* ---- Footer year ----------------------------------------------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})(window, document);
