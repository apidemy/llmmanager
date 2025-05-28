// llm-access-service/frontend/src/components/ApiKeyManager.js
import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { getUserProfile } from '../utils/firestore'; // Import the utility function

const ApiKeyManager = () => {
    const { currentUser } = useAuth();
    const [apiKey, setApiKey] = useState(null); // State to store the user's API key
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [generating, setGenerating] = useState(false); // State for key generation loading

    // Fetch the user's API key when the component mounts or user changes
    useEffect(() => {
        const fetchApiKey = async () => {
            if (currentUser) {
                try {
                    setLoading(true);
                    const profile = await getUserProfile(currentUser.uid);
                    if (profile && profile.apiKey) {
                        setApiKey(profile.apiKey);
                    } else {
                        // Handle case where user doesn't have an API key yet
                        console.warn("User does not have an API key yet.");
                        setApiKey(null); // Explicitly set to null
                    }
                    setLoading(false);
                } catch (err) {
                    console.error("Error fetching API key:", err);
                    setError("Failed to load API key.");
                    setLoading(false);
                }
            } else {
                 setApiKey(null); // Clear key if user logs out
                 setLoading(false);
            }
        };

        fetchApiKey();
    }, [currentUser]); // Dependency array includes currentUser

    // Handle generating a new API key
    const handleGenerateApiKey = async () => {
        if (!currentUser || generating) {
            return; // Prevent generation if not logged in or already generating
        }

        setGenerating(true);
        setError(null);

        // Your Backend API Endpoint for key generation
        // **REPLACE THIS URL**
        const generateUrl = 'http://your-backend-domain/generate-api-key'; // e.g., http://localhost:8000/generate-api-key

        try {
            // Get Firebase ID token
            const idToken = await currentUser.getIdToken();

            const response = await fetch(generateUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`, // Send Firebase ID token
                },
                // Body might be empty or include request details if your backend needs them
                body: JSON.stringify({}) // Send an empty JSON body if no specific data is needed
            });

             if (!response.ok) {
                const errorData = await response.json();
                console.error("Backend API Error during key generation:", errorData);
                throw new Error(errorData.detail || `Key generation failed with status ${response.status}`);
            }

            const data = await response.json();
            const newApiKey = data?.apiKey; // Assuming your backend returns the new key

            if (newApiKey) {
                setApiKey(newApiKey); // Update state with the new key
                 console.log("New API key generated and fetched.");
                 // Optional: Re-fetch user profile to confirm key is in Firestore
                 // await getUserProfile(currentUser.uid);
            } else {
                 console.warn("Backend did not return an API key in the response:", data);
                 setError("Failed to generate API key.");
            }

        } catch (err) {
            console.error("Error calling backend for key generation:", err);
            setError(`Failed to generate API key: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };


    return (
        <div className="p-4 border rounded-md mb-4">
            <h2 className="text-xl font-bold mb-2">API Key Management</h2>

            {loading && <p>Loading API key status...</p>}
            {error && <p className="text-red-500">Error: {error}</p>}
             {!currentUser && <p>Please log in to manage API keys.</p>}

            {currentUser && !loading && !error && (
                <>
                    {apiKey ? (
                        <div>
                            <p className="mb-2">Your LiteLLM API Key:</p>
                            <p className="font-mono bg-gray-200 p-2 rounded break-all mb-4">
                                <strong>{apiKey}</strong>
                            </p>
                            <button
                                className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                                onClick={handleGenerateApiKey}
                                disabled={generating}
                            >
                                {generating ? 'Generating...' : 'Regenerate API Key'}
                            </button>
                             <p className="mt-2 text-sm text-gray-600">Note: Regenerating invalidates the old key.</p>
                        </div>
                    ) : (
                        <div>
                            <p className="mb-4">You don't have an API key yet. Generate one to start using the models via API.</p>
                            <button
                                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                                onClick={handleGenerateApiKey}
                                disabled={generating}
                            >
                                {generating ? 'Generating...' : 'Generate API Key'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ApiKeyManager;
