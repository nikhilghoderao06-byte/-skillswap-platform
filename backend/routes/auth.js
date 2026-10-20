const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../config/database');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Only failed attempts count, so students sharing one campus Wi-Fi are not
// blocked by each other's successful logins.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many failed login attempts. Please try again in 15 minutes.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many sign-ups from this network. Please try again later.' },
});

const SERVER_ERROR = 'Something went wrong. Please try again.';

router.post('/register', registerLimiter, async (req, res) => {
  try {
    const email = String(req.body.email ?? '').trim();
    const password = String(req.body.password ?? '');
    const first_name = String(req.body.first_name ?? '').trim();
    const last_name = String(req.body.last_name ?? '').trim();
    const college_name = String(req.body.college_name ?? '').trim();
    const yearRaw = req.body.year_of_study;

    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    if (email.length > 255 || !EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }
    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({ message: 'Password must be between 8 and 72 characters' });
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ message: 'Password must contain at least one letter and one number' });
    }
    if (first_name.length > 100 || last_name.length > 100) {
      return res.status(400).json({ message: 'Names can be at most 100 characters' });
    }
    if (college_name.length > 255) {
      return res.status(400).json({ message: 'College name is too long' });
    }

    let year_of_study = 0;
    if (yearRaw !== undefined && yearRaw !== null && String(yearRaw).trim() !== '') {
      year_of_study = Number(yearRaw);
      if (!Number.isInteger(year_of_study) || year_of_study < 1 || year_of_study > 8) {
        return res.status(400).json({ message: 'Year of study must be a number from 1 to 8' });
      }
    }

    const existingUser = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, college_name, year_of_study) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [email.toLowerCase(), hashedPassword, first_name, last_name, college_name, year_of_study]
    );

    const { password_hash, ...safeUser } = result.rows[0];
    res.status(201).json({ message: 'User registered successfully', data: safeUser });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: SERVER_ERROR });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const email = String(req.body.email ?? '').trim();
    const password = String(req.body.password ?? '');

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const result = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        college_name: user.college_name,
        year_of_study: user.year_of_study,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: SERVER_ERROR });
  }
});

module.exports = router;
