const { connectToDatabase, headers, handleOptions } = require('./utils/db');

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('trucks');

    // GET - Retrieve all trucks
    if (event.httpMethod === 'GET') {
      const trucks = await collection.find({ active: true }).toArray();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(trucks)
      };
    }

    // POST - Add or update a truck (admin only)
    if (event.httpMethod === 'POST') {
      const truck = JSON.parse(event.body);
      
      if (!truck.type || truck.hourly_rate === undefined || truck.capacity_tons === undefined) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing required fields: type, hourly_rate, capacity_tons' })
        };
      }

      const result = await collection.updateOne(
        { type: truck.type },
        { 
          $set: { ...truck, updatedAt: new Date() },
          $setOnInsert: { createdAt: new Date(), active: true }
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
    console.error('Trucks API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};
