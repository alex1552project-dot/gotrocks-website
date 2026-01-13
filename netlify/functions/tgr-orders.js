const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('gotrocks');
    const ordersCollection = db.collection('tgr_orders');

    // Get query parameters
    const params = event.queryStringParameters || {};
    const period = params.period || 'today';

    // Calculate date range based on period
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case 'all':
        startDate = new Date(0);
        endDate = new Date(now.getFullYear() + 1, 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    }

    // Query orders within the date range
    // Only count orders with successful payment status
    const orders = await ordersCollection.find({
      createdAt: { $gte: startDate.toISOString(), $lt: endDate.toISOString() },
      paymentStatus: 'approved'
    }).sort({ createdAt: -1 }).toArray();

    // Calculate totals
    const totals = orders.reduce((acc, order) => {
      acc.revenue += order.total || 0;
      acc.count += 1;
      acc.volume += order.quantity || 0;
      
      // Count deliveries scheduled for today
      if (order.deliveryDate) {
        const deliveryDate = new Date(order.deliveryDate);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        if (deliveryDate >= today && deliveryDate < tomorrow) {
          acc.deliveries += 1;
        }
      }
      
      return acc;
    }, { revenue: 0, count: 0, volume: 0, deliveries: 0 });

    // Round revenue to 2 decimal places
    totals.revenue = Math.round(totals.revenue * 100) / 100;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        orders,
        totals
      })
    };

  } catch (error) {
    console.error('TGR Orders error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  } finally {
    await client.close();
  }
};
