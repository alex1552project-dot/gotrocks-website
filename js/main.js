// =====================================================
// GOT ROCKS - COMPLETE CODEPEN JAVASCRIPT
// Paste this into the JS pane
// =====================================================

// =====================================================
// CALL/TEXT DROPDOWN TOGGLE FUNCTIONS (Grasshopper Integration)
// =====================================================
function toggleNavCallDropdown(event) {
    event.stopPropagation();
    const menu = document.getElementById('navCallMenu');
    closeAllCallDropdowns();
    menu.classList.toggle('show');
}

function toggleHeroCallDropdown(event) {
    event.stopPropagation();
    const menu = document.getElementById('heroCallMenu');
    closeAllCallDropdowns();
    menu.classList.toggle('show');
}

function toggleCtaCallDropdown(event) {
    event.stopPropagation();
    const menu = document.getElementById('ctaCallMenu');
    closeAllCallDropdowns();
    menu.classList.toggle('show');
}

function toggleFooterCallDropdown(event) {
    event.stopPropagation();
    const menu = document.getElementById('footerCallMenu');
    closeAllCallDropdowns();
    menu.classList.toggle('show');
}

function closeAllCallDropdowns() {
    document.querySelectorAll('.nav-call-menu, .call-dropdown-menu, .footer-call-menu').forEach(menu => {
        menu.classList.remove('show');
    });
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.nav-call-dropdown') && 
        !e.target.closest('.call-dropdown-container') && 
        !e.target.closest('.footer-call-dropdown')) {
        closeAllCallDropdowns();
    }
});

// =====================================================
// NAVIGATION
// =====================================================
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#' || href === '') {
            return;
        }
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// =====================================================
// CALCULATOR MODAL FUNCTIONS
// =====================================================
function openCalculatorModal() {
    document.getElementById('calculator-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCalculatorModal() {
    document.getElementById('calculator-modal').classList.remove('active');
    document.body.style.overflow = '';
}

// Close modal on overlay click
document.getElementById('calculator-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeCalculatorModal();
    }
});

// Close on escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeCalculatorModal();
        closeModal('exit-modal');
        closeAllCallDropdowns();
    }
});

// =====================================================
// MODAL FUNCTIONS
// =====================================================
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = '';
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
});

// Exit capture form
const exitForm = document.getElementById('exit-capture-form');
if (exitForm) {
    exitForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('exit-email').value;
        const phone = document.getElementById('exit-phone').value;
        
        console.log('Lead Captured (Exit Intent):', { email, phone });
        
        closeModal('exit-modal');
        showToast('success', 'Discount Sent!', 'Check your email for your 10% off code');
    });
}

// =====================================================
// ZIP CODE CALCULATOR LOGIC
// =====================================================

// ZIP CODE DATABASE - Pre-calculated distances from Texas Got Rocks yard (Conroe)
const ZIP_DATA = {
    // ZONE 1: Conroe & Immediate Area (0-15 miles)
    '77301': { city: 'Conroe', distance: 3, time: 8, zone: 1 },
    '77302': { city: 'Conroe', distance: 7, time: 15, zone: 1 },
    '77303': { city: 'Conroe', distance: 5, time: 12, zone: 1 },
    '77304': { city: 'Conroe', distance: 6, time: 14, zone: 1 },
    '77305': { city: 'Conroe', distance: 4, time: 10, zone: 1 },
    '77306': { city: 'Conroe', distance: 8, time: 18, zone: 1 },
    '77384': { city: 'Conroe', distance: 10, time: 20, zone: 1 },
    '77385': { city: 'Conroe', distance: 2, time: 5, zone: 1 },
    '77316': { city: 'Montgomery', distance: 12, time: 22, zone: 1 },
    '77356': { city: 'Montgomery', distance: 14, time: 25, zone: 1 },
    '77318': { city: 'Willis', distance: 10, time: 18, zone: 1 },
    '77378': { city: 'Willis', distance: 12, time: 20, zone: 1 },
    '77354': { city: 'Magnolia', distance: 15, time: 28, zone: 1 },
    
    // ZONE 2: The Woodlands & Spring (15-30 miles)
    '77355': { city: 'Magnolia', distance: 18, time: 32, zone: 2 },
    '77380': { city: 'The Woodlands', distance: 18, time: 30, zone: 2 },
    '77381': { city: 'The Woodlands', distance: 16, time: 28, zone: 2 },
    '77382': { city: 'The Woodlands', distance: 17, time: 29, zone: 2 },
    '77386': { city: 'Spring', distance: 20, time: 35, zone: 2 },
    '77387': { city: 'The Woodlands', distance: 19, time: 32, zone: 2 },
    '77389': { city: 'Spring', distance: 22, time: 38, zone: 2 },
    '77373': { city: 'Spring', distance: 25, time: 40, zone: 2 },
    '77379': { city: 'Spring', distance: 24, time: 42, zone: 2 },
    '77388': { city: 'Spring', distance: 26, time: 45, zone: 2 },
    '77375': { city: 'Tomball', distance: 22, time: 38, zone: 2 },
    '77377': { city: 'Tomball', distance: 25, time: 42, zone: 2 },
    '77372': { city: 'Splendora', distance: 22, time: 35, zone: 2 },
    
    // ZONE 3: Greater Houston - North (30-45 miles)
    '77338': { city: 'Humble', distance: 32, time: 50, zone: 3 },
    '77339': { city: 'Kingwood', distance: 30, time: 48, zone: 3 },
    '77345': { city: 'Kingwood', distance: 32, time: 52, zone: 3 },
    '77346': { city: 'Humble', distance: 35, time: 55, zone: 3 },
    '77357': { city: 'New Caney', distance: 28, time: 42, zone: 3 },
    '77365': { city: 'Porter', distance: 26, time: 40, zone: 3 },
    '77044': { city: 'Houston', distance: 38, time: 58, zone: 3 },
    '77050': { city: 'Houston', distance: 40, time: 60, zone: 3 },
    '77060': { city: 'Houston', distance: 35, time: 55, zone: 3 },
    '77064': { city: 'Houston', distance: 32, time: 52, zone: 3 },
    '77065': { city: 'Houston', distance: 33, time: 54, zone: 3 },
    '77066': { city: 'Houston', distance: 30, time: 48, zone: 3 },
    '77067': { city: 'Houston', distance: 32, time: 50, zone: 3 },
    '77068': { city: 'Houston', distance: 28, time: 45, zone: 3 },
    '77069': { city: 'Houston', distance: 26, time: 42, zone: 3 },
    '77070': { city: 'Houston', distance: 28, time: 46, zone: 3 },
    '77090': { city: 'Houston', distance: 30, time: 48, zone: 3 },
    '77014': { city: 'Houston', distance: 35, time: 55, zone: 3 },
    '77032': { city: 'Houston', distance: 38, time: 58, zone: 3 },
    '77037': { city: 'Houston', distance: 36, time: 56, zone: 3 },
    '77038': { city: 'Houston', distance: 34, time: 54, zone: 3 },
    '77040': { city: 'Houston', distance: 36, time: 56, zone: 3 },
    '77041': { city: 'Houston', distance: 38, time: 58, zone: 3 },
    '77043': { city: 'Houston', distance: 40, time: 62, zone: 3 },
    '77018': { city: 'Houston', distance: 42, time: 64, zone: 3 },
    '77080': { city: 'Houston', distance: 40, time: 62, zone: 3 },
    '77088': { city: 'Houston', distance: 38, time: 60, zone: 3 },
    '77091': { city: 'Houston', distance: 40, time: 62, zone: 3 },
    '77092': { city: 'Houston', distance: 42, time: 65, zone: 3 },
    '77093': { city: 'Houston', distance: 40, time: 62, zone: 3 }
};

