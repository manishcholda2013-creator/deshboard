import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyAoTQao_dujs3Q4tdYPwIqheVtFCzxdeGo',
  authDomain: 'codeflex-ai2.firebaseapp.com',
  projectId: 'codeflex-ai2',
  storageBucket: 'codeflex-ai2.firebasestorage.app',
  messagingSenderId: '614216140667',
  appId: '1:614216140667:web:34a003d5f56d35d8dcdfde',
  measurementId: 'G-YV00SF0RTV',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
