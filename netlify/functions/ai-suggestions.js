const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');

const uri = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

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

// Call Claude API for AI suggestions
async function getClaudeSuggestion(prompt, systemPrompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt + '\n\nCRITICAL: Return ONLY valid JSON. No markdown, no backticks, no code blocks, no explanations before or after. Just the raw JSON object starting with { and ending with }.',
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  let text = data.content[0].text;
  
  // Clean up common JSON formatting issues
  text = text.trim();
  // Remove markdown code blocks if present
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  // Remove any leading/trailing whitespace again
  text = text.trim();
  
  return text;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Only owners can access AI suggestions
  const auth = verifyToken(event.headers.authorization, ['owner']);
  if (!auth.valid) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: auth.error }) };
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('gotrocks');
    
    const { type } = JSON.parse(event.body);

    // INVENTORY SUGGESTIONS
    if (type === 'inventory') {
      const inventory = await db.collection('inventory').aggregate([
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: 'id',
            as: 'product'
          }
        },
        { $unwind: '$product' }
      ]).toArray();

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentOrders = await db.collection('tgr_orders').find({
        createdAt: { $gte: thirtyDaysAgo.toISOString() },
        paymentStatus: 'approved'
      }).toArray();

      const systemPrompt = `You are an inventory management AI assistant for Texas Got Rocks, a construction aggregates delivery company in the Houston area. Analyze inventory levels and sales data to provide actionable recommendations. Be specific with numbers and prioritize by urgency.

Return your response as a JSON object with this exact structure:
{
  "alerts": [{ "severity": "high", "product": "Product Name", "message": "Alert message" }],
  "reorderSuggestions": [{ "product": "Product Name", "currentTons": 50, "suggestedOrder": 100, "reason": "Reason for suggestion" }],
  "demandInsights": ["Insight 1", "Insight 2"],
  "summary": "Brief overall assessment"
}`;

      const prompt = `Analyze this inventory and recent sales data:

CURRENT INVENTORY:
${inventory.map(i => `- ${i.productName}: ${i.quantity} tons (reorder point: ${i.reorderPoint} tons, weight: ${i.product.weight} tons/yd)`).join('\n')}

RECENT ORDERS (Last 30 Days):
${recentOrders.length > 0 ? recentOrders.map(o => `- ${o.product}: ${o.quantity} yards on ${o.createdAt.split('T')[0]}`).join('\n') : 'No orders yet'}

Current month: January (typically slower season). Provide inventory recommendations.`;

      const suggestion = await getClaudeSuggestion(prompt, systemPrompt);
      
      let parsed;
      try {
        parsed = JSON.parse(suggestion);
      } catch {
        parsed = { summary: suggestion, alerts: [], reorderSuggestions: [], demandInsights: [] };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ type: 'inventory', suggestions: parsed })
      };
    }

    // PRICING SUGGESTIONS
    if (type === 'pricing') {
      const products = await db.collection('products').find({ active: true }).toArray();
      const pricingConfig = await db.collection('pricing_config').findOne({ type: 'global' });
      
      const orders = await db.collection('tgr_orders').find({
        paymentStatus: 'approved'
      }).toArray();

      const systemPrompt = `You are a pricing strategy AI assistant for Texas Got Rocks, a construction aggregates delivery company competing against national services like HelloGravel in the Houston market. Their key differentiator is "always free delivery" (delivery cost bundled into material price). Analyze pricing data and provide recommendations.

Return your response as a JSON object with this exact structure:
{
  "priceAdjustments": [{ "product": "Product Name", "currentPrice": 50, "suggestedPrice": 55, "reason": "Reason for adjustment" }],
  "marginInsights": ["Insight 1", "Insight 2"],
  "competitiveNotes": ["Note 1", "Note 2"],
  "summary": "Brief overall assessment"
}`;

      const prompt = `Analyze pricing for Texas Got Rocks:

CURRENT PRODUCT PRICES (per yard):
${products.map(p => `- ${p.name} (${p.category}): $${p.price}/yd, weight: ${p.weight} tons/yd`).join('\n')}

TRUCKING RATES:
- Tandem: $${pricingConfig?.trucking?.tandemRate || 100}/hr
- End Dump: $${pricingConfig?.trucking?.endDumpRate || 130}/hr

MARGINS:
- Small orders (2-2.99 yds): ${(pricingConfig?.margins?.small || 0.30) * 100}%
- Standard (3+ yds): ${(pricingConfig?.margins?.standard || 0.20) * 100}%

SALES VOLUME: ${orders.length} orders total

Provide pricing optimization recommendations considering local market competition and seasonal demand.`;

      const suggestion = await getClaudeSuggestion(prompt, systemPrompt);
      
      let parsed;
      try {
        parsed = JSON.parse(suggestion);
      } catch {
        parsed = { summary: suggestion, priceAdjustments: [], marginInsights: [], competitiveNotes: [] };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ type: 'pricing', suggestions: parsed })
      };
    }

    // LOGISTICS SUGGESTIONS
    if (type === 'logistics') {
      const { deliveries } = JSON.parse(event.body);
      
      const trucks = await db.collection('trucks').find({ active: true }).toArray();
      
      let pendingDeliveries = deliveries;
      if (!pendingDeliveries) {
        const today = new Date().toISOString().split('T')[0];
        pendingDeliveries = await db.collection('tgr_orders').find({
          deliveryDate: today,
          paymentStatus: 'approved',
          status: { $ne: 'delivered' }
        }).toArray();
      }

      const systemPrompt = `You are a logistics optimization AI for Texas Got Rocks, a delivery company based in Conroe, TX serving the Greater Houston area. Optimize delivery routes considering: ZIP code clustering, truck capacity (tandem vs end dump), Houston traffic patterns, and delivery time windows.

Return your response as a JSON object with this exact structure:
{
  "optimizedRoute": [{ "order": 1, "delivery": "Customer/Address", "reason": "Why this order" }],
  "truckAssignments": [{ "truck": "Truck Name", "deliveries": ["Delivery 1", "Delivery 2"], "totalTons": 10 }],
  "timeEstimate": "X hours",
  "fuelSavings": "Estimated savings description",
  "warnings": ["Any concerns"],
  "summary": "Brief route overview"
}`;

      const prompt = `Optimize today's deliveries for Texas Got Rocks (based in Conroe, TX):

AVAILABLE TRUCKS:
${trucks.map(t => `- ${t.name}: ${t.type}, capacity ${t.capacity} tons`).join('\n') || 'Tandem (standard), End Dump (heavy loads)'}

PENDING DELIVERIES:
${pendingDeliveries.length > 0 ? pendingDeliveries.map(d => `- ${d.customer?.name || 'Customer'}: ${d.quantity} yds ${d.product} to ${d.customer?.address || d.deliveryZip}`).join('\n') : 'No deliveries scheduled'}

Consider: Morning Houston traffic (avoid I-45 south 7-9am), ZIP code clustering, and truck capacity optimization.`;

      const suggestion = await getClaudeSuggestion(prompt, systemPrompt);
      
      let parsed;
      try {
        parsed = JSON.parse(suggestion);
      } catch {
        parsed = { summary: suggestion, optimizedRoute: [], truckAssignments: [], warnings: [] };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ type: 'logistics', suggestions: parsed })
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid suggestion type. Use: inventory, pricing, or logistics' }) };

  } catch (error) {
    console.error('AI Suggestions API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  } finally {
    await client.close();
  }
};
