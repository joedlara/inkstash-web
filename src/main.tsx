// src/main.tsx - Simplified (no AuthProvider needed with singleton)

import 'uno.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Seller from './pages/Seller';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sell" element={<Seller />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
