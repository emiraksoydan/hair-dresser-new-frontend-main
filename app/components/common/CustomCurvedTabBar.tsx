import { Icon } from "react-native-paper";
import React, { useEffect } from 'react';
import { View, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
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
  accentColor?: string;
  backgroundColor?: string;
  activeIconColor?: string;
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

export const CustomCurvedTabBar: React.FC<CustomCurvedTabBarProps> = ({
  tabs,
  activeIndex,
  onTabPress,
  accentColor = '#FFB900',
  backgroundColor = '#1a1b25',
  activeIconColor = '#FFFFFF',
  inactiveIconColor = '#9CA3AF',
  height = 60,
}) => {
  const insets = useSafeAreaInsets();
  const tabWidth = SCREEN_WIDTH / tabs.length;
  const floatSize = 40;
  const floatOffset = 16;

  // Animasyon değerleri
  const animatedIndex = useSharedValue(activeIndex);

  useEffect(() => {
    animatedIndex.value = withSpring(activeIndex, {
      damping: 24,
      stiffness: 140,
      mass: 0.9,
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
        onPress={() => onTabPress(index, tab)}
        activeOpacity={0.7}
        style={[styles.tabItem, { width: tabWidth }]}
      >
        <View style={styles.tabContent}>
          <AnimatedView style={tabIconAnimatedStyle}>
            <Icon
              source={tab.icon}
              size={24}
              color={isActive ? accentColor : inactiveIconColor}
            />
          </AnimatedView>
          <AnimatedView style={tabLabelAnimatedStyle}>
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? accentColor : inactiveIconColor },
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </AnimatedView>
        </View>

        {/* Badge */}
        {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {tab.badgeCount > 99 ? '99+' : tab.badgeCount}
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
        <View
          style={[
            styles.floatButton,
            {
              backgroundColor: accentColor,
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
              color={activeIconColor}
            />
          </AnimatedView>
        </View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    top: 4,
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
  },
});

export default CustomCurvedTabBar;
