const { connectToDatabase, headers, handleOptions } = require('./utils/db');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('products');

    // GET - Retrieve all products
    if (event.httpMethod === 'GET') {
      const products = await collection.find({ active: true }).toArray();
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(products)
      };
    }

    // POST - Add or update a product (admin only)
    if (event.httpMethod === 'POST') {
      const product = JSON.parse(event.body);
      
      // Validate required fields
      if (!product.id || !product.name || !product.category || product.price === undefined) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing required fields: id, name, category, price' })
        };
      }

      // Upsert - update if exists, insert if not
      const result = await collection.updateOne(
        { id: product.id },
        { 
          $set: {
            ...product,
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true }
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, result })
      };
    }

    // DELETE - Remove a product (admin only)
    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body);
      
      // Soft delete - just mark as inactive
      const result = await collection.updateOne(
        { id },
        { $set: { active: false, updatedAt: new Date() } }
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
    console.error('Products API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};
