// llm-access-service/frontend/src/firebaseConfig.js
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';

// Use environment variables for Firebase config
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY, // REPLACE with your key or ensure env var is set
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN, // REPLACE or ensure env var
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID, // REPLACE or ensure env var
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET, // REPLACE or ensure env var
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID, // REPLACE or ensure env var
  appId: process.env.REACT_APP_FIREBASE_APP_ID // REPLACE or ensure env var
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

export { auth, db };