// TRUCK CONFIGURATION
const TRUCK_CONFIG = {
    trucks: {
        endDump: { hourlyRate: 125, capacityTons: 24 },
        tandem: { hourlyRate: 90, capacityTons: 15 }
    },
    loadTime: 5,
    dumpTime: 5,
    globalMargin: 0.20,
    tandemThreshold: 15
};

// STATE
let currentZipData = null;
let currentQuote = null;

// ZIP LOOKUP FUNCTION
function lookupZip(zip) {
    const cleaned = zip.replace(/\D/g, '').substring(0, 5);
    return ZIP_DATA[cleaned] || null;
}

// HANDLE ZIP INPUT
function handleQuoteZipInput(e) {
    const zip = e.target.value.replace(/\D/g, '');
    e.target.value = zip;
    
    const statusEl = document.getElementById('quoteZipStatus');
    const deliveryInfo = document.getElementById('quoteDeliveryInfo');
    const outOfArea = document.getElementById('quoteOutOfArea');
    
    if (zip.length < 5) {
        statusEl.classList.add('hidden');
        deliveryInfo.classList.add('hidden');
        outOfArea.classList.add('hidden');
        currentZipData = null;
        recalculateQuote();
        return;
    }
    
    // Look up the zip code
    const data = lookupZip(zip);
    
    if (data) {
        currentZipData = data;
        statusEl.textContent = '✓ We deliver here!';
        statusEl.className = 'zip-status valid';
        
        document.getElementById('quoteCityName').textContent = data.city;
        document.getElementById('quoteDistanceMiles').textContent = data.distance;
        document.getElementById('quoteTravelTime').textContent = data.time;
        
        deliveryInfo.classList.remove('hidden');
        outOfArea.classList.add('hidden');
        
        document.getElementById('quoteDeliveryCityBadge').textContent = data.city.toUpperCase();
    } else {
        currentZipData = null;
        statusEl.textContent = 'Outside area';
        statusEl.className = 'zip-status invalid';
        
        deliveryInfo.classList.add('hidden');
        outOfArea.classList.remove('hidden');
    }
    
    recalculateQuote();
}

// ADJUST QUANTITY
function adjustQuoteQuantity(delta) {
    const input = document.getElementById('quoteQuantity');
    let value = parseFloat(input.value) || 1;
    value = Math.max(1, Math.min(100, value + delta));
    input.value = value;
    recalculateQuote();
}

// RECALCULATE QUOTE
function recalculateQuote() {
    const productSelect = document.getElementById('quoteProduct');
    const quantity = parseFloat(document.getElementById('quoteQuantity').value) || 0;
    const ctaButton = document.getElementById('quoteCtaButton');
    
    // Check if we have all required data
    if (!currentZipData || !productSelect.value || quantity <= 0) {
        document.getElementById('quoteFreeDeliveryBadge').classList.add('hidden');
        document.getElementById('quoteTotalSection').classList.add('hidden');
        document.getElementById('needAProSection').classList.add('hidden');
        
        if (!currentZipData) {
            ctaButton.textContent = 'Enter ZIP Code to Get Quote';
        } else if (!productSelect.value) {
            ctaButton.textContent = 'Select a Material';
        } else {
            ctaButton.textContent = 'Enter Quantity';
        }
        ctaButton.disabled = true;
        return;
    }
    
    // Get product data
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    const unitPrice = parseFloat(selectedOption.dataset.price);
    const weightPerYard = parseFloat(selectedOption.dataset.weight);
    
    // Calculate costs
    const materialCost = quantity * unitPrice;
    
    // Transport cost (internal - customer doesn't see itemized)
    const totalTons = quantity * weightPerYard;
    const truck = totalTons > TRUCK_CONFIG.tandemThreshold ? TRUCK_CONFIG.trucks.endDump : TRUCK_CONFIG.trucks.tandem;
    const loads = Math.ceil(totalTons / truck.capacityTons);
    const timePerLoad = TRUCK_CONFIG.loadTime + currentZipData.time + TRUCK_CONFIG.dumpTime;
    const totalHours = (timePerLoad * loads) / 60;
    const transportCost = totalHours * truck.hourlyRate;
    
    // Final price with margin
    const subtotal = materialCost + transportCost;
    const total = subtotal * (1 + TRUCK_CONFIG.globalMargin);
    const perUnit = total / quantity;
    
    // Update display
    document.getElementById('quoteTotalAmount').textContent = '$' + Math.round(total);
    document.getElementById('quotePerUnit').textContent = perUnit.toFixed(2);
    
    // Show sections
    document.getElementById('quoteFreeDeliveryBadge').classList.remove('hidden');
    document.getElementById('quoteTotalSection').classList.remove('hidden');
    document.getElementById('needAProSection').classList.remove('hidden');
    
    // Enable CTA only if Turnstile is completed
    if (typeof turnstileStatus !== 'undefined' && turnstileStatus.quote) {
        ctaButton.textContent = '🛒 Add to Cart →';
        ctaButton.disabled = false;
    } else {
        ctaButton.textContent = 'Complete Verification to Continue';
        ctaButton.disabled = true;
    }
    
    // Store quote data
    currentQuote = {
        zip: document.getElementById('quoteZipCode').value,
        city: currentZipData.city,
        distance: currentZipData.distance,
        product: selectedOption.text,
        quantity: quantity,
        total: Math.round(total),
        perUnit: perUnit.toFixed(2)
    };
}

// SUBMIT QUOTE
function submitQuoteRequest() {
    if (!currentQuote) return;
    
    console.log('Quote submitted:', currentQuote);
    
    // Show success toast
    showToast('success', 'Quote Ready!', `$${currentQuote.total} for ${currentQuote.quantity} yd³ to ${currentQuote.city} with FREE delivery!`);
    
    // For now, show alert - can be replaced with checkout flow
    alert(`Quote Ready!\n\nDelivering to: ${currentQuote.city} (${currentQuote.zip})\nMaterial: ${currentQuote.product}\nQuantity: ${currentQuote.quantity} yd³\nTotal: $${currentQuote.total}\n\nNext step: We'll collect your address and schedule delivery.`);
}

// ATTACH ZIP CODE CALCULATOR EVENT LISTENERS
const quoteZipInput = document.getElementById('quoteZipCode');
if (quoteZipInput) {
    quoteZipInput.addEventListener('input', handleQuoteZipInput);
}

const quoteProductSelect = document.getElementById('quoteProduct');
if (quoteProductSelect) {
    quoteProductSelect.addEventListener('change', recalculateQuote);
}

const quoteQuantityInput = document.getElementById('quoteQuantity');
if (quoteQuantityInput) {
    quoteQuantityInput.addEventListener('input', recalculateQuote);
    quoteQuantityInput.addEventListener('change', recalculateQuote);
}

