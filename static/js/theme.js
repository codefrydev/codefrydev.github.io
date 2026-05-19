/**
 * Theme: light → glass → dark (site-wide)
 */

(function () {
  'use strict';

  const THEME_STORAGE_KEY = 'theme-preference';
  const THEME_ATTRIBUTE = 'data-theme';
  const THEME_ORDER = ['light', 'glass', 'dark'];
  const THEME_COLORS = { light: '#e5e9f4', glass: '#eaf2fb', dark: '#0f172a' };

  function getInitialTheme() {
    var stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && THEME_ORDER.indexOf(stored) !== -1) return stored;
    return 'dark';
  }

  function getNextTheme(theme) {
    var i = THEME_ORDER.indexOf(theme);
    return THEME_ORDER[(i + 1) % THEME_ORDER.length];
  }

  function applyTheme(theme) {
    if (THEME_ORDER.indexOf(theme) === -1) theme = 'dark';
    document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);

    var themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', THEME_COLORS[theme] || THEME_COLORS.light);
    }

    localStorage.setItem(THEME_STORAGE_KEY, theme);
    updateToggleButtons(theme);
    document.dispatchEvent(
      new CustomEvent('cfd:theme-change', { detail: { theme: theme } })
    );
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute(THEME_ATTRIBUTE) || 'dark';
    applyTheme(getNextTheme(current));
  }

  function updateToggleButtons(theme) {
    var next = getNextTheme(theme);
    var label = 'Switch to ' + next + ' theme';

    document.querySelectorAll('#theme-toggle, [data-theme-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    });
  }

  function bindToggles() {
    document.querySelectorAll('#theme-toggle, [data-theme-toggle]').forEach(function (btn) {
      if (btn.dataset.themeBound === 'true') return;
      btn.dataset.themeBound = 'true';
      btn.addEventListener('click', toggleTheme);
    });
  }

  function initTheme() {
    applyTheme(getInitialTheme());
    bindToggles();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
})();
