// src/main.tsx - Updated with AuthProvider

import 'uno.css';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContex';

import UserDashboard from './pages/UserDashboard';
import Home from './pages/Home';
import Auctions from './pages/Auctions';
import Signup from './pages/auth/Signup';
import NavBar from './components/main/NavBar';
import Footer from './components/main/Footer';
import CreateUsername from './pages/auth/CreateUsername';
import EmailConfirmation from './pages/auth/EmailConfirmation';
import Login from './components/auth/Login';

import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <NavBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auctions" element={<Auctions />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/create-username" element={<CreateUsername />} />
          <Route path="/email-confirmation" element={<EmailConfirmation />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
