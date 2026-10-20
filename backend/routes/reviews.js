const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Get reviews for a user (includes the reviewer's name)
router.get('/user/:userId', auth, async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.userId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const result = await db.query(
      `SELECT r.id, r.session_id, r.reviewer_id, r.reviewed_user_id, r.rating, r.feedback, r.created_at,
              u.first_name, u.last_name
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       WHERE r.reviewed_user_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Could not load reviews' });
  }
});

// Create review: only after a completed session with that person, once per session
router.post('/', auth, async (req, res) => {
  try {
    const { reviewee_id, rating, feedback, session_id } = req.body;

    const revieweeId = parseInt(reviewee_id, 10);
    if (!Number.isInteger(revieweeId)) {
      return res.status(400).json({ error: 'reviewee_id is required' });
    }
    if (revieweeId === Number(req.user_id)) {
      return res.status(400).json({ error: 'You cannot review yourself' });
    }

    const ratingNum = Number(rating);
    if (!rating || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'rating must be a whole number between 1 and 5' });
    }

    const text = typeof feedback === 'string' ? feedback.trim() : '';
    if (!text) {
      return res.status(400).json({ error: 'feedback is required' });
    }
    if (text.length > 1000) {
      return res.status(400).json({ error: 'feedback must be 1000 characters or fewer' });
    }

    let sessionId = null;
    if (session_id !== undefined && session_id !== null && session_id !== '') {
      sessionId = parseInt(session_id, 10);
      if (!Number.isInteger(sessionId)) {
        return res.status(400).json({ error: 'Invalid session_id' });
      }
    }

    // A completed session between these two people that this reviewer has not reviewed yet
    const eligible = await db.query(
      `SELECT s.id
       FROM sessions s
       JOIN swap_requests sr ON sr.id = s.swap_request_id
       WHERE s.status = 'completed'
         AND ((sr.requester_id = $1 AND sr.provider_id = $2) OR (sr.requester_id = $2 AND sr.provider_id = $1))
         AND ($3::int IS NULL OR s.id = $3::int)
         AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.session_id = s.id AND r.reviewer_id = $1)
       ORDER BY s.id DESC
       LIMIT 1`,
      [req.user_id, revieweeId, sessionId]
    );
    if (eligible.rows.length === 0) {
      return res.status(403).json({
        error: 'You can only review someone after a completed session with them, and only once per session.',
      });
    }

    const result = await db.query(
      'INSERT INTO reviews (session_id, reviewer_id, reviewed_user_id, rating, feedback, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
      [eligible.rows[0].id, req.user_id, revieweeId, ratingNum, text]
    );

    // Recalculate the reviewed user's average rating
    await db.query(
      `UPDATE users SET rating = (
         SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE reviewed_user_id = $1
       ) WHERE id = $1`,
      [revieweeId]
    );

    res.status(201).json({
      message: 'Review created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Review creation error:', error);
    res.status(500).json({ error: 'Could not save the review' });
  }
});

module.exports = router;
