(function () {
  'use strict';

  var FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

  function getFocusables(root) {
    return Array.prototype.slice.call(root.querySelectorAll(FOCUSABLE)).filter(function (el) {
      return !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true';
    });
  }

  function trapTabKey(event, container) {
    if (event.key !== 'Tab' || !container) return;
    var nodes = getFocusables(container);
    if (!nodes.length) return;
    var first = nodes[0];
    var last = nodes[nodes.length - 1];
    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function initSkipLink() {
    var main = document.getElementById('main-content');
    var skip = document.querySelector('.skip-link');
    if (!main || !skip) return;
    if (!main.hasAttribute('tabindex')) {
      main.setAttribute('tabindex', '-1');
    }
    skip.addEventListener('click', function () {
      requestAnimationFrame(function () {
        main.focus({ preventScroll: false });
      });
    });
  }

  function initMobileMenuA11y() {
    var btn = document.getElementById('mobile-menu-btn');
    var menu = document.getElementById('mobile-menu');
    if (!btn || !menu || btn.dataset.a11yMenuBound === 'true') return;
    btn.dataset.a11yMenuBound = 'true';

    var openLabel = 'Open menu';
    var closeLabel = 'Close menu';

    function isMenuOpen() {
      return btn.getAttribute('aria-expanded') === 'true';
    }

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !isMenuOpen()) return;
      if (window.cfdMobileMenu && window.cfdMobileMenu.close) {
        window.cfdMobileMenu.close();
        btn.focus();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (!isMenuOpen() || e.key !== 'Tab') return;
      trapTabKey(e, menu);
    });

    var observer = new MutationObserver(function () {
      var open = isMenuOpen();
      btn.setAttribute('aria-label', open ? closeLabel : openLabel);
    });
    observer.observe(btn, { attributes: true, attributeFilter: ['aria-expanded'] });
  }

  function initMegaMenuA11y() {
    var trigger = document.querySelector('.nav-item-browse > a');
    var panel = document.getElementById('nav-browse-mega');
    if (!trigger || !panel) return;

    function setExpanded(open) {
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    panel.addEventListener('focusin', function () {
      setExpanded(true);
    });

    document.addEventListener('focusin', function (e) {
      if (panel.contains(e.target) || trigger.contains(e.target)) {
        setExpanded(true);
        return;
      }
      setExpanded(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) {
        setExpanded(false);
        panel.classList.remove('is-open');
        trigger.focus();
      }
    });
  }

  function initCookieDialogA11y() {
    var banner = document.getElementById('cookie-consent-banner');
    if (!banner || banner.dataset.a11yBound === 'true') return;
    banner.dataset.a11yBound = 'true';
    banner.setAttribute('aria-modal', 'true');

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || banner.style.display === 'none') return;
      if (banner.classList.contains('hidden')) return;
      trapTabKey(e, banner);
    });
  }

  window.cfdA11y = {
    trapTabKey: trapTabKey,
    getFocusables: getFocusables,
  };

  function init() {
    initSkipLink();
    initMobileMenuA11y();
    initMegaMenuA11y();
    initCookieDialogA11y();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
