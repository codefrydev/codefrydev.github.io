(function () {
  'use strict';

  var palette, backdrop, dialog, input, resultsList, defaultPanel, emptyPanel, activeIndex = -1;
  var allItems = [];
  var isEmbedded = false;
  var isOpen = false;
  var triggersBound = false;
  var initialized = false;
  var pendingOpen = false;
  var openingClick = false;
  var openedAt = 0;
  var activeCategory = null;
  var activeCategorySlug = null;
  var OPEN_GUARD_MS = 350;

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function normalizeUrl(url) {
    return (url || '').replace(/\/$/, '').toLowerCase();
  }

  function buildIndex(data) {
    var items = [];
    var seen = new Set();

    function push(item) {
      if (item.hidden) return;
      var key = normalizeUrl(item.url);
      if (!key || seen.has(key)) return;
      seen.add(key);
      items.push(item);
    }

    function mapItem(raw, category, type) {
      return {
        name: raw.name,
        url: raw.url,
        category: category,
        type: type,
        description: raw.description || '',
        phosphorIcon: raw.phosphorIcon || 'app-window',
        external: !!raw.external || /^https?:\/\//.test(raw.url || ''),
        hidden: raw.hidden
      };
    }

    if (data.home && data.home.categories) {
      data.home.categories.forEach(function (cat) {
        (cat.items || []).forEach(function (item) {
          push(mapItem(item, cat.name, 'tool'));
        });
      });
    }
    if (data.ai && data.ai.data) {
      data.ai.data.forEach(function (item) {
        push(mapItem(item, 'AI Tools', 'ai'));
      });
    }
    if (data.games && data.games.data) {
      data.games.data.forEach(function (item) {
        push(mapItem(item, 'Games', 'game'));
      });
    }
    if (data.designlab && data.designlab.data) {
      data.designlab.data.forEach(function (item) {
        push(mapItem(item, 'Design Lab', 'design'));
      });
    }
    if (data.store && data.store.data) {
      data.store.data.forEach(function (item) {
        push(mapItem(item, 'Store', 'store'));
      });
    }

    return items;
  }

  function absUrl(url, base) {
    if (!url) return '#';
    var root = (base || '/').replace(/"/g, '').replace(/\/+$/, '');
    if (/^https?:\/\//.test(url)) return url;
    if (url.charAt(0) === '/') return root + url;
    return root + '/' + url;
  }

  function highlight(text, q) {
    if (!text || !q) return text || '';
    var esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp('(' + esc + ')', 'gi'), '<mark>$1</mark>');
  }

  function slugify(value) {
    return (value || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function itemMatchesScope(item) {
    if (!activeCategory && !activeCategorySlug) return true;
    if (activeCategory && item.category === activeCategory) return true;
    if (activeCategorySlug && slugify(item.category) === activeCategorySlug) return true;
    if (activeCategorySlug === 'games-fun') {
      return item.type === 'game' || item.category === 'Games & Fun' || item.category === 'Games';
    }
    if (activeCategorySlug === 'tools-utilities') {
      return item.type === 'tool' && (item.category === 'Tools & Utilities' || slugify(item.category) === 'tools-utilities');
    }
    if (activeCategorySlug === 'creative-assets') {
      return item.type === 'tool' && (item.category === 'Creative & Assets' || slugify(item.category) === 'creative-assets');
    }
    if (activeCategorySlug === 'site-links') {
      return item.category === 'Site & External Links' || slugify(item.category) === 'site-links';
    }
    return false;
  }

  function readScopeFromButton(btn) {
    if (!btn) {
      activeCategory = null;
      activeCategorySlug = null;
      return;
    }
    activeCategory = btn.getAttribute('data-search-category') || null;
    activeCategorySlug = btn.getAttribute('data-search-category-slug') || null;
  }

  function goToSearchPage(query) {
    var url = '/search/';
    var params = new URLSearchParams();
    if (query) params.set('q', query);
    if (activeCategory) params.set('category', activeCategory);
    if (activeCategorySlug) params.set('category_slug', activeCategorySlug);
    var qs = params.toString();
    if (qs) url += '?' + qs;
    window.location.href = url;
  }

  function getInteractives() {
    if (!resultsList || resultsList.hidden) {
      return Array.prototype.slice.call(
        document.querySelectorAll('#search-palette-default .search-palette__result, #search-palette-default .search-palette__chip')
      );
    }
    return Array.prototype.slice.call(resultsList.querySelectorAll('.search-palette__result'));
  }

  function setActive(idx) {
    var nodes = getInteractives();
    nodes.forEach(function (el) {
      el.classList.remove('is-active');
      el.removeAttribute('aria-selected');
    });
    activeIndex = idx;
    if (idx >= 0 && idx < nodes.length) {
      nodes[idx].classList.add('is-active');
      nodes[idx].setAttribute('aria-selected', 'true');
      nodes[idx].scrollIntoView({ block: 'nearest' });
    }
  }

  function renderResults(matches, query) {
    if (!resultsList) return;
    resultsList.innerHTML = '';
    var hasQuery = !!(query && query.trim());
    if (!hasQuery && matches.length === 0) {
      resultsList.hidden = true;
      if (defaultPanel) defaultPanel.hidden = false;
      if (emptyPanel) emptyPanel.hidden = true;
      setActive(-1);
      return;
    }
    if (defaultPanel) defaultPanel.hidden = true;
    if (matches.length === 0) {
      resultsList.hidden = true;
      if (emptyPanel) emptyPanel.hidden = false;
      setActive(-1);
      return;
    }
    if (emptyPanel) emptyPanel.hidden = true;
    resultsList.hidden = false;

    var base = (window.CFD_SEARCH && window.CFD_SEARCH.baseURL) || '/';
    matches.slice(0, 24).forEach(function (item) {
      var li = document.createElement('li');
      li.setAttribute('role', 'option');
      var a = document.createElement('a');
      a.href = absUrl(item.url, base);
      a.className = 'search-palette__result';
      if (item.external) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      a.setAttribute('data-cfd-tool', item.name);
      a.setAttribute('data-cfd-category', item.category);
      a.setAttribute('data-cfd-source', 'search_palette');
      a.innerHTML =
        '<span class="search-palette__result-icon"><i class="ph-fill ph-' +
        item.phosphorIcon +
        '" aria-hidden="true"></i></span>' +
        '<span class="search-palette__result-text">' +
        '<span class="search-palette__result-name">' +
        highlight(item.name, query) +
        '</span>' +
        '<span class="search-palette__result-desc">' +
        highlight(item.description, query) +
        '</span>' +
        '<span class="search-palette__result-meta">' +
        '<span class="search-palette__badge search-palette__badge--' +
        item.type +
        '">' +
        item.category +
        '</span></span></span>' +
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" class="search-palette__result-arrow" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>';
      li.appendChild(a);
      resultsList.appendChild(li);
    });
    setActive(0);
  }

  function runSearch(q) {
    var term = q.trim().toLowerCase();
    if (!term) {
      if (activeCategory || activeCategorySlug) {
        var scoped = allItems.filter(itemMatchesScope);
        renderResults(scoped, '');
      } else {
        renderResults([], '');
      }
      return;
    }
    var matches = allItems.filter(function (item) {
      if (!itemMatchesScope(item)) return false;
      return (
        item.name.toLowerCase().indexOf(term) !== -1 ||
        item.category.toLowerCase().indexOf(term) !== -1 ||
        (item.description || '').toLowerCase().indexOf(term) !== -1
      );
    });
    renderResults(matches, q.trim());
    if (typeof window.cfdTrackSearch === 'function') {
      window.cfdTrackSearch('palette', q.trim(), matches.length);
    }
  }

  function setBodyScrollLocked(locked) {
    if (isEmbedded) return;
    document.body.classList.toggle('search-palette-open', locked);
  }

  function closeMobileMenu() {
    if (window.cfdMobileMenu && typeof window.cfdMobileMenu.close === 'function') {
      window.cfdMobileMenu.close();
    }
  }

  function focusSearchInput() {
    if (!input) return;
    var opts = { preventScroll: true };
    if (document.activeElement && document.activeElement.closest && document.activeElement.closest('[data-search-open]')) {
      document.activeElement.blur();
    }
    input.focus(opts);
    requestAnimationFrame(function () {
      if (!input) return;
      input.focus(opts);
      requestAnimationFrame(function () {
        if (!input) return;
        input.focus(opts);
      });
    });
    setTimeout(function () {
      if (!input || !isOpen) return;
      input.focus(opts);
    }, 220);
  }

  function isPaletteVisible() {
    return !!(palette && palette.classList.contains('is-visible'));
  }

  /** Fixed overlay must be a direct child of body (avoids trapped stacking contexts). */
  function mountPaletteToBody() {
    if (!palette || palette.parentElement === document.body) return;
    document.body.appendChild(palette);
  }

  function open(query) {
    if (!initialized) {
      init();
    }
    if (!palette) {
      if (!initialized) {
        pendingOpen = true;
        return;
      }
      goToSearchPage(query || '');
      return;
    }

    mountPaletteToBody();

    if (isEmbedded) {
      if (input) {
        focusSearchInput();
        runSearch(query || input.value || '');
      }
      return;
    }
    if (isOpen && isPaletteVisible()) {
      if (input) {
        if (query) {
          input.value = query;
          runSearch(query);
        }
        focusSearchInput();
      }
      return;
    }
    if (isOpen && !isPaletteVisible()) {
      isOpen = false;
      setBodyScrollLocked(false);
    }

    closeMobileMenu();
    isOpen = true;
    openedAt = Date.now();
    palette.removeAttribute('hidden');
    palette.hidden = false;
    palette.setAttribute('aria-hidden', 'false');
    setBodyScrollLocked(true);
    palette.classList.add('is-visible');
    palette.style.pointerEvents = 'auto';
    palette.style.visibility = 'visible';
    palette.style.zIndex = '10100';
    if (input) {
      input.value = query || '';
      runSearch(input.value);
      focusSearchInput();
    }
  }

  function handleOpenTrigger(btn, event) {
    if (event) {
      event.preventDefault();
      if (event.type === 'click') event.stopPropagation();
    }
    if (openingClick) return;
    openingClick = true;
    setTimeout(function () {
      openingClick = false;
    }, 0);
    readScopeFromButton(btn);
    open('');
  }

  function close(opts) {
    if (isEmbedded) return;
    setBodyScrollLocked(false);
    if (!palette || !isOpen) return;
    if (!(opts && opts.force) && Date.now() - openedAt < OPEN_GUARD_MS) return;
    isOpen = false;
    activeCategory = null;
    activeCategorySlug = null;
    palette.classList.remove('is-visible');
    palette.setAttribute('aria-hidden', 'true');
    palette.style.pointerEvents = '';
    palette.style.visibility = '';
    palette.style.zIndex = '';
    setTimeout(function () {
      palette.hidden = true;
      palette.setAttribute('hidden', '');
      if (input) input.value = '';
      renderResults([], '');
    }, 200);
  }

  function unlockBodyOnExit() {
    setBodyScrollLocked(false);
  }

  function openSelected() {
    var nodes = getInteractives();
    if (activeIndex >= 0 && nodes[activeIndex]) {
      nodes[activeIndex].click();
      close({ force: true });
    }
  }

  function initKbdLabels() {
    var isMac = /Mac|iPhone|iPad/i.test(navigator.platform || '');
    document.querySelectorAll('[data-search-kbd-mod]').forEach(function (el) {
      el.textContent = isMac ? '⌘' : 'Ctrl+';
    });
    var footer = document.querySelector('[data-search-kbd-mod].search-palette__footer-kbd');
    if (footer) footer.textContent = (isMac ? '⌘' : 'Ctrl+') + 'K';
  }

  function bindTriggers() {
    if (triggersBound) return;
    triggersBound = true;

    document.addEventListener(
      'click',
      function (e) {
        var openBtn = e.target.closest('[data-search-open]');
        if (openBtn) {
          handleOpenTrigger(openBtn, e);
          return;
        }
        if (e.target.closest('[data-search-close]')) {
          e.preventDefault();
          close({ force: true });
        }
      },
      true
    );

    /* Direct bind — fallback when delegated capture is blocked by overlays */
    document.querySelectorAll('[data-search-open]').forEach(function (btn) {
      if (btn.dataset.searchOpenBound === 'true') return;
      btn.dataset.searchOpenBound = 'true';
      btn.addEventListener('click', function (e) {
        handleOpenTrigger(btn, e);
      });
    });
  }

  function bindPalette() {
    if (!palette) return;

    document.querySelectorAll('[data-search-close]').forEach(function (el) {
      el.addEventListener('click', function () {
        close({ force: true });
      });
    });

    window.addEventListener('pagehide', unlockBodyOnExit);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') unlockBodyOnExit();
    });

    if (input) {
      var debounce;
      input.addEventListener('input', function () {
        clearTimeout(debounce);
        debounce = setTimeout(function () {
          runSearch(input.value);
          if (isEmbedded) {
            var url = new URL(window.location.href);
            if (input.value.trim()) url.searchParams.set('q', input.value.trim());
            else url.searchParams.delete('q');
            window.history.replaceState({}, '', url);
          }
        }, 120);
      });

      input.addEventListener('keydown', function (e) {
        var nodes = getInteractives();
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActive(Math.min(activeIndex + 1, nodes.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActive(Math.max(activeIndex - 1, 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          openSelected();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          close({ force: true });
        }
      });
    }
  }

  function init() {
    if (initialized) return true;

    palette = document.getElementById('search-palette');
    if (!palette) {
      return false;
    }

    if (window.CFD_SEARCH && window.CFD_SEARCH.data) {
      allItems = buildIndex(window.CFD_SEARCH.data);
    } else {
      allItems = [];
    }

    mountPaletteToBody();
    initialized = true;

    backdrop = $('.search-palette__backdrop', palette);
    dialog = $('.search-palette__dialog', palette);
    input = document.getElementById('search-palette-input');
    resultsList = document.getElementById('search-palette-results');
    defaultPanel = document.getElementById('search-palette-default');
    emptyPanel = document.getElementById('search-palette-empty');
    isEmbedded =
      document.body.classList.contains('search-palette-page') ||
      /^\/search\/?$/.test(window.location.pathname);

    initKbdLabels();
    bindPalette();
    bindTriggers();

    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        activeCategory = null;
        activeCategorySlug = null;
        if (isOpen && !isEmbedded) close({ force: true });
        else open('');
        return;
      }
      if (e.key === 'Escape' && isOpen && !isEmbedded) close({ force: true });
    });

    if (isEmbedded) {
      palette.removeAttribute('hidden');
      palette.hidden = false;
      palette.classList.add('is-visible', 'search-palette--embedded');
      isOpen = true;
      var params = new URLSearchParams(window.location.search);
      activeCategory = params.get('category') || null;
      activeCategorySlug = params.get('category_slug') || null;
      var q = params.get('q') || '';
      if (input) {
        input.value = q;
        runSearch(q);
        focusSearchInput();
      }
    }

    window.cfdSearchPalette = { open: open, close: close, goToSearchPage: goToSearchPage };
    if (pendingOpen) {
      pendingOpen = false;
      open('');
    }
    return true;
  }

  window.cfdSearchPalette = {
    open: function (q) {
      open(q || '');
    },
    close: function (opts) {
      close(opts);
    },
    goToSearchPage: goToSearchPage,
  };

  function boot() {
    bindTriggers();
    if (init()) return;
    var attempts = 0;
    var timer = setInterval(function () {
      attempts += 1;
      if (init() || attempts > 40) clearInterval(timer);
    }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
