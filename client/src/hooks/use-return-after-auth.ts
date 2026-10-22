import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { takeReturnTo } from '@/lib/return-to';

/** On the login/register pages: once signed in, go back to where the visitor came from. */
export function useReturnAfterAuth() {
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) return;
        const target = takeReturnTo();
        if (target) {
            navigate({ pathname: target.pathname, search: target.search }, { replace: true, state: target.state });
        } else {
            navigate(user.role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true });
        }
    }, [user, navigate]);
}