// =====================================================
// TOAST NOTIFICATIONS
// =====================================================
function showToast(type, title, message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <div class="toast-message">
            <strong>${title}</strong>
            <span>${message}</span>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'toastSlideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// =====================================================
// FAQ TOGGLE
// =====================================================
function toggleFaq(button) {
    const faqItem = button.parentElement;
    const answer = faqItem.querySelector('.faq-answer');
    const icon = button.querySelector('.faq-icon');
    
    // Close all other FAQs
    document.querySelectorAll('.faq-item').forEach(item => {
        if (item !== faqItem) {
            item.classList.remove('active');
            const otherAnswer = item.querySelector('.faq-answer');
            const otherIcon = item.querySelector('.faq-icon');
            if (otherAnswer) otherAnswer.style.maxHeight = null;
            if (otherIcon) otherIcon.textContent = '+';
        }
    });
    
    // Toggle current FAQ
    faqItem.classList.toggle('active');
    
    if (faqItem.classList.contains('active')) {
        answer.style.maxHeight = answer.scrollHeight + 'px';
        icon.textContent = '−';
    } else {
        answer.style.maxHeight = null;
        icon.textContent = '+';
    }
}

// =====================================================
// HERO DROPDOWN TOGGLE
// =====================================================
const heroDropdownBtn = document.querySelector('.hero-dropdown-btn');
const heroDropdownMenu = document.querySelector('.hero-dropdown-menu');

if (heroDropdownBtn && heroDropdownMenu) {
    heroDropdownBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        heroDropdownMenu.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.hero-dropdown')) {
            heroDropdownMenu.classList.remove('show');
        }
    });

    // Close dropdown when pressing Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            heroDropdownMenu.classList.remove('show');
        }
    });
}

// =====================================================
// SHOPPING CART SYSTEM
// =====================================================

// Cart State
let cart = [];
let cartIdCounter = 1;

// Generate tomorrow's date as minimum delivery date
function getMinDeliveryDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
}

// Generate default delivery date (2 days from now)
function getDefaultDeliveryDate() {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 2);
    return defaultDate.toISOString().split('T')[0];
}

// Add item to cart
function addToCart() {
    if (!currentQuote) return;
    
    const cartItem = {
        id: cartIdCounter++,
        product: currentQuote.product,
        quantity: currentQuote.quantity,
        zip: currentQuote.zip,
        city: currentQuote.city,
        distance: currentQuote.distance,
        total: currentQuote.total,
        perUnit: currentQuote.perUnit,
        deliveryDate: getDefaultDeliveryDate()
    };
    
    cart.push(cartItem);
    
    // Update UI
    updateCartCount();
    updateCartDrawer();
    
    // Show success toast
    showToast('success', 'Added to Cart!', `${cartItem.quantity} yd³ ${cartItem.product} - $${cartItem.total}`);
    
    // Pulse animation on cart icon
    const cartCount = document.getElementById('navCartCount');
    cartCount.classList.add('pulse');
    setTimeout(() => cartCount.classList.remove('pulse'), 300);
    
    // Close calculator and open cart
    closeCalculatorModal();
    setTimeout(() => openCartDrawer(), 300);
    
    // Reset calculator form
    resetCalculatorForm();
}

// Remove item from cart
function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    updateCartCount();
    updateCartDrawer();
    showToast('info', 'Item Removed', 'Item removed from your cart');
}

// Update delivery date for item
function updateDeliveryDate(itemId, newDate) {
    const item = cart.find(item => item.id === itemId);
    if (item) {
        item.deliveryDate = newDate;
    }
}

// Update cart count badge
function updateCartCount() {
    const countEl = document.getElementById('navCartCount');
    const count = cart.length;
    
    if (count > 0) {
        countEl.textContent = count;
        countEl.classList.remove('hidden');
    } else {
        countEl.classList.add('hidden');
    }
}

// Update cart drawer contents
function updateCartDrawer() {
    const emptyEl = document.getElementById('cartEmpty');
    const itemsContainer = document.getElementById('cartItemsContainer');
    const footerEl = document.getElementById('cartDrawerFooter');
    
    if (cart.length === 0) {
        emptyEl.style.display = 'block';
        itemsContainer.innerHTML = '';
        footerEl.style.display = 'none';
        return;
    }
    
    emptyEl.style.display = 'none';
    footerEl.style.display = 'block';
    
    // Build cart items HTML
    let itemsHtml = '';
    let subtotal = 0;
    
    cart.forEach(item => {
        subtotal += item.total;
        itemsHtml += `
            <div class="cart-item">
                <div class="cart-item-header">
                    <div>
                        <div class="cart-item-name">${item.product}</div>
                        <div class="cart-item-location">📍 ${item.city} (${item.zip})</div>
                    </div>
                    <button class="cart-item-remove" onclick="removeFromCart(${item.id})">✕</button>
                </div>
                <div class="cart-item-details">
                    <span class="cart-item-qty">${item.quantity} cubic yards</span>
                    <span class="cart-item-price">$${item.total}</span>
                </div>
                <div class="cart-item-per-unit">$${item.perUnit}/yd³ delivered</div>
            </div>
        `;
    });
    
    itemsContainer.innerHTML = itemsHtml;
    
    // Update summary
    document.getElementById('cartItemCount').textContent = cart.length;
    document.getElementById('cartSubtotal').textContent = '$' + subtotal;
    document.getElementById('cartTotal').textContent = '$' + subtotal;
}

