import './instrument';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';
createRoot(document.getElementById('root')!).render(
  <React.StrictMode><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { staleTime: 15000 } } })}><HashRouter><App /></HashRouter></QueryClientProvider></React.StrictMode>,
);
