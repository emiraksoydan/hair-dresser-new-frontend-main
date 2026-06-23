import React, { useMemo } from 'react';
import { View, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { Icon, Portal } from 'react-native-paper';
import { MotiView } from 'moti';
import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useAnchoredDropdownMenu } from '../../hook/useAnchoredDropdownMenu';
import {
  DISTANCE_PRESET_TO_KM,
  SOCIAL_DISCOVERY_RADIUS_PRESET_IDS,
  type DistancePresetId,
  UNLIMITED_DISCOVERY_RADIUS_KM,
} from '../../constants/filterDefaults';
import { SOCIAL_ACCENT } from '../../constants/socialTheme';

const MENU_WIDTH = 196;

type Props = {
  valueKm: number;
  onChange: (km: number) => void;
  disabled?: boolean;
};

function presetLabel(preset: DistancePresetId, t: (key: string) => string): string {
  switch (preset) {
    case '0':
      return t('filters.radius0km');
    case '25':
      return t('filters.radius25km');
    case '50':
      return t('filters.radius50km');
    case '100':
      return t('filters.radius100km');
    default:
      return t('filters.radiusUnlimited');
  }
}

function displayKm(valueKm: number): string {
  if (valueKm >= UNLIMITED_DISCOVERY_RADIUS_KM) return '∞';
  if (valueKm === 0) return '0';
  return String(valueKm);
}

export const SocialSearchRadiusMenu: React.FC<Props> = ({ valueKm, onChange, disabled }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { anchorRef, menuPos, menuReady, closeMenu, toggleMenu } = useAnchoredDropdownMenu({
    menuWidth: MENU_WIDTH,
  });

  const menuItems = useMemo(
    () =>
      SOCIAL_DISCOVERY_RADIUS_PRESET_IDS.map((preset) => {
        const km = DISTANCE_PRESET_TO_KM[preset];
        const selected = valueKm === km;
        return {
          preset,
          km,
          selected,
          label: presetLabel(preset, t),
        };
      }),
    [valueKm, t],
  );

  return (
    <>
      <View ref={anchorRef} collapsable={false}>
        <TouchableOpacity
          onPress={toggleMenu}
          disabled={disabled}
          activeOpacity={0.82}
          className="h-12 min-w-[52px] px-2 rounded-xl items-center justify-center border"
          style={{
            backgroundColor: colors.cardBg,
            borderColor: colors.borderColor2,
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <Icon source="map-marker-radius" size={18} color={SOCIAL_ACCENT} />
          <Text className="text-[10px] font-bold mt-0.5" style={{ color: colors.headerText }}>
            {displayKm(valueKm)}
          </Text>
        </TouchableOpacity>
      </View>

      {menuReady && menuPos ? (
        <Portal>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeMenu} />
          <MotiView
            from={{ opacity: 0, translateY: -6, scale: 0.96 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={{ type: 'timing', duration: 180 }}
            style={[
              styles.menuDropdown,
              {
                top: menuPos.top,
                left: menuPos.left,
                backgroundColor: colors.cardBg,
                borderColor: colors.borderColor2,
                shadowColor: '#000',
              },
            ]}
          >
            <Text
              className="text-[11px] font-semibold px-3 pt-2.5 pb-1 uppercase tracking-wide"
              style={{ color: colors.textTertiary }}
            >
              {t('filters.searchRadius')}
            </Text>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.preset}
                onPress={() => {
                  onChange(item.km);
                  closeMenu();
                }}
                className="flex-row items-center px-3 py-2.5 gap-2.5"
                activeOpacity={0.7}
              >
                <Icon
                  source={item.selected ? 'check-circle' : 'map-marker-radius-outline'}
                  size={18}
                  color={item.selected ? SOCIAL_ACCENT : colors.textSecondary}
                />
                <Text
                  className="text-[14px] flex-1"
                  style={{
                    color: item.selected ? SOCIAL_ACCENT : colors.headerText,
                    fontWeight: item.selected ? '700' : '500',
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </MotiView>
        </Portal>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  menuDropdown: {
    position: 'absolute',
    width: MENU_WIDTH,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 100,
    elevation: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    overflow: 'hidden',
  },
});
