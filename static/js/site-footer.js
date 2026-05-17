(function () {
  'use strict';

  var footer = document.getElementById('footer');
  if (!footer) return;

  var mqDesktop = window.matchMedia('(min-width: 768px)');
  var accordions = footer.querySelectorAll('.site-footer__accordion');

  function syncAccordions() {
    accordions.forEach(function (el) {
      if (mqDesktop.matches) {
        el.setAttribute('open', '');
      } else if (!el.dataset.userToggled) {
        el.removeAttribute('open');
      }
    });
  }

  accordions.forEach(function (el) {
    el.addEventListener('toggle', function () {
      if (!mqDesktop.matches) {
        el.dataset.userToggled = '1';
      }
    });
  });

  if (typeof mqDesktop.addEventListener === 'function') {
    mqDesktop.addEventListener('change', syncAccordions);
  } else {
    mqDesktop.addListener(syncAccordions);
  }

  syncAccordions();

  var backTop = footer.querySelector('[data-footer-back-top]');
  if (backTop) {
    backTop.hidden = false;
    backTop.addEventListener('click', function () {
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }
})();
