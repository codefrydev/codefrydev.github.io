/**
 * Cookie Consent Manager
 * Handles GDPR/CCPA compliance for Google Analytics and Microsoft Clarity
 */

(function() {
  'use strict';

  const COOKIE_CONSENT_KEY = 'cookie-consent';
  const COOKIE_CONSENT_ACCEPTED = 'accepted';
  const COOKIE_CONSENT_DECLINED = 'declined';
  
  // Get GA Measurement ID from data attribute (set from Hugo config in hugo.toml)
  function getGAMeasurementId() {
    const banner = document.getElementById('cookie-consent-banner');
    if (banner && banner.dataset.gaId) {
      return banner.dataset.gaId;
    }
    // Fallback - this should not happen if hugo.toml is properly configured
    console.warn('Google Analytics ID not found in cookie consent banner. Please check hugo.toml params.google_analytics_id');
    return 'G-VM01Q3R43D'; // Last resort fallback
  }

  function getClarityProjectId() {
    const banner = document.getElementById('cookie-consent-banner');
    if (banner && banner.dataset.clarityId) {
      return banner.dataset.clarityId;
    }
    return '';
  }

  function loadMicrosoftClarity() {
    const clarityId = getClarityProjectId();
    if (!clarityId || window.__cfdClarityLoadedId === clarityId) {
      return;
    }

    (function (c, l, a, r, i, t, y) {
      c[a] =
        c[a] ||
        function () {
          (c[a].q = c[a].q || []).push(arguments);
        };
      t = l.createElement(r);
      t.async = 1;
      t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', clarityId);

    window.__cfdClarityLoadedId = clarityId;
  }

  // Check if consent has been given
  function getConsentStatus() {
    return localStorage.getItem(COOKIE_CONSENT_KEY);
  }

  // Set consent status
  function setConsentStatus(status) {
    localStorage.setItem(COOKIE_CONSENT_KEY, status);
  }

  // Show cookie consent banner
  function showCookieBanner() {
    const banner = document.getElementById('cookie-consent-banner');
    if (banner) {
      banner.style.display = 'block';
      banner.classList.remove('hidden');
      // Focus management for accessibility
      const acceptButton = document.getElementById('cookie-consent-accept');
      if (acceptButton) {
        setTimeout(() => acceptButton.focus(), 100);
      }
    }
  }

  // Hide cookie consent banner
  function hideCookieBanner() {
    const banner = document.getElementById('cookie-consent-banner');
    if (banner) {
      banner.classList.add('hidden');
      setTimeout(() => {
        banner.style.display = 'none';
      }, 300);
    }
  }

  // Arm listeners and call fn on the first user interaction
  function onFirstInteraction(fn) {
    var fired = false;
    function go() {
      if (fired) return;
      fired = true;
      ['scroll', 'click', 'keydown', 'touchstart'].forEach(function (ev) {
        window.removeEventListener(ev, go, { passive: true });
      });
      fn();
    }
    ['scroll', 'click', 'keydown', 'touchstart'].forEach(function (ev) {
      window.addEventListener(ev, go, { once: true, passive: true });
    });
  }

  // Load Google Analytics (GA4 + Consent Mode v2)
  function loadGoogleAnalytics() {
    const gaMeasurementId = getGAMeasurementId();
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;

    if (!window.__cfdGaInitialized) {
      gtag('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        wait_for_update: 500,
      });
      window.__cfdGaInitialized = true;
    }

    if (window.__cfdGaLoadedId === gaMeasurementId) {
      gtag('consent', 'update', { analytics_storage: 'granted' });
      return;
    }

    gtag('js', new Date());
    gtag('config', gaMeasurementId, {
      anonymize_ip: true,
      send_page_view: true,
      cookie_flags: 'SameSite=None;Secure',
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    gtag('consent', 'update', { analytics_storage: 'granted' });

    if (!document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + gaMeasurementId;
      document.head.appendChild(script);
    }

    window.__cfdGaLoadedId = gaMeasurementId;

    document.dispatchEvent(new CustomEvent('cfd:analytics-ready'));
    if (typeof window.cfdApplyAnalyticsConfig === 'function') {
      window.cfdApplyAnalyticsConfig();
    }
    if (typeof window.cfdTrack === 'function') {
      window.cfdTrack('cookie_consent', {
        consent_status: 'accepted',
        event_category: 'privacy',
      });
    }

    loadMicrosoftClarity();
  }

  // Ensure Consent Mode defaults are set, then load GA on first interaction
  function scheduleGoogleAnalytics() {
    initConsentDefaults();
    onFirstInteraction(loadGoogleAnalytics);
  }

  // Handle accept button click
  function handleAccept() {
    setConsentStatus(COOKIE_CONSENT_ACCEPTED);
    hideCookieBanner();
    scheduleGoogleAnalytics();
  }

  // Handle decline button click
  function handleDecline() {
    setConsentStatus(COOKIE_CONSENT_DECLINED);
    hideCookieBanner();
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', { analytics_storage: 'denied' });
    }
  }

  // Consent Mode default before user choice (deny until accept)
  function initConsentDefaults() {
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments);
      };
    if (!window.__cfdGaInitialized) {
      window.gtag('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        wait_for_update: 500,
      });
      window.__cfdGaInitialized = true;
    }
  }

  // Initialize on DOM ready
  function init() {
    initConsentDefaults();
    const consentStatus = getConsentStatus();

    if (!consentStatus) {
      // No consent given yet, show banner
      showCookieBanner();
    } else if (consentStatus === COOKIE_CONSENT_ACCEPTED) {
      scheduleGoogleAnalytics();
    }
    // If declined, do nothing

    // Attach event listeners
    const acceptButton = document.getElementById('cookie-consent-accept');
    const declineButton = document.getElementById('cookie-consent-decline');

    if (acceptButton) {
      acceptButton.addEventListener('click', handleAccept);
      // Keyboard accessibility
      acceptButton.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleAccept();
        }
      });
    }

    if (declineButton) {
      declineButton.addEventListener('click', handleDecline);
      // Keyboard accessibility
      declineButton.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleDecline();
        }
      });
    }
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
