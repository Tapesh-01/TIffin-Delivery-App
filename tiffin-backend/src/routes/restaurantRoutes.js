const express = require('express');
const router = express.Router();
const { 
  getRestaurants, 
  getRestaurantById, 
  getWeeklyMenu, 
  updateMenuDay,
  addProductReview,
  getProductReviews,
  updateItemAvailability,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createRestaurant,
  deleteRestaurant
} = require('../controllers/restaurantController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Public routes
router.get('/restaurants', getRestaurants);
router.get('/restaurants/:id', getRestaurantById);
router.get('/menu/weekly', getWeeklyMenu);
router.get('/restaurants/:id/items/:itemId/reviews', getProductReviews);

// Protected routes
router.post('/restaurants/:id/items/:itemId/review', protect, addProductReview);

// Admin-only routes
router.put('/menu/weekly/:id', protect, authorize('admin'), updateMenuDay);
router.put('/restaurants/:id/items/:itemId/availability', protect, authorize('admin'), updateItemAvailability);
router.post('/restaurants/:id/items', protect, authorize('admin'), addMenuItem);
router.put('/restaurants/:id/items/:itemId', protect, authorize('admin'), updateMenuItem);
router.delete('/restaurants/:id/items/:itemId', protect, authorize('admin'), deleteMenuItem);
router.post('/restaurants', protect, authorize('admin'), createRestaurant);
router.delete('/restaurants/:id', protect, authorize('admin'), deleteRestaurant);

module.exports = router;
