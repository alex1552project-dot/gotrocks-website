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

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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
    const productsCollection = db.collection('products');
    const pricingConfigCollection = db.collection('pricing_config');

    // GET - List all pricing (owners, sales can view)
    if (event.httpMethod === 'GET') {
      const auth = verifyToken(event.headers.authorization, ['owner', 'sales', 'admin']);
      if (!auth.valid) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: auth.error }) };
      }

      // Get all products with pricing
      const products = await productsCollection.find({ active: true }).sort({ category: 1, name: 1 }).toArray();

      // Get global pricing config (trucking rates, minimums, fees)
      let pricingConfig = await pricingConfigCollection.findOne({ type: 'global' });
      
      // If no config exists, create default
      if (!pricingConfig) {
        pricingConfig = {
          type: 'global',
          trucking: {
            tandemRate: 100,
            endDumpRate: 130,
            loadTime: 0.25,
            avgSpeed: 35
          },
          margins: {
            small: 0.30,
            standard: 0.20
          },
          minimums: {
            orderYards: 2,
            orderDollars: 0
          },
          fees: {
            smallOrderFee: 0,
            fuelSurcharge: 0
          },
          lastUpdated: new Date().toISOString(),
          lastUpdatedBy: 'system'
        };
        await pricingConfigCollection.insertOne(pricingConfig);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          products: products.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            price: p.price,
            weight: p.weight,
            active: p.active,
            updatedAt: p.updatedAt
          })),
          config: pricingConfig,
          totalProducts: products.length
        })
      };
    }

    // PUT - Update pricing (owners, sales can update)
    if (event.httpMethod === 'PUT') {
      const auth = verifyToken(event.headers.authorization, ['owner', 'sales']);
      if (!auth.valid) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: auth.error }) };
      }

      const { type, productId, updates } = JSON.parse(event.body);

      // Update product price
      if (type === 'product' && productId) {
        const product = await productsCollection.findOne({ id: productId });
        if (!product) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Product not found' }) };
        }

        const updateFields = {
          updatedAt: new Date().toISOString()
        };

        if (updates.price !== undefined) {
          updateFields.price = parseFloat(updates.price);
        }
        if (updates.weight !== undefined) {
          updateFields.weight = parseFloat(updates.weight);
        }
        if (updates.active !== undefined) {
          updateFields.active = updates.active;
        }

        // Log price change for audit
        const auditCollection = db.collection('pricing_audit');
        await auditCollection.insertOne({
          type: 'product',
          productId,
          productName: product.name,
          previousPrice: product.price,
          newPrice: updateFields.price || product.price,
          updatedBy: auth.user.username,
          timestamp: new Date().toISOString()
        });

        await productsCollection.updateOne({ id: productId }, { $set: updateFields });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, updated: { productId, ...updateFields } })
        };
      }

      // Update global pricing config
      if (type === 'config') {
        const updateFields = {
          lastUpdated: new Date().toISOString(),
          lastUpdatedBy: auth.user.username
        };

        if (updates.trucking) {
          updateFields['trucking.tandemRate'] = updates.trucking.tandemRate;
          updateFields['trucking.endDumpRate'] = updates.trucking.endDumpRate;
          updateFields['trucking.loadTime'] = updates.trucking.loadTime;
          updateFields['trucking.avgSpeed'] = updates.trucking.avgSpeed;
        }

        if (updates.margins) {
          updateFields['margins.small'] = updates.margins.small;
          updateFields['margins.standard'] = updates.margins.standard;
        }

        if (updates.minimums) {
          updateFields['minimums.orderYards'] = updates.minimums.orderYards;
          updateFields['minimums.orderDollars'] = updates.minimums.orderDollars;
        }

        if (updates.fees) {
          updateFields['fees.smallOrderFee'] = updates.fees.smallOrderFee;
          updateFields['fees.fuelSurcharge'] = updates.fees.fuelSurcharge;
        }

        // Log config change for audit
        const auditCollection = db.collection('pricing_audit');
        await auditCollection.insertOne({
          type: 'config',
          updates,
          updatedBy: auth.user.username,
          timestamp: new Date().toISOString()
        });

        await pricingConfigCollection.updateOne(
          { type: 'global' },
          { $set: updateFields },
          { upsert: true }
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, updated: updateFields })
        };
      }

      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid update type' }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (error) {
    console.error('Pricing API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  } finally {
    await client.close();
  }
};
