const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Create session
router.post('/', auth, async (req, res) => {
  try {
    const { swap_request_id, scheduled_date, scheduled_time, location } = req.body;

    if (!swap_request_id || !scheduled_date || !scheduled_time) {
      return res.status(400).json({ error: 'Missing required fields: swap_request_id, scheduled_date, scheduled_time' });
    }

    const swap = await db.query('SELECT requester_id, provider_id FROM swap_requests WHERE id = $1', [swap_request_id]);
    if (swap.rows.length === 0) {
      return res.status(404).json({ error: 'Swap request not found' });
    }
    const { requester_id, provider_id } = swap.rows[0];
    if (String(req.user_id) !== String(requester_id) && String(req.user_id) !== String(provider_id)) {
      return res.status(403).json({ error: 'You are not part of this swap request' });
    }

    const result = await db.query(
      'INSERT INTO sessions (swap_request_id, scheduled_date, scheduled_time, location, status, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
      [swap_request_id, scheduled_date, scheduled_time, location || '', 'scheduled']
    );

    res.status(201).json({ 
      message: 'Session created successfully',
      data: result.rows[0] 
    });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user sessions
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, sr.requester_id, sr.provider_id, sr.skill_teach_id, sr.skill_learn_id, sr.mode
       FROM sessions s
       JOIN swap_requests sr ON s.swap_request_id = sr.id
       WHERE sr.requester_id = $1 OR sr.provider_id = $1
       ORDER BY s.scheduled_date DESC, s.scheduled_time DESC`,
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single session
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, sr.requester_id, sr.provider_id, sr.skill_teach_id, sr.skill_learn_id, sr.mode
       FROM sessions s
       JOIN swap_requests sr ON s.swap_request_id = sr.id
       WHERE s.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Shared helper: confirm req.user_id is part of the swap behind this session
async function assertSessionParticipant(req, res) {
  const existing = await db.query(
    `SELECT s.id, sr.requester_id, sr.provider_id
     FROM sessions s JOIN swap_requests sr ON s.swap_request_id = sr.id
     WHERE s.id = $1`,
    [req.params.id]
  );
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Session not found' });
    return false;
  }
  const { requester_id, provider_id } = existing.rows[0];
  if (String(req.user_id) !== String(requester_id) && String(req.user_id) !== String(provider_id)) {
    res.status(403).json({ error: 'You are not part of this session' });
    return false;
  }
  return true;
}

// Complete session
router.put('/:id/complete', auth, async (req, res) => {
  try {
    if (!(await assertSessionParticipant(req, res))) return;

    const result = await db.query(
      'UPDATE sessions SET status = $1 WHERE id = $2 RETURNING *',
      ['completed', req.params.id]
    );

    res.json({ 
      message: 'Session marked as complete',
      data: result.rows[0] 
    });
  } catch (error) {
    console.error('Complete session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel session
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    if (!(await assertSessionParticipant(req, res))) return;

    const result = await db.query(
      'UPDATE sessions SET status = $1 WHERE id = $2 RETURNING *',
      ['cancelled', req.params.id]
    );

    res.json({ 
      message: 'Session cancelled',
      data: result.rows[0] 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;