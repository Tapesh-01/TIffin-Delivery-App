const express = require('express');
const router = express.Router();
const { 
  getAllUsers, 
  adjustUserWallet, 
  getAllTransactions, 
  updateTransactionStatus,
  deleteUser,
  getActivityLogs,
  createPoll,
  generateTiffinOrders,
  updateUserProfile,
  createUser
} = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Enforce authentication and admin role for all admin routes
router.use(protect, authorize('admin'));

router.get('/users', getAllUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUserProfile);
router.put('/users/:id/wallet', adjustUserWallet);
router.delete('/users/:id', deleteUser);
router.get('/transactions', getAllTransactions);
router.put('/transactions/:id/status', updateTransactionStatus);
router.get('/activity-logs', getActivityLogs);
router.post('/polls', createPoll);
router.post('/tiffins/generate', generateTiffinOrders);

module.exports = router;

