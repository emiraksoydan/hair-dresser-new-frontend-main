import React from 'react';
import { SocialTabLayout } from '../components/social/SocialTabLayout';
import { AccountSwitcherHost } from '../components/common/AccountSwitcherHost';

export default function SocialRootLayout() {
  return (
    <AccountSwitcherHost>
      <SocialTabLayout />
    </AccountSwitcherHost>
  );
}
