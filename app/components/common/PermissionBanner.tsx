import React, { useState } from 'react';
import { Linking, Platform, TouchableOpacity, View } from 'react-native';
import { MotiView } from 'moti';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { Text } from './Text';

type BannerKind = 'notification' | 'location';

interface BannerItemProps {
  kind: BannerKind;
  onDismiss: () => void;
}

const GOLD = '#c2a523';
const GOLD_BG_DARK = 'rgba(194,165,35,0.12)';
const GOLD_BG_LIGHT = 'rgba(194,165,35,0.08)';

function openSettings() {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:').catch(() => Linking.openSettings().catch(() => {}));
  } else {
    Linking.openSettings().catch(() => {});
  }
}

function BannerItem({ kind, onDismiss }: BannerItemProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const icon = kind === 'notification' ? '🔔' : '📍';
  const label =
    kind === 'notification'
      ? t('permissionBanner.notificationLabel')
      : t('permissionBanner.locationLabel');
  const desc =
    kind === 'notification'
      ? t('permissionBanner.notificationDesc')
      : t('permissionBanner.locationDesc');

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? GOLD_BG_DARK : GOLD_BG_LIGHT,
        borderRadius: 10,
        borderLeftWidth: 3,
        borderLeftColor: GOLD,
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginBottom: 6,
      }}
    >
      <Text style={{ fontSize: 16, marginRight: 8 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: GOLD,
            marginBottom: 1,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: colors.textSecondary,
            lineHeight: 15,
          }}
        >
          {desc}
        </Text>
      </View>
      <TouchableOpacity
        onPress={openSettings}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
        style={{
          marginLeft: 8,
          paddingHorizontal: 10,
          paddingVertical: 5,
          backgroundColor: GOLD,
          borderRadius: 6,
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#1f2937' }}>
          {t('permissionBanner.goToSettings')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
        style={{ marginLeft: 6, padding: 2 }}
      >
        <Text style={{ fontSize: 14, color: colors.textTertiary }}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

interface PermissionBannerProps {
  locationGranted: boolean;
  notificationGranted: boolean;
}

export function PermissionBanner({ locationGranted, notificationGranted }: PermissionBannerProps) {
  const [dismissedNotif, setDismissedNotif] = useState(false);
  const [dismissedLocation, setDismissedLocation] = useState(false);

  const showNotif = !notificationGranted && !dismissedNotif;
  const showLocation = !locationGranted && !dismissedLocation;

  if (!showNotif && !showLocation) return null;

  return (
    <MotiView
      from={{ opacity: 0, translateY: -6 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 280 }}
      style={{ paddingHorizontal: 2, paddingTop: 6, paddingBottom: 2 }}
    >
      {showNotif && (
        <BannerItem kind="notification" onDismiss={() => setDismissedNotif(true)} />
      )}
      {showLocation && (
        <BannerItem kind="location" onDismiss={() => setDismissedLocation(true)} />
      )}
    </MotiView>
  );
}
