import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Google Analytics is now handled in App.tsx / useAnalytics hook


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

import { AuthProvider } from './hooks/AuthContext';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);