/**
 * Cookie Consent Manager
 * Handles GDPR/CCPA compliance for Google Analytics
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

  // Load Google Analytics
  function loadGoogleAnalytics() {
    // Check if GA is already loaded
    if (window.gtag && window.dataLayer) {
      return;
    }

    // Get GA ID from config (via data attribute)
    const gaMeasurementId = getGAMeasurementId();

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', gaMeasurementId, {
      'anonymize_ip': true
    });

    // Load GA script
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + gaMeasurementId;
    script.type = 'text/javascript';
    document.head.appendChild(script);
  }

  // Handle accept button click
  function handleAccept() {
    setConsentStatus(COOKIE_CONSENT_ACCEPTED);
    hideCookieBanner();
    loadGoogleAnalytics();
  }

  // Handle decline button click
  function handleDecline() {
    setConsentStatus(COOKIE_CONSENT_DECLINED);
    hideCookieBanner();
    // Don't load Google Analytics
  }

  // Initialize on DOM ready
  function init() {
    const consentStatus = getConsentStatus();

    if (!consentStatus) {
      // No consent given yet, show banner
      showCookieBanner();
    } else if (consentStatus === COOKIE_CONSENT_ACCEPTED) {
      // Consent was given, load GA
      loadGoogleAnalytics();
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
