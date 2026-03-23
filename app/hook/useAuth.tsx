import { useMemo, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { tokenStore } from '../lib/tokenStore';
import { JwtPayload, UserType } from '../types';

interface AuthResult {
    userType: UserType | null;
    userId: string | null;
    isAuthenticated: boolean;
    token: string | null;
    userName: string | null;
    userFullName: string | null;
}

/**
 * Custom hook for authentication state and user information
 * Centralizes JWT decoding logic to avoid code duplication
 *
 * IMPORTANT: Uses useState + useEffect to make token changes reactive
 * This ensures components re-render when token changes (login/logout/refresh)
 */
export const useAuth = (): AuthResult => {
    // Make token reactive - components will re-render when token changes
    const [token, setToken] = useState<string | null>(tokenStore.access);

    // Subscribe to token changes
    useEffect(() => {
        // Initial sync
        setToken(tokenStore.access);

        // Listen for token changes (login, logout, refresh)
        const unsubscribe = tokenStore.onTokenChange((hasToken, newToken) => {
            // Update local state when token changes
            setToken(hasToken ? (newToken ?? tokenStore.access) : null);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const userType = useMemo(() => {
        if (!token) return null;
        try {
            const decoded = jwtDecode<JwtPayload>(token);
            const ut = decoded.userType?.toLowerCase();
            if (ut === 'customer') return UserType.Customer;
            if (ut === 'freebarber') return UserType.FreeBarber;
            if (ut === 'barberstore') return UserType.BarberStore;
            return null;
        } catch {
            return null;
        }
    }, [token]);

    const userId = useMemo(() => {
        if (!token) return null;
        try {
            const decoded = jwtDecode<JwtPayload>(token);
            // Backend'de hem "identifier" hem de "sub" (ClaimTypes.NameIdentifier) claim'i ekleniyor
            // Frontend'deki JwtPayload type'ında "identifier" required olduğu için öncelikli kontrol ediyoruz
            return decoded.identifier || (decoded as any).sub || (decoded as any).userId || null;
        } catch {
            return null;
        }
    }, [token]);

    const userName = useMemo(() => {
        if (!token) return null;
        try {
            const decoded = jwtDecode<JwtPayload>(token);
            return decoded.name || null;
        } catch {
            return null;
        }
    }, [token]);

    const userFullName = useMemo(() => {
        if (!token) return null;
        try {
            const decoded = jwtDecode<JwtPayload>(token);
            const name = decoded.name || '';
            const lastName = decoded.lastName || '';
            if (name && lastName) {
                return `${name} ${lastName}`;
            }
            return name || lastName || null;
        } catch {
            return null;
        }
    }, [token]);

    return {
        userType,
        userId,
        isAuthenticated: !!token,
        token,
        userName,
        userFullName,
    };
};

