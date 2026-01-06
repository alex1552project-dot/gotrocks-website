const { connectToDatabase, headers, handleOptions } = require('./utils/db');

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('deliveries');

    // GET - Retrieve deliveries
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      
      let query = {};
      
      // Filter by date range
      if (params.date) {
        const date = new Date(params.date);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        query.scheduledDate = { $gte: date, $lt: nextDay };
      }
      
      // Filter by driver
      if (params.driver) {
        query.driverId = params.driver;
      }
      
      // Filter by status
      if (params.status) {
        query.status = params.status;
      }

      // Filter by date range (from/to)
      if (params.from || params.to) {
        query.scheduledDate = {};
        if (params.from) query.scheduledDate.$gte = new Date(params.from);
        if (params.to) query.scheduledDate.$lte = new Date(params.to);
      }

      const deliveries = await collection
        .find(query)
        .sort({ scheduledDate: 1, scheduledTime: 1 })
        .toArray();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(deliveries)
      };
    }

    // POST - Create or update a delivery
    if (event.httpMethod === 'POST') {
      const delivery = JSON.parse(event.body);
      
      // If updating existing delivery
      if (delivery._id || delivery.deliveryId) {
        const id = delivery._id || delivery.deliveryId;
        delete delivery._id;
        delete delivery.deliveryId;
        
        const result = await collection.updateOne(
          { deliveryId: id },
          { 
            $set: { ...delivery, updatedAt: new Date() },
            $push: {
              statusHistory: {
                status: delivery.status,
                timestamp: new Date(),
                updatedBy: delivery.updatedBy || 'system'
              }
            }
          }
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, result })
        };
      }

      // Creating new delivery
      const deliveryId = 'DEL-' + Date.now();
      
      const newDelivery = {
        deliveryId,
        ...delivery,
        status: delivery.status || 'scheduled',
        statusHistory: [{
          status: 'scheduled',
          timestamp: new Date(),
          updatedBy: delivery.createdBy || 'system'
        }],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await collection.insertOne(newDelivery);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, deliveryId, result })
      };
    }

    // PUT - Update delivery status (for drivers)
    if (event.httpMethod === 'PUT') {
      const { deliveryId, status, notes, driverId } = JSON.parse(event.body);
      
      if (!deliveryId || !status) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing required fields: deliveryId, status' })
        };
      }

      const validStatuses = ['scheduled', 'en-route', 'delivered', 'cancelled', 'rescheduled'];
      if (!validStatuses.includes(status)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid status', validStatuses })
        };
      }

      const updateData = {
        status,
        updatedAt: new Date()
      };

      if (status === 'delivered') {
        updateData.deliveredAt = new Date();
      }

      const result = await collection.updateOne(
        { deliveryId },
        { 
          $set: updateData,
          $push: {
            statusHistory: {
              status,
              notes,
              timestamp: new Date(),
              updatedBy: driverId || 'driver'
            }
          }
        }
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, result })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Deliveries API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};
