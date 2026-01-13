// =====================================================
// TEXAS GOT ROCKS - CHECKOUT INTEGRATION UPDATE
// Add this to your main.js OR replace the existing functions
// Integrates with pending-orders API and delivery scheduler
// =====================================================

// =====================================================
// UPDATED: processPayment() - Creates pending order with delivery slot
// =====================================================
async function processPayment() {
    if (cart.length === 0) return;
    
    // Validate delivery selection
    if (!window.selectedDelivery || !window.selectedDelivery.date || !window.selectedDelivery.slotId) {
        showToast('error', 'Missing Delivery', 'Please select a delivery date and time');
        goToDeliveryStep();
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + item.total, 0);
    const precisionFee = window.selectedDelivery.precisionFee || 0;
    const grandTotal = total + precisionFee;
    
    // Show loading state
    const payBtn = document.querySelector('#checkoutStep3 .btn-primary');
    const originalBtnText = payBtn ? payBtn.textContent : '';
    if (payBtn) {
        payBtn.disabled = true;
        payBtn.textContent = '⏳ Processing...';
    }
    
    try {
        // Build order items from cart
        const items = cart.map(item => ({
            productId: item.productId,
            productName: item.product,
            quantity: item.quantity,
            unit: 'yards',
            tonsEquivalent: item.tons,
            unitPrice: item.pricePerTon,
            lineTotal: item.materialWithMargin
        }));
        
        // Calculate totals
        const materialSubtotal = cart.reduce((sum, item) => sum + item.materialWithMargin, 0);
        const salesTax = cart.reduce((sum, item) => sum + item.salesTax, 0);
        const serviceFee = cart.reduce((sum, item) => sum + item.serviceFee, 0);
        
        // Build pending order payload
        const orderPayload = {
            customer: {
                name: customerInfo.name,
                email: customerInfo.email,
                phone: customerInfo.phone,
                address: customerInfo.address,
                city: customerInfo.city,
                zip: customerInfo.zip
            },
            items: items,
            delivery: {
                date: window.selectedDelivery.date,
                slotId: window.selectedDelivery.slotId,
                slotLabel: window.selectedDelivery.slotLabel || '',
                window: window.selectedDelivery.window || '',
                precisionWindowId: window.selectedDelivery.precisionWindowId || null,
                precisionFee: precisionFee,
                address: customerInfo.address + ', ' + customerInfo.city + ', TX ' + customerInfo.zip,
                zip: customerInfo.zip,
                distanceMiles: cart[0]?.distance || null,
                instructions: null
            },
            truck: {
                type: cart[0]?.tons > 15 ? 'end-dump' : 'tandem'
            },
            pricing: {
                materialSubtotal: materialSubtotal,
                deliveryFee: 0, // FREE delivery
                precisionDeliveryFee: precisionFee,
                margin: cart[0]?.margin || 0.20,
                subtotal: materialSubtotal + precisionFee,
                tax: salesTax,
                serviceFee: serviceFee,
                total: grandTotal
            },
            source: 'website'
        };
        
        // Create pending order via API
        const response = await fetch('/.netlify/functions/pending-orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderPayload)
        });
        
        const result = await response.json();
        
        if (!response.ok || result.error) {
            throw new Error(result.error || result.details?.join(', ') || 'Failed to create order');
        }
        
        // Success! Close modal and show confirmation
        document.getElementById('checkoutModal').classList.remove('active');
        
        // Format delivery date for display
        const deliveryDate = new Date(window.selectedDelivery.date + 'T12:00:00');
        const deliveryDateStr = deliveryDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
        });
        
        showToast('success', 'Order Created!', 
            `Order ${result.orderId} - $${grandTotal.toFixed(2)}`);
        
        // Show detailed confirmation
        let orderDetails = `🎉 ORDER CONFIRMED!\n\n`;
        orderDetails += `Order ID: ${result.orderId}\n\n`;
        orderDetails += `📦 ITEMS:\n`;
        cart.forEach((item, index) => {
            orderDetails += `  • ${item.quantity} yd³ ${item.product} ($${item.total.toFixed(2)})\n`;
        });
        orderDetails += `\n📅 DELIVERY:\n`;
        orderDetails += `  Date: ${deliveryDateStr}\n`;
        orderDetails += `  Time: ${window.selectedDelivery.slotLabel} (${window.selectedDelivery.window})\n`;
        if (window.selectedDelivery.precisionDelivery) {
            orderDetails += `  ⚡ Precision Delivery: +$${precisionFee}\n`;
        }
        orderDetails += `  🚚 Delivery: FREE\n`;
        orderDetails += `\n📍 DELIVER TO:\n`;
        orderDetails += `  ${customerInfo.name}\n`;
        orderDetails += `  ${customerInfo.address}\n`;
        orderDetails += `  ${customerInfo.city}, TX ${customerInfo.zip}\n`;
        orderDetails += `\n💰 TOTAL: $${grandTotal.toFixed(2)}\n\n`;
        orderDetails += `We'll send a confirmation email to ${customerInfo.email} with payment instructions.`;
        
        alert(orderDetails);
        
        // Clear cart and reset
        cart = [];
        window.selectedDelivery = null;
        updateCartCount();
        updateCartDrawer();
        
        // Track conversion (if analytics enabled)
        if (typeof trackEvent === 'function') {
            trackEvent('purchase', {
                transaction_id: result.orderId,
                value: grandTotal,
                currency: 'USD',
                items: items.map(item => ({
                    item_name: item.productName,
                    quantity: item.quantity,
                    price: item.lineTotal
                }))
            });
        }
        
    } catch (error) {
        console.error('Order creation failed:', error);
        showToast('error', 'Order Failed', error.message || 'Please try again or call us.');
        
        // Re-enable button
        if (payBtn) {
            payBtn.disabled = false;
            payBtn.textContent = originalBtnText;
        }
    }
}

