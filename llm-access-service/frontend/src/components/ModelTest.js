// llm-access-service/frontend/src/components/ModelTest.js
import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext'; // Assuming you have this context
// Removed import of getUserProfile and userApiKey state, as backend handles key and usage

const ModelTest = () => {
    const { currentUser } = useAuth();
    const [selectedModel, setSelectedModel] = useState('gpt-4o');
    const [prompt, setPrompt] = useState('');
    const [conversationHistory, setConversationHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Effect to clear conversation history when user logs out or loads
     useEffect(() => {
         // Clear history when user logs out or on initial load before user is determined
         if (!currentUser) {
             setConversationHistory([]);
             setError(null); // Clear errors on logout
         }
         // Note: We no longer fetch API key here, as the backend handles it
     }, [currentUser]); // Dependency array includes currentUser

    const handleSendPrompt = async (e) => {
        e.preventDefault();
        // Check if user is logged in, prompt is not empty, and not already loading
        if (!currentUser || !prompt.trim() || loading) {
            // Optionally set an error if not logged in
            if (!currentUser) {
                 setError("Please log in to send a message.");
            }
            return;
        }

        const newUserMessage = { role: 'user', content: prompt };
        // Add user message to history immediately for better UX
        const newConversation = [...conversationHistory, newUserMessage];
        setConversationHistory(newConversation);
        setPrompt(''); // Clear the input field
        setLoading(true);
        setError(null); // Clear previous errors

        // Your Backend API Endpoint for chat completions
        // **REPLACE THIS URL** with the actual URL of your FastAPI backend service
        const apiUrl = 'http://your-backend-domain/chat/completion'; // e.g., http://localhost:8000/chat/completion during development

        try {
            // Get the Firebase ID token to authenticate with your backend
            const idToken = await currentUser.getIdToken();
            // console.log("Using Firebase ID Token:", idToken); // Optional: Log token for debugging

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`, // Send Firebase ID token to your backend
                },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: newConversation, // Send the updated conversation history to backend
                    // Add other parameters if your backend expects them
                }),
            });

            // Handle HTTP errors (like 401, 403, 500 from your backend)
            if (!response.ok) {
                const errorData = await response.json();
                console.error("Backend API Error:", errorData);
                // Display error message from backend (especially for 403 out of tokens)
                const errorMessage = errorData.detail || `API request failed with status ${response.status}`;
                setError(errorMessage);

                 // Optionally, revert the conversation state if the user's message wasn't successfully sent due to error
                 // setConversationHistory(conversationHistory); // Revert to state before adding user message
                return; // Exit if API call failed
            }

            // Process successful response from your backend (which forwards LiteLLM's response)
            const data = await response.json();
            const modelResponseContent = data?.choices?.[0]?.message?.content; // Assuming LiteLLM response format

            if (modelResponseContent) {
                const newModelMessage = { role: 'assistant', content: modelResponseContent };
                setConversationHistory(prevHistory => [...prevHistory, newModelMessage]); // Add model's message
            } else {
                 console.warn("API response did not contain expected message content:", data);
                 setError("Received an unexpected response from the model.");
                 // Optionally, revert user message if no valid response received
                 // setConversationHistory(conversationHistory);
            }

        } catch (err) {
            console.error("Fetch Error:", err);
            setError(`Failed to communicate with the backend: ${err.message}`);
             // Optionally, revert user message on fetch error
             // setConversationHistory(conversationHistory);
        } finally {
            setLoading(false); // Always set loading to false after attempt
        }
    };

    return (
        <div className="p-4 border rounded-md mb-4"> {/* Added border and margin */}
            <h2 className="text-xl font-bold mb-4">Test LLM Models</h2> {/* Updated Heading */}

            {/* Display Error Message */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <strong className="font-bold">Error:</strong>
                <span className="block sm:inline"> {error}</span>
              </div>
            )}

            {/* Message if not logged in */}
            {!currentUser && <p className="text-blue-700 mb-4">Please log in to use the model test feature.</p>}

            {/* Render chat interface only if user is logged in */}
            {currentUser && (
                <>
                    <div className="mb-4">
                        <label htmlFor="model-select" className="block text-sm font-medium text-gray-700">Select Model:</label>
                        <select
                            id="model-select"
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            disabled={loading} // Disable model selection while loading
                        >
                            <option value="gpt-4o">GPT-4o</option>
                            <option value="deepseek-r1">DeepSeek-R1</option>
                        </select>
                    </div>

                    {/* Conversation History Display Area */}
                    <div className="border rounded-md p-4 h-64 overflow-y-auto mb-4 bg-gray-50"> {/* Added background */}
                        {conversationHistory.length === 0 ? (
                            <p className="text-gray-500 text-center">Start the conversation...</p>
                        ) : (
                             conversationHistory.map((message, index) => (
                                 <div key={index} className={`mb-2 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                                     <span className={`inline-block p-2 rounded-lg max-w-xs break-words ${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}> {/* Added max-w-xs and break-words */}
                                         {message.content}
                                     </span>
                                 </div>
                             ))
                        )}
                        {loading && (
                             <div className={`mb-2 text-left`}>
                                 <span className={`inline-block p-2 rounded-lg bg-gray-200 text-gray-800`}>
                                      ...typing
                                 </span>
                              </div>
                        )}
                    </div>

                    {/* Prompt Input Area */}
                    <form onSubmit={handleSendPrompt}>
                        <textarea
                            className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500" // Added focus styles
                            rows="3"
                            placeholder="Enter your prompt here..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            disabled={loading} // Disable input while loading
                        ></textarea>
                        <button
                            type="submit"
                            className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed" // Added disabled styles
                            disabled={loading || !prompt.trim()} // Disable if loading or prompt is empty
                        >
                            {loading ? 'Sending...' : 'Send Prompt'}
                        </button>
                    </form>
                </>
            )}

        </div>
    );
};

export default ModelTest;
