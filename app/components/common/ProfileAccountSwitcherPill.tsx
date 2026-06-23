import React, { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { Text } from './Text';
import { COLORS } from '../../constants/colors';
import { useLanguage } from '../../hook/useLanguage';
import { useAuth } from '../../hook/useAuth';
import { useMultiAccount } from '../../context/MultiAccountContext';

type Props = {
  onPress: () => void;
  /** Sosyal modda daha dar alan için küçük pill */
  compact?: boolean;
};

/** Normal profil sekmesi ve sosyal profil header'ında ortak hesap hub pill'i. */
export function ProfileAccountSwitcherPill({ onPress, compact = false }: Props) {
  const { t } = useLanguage();
  const { userName } = useAuth();
  const { accounts, currentUserId } = useMultiAccount();

  const displayName = useMemo(() => {
    if (userName) return userName;
    const current = accounts.find(
      (a) => currentUserId != null && a.id.toLowerCase() === currentUserId.toLowerCase(),
    );
    return current?.displayName ?? t('profile.myProfile');
  }, [userName, accounts, currentUserId, t]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.PROFILE.NAVY,
        borderRadius: 22,
        paddingHorizontal: compact ? 10 : 14,
        paddingVertical: compact ? 5 : 7,
        gap: 6,
        maxWidth: compact ? 200 : 260,
      }}
    >
      <View style={{ minWidth: 0, flexShrink: 1 }}>
        <Text
          numberOfLines={1}
          style={{
            color: '#fff',
            fontSize: compact ? 13 : 14,
            fontFamily: 'CenturyGothic-Bold',
            lineHeight: compact ? 16 : 17,
          }}
        >
          {displayName}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, lineHeight: 13 }}>
          {t('accounts.hub')}
        </Text>
      </View>
      <Icon source="chevron-down" size={compact ? 14 : 16} color="rgba(255,255,255,0.65)" />
    </TouchableOpacity>
  );
}
