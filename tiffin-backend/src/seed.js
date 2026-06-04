require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Restaurant = require('./models/Restaurant');
const Menu = require('./models/Menu');
const Order = require('./models/Order');

const seedData = async () => {
  try {
    // Connect to Database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📡 Connected to database for seeding...');

    // Clear existing data
    await User.deleteMany();
    await Restaurant.deleteMany();
    await Menu.deleteMany();
    await Order.deleteMany();
    console.log('🧹 Cleared existing data.');

    // 1. Seed Users
    const users = [
      {
        name: 'Rahul Student',
        email: 'student@tiffin.com',
        password: 'student123', // Will be hashed automatically by pre-save middleware
        role: 'student',
        plan: 'standard',
        walletBalance: 1500
      },
      {
        name: 'Tiffin Owner Admin',
        email: 'admin@tiffin.com',
        password: 'admin123',
        role: 'admin',
        plan: 'none',
        walletBalance: 0
      },
      {
        name: 'Ramesh Rider',
        email: 'rider@tiffin.com',
        phone: '9999999999',
        riderPin: '0000',
        password: 'rider123',
        role: 'rider',
        plan: 'none',
        walletBalance: 0
      }
    ];

    await User.create(users);
    console.log('👥 Created seed users (Student, Admin, Rider).');

    // 2. Seed Weekly Menu
    const menus = [
      { dayIndex: 1, dayName: 'Monday', mainDish: 'Dal + Sabji', sideDish: 'Roti, Rice', emoji: '🍲', calories: '~520 kcal', isVeg: true },
      { dayIndex: 2, dayName: 'Tuesday', mainDish: 'Rajma + Aloo', sideDish: 'Roti, Rice', emoji: '🫘', calories: '~580 kcal', isVeg: true },
      { dayIndex: 3, dayName: 'Wednesday', mainDish: 'Chole + Paneer Masala', sideDish: 'Roti, Rice', emoji: '🍛', calories: '~610 kcal', isVeg: true },
      { dayIndex: 4, dayName: 'Thursday', mainDish: 'Ghar-Made Masala', sideDish: 'Roti, Rice', emoji: '🌶️', calories: '~550 kcal', isVeg: true },
      { dayIndex: 5, dayName: 'Friday', mainDish: 'Palak + Packed Soups', sideDish: 'Roti, Rice', emoji: '🥬', calories: '~490 kcal', isVeg: true },
      { dayIndex: 6, dayName: 'Saturday', mainDish: 'Special Meal', sideDish: 'Roti, Rice + Meetha', emoji: '⭐', calories: '~650 kcal', isVeg: true },
      { dayIndex: 7, dayName: 'Sunday', mainDish: 'Holiday', sideDish: 'No Service', emoji: '🛌', calories: '0 kcal', isVeg: true }
    ];

    await Menu.create(menus);
    console.log('📅 Created weekly menu items.');

    // 3. Seed Restaurants & Menus
    const restaurants = [
      {
        name: 'Burger Palace',
        cuisine: 'American',
        rating: 4.7,
        ratingCount: 120,
        deliveryTime: '25-35 min',
        latitude: 28.6145,
        longitude: 77.2085,
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=60',
        menuItems: [
          { name: 'Classic Cheese Burger', price: 129, description: 'Handcrafted patty with double cheddar, lettuce, and secret sauce', isVeg: false, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' },
          { name: 'Crispy Veg Burger', price: 99, description: 'Golden potato patty with fresh veggies and mayonnaise', isVeg: true, image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400' },
          { name: 'Peri Peri French Fries', price: 79, description: 'Crispy salted fries tossed in spicy peri peri mix', isVeg: true, image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400' },
          { name: 'Oreo Milkshake', price: 99, description: 'Thick milk blended with original Oreo cookies and vanilla ice cream', isVeg: true, image: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=400' }
        ]
      },
      {
        name: 'Sakura Sushi',
        cuisine: 'Japanese',
        rating: 4.9,
        ratingCount: 85,
        deliveryTime: '30-40 min',
        latitude: 28.6120,
        longitude: 77.2070,
        image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&auto=format&fit=crop&q=60',
        menuItems: [
          { name: 'California Salmon Roll', price: 299, description: 'Fresh salmon wrapped in seasoned rice and sesame seeds (8 pcs)', isVeg: false, image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400' },
          { name: 'Spicy Shoyu Ramen', price: 249, description: 'Traditional wheat noodles in rich soy broth with tofu and green onions', isVeg: true, image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400' },
          { name: 'Fried Gyoza Dumplings', price: 159, description: 'Crispy pan-fried vegetable dumplings served with sweet soy sauce (6 pcs)', isVeg: true, image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400' }
        ]
      },
      {
        name: 'Pizza Roma',
        cuisine: 'Italian',
        rating: 4.5,
        ratingCount: 145,
        deliveryTime: '20-30 min',
        latitude: 28.6139,
        longitude: 77.2090,
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=60',
        menuItems: [
          { name: 'Double Cheese Margherita', price: 169, description: 'Classic pizza loaded with extra mozzarella cheese and fresh basil', isVeg: true, image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400' },
          { name: 'Farmhouse Garden Pizza', price: 229, description: 'Topped with bell peppers, onions, tomatoes, sweet corn, and mushrooms', isVeg: true, image: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=400' },
          { name: 'Garlic Breadsticks with Dip', price: 99, description: 'Buttery baked breadsticks served with warm cheesy dip (5 pcs)', isVeg: true, image: 'https://images.unsplash.com/photo-1544982503-9f984c14501a?w=400' }
        ]
      },
      {
        name: 'Spice Garden',
        cuisine: 'Indian',
        rating: 4.6,
        ratingCount: 210,
        deliveryTime: '35-45 min',
        latitude: 28.6160,
        longitude: 77.2110,
        image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=60',
        menuItems: [
          { name: 'Butter Chicken Masala', price: 219, description: 'Tender chicken pieces simmered in sweet and spicy rich tomato-butter gravy', isVeg: false, image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400' },
          { name: 'Paneer Butter Masala', price: 179, description: 'Fresh cottage cheese blocks in creamy traditional butter curry', isVeg: true, image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400' },
          { name: 'Butter Naan', price: 35, description: 'Soft flatbread baked in tandoor, coated with pure butter', isVeg: true, image: 'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=400' },
          { name: 'Veg Dum Biryani', price: 159, description: 'Aromatic basmati rice layered with mixed vegetables, herbs, and spices', isVeg: true, image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400' }
        ]
      },
      {
        name: 'Taco Fiesta',
        cuisine: 'Mexican',
        rating: 4.4,
        ratingCount: 92,
        deliveryTime: '15-25 min',
        latitude: 28.6150,
        longitude: 77.2050,
        image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&auto=format&fit=crop&q=60',
        menuItems: [
          { name: 'Crispy Taco Trio', price: 149, description: 'Three hard tacos loaded with seasoned beans, cheese, lettuce, and salsa', isVeg: true, image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400' },
          { name: 'Super Loaded Cheese Burrito', price: 189, description: 'Flour tortilla packed with rice, black beans, guacamole, and sour cream', isVeg: true, image: 'https://images.unsplash.com/photo-1626700051175-6518c4793f4f?w=400' },
          { name: 'Cheese Quesadillas', price: 119, description: 'Folded grilled tortilla stuffed with melted double cheese and jalapeños', isVeg: true, image: 'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=400' }
        ]
      },
      {
        name: 'Green Bowl',
        cuisine: 'Healthy',
        rating: 4.8,
        ratingCount: 104,
        deliveryTime: '20-30 min',
        latitude: 28.6110,
        longitude: 77.2120,
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=60',
        menuItems: [
          { name: 'Avocado Protein Salad', price: 199, description: 'Fresh avocado, lettuce, cherry tomatoes, cucumbers with olive oil dressing', isVeg: true, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400' },
          { name: 'High-Protein Tofu Bowl', price: 179, description: 'Brown rice, grilled tofu blocks, edamame, and broccoli with sesame sauce', isVeg: true, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400' },
          { name: 'Keto Berry Green Smoothie', price: 119, description: 'Cold-blended spinach, avocado, blueberries, and unsweetened almond milk', isVeg: true, image: 'https://images.unsplash.com/photo-1553530979-7ee52a2670c4?w=400' }
        ]
      }
    ];

    await Restaurant.create(restaurants);
    console.log('🍔 Created restaurants with menu items.');

    console.log('🎉 Seeding successfully completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
