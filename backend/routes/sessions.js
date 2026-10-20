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

    if (!/^\d+$/.test(String(swap_request_id))) {
      return res.status(400).json({ error: 'Invalid swap_request_id' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(scheduled_date)) || Number.isNaN(Date.parse(scheduled_date))) {
      return res.status(400).json({ error: 'Please choose a valid date' });
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(String(scheduled_time))) {
      return res.status(400).json({ error: 'Please choose a valid time' });
    }
    const place = String(location ?? '').trim();
    if (place.length > 200) {
      return res.status(400).json({ error: 'Location can be at most 200 characters' });
    }

    const swap = await db.query('SELECT requester_id, provider_id, status FROM swap_requests WHERE id = $1', [swap_request_id]);
    if (swap.rows.length === 0) {
      return res.status(404).json({ error: 'Swap request not found' });
    }
    const { requester_id, provider_id, status } = swap.rows[0];
    if (String(req.user_id) !== String(requester_id) && String(req.user_id) !== String(provider_id)) {
      return res.status(403).json({ error: 'You are not part of this swap request' });
    }
    if (status !== 'accepted') {
      return res.status(400).json({ error: 'Sessions can only be scheduled for accepted requests' });
    }

    const result = await db.query(
      'INSERT INTO sessions (swap_request_id, scheduled_date, scheduled_time, location, status, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
      [swap_request_id, scheduled_date, scheduled_time, place, 'scheduled']
    );

    res.status(201).json({ 
      message: 'Session created successfully',
      data: result.rows[0] 
    });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Get user sessions
router.get('/user/:userId', auth, async (req, res) => {
  try {
    if (String(req.user_id) !== String(req.params.userId)) {
      return res.status(403).json({ error: 'You can only view your own sessions' });
    }
    const result = await db.query(
      `SELECT s.*, sr.requester_id, sr.provider_id, sr.skill_teach_id, sr.skill_learn_id, sr.mode
       FROM sessions s
       JOIN swap_requests sr ON s.swap_request_id = sr.id
       WHERE sr.requester_id = $1 OR sr.provider_id = $1
       ORDER BY s.scheduled_date DESC, s.scheduled_time DESC`,
      [req.user_id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Get single session
router.get('/:id', auth, async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({ error: 'Invalid session id' });
    }
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
    const row = result.rows[0];
    if (String(req.user_id) !== String(row.requester_id) && String(req.user_id) !== String(row.provider_id)) {
      return res.status(403).json({ error: 'You are not part of this session' });
    }

    res.json(row);
  } catch (error) {
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Shared helper: confirm req.user_id is part of the swap behind this session
async function assertSessionParticipant(req, res) {
  if (!/^\d+$/.test(req.params.id)) {
    res.status(400).json({ error: 'Invalid session id' });
    return false;
  }
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
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
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
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;