// =====================================================
// UPDATED: goToPaymentStep() - Includes delivery summary
// =====================================================
function goToPaymentStep() {
    // Validate delivery selection
    if (!window.selectedDelivery || !window.selectedDelivery.date || !window.selectedDelivery.slotId) {
        showToast('error', 'Select Delivery', 'Please select a delivery date and time');
        return;
    }
    
    // Get customer info from form
    const customerInfo = {
        name: document.getElementById('checkoutName')?.value || '',
        email: document.getElementById('checkoutEmail')?.value || '',
        phone: document.getElementById('checkoutPhone')?.value || '',
        address: document.getElementById('checkoutAddress')?.value || '',
        city: document.getElementById('checkoutCity')?.value || '',
        zip: document.getElementById('checkoutZipConfirm')?.value || ''
    };
    
    // Update cart items with delivery dates (for legacy support)
    cart.forEach(function(item, index) {
        item.deliveryDate = window.selectedDelivery.date;
    });
    
    // Update step indicators
    document.getElementById('step2indicator').classList.remove('active');
    document.getElementById('step2indicator').classList.add('completed');
    document.getElementById('step3indicator').classList.add('active');
    
    // Build order summary with delivery info
    const delivery = window.selectedDelivery;
    const precisionFee = delivery.precisionFee || 0;
    
    // Format delivery date
    const deliveryDate = new Date(delivery.date + 'T12:00:00');
    const dateStr = deliveryDate.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
    });
    
    let subtotal = 0;
    let summaryHtml = `
        <div class="checkout-customer-summary">
            <h4>📍 Delivery To:</h4>
            <p>
                <strong>${customerInfo.name}</strong><br>
                ${customerInfo.address}<br>
                ${customerInfo.city}, TX ${customerInfo.zip}<br>
                📞 ${customerInfo.phone}<br>
                ✉️ ${customerInfo.email}
            </p>
        </div>
        
        <div class="checkout-delivery-summary">
            <h4>📅 Delivery Schedule:</h4>
            <div class="delivery-schedule-box">
                <div class="delivery-date-display">
                    <strong>${dateStr}</strong>
                    <span>${delivery.slotLabel} (${delivery.window})</span>
                </div>
                ${delivery.precisionDelivery ? `
                    <div class="precision-delivery-display">
                        <span>⚡ Precision Delivery</span>
                        <span>+$${precisionFee.toFixed(2)}</span>
                    </div>
                ` : ''}
                <div class="free-delivery-display">
                    <span>🚚 Delivery</span>
                    <span class="free-text">FREE</span>
                </div>
            </div>
        </div>
        
        <div class="checkout-items-summary">
            <h4>📦 Order Items:</h4>
    `;
    
    cart.forEach(function(item) {
        subtotal += item.total;
        summaryHtml += `
            <div class="checkout-order-item">
                <div>
                    <strong>${item.product}</strong><br>
                    <small>${item.quantity} yd³ (${item.tons.toFixed(1)} tons)</small>
                </div>
                <strong>$${item.total.toFixed(2)}</strong>
            </div>
        `;
    });
    
    const grandTotal = subtotal + precisionFee;
    
    summaryHtml += `
        </div>
        <div style="margin-top: 20px; padding-top: 16px; border-top: 2px solid #2C2416;">
            <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px;">
                <span>Subtotal</span>
                <span>$${subtotal.toFixed(2)}</span>
            </div>
            ${precisionFee > 0 ? `
                <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px;">
                    <span>Precision Delivery</span>
                    <span>$${precisionFee.toFixed(2)}</span>
                </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px;">
                <span>Delivery</span>
                <span style="color: #4A7C59; font-weight: 600;">FREE</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 14px 0 0 0; margin-top: 10px; border-top: 1px solid #ddd; font-size: 20px; font-weight: 700;">
                <span>Total</span>
                <span>$${grandTotal.toFixed(2)}</span>
            </div>
        </div>
    `;
    
    document.getElementById('checkoutOrderSummary').innerHTML = summaryHtml;
    showCheckoutStep(3);
}

// =====================================================
// ADDITIONAL CSS for checkout summary (inject into page)
// =====================================================
function injectCheckoutStyles() {
    if (document.getElementById('checkout-integration-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'checkout-integration-styles';
    styles.textContent = `
        .checkout-delivery-summary {
            margin: 16px 0;
            padding: 16px;
            background: #f9f7f4;
            border-radius: 8px;
        }
        
        .checkout-delivery-summary h4 {
            margin: 0 0 12px 0;
            font-size: 14px;
            color: #666;
        }
        
        .delivery-schedule-box {
            background: white;
            border-radius: 6px;
            padding: 12px;
        }
        
        .delivery-date-display {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 8px;
            border-bottom: 1px solid #eee;
        }
        
        .delivery-date-display strong {
            font-size: 16px;
        }
        
        .delivery-date-display span {
            font-size: 13px;
            color: #666;
        }
        
        .precision-delivery-display {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
            font-size: 13px;
        }
        
        .precision-delivery-display span:first-child {
            color: #B8860B;
            font-weight: 500;
        }
        
        .free-delivery-display {
            display: flex;
            justify-content: space-between;
            padding-top: 8px;
            font-size: 13px;
        }
        
        .free-text {
            color: #4A7C59;
            font-weight: 600;
        }
        
        .checkout-items-summary h4 {
            margin: 16px 0 12px 0;
            font-size: 14px;
            color: #666;
        }
        
        .checkout-order-total {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 2px solid #2C2416;
        }
        
        #checkoutOrderSummary .total-line,
        .checkout-order-total .total-line {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center;
            padding: 8px 0;
            font-size: 14px;
            width: 100%;
        }
        
        #checkoutOrderSummary .total-line span,
        .checkout-order-total .total-line span {
            display: inline-block;
        }
        
        #checkoutOrderSummary .total-line.grand-total,
        .checkout-order-total .total-line.grand-total {
            font-size: 18px;
            font-weight: 700;
            padding-top: 12px;
            margin-top: 8px;
            border-top: 1px solid #ddd;
        }
        
        .checkout-order-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
    `;
    
    document.head.appendChild(styles);
}

// Inject styles on load
document.addEventListener('DOMContentLoaded', injectCheckoutStyles);
if (document.readyState !== 'loading') {
    injectCheckoutStyles();
}
