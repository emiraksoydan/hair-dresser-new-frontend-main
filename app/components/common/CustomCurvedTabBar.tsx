import { Icon } from "react-native-paper";
import React, { useEffect, useRef, useCallback } from 'react';
import { View, TouchableOpacity, Dimensions, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

import { Text } from './Text';
import { COLORS } from '../../constants/colors';
import { badgeCountLabel } from '../../utils/badgeDisplay';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface CustomTabItem {
  key: string;
  label: string;
  icon: string; // Material Design icon name (outline)
  iconFocused: string; // Material Design icon name (filled)
  badgeCount?: number;
}

interface CustomCurvedTabBarProps {
  tabs: CustomTabItem[];
  activeIndex: number;
  onTabPress: (index: number, tab: CustomTabItem) => void;
  onTabDoubleTap?: (index: number, tab: CustomTabItem) => void;
  /**
   * Açık sarı: yüzen aktif ikon (kenar yok)
   */
  chipBackground?: string;
  chipForeground?: string;
  /** Sarı yüzen sekme içindeki ikon rengi (açık modda siyah) */
  onGoldIconColor?: string;
  backgroundColor?: string;
  inactiveIconColor?: string;
  height?: number;
}

const AnimatedView = Animated.View;

// Curved background with concave notch (curves DOWN into the tab bar)
const CurvedBackground: React.FC<{
  width: number;
  height: number;
  notchCenterX: number;
  notchRadius: number;
  backgroundColor: string;
}> = ({ width, height, notchCenterX, notchRadius, backgroundColor }) => {
  // Curve parameters - aşağıya doğru (içe doğru) kavislenme
  const curveDepth = notchRadius + 15; // Curve'un derinliği (aktif sekme daha aşağı “oturur”)
  const curveWidth = notchRadius * 2.2; // Curve'un genişliği

  // SVG path - curve goes DOWN (concave from top)
  // Starts at top-left, goes right, curves DOWN around notch, continues right, then fills rectangle
  const path = `
    M 0 0
    L ${notchCenterX - curveWidth} 0
    C ${notchCenterX - curveWidth * 0.5} 0, ${notchCenterX - notchRadius} ${curveDepth}, ${notchCenterX} ${curveDepth}
    C ${notchCenterX + notchRadius} ${curveDepth}, ${notchCenterX + curveWidth * 0.5} 0, ${notchCenterX + curveWidth} 0
    L ${width} 0
    L ${width} ${height}
    L 0 ${height}
    Z
  `;

  return (
    <Svg width={width} height={height} style={styles.curvedSvg}>
      <Path d={path} fill={backgroundColor} />
    </Svg>
  );
};

const DOUBLE_TAP_DELAY = 450; // ms

export const CustomCurvedTabBar: React.FC<CustomCurvedTabBarProps> = ({
  tabs,
  activeIndex,
  onTabPress,
  onTabDoubleTap,
  chipBackground = COLORS.UI.ACCENT_GOLD,
  chipForeground = COLORS.UI.ACCENT_GOLD,
  onGoldIconColor = COLORS.UI.TEXT_ON_GOLD,
  backgroundColor = '#1a1b25',
  inactiveIconColor = '#9CA3AF',
  height = 60,
}) => {
  const insets = useSafeAreaInsets();
  const tabWidth = SCREEN_WIDTH / tabs.length;
  const floatSize = 40;
  const floatOffset = 16;
  const lastTapRef = useRef<{ index: number; time: number } | null>(null);

  // Animasyon değerleri
  const animatedIndex = useSharedValue(activeIndex);

  useEffect(() => {
    animatedIndex.value = withSpring(activeIndex, {
      damping: 18,
      stiffness: 260,
      mass: 0.65,
    });
  }, [activeIndex]);

  // Float pozisyonu animasyonu - tam ortalanmış
  const floatAnimatedStyle = useAnimatedStyle(() => {
    const centerOffset = (tabWidth - floatSize) / 2;
    const translateX = animatedIndex.value * tabWidth + centerOffset;
    return {
      transform: [{ translateX }, { translateY: 9 }],
    };
  });

  // Notch center position (statik, animasyonsuz - SVG için)
  const notchCenterX = activeIndex * tabWidth + tabWidth / 2;

  // Tab item component
  const TabItem = ({ tab, index }: { tab: CustomTabItem; index: number }) => {
    const isActive = index === activeIndex;

    const handlePress = () => {
      const now = Date.now();
      const last = lastTapRef.current;
      const isProfileTab = tab.key === '(profile)';
      const isActiveProfileTab = isProfileTab && isActive;

      if (last && last.index === index && now - last.time < DOUBLE_TAP_DELAY) {
        lastTapRef.current = null;
        onTabDoubleTap?.(index, tab);
      } else {
        lastTapRef.current = { index, time: now };
        // Keep single-tap navigation immediate except active profile tab.
        // Active profile first tap should wait for potential double-tap.
        if (!isActiveProfileTab) {
          onTabPress(index, tab);
        }
      }
    };

    /** Yüzen ana ikon ile sekme ikonu üst üste binmesin */
    const tabIconAnimatedStyle = useAnimatedStyle(() => {
      const distance = Math.abs(animatedIndex.value - index);
      return {
        opacity: interpolate(
          distance,
          [0, 0.18, 0.55],
          [0, 0.45, 1],
          Extrapolation.CLAMP
        ),
        transform: [
          {
            translateY: interpolate(
              distance,
              [0, 0.5, 1],
              [8, 4, 0],
              Extrapolation.CLAMP
            ),
          },
          {
            scale: interpolate(
              distance,
              [0, 0.5, 1],
              [0.85, 0.92, 1],
              Extrapolation.CLAMP
            ),
          },
        ],
      };
    });

    const tabLabelAnimatedStyle = useAnimatedStyle(() => {
      const distance = Math.abs(animatedIndex.value - index);
      return {
        opacity: interpolate(
          distance,
          [0, 0.25, 0.6],
          [0, 0.35, 1],
          Extrapolation.CLAMP
        ),
        transform: [
          {
            translateY: interpolate(
              distance,
              [0, 0.5, 1],
              [13, 6, 0],
              Extrapolation.CLAMP
            ),
          },
        ],
      };
    });

    return (
      <TouchableOpacity
        key={tab.key}
        onPress={handlePress}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 12, left: 12, right: 12 }}
        pressRetentionOffset={{ top: 20, left: 20, right: 20, bottom: 20 }}
        style={[styles.tabItem, { width: tabWidth }]}
      >
        <View style={styles.tabContent}>
          <AnimatedView style={tabIconAnimatedStyle}>
            <Icon
              source={tab.icon}
              size={24}
              color={isActive ? onGoldIconColor : inactiveIconColor}
            />
          </AnimatedView>
          <AnimatedView style={tabLabelAnimatedStyle}>
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? chipForeground : inactiveIconColor },
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </AnimatedView>
        </View>

        {/* Badge: aktif sekmede yüzen butonda gösterilir; burada yalnızca pasif */}
        {tab.badgeCount !== undefined && tab.badgeCount > 0 && !isActive && (
          <View style={styles.badge}>
            <Text
              style={[
                styles.badgeText,
                Platform.OS === 'android' ? { includeFontPadding: false } : null,
              ]}
            >
              {badgeCountLabel(tab.badgeCount)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Float icon için animasyonlu stil
  const floatIconAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: withSpring(1, { damping: 15, stiffness: 150 }) },
      ],
    };
  });

  // Float button'a basıldığında da double-tap algılanmalı (zIndex nedeniyle
  // float button TabItem press olayını engeller, bu yüzden buraya da ekliyoruz)
  const handleFloatPress = useCallback(() => {
    const activeTab = tabs[activeIndex];
    if (!activeTab) return;
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && last.index === activeIndex && now - last.time < DOUBLE_TAP_DELAY) {
      lastTapRef.current = null;
      onTabDoubleTap?.(activeIndex, activeTab);
    } else {
      lastTapRef.current = { index: activeIndex, time: now };
      // Float'a tek tıklama — aktif sekmeye navigate (zaten orada, no-op)
    }
  }, [tabs, activeIndex, onTabDoubleTap]);

  const bottomPadding = Math.max(insets.bottom, 0);

  return (
    <View style={[styles.container, { height: height + floatOffset + bottomPadding }]}>
      {/* Curved Background with concave notch */}
      <View style={[styles.backgroundContainer, { top: floatOffset }]}>
        <CurvedBackground
          width={SCREEN_WIDTH}
          height={height + bottomPadding}
          notchCenterX={notchCenterX}
          notchRadius={floatSize / 2 + 3}
          backgroundColor={backgroundColor}
        />
      </View>

      {/* Floating active button - curve'a değmiyor */}
      <AnimatedView style={[styles.floatContainer, floatAnimatedStyle]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleFloatPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[
            styles.floatButton,
            {
              backgroundColor: chipBackground,
              borderWidth: 0,
              width: floatSize,
              height: floatSize,
              borderRadius: floatSize / 2,
            },
          ]}
        >
          <AnimatedView style={floatIconAnimatedStyle}>
            <Icon
              source={tabs[activeIndex]?.iconFocused || tabs[activeIndex]?.icon || 'home'}
              size={20}
              color={onGoldIconColor}
            />
          </AnimatedView>
          {tabs[activeIndex]?.badgeCount !== undefined &&
            tabs[activeIndex]!.badgeCount! > 0 && (
              <View style={styles.floatBadge}>
                <Text
                  style={[
                    styles.floatBadgeText,
                    Platform.OS === 'android' ? { includeFontPadding: false } : null,
                  ]}
                >
                  {badgeCountLabel(tabs[activeIndex]!.badgeCount!)}
                </Text>
              </View>
            )}
        </TouchableOpacity>
      </AnimatedView>

      {/* Tab Items */}
      <View style={[styles.tabsContainer, { height, marginTop: floatOffset }]}>
        {tabs.map((tab, index) => (
          <TabItem key={tab.key} tab={tab} index={index} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  backgroundContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  curvedSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  floatContainer: {
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  floatButton: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatBadge: {
    position: 'absolute',
    top: Platform.OS === 'android' ? -6 : -2,
    right: Platform.OS === 'android' ? -6 : -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  floatBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    ...Platform.select({
      android: { lineHeight: 12, textAlignVertical: 'center' },
      default: {},
    }),
  },
  tabsContainer: {
    flexDirection: 'row',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    paddingHorizontal: 2,
  },
  badge: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 2 : 4,
    right: '22%',
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    ...Platform.select({
      android: { lineHeight: 12, textAlignVertical: 'center' },
      default: {},
    }),
  },
});

export default CustomCurvedTabBar;
