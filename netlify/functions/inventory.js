const { connectToDatabase, headers, handleOptions } = require('./utils/db');

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('inventory');

    // GET - Retrieve inventory
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      
      let query = {};
      
      // Filter by product if specified
      if (params.productId) {
        query.productId = params.productId;
      }
      
      // Filter by low stock
      if (params.lowStock === 'true') {
        query.$expr = { $lte: ['$quantity', '$reorderPoint'] };
      }

      const inventory = await collection.find(query).toArray();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(inventory)
      };
    }

    // POST - Update inventory
    if (event.httpMethod === 'POST') {
      const { productId, quantity, reorderPoint, location, action, notes } = JSON.parse(event.body);
      
      if (!productId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing required field: productId' })
        };
      }

      // If action is 'adjust', add/subtract from current quantity
      if (action === 'adjust' && quantity !== undefined) {
        const result = await collection.updateOne(
          { productId },
          { 
            $inc: { quantity: quantity },
            $set: { updatedAt: new Date() },
            $push: { 
              history: {
                action: 'adjust',
                amount: quantity,
                notes,
                timestamp: new Date()
              }
            }
          }
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, result })
        };
      }

      // Otherwise, set absolute values
      const updateData = { updatedAt: new Date() };
      if (quantity !== undefined) updateData.quantity = quantity;
      if (reorderPoint !== undefined) updateData.reorderPoint = reorderPoint;
      if (location !== undefined) updateData.location = location;

      const result = await collection.updateOne(
        { productId },
        { 
          $set: updateData,
          $setOnInsert: { createdAt: new Date(), history: [] }
        },
        { upsert: true }
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, result })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Inventory API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};
