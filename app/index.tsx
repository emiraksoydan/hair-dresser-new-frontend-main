import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { tokenStore } from './lib/tokenStore';
import { getUserTypeFromToken } from './utils/auth/auth';
import { pathByUserType } from './utils/auth/redirect-by-user-type';

export default function Index() {
  const [target, setTarget] = useState<string>('/(auth)');
  useEffect(() => {
    const t = tokenStore.access;
    // Token rehydration handled silently
    if (!t) {
      setTarget('/(auth)');
      return;
    }
    const userType = getUserTypeFromToken(t);
    const path = pathByUserType(userType);
    setTarget(path);
  }, []);

  return <Redirect href={target} />;
}
