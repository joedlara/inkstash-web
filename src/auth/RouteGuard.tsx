// src/components/auth/RouteGuard.tsx

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from "../hooks/useAuth"
import '../styles/auth/routeGuard.css';

interface RouteGuardProps {
  children: React.ReactNode;
}

/**
 * RouteGuard component that handles global authentication logic
 * and redirects for the entire application
 */
const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const { isAuthenticated, loading, initialized } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/pieces',
    '/artists',
    '/livestreams',
    '/auctions',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
    '/sell',
  ];

  // Routes that should redirect authenticated users away
  const authRoutes = ['/login', '/signup', '/forgot-password'];

  // Protected routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/profile',
    '/settings',
    '/collection',
    '/messages',
    '/notifications',
    '/saved-items',
  ];

  const isPublicRoute = (path: string): boolean => {
    return publicRoutes.some(route => {
      if (route === '/') return path === '/';
      return path.startsWith(route);
    });
  };

  const isAuthRoute = (path: string): boolean => {
    return authRoutes.some(route => path.startsWith(route));
  };

  const isProtectedRoute = (path: string): boolean => {
    return protectedRoutes.some(route => path.startsWith(route));
  };

  useEffect(() => {
    // Don't do anything until auth is initialized
    if (!initialized) return;

    setHasCheckedAuth(true);
    const currentPath = location.pathname;

    // If user is authenticated and trying to access auth pages, redirect to dashboard
    if (isAuthenticated && isAuthRoute(currentPath)) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
      return;
    }

    // If user is not authenticated and trying to access protected routes, redirect to login
    if (!isAuthenticated && isProtectedRoute(currentPath)) {
      navigate('/login', {
        state: { from: location },
        replace: true,
      });
      return;
    }

    // If user is not authenticated and on root, optionally redirect
    if (!isAuthenticated && currentPath === '/') {
      // You can choose to redirect to login or show public landing page
      // navigate('/login');
    }
  }, [initialized, isAuthenticated, location, navigate]);

  // Show loading screen while checking authentication
  if (!initialized || (loading && !hasCheckedAuth)) {
    return (
      <div className="route-guard-loading">
        <div className="loading-spinner"></div>
        <p className="loading-message">Initializing application...</p>
      </div>
    );
  }

  // Show loading screen during route transitions for protected routes
  if (loading && isProtectedRoute(location.pathname)) {
    return (
      <div className="route-guard-loading">
        <div className="loading-spinner"></div>
        <p className="loading-message">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default RouteGuard;
