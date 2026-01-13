const { MongoClient, ObjectId } = require('mongodb');

const client = new MongoClient(process.env.MONGODB_URI);
let db;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db('gotrocks');
  }
  return db;
}

// 3-hour delivery windows
const DELIVERY_SLOTS = [
  { id: 'early-am', label: 'Early Morning', start: '05:00', end: '08:00', startHour: 5, endHour: 8 },
  { id: 'morning', label: 'Morning', start: '08:00', end: '11:00', startHour: 8, endHour: 11 },
  { id: 'midday', label: 'Midday', start: '11:00', end: '14:00', startHour: 11, endHour: 14 },
  { id: 'afternoon', label: 'Afternoon', start: '14:00', end: '17:00', startHour: 14, endHour: 17 },
  { id: 'evening', label: 'Evening', start: '17:00', end: '20:00', startHour: 17, endHour: 20 }
];

// Precision Delivery - 1-hour windows within each slot
const PRECISION_WINDOWS = {
  'early-am': [
    { id: 'early-am-1', label: '5:00 - 6:00 AM', start: '05:00', end: '06:00' },
    { id: 'early-am-2', label: '6:00 - 7:00 AM', start: '06:00', end: '07:00' },
    { id: 'early-am-3', label: '7:00 - 8:00 AM', start: '07:00', end: '08:00' }
  ],
  'morning': [
    { id: 'morning-1', label: '8:00 - 9:00 AM', start: '08:00', end: '09:00' },
    { id: 'morning-2', label: '9:00 - 10:00 AM', start: '09:00', end: '10:00' },
    { id: 'morning-3', label: '10:00 - 11:00 AM', start: '10:00', end: '11:00' }
  ],
  'midday': [
    { id: 'midday-1', label: '11:00 AM - 12:00 PM', start: '11:00', end: '12:00' },
    { id: 'midday-2', label: '12:00 - 1:00 PM', start: '12:00', end: '13:00' },
    { id: 'midday-3', label: '1:00 - 2:00 PM', start: '13:00', end: '14:00' }
  ],
  'afternoon': [
    { id: 'afternoon-1', label: '2:00 - 3:00 PM', start: '14:00', end: '15:00' },
    { id: 'afternoon-2', label: '3:00 - 4:00 PM', start: '15:00', end: '16:00' },
    { id: 'afternoon-3', label: '4:00 - 5:00 PM', start: '16:00', end: '17:00' }
  ],
  'evening': [
    { id: 'evening-1', label: '5:00 - 6:00 PM', start: '17:00', end: '18:00' },
    { id: 'evening-2', label: '6:00 - 7:00 PM', start: '18:00', end: '19:00' },
    { id: 'evening-3', label: '7:00 - 8:00 PM', start: '19:00', end: '20:00' }
  ]
};

// Pricing
const PRECISION_DELIVERY_FEE = 50; // $50 upgrade for 1-hour window

// Yard location (Conroe, TX) - for same-day distance calculations
const YARD_LOCATION = {
  lat: 30.3119,
  lng: -95.4561
};

// Same-day delivery constraints
const SAME_DAY_MAX_DISTANCE_MILES = 20; // Only within 20 miles for same-day
const SAME_DAY_MIN_LEAD_TIME_HOURS = 2; // Need at least 2 hours notice

// Helper: Get next N business days (M-F)
function getBusinessDays(startDate, count) {
  const days = [];
  let current = new Date(startDate);
  
  while (days.length < count) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
      days.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  
  return days;
}

// Helper: Format date as YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Helper: Check if a slot is available for same-day booking
function isSameDaySlotAvailable(slot, currentHour, distanceMiles) {
  // Must be within distance limit
  if (distanceMiles > SAME_DAY_MAX_DISTANCE_MILES) {
    return false;
  }
  
  // Slot must start at least SAME_DAY_MIN_LEAD_TIME_HOURS from now
  const requiredStartHour = currentHour + SAME_DAY_MIN_LEAD_TIME_HOURS;
  return slot.startHour >= requiredStartHour;
}

