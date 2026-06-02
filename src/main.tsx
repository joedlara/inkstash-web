import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme/theme';
import RouteGuard from './auth/RouteGuard';
import Home from './pages/Home';
import Seller from './pages/Seller';
import ItemDetail from './pages/ItemDetail';
import Packs from './pages/Packs';
import PackDetail from './pages/PackDetail';
import Live from './pages/Live';
import Drops from './pages/Drops';
import Raffles from './pages/Raffles';
import Marketplace from './pages/Marketplace';
import Checkout from './pages/CheckoutNew';
import OrderSuccess from './pages/OrderSuccess';
import OrderManagement from './pages/OrderManagement';
import CartCheckoutSuccess from './pages/CartCheckoutSuccess';
import MyBids from './pages/MyBids';
import MyStash from './pages/MyStash';
import Purchases from './pages/Purchases';
import AccountSettings from './pages/AccountSettings';
import Onboarding from './pages/Onboarding';
import SellerOnboarding from './pages/SellerOnboarding';
import SellerDashboard from './pages/SellerDashboard';
import ListItem from './pages/ListItem';
import UserProfile from './pages/UserProfile';
import VendorProfile from './pages/VendorProfile';
import { CartProvider } from './contexts/CartContext';
import AppLayout from './components/layout/AppLayout';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CartProvider>
        <BrowserRouter>
          <RouteGuard>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/seller-onboarding" element={<SellerOnboarding />} />
                <Route path="/seller-dashboard" element={<SellerDashboard />} />
                <Route path="/list-item" element={<ListItem />} />
                <Route path="/sell" element={<Seller />} />
                <Route path="/item/:id" element={<ItemDetail />} />
                <Route path="/auction/:id" element={<ItemDetail />} />
                <Route path="/packs" element={<Packs />} />
                <Route path="/packs/:packId" element={<PackDetail />} />
                <Route path="/pack-reveal/:purchaseId" element={<Navigate to="/packs" replace />} />
                <Route path="/live" element={<Live />} />
                <Route path="/drops" element={<Drops />} />
                <Route path="/raffles" element={<Raffles />} />
                <Route path="/marketplace" element={<Marketplace />} />
                {/* Redirects for removed routes */}
                <Route path="/browse-featured" element={<Navigate to="/packs" replace />} />
                <Route path="/featured-artists" element={<Navigate to="/packs" replace />} />
                <Route path="/popular-shows" element={<Navigate to="/packs" replace />} />
                <Route path="/browse" element={<Navigate to="/packs" replace />} />
                <Route path="/featured" element={<Navigate to="/packs" replace />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-success" element={<OrderSuccess />} />
                <Route path="/order/:orderId" element={<OrderManagement />} />
                <Route path="/cart-checkout-success" element={<CartCheckoutSuccess />} />
                <Route path="/my-bids" element={<MyBids />} />
                <Route path="/my-stash" element={<MyStash />} />
                <Route path="/purchases" element={<Purchases />} />
                <Route path="/settings" element={<AccountSettings />} />
                <Route path="/v/:handle" element={<VendorProfile />} />
                <Route path="/profile/:userId" element={<UserProfile />} />
                <Route path="/*" element={<UserProfile />} />
              </Routes>
            </AppLayout>
          </RouteGuard>
        </BrowserRouter>
      </CartProvider>
    </ThemeProvider>
  </React.StrictMode>
);
