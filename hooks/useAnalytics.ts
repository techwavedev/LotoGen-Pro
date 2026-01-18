import { useEffect, useCallback } from 'react';
import ReactGA from 'react-ga4';

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

let isInitialized = false;

/**
 * Custom hook for Google Analytics 4 integration.
 * Initializes GA on mount and provides tracking functions.
 */
export function useAnalytics() {
  // Initialize GA4 on first call (if consent given)
  useEffect(() => {
    const hasConsent = localStorage.getItem('cookie-consent') === 'accepted';
    if (GA_MEASUREMENT_ID && hasConsent && !isInitialized) {
      ReactGA.initialize(GA_MEASUREMENT_ID, {
        gaOptions: {
          anonymizeIp: true, // GDPR compliant
        },
      });
      isInitialized = true;
      console.log('[Analytics] GA4 initialized');
    }
  }, []);

  // Track page/virtual page views
  const trackPageView = useCallback((path: string, title?: string) => {
    if (!isInitialized) return;
    ReactGA.send({
      hitType: 'pageview',
      page: path,
      title: title || document.title,
    });
  }, []);

  // Track custom events
  const trackEvent = useCallback((eventName: string, params?: Record<string, any>) => {
    if (!isInitialized) return;
    ReactGA.event(eventName, params);
  }, []);

  // Initialize GA manually (called after cookie consent)
  const initializeGA = useCallback(() => {
    if (GA_MEASUREMENT_ID && !isInitialized) {
      ReactGA.initialize(GA_MEASUREMENT_ID, {
        gaOptions: {
          anonymizeIp: true,
        },
      });
      isInitialized = true;
      localStorage.setItem('cookie-consent', 'accepted');
      console.log('[Analytics] GA4 initialized after consent');
    }
  }, []);

  return {
    trackPageView,
    trackEvent,
    initializeGA,
    isInitialized,
  };
}

// Export a simpler initialization function for CookieConsent component
export function initializeGAAfterConsent() {
  const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
  if (GA_ID && !isInitialized) {
    ReactGA.initialize(GA_ID, {
      gaOptions: {
        anonymizeIp: true,
      },
    });
    isInitialized = true;
    console.log('[Analytics] GA4 initialized after consent');
  }
}
