const { connectToDatabase, headers, handleOptions } = require('./utils/db');

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('settings');

    // GET - Retrieve all settings
    if (event.httpMethod === 'GET') {
      const settings = await collection.find({}).toArray();
      
      // Convert to object format
      const settingsObj = {};
      settings.forEach(s => {
        settingsObj[s.setting] = s.value;
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(settingsObj)
      };
    }

    // POST - Update a setting (admin only)
    if (event.httpMethod === 'POST') {
      const { setting, value } = JSON.parse(event.body);
      
      if (!setting || value === undefined) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing required fields: setting, value' })
        };
      }

      const result = await collection.updateOne(
        { setting },
        { 
          $set: { value, updatedAt: new Date() },
          $setOnInsert: { createdAt: new Date() }
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
    console.error('Settings API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};
