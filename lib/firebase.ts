import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firestore
export const db = getFirestore(app)

// Initialize Firebase Auth
export const auth = getAuth(app)

// Initialize Firebase Analytics (only in browser)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null

// Test Firebase connection
export const testFirebaseConnection = async () => {
  try {
    // Try to get the app instance    console.log("Firebase app initialized:", !!app)
    console.log("Firestore instance:", !!db)
    console.log("Firebase Auth instance:", !!auth)
    console.log("Firebase Analytics instance:", !!analytics)
    console.log("Project ID:", firebaseConfig.projectId)
    
    return { 
      success: true, 
      message: "Firebase connection test passed",
      projectId: firebaseConfig.projectId
    }
  } catch (error) {
    console.error("Firebase connection test failed:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

export default app
