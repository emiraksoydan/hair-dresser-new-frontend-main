export function pathByUserType(userType?: string | null) {
    if (!userType) {
        return '/(auth)';
    }

    // Normalize: trim whitespace and convert to lowercase for case-insensitive comparison
    const normalized = String(userType).trim().toLowerCase();

    // C# enum.ToString() returns "Customer", "FreeBarber", "BarberStore"
    // Handle all possible case variations
    switch (normalized) {
        case 'customer':
        case '0':
            return '/(customertabs)';
        case 'freebarber':
        case '1':
            return '/(freebarbertabs)';
        case 'barberstore':
        case '2':
            return '/(barberstoretabs)';
        default:
            return '/(auth)';
    }
}
