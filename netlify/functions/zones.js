/**
 * Zones API - ZIP Code Delivery Zones
 * GET /api/zones - List all zones
 * GET /api/zones?zip=77385 - Get zone for specific ZIP
 * POST /api/zones - Create/update zone(s)
 */

const { connectToDatabase } = require('./utils/mongodb');

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('zones');
    const params = event.queryStringParameters || {};

    switch (event.httpMethod) {
      case 'GET': {
        // Get zone for specific ZIP
        if (params.zip) {
          const zone = await collection.findOne({ zip: params.zip });
          if (!zone) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'ZIP code not in service area', zip: params.zip }),
            };
          }
          return { statusCode: 200, headers, body: JSON.stringify(zone) };
        }

        // Get by city
        if (params.city) {
          const zones = await collection.find({ city: { $regex: params.city, $options: 'i' } }).sort({ zip: 1 }).toArray();
          return { statusCode: 200, headers, body: JSON.stringify({ count: zones.length, zones }) };
        }

        // Get by zone number
        if (params.zone) {
          const zones = await collection.find({ zone: parseInt(params.zone) }).sort({ zip: 1 }).toArray();
          return { statusCode: 200, headers, body: JSON.stringify({ count: zones.length, zones }) };
        }

        // Get all zones
        const zones = await collection.find({}).sort({ zone: 1, zip: 1 }).toArray();
        
        // Group summary
        const summary = { 1: 0, 2: 0, 3: 0 };
        zones.forEach(z => { if (summary[z.zone] !== undefined) summary[z.zone]++; });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ totalZips: zones.length, summary, zones }),
        };
      }

      case 'POST': {
        const body = JSON.parse(event.body || '{}');

        // Single zone
        if (body.zip) {
          const zone = {
            zip: body.zip,
            city: body.city || '',
            distance: body.distance || 0,
            travel_time: parseInt(body.travel_time || body.time || 0),
            zone: body.zone || (body.travel_time <= 25 ? 1 : body.travel_time <= 45 ? 2 : 3),
            active: true,
            updatedAt: new Date(),
          };

          await collection.updateOne(
            { zip: body.zip },
            { $set: zone, $setOnInsert: { createdAt: new Date() } },
            { upsert: true }
          );

          return { statusCode: 201, headers, body: JSON.stringify(zone) };
        }

        // Bulk import
        if (body.zones && Array.isArray(body.zones)) {
          const operations = body.zones.map(z => ({
            updateOne: {
              filter: { zip: z.zip },
              update: {
                $set: {
                  zip: z.zip,
                  city: z.city || '',
                  distance: z.distance || 0,
                  travel_time: parseInt(z.travel_time || z.time || 0),
                  zone: z.zone || 3,
                  active: true,
                  updatedAt: new Date(),
                },
                $setOnInsert: { createdAt: new Date() },
              },
              upsert: true,
            },
          }));

          const result = await collection.bulkWrite(operations);
          return {
            statusCode: 201,
            headers,
            body: JSON.stringify({ message: 'Zones imported', inserted: result.upsertedCount, modified: result.modifiedCount }),
          };
        }

        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) };
      }

      case 'DELETE': {
        if (!params.zip) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'ZIP required' }) };
        }
        await collection.deleteOne({ zip: params.zip });
        return { statusCode: 200, headers, body: JSON.stringify({ message: 'Deleted', zip: params.zip }) };
      }

      default:
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
  } catch (error) {
    console.error('Zones API error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error', details: error.message }) };
  }
};
