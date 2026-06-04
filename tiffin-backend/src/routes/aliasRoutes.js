const express = require('express');
const router = express.Router();
const { authUser, registerUser } = require('../controllers/authController');
const { placeOrder } = require('../controllers/orderController');
const { getProducts, trackOrder, updateRiderLocation } = require('../controllers/aliasController');
const { protect } = require('../middlewares/authMiddleware');

// Custom routes requested by the user
router.post('/login', authUser);
router.post('/signup', registerUser);
router.get('/products', getProducts);
router.post('/create-order', protect, placeOrder);
router.get('/track-order/:id', trackOrder);
router.post('/update-location', protect, updateRiderLocation);

module.exports = router;
