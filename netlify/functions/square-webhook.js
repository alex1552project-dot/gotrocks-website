const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const uri = process.env.MONGODB_URI;
const SQUARE_WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

// Verify Square webhook signature
function verifySquareSignature(body, signature, webhookSignatureKey) {
  if (!webhookSignatureKey || !signature) {
    return false;
  }
  
  const hmac = crypto.createHmac('sha256', webhookSignatureKey);
  hmac.update(body);
  const expectedSignature = hmac.digest('base64');
  
  return signature === expectedSignature;
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const signature = event.headers['x-square-hmacsha256-signature'];
  if (SQUARE_WEBHOOK_SIGNATURE_KEY && signature) {
    const isValid = verifySquareSignature(event.body, signature, SQUARE_WEBHOOK_SIGNATURE_KEY);
    if (!isValid) {
      console.error('Invalid Square webhook signature');
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid signature' }) };
    }
  }

  const client = new MongoClient(uri);

  try {
    const webhookEvent = JSON.parse(event.body);
    
    console.log('Square webhook received:', webhookEvent.type);

    if (webhookEvent.type !== 'payment.completed') {
      return { 
        statusCode: 200, 
        headers, 
        body: JSON.stringify({ received: true, processed: false, reason: 'Not a payment completion event' }) 
      };
    }

    const payment = webhookEvent.data.object.payment;
    
    if (payment.status !== 'COMPLETED') {
      return { 
        statusCode: 200, 
        headers, 
        body: JSON.stringify({ received: true, processed: false, reason: 'Payment not completed' }) 
      };
    }

    await client.connect();
    const db = client.db('txgotrocks');
    
    const orderRef = payment.reference_id || payment.note;
    
    if (!orderRef) {
      console.log('No order reference found in payment');
      return { 
        statusCode: 200, 
        headers, 
        body: JSON.stringify({ received: true, processed: false, reason: 'No order reference' }) 
      };
    }

    const pendingOrdersCollection = db.collection('pending_orders');
    const pendingOrder = await pendingOrdersCollection.findOne({ 
      $or: [
        { squareReferenceId: orderRef },
        { squarePaymentId: payment.id }
      ]
    });

    let orderDetails;

    if (pendingOrder) {
      orderDetails = pendingOrder;
    } else {
      console.log('No pending order found, cannot process inventory depletion');
      
      const ordersCollection = db.collection('tgr_orders');
      await ordersCollection.insertOne({
        squarePaymentId: payment.id,
        paymentStatus: 'approved',
        total: payment.amount_money.amount / 100,
        createdAt: new Date().toISOString(),
        note: 'Order details not found - manual review needed',
        rawPayment: payment
      });
      
      return { 
        statusCode: 200, 
        headers, 
        body: JSON.stringify({ received: true, processed: 'partial', reason: 'Order logged but inventory not updated' }) 
      };
    }

    // CORE LOGIC: Deplete inventory on approved payment
    
    const productsCollection = db.collection('products');
    const inventoryCollection = db.collection('inventory');
    const ordersCollection = db.collection('tgr_orders');
    const auditCollection = db.collection('inventory_audit');

    const product = await productsCollection.findOne({ id: orderDetails.productId });
    
    if (!product) {
      console.error('Product not found:', orderDetails.productId);
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Product not found' }) };
    }

    // Customer orders in YARDS, we deduct in TONS
    const quantityYards = orderDetails.quantity;
    const tonsPerYard = product.weight;
    const tonsToDeduct = quantityYards * tonsPerYard;

    console.log(`Deducting inventory: ${quantityYards} yards × ${tonsPerYard} tons/yd = ${tonsToDeduct} tons`);

    const currentInventory = await inventoryCollection.findOne({ productId: product.id });
    
    if (!currentInventory) {
      console.error('No inventory record for product:', product.id);
    }

    const previousStock = currentInventory?.stockTons || 0;
    const newStock = previousStock - tonsToDeduct;

    if (currentInventory) {
      await inventoryCollection.updateOne(
        { productId: product.id },
        { 
          $set: { 
            stockTons: newStock,
            lastUpdated: new Date().toISOString(),
            lastUpdatedBy: 'square-webhook'
          }
        }
      );

      await auditCollection.insertOne({
        productId: product.id,
        productName: product.name,
        previousTons: previousStock,
        newTons: newStock,
        adjustment: -tonsToDeduct,
        reason: `TGR Order - ${quantityYards} yards sold`,
        squarePaymentId: payment.id,
        updatedBy: 'square-webhook',
        timestamp: new Date().toISOString()
      });

      console.log(`Inventory updated: ${product.name} ${previousStock} → ${newStock} tons`);

      if (currentInventory.lowStockThreshold && newStock < currentInventory.lowStockThreshold) {
        console.log(`LOW STOCK ALERT: ${product.name} is below threshold (${newStock} < ${currentInventory.lowStockThreshold})`);
      }
    }

    const tgrOrder = {
      squarePaymentId: payment.id,
      paymentStatus: 'approved',
      total: payment.amount_money.amount / 100,
      quantity: quantityYards,
      quantityTons: tonsToDeduct,
      product: product.name,
      productId: product.id,
      deliveryDate: orderDetails.deliveryDate,
      customer: {
        name: orderDetails.customerName,
        email: orderDetails.customerEmail,
        phone: orderDetails.customerPhone,
        address: orderDetails.deliveryAddress
      },
      deliveryZip: orderDetails.deliveryZip,
      createdAt: new Date().toISOString(),
      status: 'pending_delivery',
      inventoryDeducted: true,
      inventoryDeduction: {
        previousTons: previousStock,
        deductedTons: tonsToDeduct,
        newTons: newStock
      }
    };

    await ordersCollection.insertOne(tgrOrder);
    console.log('TGR order created:', tgrOrder);

    if (pendingOrder) {
      await pendingOrdersCollection.updateOne(
        { _id: pendingOrder._id },
        { $set: { status: 'completed', processedAt: new Date().toISOString() } }
      );
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        received: true,
        processed: true,
        order: {
          product: product.name,
          quantityYards,
          tonsDeducted: tonsToDeduct,
          newInventory: newStock
        }
      })
    };

  } catch (error) {
    console.error('Square webhook error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  } finally {
    await client.close();
  }
};
