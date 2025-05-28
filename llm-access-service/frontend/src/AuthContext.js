// llm-access-service/frontend/src/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from './firebaseConfig'; // Import your Firebase auth instance

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      setLoading(false); // Set loading to false once auth state is determined
    });

    // Clean up the listener on unmount
    return unsubscribe;
  }, []);

  // Provide the currentUser and loading state through the context
  const value = {
    currentUser,
    loading, // Expose loading state
    // Optional: Add login, signup, logout functions here if you prefer them in context
    // login: (email, password) => auth.signInWithEmailAndPassword(email, password),
    // signup: (email, password) => auth.createUserWithEmailAndPassword(email, password),
    // logout: () => auth.signOut(),
  };

  // Render children only when the authentication state has been checked
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