// Open cart drawer
function openCartDrawer() {
    document.getElementById('cartDrawerOverlay').classList.add('active');
    document.getElementById('cartDrawer').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close cart drawer
function closeCartDrawer() {
    document.getElementById('cartDrawerOverlay').classList.remove('active');
    document.getElementById('cartDrawer').classList.remove('active');
    document.body.style.overflow = '';
}

// Proceed to checkout
// Customer info storage
var customerInfo = {
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zip: '',
    marketingConsent: false
};

function proceedToCheckout() {
    if (cart.length === 0) return;
    
    closeCartDrawer();
    
    // Pre-fill city/zip from cart if available
    if (cart.length > 0) {
        document.getElementById('checkoutCity').value = cart[0].city || '';
        document.getElementById('checkoutZipConfirm').value = cart[0].zip || '';
    }
    
    // Reset to step 1
    showCheckoutStep(1);
    
    // Show checkout modal
    document.getElementById('checkoutModal').classList.add('active');
}

function showCheckoutStep(step) {
    // Hide all steps
    document.getElementById('checkoutStep1').style.display = 'none';
    document.getElementById('checkoutStep2').style.display = 'none';
    document.getElementById('checkoutStep3').style.display = 'none';
    
    // Reset step indicators
    document.getElementById('step1indicator').classList.remove('active', 'completed');
    document.getElementById('step2indicator').classList.remove('active', 'completed');
    document.getElementById('step3indicator').classList.remove('active', 'completed');
    
    // Show current step and update indicators
    if (step === 1) {
        document.getElementById('checkoutStep1').style.display = 'block';
        document.getElementById('step1indicator').classList.add('active');
        document.getElementById('checkoutModalTitle').textContent = '📋 Contact Information';
    } else if (step === 2) {
        document.getElementById('checkoutStep2').style.display = 'block';
        document.getElementById('step1indicator').classList.add('completed');
        document.getElementById('step2indicator').classList.add('active');
        document.getElementById('checkoutModalTitle').textContent = '📅 Select Delivery Date';
    } else if (step === 3) {
        document.getElementById('checkoutStep3').style.display = 'block';
        document.getElementById('step1indicator').classList.add('completed');
        document.getElementById('step2indicator').classList.add('completed');
        document.getElementById('step3indicator').classList.add('active');
        document.getElementById('checkoutModalTitle').textContent = '💳 Review & Pay';
    }
}

function goToContactStep() {
    showCheckoutStep(1);
}

function goToDeliveryStep() {
    // Validate contact info
    var name = document.getElementById('checkoutName').value.trim();
    var email = document.getElementById('checkoutEmail').value.trim();
    var phone = document.getElementById('checkoutPhone').value.trim();
    var address = document.getElementById('checkoutAddress').value.trim();
    var city = document.getElementById('checkoutCity').value.trim();
    var zip = document.getElementById('checkoutZipConfirm').value.trim();
    
    if (!name || !email || !phone || !address || !city || !zip) {
        showToast('error', 'Missing Information', 'Please fill in all required fields');
        return;
    }
    
    // Basic email validation
    if (!email.includes('@') || !email.includes('.')) {
        showToast('error', 'Invalid Email', 'Please enter a valid email address');
        return;
    }
    
    // Store customer info
    customerInfo = {
        name: name,
        email: email,
        phone: phone,
        address: address,
        city: city,
        zip: zip,
        marketingConsent: document.getElementById('checkoutMarketingConsent').checked
    };
    
    // Build delivery date selection UI
    var deliveryHtml = '';
    cart.forEach(function(item, index) {
        deliveryHtml += '<div class="checkout-delivery-item">' +
            '<div class="checkout-delivery-item-header">' +
                '<div>' +
                    '<div class="checkout-delivery-item-name">' + item.product + '</div>' +
                    '<div class="checkout-delivery-item-details">' + item.quantity + ' yd³ → ' + item.city + '</div>' +
                '</div>' +
                '<div class="checkout-delivery-item-price">$' + item.total + '</div>' +
            '</div>' +
            '<label>📅 Preferred Delivery Date</label>' +
            '<input type="date" id="deliveryDate' + index + '" value="' + item.deliveryDate + '" min="' + getMinDeliveryDate() + '">' +
        '</div>';
    });
    
    document.getElementById('checkoutDeliveryItems').innerHTML = deliveryHtml;
    
    showCheckoutStep(2);
}

function goToPaymentStep() {
    // Update cart items with selected delivery dates
    cart.forEach(function(item, index) {
        var dateInput = document.getElementById('deliveryDate' + index);
        if (dateInput) {
            item.deliveryDate = dateInput.value;
        }
    });
    
    // Build final summary
    var summaryHtml = '<div class="checkout-customer-summary">' +
        '<h4>📍 Delivery To:</h4>' +
        '<p><strong>' + customerInfo.name + '</strong><br>' +
        customerInfo.address + '<br>' +
        customerInfo.city + ', TX ' + customerInfo.zip + '<br>' +
        '📞 ' + customerInfo.phone + '<br>' +
        '✉️ ' + customerInfo.email + '</p>' +
    '</div>';
    
    var total = 0;
    cart.forEach(function(item) {
        total += item.total;
        var deliveryDate = new Date(item.deliveryDate).toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
        summaryHtml += '<div class="checkout-order-item">' +
            '<div>' +
                '<strong>' + item.product + '</strong><br>' +
                '<small>' + item.quantity + ' yd³</small><br>' +
                '<small>📅 ' + deliveryDate + '</small>' +
            '</div>' +
            '<strong>$' + item.total + '</strong>' +
        '</div>';
    });
    
    summaryHtml += '<div class="checkout-order-total">' +
        '<span>Total (FREE Delivery)</span>' +
        '<span>$' + total + '</span>' +
    '</div>';
    
    document.getElementById('checkoutOrderSummary').innerHTML = summaryHtml;
    
    showCheckoutStep(3);
}

// Add more items from checkout
function addMoreFromCheckout() {
    document.getElementById('checkoutModal').classList.remove('active');
    openCalculatorModal();
}

// Close checkout modal
function closeCheckoutModal() {
    document.getElementById('checkoutModal').classList.remove('active');
}

// Process payment
function processPayment() {
    if (cart.length === 0) return;
    
    const total = cart.reduce((sum, item) => sum + item.total, 0);
    
    // For demo - show success
    document.getElementById('checkoutModal').classList.remove('active');
    
    // Show success toast
    showToast('success', 'Order Placed!', `$${total} - We'll contact you to confirm delivery details.`);
    
    // Show confirmation alert
    let orderDetails = 'ORDER CONFIRMED!\n\n';
    cart.forEach((item, index) => {
        const deliveryDate = new Date(item.deliveryDate).toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
        });
        orderDetails += `Item ${index + 1}: ${item.quantity} yd³ ${item.product}\n`;
        orderDetails += `  → Delivery to ${item.city} (${item.zip})\n`;
        orderDetails += `  → Scheduled: ${deliveryDate}\n`;
        orderDetails += `  → Price: $${item.total}\n\n`;
    });
    orderDetails += `TOTAL: $${total} (FREE DELIVERY)\n\n`;
    orderDetails += "We'll send a confirmation email and text with tracking info!";
    
    alert(orderDetails);
    
    // Clear cart
    cart = [];
    updateCartCount();
    updateCartDrawer();
    
    // Reset add more prompt for next time
    document.querySelector('.checkout-add-more-prompt').style.display = 'block';
}

// Reset calculator form
function resetCalculatorForm() {
    document.getElementById('quoteZipCode').value = '';
    document.getElementById('quoteProduct').value = '';
    document.getElementById('quoteQuantity').value = '5';
    document.getElementById('quoteZipStatus').classList.add('hidden');
    document.getElementById('quoteDeliveryInfo').classList.add('hidden');
    document.getElementById('quoteOutOfArea').classList.add('hidden');
    document.getElementById('quoteFreeDeliveryBadge').classList.add('hidden');
    document.getElementById('quoteTotalSection').classList.add('hidden');
    document.getElementById('needAProSection').classList.add('hidden');
    document.getElementById('quoteCtaButton').disabled = true;
    document.getElementById('quoteCtaButton').textContent = 'Enter ZIP Code to Get Quote';
    currentZipData = null;
    currentQuote = null;
}

// =====================================================
// INLINE MATERIAL CALCULATOR
// =====================================================

// Store calculated values for passing to quote calculator
let calculatedMaterial = null;

