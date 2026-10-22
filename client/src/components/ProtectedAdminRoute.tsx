import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { rememberReturnTo } from '@/lib/return-to';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/spinner';

export const ProtectedAdminRoute = () => {
    const { isAuthenticated, isAdmin, isLoading } = useAuth();
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

    if (!isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};
