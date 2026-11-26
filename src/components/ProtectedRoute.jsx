import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Loading from './Loading.jsx';

// Redirects to /login when signed out, and to the dashboard when a role is required but missing.
// The database enforces the same rules: this only decides what the screen shows.
export default function ProtectedRoute({ children, role }) {
  const { user, loading, profileError, isReviewer } = useAuth();
  const location = useLocation();
  if (loading) return <Loading label="Checking your account" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (profileError) {
    return (
      <div className="container page">
        <div className="notice notice-error" role="alert">We could not load your profile: {profileError}</div>
      </div>
    );
  }
  if (role === 'reviewer' && !isReviewer) return <Navigate to="/dashboard" replace />;
  return children;
}
