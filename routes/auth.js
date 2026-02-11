const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { redirectIfAuthenticated } = require('../middleware/auth');

/**
 * Initialize user database connection
 */
let db;
let usersCollection;

function initializeDb(database) {
  db = database;
  if (db) {
    usersCollection = db.collection('users');
  }
}

/**
 * POST /api/auth/register - Register new user
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Validate input
    const errors = User.validateUserData(username, password, email);
    if (errors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors 
      });
    }

    // Check if database is connected
    if (!usersCollection) {
      return res.status(503).json({ 
        error: 'Database unavailable' 
      });
    }

    // Check if username already exists
    const existingUser = await usersCollection.findOne({ 
      username: username.trim() 
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'Username already exists' 
      });
    }

    // Create user
    const newUser = User.createUserObject(username, password, email);
    const result = await usersCollection.insertOne(newUser);

    // Create session
    req.session.userId = result.insertedId.toString();
    req.session.user = {
      username: newUser.username,
      email: newUser.email
    };
    req.sessionSave();

    res.status(201).json({ 
      message: 'User registered successfully',
      user: User.sanitizeUser({
        _id: result.insertedId,
        ...newUser
      })
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed' 
    });
  }
});

/**
 * POST /api/auth/login - Login user
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Check if database is connected
    if (!usersCollection) {
      return res.status(503).json({ 
        error: 'Database unavailable' 
      });
    }

    // Find user
    const user = await usersCollection.findOne({ 
      username: username.trim() 
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Verify password
    const isPasswordValid = User.verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Create session
    req.session.userId = user._id.toString();
    req.session.user = {
      username: user.username,
      email: user.email
    };
    req.sessionSave();

    res.json({ 
      message: 'Login successful',
      user: User.sanitizeUser(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed' 
    });
  }
});

/**
 * POST /api/auth/logout - Logout user
 */
router.post('/logout', (req, res) => {
  req.sessionDestroy();
  res.json({ message: 'Logout successful' });
});

/**
 * GET /api/auth/me - Get current user
 */
router.get('/me', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ 
        error: 'Not authenticated' 
      });
    }

    if (!usersCollection) {
      return res.status(503).json({ 
        error: 'Database unavailable' 
      });
    }

    const { ObjectId } = require('mongodb');
    const user = await usersCollection.findOne({ 
      _id: new ObjectId(req.session.userId) 
    });

    if (!user) {
      req.sessionDestroy();
      return res.status(401).json({ 
        error: 'User not found' 
      });
    }

    res.json({ 
      user: User.sanitizeUser(user)
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ 
      error: 'Failed to get user data' 
    });
  }
});

module.exports = { router, initializeDb };
