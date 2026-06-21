import Fuse from 'fuse.js';

(function () {
  'use strict';

  var palette, backdrop, dialog, input, resultsList, defaultPanel, emptyPanel, suggestPanel, suggestBtn;
  var recentPanel, recentList, activeIndex = -1;
  var allItems = [];
  var fuse = null;
  var isOpen = false;
  var triggersBound = false;
  var initialized = false;
  var pendingOpen = false;
  var openingClick = false;
  var openedAt = 0;
  var activeCategory = null;
  var activeCategorySlug = null;
  var OPEN_GUARD_MS = 350;
  var RECENT_KEY = 'cfd_recent_searches';
  var RECENT_MAX = 5;
  var SUGGEST_SCORE_THRESHOLD = 0.35;
  var REMOTE_CACHE_KEY = 'cfd_remote_search_v1';
  var REMOTE_CACHE_VERSION = 1;
  var REMOTE_CACHE_TTL_MS = 30 * 60 * 1000;
  var REMOTE_DESCRIPTION_MAX = 200;
  var REMOTE_CONTENT_EXCERPT = 300;
  var indexByUrl = new Map();
  var remoteLoadStarted = false;

  var FUSE_OPTIONS = {
    keys: [
      { name: 'name', weight: 0.4 },
      { name: 'category', weight: 0.12 },
      { name: 'description', weight: 0.23 },
      { name: 'aliases', weight: 0.15 },
      { name: 'searchText', weight: 0.1 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 2,
    includeScore: true,
  };

  var STOP_WORDS = new Set([
    'the', 'and', 'for', 'with', 'your', 'from', 'open', 'free', 'in', 'on',
    'a', 'an', 'to', 'of', 'by', 'app', 'tool', 'tools', 'browser', 'online',
    'codefrydev', 'any', 'all', 'more', 'our', 'its', 'use', 'using', 'play',
    'le', 'la', 'les', 'de', 'du', 'des', 'et', 'pour', 'avec', 'un', 'une',
    'の', 'を', 'に', 'は', 'が', 'と', 'で', 'も',
    'का', 'की', 'के', 'में', 'और', 'से', 'को', 'है',
  ]);

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function normalizeUrl(url) {
    return (url || '').replace(/\/$/, '').toLowerCase();
  }

  function ensureTrailingSlash(url) {
    if (!url) return url;
    if (/\.[a-zA-Z0-9]+$/.test(url.split(/[?#]/)[0])) return url;
    if (/^https?:\/\//.test(url)) {
      try {
        var parsed = new URL(url);
        if (parsed.pathname !== '/' && !parsed.pathname.endsWith('/')) {
          parsed.pathname = parsed.pathname + '/';
          return parsed.toString();
        }
      } catch (e) {
        return url;
      }
      return url;
    }
    if (url.charAt(0) === '/' && !url.endsWith('/')) return url + '/';
    return url;
  }

  function normalizeQuery(q) {
    var lang = (window.CFD_SEARCH && window.CFD_SEARCH.lang) || 'en';
    var raw = (q || '').toLowerCase();
    if (lang === 'ja' || lang === 'hi') {
      return raw.replace(/\s+/g, ' ').trim();
    }
    return raw
      .replace(/[^a-z0-9\s\u0900-\u097F\u3040-\u30FF\u4E00-\u9FFF]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function phosphorIconSvg(name) {
    var safe = String(name || 'app-window')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');
    if (!safe) safe = 'app-window';
    return (
      '<svg class="ph-icon ph-icon--fill" aria-hidden="true" focusable="false">' +
      '<use href="#ph-fill-' +
      safe +
      '"></use></svg>'
    );
  }

  function uniqueTerms(terms) {
    var seen = new Set();
    var out = [];
    (terms || []).forEach(function (term) {
      var t = normalizeQuery(String(term || ''));
      if (!t || t.length < 2 || STOP_WORDS.has(t)) return;
      if (seen.has(t)) return;
      seen.add(t);
      out.push(t);
    });
    return out;
  }

  function splitNameTokens(name) {
    return String(name || '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }

  function termsFromUrl(url) {
    var terms = [];
    var path = String(url || '')
      .replace(/^https?:\/\/[^/?#]+/, '')
      .replace(/^\/+|\/+$/g, '');
    if (!path) return terms;
    terms.push(path.toLowerCase().replace(/\//g, ' '));
    path.split(/[/\-_.?=&]+/).forEach(function (seg) {
      if (seg.length < 2) return;
      terms.push(seg.toLowerCase());
      splitNameTokens(seg).forEach(function (token) {
        terms.push(token.toLowerCase());
      });
    });
    return terms;
  }

  function termsFromCategory(category) {
    return String(category || '')
      .replace(/&/g, ' and ')
      .split(/[\s/]+/)
      .filter(function (word) {
        return word.length > 2;
      })
      .map(function (word) {
        return word.toLowerCase();
      });
  }

  function deriveSearchTerms(raw, category) {
    var terms = [];
    splitNameTokens(raw.name).forEach(function (token) {
      terms.push(token.toLowerCase());
    });
    terms = terms.concat(termsFromUrl(raw.url));
    terms = terms.concat(termsFromCategory(category));
    return uniqueTerms(terms);
  }

  function buildSearchText(item) {
    return uniqueTerms(
      [item.name, item.category, item.description].concat(item.aliases || [])
    ).join(' ');
  }

  function mergeItemMetadata(existing, incoming) {
    existing.aliases = uniqueTerms((existing.aliases || []).concat(incoming.aliases || []));
    if (!existing.description && incoming.description) {
      existing.description = incoming.description;
    }
    existing.searchText = buildSearchText(existing);
  }

  function mapItem(raw, category, type) {
    var manualAliases = raw.aliases || [];
    var derivedTerms = deriveSearchTerms(raw, category);
    var aliases = uniqueTerms(manualAliases.concat(derivedTerms));
    var item = {
      name: raw.name,
      url: ensureTrailingSlash(raw.url),
      category: category,
      type: type,
      description: raw.description || '',
      phosphorIcon: raw.phosphorIcon || 'app-window',
      external: !!raw.external || /^https?:\/\//.test(raw.url || ''),
      hidden: raw.hidden,
      aliases: aliases,
      searchText: '',
    };
    item.searchText = buildSearchText(item);
    return item;
  }

  function pushItem(item) {
    if (!item || item.hidden) return;
    var key = normalizeUrl(item.url);
    if (!key) return;
    if (indexByUrl.has(key)) {
      mergeItemMetadata(indexByUrl.get(key), item);
      return;
    }
    indexByUrl.set(key, item);
    allItems.push(item);
  }

  function stripHtml(html) {
    return String(html || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&(?:#x?[\da-f]+|\w+);/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function mapRemotePost(post, source) {
    if (!post || !post.title || !post.permalink) return null;
    var summary = stripHtml(post.summary || '');
    var excerpt = summary || stripHtml(post.content || '').slice(0, REMOTE_CONTENT_EXCERPT);
    var description = excerpt.slice(0, REMOTE_DESCRIPTION_MAX);
    return mapItem(
      {
        name: post.title,
        url: post.permalink,
        description: description,
        phosphorIcon: source.icon || 'article',
        external: false,
      },
      source.category,
      source.type
    );
  }

  function itemFromCache(raw) {
    var item = {
      name: raw.name,
      url: raw.url,
      category: raw.category,
      type: raw.type,
      description: raw.description || '',
      phosphorIcon: raw.phosphorIcon || 'article',
      external: false,
      aliases: raw.aliases || [],
      searchText: raw.searchText || '',
    };
    if (!item.searchText) item.searchText = buildSearchText(item);
    return item;
  }

  function slimRemoteItem(item) {
    return {
      name: item.name,
      url: item.url,
      category: item.category,
      type: item.type,
      description: item.description,
      phosphorIcon: item.phosphorIcon,
      aliases: item.aliases,
      searchText: item.searchText,
    };
  }

  function readRemoteCache() {
    try {
      var raw = sessionStorage.getItem(REMOTE_CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.v !== REMOTE_CACHE_VERSION) return null;
      if (Date.now() - parsed.fetchedAt > REMOTE_CACHE_TTL_MS) return null;
      if (!Array.isArray(parsed.items)) return null;
      return parsed.items;
    } catch (e) {
      return null;
    }
  }

  function writeRemoteCache(items) {
    try {
      sessionStorage.setItem(
        REMOTE_CACHE_KEY,
        JSON.stringify({
          v: REMOTE_CACHE_VERSION,
          fetchedAt: Date.now(),
          items: items.map(slimRemoteItem),
        })
      );
    } catch (e) {
      /* ignore quota errors */
    }
  }

  function rebuildFuse() {
    fuse = allItems.length ? buildFuseIndex(allItems) : null;
  }

  function refreshSearchIfOpen() {
    if (isOpen && input && input.value.trim()) {
      runSearch(input.value);
    }
  }

  function mergeRemoteItems(items) {
    if (!items || !items.length) return;
    items.forEach(function (item) {
      pushItem(item);
    });
    rebuildFuse();
    refreshSearchIfOpen();
  }

  function fetchRemoteSource(source) {
    return fetch(source.url, { credentials: 'same-origin' })
      .then(function (response) {
        return response.ok ? response.json() : [];
      })
      .then(function (rows) {
        return (rows || [])
          .map(function (post) {
            return mapRemotePost(post, source);
          })
          .filter(Boolean);
      })
      .catch(function () {
        return [];
      });
  }

  function loadRemoteSources(sources) {
    if (!sources || !sources.length || remoteLoadStarted) return;
    remoteLoadStarted = true;

    var cached = readRemoteCache();
    if (cached && cached.length) {
      mergeRemoteItems(
        cached.map(function (raw) {
          return itemFromCache(raw);
        })
      );
    }

    Promise.all(
      sources.map(function (source) {
        return fetchRemoteSource(source);
      })
    ).then(function (groups) {
      var remoteItems = [];
      groups.forEach(function (group) {
        remoteItems = remoteItems.concat(group);
      });
      if (remoteItems.length) {
        writeRemoteCache(remoteItems);
        mergeRemoteItems(remoteItems);
      }
    });
  }

  function buildIndex(data) {
    allItems = [];
    indexByUrl = new Map();

    if (data.home && data.home.categories) {
      data.home.categories.forEach(function (cat) {
        (cat.items || []).forEach(function (item) {
          pushItem(mapItem(item, cat.name, 'tool'));
        });
      });
    }
    if (data.ai && data.ai.data) {
      data.ai.data.forEach(function (item) {
        pushItem(mapItem(item, 'AI Tools', 'ai'));
      });
    }
    if (data.games && data.games.data) {
      data.games.data.forEach(function (item) {
        pushItem(mapItem(item, 'Games', 'game'));
      });
    }
    if (data.designlab && data.designlab.data) {
      data.designlab.data.forEach(function (item) {
        pushItem(mapItem(item, 'Design Lab', 'design'));
      });
    }
    if (data.store && data.store.data) {
      data.store.data.forEach(function (item) {
        pushItem(mapItem(item, 'Store', 'store'));
      });
    }

    return allItems;
  }

  function buildFuseIndex(items) {
    return new Fuse(items, FUSE_OPTIONS);
  }

  function absUrl(url, base) {
    if (!url) return '#';
    var root = (base || '/').replace(/"/g, '').replace(/\/+$/, '');
    var resolved = url;
    if (/^https?:\/\//.test(url)) {
      resolved = url;
    } else if (url.charAt(0) === '/') {
      resolved = root + url;
    } else {
      resolved = root + '/' + url;
    }
    return ensureTrailingSlash(resolved);
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

  function getRecentSearches() {
    try {
      var raw = localStorage.getItem(RECENT_KEY);
      var list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) return [];
      return pruneRecentSearches(
        list.filter(function (q) {
          return typeof q === 'string' && q.trim();
        })
      );
    } catch (e) {
      return [];
    }
  }

  function pruneRecentSearches(list) {
    return list.filter(function (q, i) {
      return !list.some(function (other, j) {
        return i !== j && q.length < other.length && other.indexOf(q) === 0;
      });
    });
  }

  function saveRecentSearch(query) {
    var trimmed = (query || '').trim();
    if (trimmed.length < 2) return;
    var recent = getRecentSearches().filter(function (q) {
      return q !== trimmed;
    });
    recent.unshift(trimmed);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(pruneRecentSearches(recent).slice(0, RECENT_MAX)));
    } catch (e) {
      /* ignore quota errors */
    }
  }

  function commitRecentSearch(query) {
    saveRecentSearch((query || '').trim());
  }

  function renderRecentSearches() {
    if (!recentPanel || !recentList) return;
    var recent = getRecentSearches();
    recentList.innerHTML = '';
    if (!recent.length || activeCategory || activeCategorySlug) {
      recentPanel.hidden = true;
      return;
    }
    recentPanel.hidden = false;
    recent.forEach(function (query) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'search-palette__chip';
      btn.setAttribute('role', 'listitem');
      btn.setAttribute('data-search-recent', query);
      btn.textContent = query;
      recentList.appendChild(btn);
    });
  }

  function hideSuggestion() {
    if (!suggestPanel || !suggestBtn) return;
    suggestPanel.hidden = true;
    suggestBtn.textContent = '';
    suggestBtn.removeAttribute('data-search-suggest');
  }

  function showSuggestion(item) {
    if (!suggestPanel || !suggestBtn || !item) {
      hideSuggestion();
      return;
    }
    suggestPanel.hidden = false;
    suggestBtn.textContent = item.name;
    suggestBtn.setAttribute('data-search-suggest', item.name);
  }

  function findSuggestion(query) {
    if (!fuse || !query) return null;
    var results = fuse.search(normalizeQuery(query));
    if (!results.length || results[0].score >= SUGGEST_SCORE_THRESHOLD) return null;
    return results[0].item;
  }

  function rankMatches(fuseResults, term) {
    var normalized = normalizeQuery(term);
    return fuseResults
      .slice()
      .sort(function (a, b) {
        var aPrefix = a.item.name.toLowerCase().indexOf(normalized) === 0 ? 0 : 1;
        var bPrefix = b.item.name.toLowerCase().indexOf(normalized) === 0 ? 0 : 1;
        if (aPrefix !== bPrefix) return aPrefix - bPrefix;
        return (a.score || 0) - (b.score || 0);
      })
      .map(function (result) {
        return result.item;
      });
  }

  function searchItems(term, scoped) {
    if (!fuse) return [];
    var results = fuse.search(normalizeQuery(term));
    var filtered = scoped
      ? results.filter(function (result) {
          return itemMatchesScope(result.item);
        })
      : results;
    return rankMatches(filtered, term);
  }

  function getInteractives() {
    if (!resultsList || resultsList.hidden) {
      return Array.prototype.slice.call(
        document.querySelectorAll('#search-palette-default .search-palette__result, #search-palette-default .search-palette__chip, #search-palette-recent-list .search-palette__chip')
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
      hideSuggestion();
      renderRecentSearches();
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
    hideSuggestion();
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
        '<span class="search-palette__result-icon">' +
        phosphorIconSvg(item.phosphorIcon) +
        '</span>' +
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

  function applySearchTerm(term) {
    if (!input) return;
    input.value = term;
    runSearch(term);
  }

  function runSearch(q) {
    var trimmed = (q || '').trim();
    var term = trimmed.toLowerCase();
    if (!term) {
      if (activeCategory || activeCategorySlug) {
        var scoped = allItems.filter(itemMatchesScope);
        renderResults(scoped, '');
      } else {
        renderResults([], '');
      }
      return;
    }
    var matches = searchItems(trimmed, true);
    renderResults(matches, trimmed);
    if (matches.length === 0) {
      showSuggestion(findSuggestion(trimmed));
    } else {
      hideSuggestion();
    }
    if (typeof window.cfdTrackSearch === 'function') {
      window.cfdTrackSearch('palette', trimmed, matches.length);
    }
  }

  function setBodyScrollLocked(locked) {
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
      }
      return;
    }

    mountPaletteToBody();

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
    palette.removeAttribute('inert');
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
    setBodyScrollLocked(false);
    if (!palette || !isOpen) return;
    if (!(opts && opts.force) && Date.now() - openedAt < OPEN_GUARD_MS) return;
    isOpen = false;
    activeCategory = null;
    activeCategorySlug = null;
    palette.classList.remove('is-visible');
    palette.setAttribute('inert', '');
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
      if (input && input.value.trim()) {
        commitRecentSearch(input.value);
      }
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
          return;
        }
        var suggest = e.target.closest('[data-search-suggest]');
        if (suggest) {
          e.preventDefault();
          applySearchTerm(suggest.getAttribute('data-search-suggest') || suggest.textContent || '');
          return;
        }
        var recent = e.target.closest('[data-search-recent]');
        if (recent) {
          e.preventDefault();
          applySearchTerm(recent.getAttribute('data-search-recent') || recent.textContent || '');
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

    if (resultsList) {
      resultsList.addEventListener('click', function (e) {
        var link = e.target.closest('.search-palette__result');
        if (link && input && input.value.trim()) {
          commitRecentSearch(input.value);
        }
      });
    }

    if (input) {
      var debounce;
      input.addEventListener('input', function () {
        clearTimeout(debounce);
        debounce = setTimeout(function () {
          runSearch(input.value);
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
      buildIndex(window.CFD_SEARCH.data);
      rebuildFuse();
    } else {
      allItems = [];
      indexByUrl = new Map();
      fuse = null;
    }

    loadRemoteSources(window.CFD_SEARCH && window.CFD_SEARCH.remoteSources);

    mountPaletteToBody();
    initialized = true;

    backdrop = $('.search-palette__backdrop', palette);
    dialog = $('.search-palette__dialog', palette);
    input = document.getElementById('search-palette-input');
    resultsList = document.getElementById('search-palette-results');
    defaultPanel = document.getElementById('search-palette-default');
    emptyPanel = document.getElementById('search-palette-empty');
    suggestPanel = document.getElementById('search-palette-suggest');
    suggestBtn = suggestPanel ? suggestPanel.querySelector('[data-search-suggest]') : null;
    recentPanel = document.getElementById('search-palette-recent');
    recentList = document.getElementById('search-palette-recent-list');

    initKbdLabels();
    bindPalette();
    bindTriggers();
    renderRecentSearches();

    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        activeCategory = null;
        activeCategorySlug = null;
        if (isOpen) close({ force: true });
        else open('');
        return;
      }
      if (e.key === 'Escape' && isOpen) close({ force: true });
    });

    window.cfdSearchPalette = { open: open, close: close };
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
