import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  // 本番環境では環境変数を使用
  apiKey: "demo-api-key",
  authDomain: "board-game-demo.firebaseapp.com",
  databaseURL: "https://board-game-demo-default-rtdb.firebaseio.com",
  projectId: "board-game-demo",
  storageBucket: "board-game-demo.appspot.com",
  messagingSenderId: "123456789",
  appId: "demo-app-id"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);

// サービス取得
export const database = getDatabase(app);
export const auth = getAuth(app);

export default app;