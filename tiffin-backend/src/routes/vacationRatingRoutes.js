const express = require('express');
const router = express.Router();
const {
  requestVacation,
  getMyVacations,
  cancelVacation,
  getAllVacations,
  updateVacationStatus,
  rateMeal,
  getAllRatings,
  getMyRating,
  getMealFeed
} = require('../controllers/vacationRatingController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// ── Student routes ──
router.post('/vacation/request', protect, requestVacation);
router.get('/vacation/my', protect, getMyVacations);
router.delete('/vacation/:requestId/cancel', protect, cancelVacation);
router.post('/meal/rate', protect, rateMeal);
router.get('/meal/my-rating', protect, getMyRating);
router.get('/meal/feed', protect, getMealFeed);

// ── Admin routes ──
router.get('/admin/vacations', protect, authorize('admin'), getAllVacations);
router.put('/admin/vacations/:userId/:requestId/status', protect, authorize('admin'), updateVacationStatus);
router.get('/admin/ratings', protect, authorize('admin'), getAllRatings);

module.exports = router;
