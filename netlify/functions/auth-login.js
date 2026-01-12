const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const uri = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'tgr-secret-key-change-in-production';

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

  let client;
  try {
    const { username, password } = JSON.parse(event.body);

    if (!username || !password) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Username and password required' }) };
    }

    client = new MongoClient(uri);
    await client.connect();
    const db = client.db('gotrocks');

    const user = await db.collection('users').findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });

    if (!user) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid credentials' }) };
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid credentials' }) };
    }

    const token = jwt.sign(
      { userId: user._id.toString(), username: user.username, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, token, user: { name: user.name, username: user.username, role: user.role } })
    };

  } catch (error) {
    console.error('Login error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server error' }) };
  } finally {
    if (client) await client.close();
  }
};
