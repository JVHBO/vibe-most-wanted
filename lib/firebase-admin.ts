/**
 * Firebase Admin SDK - Server-side only
 *
 * This file initializes Firebase Admin SDK for server-side operations
 * like sending notifications and accessing database with admin privileges.
 *
 * DO NOT import this file in client-side code!
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getDatabase, Database } from 'firebase-admin/database';

let app: App;
let database: Database;

// Initialize Firebase Admin SDK
if (!getApps().length) {
  try {
    // Try to initialize with service account (production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

      app = initializeApp({
        credential: cert(serviceAccount),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      });
    } else {
      // Fallback: Initialize without credentials for development
      // This will use application default credentials if available
      app = initializeApp({
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      });
    }

    console.log('✅ Firebase Admin SDK initialized');
  } catch (error: any) {
    console.error('❌ Firebase Admin SDK initialization error:', error.message);

    // If initialization fails, create a fallback (will fail at runtime but won't crash build)
    app = initializeApp({
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://vibe-most-wanted-default-rtdb.firebaseio.com',
    });
  }
} else {
  app = getApps()[0];
}

// Get database instance
database = getDatabase(app);

export { database };
