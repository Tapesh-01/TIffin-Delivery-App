const express = require('express');
const router = express.Router();
const { 
  placeOrder, 
  getMyOrders, 
  getAllOrders, 
  updateOrderStatus, 
  rechargeWallet,
  getMyTransactions
} = require('../controllers/orderController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.post('/orders/place', protect, placeOrder);
router.get('/orders/myorders', protect, getMyOrders);
router.get('/orders', protect, authorize('admin'), getAllOrders);
router.put('/orders/:id/status', protect, updateOrderStatus);
router.post('/wallet/recharge', protect, rechargeWallet);
router.get('/wallet/transactions', protect, getMyTransactions);

module.exports = router;