function calculateInlineMaterial() {
    const materialSelect = document.getElementById('inline-calc-material');
    const length = parseFloat(document.getElementById('inline-calc-length').value) || 0;
    const width = parseFloat(document.getElementById('inline-calc-width').value) || 0;
    const depth = parseFloat(document.getElementById('inline-calc-depth').value) || 0;
    
    // Require material selection
    if (!materialSelect.value) {
        showToast('error', 'Select Material', 'Please select a material type first');
        return;
    }
    
    if (length <= 0 || width <= 0 || depth <= 0) {
        showToast('error', 'Missing Info', 'Please enter length, width, and depth');
        return;
    }
    
    // Get weight per yard from selected material
    const selectedOption = materialSelect.options[materialSelect.selectedIndex];
    const weightPerYard = parseFloat(selectedOption.dataset.weight) || 1.4;
    const materialName = selectedOption.text;
    
    // Calculate cubic yards: (L ft × W ft × D in) / 324 = cubic yards
    const cubicYards = (length * width * depth) / 324;
    
    // Convert to tons using material-specific weight
    const tons = cubicYards * weightPerYard;
    
    // Update display
    document.getElementById('inline-result-yards').textContent = cubicYards.toFixed(1);
    document.getElementById('inline-result-tons').textContent = tons.toFixed(1);
    
    // Show material note
    const noteEl = document.getElementById('result-material-note');
    noteEl.innerHTML = `Based on <strong>${materialName}</strong> (${weightPerYard} tons/yd³)`;
    noteEl.style.display = 'block';
    
    // Store for passing to quote calculator
    calculatedMaterial = {
        materialValue: materialSelect.value,
        materialName: materialName,
        cubicYards: cubicYards,
        tons: tons
    };
    
    // Show result section
    document.getElementById('inline-calc-result').style.display = 'block';
    
    // Scroll to result
    document.getElementById('inline-calc-result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Get Delivery Price - opens quote calculator with pre-filled values
function getDeliveryPrice() {
    if (!calculatedMaterial) {
        showToast('error', 'Calculate First', 'Please calculate your material needs first');
        return;
    }
    
    // Open the quote calculator modal
    openCalculatorModal();
    
    // Pre-fill the material if one was selected
    if (calculatedMaterial.materialValue) {
        const quoteProductSelect = document.getElementById('quoteProduct');
        quoteProductSelect.value = calculatedMaterial.materialValue;
    }
    
    // Pre-fill the quantity (round up to nearest 0.5)
    const quantity = Math.ceil(calculatedMaterial.cubicYards * 2) / 2;
    document.getElementById('quoteQuantity').value = quantity;
    
    // Show toast
    if (calculatedMaterial.materialName) {
        showToast('info', 'Material Pre-filled', `${quantity} yd³ of ${calculatedMaterial.materialName} - enter your ZIP for pricing!`);
    } else {
        showToast('info', 'Quantity Pre-filled', `${quantity} cubic yards - select a material and enter your ZIP!`);
    }
    
    // Trigger recalculation if ZIP is already filled
    recalculateQuote();
}

function requestInlineCallback() {
    const name = document.getElementById('inline-callback-name').value;
    const phone = document.getElementById('inline-callback-phone').value;
    
    if (!name || !phone) {
        showToast('error', 'Missing Info', 'Please enter your name and phone number');
        return;
    }
    
    console.log('Callback requested:', { name, phone });
    showToast('success', 'Callback Requested!', "We'll call you during business hours.");
    
    // Clear form
    document.getElementById('inline-callback-name').value = '';
    document.getElementById('inline-callback-phone').value = '';
}

// =====================================================
// MATERIAL VISUALIZER
// =====================================================

// Visualizer State
const vizState = {
    image: null,
    selectedMaterial: { id: 'decomposed-granite', name: 'Decomposed Granite', color: '#C9A66B', price: 45 },
    points: [],
    isComplete: false,
    showOverlay: true,
    opacity: 0.7
};

const vizMaterials = [
    { id: 'decomposed-granite', name: 'Decomposed Granite', color: '#C9A66B', price: 45 },
    { id: 'pea-gravel', name: 'Pea Gravel', color: '#8B7355', price: 52 },
    { id: 'crushed-stone', name: 'Crushed Stone', color: '#6B6B6B', price: 48 },
    { id: 'river-rock', name: 'River Rock', color: '#5D5D5D', price: 65 },
    { id: 'red-lava', name: 'Red Lava Rock', color: '#8B3A3A', price: 75 },
    { id: 'white-marble', name: 'White Marble', color: '#E8E8E8', price: 85 }
];

// Open/Close Visualizer
function openVisualizer() {
    document.getElementById('visualizerModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeVisualizer() {
    document.getElementById('visualizerModal').classList.remove('active');
    document.body.style.overflow = '';
}

// Photo Consent State
var pendingPhotoFile = null;
var photoConsentGiven = false;

function openPhotoConsent() {
    document.getElementById('photoConsentModal').classList.add('active');
}

function closePhotoConsent() {
    document.getElementById('photoConsentModal').classList.remove('active');
}

// File Upload Handler - now shows consent first
function handleVisualizerUpload(event) {
    var file = event.target.files[0];
    if (!file) return;
    
    if (photoConsentGiven) {
        processVisualizerFile(file);
    } else {
        pendingPhotoFile = file;
        openPhotoConsent();
    }
}

function acceptPhotoConsent() {
    photoConsentGiven = true;
    closePhotoConsent();
    if (pendingPhotoFile) {
        processVisualizerFile(pendingPhotoFile);
        pendingPhotoFile = null;
    }
}

function declinePhotoConsent() {
    closePhotoConsent();
    document.getElementById('vizFileInput').value = '';
    pendingPhotoFile = null;
}

function processVisualizerFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        // Resize image to prevent memory issues
        const img = new Image();
        img.onload = function() {
            // Limit image size to 800px max dimension
            const maxDim = 800;
            let width = img.width;
            let height = img.height;
            
            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = (height / width) * maxDim;
                    width = maxDim;
                } else {
                    width = (width / height) * maxDim;
                    height = maxDim;
                }
            }
            
            // Create resized canvas
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(img, 0, 0, width, height);
            
            // Store resized image
            vizState.image = tempCanvas.toDataURL('image/jpeg', 0.8);
            vizState.points = [];
            vizState.isComplete = false;
            vizCanvasDimensions = { width: 0, height: 0 };
            
            updateVisualizerUI();
            drawVisualizerCanvas();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Drag and Drop
function handleVizDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('vizCanvasContainer').classList.add('dragging');
}

function handleVizDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('vizCanvasContainer').classList.remove('dragging');
}

function handleVizDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('vizCanvasContainer').classList.remove('dragging');
    
    var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) {
        if (photoConsentGiven) {
            processVisualizerFile(file);
        } else {
            pendingPhotoFile = file;
            openPhotoConsent();
        }
    }
}

// Canvas Click Handler
function handleVisualizerClick(event) {
    if (!vizState.image) return;
    if (vizState.isComplete) return;
    
    const canvas = document.getElementById('vizMainCanvas');
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    
    // Check if closing shape
    if (vizState.points.length > 2) {
        const first = vizState.points[0];
        const dist = Math.sqrt((x - first.x) ** 2 + (y - first.y) ** 2);
        if (dist < 25) {
            vizState.isComplete = true;
            updateVisualizerUI();
            drawVisualizerCanvas();
            return;
        }
    }
    
    vizState.points.push({x, y});
    updateVisualizerUI();
    drawVisualizerCanvas();
}

// Store canvas dimensions
let vizCanvasDimensions = { width: 0, height: 0 };

