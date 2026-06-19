/**
 * App entry point. The provider/router order matters:
 *   BrowserRouter  -> gives the whole tree access to routing
 *     AuthProvider -> holds the in-memory token; ProtectedRoute reads it
 *       App        -> the route table
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
