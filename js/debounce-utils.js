// Centralized debounce configuration
const DEBOUNCE_CONFIG = {
    // Default debounce delay in milliseconds
    DEFAULT_DELAY: 250,
    
    // Calculator-specific delays (optional overrides)
    CALCULATORS: {
        'xy-position': 250,
        'stack-reach': 250,
        'seatpost': 250,
        'stem': 250,
        'position-simulator': 250
    }
};

// Utility functions for optimizing API calls
class DebounceUtils {
    // Get debounce delay for a specific calculator
    static getDelay(calculatorType = null) {
        if (calculatorType && DEBOUNCE_CONFIG.CALCULATORS[calculatorType]) {
            return DEBOUNCE_CONFIG.CALCULATORS[calculatorType];
        }
        return DEBOUNCE_CONFIG.DEFAULT_DELAY;
    }
    
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Enhanced API Client with caching and debouncing
class OptimizedAPIClient {
    constructor() {
        this.cache = new Map();
        this.pendingRequests = new Map();
    }

    // Create debounced calculator calls
    static createDebouncedCalculator(debounceMs = 300) {
        const apiClient = new OptimizedAPIClient();
        
        return DebounceUtils.debounce(async (calculationType, data) => {
            return await apiClient.callCalculatorWithCache(calculationType, data);
        }, debounceMs);
    }

    // Create throttled calculator calls (alternative to debouncing)
    static createThrottledCalculator(throttleMs = 100) {
        const apiClient = new OptimizedAPIClient();
        
        return DebounceUtils.throttle(async (calculationType, data) => {
            return await apiClient.callCalculatorWithCache(calculationType, data);
        }, throttleMs);
    }

    async callCalculatorWithCache(calculationType, data) {
        // Create cache key from calculation type and data
        const cacheKey = `${calculationType}_${JSON.stringify(data)}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Check if request is already pending
        if (this.pendingRequests.has(cacheKey)) {
            return await this.pendingRequests.get(cacheKey);
        }

        // Make API call
        const requestPromise = this.callCalculator(calculationType, data);
        this.pendingRequests.set(cacheKey, requestPromise);

        try {
            const result = await requestPromise;
            // Cache successful results
            this.cache.set(cacheKey, result);
            return result;
        } finally {
            this.pendingRequests.delete(cacheKey);
        }
    }

    async callCalculator(calculationType, data) {
        try {
            const response = await fetch('/.netlify/functions/calculator', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    calculationType,
                    data
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Unknown calculation error');
            }

            return result.result;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    // Clear cache when needed
    clearCache() {
        this.cache.clear();
    }

    // Clear cache for specific calculation type
    clearCacheForType(calculationType) {
        for (const key of this.cache.keys()) {
            if (key.startsWith(calculationType + '_')) {
                this.cache.delete(key);
            }
        }
    }
}