// Draw Canvas - simplified working version
function drawVisualizerCanvas() {
    if (!vizState.image) return;
    
    const canvas = document.getElementById('vizMainCanvas');
    const ctx = canvas.getContext('2d');
    
    const img = new Image();
    img.onload = function() {
        // Calculate size on first draw
        if (vizCanvasDimensions.width === 0) {
            const maxDim = 500;
            let w = img.width, h = img.height;
            if (w > maxDim || h > maxDim) {
                if (w > h) { h = (h/w) * maxDim; w = maxDim; }
                else { w = (w/h) * maxDim; h = maxDim; }
            }
            vizCanvasDimensions.width = Math.floor(w);
            vizCanvasDimensions.height = Math.floor(h);
        }
        
        canvas.width = vizCanvasDimensions.width;
        canvas.height = vizCanvasDimensions.height;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Draw points and lines
        if (vizState.points.length > 0) {
            // Draw lines
            ctx.strokeStyle = '#E85D04';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(vizState.points[0].x, vizState.points[0].y);
            for (let i = 1; i < vizState.points.length; i++) {
                ctx.lineTo(vizState.points[i].x, vizState.points[i].y);
            }
            if (vizState.isComplete) {
                ctx.closePath();
            }
            ctx.stroke();
            
            // Draw points (only if not complete)
            if (!vizState.isComplete) {
                vizState.points.forEach(function(p, i) {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
                    ctx.fillStyle = (i === 0 && vizState.points.length > 2) ? '#22c55e' : '#E85D04';
                    ctx.fill();
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                });
            }
            
            // Fill shape if complete
            if (vizState.isComplete && vizState.showOverlay) {
                ctx.globalAlpha = vizState.opacity;
                ctx.fillStyle = vizState.selectedMaterial.color;
                ctx.beginPath();
                ctx.moveTo(vizState.points[0].x, vizState.points[0].y);
                for (let i = 1; i < vizState.points.length; i++) {
                    ctx.lineTo(vizState.points[i].x, vizState.points[i].y);
                }
                ctx.closePath();
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }
    };
    img.src = vizState.image;
}

// Draw Material Overlay - now handled in drawVisualizerCanvas
function drawVisualizerOverlay() {
    // Overlay is now drawn directly on main canvas, nothing to do here
}

// Update UI State
function updateVisualizerUI() {
    const placeholder = document.getElementById('vizPlaceholder');
    const canvasWrapper = document.getElementById('vizCanvasWrapper');
    const startOverBtn = document.getElementById('vizStartOver');
    const instructionsDiv = document.getElementById('vizInstructions');
    const controlsDiv = document.getElementById('vizControls');
    const step3Title = document.getElementById('vizStep3Title');
    const pointCounter = document.getElementById('vizPointCounter');
    const materialBadge = document.getElementById('vizMaterialBadge');
    const calcSection = document.getElementById('vizCalcSection');
    
    if (!vizState.image) {
        placeholder.style.display = 'block';
        canvasWrapper.style.display = 'none';
        startOverBtn.style.display = 'none';
        instructionsDiv.innerHTML = '<p class="viz-instruction">Upload a photo to get started</p>';
        instructionsDiv.style.display = 'block';
        controlsDiv.style.display = 'none';
        calcSection.style.display = 'none';
        return;
    }
    
    placeholder.style.display = 'none';
    canvasWrapper.style.display = 'block';
    startOverBtn.style.display = 'block';
    
    if (vizState.isComplete) {
        step3Title.textContent = '3. Adjust Preview';
        instructionsDiv.style.display = 'none';
        controlsDiv.style.display = 'block';
        pointCounter.style.display = 'none';
        materialBadge.style.display = 'block';
        document.getElementById('vizBadgeName').textContent = vizState.selectedMaterial.name;
        calcSection.style.display = 'block';
        document.getElementById('vizCalcMaterial').innerHTML = 'Calculating for: <strong>' + vizState.selectedMaterial.name + '</strong>';
    } else {
        step3Title.textContent = '3. Outline Area';
        instructionsDiv.innerHTML = '<p class="viz-instruction">Tap to add points. Tap the <span class="green">green point</span> to close the shape.</p>' +
            (vizState.points.length > 0 ? '<button class="viz-reset-btn" onclick="resetVisualizerPoints()">↺ Reset Points</button>' : '');
        instructionsDiv.style.display = 'block';
        controlsDiv.style.display = 'none';
        materialBadge.style.display = 'none';
        calcSection.style.display = 'none';
        
        if (vizState.points.length > 0) {
            pointCounter.style.display = 'block';
            pointCounter.innerHTML = vizState.points.length + ' point' + (vizState.points.length !== 1 ? 's' : '') + (vizState.points.length >= 3 ? ' • tap green to close' : '');
        } else {
            pointCounter.style.display = 'none';
        }
    }
}

// Visualizer Material Calculator
const vizMaterialWeights = {
    'decomposed-granite': 1.5,
    'pea-gravel': 1.4,
    'crushed-stone': 1.4,
    'river-rock': 1.3,
    'red-lava': 0.5,
    'white-marble': 1.5
};

let vizCalculatedQuantity = null;

function calculateVisualizerMaterial() {
    const length = parseFloat(document.getElementById('vizCalcLength').value) || 0;
    const width = parseFloat(document.getElementById('vizCalcWidth').value) || 0;
    const depth = parseFloat(document.getElementById('vizCalcDepth').value) || 0;
    
    if (length <= 0 || width <= 0 || depth <= 0) {
        showToast('error', 'Missing Info', 'Please enter length, width, and depth');
        return;
    }
    
    // Calculate cubic yards
    const cubicYards = (length * width * depth) / 324;
    
    // Get weight for selected material
    const weight = vizMaterialWeights[vizState.selectedMaterial.id] || 1.4;
    const tons = cubicYards * weight;
    
    // Update display
    document.getElementById('vizCalcYards').textContent = cubicYards.toFixed(1);
    document.getElementById('vizCalcTons').textContent = tons.toFixed(1);
    
    // Store for quote
    vizCalculatedQuantity = Math.ceil(cubicYards * 2) / 2; // Round up to nearest 0.5
    
    // Show result
    document.getElementById('vizCalcResult').style.display = 'block';
}

// Get quote with calculated quantity
function getVisualizerQuoteWithQuantity() {
    closeVisualizer();
    openCalculatorModal();
    
    // Map visualizer material to quote calculator material
    const materialMapping = {
        'decomposed-granite': 'decomposed-granite',
        'pea-gravel': 'pea-gravel',
        'crushed-stone': 'driveway-gravel',
        'river-rock': 'river-rock',
        'red-lava': 'river-rock',
        'white-marble': 'limestone'
    };
    
    const mappedMaterial = materialMapping[vizState.selectedMaterial.id] || '';
    const quoteProductSelect = document.getElementById('quoteProduct');
    if (quoteProductSelect && mappedMaterial) {
        quoteProductSelect.value = mappedMaterial;
    }
    
    // Set quantity from calculator
    if (vizCalculatedQuantity) {
        document.getElementById('quoteQuantity').value = vizCalculatedQuantity;
    }
    
    recalculateQuote();
    showToast('info', 'Ready for Quote', `${vizCalculatedQuantity} yd³ of ${vizState.selectedMaterial.name} - enter your ZIP!`);
}

// Material Selection
document.addEventListener('DOMContentLoaded', function() {
    const materialGrid = document.getElementById('vizMaterialGrid');
    if (materialGrid) {
        materialGrid.addEventListener('click', function(e) {
            const btn = e.target.closest('.material-btn');
            if (!btn) return;
            
            // Update active state
            document.querySelectorAll('.material-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update state
            const materialId = btn.dataset.id;
            vizState.selectedMaterial = vizMaterials.find(m => m.id === materialId);
            
            // Update price display
            document.getElementById('vizMaterialPrice').textContent = `$${vizState.selectedMaterial.price}/cubic yard`;
            
            // Update calculator material name if visible
            const calcMaterial = document.getElementById('vizCalcMaterial');
            if (calcMaterial) {
                calcMaterial.innerHTML = `Calculating for: <strong>${vizState.selectedMaterial.name}</strong>`;
            }
            
            // Redraw if complete
            if (vizState.isComplete) {
                document.getElementById('vizBadgeName').textContent = vizState.selectedMaterial.name;
                drawVisualizerCanvas();
            }
        });
    }
});

// Toggle Overlay
function toggleVisualizerOverlay() {
    vizState.showOverlay = document.getElementById('vizShowOverlay').checked;
    drawVisualizerCanvas();
}

// Update Opacity
function updateVisualizerOpacity() {
    const slider = document.getElementById('vizOpacitySlider');
    vizState.opacity = slider.value / 100;
    document.getElementById('vizOpacityValue').textContent = slider.value + '%';
    drawVisualizerCanvas();
}

// Reset Points
function resetVisualizerPoints() {
    vizState.points = [];
    vizState.isComplete = false;
    vizCalculatedQuantity = null;
    vizCanvasDimensions = { width: 0, height: 0 };
    
    // Reset calculator fields
    document.getElementById('vizCalcLength').value = '';
    document.getElementById('vizCalcWidth').value = '';
    document.getElementById('vizCalcDepth').value = '';
    document.getElementById('vizCalcResult').style.display = 'none';
    
    updateVisualizerUI();
    drawVisualizerCanvas();
}

// Full Reset
function resetVisualizer() {
    vizState.image = null;
    vizState.points = [];
    vizState.isComplete = false;
    vizCalculatedQuantity = null;
    vizCanvasDimensions = { width: 0, height: 0 };
    
    // Reset calculator fields
    document.getElementById('vizCalcLength').value = '';
    document.getElementById('vizCalcWidth').value = '';
    document.getElementById('vizCalcDepth').value = '';
    document.getElementById('vizCalcResult').style.display = 'none';
    
    document.getElementById('vizFileInput').value = '';
    updateVisualizerUI();
}

// Get Quote from Visualizer
function getVisualizerQuote() {
    closeVisualizer();
    openCalculatorModal();
    
    // Map visualizer material to quote calculator material
    const materialMapping = {
        'decomposed-granite': 'decomposed-granite',
        'pea-gravel': 'pea-gravel',
        'crushed-stone': 'driveway-gravel',
        'river-rock': 'river-rock',
        'red-lava': 'river-rock',
        'white-marble': 'limestone'
    };
    
    const mappedMaterial = materialMapping[vizState.selectedMaterial.id] || '';
    const quoteProductSelect = document.getElementById('quoteProduct');
    if (quoteProductSelect && mappedMaterial) {
        quoteProductSelect.value = mappedMaterial;
        recalculateQuote();
    }
    
    showToast('info', 'Material Selected', `${vizState.selectedMaterial.name} - Enter your ZIP and quantity for pricing!`);
}

// =====================================================
// MOBILE MENU TOGGLE
// =====================================================
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', function() {
        this.classList.toggle('active');
        navLinks.classList.toggle('active');
    });
    
    // Close mobile menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenuBtn.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });
    
    // Toggle service areas dropdown in mobile
    const navDropdown = document.querySelector('.nav-dropdown > a');
    if (navDropdown) {
        navDropdown.addEventListener('click', function(e) {
            if (window.innerWidth <= 968) {
                e.preventDefault();
                this.parentElement.classList.toggle('active');
            }
        });
    }
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(e) {
    if (navLinks && mobileMenuBtn) {
        if (!e.target.closest('.nav-links') && !e.target.closest('.mobile-menu-btn')) {
            mobileMenuBtn.classList.remove('active');
            navLinks.classList.remove('active');
        }
    }
});

