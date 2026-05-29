import React, { useCallback, useEffect } from "react";
import { Image, ImageSourcePropType, ImageURISource, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

type Props = {
  width: number;
  height: number;
  source: ImageSourcePropType;
  defaultSource?: number | ImageURISource;
  /** Aktif slayt değilse veya galeri kapanınca zoom sıfırlanır */
  isActive: boolean;
  onZoomActiveChange?: (active: boolean) => void;
};

function clampTranslation(value: number, scale: number, container: number) {
  "worklet";
  const maxOffset = (container * (scale - 1)) / 2;
  if (maxOffset <= 0) return 0;
  return Math.max(-maxOffset, Math.min(maxOffset, value));
}

export function ZoomableGalleryImage({
  width,
  height,
  source,
  defaultSource,
  isActive,
  onZoomActiveChange,
}: Props) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const notifyZoom = useCallback(
    (active: boolean) => {
      onZoomActiveChange?.(active);
    },
    [onZoomActiveChange],
  );

  useEffect(() => {
    if (!isActive) {
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      notifyZoom(false);
    }
  }, [isActive, notifyZoom, scale, savedScale, savedTranslateX, savedTranslateY, translateX, translateY]);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      const next = savedScale.value * e.scale;
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    })
    .onEnd(() => {
      if (scale.value < 1.05) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(notifyZoom)(false);
        return;
      }
      savedScale.value = scale.value;
      translateX.value = clampTranslation(translateX.value, scale.value, width);
      translateY.value = clampTranslation(translateY.value, scale.value, height);
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      runOnJS(notifyZoom)(scale.value > 1.02);
    });

  const pan = Gesture.Pan()
    .manualActivation(true)
    .onTouchesMove((_e, state) => {
      if (scale.value > 1.02) {
        state.activate();
      } else {
        state.fail();
      }
    })
    .onUpdate((e) => {
      translateX.value = clampTranslation(savedTranslateX.value + e.translationX, scale.value, width);
      translateY.value = clampTranslation(savedTranslateY.value + e.translationY, scale.value, height);
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(() => {
      if (scale.value > 1.05) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(notifyZoom)(false);
        return;
      }
      scale.value = withSpring(DOUBLE_TAP_SCALE);
      savedScale.value = DOUBLE_TAP_SCALE;
      runOnJS(notifyZoom)(true);
    });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={[styles.frame, { width, height }]}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.zoomLayer, animatedStyle]}>
          <Image
            source={source}
            defaultSource={defaultSource}
            style={{ width, height }}
            resizeMode="contain"
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
  },
  zoomLayer: {
    alignItems: "center",
    justifyContent: "center",
  },
});
