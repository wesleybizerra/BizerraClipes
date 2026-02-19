import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

if (!container) {
  throw new Error("Elemento root não encontrado");
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    {/* Removed redundant AuthProvider wrapper here as it is already provided inside the App component */}
    <App />
  </React.StrictMode>
);

console.log("Sistema Bizerra Clipes iniciado com sucesso.");