import { Redirect } from 'expo-router';
import { tokenStore } from './lib/tokenStore';
import { getUserTypeFromToken } from './utils/auth/auth';
import { pathByUserType } from './utils/auth/redirect-by-user-type';

// _layout.tsx'te rehydrateTokens() tamamlanmadan render başlamıyor (ready flag),
// bu yüzden tokenStore.access burada güvenle senkron okunabilir.
export default function Index() {
  const token = tokenStore.access;
  const userType = token ? getUserTypeFromToken(token) : null;
  const target = pathByUserType(userType);
  return <Redirect href={target as any} />;
}
