(function () {
  'use strict';

  const btn = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-menu');
  if (btn && menu) {
    const lines = btn.querySelectorAll('span');
    let isOpen = false;

    function setOpen(open) {
      isOpen = open;
      var i18n = window.CFD_I18N || {};
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? (i18n.navCloseMenu || 'Close menu') : (i18n.navOpenMenu || 'Open menu'));
      if (open) {
        menu.removeAttribute('inert');
      } else {
        menu.setAttribute('inert', '');
      }
      document.body.classList.toggle('mobile-menu-open', open);

      if (open) {
        menu.classList.remove('translate-x-full', 'opacity-0', 'pointer-events-none');
        menu.classList.add('translate-x-0', 'opacity-100', 'pointer-events-auto');
        lines[0].classList.remove('-translate-y-1.5');
        lines[0].classList.add('rotate-45');
        lines[1].classList.add('opacity-0');
        lines[2].classList.remove('translate-y-1.5');
        lines[2].classList.add('-rotate-45');
      } else {
        menu.classList.add('translate-x-full', 'opacity-0', 'pointer-events-none');
        menu.classList.remove('translate-x-0', 'opacity-100', 'pointer-events-auto');
        lines[0].classList.remove('rotate-45');
        lines[0].classList.add('-translate-y-1.5');
        lines[1].classList.remove('opacity-0');
        lines[2].classList.remove('-rotate-45');
        lines[2].classList.add('translate-y-1.5');
      }
    }

    btn.addEventListener('click', function () {
      setOpen(!isOpen);
    });

    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        setOpen(false);
      });
    });

    window.cfdMobileMenu = {
      setOpen: setOpen,
      close: function () {
        setOpen(false);
      },
    };
  }

  /** Keep desktop dropdowns open while moving pointer from trigger to panel */
  function wireDropdown(triggerSelector, panelSelector, closeDelay) {
    const trigger = document.querySelector(triggerSelector);
    const panel = document.querySelector(panelSelector);
    if (!trigger || !panel) return;

    let closeTimer = null;

    function open() {
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
      panel.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
    }

    function scheduleClose() {
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(function () {
        panel.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        closeTimer = null;
      }, closeDelay);
    }

    trigger.addEventListener('mouseenter', open);
    trigger.addEventListener('focusin', open);
    panel.addEventListener('mouseenter', open);
    panel.addEventListener('focusin', open);

    trigger.addEventListener('mouseleave', scheduleClose);
    panel.addEventListener('mouseleave', scheduleClose);
    trigger.addEventListener('focusout', function (e) {
      if (!panel.contains(e.relatedTarget)) scheduleClose();
    });
    panel.addEventListener('focusout', function (e) {
      if (!trigger.contains(e.relatedTarget)) scheduleClose();
    });
  }

  wireDropdown('.nav-item-browse > a', '#nav-browse-mega', 120);

  /** Language switcher — toggle dropdown on click */
  (function () {
    var root = document.querySelector('.footer-lang');
    var trigger = document.getElementById('footer-lang-btn');
    var panel = document.getElementById('footer-lang-menu');
    if (!root || !trigger || !panel) return;

    var isOpen = false;

    function setOpen(open) {
      isOpen = open;
      root.classList.toggle('is-open', open);
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!isOpen);
    });

    document.addEventListener('click', function (e) {
      if (!root.contains(e.target)) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) {
        setOpen(false);
        trigger.focus();
      }
    });
  })();
})();
