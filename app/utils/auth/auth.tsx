import { useAuth } from '../../hook/useAuth';

/**
 * Utility function to get user type from token
 * Uses useAuth hook internally but can be called from non-hook contexts
 * For hook contexts, use useAuth() directly
 */
export function getUserTypeFromToken(token: string): string | null {
    // This function is kept for backward compatibility
    // It uses the same logic as useAuth hook
    try {
        const { jwtDecode } = require('jwt-decode');
        const { JwtPayload } = require('../../types');
        const d = jwtDecode(token);

        const userType = d?.userType || d?.UserType || (d as any)['userType'] || (d as any)['UserType'];
        return userType ?? null;
    } catch {
        return null;
    }
}
