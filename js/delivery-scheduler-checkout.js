/**
 * Texas Got Rocks - Delivery Scheduler Integration
 * Add this to your main.js or include as separate script
 */

// ============================================
// DELIVERY SCHEDULER STATE
// ============================================
let deliverySchedulerData = {
  availabilityData: null,
  selectedDateDetails: null,
  selectedDate: null,
  selectedSlot: null,
  selectedPrecisionWindow: null,
  currentMonth: new Date(),
  customerLocation: null,
  isLoaded: false
};

const SCHEDULE_API = '/.netlify/functions/schedule';
const PRECISION_DELIVERY_FEE = 50;

// ============================================
// INITIALIZE SCHEDULER IN CHECKOUT STEP 2
// ============================================
async function initDeliveryScheduler() {
  // Get customer ZIP from checkout form or cart
  const customerZip = document.getElementById('checkoutZipConfirm')?.value || 
                      window.cartData?.zip || 
                      '77301';
  
  // Reset state
  deliverySchedulerData = {
    ...deliverySchedulerData,
    selectedDate: null,
    selectedSlot: null,
    selectedPrecisionWindow: null,
    selectedDateDetails: null,
    currentMonth: new Date(),
    isLoaded: false
  };
  
  // Render the scheduler UI
  renderDeliverySchedulerUI();
  
  // Fetch availability
  await fetchDeliveryAvailability();
}

// ============================================
// FETCH AVAILABILITY FROM API
// ============================================
async function fetchDeliveryAvailability() {
  const container = document.getElementById('deliverySchedulerContainer');
  if (!container) return;
  
  try {
    const params = new URLSearchParams({ range: 14 });
    
    // Add customer location if available for same-day eligibility
    if (deliverySchedulerData.customerLocation) {
      params.append('customerLat', deliverySchedulerData.customerLocation.lat);
      params.append('customerLng', deliverySchedulerData.customerLocation.lng);
    }
    
    const response = await fetch(`${SCHEDULE_API}?${params}`);
    deliverySchedulerData.availabilityData = await response.json();
    deliverySchedulerData.isLoaded = true;
    
    renderDeliveryCalendar();
  } catch (error) {
    console.error('Failed to fetch delivery availability:', error);
    container.innerHTML = `
      <div class="scheduler-error">
        <p>Unable to load delivery dates. Please refresh or call us at (936) 555-1234.</p>
        <button class="btn btn-secondary" onclick="fetchDeliveryAvailability()">Try Again</button>
      </div>
    `;
  }
}

// ============================================
// RENDER SCHEDULER UI STRUCTURE
// ============================================
function renderDeliverySchedulerUI() {
  const step2Content = document.getElementById('checkoutStep2');
  if (!step2Content) return;
  
  step2Content.innerHTML = `
    <div class="delivery-scheduler-checkout">
      <div class="scheduler-intro">
        <h4>📅 Choose Your Delivery Date & Time</h4>
        <p>Select when you'd like your materials delivered</p>
      </div>
      
      <div id="deliverySchedulerContainer" class="delivery-scheduler-container">
        <div class="scheduler-loading">
          <div class="spinner"></div>
          <span>Loading available dates...</span>
        </div>
      </div>
      
      <div id="deliverySelectionSummary" class="delivery-selection-summary" style="display: none;">
        <div class="selection-header">
          <span class="selection-icon">✓</span>
          <span class="selection-label">Selected Delivery</span>
        </div>
        <div class="selection-details">
          <div class="selection-date" id="selectedDeliveryDate">-</div>
          <div class="selection-time" id="selectedDeliveryTime">-</div>
          <div class="selection-precision" id="selectedPrecision" style="display: none;">
            <span class="precision-badge">⚡ Precision Delivery</span>
            <span class="precision-window" id="selectedPrecisionWindow">-</span>
          </div>
        </div>
        <div class="selection-fee" id="deliveryFeeDisplay">
          <span>Delivery upgrade:</span>
          <span id="deliveryFeeAmount">$0</span>
        </div>
      </div>
      
      <div class="checkout-nav-buttons">
        <button class="btn btn-secondary" onclick="goToContactStep()">← Back</button>
        <button class="btn btn-primary" id="continueToPaymentBtn" onclick="goToPaymentStep()" disabled>
          Select a delivery date to continue
        </button>
      </div>
    </div>
  `;
}

