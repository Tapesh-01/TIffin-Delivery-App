const express = require('express');
const router = express.Router();
const { getActivePoll, votePoll } = require('../controllers/pollController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/polls/active', protect, getActivePoll);
router.post('/polls/vote', protect, votePoll);

module.exports = router;
