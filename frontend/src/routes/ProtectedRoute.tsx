import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, pinMustChange, policyAccepted } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // A guard who hasn't set their own PIN yet is locked out of every
  // route except the forced-change page itself.
  if (pinMustChange) return <Navigate to="/set-pin" replace />;

  // Every role must acknowledge the current policy at their own first
  // login before touching anything else.
  if (!policyAccepted) return <Navigate to="/accept-policy" replace />;

  if (allowedRoles && (!user?.role || !allowedRoles.includes(user.role))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}