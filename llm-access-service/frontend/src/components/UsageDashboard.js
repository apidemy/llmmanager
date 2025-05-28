import React, { useEffect, useState } from 'react';
import { getUserBillingRecords } from '../utils/firestore';
// Assuming useAuth context hook is available
// import { useAuth } from '../AuthContext';

const UsageDashboard = () => {
  // const { currentUser } = useAuth(); // Get current user from context
  const currentUser = { uid: 'test-user-id' }; // Placeholder for demonstration

  const [usageRecords, setUsageRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsageData = async () => {
      if (currentUser) {
        setLoading(true);
        setError(null);
        try {
          const records = await getUserBillingRecords(currentUser.uid);
          setUsageRecords(records);
        } catch (err) {
          setError('Failed to fetch usage data.');
          console.error('Error fetching usage data:', err);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUsageData();
  }, [currentUser]);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Usage Dashboard</h2>

      {loading && <p>Loading usage data...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {!loading && !error && (
        usageRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b">Timestamp</th>
                  <th className="py-2 px-4 border-b">Model</th>
                  <th className="py-2 px-4 border-b">Input Tokens</th>
                  <th className="py-2 px-4 border-b">Output Tokens</th>
                  <th className="py-2 px-4 border-b">Cost ($)</th>
                </tr>
              </thead>
              <tbody>
                {usageRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b">{new Date(record.timestamp.seconds * 1000).toLocaleString()}</td>
                    <td className="py-2 px-4 border-b">{record.model}</td>
                    <td className="py-2 px-4 border-b">{record.inputTokens}</td>
                    <td className="py-2 px-4 border-b">{record.outputTokens}</td>
                    <td className="py-2 px-4 border-b">{record.cost.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No usage data available.</p>
        )
      )}
    </div>
  );
};

export default UsageDashboard;