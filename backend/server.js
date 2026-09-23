const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/database');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const skillRoutes = require('./routes/skills');
const swapRoutes = require('./routes/swaps');
const reviewRoutes = require('./routes/reviews');
const sessionRoutes = require('./routes/sessions');

const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({
      status: 'OK',
      message: 'Server and database are running',
      time: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: error.message 
    });
  }
});

// Route middleware
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/swaps', swapRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/sessions', sessionRoutes);

// 404 handler (catch-all, MUST be last)
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ message: err.message });
});

// Start server ONCE
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✓ Backend running on http://localhost:${PORT}`);
});

module.exports = app;