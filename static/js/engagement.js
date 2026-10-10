/**
 * CodeFryDev User Engagement Engine
 * - Zero-login Favorites / Saved Tools (localStorage)
 * - Recently Used Tools tracking
 * - Interactive Filter Pills for Hubs & Browse Pages
 * - One-click Copy Link & Social Share with Toast Notifications
 * - "I'm Feeling Lucky" / Random Discovery Shuffle
 */
(function () {
  'use strict';

  var FAV_KEY = 'cfd_favorites';
  var RECENTS_KEY = 'cfd_recent_tools';
  var MAX_RECENTS = 6;

  /* -------------------------------------------------------------------------
   * Toast Notification Helper
   * ------------------------------------------------------------------------- */
  var toastTimeout = null;
  function showToast(message, icon) {
    icon = icon || '✓';
    var toast = document.getElementById('cfd-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cfd-toast';
      toast.className = 'cfd-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.innerHTML = '<span class="cfd-toast__icon">' + icon + '</span><span class="cfd-toast__msg">' + message + '</span>';
    toast.classList.add('cfd-toast--visible');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function () {
      toast.classList.remove('cfd-toast--visible');
    }, 2400);
  }

  /* -------------------------------------------------------------------------
   * Favorites Storage & Management
   * ------------------------------------------------------------------------- */
  function getFavorites() {
    try {
      var raw = localStorage.getItem(FAV_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function setFavorites(favs) {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(favs));
    } catch (e) {}
    syncFavoriteButtons();
    renderFavoritesTray();
    window.dispatchEvent(new CustomEvent('cfd:favorites-updated', { detail: { favorites: favs } }));
  }

  function isFavorite(toolName) {
    if (!toolName) return false;
    return getFavorites().indexOf(toolName) !== -1;
  }

  function toggleFavorite(toolName) {
    if (!toolName) return;
    var favs = getFavorites();
    var idx = favs.indexOf(toolName);
    var added = false;
    if (idx > -1) {
      favs.splice(idx, 1);
      showToast('Removed from saved tools', '✕');
    } else {
      favs.push(toolName);
      added = true;
      showToast('Saved to your tools!', '⭐');
    }
    setFavorites(favs);
    return added;
  }

  function syncFavoriteButtons() {
    var favs = getFavorites();
    var btns = document.querySelectorAll('[data-cfd-fav-btn]');
    for (var i = 0; i < btns.length; i++) {
      var btn = btns[i];
      var name = btn.getAttribute('data-cfd-fav-btn');
      var active = favs.indexOf(name) !== -1;
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      if (active) {
        btn.classList.add('is-favorited');
        btn.title = 'Remove from saved tools';
      } else {
        btn.classList.remove('is-favorited');
        btn.title = 'Save to my tools';
      }
    }

    var dockBadge = document.getElementById('cfd-dock-fav-badge');
    if (dockBadge) {
      dockBadge.textContent = favs.length;
      if (favs.length > 0) {
        dockBadge.classList.remove('hidden');
        dockBadge.hidden = false;
      } else {
        dockBadge.classList.add('hidden');
        dockBadge.hidden = true;
      }
    }
  }

  /* -------------------------------------------------------------------------
   * Recently Used Tools Tracking
   * ------------------------------------------------------------------------- */
  function getRecents() {
    try {
      var raw = localStorage.getItem(RECENTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function recordRecentTool(tool) {
    if (!tool || !tool.name || !tool.url) return;
    try {
      var list = getRecents();
      // Remove duplicate if already present
      list = list.filter(function (item) {
        return item.name !== tool.name && item.url !== tool.url;
      });
      list.unshift({
        name: tool.name,
        url: tool.url,
        category: tool.category || '',
        time: Date.now()
      });
      if (list.length > MAX_RECENTS) {
        list = list.slice(0, MAX_RECENTS);
      }
      localStorage.setItem(RECENTS_KEY, JSON.stringify(list));
      renderRecentsTray();
    } catch (e) {}
  }

  /* -------------------------------------------------------------------------
   * Favorites & Recents Dynamic Trays on Homepage
   * ------------------------------------------------------------------------- */
  function renderFavoritesTray() {
    var tray = document.getElementById('cfd-favorites-tray');
    if (!tray) return;

    var favs = getFavorites();
    if (favs.length === 0) {
      tray.hidden = true;
      tray.style.display = 'none';
      return;
    }

    var grid = tray.querySelector('.cfd-favorites-grid');
    if (!grid) return;

    // Collect all matching tool cards from the page
    var allCards = document.querySelectorAll('.tool-card');
    var matchedCards = [];
    var seenNames = {};

    favs.forEach(function (name) {
      for (var i = 0; i < allCards.length; i++) {
        var card = allCards[i];
        if (card.closest('#cfd-favorites-tray')) continue; // skip already inside tray
        var toolName = card.getAttribute('data-cfd-tool');
        if (toolName === name && !seenNames[name]) {
          seenNames[name] = true;
          var clone = card.cloneNode(true);
          // Mark clone so it knows it is in the tray
          clone.setAttribute('data-in-tray', 'true');
          matchedCards.push(clone);
          break;
        }
      }
    });

    if (matchedCards.length > 0) {
      grid.innerHTML = '';
      matchedCards.forEach(function (card) {
        grid.appendChild(card);
      });
      tray.hidden = false;
      tray.style.display = '';
      var countEl = tray.querySelector('.cfd-favorites-count');
      if (countEl) countEl.textContent = matchedCards.length + (matchedCards.length === 1 ? ' tool' : ' tools');
      syncFavoriteButtons();
    } else {
      tray.hidden = true;
      tray.style.display = 'none';
    }
  }

  function renderRecentsTray() {
    var container = document.getElementById('cfd-recents-chips');
    if (!container) return;
    var recents = getRecents();
    if (!recents || recents.length === 0) {
      var wrap = document.getElementById('cfd-recents-tray');
      if (wrap) wrap.hidden = true;
      return;
    }

    var wrapEl = document.getElementById('cfd-recents-tray');
    if (wrapEl) wrapEl.hidden = false;

    container.innerHTML = '';
    recents.forEach(function (item) {
      var a = document.createElement('a');
      a.href = item.url;
      a.className = 'cfd-recent-chip';
      a.textContent = item.name;
      if (item.url.indexOf('http') === 0) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      container.appendChild(a);
    });
  }

  /* -------------------------------------------------------------------------
   * Interactive Subcategory Filter Pills (Hubs & Browse pages)
   * ------------------------------------------------------------------------- */
  function initFilterPills() {
    var pillContainers = document.querySelectorAll('[data-cfd-filters]');
    pillContainers.forEach(function (container) {
      var pills = container.querySelectorAll('[data-cfd-filter]');
      var targetGrid = document.querySelector(container.getAttribute('data-cfd-target') || '.browse-category__grid');
      if (!targetGrid) return;

      var cards = targetGrid.querySelectorAll('.tool-card');
      var countDisplay = document.querySelector(container.getAttribute('data-cfd-count') || '.browse-category__count');

      pills.forEach(function (pill) {
        pill.addEventListener('click', function () {
          pills.forEach(function (p) {
            p.classList.remove('is-active');
            p.setAttribute('aria-selected', 'false');
          });
          pill.classList.add('is-active');
          pill.setAttribute('aria-selected', 'true');

          var filterTag = (pill.getAttribute('data-cfd-filter') || 'all').toLowerCase();
          var visibleCount = 0;

          cards.forEach(function (card) {
            var tags = (card.getAttribute('data-cfd-tags') || '').toLowerCase();
            var name = (card.getAttribute('data-cfd-tool') || '').toLowerCase();
            var category = (card.getAttribute('data-cfd-category') || '').toLowerCase();
            var isFav = isFavorite(card.getAttribute('data-cfd-tool'));

            var matches = false;
            if (filterTag === 'all') {
              matches = true;
            } else if (filterTag === 'favorites') {
              matches = isFav;
            } else {
              matches = tags.indexOf(filterTag) !== -1 ||
                        name.indexOf(filterTag) !== -1 ||
                        category.indexOf(filterTag) !== -1;
            }

            if (matches) {
              card.style.display = '';
              card.removeAttribute('data-filter-hidden');
              visibleCount++;
            } else {
              card.style.display = 'none';
              card.setAttribute('data-filter-hidden', 'true');
            }
          });

          if (countDisplay) {
            countDisplay.textContent = visibleCount + (visibleCount === 1 ? ' tool' : ' tools');
          }
        });
      });
    });
  }

  /* -------------------------------------------------------------------------
   * One-Click Copy Link & Social Share
   * ------------------------------------------------------------------------- */
  function handleShare(url, name) {
    if (!url) return;
    var shareUrl = url;
    if (shareUrl.indexOf('http') !== 0) {
      shareUrl = window.location.origin + (shareUrl.indexOf('/') === 0 ? shareUrl : '/' + shareUrl);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(function () {
        showToast('Link copied to clipboard!', '🔗');
      }).catch(function () {
        promptShareFallback(shareUrl);
      });
    } else {
      promptShareFallback(shareUrl);
    }
  }

  function promptShareFallback(url) {
    window.prompt('Copy this tool link:', url);
  }

  /* -------------------------------------------------------------------------
   * "I'm Feeling Lucky" / Random Tool Discovery
   * ------------------------------------------------------------------------- */
  function pickRandomTool() {
    var cards = document.querySelectorAll('.tool-card:not([data-filter-hidden="true"])');
    if (!cards || cards.length === 0) {
      cards = document.querySelectorAll('.tool-card');
    }
    if (!cards || cards.length === 0) return;

    var randomIndex = Math.floor(Math.random() * cards.length);
    var chosen = cards[randomIndex];
    var toolName = chosen.getAttribute('data-cfd-tool');

    // Scroll into view with smooth animation
    chosen.scrollIntoView({ behavior: 'smooth', block: 'center' });
    chosen.classList.add('cfd-card--highlight');

    showToast('Discovered: ' + toolName + '!', '🎲');

    setTimeout(function () {
      chosen.classList.remove('cfd-card--highlight');
    }, 2500);
  }

  /* -------------------------------------------------------------------------
   * Event Delegation Setup
   * ------------------------------------------------------------------------- */
  function bindGlobalListeners() {
    document.addEventListener('click', function (e) {
      // Favorite Button Click
      var favBtn = e.target.closest('[data-cfd-fav-btn]');
      if (favBtn) {
        e.preventDefault();
        e.stopPropagation();
        var toolName = favBtn.getAttribute('data-cfd-fav-btn');
        toggleFavorite(toolName);
        return;
      }

      // Share Button Click
      var shareBtn = e.target.closest('[data-cfd-share-btn]');
      if (shareBtn) {
        e.preventDefault();
        e.stopPropagation();
        var url = shareBtn.getAttribute('data-tool-url');
        var name = shareBtn.getAttribute('data-tool-name');
        handleShare(url, name);
        return;
      }

      // Lucky / Shuffle Discovery Button
      var luckyBtn = e.target.closest('[data-cfd-lucky-btn]');
      if (luckyBtn) {
        e.preventDefault();
        pickRandomTool();
        return;
      }

      // Mobile Dock Favorite Link Click
      var dockFavLink = e.target.closest('#cfd-dock-fav-link');
      if (dockFavLink) {
        var currentFavs = getFavorites();
        if (currentFavs.length === 0) {
          e.preventDefault();
          showToast('No saved tools yet. Tap the bookmark star on any tool!', '⭐');
          return;
        }
      }

      // Track clicks on tool cards into Recents
      var toolLink = e.target.closest('.tool-card a');
      if (toolLink) {
        var card = toolLink.closest('.tool-card');
        if (card) {
          recordRecentTool({
            name: card.getAttribute('data-cfd-tool'),
            url: toolLink.href,
            category: card.getAttribute('data-cfd-category')
          });
        }
      }
    });
  }

  /* -------------------------------------------------------------------------
   * Browse Page View Switcher & Live Filter
   * ------------------------------------------------------------------------- */
  function initBrowseView() {
    var switchBtns = document.querySelectorAll('[data-browse-view]');
    var catsPanel = document.getElementById('browse-categories-panel');
    var allToolsPanel = document.getElementById('browse-all-tools-panel');
    var liveInput = document.getElementById('browse-live-search');
    var emptyState = document.getElementById('browse-empty-state');
    var clearBtn = document.getElementById('browse-clear-search-btn');

    function applyDirectoryFilter() {
      if (!allToolsPanel) return;
      var query = liveInput ? liveInput.value.trim().toLowerCase() : '';
      var activePill = allToolsPanel.querySelector('.cfd-filter-pill.is-active');
      var filterTag = activePill ? (activePill.getAttribute('data-cfd-filter') || 'all').toLowerCase() : 'all';

      var allCards = allToolsPanel.querySelectorAll('.tool-card');
      var countEl = document.getElementById('browse-all-tools-count');
      var visibleCount = 0;

      allCards.forEach(function (card) {
        var name = (card.getAttribute('data-cfd-tool') || '').toLowerCase();
        var tags = (card.getAttribute('data-cfd-tags') || '').toLowerCase();
        var cat = (card.getAttribute('data-cfd-category') || '').toLowerCase();
        var isFav = isFavorite(card.getAttribute('data-cfd-tool'));

        var pillMatch = false;
        if (filterTag === 'all') {
          pillMatch = true;
        } else if (filterTag === 'favorites') {
          pillMatch = isFav;
        } else {
          pillMatch = tags.indexOf(filterTag) !== -1 ||
                      name.indexOf(filterTag) !== -1 ||
                      cat.indexOf(filterTag) !== -1;
        }

        var searchMatch = !query || name.indexOf(query) !== -1 || tags.indexOf(query) !== -1 || cat.indexOf(query) !== -1;

        if (pillMatch && searchMatch) {
          card.style.display = '';
          card.removeAttribute('data-filter-hidden');
          visibleCount++;
        } else {
          card.style.display = 'none';
          card.setAttribute('data-filter-hidden', 'true');
        }
      });

      if (countEl) {
        countEl.textContent = visibleCount + (visibleCount === 1 ? ' tool' : ' tools');
      }

      if (emptyState) {
        if (visibleCount === 0) {
          emptyState.hidden = false;
          emptyState.style.display = '';
          emptyState.classList.remove('hidden');
        } else {
          emptyState.hidden = true;
          emptyState.style.display = 'none';
          emptyState.classList.add('hidden');
        }
      }
    }

    if (switchBtns.length > 0 && catsPanel && allToolsPanel) {
      switchBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var view = btn.getAttribute('data-browse-view');
          switchBtns.forEach(function (b) {
            b.classList.remove('is-active');
            b.setAttribute('aria-selected', 'false');
          });
          btn.classList.add('is-active');
          btn.setAttribute('aria-selected', 'true');

          if (view === 'all') {
            catsPanel.hidden = true;
            catsPanel.style.display = 'none';
            allToolsPanel.hidden = false;
            allToolsPanel.style.display = '';
            if (liveInput) {
              liveInput.focus();
            }
            applyDirectoryFilter();
          } else {
            allToolsPanel.hidden = true;
            allToolsPanel.style.display = 'none';
            catsPanel.hidden = false;
            catsPanel.style.display = '';
          }
        });
      });
    }

    if (liveInput) {
      liveInput.addEventListener('input', applyDirectoryFilter);
    }

    // Attach pill click to applyDirectoryFilter inside browse directory
    if (allToolsPanel) {
      var pills = allToolsPanel.querySelectorAll('.cfd-filter-pill');
      pills.forEach(function (p) {
        p.addEventListener('click', function () {
          setTimeout(applyDirectoryFilter, 0);
        });
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (liveInput) liveInput.value = '';
        if (allToolsPanel) {
          var pills = allToolsPanel.querySelectorAll('.cfd-filter-pill');
          pills.forEach(function (p) {
            p.classList.toggle('is-active', p.getAttribute('data-cfd-filter') === 'all');
          });
        }
        applyDirectoryFilter();
      });
    }
  }

  /* -------------------------------------------------------------------------
   * Category Quick Jump Rail (Homepage)
   * ------------------------------------------------------------------------- */
  function initCategoryRail() {
    var rail = document.getElementById('cfd-cat-rail-wrap');
    if (!rail) return;
    var pills = rail.querySelectorAll('[data-cfd-rail-target]');
    if (pills.length === 0) return;

    pills.forEach(function (pill) {
      pill.addEventListener('click', function (e) {
        var targetId = pill.getAttribute('data-cfd-rail-target');
        var targetEl = document.getElementById(targetId);
        if (targetEl) {
          e.preventDefault();
          var headerOffset = 135;
          var elementPosition = targetEl.getBoundingClientRect().top;
          var offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
          pills.forEach(function (p) { p.classList.remove('is-active'); });
          pill.classList.add('is-active');
        }
      });
    });

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var id = entry.target.id;
            pills.forEach(function (p) {
              if (p.getAttribute('data-cfd-rail-target') === id) {
                p.classList.add('is-active');
                if (p.scrollIntoView) {
                  p.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
              } else {
                p.classList.remove('is-active');
              }
            });
          }
        });
      }, {
        rootMargin: '-20% 0px -60% 0px'
      });

      pills.forEach(function (p) {
        var id = p.getAttribute('data-cfd-rail-target');
        var el = document.getElementById(id);
        if (el) observer.observe(el);
      });
    }
  }

  /* -------------------------------------------------------------------------
   * Initialization
   * ------------------------------------------------------------------------- */
  function init() {
    bindGlobalListeners();
    syncFavoriteButtons();
    renderFavoritesTray();
    renderRecentsTray();
    initFilterPills();
    initBrowseView();
    initCategoryRail();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.CFD_ENGAGEMENT = {
    getFavorites: getFavorites,
    toggleFavorite: toggleFavorite,
    isFavorite: isFavorite,
    getRecents: getRecents,
    pickRandomTool: pickRandomTool,
    showToast: showToast
  };
})();
