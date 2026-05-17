(function () {
  'use strict';

  const btn = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-menu');
  if (btn && menu) {
    const lines = btn.querySelectorAll('span');
    let isOpen = false;

    function setOpen(open) {
      isOpen = open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');

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
})();
