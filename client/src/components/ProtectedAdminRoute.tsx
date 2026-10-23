import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { rememberReturnTo } from '@/lib/return-to';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/spinner';
import { adminHome, canOpenAdminPath, isStaff } from '@/lib/admin-access';

export const ProtectedAdminRoute = () => {
    const { isAuthenticated, isLoading, user } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner />
            </div>
        );
    }

    if (!isAuthenticated) {
        rememberReturnTo(location);
        return <Navigate to="/login" replace />;
    }

    if (!isStaff(user)) {
        return <Navigate to="/dashboard" replace />;
    }

    // Each role only opens the pages it works on
    if (!canOpenAdminPath(user, location.pathname)) {
        return <Navigate to={adminHome(user)} replace />;
    }

    return <Outlet />;
};
