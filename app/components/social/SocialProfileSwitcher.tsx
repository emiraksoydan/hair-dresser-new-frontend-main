import React, { useCallback, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Icon } from 'react-native-paper';
import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useBottomSheet } from '../../hook/useBottomSheet';
import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';
import type { SocialProfileDto } from '../../types/social';
import { SocialBottomSheet } from './SocialBottomSheet';
import { COLORS } from '../../constants/colors';
import { SOCIAL_ACCENT } from '../../constants/socialTheme';
import {
  socialProfileOwnerIcon,
  socialProfilePrimaryLabel,
  socialProfileSecondaryLabel,
} from '../../utils/social/socialProfileDisplayLabel';

type PillProps = {
  compact?: boolean;
};

function ProfileRow({
  profile,
  selected,
  onPress,
}: {
  profile: SocialProfileDto;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 12,
        marginBottom: 8,
        borderRadius: 14,
        backgroundColor: selected
          ? isDark
            ? 'rgba(250, 204, 21, 0.14)'
            : 'rgba(250, 204, 21, 0.18)'
          : isDark
            ? 'rgba(255,255,255,0.05)'
            : 'rgba(0,0,0,0.03)',
        borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
        borderColor: selected ? SOCIAL_ACCENT : colors.borderColor2,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? COLORS.PROFILE.NAVY : 'rgba(23, 61, 98, 0.1)',
        }}
      >
        <Icon
          source={socialProfileOwnerIcon(profile.ownerType)}
          size={22}
          color={isDark ? '#fff' : COLORS.PROFILE.NAVY}
        />
      </View>
      <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{ fontWeight: '700', fontSize: 15, color: colors.headerText }}
        >
          {socialProfilePrimaryLabel(profile)}
        </Text>
        <Text
          numberOfLines={1}
          style={{ marginTop: 2, fontSize: 12, color: colors.textSecondary }}
        >
          {socialProfileSecondaryLabel(profile, t)}
        </Text>
      </View>
      {selected ? <Icon source="check-circle" size={22} color={SOCIAL_ACCENT} /> : null}
    </TouchableOpacity>
  );
}

/** Birden fazla sosyal profil olduğunda (ör. çoklu işletme) geçiş pill + sheet. */
export function SocialProfileSwitcherPill({ compact = false }: PillProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { profiles, activeProfile, setActiveProfileId } = useActiveSocialProfile();
  const sheet = useBottomSheet(['52%', '72%']);

  const switchable = profiles.length > 1;
  const profile = activeProfile;

  const openSheet = useCallback(() => {
    if (!switchable) return;
    sheet.present();
  }, [switchable, sheet]);

  const handleSelect = useCallback(
    (id: string) => {
      setActiveProfileId(id);
      sheet.dismiss();
    },
    [setActiveProfileId, sheet],
  );

  if (!profile || !switchable) return null;

  return (
    <>
      <TouchableOpacity
        onPress={openSheet}
        activeOpacity={0.78}
        className="w-full rounded-[10px] mb-4"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isDark ? 'rgba(23, 61, 98, 0.55)' : COLORS.PROFILE.NAVY,
          paddingHorizontal: compact ? 12 : 14,
          paddingVertical: 10,
          gap: 8,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.12)',
          }}
        >
          <Icon
            source={socialProfileOwnerIcon(profile.ownerType)}
            size={16}
            color="#fff"
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: '#fff', fontSize: compact ? 13 : 14, fontWeight: '700' }}>
            {socialProfilePrimaryLabel(profile)}
          </Text>
          <Text numberOfLines={1} style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 1 }}>
            {t('social.switchProfileHint')}
          </Text>
        </View>
        <Icon source="chevron-down" size={18} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>

      <SocialBottomSheet sheet={sheet}>
        <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 28 }}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: '700',
              color: colors.headerText,
              textAlign: 'center',
              paddingTop: 4,
              paddingBottom: 4,
            }}
          >
            {t('social.switchProfileTitle')}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: colors.textSecondary,
              textAlign: 'center',
              paddingHorizontal: 24,
              paddingBottom: 12,
            }}
          >
            {t('social.switchProfileSubtitle')}
          </Text>
          {profiles.map((p) => (
            <ProfileRow
              key={p.id}
              profile={p}
              selected={p.id === profile.id}
              onPress={() => handleSelect(p.id)}
            />
          ))}
        </BottomSheetScrollView>
      </SocialBottomSheet>
    </>
  );
}

/** Gönderi oluşturma ekranında yatay profil seçici */
export function SocialProfilePostAsPicker() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { profiles, activeProfileId, setActiveProfileId } = useActiveSocialProfile();

  const switchable = useMemo(() => profiles.length > 1, [profiles.length]);
  if (!switchable) return null;

  return (
    <View style={{ marginBottom: 12 }}>
      <Text
        className="text-[11px] font-semibold uppercase tracking-wide mb-2"
        style={{ color: colors.textTertiary }}
      >
        {t('social.postAs')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {profiles.map((p) => {
          const active = p.id === activeProfileId;
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => setActiveProfileId(p.id)}
              activeOpacity={0.82}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
                borderWidth: 1.5,
                borderColor: active ? SOCIAL_ACCENT : colors.borderColor2,
                backgroundColor: active
                  ? isDark
                    ? 'rgba(250, 204, 21, 0.12)'
                    : 'rgba(250, 204, 21, 0.16)'
                  : colors.cardBg,
              }}
            >
              <Icon
                source={socialProfileOwnerIcon(p.ownerType)}
                size={16}
                color={active ? SOCIAL_ACCENT : colors.textSecondary}
              />
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 13,
                  fontWeight: active ? '700' : '500',
                  color: active ? colors.headerText : colors.textSecondary,
                  maxWidth: 140,
                }}
              >
                {socialProfilePrimaryLabel(p)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
