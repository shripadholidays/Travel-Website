import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, API_BASE_URL } from '@/services/api';
import type { User } from '@/types';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    loginWithGoogle: (credential: string) => Promise<void>;
    loginWithRedirect: () => void;
    loginWithEmail: (email: string, password: string) => Promise<void>;
    registerWithEmail: (displayName: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = API_BASE_URL;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    // Hydrate user from cookie-based session on mount
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await api.get<{ user: User }>('/users/profile');
                if (!cancelled) setUser(data.user);
            } catch {
                // Not logged in — that's fine
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Listen for 401 events from the API client
    useEffect(() => {
        const handler = () => setUser(null);
        window.addEventListener('auth:unauthorized', handler);
        return () => window.removeEventListener('auth:unauthorized', handler);
    }, []);

    // Login using Google One Tap credential (ID token)
    const loginWithGoogle = useCallback(async (credential: string) => {
        const data = await api.post<{ user: User }>('/auth/google', { credential });
        setUser(data.user);
        if (data.user.role === 'admin') {
            navigate('/admin/dashboard');
        } else {
            navigate('/dashboard');
        }
    }, [navigate]);

    // Login using redirect (traditional OAuth flow)
    const loginWithRedirect = useCallback(() => {
        window.location.href = `${API_URL}/auth/login`;
    }, []);

    const routeAfterAuth = useCallback((u: User) => {
        navigate(u.role === 'admin' ? '/admin/dashboard' : '/dashboard');
    }, [navigate]);

    // Manual email/password login
    const loginWithEmail = useCallback(async (email: string, password: string) => {
        const data = await api.post<{ user: User }>('/auth/login', { email, password });
        setUser(data.user);
        routeAfterAuth(data.user);
    }, [routeAfterAuth]);

    // Manual email/password registration
    const registerWithEmail = useCallback(async (displayName: string, email: string, password: string) => {
        const data = await api.post<{ user: User }>('/auth/register', { displayName, email, password });
        setUser(data.user);
        routeAfterAuth(data.user);
    }, [routeAfterAuth]);

    // Logout
    const logout = useCallback(async () => {
        try {
            await api.post('/auth/logout');
        } catch {
            // Even if logout API fails, clear local state
        }
        setUser(null);
        navigate('/');
    }, [navigate]);

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            loginWithGoogle,
            loginWithRedirect,
            loginWithEmail,
            registerWithEmail,
            logout,
            isAuthenticated: !!user,
            isAdmin: user?.role === 'admin',
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
