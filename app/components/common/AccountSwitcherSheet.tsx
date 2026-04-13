import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Avatar, Icon } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Text } from './Text';
import { SavedAccount } from '../../lib/multiAccountStorage';
import { UserType } from '../../types';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { DEFAULT_AVATAR } from '../../constants/images';

interface AccountSwitcherSheetProps {
  accounts: SavedAccount[];
  currentUserId: string | null;
  onSelectAccount: (account: SavedAccount) => Promise<void>;
  onClose: () => void;
  onAddAccount?: () => void;
}

function userTypeLabel(t: (k: string) => string, ut: UserType): string {
  switch (ut) {
    case UserType.Customer:
      return t('auth.customer');
    case UserType.FreeBarber:
      return t('auth.barber');
    case UserType.BarberStore:
      return t('auth.salon');
    default:
      return '';
  }
}

function userTypeIcon(ut: UserType): string {
  switch (ut) {
    case UserType.Customer:
      return 'account';
    case UserType.FreeBarber:
      return 'scissors-cutting';
    case UserType.BarberStore:
      return 'store';
    default:
      return 'account';
  }
}

const AccountCard: React.FC<{
  account: SavedAccount;
  isCurrent: boolean;
  onPress: () => void;
  isSwitching: boolean;
  /** Çift dokunuş / animasyon kuyruğu: seçim başlamadan önce senkron kontrol */
  switchInFlightRef: React.MutableRefObject<boolean>;
}> = ({ account, isCurrent, onPress, isSwitching, switchInFlightRef }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (isCurrent || isSwitching || switchInFlightRef.current) return;
    scale.value = withSpring(0.95, { damping: 20, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 20, stiffness: 300 });
      runOnJS(onPress)();
    });
  };

  const avatarSource = account.avatarUrl
    ? { uri: account.avatarUrl }
    : DEFAULT_AVATAR;

  return (
    <Animated.View style={[animStyle, { marginBottom: 10 }]}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={isCurrent || isSwitching}
        activeOpacity={0.8}
        style={[
          styles.card,
          {
            backgroundColor: colors.cardBg,
            borderColor: isCurrent ? '#fea60e' : 'transparent',
            borderWidth: isCurrent ? 1.5 : 0,
            opacity: isSwitching && !isCurrent ? 0.5 : 1,
          },
        ]}
      >
        <View style={styles.avatarWrapper}>
          <Avatar.Image size={48} source={avatarSource} />
          {isCurrent && (
            <View style={styles.activeDot} />
          )}
        </View>

        <View style={styles.info}>
          <Text
            numberOfLines={1}
            style={[styles.name, { color: colors.sectionHeaderText }]}
          >
            {account.displayName}
          </Text>
          <View style={styles.typeRow}>
            <Icon source={userTypeIcon(account.userType)} size={14} color={colors.textSecondary} />
            <Text style={[styles.typeLabel, { color: colors.textSecondary }]}>
              {userTypeLabel(t, account.userType)}
            </Text>
            {isCurrent && (
              <Text style={styles.currentBadge}>
                {t('accounts.current')}
              </Text>
            )}
          </View>
        </View>

        {!isCurrent && (
          <Icon source="chevron-right" size={20} color={colors.textSecondary} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export const AccountSwitcherSheet: React.FC<AccountSwitcherSheetProps> = ({
  accounts,
  currentUserId,
  onSelectAccount,
  onClose,
  onAddAccount,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const switchInFlightRef = useRef(false);

  const handleSelect = useCallback(
    async (account: SavedAccount) => {
      if (switchInFlightRef.current) return;
      switchInFlightRef.current = true;
      setSwitchingId(account.id);
      onClose();
      try {
        await onSelectAccount(account);
      } finally {
        switchInFlightRef.current = false;
        setSwitchingId(null);
      }
    },
    [onSelectAccount, onClose]
  );

  // Sort: current account first, then others by savedAt desc (id GUID büyük/küçük harf farkı olabilir)
  const sorted = [...accounts].sort((a, b) => {
    const cur = currentUserId?.toLowerCase() ?? '';
    if (cur && a.id.toLowerCase() === cur) return -1;
    if (cur && b.id.toLowerCase() === cur) return 1;
    return b.savedAt - a.savedAt;
  });

  const isSwitching = switchingId !== null;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.sectionHeaderText }]}>
          {t('accounts.switchTitle')}
        </Text>
        {isSwitching && (
          <ActivityIndicator size="small" color="#fea60e" />
        )}
      </View>

      <BottomSheetScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {sorted.map(account => (
          <AccountCard
            key={account.id}
            account={account}
            isCurrent={
              currentUserId != null &&
              account.id.toLowerCase() === currentUserId.toLowerCase()
            }
            isSwitching={isSwitching}
            switchInFlightRef={switchInFlightRef}
            onPress={() => handleSelect(account)}
          />
        ))}

        {onAddAccount && (
          <TouchableOpacity
            onPress={() => { onClose(); onAddAccount(); }}
            style={[styles.addBtn, { borderColor: '#fea60e' }]}
            activeOpacity={0.7}
          >
            <Icon source="account-plus-outline" size={18} color="#fea60e" />
            <Text style={[styles.addText, { color: '#fea60e' }]}>
              {t('accounts.addAccount')}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={onClose}
          style={[styles.cancelBtn, { borderColor: colors.textSecondary }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
            {t('common.cancel')}
          </Text>
        </TouchableOpacity>
      </BottomSheetScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: 'CenturyGothic-Bold',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontFamily: 'CenturyGothic-Bold',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeLabel: {
    fontSize: 13,
    fontFamily: 'CenturyGothic',
  },
  currentBadge: {
    fontSize: 11,
    color: '#fea60e',
    fontFamily: 'CenturyGothic-Bold',
    marginLeft: 4,
    backgroundColor: 'rgba(254,166,14,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    marginTop: 8,
    gap: 6,
  },
  addText: {
    fontSize: 14,
    fontFamily: 'CenturyGothic-Bold',
  },
  cancelBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: 'CenturyGothic',
  },
});
