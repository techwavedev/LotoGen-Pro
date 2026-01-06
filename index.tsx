import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Google Analytics 4 initialization function (called after consent)
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

export function initializeGA() {
  if (!GA_MEASUREMENT_ID) return;
  
  // Don't re-initialize if already loaded
  if ((window as any).gaInitialized) return;
  (window as any).gaInitialized = true;

  // Load gtag.js script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize gtag
  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: any[]) {
    (window as any).dataLayer.push(args);
  }
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);
}

// Auto-initialize GA if user already consented
if (localStorage.getItem('cookie-consent') === 'accepted') {
  initializeGA();
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);