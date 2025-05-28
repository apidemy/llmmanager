import React, { useState, useEffect } from 'react';
import { getUserProfile } from '../utils/firestore'; // Assuming you have this utility
import { useAuth } from '../AuthContext'; // Assuming you have this context hook

const ModelTest = () => {
  const { currentUser } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [prompt, setPrompt] = useState(''); // User's current input
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch user's API key
  useEffect(() => {
    const fetchApiKey = async () => {
      if (currentUser) {
        const profile = await getUserProfile(currentUser.uid);
        if (profile && profile.apiKey) {
          setApiKey(profile.apiKey);
        } else {
          setError("API key not found. Please generate one in the API Key Management section.");
        }
      }
    };

    fetchApiKey();
  }, [currentUser]);

  const handleSendMessage = async (event) => {
    // Prevent default form submission behavior if this is called from a form
    event?.preventDefault();

    if (!prompt.trim() || !apiKey) {
      setError("Please enter a prompt and ensure you have an API key.");
      return;
    }
    setLoading(true);
    setError(null);

    // Add user message to conversation history
    const userMessage = { role: 'user', content: prompt };
    const newConversation = [...conversation, userMessage];
    setConversation(newConversation);
    setPrompt(''); // Clear the input field
    
    // Define the API endpoint URL
    const apiUrl = 'http://your-domain:4000/v1/chat/completions'; // <<-- Replace with your actual LiteLLM proxy URL

    try {
      const response = await fetch(apiUrl, {
        method: 'POST', // Using POST for API calls
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: newConversation // Send the updated conversation history
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
      }
      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        // Add model response to conversation history
        const modelMessage = data.choices[0].message;
        setConversation([...newConversation, modelMessage]);
      } else {
        setError("API returned an unexpected response.");
      }

    } catch (err) {
      console.error("Error sending message:", err);
      setError(`Failed to send message: ${err.message}`);
      // Optionally, revert the conversation state if the user's message wasn't successfully sent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Test LLM Models</h2> {/* Heading for the section */}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {!apiKey ? (
        // Message if API key is missing
        <p className="text-yellow-700">Please generate an API key to test models.</p>
      ) : (
        <>
          <div className="mb-4">
            <label htmlFor="model-select" className="block text-sm font-medium text-gray-700">Select Model:</label>
            <select
              id="model-select"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={loading}
            >
              <option value="gpt-4o">GPT-4o</option>
              <option value="deepseek-r1">DeepSeek-R1</option>
            </select>
          </div>

          {/* Conversation history display area */}
          <div className="border rounded-md p-4 h-64 overflow-y-auto mb-4">
            {conversation.map((message, index) => (
              <div key={index} className={`mb-2 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                <span className={`inline-block px-3 py-1 rounded-lg ${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                  <strong>{message.role === 'user' ? 'You' : 'Model'}:</strong> {message.content}
                </span>
              </div>
            ))}
          </div>

          {/* Input area and Send button */}
          <div className="flex">
            <textarea
              className="flex-grow border rounded-l-md p-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              rows="2"
              placeholder="Enter your prompt..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading || !apiKey}
            />
            <button
              className={`bg-blue-500 text-white py-2 px-4 rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${loading || !apiKey ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleSendMessage}
              disabled={loading || !apiKey}
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ModelTest;