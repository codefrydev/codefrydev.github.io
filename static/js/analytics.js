/**
 * CodeFryDev analytics — GA4 events + user properties (requires cookie consent).
 *
 * Register these as custom dimensions / user properties in GA4 Admin when ready:
 *   page_type, hub_name, theme, device_class, consent_status, visit_number
 *   tool_name, tool_category, content_group, search_id, section_id, cta_name
 */
(function () {
  'use strict';

  var CONSENT_KEY = 'cookie-consent';
  var CONSENT_ACCEPTED = 'accepted';
  var SESSION_KEY = 'cfd_session_started';
  var SESSION_START_KEY = 'cfd_session_start_tracked';
  var VISIT_COUNT_KEY = 'cfd_visit_count';
  var eventQueue = [];
  var scrollMarks = {};
  var engagementSent = false;
  var engagementStart = Date.now();
  var maxScrollPct = 0;

  function hasConsent() {
    try {
      return localStorage.getItem(CONSENT_KEY) === CONSENT_ACCEPTED;
    } catch (e) {
      return false;
    }
  }

  function consentStatus() {
    try {
      var s = localStorage.getItem(CONSENT_KEY);
      if (s === CONSENT_ACCEPTED) return 'accepted';
      if (s === 'declined') return 'declined';
      return 'pending';
    } catch (e) {
      return 'unknown';
    }
  }

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }

  function getDeviceClass() {
    if (window.matchMedia('(max-width: 639px)').matches) return 'mobile';
    if (window.matchMedia('(max-width: 1023px)').matches) return 'tablet';
    return 'desktop';
  }

  function inferPageType() {
    var path = window.location.pathname;
    if (document.querySelector('.home-sections')) return 'home';
    if (path === '/search' || path.indexOf('/search/') === 0) return 'search';
    if (path.indexOf('/browse/') === 0) return path === '/browse/' ? 'browse_index' : 'browse_category';
    if (path.indexOf('/cfddc') === 0) return 'cfddc';
    if (path.indexOf('/about') === 0) return 'about';
    if (path.indexOf('/history') === 0) return 'history';
    if (path.indexOf('/press') === 0) return 'press';
    if (/^\/(games|ai|designlab|store)\/?/.test(path)) return 'hub';
    return 'content';
  }

  function inferHubName() {
    var m = window.location.pathname.match(/^\/(games|ai|designlab|store)\/?/);
    return m ? m[1] : '';
  }

  function bumpVisitCount() {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) {
        return parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '1', 10);
      }
      sessionStorage.setItem(SESSION_KEY, '1');
      var n = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10) + 1;
      localStorage.setItem(VISIT_COUNT_KEY, String(n));
      return n;
    } catch (e) {
      return 1;
    }
  }

  function getPageContext() {
    return {
      page_type: inferPageType(),
      hub_name: inferHubName(),
      is_home: document.querySelector('.home-sections') ? 'yes' : 'no',
      page_language: document.documentElement.lang || 'en',
    };
  }

  function getUserContext() {
    return {
      theme: getTheme(),
      device_class: getDeviceClass(),
      consent_status: consentStatus(),
      visit_number: bumpVisitCount(),
    };
  }

  function baseParams(extra) {
    return Object.assign(
      {
        page_location: window.location.href,
        page_path: window.location.pathname,
        page_title: document.title,
      },
      getPageContext(),
      getUserContext(),
      extra || {}
    );
  }

  function track(eventName, params) {
    if (!hasConsent()) return;
    var payload = baseParams(params);
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

  function applyUserProperties() {
    if (!hasConsent() || typeof window.gtag !== 'function') return;
    var ctx = getUserContext();
    window.gtag('set', 'user_properties', {
      theme: ctx.theme,
      device_class: ctx.device_class,
      consent_status: ctx.consent_status,
      visit_number: String(ctx.visit_number),
    });
  }

  function onAnalyticsReady() {
    applyUserProperties();
    flushQueue();
    try {
      if (!sessionStorage.getItem(SESSION_START_KEY)) {
        sessionStorage.setItem(SESSION_START_KEY, '1');
        track('session_start', {
          event_category: 'engagement',
        });
      }
    } catch (e) {
      track('session_start', { event_category: 'engagement' });
    }
  }

  window.cfdTrack = track;
  window.cfdApplyAnalyticsConfig = applyUserProperties;

  document.addEventListener('cfd:analytics-ready', onAnalyticsReady);

  function initToolClickTracking() {
    document.body.addEventListener(
      'click',
      function (e) {
        var card = e.target.closest('[data-cfd-tool]');
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
            outbound: true,
          });
        }
      },
      true
    );
  }

  function initNavTracking() {
    document.body.addEventListener('click', function (e) {
      var link = e.target.closest('a[href]');
      if (!link) return;

      if (link.closest('header')) {
        track('nav_click', {
          link_text: (link.textContent || '').trim().slice(0, 80),
          link_url: link.getAttribute('href') || '',
          nav_location: link.closest('.nav-mega__panel') ? 'mega_menu' : 'header',
          event_category: 'navigation',
        });
        return;
      }

      if (link.closest('#mobile-menu')) {
        track('nav_click', {
          link_text: (link.textContent || '').trim().slice(0, 80),
          link_url: link.getAttribute('href') || '',
          nav_location: 'mobile_menu',
          event_category: 'navigation',
        });
        return;
      }

      if (link.closest('footer.site-footer, #footer')) {
        track('footer_click', {
          link_text: (link.textContent || '').trim().slice(0, 80),
          link_url: link.getAttribute('href') || '',
          event_category: 'navigation',
        });
      }
    });
  }

  function initSearchTracking() {
    document.body.addEventListener('click', function (e) {
      var openBtn = e.target.closest('[data-search-open]');
      if (openBtn) {
        track('search_open', {
          search_id: 'palette',
          trigger: openBtn.id || openBtn.className.slice(0, 40) || 'button',
          event_category: 'search',
        });
      }

      var result = e.target.closest('.search-palette__result, .result-item, .suggestion-button');
      if (!result || !result.href) return;
      var list = result.closest('#search-palette-results, .search-results, .suggestions-grid');
      var index = -1;
      if (list) {
        var items = list.querySelectorAll('.search-palette__result, .result-item, .suggestion-button, a');
        index = Array.prototype.indexOf.call(items, result);
      }
      track('search_result_click', {
        link_url: result.href,
        link_text: (result.textContent || '').trim().slice(0, 80),
        search_id: result.dataset.cfdSource || 'palette',
        result_index: index >= 0 ? index : undefined,
        event_category: 'search',
      });
    });
  }

  function initCtaTracking() {
    document.body.addEventListener('click', function (e) {
      var cta = e.target.closest('[data-cfd-cta]');
      if (!cta) return;
      track('cta_click', {
        cta_name: cta.dataset.cfdCta || '',
        link_url: cta.getAttribute('href') || '',
        event_category: 'conversion',
      });
    });
  }

  function initThemeTracking() {
    document.addEventListener('cfd:theme-change', function (e) {
      var theme = (e.detail && e.detail.theme) || getTheme();
      applyUserProperties();
      track('theme_change', {
        theme: theme,
        event_category: 'preferences',
      });
    });
  }

  var searchDebounceTimers = {};

  function trackSearch(searchId, term, resultCount) {
    if (!term || term.length < 2) return;
    var key = searchId + ':' + term;
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
          var heading = entry.target.querySelector('h2, h1');
          track('section_view', {
            section_id: id,
            section_name: heading ? (heading.textContent || '').trim().slice(0, 80) : id,
            event_category: 'engagement',
          });
        });
      },
      { threshold: [0.4], root: null }
    );
    root.querySelectorAll(':scope > section, :scope > footer').forEach(function (el) {
      observer.observe(el);
    });
  }

  function initScrollDepth() {
    var marks = [25, 50, 75, 90];
    function onScroll() {
      var doc = document.documentElement;
      var scrollTop = window.scrollY || doc.scrollTop;
      var height = Math.max(doc.scrollHeight - window.innerHeight, 1);
      var pct = Math.min(100, Math.round((scrollTop / height) * 100));
      if (pct > maxScrollPct) maxScrollPct = pct;
      marks.forEach(function (mark) {
        var key = 'pct_' + mark;
        if (pct >= mark && !scrollMarks[key]) {
          scrollMarks[key] = true;
          track('scroll_depth', {
            percent_scrolled: mark,
            page_type: inferPageType(),
            event_category: 'engagement',
          });
        }
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function initEngagementTime() {
    function sendEngagement() {
      if (!hasConsent() || engagementSent) return;
      var seconds = Math.round((Date.now() - engagementStart) / 1000);
      if (seconds < 3) return;
      engagementSent = true;
      track('user_engagement', {
        engagement_time_sec: seconds,
        max_scroll_percent: maxScrollPct,
        event_category: 'engagement',
      });
    }
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') sendEngagement();
    });
    window.addEventListener('pagehide', sendEngagement);
  }

  function initOutboundLinks() {
    document.body.addEventListener(
      'click',
      function (e) {
        var a = e.target.closest('a[href^="http"]');
        if (!a || a.closest('[data-cfd-tool]')) return;
        try {
          var host = new URL(a.href).hostname;
          if (host === window.location.hostname) return;
        } catch (err) {
          return;
        }
        track('click', {
          event_category: 'outbound',
          link_url: a.href,
          link_text: (a.textContent || '').trim().slice(0, 80),
          outbound: true,
        });
      },
      true
    );
  }

  function init() {
    initToolClickTracking();
    initNavTracking();
    initSearchTracking();
    initCtaTracking();
    initThemeTracking();
    initSectionVisibility();
    initScrollDepth();
    initEngagementTime();
    initOutboundLinks();
    if (hasConsent() && typeof window.gtag === 'function') {
      onAnalyticsReady();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
