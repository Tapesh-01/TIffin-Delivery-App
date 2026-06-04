const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let isInitialized = false;

try {
  // 1. Try to initialize using environment variables
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    isInitialized = true;
    console.log('🔥 Firebase Admin SDK initialized successfully via environment variables!');
  } 
  // 2. Try to initialize using service account file in backend root
  else {
    const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      isInitialized = true;
      console.log('🔥 Firebase Admin SDK initialized successfully via service account JSON file!');
    } else {
      console.log('⚠️ [Firebase Warning] Firebase environment variables and "firebase-service-account.json" are missing.');
      console.log('📱 Phone verification requests will run in Sandbox Simulation Mode (Master OTP: 123456).');
    }
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
}

module.exports = {
  admin,
  isFirebaseAdminInitialized: () => isInitialized,
};
