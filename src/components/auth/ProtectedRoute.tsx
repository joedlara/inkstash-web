// src/components/auth/ProtectedRoute.tsx

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../ui/LoadingSpinner';

import '../../styles/auth/protectedRoute.css';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  fallback?: React.ReactNode;
  roles?: string[];
  permissions?: string[];
}

/**
 * ProtectedRoute component that handles authentication and authorization
 *
 * @param children - The component(s) to render if access is granted
 * @param requireAuth - Whether authentication is required (default: true)
 * @param redirectTo - Where to redirect if not authenticated (default: '/login')
 * @param fallback - Custom loading component
 * @param roles - Required user roles (if applicable)
 * @param permissions - Required user permissions (if applicable)
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  redirectTo = '/login',
  fallback,
  roles = [],
  permissions = [],
}) => {
  const { isAuthenticated, loading, initialized, user } = useAuth();
  const location = useLocation();

  // Show loading state while auth is being determined
  if (!initialized || loading) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="protected-route-loading">
        <LoadingSpinner size="large" />
        <p className="loading-text">Verifying authentication...</p>
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    // Save the attempted location for redirect after login
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If user is authenticated but doesn't have required roles
  if (isAuthenticated && roles.length > 0) {
    const userRoles = user?.roles || [];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return (
        <div className="access-denied">
          <div className="access-denied-content">
            <h2>Access Denied</h2>
            <p>You don't have permission to access this page.</p>
            <p>Required roles: {roles.join(', ')}</p>
            <button
              onClick={() => window.history.back()}
              className="back-button"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  // If user is authenticated but doesn't have required permissions
  if (isAuthenticated && permissions.length > 0) {
    const userPermissions = user?.permissions || [];
    const hasRequiredPermission = permissions.some(permission =>
      userPermissions.includes(permission)
    );

    if (!hasRequiredPermission) {
      return (
        <div className="access-denied">
          <div className="access-denied-content">
            <h2>Access Denied</h2>
            <p>You don't have permission to perform this action.</p>
            <p>Required permissions: {permissions.join(', ')}</p>
            <button
              onClick={() => window.history.back()}
              className="back-button"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  // If authentication is not required and user is authenticated,
  // redirect to dashboard (useful for login/signup pages)
  if (!requireAuth && isAuthenticated) {
    const from = (location.state as any)?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  // All checks passed, render the protected content
  return <>{children}</>;
};

/**
 * Higher-order component version of ProtectedRoute
 */
export const withProtectedRoute = <P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) => {
  return (props: P) => (
    <ProtectedRoute {...options}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

/**
 * Hook for checking permissions within components
 */
export const usePermissions = () => {
  const { user, isAuthenticated } = useAuth();

  const hasRole = (role: string): boolean => {
    if (!isAuthenticated || !user) return false;
    return user.roles?.includes(role) || false;
  };

  const hasPermission = (permission: string): boolean => {
    if (!isAuthenticated || !user) return false;
    return user.permissions?.includes(permission) || false;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    if (!isAuthenticated || !user) return false;
    return roles.some(role => user.roles?.includes(role));
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!isAuthenticated || !user) return false;
    return permissions.some(permission =>
      user.permissions?.includes(permission)
    );
  };

  const hasAllRoles = (roles: string[]): boolean => {
    if (!isAuthenticated || !user) return false;
    return roles.every(role => user.roles?.includes(role));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!isAuthenticated || !user) return false;
    return permissions.every(permission =>
      user.permissions?.includes(permission)
    );
  };

  return {
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAnyPermission,
    hasAllRoles,
    hasAllPermissions,
    userRoles: user?.roles || [],
    userPermissions: user?.permissions || [],
  };
};

/**
 * Component for conditionally rendering content based on permissions
 */
export const PermissionGate: React.FC<{
  children: React.ReactNode;
  roles?: string[];
  permissions?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}> = ({
  children,
  roles = [],
  permissions = [],
  requireAll = false,
  fallback = null,
}) => {
  const { hasAnyRole, hasAnyPermission, hasAllRoles, hasAllPermissions } =
    usePermissions();

  let hasAccess = true;

  if (roles.length > 0) {
    hasAccess = requireAll ? hasAllRoles(roles) : hasAnyRole(roles);
  }

  if (permissions.length > 0 && hasAccess) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

export default ProtectedRoute;
