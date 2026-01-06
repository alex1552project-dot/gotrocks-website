const { connectToDatabase, headers, handleOptions } = require('./utils/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'gotrocks-secret-change-in-production';

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('users');
    
    const path = event.path.replace('/.netlify/functions/auth', '').replace('/api/auth', '');

    // POST /auth/login - User login
    if (event.httpMethod === 'POST' && (path === '/login' || path === '')) {
      const { username, password } = JSON.parse(event.body);
      
      if (!username || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Username and password required' })
        };
      }

      // Find user
      const user = await collection.findOne({ username: username.toLowerCase() });
      
      if (!user) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid credentials' })
        };
      }

      // Check password
      const validPassword = await bcrypt.compare(password, user.password);
      
      if (!validPassword) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid credentials' })
        };
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user._id.toString(),
          username: user.username,
          role: user.role,
          name: user.name
        },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      // Update last login
      await collection.updateOne(
        { _id: user._id },
        { $set: { lastLogin: new Date() } }
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          token,
          user: {
            username: user.username,
            name: user.name,
            role: user.role,
            permissions: user.permissions || []
          }
        })
      };
    }

    // POST /auth/register - Create new user (admin only)
    if (event.httpMethod === 'POST' && path === '/register') {
      const { username, password, name, role, permissions } = JSON.parse(event.body);
      
      // TODO: Add admin auth check here
      
      if (!username || !password || !name || !role) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing required fields' })
        };
      }

      // Check if user exists
      const existing = await collection.findOne({ username: username.toLowerCase() });
      if (existing) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Username already exists' })
        };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const result = await collection.insertOne({
        username: username.toLowerCase(),
        password: hashedPassword,
        name,
        role,
        permissions: permissions || [],
        active: true,
        createdAt: new Date()
      });

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, userId: result.insertedId })
      };
    }

    // GET /auth/verify - Verify token
    if (event.httpMethod === 'GET' && path === '/verify') {
      const authHeader = event.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'No token provided' })
        };
      }

      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ valid: true, user: decoded })
        };
      } catch (err) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid token' })
        };
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Auth API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};
