// /js/square-checkout.js
// Texas Got Rocks - Square Web Payments SDK Integration
// Connects to: /.netlify/functions/create-payment
// Updated: Added Apple Pay support

(function() {
    'use strict';

    // Square Configuration (Sandbox)
    // TODO: Replace with correct Application ID from Square Dashboard
    const SQUARE_APP_ID = 'sq0idb-QAzFEmXgssJhWXlroCT99Q';
    const SQUARE_LOCATION_ID = 'LPB7SAE3PG6A0';

    // State
    let payments = null;
    let card = null;
    let ach = null;
    let applePay = null;
    let applePayRequest = null;
    let isInitialized = false;
    let isApplePayAvailable = false;
    let currentPaymentMethod = 'card';

    // Initialize Square Payments
    async function initializeSquare() {
        if (isInitialized) return true;

        if (!window.Square) {
            console.error('Square SDK not loaded');
            return false;
        }

        try {
            // FIXED: Pass object instead of separate parameters (new SDK requirement)
            payments = window.Square.payments({
                applicationId: SQUARE_APP_ID,
                locationId: SQUARE_LOCATION_ID
            });
            isInitialized = true;
            console.log('Square Payments initialized successfully');
            
            // Check Apple Pay availability after initialization
            checkApplePayAvailability();
            
            return true;
        } catch (error) {
            console.error('Failed to initialize Square:', error);
            return false;
        }
    }

    // Check if Apple Pay is available on this device
    async function checkApplePayAvailability() {
        if (!payments) return false;

        try {
            // Create a minimal payment request to check availability
            const paymentRequest = payments.paymentRequest({
                countryCode: 'US',
                currencyCode: 'USD',
                total: {
                    amount: '1.00',
                    label: 'Texas Got Rocks'
                }
            });

            applePay = await payments.applePay(paymentRequest);
            
            if (applePay) {
                isApplePayAvailable = true;
                console.log('Apple Pay is available on this device');
                showApplePayOption();
                return true;
            }
        } catch (error) {
            // Apple Pay not available - this is normal on non-Apple devices
            console.log('Apple Pay not available:', error.message);
            isApplePayAvailable = false;
        }
        return false;
    }

    // Show Apple Pay option in payment methods
    function showApplePayOption() {
        const applePayOption = document.getElementById('applePayOption');
        if (applePayOption) {
            applePayOption.style.display = 'block';
        }
    }

    // Initialize Apple Pay button with actual order amount
    async function initializeApplePayButton(totalAmount) {
        if (!payments || !isApplePayAvailable) {
            console.log('Cannot initialize Apple Pay button - not available');
            return null;
        }

        try {
            // Create payment request with actual order total
            applePayRequest = payments.paymentRequest({
                countryCode: 'US',
                currencyCode: 'USD',
                total: {
                    amount: totalAmount.toFixed(2),
                    label: 'Texas Got Rocks - Material Delivery'
                },
                requestBillingContact: true,
                requestShippingContact: false
            });

            // Re-initialize Apple Pay with new request
            applePay = await payments.applePay(applePayRequest);

            // Attach to button container
            const buttonContainer = document.getElementById('apple-pay-button');
            if (buttonContainer) {
                await applePay.attach('#apple-pay-button');
                console.log('Apple Pay button attached');
            }

            return applePay;
        } catch (error) {
            console.error('Failed to initialize Apple Pay button:', error);
            return null;
        }
    }

    // Tokenize Apple Pay
    async function tokenizeApplePay() {
        if (!applePay) {
            throw new Error('Apple Pay not initialized');
        }

        try {
            const result = await applePay.tokenize();

            if (result.status === 'OK') {
                console.log('Apple Pay tokenized successfully');
                return result.token;
            } else {
                let errorMessage = 'Apple Pay verification failed';
                if (result.errors && result.errors.length > 0) {
                    errorMessage = result.errors.map(e => e.message).join(', ');
                }
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Apple Pay tokenization error:', error);
            throw error;
        }
    }

    // Initialize Card Form
    async function initializeCard() {
        if (!payments) {
            const initialized = await initializeSquare();
            if (!initialized) return null;
        }

        try {
            // Destroy existing card instance if any
            if (card) {
                await card.destroy();
                card = null;
            }

            // Create card payment method
            card = await payments.card();

            // Attach to container
            const container = document.getElementById('square-card-container');
            if (container) {
                await card.attach('#square-card-container');
                console.log('Square Card form attached');
            }

            return card;
        } catch (error) {
            console.error('Failed to initialize card:', error);
            return null;
        }
    }

    // Initialize ACH (Bank Account)
    async function initializeACH() {
        if (!payments) {
            const initialized = await initializeSquare();
            if (!initialized) return null;
        }

        try {
            // ACH is handled differently - uses a redirect flow
            // For now, we'll use the ACH payment method
            ach = await payments.ach();
            console.log('Square ACH initialized');
            return ach;
        } catch (error) {
            console.error('Failed to initialize ACH:', error);
            return null;
        }
    }

    // Tokenize Card
    async function tokenizeCard() {
        if (!card) {
            throw new Error('Card form not initialized');
        }

        try {
            const result = await card.tokenize();

            if (result.status === 'OK') {
                console.log('Card tokenized successfully');
                return result.token;
            } else {
                let errorMessage = 'Card verification failed';
                if (result.errors && result.errors.length > 0) {
                    errorMessage = result.errors.map(e => e.message).join(', ');
                }
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Tokenization error:', error);
            throw error;
        }
    }

    // Tokenize ACH
    async function tokenizeACH(accountHolderName) {
        if (!ach) {
            await initializeACH();
        }

        try {
            const result = await ach.tokenize({
                accountHolderName: accountHolderName
            });

            if (result.status === 'OK') {
                console.log('ACH tokenized successfully');
                return result.token;
            } else {
                let errorMessage = 'Bank account verification failed';
                if (result.errors && result.errors.length > 0) {
                    errorMessage = result.errors.map(e => e.message).join(', ');
                }
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('ACH tokenization error:', error);
            throw error;
        }
    }

    // Process Payment
    async function processPayment(paymentMethod, orderData) {
        const payButton = document.getElementById('squarePayButton');
        const originalButtonText = payButton ? payButton.innerHTML : 'Pay Now';

        try {
            // Show loading state
            if (payButton) {
                payButton.disabled = true;
                payButton.innerHTML = '<span class="spinner"></span> Processing...';
            }

            // Get token based on payment method
            let sourceId;
            if (paymentMethod === 'card') {
                sourceId = await tokenizeCard();
            } else if (paymentMethod === 'ach') {
                sourceId = await tokenizeACH(orderData.customer.name);
            } else if (paymentMethod === 'apple-pay') {
                sourceId = await tokenizeApplePay();
            } else {
                throw new Error('Invalid payment method');
            }

            // Build payload for create-payment function
            const payload = {
                sourceId: sourceId,
                paymentMethod: paymentMethod,
                customer: {
                    name: orderData.customer.name,
                    email: orderData.customer.email,
                    phone: orderData.customer.phone || null,
                    address: orderData.customer.address,
                    city: orderData.customer.city,
                    zip: orderData.customer.zip
                },
                items: orderData.items.map(item => ({
                    product: item.product,
                    productId: item.productId,
                    quantity: item.quantity,
                    tons: item.tons,
                    pricePerTon: item.pricePerTon,
                    total: item.total
                })),
                totals: {
                    subtotal: orderData.totals.subtotal,
                    salesTax: orderData.totals.salesTax,
                    serviceFee: orderData.totals.serviceFee,
                    total: orderData.totals.total
                },
                delivery: {
                    scheduledDate: orderData.delivery.scheduledDate,
                    zone: orderData.delivery.zone || 1,
                    distance: orderData.delivery.distance || 0
                }
            };

            console.log('Sending payment to server:', { 
                paymentMethod, 
                total: payload.totals.total 
            });

            // Call Netlify function
            const response = await fetch('/.netlify/functions/create-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Payment failed');
            }

            console.log('Payment successful:', result);

            // Show success
            showPaymentSuccess(result, paymentMethod);

            return result;

        } catch (error) {
            console.error('Payment error:', error);
            showPaymentError(error.message);
            throw error;

        } finally {
            // Reset button
            if (payButton) {
                payButton.disabled = false;
                payButton.innerHTML = originalButtonText;
            }
        }
    }

    // Show Payment Success
    function showPaymentSuccess(result, paymentMethod) {
        // Close checkout modal
        const checkoutModal = document.getElementById('checkoutModal');
        if (checkoutModal) {
            checkoutModal.classList.remove('active');
        }

        // Clear cart
        if (typeof cart !== 'undefined') {
            cart.length = 0;
        }
        if (typeof updateCartCount === 'function') {
            updateCartCount();
        }
        if (typeof updateCartDrawer === 'function') {
            updateCartDrawer();
        }

        // Build success message
        let message = '';
        if (paymentMethod === 'ach') {
            message = `Order ${result.orderNumber} received!\n\n` +
                `Your bank payment will clear in 2-3 business days.\n` +
                `We'll email you when it's confirmed and schedule your delivery.\n\n` +
                `Questions? Call (936) 259-2887`;
        } else if (paymentMethod === 'apple-pay') {
            message = `Order ${result.orderNumber} confirmed!\n\n` +
                `Total: $${result.totals?.total?.toFixed(2) || 'N/A'}\n` +
                `Paid with Apple Pay\n\n` +
                `We'll send confirmation and tracking details via email/text.\n\n` +
                `Questions? Call (936) 259-2887`;
        } else {
            message = `Order ${result.orderNumber} confirmed!\n\n` +
                `Total: $${result.totals?.total?.toFixed(2) || 'N/A'}\n` +
                `Payment ID: ${result.paymentId}\n\n` +
                `We'll send confirmation and tracking details via email/text.\n\n` +
                `Questions? Call (936) 259-2887`;
        }

        // Show toast notification
        if (typeof showToast === 'function') {
            const toastMessage = paymentMethod === 'ach' 
                ? 'Bank payment processing - we\'ll confirm when cleared'
                : paymentMethod === 'apple-pay'
                ? 'Apple Pay successful - check your email'
                : 'Payment successful - check your email for confirmation';
            showToast('success', 'Order Placed!', toastMessage);
        }

        // Show alert with details
        alert(message);

        // Track conversion
        if (typeof gtag === 'function') {
            gtag('event', 'purchase', {
                transaction_id: result.orderNumber,
                value: result.totals?.total || 0,
                currency: 'USD',
                payment_type: paymentMethod
            });
        }
    }

    // Show Payment Error
    function showPaymentError(message) {
        // Show toast notification
        if (typeof showToast === 'function') {
            showToast('error', 'Payment Failed', message);
        } else {
            alert('Payment failed: ' + message);
        }

        // Track error
        if (typeof gtag === 'function') {
            gtag('event', 'exception', {
                description: 'Payment error: ' + message,
                fatal: false
            });
        }
    }

    // Handle Payment Method Change
    function onPaymentMethodChange(method) {
        currentPaymentMethod = method;

        const cardForm = document.getElementById('cardPaymentForm');
        const achForm = document.getElementById('achPaymentForm');
        const achNotice = document.getElementById('achNotice');
        const applePayContainer = document.getElementById('applePayButtonContainer');
        const payButton = document.getElementById('squarePayButton');

        // Hide all payment forms first
        if (cardForm) cardForm.style.display = 'none';
        if (achForm) achForm.style.display = 'none';
        if (achNotice) achNotice.style.display = 'none';
        if (applePayContainer) applePayContainer.style.display = 'none';
        if (payButton) payButton.style.display = 'block';

        if (method === 'card') {
            if (cardForm) cardForm.style.display = 'block';

            // Initialize card if not already
            if (!card) {
                initializeCard();
            }
        } else if (method === 'ach') {
            if (achForm) achForm.style.display = 'block';
            if (achNotice) achNotice.style.display = 'block';
        } else if (method === 'apple-pay') {
            if (applePayContainer) applePayContainer.style.display = 'block';
            if (payButton) payButton.style.display = 'none';

            // Get cart total and initialize Apple Pay button
            const total = typeof cart !== 'undefined' 
                ? cart.reduce((sum, item) => sum + item.total, 0) 
                : 0;
            if (total > 0) {
                initializeApplePayButton(total);
            }
        }
    }

    // Initialize on Step 3 (Payment)
    function initializeOnPaymentStep() {
        // Initialize card form when payment step is shown
        setTimeout(() => {
            initializeCard();
        }, 100);
    }

    // Auto-initialize when checkout step 3 becomes visible
    const originalGoToPaymentStep = window.goToPaymentStep;
    if (typeof originalGoToPaymentStep === 'function') {
        window.goToPaymentStep = function() {
            originalGoToPaymentStep.apply(this, arguments);
            initializeOnPaymentStep();
        };
    }

    // Expose public API
    window.SquareCheckout = {
        initialize: initializeSquare,
        initializeCard: initializeCard,
        initializeACH: initializeACH,
        initializeApplePay: initializeApplePayButton,
        checkApplePayAvailability: checkApplePayAvailability,
        isApplePayAvailable: () => isApplePayAvailable,
        processPayment: processPayment,
        onPaymentMethodChange: onPaymentMethodChange,
        getCurrentPaymentMethod: () => currentPaymentMethod
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSquare);
    } else {
        initializeSquare();
    }

    console.log('Square Checkout module loaded (with Apple Pay support)');

})();
