/**
 * Pricing Config API - Public endpoint for frontend to fetch pricing config
 * GET /api/pricing-config - Returns margins, trucking rates, minimums (no auth required)
 */

const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('gotrocks');
    const pricingConfigCollection = db.collection('pricing_config');

    // Get global pricing config
    let config = await pricingConfigCollection.findOne({ type: 'global' });

    // If no config exists, return defaults
    if (!config) {
      config = {
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
        }
      };
    }

    // Return only the config data needed by frontend (no sensitive info)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        trucking: config.trucking,
        margins: config.margins,
        minimums: config.minimums,
        fees: config.fees
      })
    };

  } catch (error) {
    console.error('Pricing Config API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  } finally {
    await client.close();
  }
};
