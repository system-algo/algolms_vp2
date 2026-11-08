import { installTabIsolatedLmsStorage } from './security/secureLmsHandoffReceiver.js';
installTabIsolatedLmsStorage();

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { installSecureLmsHandoffReceiver } from './security/secureLmsHandoffReceiver.js';
import { installRoleAuthFailureGuard } from './lib/roleAuthFailureGuard.js';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import './styles.css';

installSecureLmsHandoffReceiver();
installRoleAuthFailureGuard();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
