# 🛵 My Tiffin — Premium Real-Time Tiffin Delivery & Fleet System

A premium, state-of-the-art, and real-time **Tiffin Delivery & Management System** designed to bridge the gap between Students, Riders, and Kitchen Administrators. Built with a mono-repo structure, it integrates hardware-accelerated SVG animations, live street-following GPS simulation, interactive analytics, and bulk order workflow triggers.

---

## 🏛️ Project Architecture (Mono-Repo)

The workspace is organized into four decoupled, highly integrated services:

```text
My Tiffin app/
├── tiffin-backend/      # Express.js REST & WebSockets Server
├── admin-dashboard/     # React + Vite Administrative Hub (Desktop/Mobile Web)
├── student-tiffin/      # Expo React Native App (for Students)
└── rider-app/           # Expo React Native App (for Delivery Fleet)
```

---

## 🌟 Key Features

### 1. 🎓 Student Mobile App (`student-tiffin`)
* **Flexible Subscriptions**: Choose between `Basic`, `Standard`, or `Premium` daily meal plans with instant wallet billing.
* **Vacation Safeguard**: A single toggle to pause deliveries and freeze deductions while on holiday.
* **Live Telemetry & Countdown**: Track deliveries second-by-second with live ETA updates calculated dynamically based on the rider's physical GPS coordinate broadcasts.
* **Premium Micro-Animations**: Features a custom 60 FPS hardware-accelerated SVG delivery animation (Scooter bouncy movements, spinning wheels, steam rising from tiffins).
* **Detailed Rating Loops**: Separated rating panels for Food Quality and Rider Service featuring customized tag chips (e.g. `Fresh 🔥`, `Tasty 😋`, `On Time ⚡`).
* **Metallic Shimmer Loaders**: Replaces static loading spinners with metallic pulsing skeleton shimmers.

### 2. 🛵 Rider Mobile App (`rider-app`)
* **GPS Navigation Simulator**: Toggles a mock navigation state that moves the rider along street-aligned paths, firing real-time telemetry updates to the backend WebSocket room.
* **Curved Road Mapping**: Draws curved, 90-degree street paths instead of straight-line paths.
* **Online/Offline Switch**: Simple controls for riders to update their availability.
* **Swipe-to-Complete**: Interactive swipe controls to check in packages and verify the Student's confirmation PIN code.

### 3. 🖥️ Admin Dashboard (`admin-dashboard`)
* **Fully Responsive Nav Layout**: Replaced traditional sidebars with a sticky, scrollable top-navigation header optimized for all mobile and desktop sizes.
* **Bulk Meal Scheduler**: One-click **"Start Today's Tiffins"** option to automatically bill active subscribers, generate delivery tickets, and assign them to online riders.
* **Animated Dashboards**: Stat counters that count up on load, SVG analytics charts that slide in, and a pulsing live activities log feed.
* **Real-time Order Alerts**: Floating toast banners with slide-in and bell-ringing animations that display immediately when new orders are placed.
* **Rider Control Room**: Register new riders, monitor fleet statuses, modify vehicle details, and reset secure delivery PIN codes.

### 4. 🎛️ Backend Server (`tiffin-backend`)
* **Live WebSocket Pipeline**: Built using Socket.io to manage room-based messaging between students, riders, and admins.
* **MongoDB Storage**: Mongoose database structures to support users, orders, financial ledgers, and live activity streams.
* **Firebase Authentication**: Encrypted password authentication backed by Firebase Admin SDK integrations.

---

## 🛠️ Local Installation & Setup

### Prerequisites
* [Node.js](https://nodejs.org) (v18 or above recommended)
* [MongoDB](https://www.mongodb.com) (Local or Cloud Atlas cluster)

---

### Step 1: Configure & Start Backend
1. Navigate to the backend folder:
   ```bash
   cd tiffin-backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in `tiffin-backend/`:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_token
   FIREBASE_PROJECT_ID=your_project_id
   ```
4. Place your Firebase service account JSON configuration in the root of the backend folder named `firebase-service-account.json`.
5. Seed initial mock database records (optional):
   ```bash
   npm run seed
   ```
6. Start the backend:
   ```bash
   npm start
   ```

---

### Step 2: Configure & Start Admin Panel
1. Navigate to the dashboard folder:
   ```bash
   cd ../admin-dashboard
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the environment `.env` file:
   ```env
   VITE_API_URL=http://localhost:5000
   VITE_SOCKET_URL=http://localhost:5000
   ```
4. Launch the local web server:
   ```bash
   npm run dev
   ```

---

### Step 3: Run the Mobile Apps (Student & Rider)
The mobile apps are built with Expo. You can run them in the browser or on physical devices.

#### Running Student App:
1. Navigate to `student-tiffin`:
   ```bash
   cd ../student-tiffin
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure target endpoints in the local `.env` file:
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:5000
   EXPO_PUBLIC_SOCKET_URL=http://localhost:5000
   ```
4. Launch Metro Bundler:
   ```bash
   npx expo start --web --port 8082
   ```

#### Running Rider App:
1. Navigate to `rider-app`:
   ```bash
   cd ../rider-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure target endpoints in the local `.env` file:
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:5000
   EXPO_PUBLIC_SOCKET_URL=http://localhost:5000
   ```
4. Launch Metro Bundler:
   ```bash
   npx expo start --web --port 8083
   ```
