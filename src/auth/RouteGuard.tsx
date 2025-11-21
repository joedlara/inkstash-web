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
  const { isAuthenticated, loading, initialized, user } = useAuth();
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
    '/onboarding', // Onboarding is accessible to authenticated users only
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

    // If authenticated user needs onboarding and tries to visit /onboarding page, redirect to home
    // The onboarding modal will show on the home page
    if (isAuthenticated && user && !user.onboarding_completed && currentPath === '/onboarding') {
      navigate('/', { replace: true });
      return;
    }

    // If user completed onboarding and is on onboarding page, redirect to home
    if (isAuthenticated && user && user.onboarding_completed && currentPath === '/onboarding') {
      navigate('/', { replace: true });
      return;
    }

    // If user is authenticated and trying to access auth pages, redirect to home
    if (isAuthenticated && isAuthRoute(currentPath)) {
      navigate('/', { replace: true });
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

    // If user is not authenticated and trying to access onboarding, redirect to home
    if (!isAuthenticated && currentPath === '/onboarding') {
      navigate('/', { replace: true });
      return;
    }
  }, [initialized, isAuthenticated, user, location, navigate]);

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
