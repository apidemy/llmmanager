// llm-access-service/frontend/src/App.js
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import Auth from './components/Auth'; // Assuming Auth.js path
import ModelTest from './components/ModelTest'; // Assuming ModelTest.js path
import UsageDashboard from './components/UsageDashboard'; // Assuming UsageDashboard.js path
import ApiKeyManager from './components/ApiKeyManager'; // Assuming ApiKeyManager.js path

// Helper component to render content based on auth status
const AppContent = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <p>Loading application...</p>; // Or a spinner
  }

  return (
    <div>
      <h1>My LLM Service</h1>
      {/* Render navigation or content based on auth status */}
      {currentUser ? (
        <div>
          <p>Welcome, {currentUser.email}!</p>
          {/* Example: Render dashboard components */}
          <ApiKeyManager />
          <UsageDashboard />
          <ModelTest />
          {/* Add a logout button in a real app */}
        </div>
      ) : (
        // Render auth component if not logged in
        <Auth />
      )}
    </div>
  );
};


function App() {
  return (
    <AuthProvider>
      <AppContent />
      {/* In a real app, you'd use React Router here */}
      {/* <Router> */}
      {/*   <AuthProvider> */}
      {/*     <Switch> */}
      {/*       <Route path="/login" component={Auth} /> */}
      {/*       <ProtectedRoute path="/dashboard" component={Dashboard} /> {/* Example Protected Route */}
      {/*       <Route path="/" exact component={HomePage} /> */}
      {/*     </Switch> */}
      {/*   </AuthProvider> */}
      {/* </Router> */}
    </AuthProvider>
  );
}

export default App;
