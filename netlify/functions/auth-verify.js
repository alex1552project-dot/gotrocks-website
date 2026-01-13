const jwt = require('jsonwebtoken');

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

  try {
    const { token } = JSON.parse(event.body);

    if (!token) {
      return { statusCode: 401, headers, body: JSON.stringify({ valid: false, error: 'No token provided' }) };
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: true,
        user: { userId: decoded.userId, username: decoded.username, name: decoded.name, role: decoded.role }
      })
    };

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { statusCode: 401, headers, body: JSON.stringify({ valid: false, error: 'Token expired' }) };
    }
    return { statusCode: 401, headers, body: JSON.stringify({ valid: false, error: 'Invalid token' }) };
  }
};
