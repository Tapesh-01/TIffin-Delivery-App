const express = require('express');
const router = express.Router();
const { 
  getRiderOrders,
  toggleRiderStatus,
  getRiderEarnings
} = require('../controllers/riderController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/rider/orders', protect, getRiderOrders);
router.put('/rider/status', protect, toggleRiderStatus);
router.get('/rider/earnings', protect, getRiderEarnings);

module.exports = router;
