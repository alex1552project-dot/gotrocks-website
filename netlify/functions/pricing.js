/**
 * Pricing Calculator API
 * POST /api/pricing - Calculate delivery price
 */

const { connectToDatabase } = require('./utils/mongodb');

exports.handler = async (event, context) => {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Method not allowed. Use POST.' }) };
  }

  try {
    const { db } = await connectToDatabase();
    const body = JSON.parse(event.body || '{}');

    // Load settings
    const settingsDocs = await db.collection('settings').find({}).toArray();
    const settings = {};
    settingsDocs.forEach(s => { settings[s.setting] = s.value; });

    // Load trucks
    const trucks = await db.collection('trucks').find({ active: true }).toArray();
    const trucksByType = {};
    trucks.forEach(t => { trucksByType[t.type] = t; });

    // Config with defaults
    const config = {
      margin: settings['Global Margin'] || 20,
      salesTax: 8.25,
      serviceFee: 3.5,
      loadTime: settings['Load Time'] || 5,
      dumpTime: settings['Dump Time'] || 5,
      tandemThreshold: settings['Tandem Threshold'] || 15,
      maxOnlineOrder: 48,
      tandem: trucksByType['Tandem'] || { hourly_rate: 100, capacity_tons: 15 },
      endDump: trucksByType['End Dump'] || { hourly_rate: 130, capacity_tons: 24 },
    };

    // Get input values
    let pricePerTon, weight, cubicYards, travelTime;

    if (body.productId) {
      const product = await db.collection('products').findOne({ $or: [{ id: body.productId }, { _id: body.productId }] });
      if (!product) {
        return { statusCode: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Product not found' }) };
      }
      pricePerTon = product.price;
      weight = product.weight;
    } else {
      pricePerTon = parseFloat(body.pricePerTon);
      weight = parseFloat(body.weight) || 1.4;
    }

    cubicYards = parseFloat(body.cubicYards);
    if (!cubicYards || cubicYards <= 0) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'cubicYards is required' }) };
    }

    if (body.zip) {
      const zone = await db.collection('zones').findOne({ zip: body.zip });
      if (!zone) {
        return { statusCode: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'ZIP code not in service area', zip: body.zip }) };
      }
      travelTime = zone.travel_time;
    } else if (body.travelTime !== undefined) {
      travelTime = parseInt(body.travelTime);
    } else {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Either zip or travelTime is required' }) };
    }

    // Calculate
    const tons = cubicYards * weight;
    const baseMaterial = tons * pricePerTon;
    const truckConfig = selectTrucks(tons, config);
    const tripTime = config.loadTime + travelTime + config.dumpTime;
    const trips = Math.ceil(tons / truckConfig.totalCapacity);
    const totalTripMinutes = tripTime * trips;
    const calculatedDelivery = (totalTripMinutes / 60) * truckConfig.hourlyRate;
    const actualDelivery = Math.max(calculatedDelivery, truckConfig.minimumCharge);
    const subtotal = baseMaterial + actualDelivery;
    const withMargin = subtotal * (1 + config.margin / 100);
    const salesTax = baseMaterial * (config.salesTax / 100);
    const serviceFee = (withMargin + salesTax) * (config.serviceFee / 100);
    const total = withMargin + salesTax + serviceFee;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        input: { cubicYards, pricePerTon, weight, travelTime, zip: body.zip || null, productId: body.productId || null },
        calculation: {
          tons: Math.round(tons * 100) / 100,
          trips,
          truckConfig: truckConfig.description,
          breakdown: {
            baseMaterial: Math.round(baseMaterial * 100) / 100,
            delivery: Math.round(actualDelivery * 100) / 100,
            subtotal: Math.round(subtotal * 100) / 100,
            margin: Math.round((withMargin - subtotal) * 100) / 100,
            salesTax: Math.round(salesTax * 100) / 100,
            serviceFee: Math.round(serviceFee * 100) / 100,
          },
          total: Math.round(total * 100) / 100,
          displayTotal: Math.ceil(total),
        },
      }),
    };
  } catch (error) {
    console.error('Pricing API error:', error);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Internal server error', details: error.message }) };
  }
};

function selectTrucks(tons, config) {
  const tandem = config.tandem;
  const endDump = config.endDump;
  
  if (tons <= 15) {
    return { description: '1 Tandem', totalCapacity: 15, hourlyRate: tandem.hourly_rate, minimumCharge: 75 };
  } else if (tons <= 24) {
    return { description: '1 End Dump', totalCapacity: 24, hourlyRate: endDump.hourly_rate, minimumCharge: 100 };
  } else if (tons <= 30) {
    return { description: '2 Tandems', totalCapacity: 30, hourlyRate: tandem.hourly_rate * 2, minimumCharge: 150 };
  } else if (tons <= 39) {
    return { description: '1 End Dump + 1 Tandem', totalCapacity: 39, hourlyRate: endDump.hourly_rate + tandem.hourly_rate, minimumCharge: 175 };
  } else {
    return { description: '2 End Dumps', totalCapacity: 48, hourlyRate: endDump.hourly_rate * 2, minimumCharge: 200 };
  }
}