// =====================================================
// INITIALIZATION
// =====================================================
console.log('🪨 Texas Got Rocks CodePen loaded successfully!');
console.log('Test ZIP codes: 77301 (Conroe), 77380 (The Woodlands), 77338 (Humble)');
console.log('Click "Get Your Free Quote" to test the calculator!');

// =====================================================
// BEFORE/AFTER SLIDER
// =====================================================
function initBeforeAfterSlider() {
    const slider = document.getElementById('beforeAfterSlider');
    if (!slider) return;
    
    const container = slider.querySelector('.ba-image-container');
    const beforeWrapper = slider.querySelector('.ba-before-wrapper');
    const handle = slider.querySelector('.ba-slider-handle');
    const beforeLabel = slider.querySelector('.ba-label-before');
    const afterLabel = slider.querySelector('.ba-label-after');
    
    let isDragging = false;
    
    function updateSliderPosition(x) {
        const rect = container.getBoundingClientRect();
        let position = (x - rect.left) / rect.width;
        position = Math.max(0.05, Math.min(0.95, position)); // Keep within bounds
        
        const percentage = position * 100;
        beforeWrapper.style.width = percentage + '%';
        handle.style.left = percentage + '%';
        
        // Toggle labels based on position
        // Slider left (< 30%) = showing mostly AFTER, hide BEFORE label
        // Slider middle (30-70%) = show BOTH labels
        // Slider right (> 70%) = showing mostly BEFORE, hide AFTER label
        if (position < 0.3) {
            beforeLabel.style.opacity = '0';
            afterLabel.style.opacity = '1';
        } else if (position > 0.7) {
            beforeLabel.style.opacity = '1';
            afterLabel.style.opacity = '0';
        } else {
            beforeLabel.style.opacity = '1';
            afterLabel.style.opacity = '1';
        }
    }
    
    // Mouse events
    slider.addEventListener('mousedown', function(e) {
        isDragging = true;
        updateSliderPosition(e.clientX);
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        e.preventDefault();
        updateSliderPosition(e.clientX);
    });
    
    document.addEventListener('mouseup', function() {
        isDragging = false;
    });
    
    // Touch events
    slider.addEventListener('touchstart', function(e) {
        isDragging = true;
        updateSliderPosition(e.touches[0].clientX);
    });
    
    document.addEventListener('touchmove', function(e) {
        if (!isDragging) return;
        updateSliderPosition(e.touches[0].clientX);
    });
    
    document.addEventListener('touchend', function() {
        isDragging = false;
    });
}

// Initialize slider on page load
document.addEventListener('DOMContentLoaded', initBeforeAfterSlider);
// Also try to init immediately in case DOM is already ready
if (document.readyState !== 'loading') {
    initBeforeAfterSlider();
}

// =====================================================
// CLOUDFLARE TURNSTILE FUNCTIONS
// =====================================================

// Track Turnstile completion status
let turnstileStatus = {
    visualizer: false,
    price: false,
    quote: false
};

// Callback when visualizer Turnstile is completed
function onTurnstileVisualizer(token) {
    turnstileStatus.visualizer = true;
    const btn = document.getElementById('visualizerBtn');
    if (btn) {
        btn.disabled = false;
    }
}

// Callback when price Turnstile is completed
function onTurnstilePrice(token) {
    turnstileStatus.price = true;
    const btn = document.getElementById('getPriceBtn');
    if (btn) {
        btn.disabled = false;
    }
}

// Callback when quote Turnstile is completed
function onTurnstileQuote(token) {
    turnstileStatus.quote = true;
    // Recalculate quote to update button state
    if (typeof recalculateQuote === 'function') {
        recalculateQuote();
    }
}

// Open visualizer with captcha check
function openVisualizerWithCaptcha() {
    if (turnstileStatus.visualizer) {
        openVisualizer();
    } else {
        alert('Please complete the verification first.');
    }
}

// Get delivery price with captcha check
function getDeliveryPriceWithCaptcha() {
    if (turnstileStatus.price) {
        getDeliveryPrice();
    } else {
        alert('Please complete the verification first.');
    }
}

// Add to cart with captcha check
function addToCartWithCaptcha() {
    if (turnstileStatus.quote) {
        addToCart();
    } else {
        alert('Please complete the verification first.');
    }
}

