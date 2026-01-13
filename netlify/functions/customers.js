/**
 * Customers API (CRM)
 * GET /api/customers - List all customers
 * GET /api/customers?id=xxx - Get single customer
 * GET /api/customers?search=xxx - Search by name/contact
 * POST /api/customers - Create new customer
 * PUT /api/customers - Update customer
 */

const { connectToDatabase } = require('./utils/mongodb');
const { ObjectId } = require('mongodb');

exports.handler = async (event, context) => {
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
    const collection = db.collection('customers');
    const params = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};

    switch (event.httpMethod) {
      case 'GET': {
        // Get single customer
        if (params.id) {
          let filter;
          try { filter = { _id: new ObjectId(params.id) }; } catch { filter = { customerId: params.id }; }
          const customer = await collection.findOne(filter);
          if (!customer) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: 'Customer not found' }) };
          }
          return { statusCode: 200, headers, body: JSON.stringify(customer) };
        }

        // Build filter
        const filter = {};

        if (params.search) {
          filter.$or = [
            { name: { $regex: params.search, $options: 'i' } },
            { contact: { $regex: params.search, $options: 'i' } },
            { email: { $regex: params.search, $options: 'i' } },
            { phone: { $regex: params.search, $options: 'i' } },
          ];
        }

        if (params.type) filter.type = params.type;
        if (params.status) filter.status = params.status;
        if (params.city) filter.city = { $regex: params.city, $options: 'i' };

        const customers = await collection.find(filter).sort({ totalSpend: -1, name: 1 }).toArray();

        const stats = {
          total: customers.length,
          contractors: customers.filter(c => c.type === 'contractor').length,
          homeowners: customers.filter(c => c.type === 'homeowner').length,
          commercial: customers.filter(c => c.type === 'commercial').length,
          totalRevenue: customers.reduce((sum, c) => sum + (c.totalSpend || 0), 0),
        };

        return { statusCode: 200, headers, body: JSON.stringify({ stats, customers }) };
      }

      case 'POST': {
        if (!body.name) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Customer name is required' }) };
        }

        const count = await collection.countDocuments();
        const customerId = `CUST-${String(count + 1).padStart(5, '0')}`;

        const customer = {
          customerId,
          name: body.name,
          contact: body.contact || '',
          phone: body.phone || '',
          email: body.email || '',
          type: body.type || 'homeowner',
          status: body.status || 'active',
          address: body.address || '',
          city: body.city || '',
          state: body.state || 'TX',
          zip: body.zip || '',
          company: body.company || '',
          notes: body.notes || '',
          source: body.source || 'direct',
          totalOrders: 0,
          totalSpend: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await collection.insertOne(customer);
        return { statusCode: 201, headers, body: JSON.stringify(customer) };
      }

      case 'PUT': {
        if (!body.id && !body._id && !body.customerId) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Customer ID is required' }) };
        }

        let filter;
        if (body._id || body.id) {
          try { filter = { _id: new ObjectId(body._id || body.id) }; } catch { filter = { customerId: body._id || body.id }; }
        } else {
          filter = { customerId: body.customerId };
        }

        const update = { updatedAt: new Date() };
        const fields = ['name', 'contact', 'phone', 'email', 'type', 'status', 'address', 'city', 'state', 'zip', 'company', 'notes', 'source'];
        fields.forEach(f => { if (body[f] !== undefined) update[f] = body[f]; });

        const result = await collection.findOneAndUpdate(filter, { $set: update }, { returnDocument: 'after' });
        if (!result) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Customer not found' }) };
        }
        return { statusCode: 200, headers, body: JSON.stringify(result) };
      }

      case 'DELETE': {
        if (!params.id) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Customer ID is required' }) };
        }

        let filter;
        try { filter = { _id: new ObjectId(params.id) }; } catch { filter = { customerId: params.id }; }

        const result = await collection.findOneAndUpdate(filter, { $set: { status: 'inactive', updatedAt: new Date() } }, { returnDocument: 'after' });
        if (!result) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Customer not found' }) };
        }
        return { statusCode: 200, headers, body: JSON.stringify({ message: 'Customer deactivated', customer: result }) };
      }

      default:
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
  } catch (error) {
    console.error('Customers API error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error', details: error.message }) };
  }
};
