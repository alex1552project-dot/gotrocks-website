// netlify/functions/commissions.js
// Texas Got Rocks - Sales Commission API
// GET commissions by date range, grouped by material

const { MongoClient } = require('mongodb');
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

// Get date range boundaries
function getDateRange(period) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (period) {
    case 'today':
      return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
    case 'week':
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // Sunday
      return { start: weekStart, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
    case 'month':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: monthStart, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
    case 'ytd':
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return { start: yearStart, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
    default:
      return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
  }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const client = new MongoClient(uri);

  try {
    // Only owners and sales can view commissions
    const auth = verifyToken(event.headers.authorization, ['owner', 'sales', 'admin']);
    if (!auth.valid) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: auth.error }) };
    }

    await client.connect();
    const db = client.db('gotrocks');
    const commissionsCollection = db.collection('commissions');

    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      const period = params.period || 'month';
      const salesperson = params.salesperson || 'alex.saplala';
      const format = params.format || 'json';

      // Build date filter
      const { start, end } = getDateRange(period);
      
      const query = {
        salesperson,
        paidAt: { $gte: start, $lt: end }
      };

      // Get all commissions in range
      const commissions = await commissionsCollection
        .find(query)
        .sort({ paidAt: -1 })
        .toArray();

      // Calculate totals
      const totalCommission = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
      const totalSales = commissions.reduce((sum, c) => sum + c.commissionBase, 0);
      const orderCount = commissions.length;

      // Group by material type
      const materialTotals = {};
      commissions.forEach(c => {
        (c.materialBreakdown || []).forEach(m => {
          const name = m.name || 'Unknown Material';
          if (!materialTotals[name]) {
            materialTotals[name] = { sales: 0, commission: 0, orders: 0 };
          }
          materialTotals[name].sales += m.amount || 0;
          materialTotals[name].commission += (m.amount || 0) * c.commissionRate;
          materialTotals[name].orders += 1;
        });
      });

      // Convert to array and sort by commission desc
      const byMaterial = Object.entries(materialTotals)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.commission - a.commission);

      // Get period totals for all periods (for dashboard display)
      const periods = ['today', 'week', 'month', 'ytd'];
      const periodTotals = {};
      
      for (const p of periods) {
        const { start: pStart, end: pEnd } = getDateRange(p);
        const periodCommissions = await commissionsCollection
          .find({
            salesperson,
            paidAt: { $gte: pStart, $lt: pEnd }
          })
          .toArray();
        
        periodTotals[p] = {
          commission: periodCommissions.reduce((sum, c) => sum + c.commissionAmount, 0),
          sales: periodCommissions.reduce((sum, c) => sum + c.commissionBase, 0),
          orders: periodCommissions.length
        };
      }

      // CSV export
      if (format === 'csv') {
        const csvRows = [
          'Order Number,Customer,Materials,Freight,Commission Base,Commission,Date'
        ];
        commissions.forEach(c => {
          csvRows.push([
            c.orderNumber,
            `"${c.customerName || ''}"`,
            c.materialsAmount.toFixed(2),
            c.freightAmount.toFixed(2),
            c.commissionBase.toFixed(2),
            c.commissionAmount.toFixed(2),
            new Date(c.paidAt).toLocaleDateString()
          ].join(','));
        });

        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="commissions-${period}-${new Date().toISOString().split('T')[0]}.csv"`
          },
          body: csvRows.join('\n')
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          period,
          salesperson,
          dateRange: { start, end },
          summary: {
            totalCommission,
            totalSales,
            orderCount,
            commissionRate: 0.03
          },
          periodTotals,
          byMaterial,
          commissions: commissions.map(c => ({
            orderNumber: c.orderNumber,
            customerName: c.customerName,
            materialsAmount: c.materialsAmount,
            freightAmount: c.freightAmount,
            commissionBase: c.commissionBase,
            commissionAmount: c.commissionAmount,
            paidAt: c.paidAt
          }))
        })
      };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (error) {
    console.error('Commissions API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  } finally {
    await client.close();
  }
};
