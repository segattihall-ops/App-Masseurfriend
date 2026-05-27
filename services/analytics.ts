/**
 * Simple Analytics Service for RoadTripPro
 * This can be extended to use Google Analytics, Mixpanel, etc.
 */

type AnalyticsEvent = 
  | 'itinerary_generated'
  | 'alternative_route_requested'
  | 'trip_saved'
  | 'trip_loaded'
  | 'trip_updated'
  | 'trip_deleted'
  | 'market_insights_viewed'
  | 'market_spikes_viewed'
  | 'demand_forecast_viewed'
  | 'settings_updated'
  | 'geolocation_success'
  | 'geolocation_failed'
  | 'user_login'
  | 'user_logout';

class AnalyticsService {
  private isEnabled: boolean = true;

  constructor() {
    // In a real app, you'd initialize GA here
    // window.gtag('js', new Date());
    // window.gtag('config', 'YOUR_GA_ID');
    console.log('Analytics Service Initialized');
  }

  trackEvent(event: AnalyticsEvent, properties?: Record<string, any>) {
    if (!this.isEnabled) return;

    // Log to console for development
    console.log(`[Analytics] Event: ${event}`, properties || '');

    // Real implementation would call window.gtag or similar
    // if (typeof window !== 'undefined' && (window as any).gtag) {
    //   (window as any).gtag('event', event, properties);
    // }
  }

  setUserId(userId: string) {
    console.log(`[Analytics] User ID set: ${userId}`);
    // if (typeof window !== 'undefined' && (window as any).gtag) {
    //   (window as any).gtag('set', { 'user_id': userId });
    // }
  }
}

export const analytics = new AnalyticsService();
