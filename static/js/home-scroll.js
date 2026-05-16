(function () {
  'use strict';

  const container = document.querySelector('.home-sections');
  if (!container) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const navHeader = document.querySelector('body.home-page > header');

  function syncNavHeight() {
    if (!navHeader) return;
    const h = navHeader.offsetHeight + 'px';
    document.documentElement.style.setProperty('--home-nav-height', h);
  }

  syncNavHeight();
  window.addEventListener('resize', syncNavHeight, { passive: true });

  const NAV_OFFSET = navHeader ? navHeader.offsetHeight : 73;
  const sectionNav = document.getElementById('home-section-nav');
  const scrollHint = document.querySelector('.home-scroll-hint');

  let lastActiveId = window.location.hash ? window.location.hash.slice(1) : null;
  let syncingFromHash = false;

  function pageUrl() {
    return window.location.pathname + window.location.search;
  }

  function getSnapTargets() {
    return Array.from(container.querySelectorAll(':scope > section.snap-start, :scope > footer.snap-start'));
  }

  function nearestSectionIndex(targets) {
    const scrollY = window.scrollY + NAV_OFFSET;
    let best = 0;
    let bestDist = Infinity;
    targets.forEach(function (el, i) {
      const top = el.getBoundingClientRect().top + window.scrollY;
      const dist = Math.abs(scrollY - top);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    return best;
  }

  function activeSectionElement() {
    const targets = getSnapTargets();
    return targets[nearestSectionIndex(targets)] || null;
  }

  /** Hero uses a clean `/` URL; other sections use `/#section-id`. */
  function setLocationHash(sectionId, usePush) {
    const method = usePush ? 'pushState' : 'replaceState';
    if (!sectionId || sectionId === 'hero') {
      if (window.location.hash) {
        history[method](null, '', pageUrl());
      }
      lastActiveId = sectionId || 'hero';
      return;
    }
    const hash = '#' + sectionId;
    if (window.location.hash === hash) {
      lastActiveId = sectionId;
      return;
    }
    history[method](null, '', pageUrl() + hash);
    lastActiveId = sectionId;
  }

  function syncHashFromScroll() {
    if (syncingFromHash) return;
    const el = activeSectionElement();
    const id = el && el.id ? el.id : null;
    if (id === lastActiveId) return;
    setLocationHash(id, false);
  }

  function scrollToSection(el, behavior, updateHistory) {
    if (!el) return;
    el.scrollIntoView({ behavior: behavior || 'smooth', block: 'start' });
    if (scrollHint) scrollHint.style.opacity = '0';
    if (updateHistory !== false && el.id) {
      setLocationHash(el.id, updateHistory === 'push');
    }
  }

  function scrollToHash(hash, behavior, updateHistory) {
    if (!hash || hash === '#') return;
    const target = document.querySelector(hash);
    if (!target || !container.contains(target)) return;
    scrollToSection(target, behavior || 'smooth', updateHistory);
  }

  function updateSectionNav() {
    if (!sectionNav) return;
    const targets = getSnapTargets();
    const active = nearestSectionIndex(targets);
    Array.from(sectionNav.children).forEach(function (btn, i) {
      const on = i === active;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-current', on ? 'true' : 'false');
    });
  }

  function buildSectionNav() {
    if (!sectionNav) return;
    const targets = getSnapTargets();
    sectionNav.innerHTML = '';
    targets.forEach(function (el) {
      const label = el.getAttribute('data-section-label') || el.id || 'Section';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'home-section-nav__dot';
      btn.title = label;
      btn.setAttribute('aria-label', label);
      btn.addEventListener('click', function () {
        scrollToSection(el, prefersReducedMotion ? 'auto' : 'smooth', 'push');
      });
      sectionNav.appendChild(btn);
    });
    updateSectionNav();
  }

  document.querySelectorAll('.home-hash-link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      const href = link.getAttribute('href');
      if (!href || href.charAt(0) !== '#') return;
      const target = document.querySelector(href);
      if (!target || !container.contains(target)) return;
      e.preventDefault();
      scrollToHash(href, 'smooth', 'push');
      const mobileMenu = document.getElementById('mobile-menu');
      const menuBtn = document.getElementById('mobile-menu-btn');
      if (mobileMenu && !mobileMenu.classList.contains('translate-x-full')) {
        mobileMenu.classList.add('translate-x-full', 'opacity-0', 'pointer-events-none');
        mobileMenu.setAttribute('aria-hidden', 'true');
        if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  });

  if (window.location.hash) {
    syncingFromHash = true;
    window.requestAnimationFrame(function () {
      scrollToHash(window.location.hash, 'auto', false);
      lastActiveId = window.location.hash.slice(1);
      syncingFromHash = false;
    });
  }

  window.addEventListener('popstate', function () {
    syncingFromHash = true;
    const hash = window.location.hash;
    lastActiveId = hash ? hash.slice(1) : 'hero';
    if (hash) {
      scrollToHash(hash, prefersReducedMotion ? 'auto' : 'smooth', false);
    } else {
      const hero = document.getElementById('hero');
      if (hero) scrollToSection(hero, prefersReducedMotion ? 'auto' : 'smooth', false);
    }
    syncingFromHash = false;
    updateSectionNav();
  });

  buildSectionNav();

  window.addEventListener(
    'scroll',
    function () {
      updateSectionNav();
      syncHashFromScroll();
      if (scrollHint && window.scrollY > 40) scrollHint.style.opacity = '0';
    },
    { passive: true }
  );
})();
