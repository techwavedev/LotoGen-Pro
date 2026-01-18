// Google Analytics 4 Event Tracking Utility using react-ga4
import ReactGA from 'react-ga4';

// Helper to safely send events to GA
export function trackEvent(eventName: string, params?: Record<string, any>) {
  try {
    if (ReactGA.isInitialized) {
      ReactGA.event(eventName, params);
    }
  } catch (e) {
    console.warn('[Analytics] Failed to track event:', eventName, e);
  }
}

// ========== PAGE & SESSION EVENTS ==========

export function trackPageView(pageName: string) {
  try {
    if (ReactGA.isInitialized) {
      ReactGA.send({ hitType: "pageview", page: window.location.pathname + window.location.search, title: pageName });
    }
  } catch (e) {
    console.warn('[Analytics] Failed to track page view', e);
  }
}

export function trackSessionStart() {
  trackEvent('session_start', { 
    timestamp: new Date().toISOString(),
    source: document.referrer || 'direct' 
  });
}

// Track Visit for "Observer" (Referral & Abuse Detection)
// This is separate from GA and sends data to our own backend
export function trackVisit() {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) return;

  try {
    const payload = {
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      screen: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language,
      path: window.location.pathname
    };
    
    // Fire and forget - minimal impact on performance
    fetch(`${apiUrl}/api/track-visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => console.error('Observer tracking failed', err));
  } catch (e) {
    // Ignore errors
  }
}

// ========== USER ACTION EVENTS ==========

export function trackLotteryChange(lotteryId: string, lotteryName: string) {
  trackEvent('select_lottery', {
    lottery_id: lotteryId,
    lottery_name: lotteryName
  });
}

export function trackModeChange(mode: 'smart' | 'combinatorial') {
  trackEvent('change_mode', {
    mode: mode
  });
}

export function trackBetTypeChange(betType: 'simple' | 'multiple' | 'surpresinha') {
  trackEvent('change_bet_type', {
    bet_type: betType
  });
}

export function trackGenerateGames(params: {
  lottery: string;
  mode: string;
  count: number;
  betType?: string;
  wheelType?: string;
}) {
  trackEvent('generate_games', {
    lottery: params.lottery,
    mode: params.mode,
    games_count: params.count,
    bet_type: params.betType || 'simple',
    wheel_type: params.wheelType || 'full'
  });
}

export function trackHistoryLoad(lottery: string, gamesCount: number, source: 'auto' | 'manual') {
  trackEvent('load_history', {
    lottery: lottery,
    games_loaded: gamesCount,
    source: source
  });
}

export function trackFilterChange(filterName: string, enabled: boolean) {
  trackEvent('toggle_filter', {
    filter_name: filterName,
    enabled: enabled
  });
}

export function trackCopyGames(count: number, lottery: string) {
  trackEvent('copy_games', {
    games_count: count,
    lottery: lottery
  });
}

export function trackPrintGames(count: number, lottery: string) {
  trackEvent('print_games', {
    games_count: count,
    lottery: lottery
  });
}

export function trackCookieConsent(accepted: boolean) {
  trackEvent('cookie_consent', {
    accepted: accepted
  });
}

// ========== ENGAGEMENT EVENTS ==========

export function trackTimeOnPage(seconds: number) {
  trackEvent('time_on_page', {
    duration_seconds: seconds
  });
}

export function trackScrollDepth(percent: number) {
  trackEvent('scroll_depth', {
    depth_percent: percent
  });
}