// Helper: Calculate rough distance (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// GET: Fetch available slots
async function getAvailability(params) {
  const db = await connectDB();
  const scheduleCollection = db.collection('delivery_schedule');
  
  const { 
    date,           // Single date: YYYY-MM-DD
    range = 14,     // Number of business days to return
    customerLat,    // For same-day eligibility
    customerLng,
    truckType       // 'tandem' or 'end-dump' - filter by truck availability
  } = params;
  
  const now = new Date();
  const currentHour = now.getHours();
  const today = formatDate(now);
  
  // Calculate customer distance if coordinates provided
  let customerDistance = null;
  if (customerLat && customerLng) {
    customerDistance = calculateDistance(
      YARD_LOCATION.lat, YARD_LOCATION.lng,
      parseFloat(customerLat), parseFloat(customerLng)
    );
  }
  
  // Single date query
  if (date) {
    const schedule = await scheduleCollection.findOne({ date });
    const bookedSlots = schedule?.slots || {};
    
    const isToday = date === today;
    
    const availability = DELIVERY_SLOTS.map(slot => {
      const booked = bookedSlots[slot.id] || [];
      const isAvailable = booked.length < getSlotCapacity(slot.id, truckType);
      
      // Check same-day constraints
      let sameDayAvailable = true;
      if (isToday && customerDistance !== null) {
        sameDayAvailable = isSameDaySlotAvailable(slot, currentHour, customerDistance);
      } else if (isToday) {
        // No distance provided, use conservative estimate
        sameDayAvailable = slot.startHour >= currentHour + SAME_DAY_MIN_LEAD_TIME_HOURS;
      }
      
      return {
        ...slot,
        available: isAvailable && sameDayAvailable,
        bookedCount: booked.length,
        capacity: getSlotCapacity(slot.id, truckType),
        sameDayEligible: isToday ? sameDayAvailable : null,
        precisionWindows: isAvailable && sameDayAvailable ? PRECISION_WINDOWS[slot.id] : []
      };
    });
    
    return {
      date,
      isToday,
      customerDistance: customerDistance ? Math.round(customerDistance * 10) / 10 : null,
      sameDayEligible: isToday && customerDistance !== null && customerDistance <= SAME_DAY_MAX_DISTANCE_MILES,
      slots: availability,
      precisionDeliveryFee: PRECISION_DELIVERY_FEE
    };
  }
  
  // Range query - get next N business days
  const businessDays = getBusinessDays(now, parseInt(range));
  const dates = businessDays.map(d => formatDate(d));
  
  // Fetch all schedules for date range
  const schedules = await scheduleCollection.find({ 
    date: { $in: dates } 
  }).toArray();
  
  const scheduleMap = {};
  schedules.forEach(s => { scheduleMap[s.date] = s; });
  
  const availability = dates.map(dateStr => {
    const schedule = scheduleMap[dateStr];
    const bookedSlots = schedule?.slots || {};
    const isToday = dateStr === today;
    
    const slots = DELIVERY_SLOTS.map(slot => {
      const booked = bookedSlots[slot.id] || [];
      const capacity = getSlotCapacity(slot.id, truckType);
      const isAvailable = booked.length < capacity;
      
      let sameDayAvailable = true;
      if (isToday && customerDistance !== null) {
        sameDayAvailable = isSameDaySlotAvailable(slot, currentHour, customerDistance);
      } else if (isToday) {
        sameDayAvailable = slot.startHour >= currentHour + SAME_DAY_MIN_LEAD_TIME_HOURS;
      }
      
      return {
        ...slot,
        available: isAvailable && sameDayAvailable,
        bookedCount: booked.length,
        capacity
      };
    });
    
    const availableSlotCount = slots.filter(s => s.available).length;
    
    return {
      date: dateStr,
      dayOfWeek: new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
      isToday,
      availableSlots: availableSlotCount,
      totalSlots: DELIVERY_SLOTS.length,
      fullyBooked: availableSlotCount === 0,
      slots
    };
  });
  
  return {
    range: parseInt(range),
    customerDistance: customerDistance ? Math.round(customerDistance * 10) / 10 : null,
    sameDayMaxDistance: SAME_DAY_MAX_DISTANCE_MILES,
    precisionDeliveryFee: PRECISION_DELIVERY_FEE,
    days: availability
  };
}

// Helper: Get slot capacity (can be customized per slot or truck type)
function getSlotCapacity(slotId, truckType) {
  // Default: 4 deliveries per slot
  // Could be adjusted based on truck availability, time of day, etc.
  return 4;
}

// POST: Reserve a delivery slot
async function reserveSlot(body) {
  const db = await connectDB();
  const scheduleCollection = db.collection('delivery_schedule');
  
  const {
    date,
    slotId,
    orderId,
    precisionWindowId,  // Optional - for Precision Delivery upgrade
    customerName,
    customerZip,
    deliveryAddress,
    truckType,
    tonsRequired,
    estimatedDuration
  } = body;
  
  // Validate required fields
  if (!date || !slotId || !orderId) {
    return { error: 'Missing required fields: date, slotId, orderId' };
  }
  
  // Validate slot exists
  const slot = DELIVERY_SLOTS.find(s => s.id === slotId);
  if (!slot) {
    return { error: `Invalid slotId: ${slotId}` };
  }
  
  // Validate precision window if provided
  if (precisionWindowId) {
    const precisionWindow = PRECISION_WINDOWS[slotId]?.find(w => w.id === precisionWindowId);
    if (!precisionWindow) {
      return { error: `Invalid precisionWindowId: ${precisionWindowId} for slot ${slotId}` };
    }
  }
  
  // Check current availability
  const schedule = await scheduleCollection.findOne({ date });
  const currentBookings = schedule?.slots?.[slotId] || [];
  
  if (currentBookings.length >= getSlotCapacity(slotId, truckType)) {
    return { error: 'Slot is fully booked', slotId, date };
  }
  
  // Check if order already has a reservation
  if (currentBookings.some(b => b.orderId === orderId)) {
    return { error: 'Order already has a reservation for this slot', orderId };
  }
  
  // Create booking record
  const booking = {
    orderId,
    customerName,
    customerZip,
    deliveryAddress,
    truckType: truckType || 'tandem',
    tonsRequired: tonsRequired || 0,
    estimatedDuration: estimatedDuration || 60, // minutes
    precisionWindowId: precisionWindowId || null,
    precisionDelivery: !!precisionWindowId,
    reservedAt: new Date().toISOString()
  };
  
  // Upsert the schedule document
  const result = await scheduleCollection.updateOne(
    { date },
    { 
      $push: { [`slots.${slotId}`]: booking },
      $setOnInsert: { date, createdAt: new Date().toISOString() },
      $set: { updatedAt: new Date().toISOString() }
    },
    { upsert: true }
  );
  
  // Get the updated slot info
  const updatedSchedule = await scheduleCollection.findOne({ date });
  const updatedBookings = updatedSchedule?.slots?.[slotId] || [];
  
  return {
    success: true,
    reservation: {
      date,
      slot: {
        id: slotId,
        label: slot.label,
        window: `${slot.start} - ${slot.end}`
      },
      precisionWindow: precisionWindowId ? {
        id: precisionWindowId,
        ...PRECISION_WINDOWS[slotId].find(w => w.id === precisionWindowId),
        fee: PRECISION_DELIVERY_FEE
      } : null,
      orderId,
      position: updatedBookings.length,
      capacity: getSlotCapacity(slotId, truckType)
    }
  };
}

