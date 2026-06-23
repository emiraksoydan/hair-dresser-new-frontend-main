import React, { useCallback, useEffect, useState } from 'react';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useMultiAccount } from '../../context/MultiAccountContext';
import { useBottomSheet } from '../../hook/useBottomSheet';
import { useTheme } from '../../hook/useTheme';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import { useGetBadgeCountsQuery } from '../../store/api';
import { useAuth } from '../../hook/useAuth';
import { AccountSwitcherSheet } from './AccountSwitcherSheet';

type Props = {
  children: React.ReactNode;
};

/** Çoklu hesap sheet'ini mount eder ve `openAccountSwitcher` fonksiyonunu context'e kaydeder. */
export function AccountSwitcherHost({ children }: Props) {
  const { colors } = useTheme();
  const router = useSafeNavigation();
  const { isAuthenticated } = useAuth();
  const [accountSwitcherOpen, setAccountSwitcherOpen] = useState(false);
  const {
    accounts,
    currentUserId,
    switchAccount,
    registerOpenAccountSwitcher,
    prepareAccountSwitcherList,
    isSwitchingAccount,
    accountBadges,
    removeSavedAccount,
  } = useMultiAccount();

  const { data: badgeCounts } = useGetBadgeCountsQuery(undefined, {
    skip: !isAuthenticated,
  });

  const accountSwitcherSheet = useBottomSheet({
    snapPoints: ['50%', '85%'],
    enablePanDownToClose: true,
    enableOverDrag: false,
  });

  const openAccountSwitcherSheet = useCallback(async () => {
    await prepareAccountSwitcherList();
    accountSwitcherSheet.present();
  }, [prepareAccountSwitcherList, accountSwitcherSheet.present]);

  useEffect(() => {
    registerOpenAccountSwitcher(() => {
      void openAccountSwitcherSheet();
    });
  }, [registerOpenAccountSwitcher, openAccountSwitcherSheet]);

  return (
    <>
      {children}
      <BottomSheetModal
        ref={accountSwitcherSheet.ref}
        backdropComponent={accountSwitcherSheet.makeBackdrop()}
        handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
        backgroundStyle={{ backgroundColor: colors.sheetBg }}
        onChange={(index) => {
          accountSwitcherSheet.handleChange(index);
          setAccountSwitcherOpen(index >= 0);
        }}
        onDismiss={() => {
          accountSwitcherSheet.handleDismiss();
          setAccountSwitcherOpen(false);
        }}
        snapPoints={accountSwitcherSheet.snapPoints}
        index={0}
        enableDynamicSizing={false}
        enableOverDrag={accountSwitcherSheet.enableOverDrag}
        enablePanDownToClose={accountSwitcherSheet.enablePanDownToClose}
      >
        <BottomSheetView style={{ flex: 1, paddingTop: 8 }}>
          <AccountSwitcherSheet
            accounts={accounts}
            currentUserId={currentUserId}
            onSelectAccount={async (target) => {
              if (
                currentUserId == null ||
                target.id.toLowerCase() !== currentUserId.toLowerCase()
              ) {
                await switchAccount(target);
              }
            }}
            onClose={() => accountSwitcherSheet.dismiss()}
            onAddAccount={() =>
              router.push({ pathname: '/(auth)', params: { addAccount: 'true' } } as any)
            }
            onReauthAccount={(acc) =>
              router.push({
                pathname: '/(auth)',
                params: {
                  addAccount: 'true',
                  reauth: 'true',
                  phone: acc.phone || '',
                  userType: String(acc.userType),
                },
              } as any)
            }
            onRemoveAccount={(acc) => removeSavedAccount(acc.id)}
            accountBadges={accountBadges}
            currentAccountUnread={badgeCounts?.data?.notificationUnreadCount ?? 0}
          />
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}
