// src/components/auth/RouteGuard.tsx

import React, { useEffect, useRef, useState } from 'react';
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
  const wasAuthenticated = useRef(false);

  // Public routes that don't require authentication (landing page only)
  const publicRoutes = [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
    '/onboarding',
  ];

  // Routes that should redirect authenticated users away
  const authRoutes = ['/login', '/signup', '/forgot-password'];

  // All app routes require auth — anything not in publicRoutes is protected
  const protectedRoutes = [
    '/packs',
    '/pack-reveal',
    '/live',
    '/drops',
    '/marketplace',
    '/sell',
    '/item',
    '/auction',
    '/checkout',
    '/order',
    '/cart',
    '/my-bids',
    '/my-stash',
    '/settings',
    '/profile',
    '/seller-dashboard',
    '/seller-onboarding',
    '/list-item',
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

  // Detect fresh OAuth login and redirect to onboarding/home
  useEffect(() => {
    if (!initialized || !isAuthenticated || wasAuthenticated.current) return;
    wasAuthenticated.current = true;

    // Only redirect if landing on root with OAuth hash/params in URL
    const hasOAuthParams =
      window.location.hash.includes('access_token') ||
      window.location.search.includes('code=');

    if (hasOAuthParams) {
      const destination = user?.onboarding_completed ? '/' : '/onboarding';
      navigate(destination, { replace: true });
    }
  }, [initialized, isAuthenticated, user, navigate]);

  useEffect(() => {
    if (!isAuthenticated) wasAuthenticated.current = false;
  }, [isAuthenticated]);

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

    // If user is not authenticated and on any non-public route, redirect to home
    if (!isAuthenticated && !isPublicRoute(currentPath)) {
      navigate('/', {
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
