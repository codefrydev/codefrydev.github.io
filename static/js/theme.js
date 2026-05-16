/**
 * Theme Management Script
 * Handles dark/light theme switching with localStorage persistence
 */

(function () {
  'use strict';

  const THEME_STORAGE_KEY = 'theme-preference';
  const THEME_ATTRIBUTE = 'data-theme';

  function getInitialTheme() {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', theme === 'dark' ? '#0f172a' : '#e5e9f4');
    }

    localStorage.setItem(THEME_STORAGE_KEY, theme);
    updateToggleButtons(theme);
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute(THEME_ATTRIBUTE) || 'light';
    applyTheme(currentTheme === 'light' ? 'dark' : 'light');
  }

  function updateLegacyIcon(icon, isDark) {
    if (!icon) return;
    if (isDark) {
      icon.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
    } else {
      icon.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }
  }

  function updateToggleButtons(theme) {
    const isDark = theme === 'dark';
    const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';

    document.querySelectorAll('#theme-toggle, [data-theme-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
      updateLegacyIcon(btn.querySelector('.theme-icon'), isDark);
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
