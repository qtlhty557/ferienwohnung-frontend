// ========================================
   // API Module - Communication with WordPress Backend
   // ========================================

class FHP_API {
  constructor(config) {
    this.config = config;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Build URL with lang parameter
  buildUrl(endpoint, params = {}) {
    const url = new URL(`${this.config.apiBase}${endpoint}`);
    url.searchParams.set('lang', params.lang || this.config.defaultLang);
    url.searchParams.set('domain', this.config.propertyDomain);
    Object.entries(params).forEach(([key, value]) => {
      if (key !== 'lang' && key !== 'domain' && value !== undefined && value !== '') {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  }

  // Fetch with caching
  async fetchWithCache(url, options = {}) {
    const cacheKey = url;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error('[FH API] Fetch failed:', error);
      throw error;
    }
  }

  // Get availability (booked dates, min/max nights)
  async getAvailability(lang = this.config.defaultLang) {
    return this.fetchWithCache(this.buildUrl('/availability', { lang }));
  }

  // Get price quote for date range
  async getQuote(params) {
    const { arrival, departure, adults = 2, children = 0, lang = this.config.defaultLang } = params;
    return this.fetchWithCache(this.buildUrl('/quote', { arrival, departure, adults, children, lang }));
  }

  // Submit booking
  async submitBooking(data) {
    const url = this.buildUrl('/book');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Booking failed' }));
      throw new Error(error.message || 'Booking failed');
    }

    return response.json();
  }

  // Get content (imprint, privacy, etc.)
  async getContent(key, lang = this.config.defaultLang) {
    return this.fetchWithCache(this.buildUrl(`/content/${key}`, { lang }));
  }

  // Health check
  async healthCheck() {
    return this.fetchWithCache(this.buildUrl('/health'));
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

// Export for global use
window.FHP_API = FHP_API;