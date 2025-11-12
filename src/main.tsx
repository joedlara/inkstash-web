// src/main.tsx - Simplified (no AuthProvider needed with singleton)

import 'uno.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RouteGuard from './auth/RouteGuard';
import Home from './pages/Home';
import Seller from './pages/Seller';
import ItemDetail from './pages/ItemDetail';
import SavedItems from './pages/SavedItems';
import BrowseFeatured from './pages/BrowseFeatured';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <RouteGuard>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/sell" element={<Seller />} />
          <Route path="/item/:id" element={<ItemDetail />} />
          <Route path="/auction/:id" element={<ItemDetail />} />
          <Route path="/saved-items" element={<SavedItems />} />
          <Route path="/browse-featured" element={<BrowseFeatured />} />
        </Routes>
      </RouteGuard>
    </BrowserRouter>
  </React.StrictMode>
);