// =====================================================
// SCROLL NAVIGATION ARROWS
// =====================================================
document.addEventListener('DOMContentLoaded', function() {
    const scrollUpBtn = document.getElementById('scrollUpBtn');
    const scrollDownBtn = document.getElementById('scrollDownBtn');
    
    if (!scrollUpBtn || !scrollDownBtn) return;
    
    // Get all main sections for scrolling
    const sections = document.querySelectorAll('section');
    
    // Show/hide arrows based on scroll position
    function updateArrowVisibility() {
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        // Show up arrow when scrolled down more than 300px
        if (scrollY > 300) {
            scrollUpBtn.classList.add('visible');
        } else {
            scrollUpBtn.classList.remove('visible');
        }
        
        // Hide down arrow when near bottom of page
        if (scrollY + windowHeight >= documentHeight - 200) {
            scrollDownBtn.classList.add('hidden');
        } else {
            scrollDownBtn.classList.remove('hidden');
        }
    }
    
    // Scroll up - go to top
    scrollUpBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Scroll down - go to next section
    scrollDownBtn.addEventListener('click', function() {
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;
        
        // Find the next section to scroll to
        let nextSection = null;
        for (let i = 0; i < sections.length; i++) {
            const sectionTop = sections[i].offsetTop;
            if (sectionTop > scrollY + 100) {
                nextSection = sections[i];
                break;
            }
        }
        
        if (nextSection) {
            nextSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            // If no next section, scroll down by viewport height
            window.scrollBy({
                top: windowHeight * 0.8,
                behavior: 'smooth'
            });
        }
    });
    
    // Listen for scroll events
    window.addEventListener('scroll', updateArrowVisibility);
    
    // Initial check
    updateArrowVisibility();
});

// =====================================================
// AUTO-OPEN QUOTE MODAL IF RETURNING FROM CONTRACTORS PAGE
// =====================================================
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const openQuote = urlParams.get('openQuote');
    const materialParam = urlParams.get('material');
    
    if (openQuote === 'true') {
        // Small delay to ensure everything is loaded
        setTimeout(function() {
            if (typeof openCalculatorModal === 'function') {
                openCalculatorModal();
                
                // Pre-select material if provided in URL
                if (materialParam) {
                    const quoteProductSelect = document.getElementById('quoteProduct');
                    if (quoteProductSelect) {
                        // Try to find and select the matching option
                        for (let i = 0; i < quoteProductSelect.options.length; i++) {
                            if (quoteProductSelect.options[i].value === materialParam) {
                                quoteProductSelect.value = materialParam;
                                // Trigger change event to update any dependent UI
                                quoteProductSelect.dispatchEvent(new Event('change'));
                                break;
                            }
                        }
                    }
                }
            }
        }, 300);
        
        // Clean up the URL without refreshing the page
        if (window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
});

// ================================
// Self-Hosted Video Player
// ================================

let promoVideo = null;
let videoOverlay = null;
let videoControls = null;
let videoProgress = null;
let videoTime = null;
let playPauseBtn = null;

document.addEventListener('DOMContentLoaded', function() {
    promoVideo = document.getElementById('promoVideo');
    videoOverlay = document.getElementById('videoOverlay');
    videoControls = document.getElementById('videoControls');
    videoProgress = document.getElementById('videoProgress');
    videoTime = document.getElementById('videoTime');
    playPauseBtn = document.getElementById('playPauseBtn');
    
    if (promoVideo) {
        // Update progress bar and time
        promoVideo.addEventListener('timeupdate', updateVideoProgress);
        promoVideo.addEventListener('loadedmetadata', updateVideoTime);
        promoVideo.addEventListener('ended', onVideoEnded);
        promoVideo.addEventListener('play', onVideoPlay);
        promoVideo.addEventListener('pause', onVideoPause);
    }
});

function togglePromoVideo() {
    if (!promoVideo) return;
    
    if (promoVideo.paused) {
        promoVideo.play();
    } else {
        promoVideo.pause();
    }
}

function onVideoPlay() {
    trackVideoPlay(); // GA4 tracking
    if (videoOverlay) videoOverlay.classList.add('hidden');
    if (playPauseBtn) {
        playPauseBtn.querySelector('.play-icon').style.display = 'none';
        playPauseBtn.querySelector('.pause-icon').style.display = 'inline';
    }
    promoVideo.parentElement.classList.add('playing');
}

function onVideoPause() {
    if (playPauseBtn) {
        playPauseBtn.querySelector('.play-icon').style.display = 'inline';
        playPauseBtn.querySelector('.pause-icon').style.display = 'none';
    }
}

function onVideoEnded() {
    trackVideoComplete(); // GA4 tracking
    if (videoOverlay) videoOverlay.classList.remove('hidden');
    promoVideo.parentElement.classList.remove('playing');
    if (playPauseBtn) {
        playPauseBtn.querySelector('.play-icon').style.display = 'inline';
        playPauseBtn.querySelector('.pause-icon').style.display = 'none';
    }
}

function updateVideoProgress() {
    if (!promoVideo || !videoProgress) return;
    const percent = (promoVideo.currentTime / promoVideo.duration) * 100;
    videoProgress.style.width = percent + '%';
    updateVideoTime();
}

function updateVideoTime() {
    if (!promoVideo || !videoTime) return;
    const current = formatTime(promoVideo.currentTime);
    const duration = formatTime(promoVideo.duration);
    videoTime.textContent = current + ' / ' + duration;
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
}

function seekVideo(event) {
    if (!promoVideo) return;
    const progressContainer = event.currentTarget;
    const rect = progressContainer.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    promoVideo.currentTime = percent * promoVideo.duration;
}

function toggleMute() {
    if (!promoVideo) return;
    promoVideo.muted = !promoVideo.muted;
    const muteIcon = document.getElementById('muteIcon');
    if (muteIcon) {
        muteIcon.textContent = promoVideo.muted ? '🔇' : '🔊';
    }
}

function toggleFullscreen() {
    const container = document.querySelector('.self-hosted-video-container');
    if (!container) return;
    
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        container.requestFullscreen();
    }
}

// ================================
// Google Analytics Event Tracking
// ================================

function trackEvent(eventName, eventParams = {}) {
    eventParams.site_version = typeof SITE_VERSION !== 'undefined' ? SITE_VERSION : 'unknown';
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, eventParams);
    }
}

function trackCalculatorOpen(source) {
    trackEvent('calculator_opened', {
        event_category: 'engagement',
        trigger_source: source || 'unknown'
    });
}

function trackQuoteViewed(material, quantity, price, zip) {
    trackEvent('quote_viewed', {
        event_category: 'conversion',
        material: material,
        quantity: quantity,
        value: price,
        zip_code: zip
    });
}

function trackAddToCart(material, quantity, price) {
    trackEvent('add_to_cart', {
        event_category: 'ecommerce',
        currency: 'USD',
        value: price,
        items: [{ item_name: material, quantity: quantity, price: price }]
    });
}

function trackPhoneClick(location) {
    trackEvent('phone_click', {
        event_category: 'conversion',
        click_location: location || 'unknown'
    });
}

function trackTextClick(location) {
    trackEvent('text_click', {
        event_category: 'conversion',
        click_location: location || 'unknown'
    });
}

function trackVideoPlay() {
    trackEvent('video_play', {
        event_category: 'engagement',
        event_label: 'How It Works Video'
    });
}

function trackVideoComplete() {
    trackEvent('video_complete', {
        event_category: 'engagement',
        event_label: 'How It Works Video'
    });
}

// Section view tracking
document.addEventListener('DOMContentLoaded', function() {
    const howItWorks = document.getElementById('how-it-works');
    if (howItWorks) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    trackEvent('section_view', { section_name: 'How It Works' });
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        observer.observe(howItWorks);
    }
});
