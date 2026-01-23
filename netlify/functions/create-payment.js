// netlify/functions/create-payment.js
// Texas Got Rocks - Square Payment Processing
// Handles both credit card and ACH payments

const { Client, Environment } = require('square');
const { MongoClient, ObjectId } = require('mongodb');

// Initialize Square client
const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.SQUARE_ENVIRONMENT === 'production' 
    ? Environment.Production 
    : Environment.Sandbox
});

// MongoDB connection
let cachedDb = null;
async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  cachedDb = client.db('gotrocks');
  return cachedDb;
}

// Generate order number
function generateOrderNumber() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TGR-${dateStr}-${random}`;
}

// Send notification via Brevo
async function sendNotification(type, data) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) {
    console.log('Brevo API key not configured, skipping notification');
    return;
  }

  try {
    // Customer confirmation email
    if (type === 'order_confirmation' || type === 'ach_initiated') {
      const subject = type === 'ach_initiated' 
        ? `Order ${data.orderNumber} - Payment Processing`
        : `Order ${data.orderNumber} - Confirmed!`;
      
      const htmlContent = `
        <h2>Thank you for your order, ${data.customer.name}!</h2>
        <p><strong>Order Number:</strong> ${data.orderNumber}</p>
        <p><strong>Status:</strong> ${type === 'ach_initiated' ? 'Payment Processing (2-3 business days)' : 'Confirmed'}</p>
        <h3>Order Details:</h3>
        <ul>
          ${data.items.map(item => `<li>${item.quantity} yd³ ${item.product} - $${item.total.toFixed(2)}</li>`).join('')}
        </ul>
        <p><strong>Total:</strong> $${data.totals.total.toFixed(2)}</p>
        <p><strong>Delivery Date:</strong> ${new Date(data.delivery.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <p><strong>Delivery Address:</strong><br>${data.customer.address}<br>${data.customer.city}, TX ${data.customer.zip}</p>
        <hr>
        <p>Questions? Call or text us at (936) 259-2887</p>
        <p>- The Texas Got Rocks Team</p>
      `;

      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'Texas Got Rocks', email: 'orders@texasgotrocks.com' },
          to: [{ email: data.customer.email, name: data.customer.name }],
          subject: subject,
          htmlContent: htmlContent
        })
      });
    }

    // Internal notification to Tina
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'TGR Website', email: 'orders@texasgotrocks.com' },
        to: [
          { email: 'tina@tcmaterialsllc.com', name: 'Tina Pelletier' },
          { email: 'marisa@tcmaterialsllc.com', name: 'Marisa' }
        ],
        subject: `🆕 New Order ${data.orderNumber} - $${data.totals.total.toFixed(2)}`,
        htmlContent: `
          <h2>New Online Order!</h2>
          <p><strong>Order Number:</strong> ${data.orderNumber}</p>
          <p><strong>Payment Method:</strong> ${data.payment.method.toUpperCase()}</p>
          <p><strong>Payment Status:</strong> ${data.payment.status}</p>
          <h3>Customer:</h3>
          <p>${data.customer.name}<br>
          ${data.customer.email}<br>
          ${data.customer.phone}<br>
          ${data.customer.address}<br>
          ${data.customer.city}, TX ${data.customer.zip}</p>
          <h3>Order:</h3>
          <ul>
            ${data.items.map(item => `<li>${item.quantity} yd³ ${item.product} - $${item.total.toFixed(2)}</li>`).join('')}
          </ul>
          <p><strong>Total:</strong> $${data.totals.total.toFixed(2)}</p>
          <p><strong>Requested Delivery:</strong> ${new Date(data.delivery.scheduledDate).toLocaleDateString()}</p>
        `
      })
    });

    // SMS notification if phone provided
    if (data.customer.phone) {
      const smsText = type === 'ach_initiated'
        ? `Texas Got Rocks: Order ${data.orderNumber} received! Your bank payment is processing (2-3 days). We'll confirm when cleared. Questions? (936) 259-2887`
        : `Texas Got Rocks: Order ${data.orderNumber} confirmed! $${data.totals.total.toFixed(2)} for delivery on ${new Date(data.delivery.scheduledDate).toLocaleDateString()}. We'll text tracking info. Questions? (936) 259-2887`;

      await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: 'TXGotRocks',
          recipient: data.customer.phone.replace(/\D/g, ''),
          content: smsText
        })
      });
    }

    console.log('Notifications sent successfully');
  } catch (error) {
    console.error('Error sending notification:', error);
    // Don't throw - notification failure shouldn't fail the payment
  }
}

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }) 
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { 
      sourceId,           // Payment token from Square Web Payments SDK
      paymentMethod,      // 'card' or 'ach'
      customer,           // { name, email, phone, address, city, zip }
      items,              // [{ product, productId, quantity, tons, pricePerTon, total }]
      totals,             // { subtotal, salesTax, serviceFee, total }
      delivery            // { scheduledDate, zone, distance }
    } = body;

    // Validate required fields
    if (!sourceId || !customer || !items || !totals) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Convert total to cents for Square (they use smallest currency unit)
    const amountCents = Math.round(totals.total * 100);

    // Create payment with Square
    const paymentsApi = squareClient.paymentsApi;
    
    const paymentRequest = {
      sourceId: sourceId,
      idempotencyKey: `${orderNumber}-${Date.now()}`,
      amountMoney: {
        amount: BigInt(amountCents),
        currency: 'USD'
      },
      locationId: process.env.SQUARE_LOCATION_ID,
      referenceId: orderNumber,
      note: `Texas Got Rocks Order ${orderNumber}`,
      buyerEmailAddress: customer.email
    };

    // For ACH, we need to set autocomplete to false to handle delayed settlement
    if (paymentMethod === 'ach') {
      paymentRequest.autocomplete = false;
      paymentRequest.acceptPartialAuthorization = false;
    }

    console.log('Creating Square payment:', { orderNumber, amount: amountCents, method: paymentMethod });

    const { result } = await paymentsApi.createPayment(paymentRequest);
    const payment = result.payment;

    console.log('Square payment created:', { 
      paymentId: payment.id, 
      status: payment.status 
    });

    // Determine order status based on payment method and result
    let orderStatus;
    let paymentStatus;

    if (paymentMethod === 'ach') {
      // ACH payments are pending until they clear (2-3 days)
      orderStatus = 'pending_ach_clearance';
      paymentStatus = 'pending';
    } else {
      // Card payments complete immediately
      if (payment.status === 'COMPLETED') {
        orderStatus = 'paid';
        paymentStatus = 'completed';
      } else if (payment.status === 'APPROVED') {
        orderStatus = 'paid';
        paymentStatus = 'completed';
      } else {
        orderStatus = 'pending_payment';
        paymentStatus = 'pending';
      }
    }

    // Save order to MongoDB
    const db = await connectToDatabase();
    const orderDoc = {
      orderNumber,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone || null,
        address: customer.address,
        city: customer.city,
        zip: customer.zip
      },
      items: items.map(item => ({
        product: item.product,
        productId: item.productId,
        quantity: item.quantity,
        tons: item.tons,
        pricePerTon: item.pricePerTon,
        total: item.total
      })),
      totals: {
        subtotal: totals.subtotal,
        salesTax: totals.salesTax,
        serviceFee: totals.serviceFee,
        total: totals.total
      },
      delivery: {
        scheduledDate: new Date(delivery.scheduledDate),
        zone: delivery.zone || 1,
        distance: delivery.distance || 0,
        status: 'pending'
      },
      payment: {
        method: paymentMethod,
        status: paymentStatus,
        squarePaymentId: payment.id,
        squareOrderId: payment.orderId || null,
        completedAt: paymentStatus === 'completed' ? new Date() : null,
        receiptUrl: payment.receiptUrl || null,
        failureReason: null
      },
      status: orderStatus,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const insertResult = await db.collection('orders').insertOne(orderDoc);
    console.log('Order saved to MongoDB:', insertResult.insertedId);

    // Send notifications
    const notificationType = paymentMethod === 'ach' ? 'ach_initiated' : 'order_confirmation';
    await sendNotification(notificationType, orderDoc);

    // If card payment completed, update inventory
    if (paymentStatus === 'completed') {
      try {
        for (const item of items) {
          await db.collection('inventory').updateOne(
            { productId: item.productId },
            { 
              $inc: { currentStock: -item.tons },
              $set: { updatedAt: new Date() }
            }
          );
        }
        console.log('Inventory updated for completed payment');
      } catch (invError) {
        console.error('Error updating inventory:', invError);
        // Don't fail the order for inventory issues
      }
    }

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        orderNumber,
        orderId: insertResult.insertedId.toString(),
        paymentId: payment.id,
        paymentStatus: paymentStatus,
        orderStatus: orderStatus,
        receiptUrl: payment.receiptUrl || null,
        message: paymentMethod === 'ach' 
          ? 'Order received! Your bank payment will clear in 2-3 business days.'
          : 'Payment successful! Your order is confirmed.'
      })
    };

  } catch (error) {
    console.error('Payment error:', error);

    // Handle Square-specific errors
    if (error.errors) {
      const squareError = error.errors[0];
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: squareError.detail || 'Payment failed',
          code: squareError.code
        })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'An error occurred processing your payment. Please try again.'
      })
    };
  }
};
