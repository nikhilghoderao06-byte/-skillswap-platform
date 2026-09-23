const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Get reviews for a user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM reviews WHERE reviewed_user_id = $1 ORDER BY created_at DESC',
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create review
router.post('/', auth, async (req, res) => {
  try {
    const { reviewee_id, rating, feedback } = req.body;

    console.log('Creating review:', { reviewee_id, rating, feedback, reviewer_id: req.user_id });

    // Validate inputs
    if (!reviewee_id) {
      return res.status(400).json({ error: 'reviewee_id is required' });
    }
    if (!rating) {
      return res.status(400).json({ error: 'rating is required' });
    }
    if (!feedback || feedback.trim() === '') {
      return res.status(400).json({ error: 'feedback is required' });
    }

    // Validate rating is between 1-5
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'rating must be between 1 and 5' });
    }

    // Check if reviewee exists
    const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [reviewee_id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create review (using reviewed_user_id in database)
    const result = await db.query(
      'INSERT INTO reviews (reviewer_id, reviewed_user_id, rating, feedback, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [req.user_id, reviewee_id, ratingNum, feedback.trim()]
    );

    console.log('Review created:', result.rows[0]);

    res.status(201).json({
      message: 'Review created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Review creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;