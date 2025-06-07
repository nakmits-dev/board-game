import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC7rXsiQUnJ1VP3SSJqXbsR2SJ8qZWbCn0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "board-game-5164b.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://board-game-5164b-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "board-game-5164b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "board-game-5164b.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "888886884083",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:888886884083:web:00fef39f7458d6794f6986",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-C45MEQV4W0"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);

// サービス取得
export const database = getDatabase(app);
export const auth = getAuth(app);

export default app;