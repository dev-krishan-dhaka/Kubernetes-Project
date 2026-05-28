const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Get metrics from app
const getMetrics = (req) => req.app.get('metrics');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/users/signup - Track registrations
router.post('/signup', async (req, res) => {
  const metrics = getMetrics(req);
  
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      metrics.userRegistrations.labels('failed').inc();
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    if (password.length < 6) {
      metrics.userRegistrations.labels('failed').inc();
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) {
      metrics.userRegistrations.labels('failed').inc();
      return res.status(400).json({ message: 'Email already in use' });
    }

    await User.create({ username, email: email.toLowerCase(), password });
    
    // Track successful registration
    metrics.userRegistrations.labels('success').inc();
    
    res.status(201).json({ message: 'Account created successfully' });
  } catch (err) {
    metrics.userRegistrations.labels('failed').inc();
    res.status(500).json({ message: err.message || 'Signup failed' });
  }
});

// POST /api/users/login - Track logins
router.post('/login', async (req, res) => {
  const metrics = getMetrics(req);
  
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      metrics.userLogins.labels('failed').inc();
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    
    if (!user) {
      metrics.userLogins.labels('failed').inc();
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    if (!(await user.matchPassword(password))) {
      metrics.userLogins.labels('failed').inc();
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Track successful login
    metrics.userLogins.labels('success').inc();

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      token: generateToken(user.id),
    });
  } catch (err) {
    metrics.userLogins.labels('failed').inc();
    res.status(500).json({ message: err.message || 'Login failed' });
  }
});

module.exports = router;