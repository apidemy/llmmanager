import React, { useEffect, useState } from 'react';
import { getUserProfile } from '../utils/firestore'; // Assuming firestore.js is in the utils directory
// Assume getUserProfile function is defined elsewhere and imported
// Assume useAuth hook is available to get the currentUser
// Example placeholder:
const getUserProfile = async (userId) => {
  try {
    const doc = await firestore.collection('users').doc(userId).get();
    if (doc.exists) {
      return doc.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting user profile: ", error);
    return null;
  }
};


const ApiKeyManager = () => {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // const { currentUser } = useAuth(); // Get the current authenticated user using the context hook
  // For now, let's simulate a user for demonstration
  const currentUser = { uid: 'mock-user-id' };

  useEffect(() => {
    const fetchApiKey = async () => {
      if (currentUser) {
        try {
          const userProfile = await getUserProfile(currentUser.uid);
          if (userProfile?.apiKey) {
            setApiKey(userProfile.apiKey); // Use optional chaining
          } else {
            setApiKey("No API key found. Generate one below.");
          }
        } catch (err) {
          setError("Failed to fetch API key.");
          console.error(err);
        } finally {
          setLoading(false);
        }      } else {
        setError("User not authenticated.");
        setLoading(false);
      }
    };

    fetchApiKey();
  }, [currentUser]); // Re-run effect if currentUser changes

  const generateNewApiKey = async () => {
    // This function will eventually call your backend API to generate a new key
    alert("Generate New API Key functionality is not yet implemented.");
    // Example of a placeholder for a future backend call:
    // try {
    //   const response = await fetch('/api/generate-api-key', { // Replace with your backend endpoint
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'Authorization': `Bearer ${await user.getIdToken()}` // Example of passing Firebase auth token
    //     },
    //     body: JSON.stringify({ userId: user.uid })
    //   });
    //   const data = await response.json();
    //   if (response.ok) {
    //     setApiKey(data.apiKey);
    //     // Optionally update the key in Firestore here if your backend doesn't
    //   } else {
    //     setError(data.error || "Failed to generate new API key.");
    //   }
    // } catch (err) {
    //   setError("An error occurred while generating API key.");
    //   console.error(err);
    // }
  };

  return (
    <div className="p-4 bg-gray-100 rounded-md shadow-md">
      <h2 className="text-xl font-bold mb-4">API Key Management</h2>
      {loading ? (
        <p>Loading API key...</p>
      ) : error ? (
        <p className="text-red-500">Error: {error}</p>
      ) : (
        <>
          <div className="mb-4">
            <p className="font-semibold">Your API Key:</p>
            {apiKey ? (
              <p className="bg-white p-2 rounded border border-gray-300 break-all">{apiKey}</p>
            ) : (
              <p className="bg-white p-2 rounded border border-gray-300 italic">No API key found. Generate one below.</p>
            )}
          </div>
          <button
            onClick={generateNewApiKey}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            {apiKey ? 'Generate New API Key' : 'Generate API Key'}
          </button>
        </>
      )}
      <p className="mt-2 text-sm text-gray-600">Keep your API key secure. Do not share it publicly.</p>
    </div>
  );
};

export default ApiKeyManager;