// src/main.tsx - Simplified (no AuthProvider needed with singleton)

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme/theme';
import RouteGuard from './auth/RouteGuard';
import Home from './pages/Home';
import Seller from './pages/Seller';
import ItemDetail from './pages/ItemDetail';
import BrowseFeatured from './pages/BrowseFeatured';
import PaymentAndShipping from './pages/PaymentAndShipping';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import OrderManagement from './pages/OrderManagement';
import FeaturedArtists from './pages/FeaturedArtists';
import PopularShows from './pages/PopularShows';
import Cart from './pages/Cart';
import MyBids from './pages/MyBids';
import MyStash from './pages/MyStash';
import AccountSettings from './pages/AccountSettings';
import Onboarding from './pages/Onboarding';
import { CartProvider } from './contexts/CartContext';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CartProvider>
        <BrowserRouter>
          <RouteGuard>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/sell" element={<Seller />} />
              <Route path="/item/:id" element={<ItemDetail />} />
              <Route path="/auction/:id" element={<ItemDetail />} />
              <Route path="/browse-featured" element={<BrowseFeatured />} />
              <Route path="/featured-artists" element={<FeaturedArtists />} />
              <Route path="/popular-shows" element={<PopularShows />} />
              <Route path="/payments" element={<PaymentAndShipping />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-success" element={<OrderSuccess />} />
              <Route path="/order/:orderId" element={<OrderManagement />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/my-bids" element={<MyBids />} />
              <Route path="/my-stash" element={<MyStash />} />
              <Route path="/settings" element={<AccountSettings />} />
            </Routes>
          </RouteGuard>
        </BrowserRouter>
      </CartProvider>
    </ThemeProvider>
  </React.StrictMode>
);
