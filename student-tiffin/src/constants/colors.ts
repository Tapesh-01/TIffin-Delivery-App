// Student Tiffin - Color Design System
// Orange/Red Premium Theme

export const Colors = {
  // --- Primary Brand Gradient Colors ---
  primary: '#FF4500',        // Deep Orange-Red (Main brand color)
  primaryLight: '#FF6B35',   // Light Orange
  primaryDark: '#CC2200',    // Dark Red

  // --- Gradient Definition ---
  gradient: {
    start: '#FF6B35',        // Orange
    end: '#FF1744',          // Red
  },

  // --- Background Colors ---
  background: '#FAFAFA',     // Off-White / Cream (premium, not plain white)
  backgroundDark: '#1A0A00', // Deep dark for dark mode cards
  surface: '#FFFFFF',        // Pure white for cards

  // --- Accent Colors ---
  accent: '#2ECC71',         // Fresh Leaf Green (for "Delivered", "Healthy", "Veg")
  accentLight: '#A8F0C6',    // Light green for backgrounds

  // --- Text Colors ---
  textPrimary: '#1A1A1A',    // Near-black for headings
  textSecondary: '#6B6B6B',  // Grey for subtitles
  textMuted: '#ABABAB',      // Light grey for hints/timestamps
  textOnPrimary: '#FFFFFF',  // White text on orange/red buttons

  // --- Status Colors ---
  success: '#2ECC71',        // Green - Delivered / Active
  warning: '#F39C12',        // Amber - Cooking / Pending
  info: '#3498DB',           // Blue - Packed / In Transit
  danger: '#E74C3C',         // Red - Error / Cancelled

  // --- UI Element Colors ---
  border: '#EFEFEF',         // Light border
  shadow: 'rgba(255, 69, 0, 0.15)', // Branded orange shadow
  overlay: 'rgba(0, 0, 0, 0.5)',    // Dark overlay for modals
  glassBg: 'rgba(255, 255, 255, 0.85)', // Glassmorphism background

  // --- Wallet Colors ---
  walletGold: '#F59E0B',     // Gold for wallet balance
  walletBg: '#FFF8E7',       // Light yellow bg for wallet

  // --- Skeleton Loader Colors ---
  skeletonBase: '#E8E8E8',
  skeletonHighlight: '#F5F5F5',
} as const;
