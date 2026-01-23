// netlify/functions/square-webhook.js
// Texas Got Rocks - Square Webhook Handler
// Processes payment.completed events for ACH payments

const crypto = require('crypto');
const { MongoClient, ObjectId } = require('mongodb');

// MongoDB connection
let cachedDb = null;
async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  cachedDb = client.db('gotrocks');
  return cachedDb;
}

// Verify Square webhook signature
function verifyWebhookSignature(body, signature, signatureKey) {
  if (!signatureKey) {
    console.log('No webhook signature key configured, skipping verification');
    return true; // Skip verification if no key (development)
  }

  const hmac = crypto.createHmac('sha256', signatureKey);
  hmac.update(body);
  const expectedSignature = hmac.digest('base64');
  
  return signature === expectedSignature;
}

// Send notification via Brevo
async function sendNotification(type, data) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) return;

  try {
    if (type === 'ach_completed') {
      // Customer notification - payment cleared
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
          subject: `Order ${data.orderNumber} - Payment Confirmed! ✓`,
          htmlContent: `
            <h2>Great news, ${data.customer.name}!</h2>
            <p>Your bank payment has cleared and your order is now confirmed.</p>
            <p><strong>Order Number:</strong> ${data.orderNumber}</p>
            <p><strong>Total:</strong> $${data.totals.total.toFixed(2)}</p>
            <p><strong>Delivery Date:</strong> ${new Date(data.delivery.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <p>We'll send you tracking information when your delivery is on its way!</p>
            <hr>
            <p>Questions? Call or text us at (936) 259-2887</p>
            <p>- The Texas Got Rocks Team</p>
          `
        })
      });

      // SMS if phone available
      if (data.customer.phone) {
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
            content: `Texas Got Rocks: Payment confirmed for order ${data.orderNumber}! Your delivery is scheduled for ${new Date(data.delivery.scheduledDate).toLocaleDateString()}. We'll text tracking info soon!`
          })
        });
      }

      // Internal notification
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
          subject: `✓ ACH Cleared - Order ${data.orderNumber}`,
          htmlContent: `
            <h2>ACH Payment Cleared!</h2>
            <p><strong>Order Number:</strong> ${data.orderNumber}</p>
            <p><strong>Customer:</strong> ${data.customer.name}</p>
            <p><strong>Amount:</strong> $${data.totals.total.toFixed(2)}</p>
            <p><strong>Delivery Date:</strong> ${new Date(data.delivery.scheduledDate).toLocaleDateString()}</p>
            <p>Order is now ready to be scheduled for delivery.</p>
          `
        })
      });
    }

    if (type === 'payment_failed') {
      // Customer notification - payment failed
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
          subject: `Order ${data.orderNumber} - Payment Issue`,
          htmlContent: `
            <h2>Payment Issue with Your Order</h2>
            <p>Hi ${data.customer.name},</p>
            <p>Unfortunately, there was an issue processing your payment for order ${data.orderNumber}.</p>
            <p>Please contact us at (936) 259-2887 to complete your order or try again on our website.</p>
            <p>We apologize for any inconvenience.</p>
            <p>- The Texas Got Rocks Team</p>
          `
        })
      });

      // URGENT internal notification
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
          subject: `⚠️ PAYMENT FAILED - Order ${data.orderNumber}`,
          htmlContent: `
            <h2 style="color: red;">Payment Failed!</h2>
            <p><strong>Order Number:</strong> ${data.orderNumber}</p>
            <p><strong>Customer:</strong> ${data.customer.name}</p>
            <p><strong>Phone:</strong> ${data.customer.phone || 'Not provided'}</p>
            <p><strong>Email:</strong> ${data.customer.email}</p>
            <p><strong>Amount:</strong> $${data.totals.total.toFixed(2)}</p>
            <p><strong>Reason:</strong> ${data.failureReason || 'Unknown'}</p>
            <p style="color: red;"><strong>ACTION REQUIRED:</strong> Contact customer to resolve payment.</p>
          `
        })
      });
    }

    console.log(`Notification sent for ${type}`);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }) 
    };
  }

  try {
    // Verify webhook signature
    const signature = event.headers['x-square-signature'] || event.headers['X-Square-Signature'];
    const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

    if (signatureKey && !verifyWebhookSignature(event.body, signature, signatureKey)) {
      console.error('Invalid webhook signature');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid signature' })
      };
    }

    const webhookEvent = JSON.parse(event.body);
    const eventType = webhookEvent.type;
    const eventId = webhookEvent.event_id;

    console.log('Received Square webhook:', { eventType, eventId });

    const db = await connectToDatabase();

    // Check for duplicate event (idempotency)
    const existingEvent = await db.collection('webhook_events').findOne({ eventId });
    if (existingEvent) {
      console.log('Duplicate webhook event, skipping:', eventId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Event already processed' })
      };
    }

    // Process based on event type
    if (eventType === 'payment.completed' || eventType === 'payment.updated') {
      const payment = webhookEvent.data.object.payment;
      const paymentId = payment.id;
      const paymentStatus = payment.status;

      console.log('Processing payment event:', { paymentId, paymentStatus });

      // Find the order by Square payment ID
      const order = await db.collection('orders').findOne({
        'payment.squarePaymentId': paymentId
      });

      if (!order) {
        console.log('Order not found for payment:', paymentId);
        // Still log the event
        await db.collection('webhook_events').insertOne({
          eventId,
          eventType,
          orderId: null,
          payload: webhookEvent,
          processedAt: new Date(),
          result: 'order_not_found'
        });
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Order not found, event logged' })
        };
      }

      // Update order based on payment status
      if (paymentStatus === 'COMPLETED') {
        // Payment successful - update order to paid
        await db.collection('orders').updateOne(
          { _id: order._id },
          {
            $set: {
              'payment.status': 'completed',
              'payment.completedAt': new Date(),
              'payment.receiptUrl': payment.receipt_url || order.payment.receiptUrl,
              'status': 'paid',
              'updatedAt': new Date()
            }
          }
        );

        // Update inventory
        try {
          for (const item of order.items) {
            await db.collection('inventory').updateOne(
              { productId: item.productId },
              { 
                $inc: { currentStock: -item.tons },
                $set: { updatedAt: new Date() }
              }
            );
          }
          console.log('Inventory updated for order:', order.orderNumber);
        } catch (invError) {
          console.error('Error updating inventory:', invError);
        }

        // Send confirmation notification
        await sendNotification('ach_completed', order);
        console.log('Order updated to paid:', order.orderNumber);

      } else if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELED') {
        // Payment failed
        const failureReason = payment.failure_reason || 'Payment was declined or canceled';
        
        await db.collection('orders').updateOne(
          { _id: order._id },
          {
            $set: {
              'payment.status': 'failed',
              'payment.failureReason': failureReason,
              'status': 'payment_failed',
              'updatedAt': new Date()
            }
          }
        );

        // Send failure notification
        await sendNotification('payment_failed', { ...order, failureReason });
        console.log('Order marked as payment failed:', order.orderNumber);
      }

      // Log the webhook event
      await db.collection('webhook_events').insertOne({
        eventId,
        eventType,
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentId,
        paymentStatus,
        payload: webhookEvent,
        processedAt: new Date(),
        result: 'success'
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Webhook processed successfully' })
    };

  } catch (error) {
    console.error('Webhook processing error:', error);

    // Try to log the error
    try {
      const db = await connectToDatabase();
      await db.collection('webhook_events').insertOne({
        eventId: 'error-' + Date.now(),
        eventType: 'processing_error',
        payload: event.body,
        processedAt: new Date(),
        result: 'error',
        errorMessage: error.message
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
