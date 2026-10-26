import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { installSecureLmsHandoffReceiver } from './lib/secureLmsHandoff.js';
import './styles.css';

installSecureLmsHandoffReceiver();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
