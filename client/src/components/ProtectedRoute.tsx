import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Spinner } from "@/components/ui/spinner";
import { rememberReturnTo } from "@/lib/return-to";

export const ProtectedRoute = () => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner />
            </div>
        );
    }

    if (!isAuthenticated) {
        // Come back here (with any booking state) after signing in
        rememberReturnTo(location);
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};
