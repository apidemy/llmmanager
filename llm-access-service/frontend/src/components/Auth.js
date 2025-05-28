// llm-access-service/frontend/src/components/Auth.js
import React, { useState } from 'react';
import { auth } from '../firebaseConfig';
import firebase from 'firebase/app';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSignUp, setIsSignUp] = useState(true);

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await auth.createUserWithEmailAndPassword(email, password);
      // User signed up successfully
    } catch (error) {
      setError(error.message);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await auth.signInWithEmailAndPassword(email, password);
      // User logged in successfully
    } catch (error) {
      setError(error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      await auth.signInWithPopup(provider);
      // User signed in with Google successfully
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div>
      <h2>{isSignUp ? 'Sign Up' : 'Login'}</h2>
      <form onSubmit={isSignUp ? handleEmailSignUp : handleEmailLogin}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">{isSignUp ? 'Sign Up' : 'Login'}</button>
      </form>

      <button onClick={handleGoogleSignIn}>Sign in with Google</button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <button onClick={() => setIsSignUp(!isSignUp)}>
        Switch to {isSignUp ? 'Login' : 'Sign Up'}
      </button>
    </div>
  );
};

export default Auth;