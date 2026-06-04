// Student Tiffin - App Constants (Business Logic)

export const AppConfig = {
  appName: 'Student Tiffin',
  tagline: 'Healthy Meals Delivered',
  currency: '₹',
  supportPhone: '+91 98765 43210',
  deliveryTimeWindow: '7:00 – 7:30 PM',

  // Subscription Plans
  plans: [
    {
      id: 'basic',
      name: 'Basic',
      pricePerDay: 70,
      priceMonthly: 2100,
      color: '#3498DB',
      items: ['Roti', 'Sabji', 'Dal', 'Rice'],
      description: 'Perfect for light eaters',
      icon: '🍱',
    },
    {
      id: 'standard',
      name: 'Standard',
      pricePerDay: 90,
      priceMonthly: 2700,
      color: '#FF4500',
      items: ['Roti', 'Sabji', 'Dal', 'Rice', 'Extra Sabji'],
      description: 'Our most popular plan',
      icon: '🍛',
      isBestValue: true,
    },
    {
      id: 'premium',
      name: 'Premium',
      pricePerDay: 130,
      priceMonthly: 3900,
      color: '#9B59B6',
      items: ['Roti', 'Sabji', 'Dal', 'Rice', 'Paneer / Chicken'],
      description: 'For the big appetite',
      icon: '👑',
    },
  ],

  // Add-ons
  addOns: [
    { id: 'extra_roti', name: 'Extra 2 Roti', price: 10, icon: '🫓' },
    { id: 'curd', name: 'Curd (200ml)', price: 15, icon: '🥛' },
    { id: 'gulab_jamun', name: 'Gulab Jamun (2 pcs)', price: 20, icon: '🍮' },
    { id: 'salad', name: 'Fresh Salad', price: 25, icon: '🥗' },
  ],


  // Delivery Statuses
  orderStatuses: [
    { id: 'cooking', label: 'Cooking', icon: '👨‍🍳', color: '#F39C12' },
    { id: 'packed', label: 'Packed', icon: '📦', color: '#3498DB' },
    { id: 'out_for_delivery', label: 'Out for Delivery', icon: '🛵', color: '#9B59B6' },
    { id: 'delivered', label: 'Delivered', icon: '✅', color: '#2ECC71' },
  ],
} as const;