// DELETE: Release a slot reservation
async function releaseSlot(body) {
  const db = await connectDB();
  const scheduleCollection = db.collection('delivery_schedule');
  
  const { date, slotId, orderId } = body;
  
  if (!date || !orderId) {
    return { error: 'Missing required fields: date, orderId' };
  }
  
  // If slotId provided, release from specific slot
  // Otherwise, search all slots for this order
  if (slotId) {
    const result = await scheduleCollection.updateOne(
      { date },
      { 
        $pull: { [`slots.${slotId}`]: { orderId } },
        $set: { updatedAt: new Date().toISOString() }
      }
    );
    
    return {
      success: true,
      released: {
        date,
        slotId,
        orderId
      },
      modified: result.modifiedCount > 0
    };
  }
  
  // Search all slots for the order
  const schedule = await scheduleCollection.findOne({ date });
  if (!schedule) {
    return { error: 'No schedule found for date', date };
  }
  
  let foundSlot = null;
  for (const [slot, bookings] of Object.entries(schedule.slots || {})) {
    if (bookings.some(b => b.orderId === orderId)) {
      foundSlot = slot;
      break;
    }
  }
  
  if (!foundSlot) {
    return { error: 'Order not found in any slot', orderId, date };
  }
  
  const result = await scheduleCollection.updateOne(
    { date },
    { 
      $pull: { [`slots.${foundSlot}`]: { orderId } },
      $set: { updatedAt: new Date().toISOString() }
    }
  );
  
  return {
    success: true,
    released: {
      date,
      slotId: foundSlot,
      orderId
    }
  };
}

// PUT: Update a reservation
async function updateReservation(body) {
  const db = await connectDB();
  const scheduleCollection = db.collection('delivery_schedule');
  
  const { 
    date, 
    slotId, 
    orderId, 
    updates  // { truckId, driverId, status, notes, actualWindow }
  } = body;
  
  if (!date || !slotId || !orderId || !updates) {
    return { error: 'Missing required fields: date, slotId, orderId, updates' };
  }
  
  // Build update object
  const setFields = {};
  for (const [key, value] of Object.entries(updates)) {
    setFields[`slots.${slotId}.$[booking].${key}`] = value;
  }
  setFields[`slots.${slotId}.$[booking].updatedAt`] = new Date().toISOString();
  
  const result = await scheduleCollection.updateOne(
    { date },
    { $set: setFields },
    { arrayFilters: [{ 'booking.orderId': orderId }] }
  );
  
  if (result.matchedCount === 0) {
    return { error: 'Reservation not found', date, slotId, orderId };
  }
  
  return {
    success: true,
    updated: {
      date,
      slotId,
      orderId,
      changes: Object.keys(updates)
    }
  };
}

// Main handler
exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  
  try {
    const method = event.httpMethod;
    const params = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};
    
    let result;
    
    switch (method) {
      case 'GET':
        // Public endpoint - get availability
        result = await getAvailability(params);
        break;
        
      case 'POST':
        // Reserve a slot (called when pending order created)
        result = await reserveSlot(body);
        break;
        
      case 'PUT':
        // Update reservation (assign truck/driver, update status)
        result = await updateReservation(body);
        break;
        
      case 'DELETE':
        // Release slot (when order cancelled)
        result = await releaseSlot(body);
        break;
        
      default:
        result = { error: `Method ${method} not supported` };
    }
    
    const statusCode = result.error ? 400 : 200;
    return { statusCode, headers, body: JSON.stringify(result) };
    
  } catch (error) {
    console.error('Schedule function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: error.message })
    };
  }
};
