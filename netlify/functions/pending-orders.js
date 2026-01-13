const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

const uri = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// Verify JWT and check role permissions
function verifyToken(authHeader, allowedRoles) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'No token provided' };
  }
  
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (allowedRoles && !allowedRoles.includes(decoded.role)) {
      return { valid: false, error: 'Insufficient permissions' };
    }
    
    return { valid: true, user: decoded };
  } catch (err) {
    return { valid: false, error: 'Invalid token' };
  }
}

// Generate order ID: PO-YYYY-MMDD-XXX
function generateOrderId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `PO-${year}-${month}${day}-${random}`;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('gotrocks');
    const pendingOrdersCollection = db.collection('pending_orders');
    const inventoryCollection = db.collection('inventory');

    // GET - List pending orders (with optional filters)
    if (event.httpMethod === 'GET') {
      const auth = verifyToken(event.headers.authorization, ['owner', 'sales', 'dispatch', 'dispatcher']);
      if (!auth.valid) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: auth.error }) };
      }

      const params = event.queryStringParameters || {};
      const filter = { status: { $in: ['pending_payment', 'paid'] } };
      
      // Optional filters
      if (params.status) filter.status = params.status;
      if (params.orderId) filter.orderId = params.orderId;
      if (params.date) filter['delivery.date'] = params.date;

      const orders = await pendingOrdersCollection
        .find(filter)
        .sort({ 'timestamps.created': -1 })
        .limit(100)
        .toArray();

      // Calculate summary stats
      const stats = {
        total: orders.length,
        pendingPayment: orders.filter(o => o.status === 'pending_payment').length,
        paid: orders.filter(o => o.status === 'paid').length,
        totalValue: orders.reduce((sum, o) => sum + (o.pricing?.total || 0), 0)
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ orders, stats })
      };
    }

    // POST - Create pending order (reserves inventory)
    if (event.httpMethod === 'POST') {
      // Allow both authenticated users and public customers
      const auth = verifyToken(event.headers.authorization, null);
      const isAuthenticated = auth.valid;

      const body = JSON.parse(event.body);
      const { customer, items, delivery, truck, pricing, source } = body;

      // Validate required fields
      if (!customer || !items || !items.length || !delivery || !pricing) {
        return { 
          statusCode: 400, 
          headers, 
          body: JSON.stringify({ error: 'Missing required fields: customer, items, delivery, pricing' }) 
        };
      }

      // Check inventory availability for all items
      const availabilityErrors = [];
      for (const item of items) {
        const inventory = await inventoryCollection.findOne({ productId: item.productId });
        
        if (!inventory) {
          availabilityErrors.push(`${item.productName}: Product not found in inventory`);
          continue;
        }

        // Get currently committed quantity for this product
        const committed = await pendingOrdersCollection.aggregate([
          { 
            $match: { 
              status: { $in: ['pending_payment', 'paid'] },
              'items.productId': item.productId
            } 
          },
          { $unwind: '$items' },
          { $match: { 'items.productId': item.productId } },
          { $group: { _id: null, totalCommitted: { $sum: '$items.tonsEquivalent' } } }
        ]).toArray();

        const committedQty = committed[0]?.totalCommitted || 0;
        const availableQty = inventory.quantity - committedQty;
        const requestedQty = item.tonsEquivalent || item.quantity;

        if (requestedQty > availableQty) {
          availabilityErrors.push(
            `${item.productName}: Requested ${requestedQty} tons, only ${availableQty.toFixed(1)} available`
          );
        }
      }

      if (availabilityErrors.length > 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Insufficient inventory', 
            details: availabilityErrors 
          })
        };
      }

      // Create the pending order
      const orderId = generateOrderId();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours

      const pendingOrder = {
        orderId,
        status: 'pending_payment',
        
        customer: {
          name: customer.name,
          email: customer.email || null,
          phone: customer.phone || null,
          address: customer.address,
          city: customer.city || null,
          zip: customer.zip
        },
        
        items: items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit || 'yards',
          tonsEquivalent: item.tonsEquivalent || item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal || (item.quantity * item.unitPrice)
        })),
        
        delivery: {
          date: delivery.date,
          window: delivery.window || 'AM',
          address: delivery.address,
          zip: delivery.zip,
          distanceMiles: delivery.distanceMiles || null,
          zone: delivery.zone || null,
          instructions: delivery.instructions || null
        },
        
        truck: truck ? {
          type: truck.type || 'tandem',
          truckId: truck.truckId || null,
          driverId: null
        } : {
          type: 'tandem',
          truckId: null,
          driverId: null
        },
        
        pricing: {
          materialSubtotal: pricing.materialSubtotal || pricing.materialTotal,
          deliveryFee: pricing.deliveryFee,
          margin: pricing.margin || 0,
          subtotal: pricing.subtotal,
          tax: pricing.tax,
          serviceFee: pricing.serviceFee || 0,
          total: pricing.total
        },
        
        timestamps: {
          created: now.toISOString(),
          expires: expiresAt.toISOString(),
          paid: null,
          converted: null,
          delivered: null
        },
        
        squareCheckoutId: null,
        squarePaymentId: null,
        
        source: source || 'website',
        createdBy: isAuthenticated ? auth.user.username : 'customer'
      };

      await pendingOrdersCollection.insertOne(pendingOrder);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ 
          success: true, 
          orderId,
          order: pendingOrder,
          expiresAt: expiresAt.toISOString()
        })
      };
    }

    // PUT - Update pending order (status, Square IDs, etc.)
    if (event.httpMethod === 'PUT') {
      const auth = verifyToken(event.headers.authorization, ['owner', 'sales', 'dispatch']);
      if (!auth.valid) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: auth.error }) };
      }

      const body = JSON.parse(event.body);
      const { orderId, status, squareCheckoutId, squarePaymentId, delivery, truck } = body;

      if (!orderId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'orderId required' }) };
      }

      const existing = await pendingOrdersCollection.findOne({ orderId });
      if (!existing) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Order not found' }) };
      }

      const updateFields = {};

      if (status) {
        updateFields.status = status;
        if (status === 'paid') {
          updateFields['timestamps.paid'] = new Date().toISOString();
        } else if (status === 'converted') {
          updateFields['timestamps.converted'] = new Date().toISOString();
        } else if (status === 'delivered') {
          updateFields['timestamps.delivered'] = new Date().toISOString();
        }
      }

      if (squareCheckoutId) updateFields.squareCheckoutId = squareCheckoutId;
      if (squarePaymentId) updateFields.squarePaymentId = squarePaymentId;
      
      if (delivery) {
        if (delivery.date) updateFields['delivery.date'] = delivery.date;
        if (delivery.window) updateFields['delivery.window'] = delivery.window;
        if (delivery.instructions) updateFields['delivery.instructions'] = delivery.instructions;
      }

      if (truck) {
        if (truck.truckId) updateFields['truck.truckId'] = truck.truckId;
        if (truck.driverId) updateFields['truck.driverId'] = truck.driverId;
      }

      await pendingOrdersCollection.updateOne(
        { orderId },
        { $set: updateFields }
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, updated: updateFields })
      };
    }

    // DELETE - Cancel pending order (releases inventory hold)
    if (event.httpMethod === 'DELETE') {
      const auth = verifyToken(event.headers.authorization, ['owner', 'sales']);
      if (!auth.valid) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: auth.error }) };
      }

      const body = JSON.parse(event.body);
      const { orderId, reason } = body;

      if (!orderId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'orderId required' }) };
      }

      const existing = await pendingOrdersCollection.findOne({ orderId });
      if (!existing) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Order not found' }) };
      }

      // Don't allow canceling paid orders without explicit flag
      if (existing.status === 'paid' && !body.forceCancelPaid) {
        return { 
          statusCode: 400, 
          headers, 
          body: JSON.stringify({ error: 'Cannot cancel paid order. Use forceCancelPaid: true to override.' }) 
        };
      }

      // Update to cancelled status (keeps record for audit)
      await pendingOrdersCollection.updateOne(
        { orderId },
        { 
          $set: { 
            status: 'cancelled',
            cancelledAt: new Date().toISOString(),
            cancelledBy: auth.user.username,
            cancelReason: reason || 'No reason provided'
          } 
        }
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: 'Order cancelled, inventory hold released',
          orderId
        })
      };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (error) {
    console.error('Pending Orders API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  } finally {
    await client.close();
  }
};
