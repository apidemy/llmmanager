// llm-access-service/frontend/src/components/UsageDashboard.js
import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext'; // Assuming you have this context
import { getUserBillingRecords } from '../utils/firestore'; // Assuming you have this utility

const UsageDashboard = () => {
    const { currentUser } = useAuth();
    const [usageRecords, setUsageRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUsage = async () => {
            if (currentUser) {
                try {
                    setLoading(true);
                    // Pass currentUser.uid to fetch records for the logged-in user
                    const records = await getUserBillingRecords(currentUser.uid);
                    setUsageRecords(records);
                    setLoading(false);
                } catch (err) {
                    console.error("Error fetching usage records:", err);
                    setError("Failed to load usage data.");
                    setLoading(false);
                }
            } else {
                 // Clear records and error if user logs out
                 setUsageRecords([]);
                 setError(null);
                 setLoading(false);
            }
        };

        fetchUsage();
    }, [currentUser]); // Re-run effect when currentUser changes (login/logout)

    // Helper function to format timestamp
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'N/A';
        // Firestore timestamps are often Firebase Timestamp objects
        if (timestamp.toDate) {
            return timestamp.toDate().toLocaleString();
        }
        // Fallback for other potential formats (less common with Firestore)
        try {
            return new Date(timestamp).toLocaleString();
        } catch (e) {
            console.error("Could not format timestamp:", timestamp, e);
            return 'Invalid Date';
        }
    };

    return (
        <div className="p-4 border rounded-md mb-4"> {/* Added some styling */}
            <h2 className="text-xl font-bold mb-4">Usage Dashboard</h2>

            {/* Loading and Error Messages */}
            {loading && <p>Loading usage data...</p>}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <strong className="font-bold">Error:</strong>
                <span className="block sm:inline"> {error}</span>
              </div>
            )}

            {/* Message if not logged in */}
            {!currentUser && !loading && ( // Only show if not loading and not logged in
                <p className="text-blue-700">Please log in to view your usage dashboard.</p>
            )}

            {/* Message if logged in but no records found */}
            {currentUser && !loading && !error && usageRecords.length === 0 && (
                <p className="text-gray-600">No usage records found yet. Use the Model Test or API to generate some usage.</p>
            )}

            {/* Display Usage Table if records exist */}
            {currentUser && usageRecords.length > 0 && (
                <div className="overflow-x-auto"> {/* Allows horizontal scrolling on small screens */}
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Timestamp
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Model
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Input Tokens
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Output Tokens
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estimated Cost (USD)
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {usageRecords.map((record) => (
                                <tr key={record.id}> {/* Using doc.id as key */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                                        {formatTimestamp(record.timestamp)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                                        {record.model}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                                        {record.input_tokens || 0} {/* Display 0 if null/undefined */}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                                        {record.output_tokens || 0} {/* Display 0 if null/undefined */}
                                    </td>
                                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                                        ${record.cost !== undefined && record.cost !== null ? record.cost.toFixed(6) : 'N/A'} {/* Format cost and handle N/A */}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default UsageDashboard;
