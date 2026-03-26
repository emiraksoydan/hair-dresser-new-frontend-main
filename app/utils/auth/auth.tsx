import { jwtDecode } from 'jwt-decode';

export function getUserTypeFromToken(token: string): string | null {
    try {
        const d = jwtDecode<{ userType?: string; UserType?: string }>(token);
        return d?.userType ?? d?.UserType ?? null;
    } catch {
        return null;
    }
}
