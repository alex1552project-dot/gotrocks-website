const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('gotrocks');
    const inventoryCollection = db.collection('inventory');
    const pendingOrdersCollection = db.collection('pending_orders');
    const productsCollection = db.collection('products');

    // GET - Check availability for specific product(s)
    // Usage: /availability?productId=crushed-limestone
    // Usage: /availability?productIds=crushed-limestone,decomposed-granite
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      
      let productIds = [];
      if (params.productId) {
        productIds = [params.productId];
      } else if (params.productIds) {
        productIds = params.productIds.split(',').map(id => id.trim());
      }

      if (productIds.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'productId or productIds query parameter required' })
        };
      }

      // Get inventory for requested products
      const inventory = await inventoryCollection.find({ 
        productId: { $in: productIds } 
      }).toArray();

      // Get product details for weight conversion
      const products = await productsCollection.find({
        id: { $in: productIds }
      }).toArray();
      const productMap = {};
      products.forEach(p => { productMap[p.id] = p; });

      // Get committed quantities from pending orders
      const committed = await pendingOrdersCollection.aggregate([
        { 
          $match: { 
            status: { $in: ['pending_payment', 'paid'] },
            'items.productId': { $in: productIds }
          } 
        },
        { $unwind: '$items' },
        { $match: { 'items.productId': { $in: productIds } } },
        { 
          $group: { 
            _id: '$items.productId', 
            committedTons: { $sum: '$items.tonsEquivalent' }
          } 
        }
      ]).toArray();

      const committedMap = {};
      committed.forEach(c => { committedMap[c._id] = c.committedTons; });

      // Build availability response
      const availability = productIds.map(productId => {
        const inv = inventory.find(i => i.productId === productId);
        const product = productMap[productId];
        
        if (!inv || !product) {
          return {
            productId,
            available: false,
            error: 'Product not found'
          };
        }

        const physicalTons = inv.quantity || 0;
        const committedTons = committedMap[productId] || 0;
        const availableTons = physicalTons - committedTons;
        const weight = product.weight || 1.35; // Default weight per yard
        const availableYards = availableTons / weight;

        return {
          productId,
          productName: product.name,
          available: true,
          physical: {
            tons: Math.round(physicalTons * 10) / 10,
            yards: Math.round((physicalTons / weight) * 10) / 10
          },
          committed: {
            tons: Math.round(committedTons * 10) / 10,
            yards: Math.round((committedTons / weight) * 10) / 10
          },
          available: {
            tons: Math.round(availableTons * 10) / 10,
            yards: Math.round(availableYards * 10) / 10
          },
          lowStock: availableTons < (inv.reorderPoint || 20)
        };
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          availability,
          checkedAt: new Date().toISOString()
        })
      };
    }

    // POST - Check availability for a full cart/order
    // Body: { items: [{ productId, quantity, unit }] }
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      const { items } = body;

      if (!items || !items.length) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'items array required' })
        };
      }

      const productIds = items.map(i => i.productId);

      // Get inventory and products
      const inventory = await inventoryCollection.find({ 
        productId: { $in: productIds } 
      }).toArray();
      const invMap = {};
      inventory.forEach(i => { invMap[i.productId] = i; });

      const products = await productsCollection.find({
        id: { $in: productIds }
      }).toArray();
      const productMap = {};
      products.forEach(p => { productMap[p.id] = p; });

      // Get committed quantities
      const committed = await pendingOrdersCollection.aggregate([
        { 
          $match: { 
            status: { $in: ['pending_payment', 'paid'] },
            'items.productId': { $in: productIds }
          } 
        },
        { $unwind: '$items' },
        { $match: { 'items.productId': { $in: productIds } } },
        { 
          $group: { 
            _id: '$items.productId', 
            committedTons: { $sum: '$items.tonsEquivalent' }
          } 
        }
      ]).toArray();
      const committedMap = {};
      committed.forEach(c => { committedMap[c._id] = c.committedTons; });

      // Check each item
      const results = [];
      let allAvailable = true;

      for (const item of items) {
        const inv = invMap[item.productId];
        const product = productMap[item.productId];

        if (!inv || !product) {
          results.push({
            productId: item.productId,
            canFulfill: false,
            error: 'Product not found'
          });
          allAvailable = false;
          continue;
        }

        const weight = product.weight || 1.35;
        const physicalTons = inv.quantity || 0;
        const committedTons = committedMap[item.productId] || 0;
        const availableTons = physicalTons - committedTons;

        // Convert requested quantity to tons
        let requestedTons;
        if (item.unit === 'tons') {
          requestedTons = item.quantity;
        } else {
          // Assume yards
          requestedTons = item.quantity * weight;
        }

        const canFulfill = requestedTons <= availableTons;
        if (!canFulfill) allAvailable = false;

        results.push({
          productId: item.productId,
          productName: product.name,
          requested: {
            quantity: item.quantity,
            unit: item.unit || 'yards',
            tons: Math.round(requestedTons * 10) / 10
          },
          available: {
            tons: Math.round(availableTons * 10) / 10,
            yards: Math.round((availableTons / weight) * 10) / 10
          },
          canFulfill,
          shortfall: canFulfill ? 0 : Math.round((requestedTons - availableTons) * 10) / 10
        });
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          allAvailable,
          items: results,
          checkedAt: new Date().toISOString()
        })
      };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (error) {
    console.error('Availability API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  } finally {
    await client.close();
  }
};
