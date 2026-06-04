export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  icon: string;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  deliveryFee: number;
  description: string;
  imageUrl: string;
  menu: MenuItem[];
}

export const RESTAURANTS: Restaurant[] = [
  {
    id: 'r1',
    name: 'Burger Palace',
    cuisine: 'American',
    rating: 4.7,
    deliveryTime: '25-35 min',
    deliveryFee: 49,
    description: 'Juicy handcrafted burgers made with premium cheese and soft buns',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=60',
    menu: [
      { id: 'm1_1', name: 'Classic Cheese Burger', price: 129, description: 'Handcrafted patty with double cheddar, lettuce, and secret sauce', icon: '🍔' },
      { id: 'm1_2', name: 'Crispy Veg Burger', price: 99, description: 'Golden potato patty with fresh veggies and mayonnaise', icon: '🍔' },
      { id: 'm1_3', name: 'Peri Peri French Fries', price: 79, description: 'Crispy salted fries tossed in spicy peri peri mix', icon: '🍟' },
      { id: 'm1_4', name: 'Oreo Milkshake', price: 99, description: 'Thick milk blended with original Oreo cookies and vanilla ice cream', icon: '🥤' }
    ]
  },
  {
    id: 'r2',
    name: 'Sakura Sushi',
    cuisine: 'Japanese',
    rating: 4.9,
    deliveryTime: '30-40 min',
    deliveryFee: 99,
    description: 'Authentic Japanese sushi, ramen bowls, and hot gyoza',
    imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&auto=format&fit=crop&q=60',
    menu: [
      { id: 'm2_1', name: 'California Salmon Roll', price: 299, description: 'Fresh salmon wrapped in seasoned rice and sesame seeds (8 pcs)', icon: '🍣' },
      { id: 'm2_2', name: 'Spicy Shoyu Ramen', price: 249, description: 'Traditional wheat noodles in rich soy broth with tofu and green onions', icon: '🍜' },
      { id: 'm2_3', name: 'Fried Gyoza Dumplings', price: 159, description: 'Crispy pan-fried vegetable dumplings served with sweet soy sauce (6 pcs)', icon: '🥟' }
    ]
  },
  {
    id: 'r3',
    name: 'Pizza Roma',
    cuisine: 'Italian',
    rating: 4.5,
    deliveryTime: '20-30 min',
    deliveryFee: 39,
    description: 'Wood-fired pizzas baked with fresh herbs and mozzarella',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=60',
    menu: [
      { id: 'm3_1', name: 'Double Cheese Margherita', price: 169, description: 'Classic pizza loaded with extra mozzarella cheese and fresh basil', icon: '🍕' },
      { id: 'm3_2', name: 'Farmhouse Garden Pizza', price: 229, description: 'Topped with bell peppers, onions, tomatoes, sweet corn, and mushrooms', icon: '🍕' },
      { id: 'm3_3', name: 'Garlic Breadsticks with Dip', price: 99, description: 'Buttery baked breadsticks served with warm cheesy dip (5 pcs)', icon: '🥖' }
    ]
  },
  {
    id: 'r4',
    name: 'Spice Garden',
    cuisine: 'Indian',
    rating: 4.6,
    deliveryTime: '35-45 min',
    deliveryFee: 49,
    description: 'Rich local curries, butter naans, and special tandoori main dishes',
    imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=60',
    menu: [
      { id: 'm4_1', name: 'Butter Chicken Masala', price: 219, description: 'Tender chicken pieces simmered in sweet and spicy rich tomato-butter gravy', icon: '🍛' },
      { id: 'm4_2', name: 'Paneer Butter Masala', price: 179, description: 'Fresh cottage cheese blocks in creamy traditional butter curry', icon: '🧀' },
      { id: 'm4_3', name: 'Butter Naan', price: 35, description: 'Soft flatbread baked in tandoor, coated with pure butter', icon: '🫓' },
      { id: 'm4_4', name: 'Veg Dum Biryani', price: 159, description: 'Aromatic basmati rice layered with mixed vegetables, herbs, and spices', icon: '🍛' }
    ]
  },
  {
    id: 'r5',
    name: 'Taco Fiesta',
    cuisine: 'Mexican',
    rating: 4.4,
    deliveryTime: '15-25 min',
    deliveryFee: 29,
    description: 'Authentic street tacos, soft burritos, and cheesy quesadillas',
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&auto=format&fit=crop&q=60',
    menu: [
      { id: 'm5_1', name: 'Crispy Taco Trio', price: 149, description: 'Three hard tacos loaded with seasoned beans, cheese, lettuce, and salsa', icon: '🌮' },
      { id: 'm5_2', name: 'Super Loaded Cheese Burrito', price: 189, description: 'Flour tortilla packed with rice, black beans, guacamole, and sour cream', icon: '🌯' },
      { id: 'm5_3', name: 'Cheese Quesadillas', price: 119, description: 'Folded grilled tortilla stuffed with melted double cheese and jalapeños', icon: '🌮' }
    ]
  },
  {
    id: 'r6',
    name: 'Green Bowl',
    cuisine: 'Healthy',
    rating: 4.8,
    deliveryTime: '20-30 min',
    deliveryFee: 49,
    description: 'Fresh organic salads, high-protein keto bowls, and cold-pressed juices',
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=60',
    menu: [
      { id: 'm6_1', name: 'Avocado Protein Salad', price: 199, description: 'Fresh avocado, lettuce, cherry tomatoes, cucumbers with olive oil dressing', icon: '🥗' },
      { id: 'm6_2', name: 'High-Protein Tofu Bowl', price: 179, description: 'Brown rice, grilled tofu blocks, edamame, and broccoli with sesame sauce', icon: '🥗' },
      { id: 'm6_3', name: 'Keto Berry Green Smoothie', price: 119, description: 'Cold-blended spinach, avocado, blueberries, and unsweetened almond milk', icon: '🥤' }
    ]
  }
];
