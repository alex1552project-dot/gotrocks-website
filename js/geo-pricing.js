// =====================================================
// TEXAS GOT ROCKS - Geo-Pricing Frontend Module
// Dynamically updates product prices based on visitor location
// Last Updated: January 26, 2026
// =====================================================

(function() {
    'use strict';
    
    // =====================================================
    // CONFIGURATION
    // =====================================================
    
    // Product base prices (per cubic yard) - matches main.js
    const PRODUCT_BASE_PRICES = {
        'black-mulch': { base: 25, weight: 0.5, display: 'Black Mulch' },
        'brown-mulch': { base: 25, weight: 0.5, display: 'Brown Hardwood Mulch' },
        'blackstar-gravel': { base: 96, weight: 1.4, display: '5/8" Black Star' },
        'decomposed-granite': { base: 48, weight: 1.4, display: 'Decomposed Granite' },
        'bull-rock': { base: 41, weight: 1.4, display: '3x5 Bull Rock' },
        'topsoil': { base: 24, weight: 1.4, display: 'Topsoil' },
        // Extended products
        'granite-base': { base: 39, weight: 1.4, display: 'Granite Base' },
        'limestone-1': { base: 55, weight: 1.4, display: '1" Limestone' },
        'limestone-3-4': { base: 55, weight: 1.4, display: '3/4" Limestone' },
        'limestone-3-8': { base: 55, weight: 1.4, display: '3/8" Limestone' },
        'limestone-base': { base: 55, weight: 1.4, display: 'Limestone Base' },
        'gravel-2x3': { base: 41, weight: 1.4, display: '2x3 Gravel' },
        'gravel-1-5-minus': { base: 41, weight: 1.4, display: '1.5" Minus Gravel' },
        'pea-gravel': { base: 41, weight: 1.4, display: '3/8" Pea Gravel' },
        'rainbow-gravel': { base: 46, weight: 1.4, display: 'Rainbow Gravel' },
        'colorado-bull-rock': { base: 71, weight: 1.4, display: '1x3 Colorado Bull Rock' },
        'fairland-pink': { base: 45, weight: 1.4, display: '1x2 Fairland Pink' },
        'bank-sand': { base: 12, weight: 1.4, display: 'Bank Sand' },
        'select-fill': { base: 12, weight: 1.4, display: 'Select Fill' },
        'torpedo-sand': { base: 32, weight: 1.4, display: 'Torpedo Sand' },
        'mason-sand': { base: 21, weight: 1.4, display: 'Mason Sand' },
    };
    
    // Zone pricing configuration
    // Zone 1 & 2: Use current posted prices (no change)
    // Zone 3: Add $10/cy to reflect higher delivery cost
    const ZONE_CONFIG = {
        1: { priceAdjust: 0, label: 'Conroe' },      // No change from posted
        2: { priceAdjust: 0, label: 'The Woodlands' }, // No change from posted
        3: { priceAdjust: 10, label: 'Houston' }     // Add $10/cy for delivery
    };
    
    // Pricing constants (from main.js TRUCK_CONFIG)
    const TAX_RATE = 0.0825;
    const SERVICE_FEE_RATE = 0.035;
    const STANDARD_MARGIN = 0.20;
    
    // =====================================================
    // STATE
    // =====================================================
    
    let geoData = null;
    let pricesUpdated = false;
    
    // =====================================================
    // PRICE CALCULATION
    // =====================================================
    
    /**
     * Calculate displayed price per cubic yard for a product in a zone
     * Based on 5-yard order with standard margin
     */
    function calculateDisplayPrice(productKey, zone) {
        const product = PRODUCT_BASE_PRICES[productKey];
        if (!product || !zone) return null;
        
        const config = ZONE_CONFIG[zone];
        if (!config) return null;
        
        const quantity = 5; // Standard quote basis
        const tons = quantity * product.weight;
        const baseMaterialCost = tons * product.base;
        
        // Delivery cost estimation based on zone
        const deliveryCost = config.deliveryAdder * quantity;
        
        // Apply margin
        const subtotal = baseMaterialCost + deliveryCost;
        const withMargin = subtotal * (1 + STANDARD_MARGIN);
        
        // Per-yard price
        let pricePerYard = withMargin / quantity;
        
        // Add tax and service fee
        const taxPerYard = product.base * product.weight * TAX_RATE;
        const serviceFeePerYard = pricePerYard * SERVICE_FEE_RATE;
        
        const totalPerYard = pricePerYard + taxPerYard + serviceFeePerYard;
        
        // Round to nearest dollar for cleaner display
        return Math.round(totalPerYard);
    }
    
    // =====================================================
    // DOM UPDATES
    // =====================================================
    
    /**
     * Update all product cards with zone-specific pricing
     */
    function updateProductPrices(zone) {
        const productCards = document.querySelectorAll('.product-card[data-product]');
        
        productCards.forEach(card => {
            const productKey = card.dataset.product;
            const priceEl = card.querySelector('.product-price .amount');
            
            if (priceEl && productKey && productKey !== 'more') {
                const newPrice = calculateDisplayPrice(productKey, zone);
                
                if (newPrice) {
                    priceEl.textContent = `Starting at $${newPrice}.00`;
                    priceEl.classList.add('geo-price-updated');
                }
            }
        });
        
        pricesUpdated = true;
    }
    
    /**
     * Update the "More Products" modal prices
     */
    function updateMoreProductsPrices(zone) {
        const productItems = document.querySelectorAll('.more-products-modal .product-item');
        
        productItems.forEach(item => {
            const priceEl = item.querySelector('.product-price');
            const nameEl = item.querySelector('.product-name');
            
            if (priceEl && nameEl) {
                // Try to match product by name
                const productName = nameEl.textContent.trim();
                const matchedKey = findProductKeyByName(productName);
                
                if (matchedKey) {
                    const newPrice = calculateDisplayPrice(matchedKey, zone);
                    if (newPrice) {
                        priceEl.textContent = `Starting at $${newPrice}.00/cy`;
                    }
                }
            }
        });
    }
    
    /**
     * Find product key by display name (fuzzy match)
     */
    function findProductKeyByName(displayName) {
        const normalized = displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        for (const [key, product] of Object.entries(PRODUCT_BASE_PRICES)) {
            const productNormalized = product.display.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normalized.includes(productNormalized) || productNormalized.includes(normalized)) {
                return key;
            }
        }
        
        // Specific mappings for edge cases
        const mappings = {
            'blackmulch': 'black-mulch',
            'brownmulch': 'brown-mulch',
            'brownhardwoodmulch': 'brown-mulch',
            '58blackstar': 'blackstar-gravel',
            'blackstar': 'blackstar-gravel',
            'decomposedgranite': 'decomposed-granite',
            '14minusdecomposedgranite': 'decomposed-granite',
            '3x5bullrock': 'bull-rock',
            'bullrockgravel': 'bull-rock',
            '3x5bullrockgravel': 'bull-rock',
        };
        
        return mappings[normalized] || null;
    }
    
    /**
     * Show fallback CTA when location cannot be determined
     */
    function showFallbackPricing() {
        const productCards = document.querySelectorAll('.product-card[data-product]');
        
        productCards.forEach(card => {
            const productKey = card.dataset.product;
            if (productKey === 'more') return;
            
            const priceEl = card.querySelector('.product-price .amount');
            
            if (priceEl) {
                // Keep existing price but add click prompt
                const currentText = priceEl.textContent;
                priceEl.innerHTML = `<span class="geo-price-cta" onclick="openCalculatorModal(); event.preventDefault(); event.stopPropagation();">Get your low price →</span>`;
                priceEl.classList.add('geo-fallback');
            }
        });
    }
    
    // =====================================================
    // GEO DETECTION
    // =====================================================
    
    /**
     * Fetch geo data from edge function
     */
    async function fetchGeoData() {
        try {
            const response = await fetch('/api/geo-pricing', {
                method: 'GET',
                cache: 'default'
            });
            
            if (!response.ok) {
                throw new Error(`Geo API error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.warn('Geo-pricing: Could not detect location', error);
            return null;
        }
    }
    
    /**
     * Alternative: Use IP-based geolocation service as fallback
     */
    async function fetchGeoDataFallback() {
        try {
            // Using ipapi.co free tier (1000 requests/day)
            const response = await fetch('https://ipapi.co/json/', {
                method: 'GET',
                cache: 'default'
            });
            
            if (!response.ok) return null;
            
            const data = await response.json();
            
            if (data.latitude && data.longitude) {
                // Calculate distance from Conroe yard
                const distance = calculateDistanceFromYard(data.latitude, data.longitude);
                const zone = getZoneFromDistance(distance);
                
                return {
                    detected: zone !== null,
                    zone: zone,
                    city: data.city,
                    distance: Math.round(distance),
                    source: 'fallback'
                };
            }
            
            return null;
        } catch (error) {
            console.warn('Geo-pricing fallback failed', error);
            return null;
        }
    }
    
    /**
     * Calculate distance from Conroe yard using Haversine formula
     */
    function calculateDistanceFromYard(lat, lon) {
        const YARD_LAT = 30.3119;
        const YARD_LON = -95.4561;
        const R = 3959; // Earth's radius in miles
        
        const dLat = (lat - YARD_LAT) * Math.PI / 180;
        const dLon = (lon - YARD_LON) * Math.PI / 180;
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(YARD_LAT * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    /**
     * Determine zone from distance
     */
    function getZoneFromDistance(distance) {
        if (distance <= 15) return 1;
        if (distance <= 30) return 2;
        if (distance <= 60) return 3;
        return null;
    }
    
    // =====================================================
    // INITIALIZATION
    // =====================================================
    
    /**
     * Initialize geo-pricing
     */
    async function initGeoPricing() {
        // Try primary geo detection (Netlify Edge)
        geoData = await fetchGeoData();
        
        // Fallback to IP-based service if primary fails
        if (!geoData || !geoData.detected) {
            geoData = await fetchGeoDataFallback();
        }
        
        if (geoData && geoData.detected && geoData.zone) {
            // Update prices with detected zone
            updateProductPrices(geoData.zone);
            
            // Also update the "More Products" modal when it opens
            const moreProductsModal = document.getElementById('moreProductsModal');
            if (moreProductsModal) {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.target.classList.contains('active')) {
                            updateMoreProductsPrices(geoData.zone);
                        }
                    });
                });
                observer.observe(moreProductsModal, { attributes: true, attributeFilter: ['class'] });
            }
            
            console.log(`Geo-pricing: Zone ${geoData.zone} (${geoData.city || 'Unknown city'})`);
        } else {
            // Show fallback CTA
            showFallbackPricing();
            console.log('Geo-pricing: Location not detected, showing fallback CTA');
        }
    }
    
    // =====================================================
    // EXPOSE FOR EXTERNAL USE
    // =====================================================
    
    window.TGRGeoPricing = {
        init: initGeoPricing,
        getGeoData: () => geoData,
        calculatePrice: calculateDisplayPrice,
        updatePrices: updateProductPrices,
        isPricesUpdated: () => pricesUpdated
    };
    
    // =====================================================
    // AUTO-INITIALIZE ON DOM READY
    // =====================================================
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGeoPricing);
    } else {
        // DOM already loaded, initialize immediately
        initGeoPricing();
    }
    
})();
