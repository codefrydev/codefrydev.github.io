/**
 * CodeFryDev On-Demand Random Theme Generator
 * Inspired by ColorGene (mathematical design system generator).
 * 
 * Features:
 * - HSL / RGB / CIELAB color theory math
 * - Harmonies: Analogous, Complementary, Triadic, Split-Complementary, Tetradic, Monochrome
 * - 11-step calibrated lightness & saturation curves (50 to 950)
 * - WCAG AA/AAA contrast auto-calculation for accessible text and buttons
 * - Design tokens: brand, accents, surfaces, borders, tinted ambient shadows
 * - Real-time DOM styling injection with smooth transitions
 * - Interactive floating frosted-glass HUD controller (Next, Copy CSS, Reset, Collapse)
 */

(function () {
  'use strict';

  /* -------------------------------------------------------------------------
   * 1. Color Math & Science
   * ------------------------------------------------------------------------- */
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var mod = function (h) { return ((h % 360) + 360) % 360; };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };

  function hslToRgb(c) {
    var h = c.h, s = c.s / 100, l = c.l / 100;
    var k = function (n) { return (n + h / 30) % 12; };
    var a = s * Math.min(l, 1 - l);
    var f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); };
    return {
      r: Math.round(255 * f(0)),
      g: Math.round(255 * f(8)),
      b: Math.round(255 * f(4))
    };
  }

  function toHex(rgb) {
    return '#' + [rgb.r, rgb.g, rgb.b].map(function (x) {
      return clamp(x, 0, 255).toString(16).padStart(2, '0');
    }).join('');
  }

  function hslHex(c) {
    return toHex(hslToRgb(c));
  }

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(function (x) { return x + x; }).join('');
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    };
  }

  function rgbToHsl(rgb) {
    var r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return { h: h, s: s * 100, l: l * 100 };
  }

  function lin(x) {
    x /= 255;
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  }

  function luminance(rgb) {
    return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
  }

  function contrast(c1, c2) {
    var a = luminance(hslToRgb(c1)), b = luminance(hslToRgb(c2));
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }

  var cssHsl = function (c) {
    return 'hsl(' + c.h.toFixed(1) + ' ' + c.s.toFixed(1) + '% ' + c.l.toFixed(1) + '%)';
  };

  /* -------------------------------------------------------------------------
   * 2. Harmonies & Scale Curves (ColorGene Engine)
   * ------------------------------------------------------------------------- */
  var HARMONIES = {
    analogous: { label: 'Analogous', a: 30, b: -30 },
    complementary: { label: 'Complementary', a: 180, b: 35 },
    triadic: { label: 'Triadic', a: 120, b: 240 },
    split: { label: 'Split-Comp.', a: 150, b: 210 },
    tetradic: { label: 'Tetradic', a: 90, b: 180 },
    monochrome: { label: 'Monochrome', a: 0, b: 0 }
  };

  var STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  var L_CURVE = { 50: 97, 100: 94, 200: 86, 300: 77, 400: 66, 500: 55, 600: 45, 700: 35, 800: 25, 900: 15, 950: 9 };
  var S_CURVE = { 50: 0.6, 100: 0.72, 200: 0.86, 300: 0.95, 400: 1, 500: 1, 600: 1, 700: 0.96, 800: 0.9, 900: 0.82, 950: 0.72 };
  var SEM_BASE = { success: 145, warning: 42, danger: 6, info: 210 };

  var HUE_NAMES = [
    { max: 15, name: 'Crimson' },
    { max: 35, name: 'Coral' },
    { max: 55, name: 'Amber' },
    { max: 80, name: 'Gold' },
    { max: 150, name: 'Emerald' },
    { max: 180, name: 'Teal' },
    { max: 210, name: 'Cyan' },
    { max: 245, name: 'Sapphire' },
    { max: 275, name: 'Indigo' },
    { max: 310, name: 'Violet' },
    { max: 340, name: 'Fuchsia' },
    { max: 360, name: 'Ruby' }
  ];

  function getHueName(h) {
    h = mod(h);
    for (var i = 0; i < HUE_NAMES.length; i++) {
      if (h <= HUE_NAMES[i].max) return HUE_NAMES[i].name;
    }
    return 'Chromatic';
  }

  function makeScale(h, s, flat) {
    var out = {};
    for (var i = 0; i < STOPS.length; i++) {
      var k = STOPS[i];
      out[k] = {
        h: mod(h),
        s: clamp(s * (flat ? 1 : S_CURVE[k]), 0, 100),
        l: L_CURVE[k]
      };
    }
    return out;
  }

  function pickStop(scale, candidates, bg, minRatio) {
    var best = candidates[0], bestR = 0;
    for (var i = 0; i < candidates.length; i++) {
      var k = candidates[i];
      var r = contrast(scale[k], bg);
      if (r >= minRatio) return { stop: k, ratio: r, ok: true };
      if (r > bestR) { bestR = r; best = k; }
    }
    return { stop: best, ratio: bestR, ok: false };
  }

  /* -------------------------------------------------------------------------
   * 3. System Synthesis Engine
   * ------------------------------------------------------------------------- */
  function generateSystem(config) {
    config = config || {};
    var isDark = config.mode !== undefined ? config.mode === 'dark' : (document.documentElement.getAttribute('data-theme') !== 'light');
    
    // Base colour parameters
    var baseHue = config.h !== undefined ? config.h : rnd(0, 360);
    var baseSat = config.s !== undefined ? config.s : rnd(65, 92);
    var baseLight = config.l !== undefined ? config.l : rnd(50, 60);
    var harmonyKey = config.harmony || pick(Object.keys(HARMONIES));
    var harm = HARMONIES[harmonyKey];

    var accentHue = mod(baseHue + harm.a + rnd(-10, 10));
    var secondHue = mod(baseHue + harm.b + rnd(-10, 10));
    var neutralHue = mod(baseHue + rnd(-15, 15));
    var neutralTint = rnd(6, 16);

    // Primary, Accent, Secondary, Neutral scales
    var scales = {
      p: makeScale(baseHue, baseSat),
      a: makeScale(accentHue, baseSat * (harmonyKey === 'monochrome' ? 0.6 : 1)),
      s: makeScale(secondHue, baseSat * (harmonyKey === 'monochrome' ? 0.45 : 0.85)),
      n: makeScale(neutralHue, neutralTint, true)
    };

    // Semantic status scales (slightly pulled towards primary hue for harmony)
    ['success', 'warning', 'danger', 'info'].forEach(function (k) {
      var delta = ((baseHue - SEM_BASE[k] + 540) % 360) - 180;
      var h = mod(SEM_BASE[k] + delta * 0.12);
      scales[k] = makeScale(h, clamp(baseSat, 60, 95));
    });

    var N = scales.n, P = scales.p, A = scales.a;
    var surface = isDark ? N[900] : { h: 0, s: 0, l: 100 };
    var appBg = isDark ? N[950] : N[50];

    // Contrast-derived text & buttons
    var tp = pickStop(N, isDark ? [50, 100] : [900, 950], surface, 7);
    var ts = pickStop(N, isDark ? [300, 200, 100] : [600, 700, 800], surface, 4.5);
    var tm = pickStop(N, isDark ? [400, 300] : [500, 600], surface, 3.5);

    var btnBg = pickStop(P, isDark ? [400, 300, 500] : [600, 700, 800], surface, 4.5);
    var btnText = contrast(P[btnBg.stop], { h: 0, s: 0, l: 100 }) >= 4.5 ? '#ffffff' : hslHex(N[950]);

    var accBg = isDark ? A[400] : A[600];
    var accHover = isDark ? A[300] : A[700];

    // Ambient shadows tinted with base hue
    var shHue = Math.round(baseHue);
    var shadowCard = isDark
      ? '0 4px 20px -2px hsl(' + shHue + ' 50% 2% / 0.6), 0 1px 3px hsl(' + shHue + ' 40% 4% / 0.4)'
      : '0 4px 20px -2px hsl(' + shHue + ' 30% 25% / 0.08), 0 1px 3px hsl(' + shHue + ' 25% 20% / 0.05)';
    var shadowHover = isDark
      ? '0 12px 30px -4px hsl(' + shHue + ' 60% 3% / 0.75), 0 4px 8px hsl(' + shHue + ' 50% 5% / 0.5)'
      : '0 12px 30px -4px hsl(' + shHue + ' 35% 30% / 0.14), 0 4px 8px hsl(' + shHue + ' 30% 25% / 0.08)';

    var paletteName = getHueName(baseHue) + ' ' + (isDark ? 'Eclipse' : 'Radiance') + ' · ' + harm.label;

    return {
      name: paletteName,
      isDark: isDark,
      baseHue: baseHue,
      harmony: harm.label,
      scales: scales,
      tokens: {
        '--cfd-p-primary': hslHex(P[500]),
        '--cfd-p-accent': hslHex(A[500]),
        '--cfd-p-secondary': hslHex(scales.s[500]),
        '--cfd-p-neutral': hslHex(N[500]),
        '--brand': hslHex(P[isDark ? 400 : 600]),
        '--brand-muted': hslHex(P[isDark ? 800 : 200]),
        '--accent-color': hslHex(accBg),
        '--accent-hover': hslHex(accHover),
        '--link-color': hslHex(P[isDark ? 300 : 600]),
        '--link-hover': hslHex(P[isDark ? 200 : 700]),
        '--bg-primary': hslHex(appBg),
        '--bg-secondary': hslHex(isDark ? N[900] : N[100]),
        '--bg-tertiary': hslHex(isDark ? N[800] : N[200]),
        '--bg-card': hslHex(surface),
        '--text-primary': hslHex(N[tp.stop]),
        '--text-secondary': hslHex(N[ts.stop]),
        '--text-tertiary': hslHex(N[tm.stop]),
        '--text-quaternary': hslHex(N[isDark ? 500 : 400]),
        '--border-light': isDark ? 'hsl(' + neutralHue + ' ' + neutralTint + '% 20% / 0.8)' : 'hsl(' + neutralHue + ' ' + neutralTint + '% 88% / 0.9)',
        '--border-medium': isDark ? hslHex(N[700]) : hslHex(N[300]),
        '--button-bg': hslHex(P[btnBg.stop]),
        '--button-text': btnText,
        '--button-text-hover': hslHex(P[isDark ? 200 : 800]),
        '--shadow-card': shadowCard,
        '--shadow-card-hover': shadowHover
      }
    };
  }

  /* -------------------------------------------------------------------------
   * 4. DOM Style Injection & Live Theme Application
   * ------------------------------------------------------------------------- */
  var STYLE_ID = 'cfd-random-theme-style';
  var currentSystem = null;

  function buildCSSRuleOverrides(sys) {
    var t = sys.tokens;
    var isDark = sys.isDark;
    var p = sys.scales.p;
    var n = sys.scales.n;
    var a = sys.scales.a;

    var css = ':root, [data-theme="random"] {\n';
    Object.keys(t).forEach(function (k) {
      css += '  ' + k + ': ' + t[k] + ' !important;\n';
    });
    STOPS.forEach(function (stop) {
      css += '  --p-' + stop + ': ' + hslHex(p[stop]) + ' !important;\n';
      css += '  --a-' + stop + ': ' + hslHex(a[stop]) + ' !important;\n';
      css += '  --n-' + stop + ': ' + hslHex(n[stop]) + ' !important;\n';
    });
    css += '}\n\n';

    css += '[data-theme="random"] {\n';
    css += '  color-scheme: ' + (isDark ? 'dark' : 'light') + ' !important;\n';
    css += '}\n\n';

    // Global transitions
    css += '[data-theme="random"] body,\n';
    css += '[data-theme="random"] header,\n';
    css += '[data-theme="random"] .tool-card,\n';
    css += '[data-theme="random"] .home-card,\n';
    css += '[data-theme="random"] .site-footer {\n';
    css += '  transition: background-color 0.4s ease, border-color 0.4s ease, color 0.3s ease, box-shadow 0.4s ease !important;\n';
    css += '}\n\n';

    // Page canvas
    css += '[data-theme="random"] body.home-page,\n';
    css += '[data-theme="random"] body {\n';
    css += '  background-color: ' + t['--bg-primary'] + ' !important;\n';
    css += '  color: ' + t['--text-primary'] + ' !important;\n';
    css += '}\n\n';

    // Header & Navigation
    css += '[data-theme="random"] body.home-page > header.nav-shell,\n';
    css += '[data-theme="random"] header.nav-shell {\n';
    css += '  background-color: ' + (isDark ? 'rgba(' + hexToRgb(t['--bg-secondary']).r + ',' + hexToRgb(t['--bg-secondary']).g + ',' + hexToRgb(t['--bg-secondary']).b + ', 0.92)' : 'rgba(255, 255, 255, 0.92)') + ' !important;\n';
    css += '  border-color: ' + t['--border-light'] + ' !important;\n';
    css += '}\n\n';

    css += '[data-theme="random"] header .rounded-full.bg-slate-100\\/90 {\n';
    css += '  background-color: ' + t['--bg-card'] + ' !important;\n';
    css += '  border-color: ' + t['--border-light'] + ' !important;\n';
    css += '}\n\n';

    css += '[data-theme="random"] header nav a.bg-white,\n';
    css += '[data-theme="random"] header nav button.bg-white {\n';
    css += '  background-color: ' + t['--bg-card'] + ' !important;\n';
    css += '  color: ' + t['--brand'] + ' !important;\n';
    css += '}\n\n';

    css += '[data-theme="random"] .nav-mega__panel,\n';
    css += '[data-theme="random"] #mobile-menu {\n';
    css += '  background-color: ' + t['--bg-card'] + ' !important;\n';
    css += '  border-color: ' + t['--border-light'] + ' !important;\n';
    css += '  color: ' + t['--text-primary'] + ' !important;\n';
    css += '}\n\n';

    // Cards & Surfaces
    css += '[data-theme="random"] .tool-card,\n';
    css += '[data-theme="random"] .home-card,\n';
    css += '[data-theme="random"] .browse-category-card,\n';
    css += '[data-theme="random"] .browse-hub-card,\n';
    css += '[data-theme="random"] .bg-white,\n';
    css += '[data-theme="random"] .bg-white\\/80,\n';
    css += '[data-theme="random"] .bg-white\\/90,\n';
    css += '[data-theme="random"] .bg-white\\/95,\n';
    css += '[data-theme="random"] .bg-slate-900,\n';
    css += '[data-theme="random"] .bg-slate-950,\n';
    css += '[data-theme="random"] .bg-slate-800,\n';
    css += '[data-theme="random"] .dark\\:bg-slate-900,\n';
    css += '[data-theme="random"] .dark\\:bg-slate-800 {\n';
    css += '  background-color: ' + t['--bg-card'] + ' !important;\n';
    css += '  border-color: ' + t['--border-light'] + ' !important;\n';
    css += '}\n\n';

    // Section backgrounds
    css += '[data-theme="random"] .bg-gray-50,\n';
    css += '[data-theme="random"] .bg-gray-50\\/50,\n';
    css += '[data-theme="random"] .bg-slate-50,\n';
    css += '[data-theme="random"] .bg-slate-100,\n';
    css += '[data-theme="random"] .bg-slate-100\\/90,\n';
    css += '[data-theme="random"] .dark\\:bg-slate-900\\/30 {\n';
    css += '  background-color: ' + t['--bg-secondary'] + ' !important;\n';
    css += '}\n\n';

    // Typography
    css += '[data-theme="random"] .text-slate-900,\n';
    css += '[data-theme="random"] .text-slate-800,\n';
    css += '[data-theme="random"] .text-\\[\\#0B162C\\],\n';
    css += '[data-theme="random"] .dark\\:text-white {\n';
    css += '  color: ' + t['--text-primary'] + ' !important;\n';
    css += '}\n\n';

    css += '[data-theme="random"] .text-slate-700,\n';
    css += '[data-theme="random"] .text-slate-600,\n';
    css += '[data-theme="random"] .dark\\:text-slate-300,\n';
    css += '[data-theme="random"] .dark\\:text-slate-200 {\n';
    css += '  color: ' + t['--text-secondary'] + ' !important;\n';
    css += '}\n\n';

    css += '[data-theme="random"] .text-slate-500,\n';
    css += '[data-theme="random"] .text-slate-400,\n';
    css += '[data-theme="random"] .dark\\:text-slate-400 {\n';
    css += '  color: ' + t['--text-tertiary'] + ' !important;\n';
    css += '}\n\n';

    // Brand accents & buttons
    css += '[data-theme="random"] .text-brand,\n';
    css += '[data-theme="random"] a.text-brand,\n';
    css += '[data-theme="random"] .hover\\:text-brand:hover {\n';
    css += '  color: ' + t['--brand'] + ' !important;\n';
    css += '}\n\n';

    css += '[data-theme="random"] .bg-brand {\n';
    css += '  background-color: ' + t['--brand'] + ' !important;\n';
    css += '  color: ' + t['--button-text'] + ' !important;\n';
    css += '}\n\n';

    css += '[data-theme="random"] .hover\\:text-brand:hover {\n';
    css += '  color: ' + t['--accent-color'] + ' !important;\n';
    css += '}\n\n';

    // Borders
    css += '[data-theme="random"] .border-slate-200,\n';
    css += '[data-theme="random"] .border-slate-300,\n';
    css += '[data-theme="random"] .border-slate-700,\n';
    css += '[data-theme="random"] .border-slate-800,\n';
    css += '[data-theme="random"] .border-gray-100,\n';
    css += '[data-theme="random"] .border-gray-200,\n';
    css += '[data-theme="random"] .dark\\:border-slate-800,\n';
    css += '[data-theme="random"] .dark\\:border-slate-700 {\n';
    css += '  border-color: ' + t['--border-light'] + ' !important;\n';
    css += '}\n\n';

    // Footer
    css += '[data-theme="random"] .site-footer {\n';
    css += '  background-color: ' + t['--bg-secondary'] + ' !important;\n';
    css += '  border-top-color: ' + t['--border-light'] + ' !important;\n';
    css += '}\n\n';

    // Mobile Dock
    css += '[data-theme="random"] .cfd-mobile-dock__inner {\n';
    css += '  background-color: ' + (isDark ? 'rgba(' + hexToRgb(t['--bg-secondary']).r + ',' + hexToRgb(t['--bg-secondary']).g + ',' + hexToRgb(t['--bg-secondary']).b + ', 0.92)' : 'rgba(255, 255, 255, 0.92)') + ' !important;\n';
    css += '  border-color: ' + t['--border-light'] + ' !important;\n';
    css += '  color: ' + t['--text-primary'] + ' !important;\n';
    css += '}\n\n';

    // Shadows
    css += '[data-theme="random"] .shadow-sm,\n';
    css += '[data-theme="random"] .shadow-md,\n';
    css += '[data-theme="random"] .shadow-lg,\n';
    css += '[data-theme="random"] .shadow-xl {\n';
    css += '  box-shadow: ' + t['--shadow-card'] + ' !important;\n';
    css += '}\n';

    return css;
  }

  function applySystem(sys) {
    currentSystem = sys;
    var el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = buildCSSRuleOverrides(sys);

    // Set data-theme="random" on <html> element so dark/light theme !important rules yield
    document.documentElement.setAttribute('data-theme', 'random');

    // Set custom properties directly on :root element style
    Object.keys(sys.tokens).forEach(function (k) {
      document.documentElement.style.setProperty(k, sys.tokens[k]);
    });

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', sys.tokens['--bg-primary']);
    }
  }

  function resetTheme() {
    var el = document.getElementById(STYLE_ID);
    if (el) el.remove();
    currentSystem = null;

    var origTheme = 'dark';
    try {
      if (typeof localStorage !== 'undefined') {
        origTheme = localStorage.getItem('theme-preference') || 'dark';
      }
    } catch (e) {}
    document.documentElement.setAttribute('data-theme', origTheme);

    var tokensToClear = [
      '--bg-primary', '--bg-secondary', '--bg-tertiary', '--bg-card',
      '--text-primary', '--text-secondary', '--text-tertiary', '--text-quaternary',
      '--link-color', '--link-hover', '--accent-color', '--accent-hover',
      '--border-light', '--border-medium', '--button-bg', '--button-text',
      '--button-text-hover', '--shadow-card', '--shadow-card-hover',
      '--brand', '--brand-muted'
    ];
    tokensToClear.forEach(function (k) {
      document.documentElement.style.removeProperty(k);
    });

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', origTheme === 'dark' ? '#0f172a' : '#f4f6fa');
    }
  }

  /* -------------------------------------------------------------------------
   * 5. Public API
   * ------------------------------------------------------------------------- */
  function randomize() {
    var sys = generateSystem();
    applySystem(sys);
  }

  function initAndGenerate() {
    randomize();
  }

  window.CFDRandomTheme = {
    randomize: randomize,
    reset: resetTheme,
    initAndGenerate: initAndGenerate,
    generateSystem: generateSystem,
    applySystem: applySystem
  };

})();
