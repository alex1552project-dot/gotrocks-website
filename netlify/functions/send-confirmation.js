// /netlify/functions/send-confirmation.js
// Sends order confirmation via Email and SMS using Brevo

const fetch = require('node-fetch');

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_EMAIL_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_SMS_URL = 'https://api.brevo.com/v3/transactionalSMS/sms';

// Format phone number to E.164 format (required by Brevo)
function formatPhone(phone) {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  // Add US country code if not present
  if (digits.length === 10) {
    return '1' + digits;
  }
  return digits;
}

// Format date for display
function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

// Build email HTML content
function buildEmailHTML(order) {
  const deliveryWindow = order.precisionDelivery 
    ? order.precisionWindowLabel 
    : order.deliveryWindow;
  
  const precisionBadge = order.precisionDelivery 
    ? '<span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">PRECISION DELIVERY</span>' 
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #d97706; margin: 0;">🪨 Texas Got Rocks</h1>
    <p style="color: #666; margin: 5px 0;">Order Confirmation</p>
  </div>

  <div style="background: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h2 style="color: #10b981; margin: 0 0 10px 0;">✓ Order Confirmed!</h2>
    <p style="margin: 0; font-size: 18px;"><strong>Order ID:</strong> ${order.orderId}</p>
  </div>

  <div style="background: #fefce8; border: 1px solid #eab308; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h3 style="margin: 0 0 15px 0; color: #854d0e;">📅 Delivery Details ${precisionBadge}</h3>
    <p style="margin: 5px 0;"><strong>Date:</strong> ${formatDate(order.deliveryDate)}</p>
    <p style="margin: 5px 0;"><strong>Time Window:</strong> ${deliveryWindow}</p>
    <p style="margin: 5px 0;"><strong>Address:</strong><br>${order.address}</p>
  </div>

  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h3 style="margin: 0 0 15px 0; color: #334155;">📦 Order Summary</h3>
    <table style="width: 100%; border-collapse: collapse;">
      ${order.items.map(item => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${item.name}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">${item.quantity} ${item.unit || 'tons'}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">$${item.total.toFixed(2)}</td>
        </tr>
      `).join('')}
    </table>
    
    <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #e2e8f0;">
      <p style="margin: 5px 0; display: flex; justify-content: space-between;">
        <span>Subtotal:</span> <strong>$${order.subtotal.toFixed(2)}</strong>
      </p>
      <p style="margin: 5px 0; display: flex; justify-content: space-between;">
        <span>Delivery:</span> <strong>FREE</strong>
      </p>
      ${order.precisionDelivery ? `
      <p style="margin: 5px 0; display: flex; justify-content: space-between;">
        <span>Precision Delivery:</span> <strong>$50.00</strong>
      </p>
      ` : ''}
      <p style="margin: 5px 0; display: flex; justify-content: space-between;">
        <span>Tax (8.25%):</span> <strong>$${order.tax.toFixed(2)}</strong>
      </p>
      <p style="margin: 5px 0; display: flex; justify-content: space-between;">
        <span>Service Fee (3.5%):</span> <strong>$${order.serviceFee.toFixed(2)}</strong>
      </p>
      <p style="margin: 15px 0 0 0; font-size: 20px; display: flex; justify-content: space-between;">
        <span><strong>Total:</strong></span> <strong style="color: #10b981;">$${order.total.toFixed(2)}</strong>
      </p>
    </div>
  </div>

  <div style="background: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h3 style="margin: 0 0 10px 0; color: #1e40af;">📞 Questions?</h3>
    <p style="margin: 0;">Call us at <a href="tel:9365551234" style="color: #3b82f6;">(936) 555-1234</a></p>
    <p style="margin: 5px 0 0 0;">Email: <a href="mailto:info@texasgotrocks.com" style="color: #3b82f6;">info@texasgotrocks.com</a></p>
  </div>

  <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
    <p>Texas Got Rocks - Premium Landscaping Materials</p>
    <p>Serving the Greater Houston Area</p>
  </div>

</body>
</html>
  `;
}

// Build SMS content (160 char limit for single SMS)
function buildSMSContent(order) {
  const deliveryWindow = order.precisionDelivery 
    ? order.precisionWindowLabel 
    : order.deliveryWindow;
  
  const dateShort = new Date(order.deliveryDate + 'T00:00:00')
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  return `Texas Got Rocks: Order ${order.orderId} confirmed! Delivery ${dateShort} ${deliveryWindow}. Total: $${order.total.toFixed(2)}. Questions? (936) 555-1234`;
}

// Send email via Brevo
async function sendEmail(order) {
  const response = await fetch(BREVO_EMAIL_URL, {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      sender: { 
        name: 'Texas Got Rocks', 
        email: 'info@texasgotrocks.com' 
      },
      to: [{ 
        email: order.email, 
        name: order.customerName 
      }],
      subject: `Order Confirmed - ${order.orderId}`,
      htmlContent: buildEmailHTML(order)
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Email failed: ${error}`);
  }

  return await response.json();
}

// Send SMS via Brevo
async function sendSMS(order) {
  const response = await fetch(BREVO_SMS_URL, {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      sender: 'TXGotRocks', // Max 11 chars for alphanumeric sender
      recipient: formatPhone(order.phone),
      content: buildSMSContent(order),
      type: 'transactional'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SMS failed: ${error}`);
  }

  return await response.json();
}

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const order = JSON.parse(event.body);

    // Validate required fields
    const required = ['orderId', 'customerName', 'email', 'phone', 'address', 
                      'deliveryDate', 'deliveryWindow', 'items', 'subtotal', 
                      'tax', 'serviceFee', 'total'];
    
    for (const field of required) {
      if (!order[field]) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Missing required field: ${field}` })
        };
      }
    }

    const results = {
      email: null,
      sms: null,
      errors: []
    };

    // Send email
    try {
      results.email = await sendEmail(order);
      console.log('Email sent successfully:', results.email);
    } catch (err) {
      console.error('Email error:', err.message);
      results.errors.push({ type: 'email', message: err.message });
    }

    // Send SMS
    try {
      results.sms = await sendSMS(order);
      console.log('SMS sent successfully:', results.sms);
    } catch (err) {
      console.error('SMS error:', err.message);
      results.errors.push({ type: 'sms', message: err.message });
    }

    // Return results
    const success = results.email || results.sms;
    
    return {
      statusCode: success ? 200 : 500,
      headers,
      body: JSON.stringify({
        success,
        message: success 
          ? 'Confirmation sent' 
          : 'Failed to send confirmations',
        results
      })
    };

  } catch (err) {
    console.error('Handler error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
