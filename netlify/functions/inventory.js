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
    
    if (!allowedRoles.includes(decoded.role)) {
      return { valid: false, error: 'Insufficient permissions' };
    }
    
    return { valid: true, user: decoded };
  } catch (err) {
    return { valid: false, error: 'Invalid token' };
  }
}

// Calculate committed inventory from pending orders
async function getCommittedInventory(db) {
  const pendingOrdersCollection = db.collection('pending_orders');
  
  const committed = await pendingOrdersCollection.aggregate([
    { 
      $match: { 
        status: { $in: ['pending_payment', 'paid'] }
      } 
    },
    { $unwind: '$items' },
    { 
      $group: { 
        _id: '$items.productId', 
        committedTons: { $sum: '$items.tonsEquivalent' },
        orderCount: { $sum: 1 }
      } 
    }
  ]).toArray();
  
  // Convert to lookup object
  const committedMap = {};
  committed.forEach(item => {
    committedMap[item._id] = {
      committedTons: item.committedTons,
      orderCount: item.orderCount
    };
  });
  
  return committedMap;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('gotrocks');
    const inventoryCollection = db.collection('inventory');
    const productsCollection = db.collection('products');

    // GET - List inventory (owners, dispatch can view)
    if (event.httpMethod === 'GET') {
      const auth = verifyToken(event.headers.authorization, ['owner', 'dispatch', 'dispatcher']);
      if (!auth.valid) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: auth.error }) };
      }

      // Get committed inventory from pending orders
      const committedMap = await getCommittedInventory(db);

      // Join inventory with products for full details
      const inventory = await inventoryCollection.aggregate([
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: 'id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $project: {
            _id: 1,
            productId: 1,
            stockTons: '$quantity',
            lowStockThreshold: '$reorderPoint',
            lastUpdated: '$updatedAt',
            productName: '$productName',
            location: 1,
            name: '$product.name',
            category: '$product.category',
            weight: '$product.weight',
            price: '$product.price',
            active: '$product.active'
          }
        },
        { $sort: { category: 1, name: 1 } }
      ]).toArray();

      // Calculate yards equivalent, committed, and available for display
      const inventoryWithAvailability = inventory.map(item => {
        const committed = committedMap[item.productId] || { committedTons: 0, orderCount: 0 };
        const availableTons = item.stockTons - committed.committedTons;
        
        return {
          ...item,
          stockYards: item.weight > 0 ? Math.round((item.stockTons / item.weight) * 10) / 10 : 0,
          // NEW: Committed and available calculations
          committedTons: Math.round(committed.committedTons * 10) / 10,
          committedOrders: committed.orderCount,
          availableTons: Math.round(availableTons * 10) / 10,
          availableYards: item.weight > 0 ? Math.round((availableTons / item.weight) * 10) / 10 : 0,
          // Threshold check against AVAILABLE, not physical
          belowThreshold: availableTons < item.lowStockThreshold
        };
      });

      // Summary stats
      const totalCommitted = Object.values(committedMap).reduce((sum, c) => sum + c.committedTons, 0);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          inventory: inventoryWithAvailability,
          totalItems: inventory.length,
          lowStockCount: inventoryWithAvailability.filter(i => i.belowThreshold).length,
          // NEW: Commitment summary
          commitmentSummary: {
            totalCommittedTons: Math.round(totalCommitted * 10) / 10,
            productsWithCommitments: Object.keys(committedMap).length
          }
        })
      };
    }

    // POST - Initialize inventory for a product (owners only)
    if (event.httpMethod === 'POST') {
      const auth = verifyToken(event.headers.authorization, ['owner']);
      if (!auth.valid) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: auth.error }) };
      }

      const { productId, stockTons, lowStockThreshold } = JSON.parse(event.body);

      if (!productId || stockTons === undefined) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'productId and stockTons required' }) };
      }

      // Check if product exists
      const product = await productsCollection.findOne({ id: productId });
      if (!product) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Product not found' }) };
      }

      // Check if inventory record already exists
      const existing = await inventoryCollection.findOne({ productId });
      if (existing) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Inventory record already exists. Use PUT to update.' }) };
      }

      const inventoryRecord = {
        productId,
        productName: product.name,
        quantity: parseFloat(stockTons),
        unit: 'tons',
        reorderPoint: parseFloat(lowStockThreshold) || 20,
        location: 'Main Yard',
        history: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await inventoryCollection.insertOne(inventoryRecord);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, inventory: inventoryRecord })
      };
    }

    // PUT - Update inventory (owners, dispatch can update)
    if (event.httpMethod === 'PUT') {
      const auth = verifyToken(event.headers.authorization, ['owner', 'dispatch', 'dispatcher']);
      if (!auth.valid) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: auth.error }) };
      }

      const { productId, stockTons, adjustment, lowStockThreshold, reason } = JSON.parse(event.body);

      if (!productId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'productId required' }) };
      }

      const existing = await inventoryCollection.findOne({ productId });
      if (!existing) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Inventory record not found' }) };
      }

      const updateFields = {
        updatedAt: new Date().toISOString()
      };

      let newQuantity = existing.quantity;

      // Either set absolute value or adjust
      if (stockTons !== undefined) {
        newQuantity = parseFloat(stockTons);
        updateFields.quantity = newQuantity;
      } else if (adjustment !== undefined) {
        newQuantity = existing.quantity + parseFloat(adjustment);
        updateFields.quantity = newQuantity;
      }

      if (lowStockThreshold !== undefined) {
        updateFields.reorderPoint = parseFloat(lowStockThreshold);
      }

      // Log the adjustment for audit trail
      const adjustmentLog = {
        productId,
        previousTons: existing.quantity,
        newTons: newQuantity,
        adjustment: adjustment || (newQuantity - existing.quantity),
        reason: reason || 'Manual adjustment',
        updatedBy: auth.user.username,
        timestamp: new Date().toISOString()
      };

      await inventoryCollection.updateOne({ productId }, { $set: updateFields });
      
      // Log to separate audit collection
      const auditCollection = db.collection('inventory_audit');
      await auditCollection.insertOne(adjustmentLog);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, updated: updateFields, audit: adjustmentLog })
      };
    }

    // DELETE - Remove inventory record (owners only)
    if (event.httpMethod === 'DELETE') {
      const auth = verifyToken(event.headers.authorization, ['owner']);
      if (!auth.valid) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: auth.error }) };
      }

      const { productId } = JSON.parse(event.body);

      if (!productId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'productId required' }) };
      }

      const result = await inventoryCollection.deleteOne({ productId });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, deleted: result.deletedCount })
      };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (error) {
    console.error('Inventory API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  } finally {
    await client.close();
  }
};
