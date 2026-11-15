/* HACKER — intro orchestration, pointer parallax, ambient glitch */

(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');

  /* ------------------------------------------------------------------------
     Intro: replay on every load / refresh
     ------------------------------------------------------------------------ */

  let introPlayed = false;

  function playIntro() {
    if (introPlayed) return;
    introPlayed = true;
    body.classList.add('is-loaded');
  }

  // Hold the curtain until the display font is ready (capped, so a slow CDN
  // never leaves the stage blank). The script sits at the end of <body>.
  if (document.fonts && document.fonts.ready) {
    const fontFallback = window.setTimeout(playIntro, 500);
    document.fonts.ready
      .then(() => {
        window.clearTimeout(fontFallback);
        playIntro();
      })
      .catch(() => {
        window.clearTimeout(fontFallback);
        playIntro();
      });
  } else {
    playIntro();
  }

  window.addEventListener('load', playIntro, { once: true });

  /* ------------------------------------------------------------------------
     Pointer parallax + head / eye tracking
     ------------------------------------------------------------------------ */

  const pointers = {
    tx: 0,
    ty: 0,
    x: 0,
    y: 0,
    raf: 0,
    active: false,
  };

  function parallaxTick() {
    pointers.x += (pointers.tx - pointers.x) * 0.085;
    pointers.y += (pointers.ty - pointers.y) * 0.085;

    root.style.setProperty('--mx', pointers.x.toFixed(4));
    root.style.setProperty('--my', pointers.y.toFixed(4));

    const settled =
      Math.abs(pointers.tx - pointers.x) < 0.0006 &&
      Math.abs(pointers.ty - pointers.y) < 0.0006;

    pointers.raf = settled ? 0 : requestAnimationFrame(parallaxTick);
  }

  function queueParallax() {
    if (!pointers.raf) pointers.raf = requestAnimationFrame(parallaxTick);
  }

  function onPointerMove(event) {
    if (!pointers.active) return;
    pointers.tx = (event.clientX / window.innerWidth - 0.5) * 2;
    pointers.ty = (event.clientY / window.innerHeight - 0.5) * 2;
    queueParallax();
  }

  function onPointerLeave() {
    pointers.tx = 0;
    pointers.ty = 0;
    queueParallax();
  }

  function syncPointerMode() {
    pointers.active = finePointer.matches && !reduceMotion.matches;
    if (!pointers.active) {
      pointers.tx = 0;
      pointers.ty = 0;
      root.style.setProperty('--mx', '0');
      root.style.setProperty('--my', '0');
    }
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerleave', onPointerLeave);
  window.addEventListener('blur', onPointerLeave);

  if (typeof finePointer.addEventListener === 'function') {
    finePointer.addEventListener('change', syncPointerMode);
  }
  if (typeof reduceMotion.addEventListener === 'function') {
    reduceMotion.addEventListener('change', syncPointerMode);
  }
  syncPointerMode();

  /* ------------------------------------------------------------------------
     Ambient glitch lines
     ------------------------------------------------------------------------ */

  const glitchLayer = document.querySelector('.glitch-lines');
  const glitchColors = ['#f2592b', '#37d0ba', '#7fd3ff', '#f4f1ea', '#f2592b'];
  let glitchTimer = 0;
  let glitchEnabled = !reduceMotion.matches;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function spawnGlitch(count) {
    if (!glitchLayer) return;

    for (let i = 0; i < count; i += 1) {
      const line = document.createElement('span');
      const duration = rand(0.32, 0.75);

      line.style.top = `${rand(6, 93)}%`;
      line.style.left = `${rand(2, 88)}%`;
      line.style.width = `${rand(2, 22)}%`;
      line.style.height = `${Math.random() < 0.28 ? 2 : 1}px`;
      line.style.background = glitchColors[(Math.random() * glitchColors.length) | 0];
      line.style.opacity = `${rand(0.35, 0.95)}`;
      line.style.animation = `glitchFlash ${duration}s ease-out ${rand(0, 0.3).toFixed(2)}s forwards`;
      line.style.animationDelay = `${rand(0, 0.3).toFixed(2)}s`;
      line.dataset.dynamic = 'true';

      line.addEventListener('animationend', () => line.remove(), { once: true });
      glitchLayer.appendChild(line);
    }
  }

  function scheduleGlitch(delay) {
    window.clearTimeout(glitchTimer);
    if (!glitchEnabled) return;

    glitchTimer = window.setTimeout(() => {
      if (!document.hidden) spawnGlitch(4 + Math.floor(Math.random() * 5));
      scheduleGlitch(rand(2600, 5600));
    }, delay);
  }

  function onMotionPreferenceChange() {
    glitchEnabled = !reduceMotion.matches;
    if (glitchEnabled) {
      scheduleGlitch(1800);
    } else {
      window.clearTimeout(glitchTimer);
      if (glitchLayer) {
        glitchLayer.querySelectorAll('[data-dynamic]').forEach((node) => node.remove());
      }
    }
  }

  if (typeof reduceMotion.addEventListener === 'function') {
    reduceMotion.addEventListener('change', onMotionPreferenceChange);
  }

  if (glitchEnabled) {
    // First burst lands just after the intro settles.
    window.setTimeout(() => spawnGlitch(8), 1500);
    scheduleGlitch(3200);
  }

  /* ------------------------------------------------------------------------
     Mobile menu
     ------------------------------------------------------------------------ */

  const menuToggle = document.querySelector('.menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const desktopQuery = window.matchMedia('(min-width: 721px)');

  function setMenu(open) {
    if (!menuToggle || !mobileMenu) return;
    mobileMenu.classList.toggle('is-open', open);
    mobileMenu.setAttribute('aria-hidden', String(!open));
    menuToggle.setAttribute('aria-expanded', String(open));
  }

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      setMenu(!mobileMenu.classList.contains('is-open'));
    });

    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setMenu(false));
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setMenu(false);
    });

    const closeOnDesktop = () => {
      if (desktopQuery.matches) setMenu(false);
    };

    if (typeof desktopQuery.addEventListener === 'function') {
      desktopQuery.addEventListener('change', closeOnDesktop);
    }
  }

  /* ------------------------------------------------------------------------
     Keep the split frame pinned on mobile browser chrome changes
     ------------------------------------------------------------------------ */

  function syncViewportHeight() {
    root.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
  }

  syncViewportHeight();
  window.addEventListener('resize', syncViewportHeight, { passive: true });
})();