// ============================================
// RENDER CALENDAR
// ============================================
function renderDeliveryCalendar() {
  const container = document.getElementById('deliverySchedulerContainer');
  if (!container || !deliverySchedulerData.availabilityData) return;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { currentMonth, availabilityData, selectedDate } = deliverySchedulerData;
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay();
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  
  // Build availability map
  const availabilityMap = {};
  if (availabilityData?.days) {
    availabilityData.days.forEach(day => {
      availabilityMap[day.date] = day;
    });
  }
  
  const canGoPrev = currentMonth > today;
  
  let html = `
    <div class="scheduler-grid">
      <div class="scheduler-calendar">
        <div class="calendar-header">
          <button class="calendar-nav-btn" onclick="prevSchedulerMonth()" ${!canGoPrev ? 'disabled' : ''}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <span class="calendar-month-label">${monthNames[month]} ${year}</span>
          <button class="calendar-nav-btn" onclick="nextSchedulerMonth()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
        
        <div class="calendar-weekdays">
          <div class="weekday">Sun</div>
          <div class="weekday">Mon</div>
          <div class="weekday">Tue</div>
          <div class="weekday">Wed</div>
          <div class="weekday">Thu</div>
          <div class="weekday">Fri</div>
          <div class="weekday">Sat</div>
        </div>
        
        <div class="calendar-days">
  `;
  
  // Empty cells for padding
  for (let i = 0; i < startPadding; i++) {
    html += `<div class="calendar-day empty"></div>`;
  }
  
  // Days of month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const dateStr = formatSchedulerDate(date);
    const isToday = date.getTime() === today.getTime();
    const isPast = date < today;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isSelected = selectedDate === dateStr;
    
    const dayData = availabilityMap[dateStr];
    const hasAvailability = dayData && dayData.availableSlots > 0;
    const isLimited = dayData && dayData.availableSlots <= 2 && dayData.availableSlots > 0;
    const isFull = dayData && dayData.fullyBooked;
    
    let classes = ['calendar-day'];
    if (isToday) classes.push('today');
    if (isPast) classes.push('disabled');
    if (isWeekend) classes.push('weekend', 'disabled');
    if (isSelected) classes.push('selected');
    if (!isPast && !isWeekend && hasAvailability) classes.push('available');
    if (!isPast && !isWeekend && isLimited) classes.push('limited');
    if (!isPast && !isWeekend && isFull) classes.push('full', 'disabled');
    
    const clickable = !isPast && !isWeekend && !isFull && hasAvailability;
    
    html += `<div class="${classes.join(' ')}" ${clickable ? `onclick="selectSchedulerDate('${dateStr}')"` : ''}>${day}</div>`;
  }
  
  html += `
        </div>
        
        <div style="display: flex; justify-content: center; gap: 32px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e0e0e0;">
          <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: #555;">
            <div style="width: 12px; height: 12px; border-radius: 50%; background: #4A7C59;"></div>
            <span>Available</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: #555;">
            <div style="width: 12px; height: 12px; border-radius: 50%; background: #E9A23B;"></div>
            <span>Limited</span>
          </div>
        </div>
      </div>
      
      <div class="scheduler-slots" id="schedulerSlotsContainer">
        <div class="slots-placeholder">
          <p>← Select a date to see available time slots</p>
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

// ============================================
// DATE SELECTION
// ============================================
async function selectSchedulerDate(dateStr) {
  deliverySchedulerData.selectedDate = dateStr;
  deliverySchedulerData.selectedSlot = null;
  deliverySchedulerData.selectedPrecisionWindow = null;
  
  renderDeliveryCalendar();
  
  // Fetch detailed slot info for this date
  try {
    const params = new URLSearchParams({ date: dateStr });
    if (deliverySchedulerData.customerLocation) {
      params.append('customerLat', deliverySchedulerData.customerLocation.lat);
      params.append('customerLng', deliverySchedulerData.customerLocation.lng);
    }
    
    const response = await fetch(`${SCHEDULE_API}?${params}`);
    deliverySchedulerData.selectedDateDetails = await response.json();
    
    renderSchedulerSlots();
  } catch (error) {
    console.error('Failed to fetch slot details:', error);
  }
  
  updateDeliverySelection();
}

// ============================================
// RENDER TIME SLOTS
// ============================================
function renderSchedulerSlots() {
  const container = document.getElementById('schedulerSlotsContainer');
  if (!container) return;
  
  const { selectedDateDetails, selectedSlot, selectedPrecisionWindow } = deliverySchedulerData;
  
  if (!selectedDateDetails) {
    container.innerHTML = `<div class="slots-placeholder"><p>← Select a date to see available time slots</p></div>`;
    return;
  }
  
  const slots = selectedDateDetails.slots || [];
  
  let html = `<div class="slots-list">`;
  
  // Same-day badge
  if (selectedDateDetails.isToday && selectedDateDetails.sameDayEligible) {
    html += `
      <div class="same-day-badge">
        <span>⚡</span> Same-Day Delivery Available
      </div>
    `;
  }
  
  slots.forEach(slot => {
    const isSelected = selectedSlot === slot.id;
    const isAvailable = slot.available;
    const spotsLeft = slot.capacity - slot.bookedCount;
    const isLimited = spotsLeft <= 2 && spotsLeft > 0;
    
    html += `
      <div class="slot-item ${isSelected ? 'selected' : ''} ${!isAvailable ? 'disabled' : ''}" 
           ${isAvailable ? `onclick="selectSchedulerSlot('${slot.id}')"` : ''}>
        <div class="slot-info">
          <div class="slot-name">${slot.label}</div>
          <div class="slot-time">${formatSchedulerTime(slot.start)} - ${formatSchedulerTime(slot.end)}</div>
        </div>
        <div class="slot-status ${isLimited ? 'limited' : ''}">
          ${isAvailable ? (isLimited ? `${spotsLeft} left` : 'Available') : 'Full'}
        </div>
      </div>
    `;
  });
  
  html += `</div>`;
  
  // Precision Delivery upsell
  if (selectedSlot) {
    const slot = slots.find(s => s.id === selectedSlot);
    const precisionWindows = slot?.precisionWindows || [];
    
    if (precisionWindows.length > 0) {
      html += `
        <div class="precision-upsell">
          <div class="precision-header">
            <div class="precision-title">
              <span>⚡</span> Precision Delivery
            </div>
            <span class="precision-price">+$${PRECISION_DELIVERY_FEE}</span>
          </div>
          <p class="precision-desc">Upgrade to a 1-hour window. Know exactly when we arrive.</p>
          <div class="precision-options">
      `;
      
      precisionWindows.forEach(window => {
        const isWindowSelected = selectedPrecisionWindow === window.id;
        html += `
          <div class="precision-option ${isWindowSelected ? 'selected' : ''}" 
               onclick="selectPrecisionWindow('${window.id}')">
            <span class="precision-time">${window.label}</span>
            <span class="precision-check">${isWindowSelected ? '✓' : ''}</span>
          </div>
        `;
      });
      
      html += `
          </div>
        </div>
      `;
    }
  }
  
  container.innerHTML = html;
}

// ============================================
// SLOT SELECTION
// ============================================
function selectSchedulerSlot(slotId) {
  deliverySchedulerData.selectedSlot = slotId;
  deliverySchedulerData.selectedPrecisionWindow = null;
  renderSchedulerSlots();
  updateDeliverySelection();
}

function selectPrecisionWindow(windowId) {
  if (deliverySchedulerData.selectedPrecisionWindow === windowId) {
    deliverySchedulerData.selectedPrecisionWindow = null;
  } else {
    deliverySchedulerData.selectedPrecisionWindow = windowId;
  }
  renderSchedulerSlots();
  updateDeliverySelection();
}

// ============================================
// UPDATE SELECTION SUMMARY
// ============================================
function updateDeliverySelection() {
  const summaryEl = document.getElementById('deliverySelectionSummary');
  const continueBtn = document.getElementById('continueToPaymentBtn');
  
  const { selectedDate, selectedSlot, selectedPrecisionWindow, selectedDateDetails } = deliverySchedulerData;
  
  if (!selectedDate || !selectedSlot) {
    if (summaryEl) summaryEl.style.display = 'none';
    if (continueBtn) {
      continueBtn.disabled = true;
      continueBtn.textContent = 'Select a delivery date to continue';
    }
    return;
  }
  
  // Show summary
  if (summaryEl) summaryEl.style.display = 'block';
  
  // Format date
  const dateObj = new Date(selectedDate + 'T12:00:00');
  const dateStr = dateObj.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Get slot info
  const slots = selectedDateDetails?.slots || [];
  const slot = slots.find(s => s.id === selectedSlot);
  
  document.getElementById('selectedDeliveryDate').textContent = dateStr;
  document.getElementById('selectedDeliveryTime').textContent = 
    slot ? `${slot.label} (${formatSchedulerTime(slot.start)} - ${formatSchedulerTime(slot.end)})` : '-';
  
  // Precision delivery
  const precisionEl = document.getElementById('selectedPrecision');
  const feeEl = document.getElementById('deliveryFeeAmount');
  
  if (selectedPrecisionWindow && slot?.precisionWindows) {
    const precisionWindow = slot.precisionWindows.find(w => w.id === selectedPrecisionWindow);
    if (precisionEl) {
      precisionEl.style.display = 'flex';
      document.getElementById('selectedPrecisionWindow').textContent = precisionWindow?.label || '';
    }
    if (feeEl) feeEl.textContent = `+$${PRECISION_DELIVERY_FEE}`;
  } else {
    if (precisionEl) precisionEl.style.display = 'none';
    if (feeEl) feeEl.textContent = '$0';
  }
  
  // Enable continue button
  if (continueBtn) {
    continueBtn.disabled = false;
    continueBtn.textContent = 'Continue to Payment →';
  }
  
  // Store in window for checkout to access
  window.selectedDelivery = {
    date: selectedDate,
    slotId: selectedSlot,
    slotLabel: slot?.label || '',
    window: slot ? `${formatSchedulerTime(slot.start)} - ${formatSchedulerTime(slot.end)}` : '',
    precisionWindowId: selectedPrecisionWindow,
    precisionDelivery: !!selectedPrecisionWindow,
    precisionFee: selectedPrecisionWindow ? PRECISION_DELIVERY_FEE : 0
  };
}

// ============================================
// NAVIGATION
// ============================================
function prevSchedulerMonth() {
  deliverySchedulerData.currentMonth.setMonth(
    deliverySchedulerData.currentMonth.getMonth() - 1
  );
  renderDeliveryCalendar();
}

function nextSchedulerMonth() {
  deliverySchedulerData.currentMonth.setMonth(
    deliverySchedulerData.currentMonth.getMonth() + 1
  );
  renderDeliveryCalendar();
}

// ============================================
// HELPERS
// ============================================
function formatSchedulerDate(date) {
  return date.toISOString().split('T')[0];
}

function formatSchedulerTime(time24) {
  const [hours, minutes] = time24.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

// ============================================
// INTEGRATE WITH EXISTING CHECKOUT
// ============================================

// Override the existing goToDeliveryStep function
const originalGoToDeliveryStep = typeof window.goToDeliveryStep === 'function' ? window.goToDeliveryStep : null;

window.goToDeliveryStep = function() {
  // Validate contact form first
  const name = document.getElementById('checkoutName')?.value;
  const email = document.getElementById('checkoutEmail')?.value;
  const phone = document.getElementById('checkoutPhone')?.value;
  const address = document.getElementById('checkoutAddress')?.value;
  const city = document.getElementById('checkoutCity')?.value;
  const zip = document.getElementById('checkoutZipConfirm')?.value;
  
  if (!name || !email || !phone || !address || !city || !zip) {
    showToast('Please fill in all required fields', 'error');
    return;
  }
  
  // Update step indicators
  document.getElementById('step1indicator')?.classList.remove('active');
  document.getElementById('step1indicator')?.classList.add('completed');
  document.getElementById('step2indicator')?.classList.add('active');
  
  // Hide step 1, show step 2
  document.getElementById('checkoutStep1').style.display = 'none';
  document.getElementById('checkoutStep2').style.display = 'block';
  document.getElementById('checkoutStep3').style.display = 'none';
  
  // Update modal title
  const modalTitle = document.getElementById('checkoutModalTitle');
  if (modalTitle) modalTitle.textContent = '📅 Select Delivery Date';
  
  // Initialize the delivery scheduler
  initDeliveryScheduler();
}

// Override goToPaymentStep to include delivery data
const originalGoToPaymentStep = typeof window.goToPaymentStep === 'function' ? window.goToPaymentStep : null;

window.goToPaymentStep = function() {
  // Validate delivery selection
  if (!window.selectedDelivery || !window.selectedDelivery.date || !window.selectedDelivery.slotId) {
    showToast('Please select a delivery date and time', 'error');
    return;
  }
  
  // Update step indicators
  document.getElementById('step2indicator')?.classList.remove('active');
  document.getElementById('step2indicator')?.classList.add('completed');
  document.getElementById('step3indicator')?.classList.add('active');
  
  // Hide step 2, show step 3
  document.getElementById('checkoutStep1').style.display = 'none';
  document.getElementById('checkoutStep2').style.display = 'none';
  document.getElementById('checkoutStep3').style.display = 'block';
  
  // Update modal title
  const modalTitle = document.getElementById('checkoutModalTitle');
  if (modalTitle) modalTitle.textContent = '💳 Payment';
  
  // Render order summary with delivery info
  renderOrderSummaryWithDelivery();
}

function renderOrderSummaryWithDelivery() {
  const summaryEl = document.getElementById('checkoutOrderSummary');
  if (!summaryEl) return;
  
  const delivery = window.selectedDelivery;
  const cart = window.cartItems || [];
  
  // Calculate totals
  let subtotal = cart.reduce((sum, item) => sum + (item.total || 0), 0);
  let precisionFee = delivery.precisionFee || 0;
  let total = subtotal + precisionFee;
  
  const dateObj = new Date(delivery.date + 'T12:00:00');
  const dateStr = dateObj.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
  
  summaryEl.innerHTML = `
    <div class="order-summary-section">
      <h4>Order Items</h4>
      ${cart.map(item => `
        <div class="summary-line-item">
          <span>${item.productName} (${item.quantity} yards)</span>
          <span>$${item.total?.toFixed(2) || '0.00'}</span>
        </div>
      `).join('')}
    </div>
    
    <div class="order-summary-section">
      <h4>Delivery</h4>
      <div class="delivery-summary-box">
        <div class="delivery-date-time">
          <strong>${dateStr}</strong>
          <span>${delivery.slotLabel} (${delivery.window})</span>
        </div>
        ${delivery.precisionDelivery ? `
          <div class="precision-summary">
            <span class="precision-badge-small">⚡ Precision Delivery</span>
            <span>+$${PRECISION_DELIVERY_FEE}</span>
          </div>
        ` : ''}
        <div class="delivery-free">
          <span>🚚 Delivery</span>
          <span class="free-label">FREE</span>
        </div>
      </div>
    </div>
    
    <div class="order-summary-totals">
      <div class="summary-line"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
      ${precisionFee > 0 ? `
        <div class="summary-line"><span>Precision Delivery</span><span>$${precisionFee.toFixed(2)}</span></div>
      ` : ''}
      <div class="summary-line"><span>Delivery</span><span class="free-text">FREE</span></div>
      <div class="summary-line total"><span>Total</span><span>$${total.toFixed(2)}</span></div>
    </div>
  `;
}

// ============================================
// CSS STYLES (inject into page)
// ============================================
function injectSchedulerStyles() {
  if (document.getElementById('scheduler-checkout-styles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'scheduler-checkout-styles';
  styles.textContent = `
    .delivery-scheduler-checkout {
      padding: 0;
    }
    
    .scheduler-intro {
      text-align: center;
      margin-bottom: 20px;
    }
    
    .scheduler-intro h4 {
      margin: 0 0 8px 0;
      font-size: 18px;
      color: var(--earth-brown, #2C2416);
    }
    
    .scheduler-intro p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }
    
    .delivery-scheduler-container {
      background: #f9f7f4;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .scheduler-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 40px;
      color: #666;
    }
    
    .scheduler-loading .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #ddd;
      border-top-color: var(--warm-orange, #C45C26);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin { to { transform: rotate(360deg); } }
    
    .scheduler-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    
    @media (max-width: 600px) {
      .scheduler-grid {
        grid-template-columns: 1fr;
      }
    }
    
    .scheduler-calendar {
      background: white;
      border-radius: 8px;
      padding: 16px;
    }
    
    .calendar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .calendar-month-label {
      font-weight: 600;
      font-size: 16px;
    }
    
    .calendar-nav-btn {
      background: #f5f1e8;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .calendar-nav-btn:hover { background: #e5dfd4; }
    .calendar-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    
    .calendar-weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
      margin-bottom: 8px;
    }
    
    .weekday {
      text-align: center;
      font-size: 11px;
      font-weight: 600;
      color: #888;
      text-transform: uppercase;
      padding: 4px 0;
    }
    
    .calendar-days {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
    }
    
    .calendar-day {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 500;
      border-radius: 6px;
      cursor: pointer;
      position: relative;
      transition: all 0.15s;
    }
    
    .calendar-day:hover:not(.disabled):not(.empty) { background: #f5f1e8; }
    .calendar-day.empty { cursor: default; }
    .calendar-day.disabled { color: #ccc; cursor: not-allowed; }
    .calendar-day.weekend { color: #bbb; opacity: 0.5; }
    .calendar-day.today { background: #f5f1e8; }
    .calendar-day.selected { background: var(--warm-orange, #C45C26); color: white; }
    
    .calendar-day.available::after {
      content: '';
      position: absolute;
      bottom: 3px;
      width: 4px;
      height: 4px;
      background: #4A7C59;
      border-radius: 50%;
    }
    
    .calendar-day.limited::after { background: #E9A23B; }
    .calendar-day.selected::after { background: white; }
    
    .calendar-legend {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #666;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    
    .legend-dot.available { background: #4A7C59; }
    .legend-dot.limited { background: #E9A23B; }
    
    .scheduler-slots {
      background: white;
      border-radius: 8px;
      padding: 16px;
    }
    
    .slots-placeholder {
      text-align: center;
      padding: 40px 20px;
      color: #888;
    }
    
    .slots-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .same-day-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: #4A7C59;
      color: white;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .slot-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: #f9f7f4;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
      border: 2px solid transparent;
    }
    
    .slot-item:hover:not(.disabled) { background: #f0ebe0; }
    .slot-item.selected { background: var(--warm-orange, #C45C26); color: white; border-color: #a34a1e; }
    .slot-item.disabled { opacity: 0.4; cursor: not-allowed; }
    
    .slot-info { display: flex; flex-direction: column; }
    .slot-name { font-weight: 600; font-size: 14px; }
    .slot-time { font-size: 12px; opacity: 0.8; }
    
    .slot-status {
      font-size: 12px;
      font-weight: 500;
      color: #4A7C59;
    }
    
    .slot-status.limited { color: #E9A23B; }
    .slot-item.selected .slot-status { color: white; }
    
    .precision-upsell {
      margin-top: 16px;
      padding: 16px;
      background: linear-gradient(135deg, #FFF9E6 0%, #FFF3CC 100%);
      border-radius: 8px;
      border: 1px solid #E9D88B;
    }
    
    .precision-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .precision-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      font-size: 14px;
    }
    
    .precision-price {
      background: var(--warm-orange, #C45C26);
      color: white;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .precision-desc {
      font-size: 12px;
      color: #666;
      margin-bottom: 12px;
    }
    
    .precision-options {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    
    .precision-option {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      border: 2px solid transparent;
      transition: all 0.15s;
    }
    
    .precision-option:hover { border-color: #ddd; }
    .precision-option.selected { border-color: var(--warm-orange, #C45C26); background: #FFF5F0; }
    
    .precision-time { font-size: 13px; font-weight: 500; }
    .precision-check { color: var(--warm-orange, #C45C26); font-weight: bold; }
    
    .delivery-selection-summary {
      background: var(--earth-brown, #2C2416);
      color: white;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }
    
    .selection-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.7;
    }
    
    .selection-icon { color: #4A7C59; }
    
    .selection-details { margin-bottom: 12px; }
    .selection-date { font-size: 18px; font-weight: 600; }
    .selection-time { font-size: 14px; opacity: 0.8; }
    
    .selection-precision {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }
    
    .precision-badge {
      background: rgba(255,255,255,0.15);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
    }
    
    .selection-fee {
      display: flex;
      justify-content: space-between;
      padding-top: 12px;
      border-top: 1px solid rgba(255,255,255,0.2);
      font-size: 14px;
    }
    
    .checkout-nav-buttons {
      display: flex;
      gap: 12px;
    }
    
    .checkout-nav-buttons .btn {
      flex: 1;
    }
    
    /* Order Summary Styles */
    .order-summary-section {
      margin-bottom: 16px;
    }
    
    .order-summary-section h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .summary-line-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
      font-size: 14px;
    }
    
    .delivery-summary-box {
      background: #f9f7f4;
      border-radius: 8px;
      padding: 12px;
    }
    
    .delivery-date-time {
      display: flex;
      flex-direction: column;
      margin-bottom: 8px;
    }
    
    .delivery-date-time strong { font-size: 16px; }
    .delivery-date-time span { font-size: 13px; color: #666; }
    
    .precision-summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-top: 1px solid #ddd;
    }
    
    .precision-badge-small {
      background: #FFF3CC;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    
    .delivery-free {
      display: flex;
      justify-content: space-between;
      padding-top: 8px;
      border-top: 1px solid #ddd;
    }
    
    .free-label {
      color: #4A7C59;
      font-weight: 600;
    }
    
    .order-summary-totals {
      border-top: 2px solid var(--earth-brown, #2C2416);
      padding-top: 12px;
    }
    
    .summary-line {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 14px;
    }
    
    .summary-line.total {
      font-size: 18px;
      font-weight: 700;
      padding-top: 12px;
      border-top: 1px solid #ddd;
      margin-top: 8px;
    }
    
    .free-text { color: #4A7C59; font-weight: 600; }
  `;
  
  document.head.appendChild(styles);
}

// Initialize styles on load
document.addEventListener('DOMContentLoaded', injectSchedulerStyles);

// Also inject immediately if DOM is already ready
if (document.readyState !== 'loading') {
  injectSchedulerStyles();
}
