const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const uri = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// Verify token and check for owner role
async function verifyOwner(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.role === 'owner' ? decoded : null;
  } catch (error) {
    return null;
  }
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Get token from Authorization header
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'No token provided' })
    };
  }

  const token = authHeader.split(' ')[1];
  const owner = await verifyOwner(token);
  
  if (!owner) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Access denied. Owner role required.' })
    };
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('gotrocks');
    const usersCollection = db.collection('users');

    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};

    // GET - List all users
    if (method === 'GET') {
      const users = await usersCollection.find({}).toArray();
      // Remove password hashes from response
      const safeUsers = users.map(user => ({
        _id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        permissions: user.permissions || [],
        active: user.active !== false,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(safeUsers)
      };
    }

    // POST - Create new user
    if (method === 'POST') {
      const { username, password, name, role } = body;

      if (!username || !password || !name || !role) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing required fields: username, password, name, role' })
        };
      }

      // Check if username already exists
      const existingUser = await usersCollection.findOne({ 
        username: username.toLowerCase() 
      });
      
      if (existingUser) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ error: 'Username already exists' })
        };
      }

      // Define permissions based on role
      const rolePermissions = {
        owner: ['command-center', 'sales-dashboard', 'dispatch-ui', 'drivers-app', 'admin'],
        sales: ['sales-dashboard'],
        dispatch: ['dispatch-ui', 'drivers-app'],
        driver: ['drivers-app']
      };

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      const newUser = {
        username: username.toLowerCase(),
        passwordHash,
        name,
        role,
        permissions: rolePermissions[role] || [],
        active: true,
        createdAt: new Date().toISOString()
      };

      const result = await usersCollection.insertOne(newUser);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ 
          message: 'User created successfully',
          user: {
            _id: result.insertedId,
            username: newUser.username,
            name: newUser.name,
            role: newUser.role,
            active: newUser.active
          }
        })
      };
    }

    // PUT - Update user
    if (method === 'PUT') {
      const { userId, name, role, active, newPassword } = body;

      if (!userId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing userId' })
        };
      }

      const updateFields = {};
      
      if (name !== undefined) updateFields.name = name;
      if (role !== undefined) {
        updateFields.role = role;
        // Update permissions based on new role
        const rolePermissions = {
          owner: ['command-center', 'sales-dashboard', 'dispatch-ui', 'drivers-app', 'admin'],
          sales: ['sales-dashboard'],
          dispatch: ['dispatch-ui', 'drivers-app'],
          driver: ['drivers-app']
        };
        updateFields.permissions = rolePermissions[role] || [];
      }
      if (active !== undefined) updateFields.active = active;
      if (newPassword) {
        updateFields.passwordHash = await bcrypt.hash(newPassword, 10);
      }

      updateFields.updatedAt = new Date().toISOString();

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: updateFields }
      );

      if (result.matchedCount === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'User not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'User updated successfully' })
      };
    }

    // DELETE - Delete user (or just deactivate)
    if (method === 'DELETE') {
      const { userId, permanent } = body;

      if (!userId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing userId' })
        };
      }

      // Prevent deleting yourself
      if (userId === owner.userId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Cannot delete your own account' })
        };
      }

      if (permanent) {
        await usersCollection.deleteOne({ _id: new ObjectId(userId) });
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'User permanently deleted' })
        };
      } else {
        await usersCollection.updateOne(
          { _id: new ObjectId(userId) },
          { $set: { active: false, deactivatedAt: new Date().toISOString() } }
        );
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'User deactivated' })
        };
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Auth users error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  } finally {
    await client.close();
  }
};
