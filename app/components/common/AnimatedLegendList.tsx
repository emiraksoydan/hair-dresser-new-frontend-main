import Animated from "react-native-reanimated";
import { LegendList } from "@legendapp/list";

/**
 * LegendList + Reanimated scroll events (scroll-linked item animations).
 */
export const AnimatedLegendList = Animated.createAnimatedComponent(LegendList);
