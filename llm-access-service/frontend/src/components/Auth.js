// llm-access-service/frontend/src/components/Auth.js
import React, { useState } from 'react';
import { auth } from '../firebaseConfig';
import firebase from 'firebase/app'; // Import firebase for GoogleAuthProvider
import { createUserProfile } from '../utils/firestore'; // Import the utility function

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSignUp, setIsSignUp] = useState(true); // State to toggle between signup and login

  // Email/Password Signup
  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      console.log("Signed up user:", user);

      // *** IMPORTANT ***
      // Create user document in Firestore immediately after successful signup
      // This initializes their free tier, balance, etc.
      await createUserProfile(user.uid, user.email);
      console.log("Firestore user profile created/verified.");

      // You might want to redirect the user here or update context
    } catch (error) {
      console.error("Error signing up:", error);
      // Display a user-friendly error message
      setError(error.message);
    }
  };

  // Email/Password Login
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      console.log("Logged in user:", user);
      // You might want to redirect the user here or update context
    } catch (error) {
      console.error("Error logging in:", error);
      setError(error.message);
    }
  };

  // Google Sign-in
  const handleGoogleSignIn = async () => {
      setError(null); // Clear previous errors
      try {
          const provider = new firebase.auth.GoogleAuthProvider();
          const result = await auth.signInWithPopup(provider);
          const user = result.user;
          console.log("Signed in with Google:", user);

          // *** IMPORTANT ***
          // Create user document in Firestore for Google sign-ins too (if they are new)
          // This ensures they have the initial free tier/balance fields
          await createUserProfile(user.uid, user.email);
          console.log("Firestore user profile created/verified for Google user.");

          // You might want to redirect the user here or update context
      } catch (error) {
          console.error("Error during Google sign-in:", error);
          setError(error.message);
      }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6">{isSignUp ? 'Sign Up' : 'Login'}</h2>

        <form onSubmit={isSignUp ? handleEmailSignup : handleEmailLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              id="password"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
          <div className="flex items-center justify-between">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="submit"
            >
              {isSignUp ? 'Sign Up' : 'Login'}
            </button>
            <button
              type="button" // Use type="button" to prevent form submission
              className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? 'Already have an account? Login' : 'Need an account? Sign Up'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
            <p className="mb-3">Or sign in with:</p>
             <button
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                onClick={handleGoogleSignIn}
            >
                Sign in with Google
            </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
