/**
 * CodeFryDev analytics — GA4 events for UX insights (requires cookie consent).
 */
(function () {
  'use strict';

  const CONSENT_KEY = 'cookie-consent';
  const CONSENT_ACCEPTED = 'accepted';

  function hasConsent() {
    try {
      return localStorage.getItem(CONSENT_KEY) === CONSENT_ACCEPTED;
    } catch (e) {
      return false;
    }
  }

  function getGaId() {
    const banner = document.getElementById('cookie-consent-banner');
    return (banner && banner.dataset.gaId) || null;
  }

  /**
   * Track a GA4 event. Params are sent as event parameters.
   * @param {string} eventName
   * @param {Object} [params]
   */
  var eventQueue = [];

  function track(eventName, params) {
    if (!hasConsent()) return;
    const payload = Object.assign(
      {
        page_location: window.location.href,
        page_path: window.location.pathname,
        page_title: document.title,
      },
      params || {}
    );
    if (typeof window.gtag !== 'function') {
      eventQueue.push([eventName, payload]);
      return;
    }
    window.gtag('event', eventName, payload);
  }

  function flushQueue() {
    if (typeof window.gtag !== 'function') return;
    eventQueue.forEach(function (item) {
      window.gtag('event', item[0], item[1]);
    });
    eventQueue = [];
  }

  window.cfdTrack = track;
  document.addEventListener('cfd:analytics-ready', flushQueue);

  function initToolClickTracking() {
    document.body.addEventListener(
      'click',
      function (e) {
        const card = e.target.closest('[data-cfd-tool]');
        if (!card) return;
        track('tool_click', {
          tool_name: card.dataset.cfdTool || '',
          tool_category: card.dataset.cfdCategory || '',
          link_url: card.getAttribute('href') || '',
          link_domain: card.dataset.cfdExternal === 'true' ? 'external' : 'internal',
          content_group: card.dataset.cfdSource || 'unknown',
          event_category: 'engagement',
        });
        if (card.dataset.cfdExternal === 'true') {
          track('click', {
            event_category: 'outbound',
            link_url: card.getAttribute('href') || '',
            tool_name: card.dataset.cfdTool || '',
          });
        }
      },
      true
    );
  }

  function initNavTracking() {
    document.body.addEventListener('click', function (e) {
      const link = e.target.closest('header a[href], #mobile-menu a[href]');
      if (!link) return;
      track('nav_click', {
        link_text: (link.textContent || '').trim().slice(0, 80),
        link_url: link.getAttribute('href') || '',
        event_category: 'navigation',
      });
    });
  }

  function initSearchResultTracking() {
    document.body.addEventListener('click', function (e) {
      const link = e.target.closest('.result-item, .suggestion-button');
      if (!link || !link.href) return;
      track('search_result_click', {
        link_url: link.href,
        link_text: (link.textContent || '').trim().slice(0, 80),
        event_category: 'search',
      });
    });
  }

  function initCtaTracking() {
    document.body.addEventListener('click', function (e) {
      const cta = e.target.closest('[data-cfd-cta]');
      if (!cta) return;
      track('cta_click', {
        cta_name: cta.dataset.cfdCta || '',
        link_url: cta.getAttribute('href') || '',
        event_category: 'conversion',
      });
    });
  }

  var searchDebounceTimers = {};

  function trackSearch(searchId, term, resultCount) {
    if (!term || term.length < 2) return;
    const key = searchId + ':' + term;
    clearTimeout(searchDebounceTimers[key]);
    searchDebounceTimers[key] = setTimeout(function () {
      track('search', {
        search_term: term.slice(0, 100),
        search_id: searchId,
        result_count: resultCount,
        event_category: 'search',
      });
      if (resultCount === 0) {
        track('search_no_results', {
          search_term: term.slice(0, 100),
          search_id: searchId,
          event_category: 'search',
        });
      }
    }, 800);
  }

  window.cfdTrackSearch = trackSearch;

  function initSectionVisibility() {
    var root = document.querySelector('.home-sections');
    if (!root) return;
    var seen = {};
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.4) return;
          var id = entry.target.id || entry.target.getAttribute('aria-labelledby') || 'unknown';
          if (seen[id]) return;
          seen[id] = true;
          track('section_view', {
            section_id: id,
            section_name: entry.target.querySelector('h2, h1')
              ? (entry.target.querySelector('h2, h1').textContent || '').trim().slice(0, 80)
              : id,
            event_category: 'engagement',
          });
        });
      },
      { threshold: [0.4], root: null }
    );
    root.querySelectorAll(':scope > section').forEach(function (el) {
      observer.observe(el);
    });
  }

  function init() {
    initToolClickTracking();
    initNavTracking();
    initSearchResultTracking();
    initCtaTracking();
    initSectionVisibility();
    track('page_view_enriched', {
      event_category: 'engagement',
      is_home: document.querySelector('.home-sections') ? 'yes' : 'no',
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
