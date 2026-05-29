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
import { useAlert } from '../../hook/useAlert';
import { COLORS, getTextOnGold } from '../../constants/colors';

const ACCOUNT_AVATAR_SIZE = 48;

interface AccountSwitcherSheetProps {
  accounts: SavedAccount[];
  currentUserId: string | null;
  onSelectAccount: (account: SavedAccount) => Promise<void>;
  onClose: () => void;
  onAddAccount?: () => void;
  /** `account.needsReauth === true` olan kartlara basılınca tetiklenir.
   *  Auth ekranına telefon + userType prefilled olarak gönderilir. */
  onReauthAccount?: (account: SavedAccount) => void;
  /** Oturumu süresi dolmuş hesabı kayıtlı listeden kaldırır (`MultiAccountContext.removeSavedAccount`). */
  onRemoveAccount?: (account: SavedAccount) => void | Promise<void>;
  /** Hesap → unread notification count map.
   *  Aktif hesap için bu prop YOK (RTK Query getBadgeCounts otoritatif). */
  accountBadges?: Record<string, number>;
  /** Aktif hesabın okunmamış bildirim sayısı — UI'da kendi kartında göstermek için. */
  currentAccountUnread?: number;
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
  onReauthPress?: () => void;
  isSwitching: boolean;
  /** Çift dokunuş / animasyon kuyruğu: seçim başlamadan önce senkron kontrol */
  switchInFlightRef: React.MutableRefObject<boolean>;
  unreadCount?: number;
  onRemoveFromList?: (account: SavedAccount) => void | Promise<void>;
}> = ({ account, isCurrent, onPress, onReauthPress, isSwitching, switchInFlightRef, unreadCount, onRemoveFromList }) => {
  const { colors, isDark } = useTheme();
  const goldAccentFg = isDark ? COLORS.UI.ACCENT_GOLD : getTextOnGold(false);
  const { t } = useLanguage();
  const { confirm } = useAlert();
  const scale = useSharedValue(1);
  const needsReauth = account.needsReauth === true;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleRemoveFromList = () => {
    if (isSwitching || switchInFlightRef.current || !onRemoveFromList) return;
    confirm(
      t('accounts.removeFromListTitle'),
      t('accounts.removeFromListConfirm'),
      () => {
        void Promise.resolve(onRemoveFromList(account)).catch(() => {});
      },
      undefined,
      t('accounts.removeFromList'),
      t('common.cancel'),
    );
  };

  const handlePress = () => {
    if (isCurrent || isSwitching || switchInFlightRef.current) return;
    if (needsReauth) {
      // Re-auth flow: animasyon yapma, hemen yönlendir.
      onReauthPress?.();
      return;
    }
    scale.value = withSpring(0.95, { damping: 20, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 20, stiffness: 300 });
      runOnJS(onPress)();
    });
  };

  const hasAvatar = Boolean(account.avatarUrl?.trim());

  return (
    <Animated.View style={[animStyle, { marginBottom: 10 }]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.cardBg,
            borderColor: isCurrent
              ? '#fea60e'
              : needsReauth
                ? '#ef4444'
                : 'transparent',
            borderWidth: isCurrent || needsReauth ? 1.5 : 0,
            opacity: isSwitching && !isCurrent ? 0.5 : 1,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handlePress}
          disabled={isCurrent || isSwitching}
          activeOpacity={0.8}
          style={styles.cardMainPress}
        >
          <View style={styles.avatarWrapper}>
            <View
              style={[
                styles.avatarRing,
                {
                  backgroundColor: isDark ? colors.cardBg : COLORS.PROFILE.NAVY_AVATAR,
                },
              ]}
            >
              {hasAvatar ? (
                <Avatar.Image
                  size={ACCOUNT_AVATAR_SIZE}
                  source={{ uri: account.avatarUrl! }}
                />
              ) : (
                <Avatar.Icon
                  size={ACCOUNT_AVATAR_SIZE}
                  icon="account"
                  color="#ffffff"
                  style={{ backgroundColor: 'transparent' }}
                />
              )}
            </View>
            {isCurrent && (
              <View style={styles.activeDot} />
            )}
            {!!unreadCount && unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText} numberOfLines={1}>
                  {unreadCount > 99 ? "99+" : String(unreadCount)}
                </Text>
              </View>
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
                <Text
                  style={[
                    styles.currentBadge,
                    {
                      color: goldAccentFg,
                      backgroundColor: isDark
                        ? 'rgba(254,166,14,0.12)'
                        : 'rgba(250, 204, 21, 0.28)',
                    },
                  ]}
                >
                  {t('accounts.current')}
                </Text>
              )}
              {needsReauth && (
                <Text style={styles.reauthBadge}>
                  {t('accounts.reauthCta')}
                </Text>
              )}
            </View>
          </View>

          {!isCurrent && (
            <Icon
              source={needsReauth ? 'login-variant' : 'chevron-right'}
              size={needsReauth ? 18 : 20}
              color={needsReauth ? '#ef4444' : colors.textSecondary}
            />
          )}
        </TouchableOpacity>

        {needsReauth && onRemoveFromList && (
          <TouchableOpacity
            onPress={handleRemoveFromList}
            disabled={isSwitching}
            accessibilityLabel={t('accounts.removeFromList')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.removeBtn}
            activeOpacity={0.65}
          >
            <Icon source="trash-can-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

export const AccountSwitcherSheet: React.FC<AccountSwitcherSheetProps> = ({
  accounts,
  currentUserId,
  onSelectAccount,
  onClose,
  onAddAccount,
  onReauthAccount,
  onRemoveAccount,
  accountBadges,
  currentAccountUnread,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const goldAccentFg = isDark ? COLORS.UI.ACCENT_GOLD : getTextOnGold(false);
  const goldAccentBorder = '#fea60e';
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
        {sorted.map(account => {
          const isCurrent =
            currentUserId != null &&
            account.id.toLowerCase() === currentUserId.toLowerCase();
          const unread = isCurrent
            ? (currentAccountUnread ?? 0)
            : (accountBadges?.[account.id] ?? 0);
          return (
            <AccountCard
              key={account.id}
              account={account}
              isCurrent={isCurrent}
              isSwitching={isSwitching}
              switchInFlightRef={switchInFlightRef}
              onPress={() => handleSelect(account)}
              onReauthPress={() => {
                if (!onReauthAccount) return;
                onClose();
                onReauthAccount(account);
              }}
              onRemoveFromList={onRemoveAccount}
              unreadCount={unread}
            />
          );
        })}

        {onAddAccount && (
          <TouchableOpacity
            onPress={() => { onClose(); onAddAccount(); }}
            style={[styles.addBtn, { borderColor: goldAccentBorder }]}
            activeOpacity={0.7}
          >
            <Icon source="account-plus-outline" size={18} color={goldAccentFg} />
            <Text style={[styles.addText, { color: goldAccentFg }]}>
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
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 8,
    gap: 4,
  },
  cardMainPress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  removeBtn: {
    paddingHorizontal: 6,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarRing: {
    width: ACCOUNT_AVATAR_SIZE,
    height: ACCOUNT_AVATAR_SIZE,
    borderRadius: ACCOUNT_AVATAR_SIZE / 2,
    borderWidth: 1.5,
    borderColor: COLORS.PROFILE.AVATAR_RING,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
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
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'CenturyGothic-Bold',
    lineHeight: 14,
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
    fontFamily: 'CenturyGothic-Bold',
    marginLeft: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  reauthBadge: {
    fontSize: 11,
    color: '#ef4444',
    fontFamily: 'CenturyGothic-Bold',
    marginLeft: 4,
    backgroundColor: 'rgba(239,68,68,0.12)',
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
