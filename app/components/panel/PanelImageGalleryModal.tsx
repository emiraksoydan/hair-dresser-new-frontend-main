import { Icon } from "react-native-paper";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Carousel from "react-native-reanimated-carousel";
import type { ICarouselInstance } from "react-native-reanimated-carousel";

import { ImageGetDto } from "../../types";

type Props = {
  visible: boolean;
  onClose: () => void;
  images: ImageGetDto[];
  /** Artık kullanılmıyor; API uyumluluğu için opsiyonel */
  title?: string;
};

const emptyImg = require("../../../assets/images/empty.png");

export function PanelImageGalleryModal({ visible, onClose, images }: Props) {
  const insets = useSafeAreaInsets();
  const screen = Dimensions.get("screen");
  /** Tam ekran foto; thumb + sayaç üstte bindirmeli şeffaf katmanda. */
  const fullH = screen.height;
  const fullW = screen.width;
  const carouselRef = useRef<ICarouselInstance | null>(null);
  const [index, setIndex] = useState(0);
  const list = images?.length ? images : [];

  const onSnap = useCallback((i: number) => {
    setIndex(i);
  }, []);

  const goThumb = useCallback((i: number) => {
    setIndex(i);
    carouselRef.current?.scrollTo({ index: i, animated: true });
  }, []);

  useEffect(() => {
    if (!visible || !images?.length) return;
    setIndex(0);
    const id = requestAnimationFrame(() => {
      carouselRef.current?.scrollTo({ index: 0, animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [visible, images]);

  if (!visible || list.length === 0) return null;

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={StyleSheet.absoluteFill} pointerEvents="auto">
          <Carousel
            ref={carouselRef}
            width={fullW}
            height={fullH}
            data={list}
            defaultIndex={0}
            onSnapToItem={onSnap}
            loop={false}
            renderItem={({ item }) => (
              <View style={{ width: fullW, height: fullH, backgroundColor: "#000000" }}>
                <Image
                  source={item.imageUrl ? { uri: item.imageUrl } : emptyImg}
                  defaultSource={emptyImg}
                  style={styles.fullImage}
                  resizeMode="cover"
                />
              </View>
            )}
          />
        </View>

        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <Pressable
            onPress={onClose}
            hitSlop={16}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={[
              styles.closeBtn,
              {
                top: insets.top + 10,
                right: 14,
              },
            ]}
          >
            <Icon source="close" size={22} color="#ffffff" />
          </Pressable>

          <View
            style={[
              styles.thumbStrip,
              {
                paddingBottom: Math.max(insets.bottom, 14),
                paddingTop: 6,
              },
            ]}
          >
            <Text style={styles.counter}>
              {index + 1} / {list.length}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbScroll}
            >
              {list.map((img, i) => {
                const active = index === i;
                return (
                  <Pressable key={img.id || String(i)} onPress={() => goThumb(i)} accessibilityRole="button">
                    <View
                      style={[
                        styles.thumbFrame,
                        active && styles.thumbFrameActive,
                      ]}
                    >
                      <Image
                        source={img.imageUrl ? { uri: img.imageUrl } : emptyImg}
                        defaultSource={emptyImg}
                        style={[styles.thumbImg, active && styles.thumbImgActive]}
                        resizeMode="cover"
                      />
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  fullImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#0f0f0f",
  },
  closeBtn: {
    position: "absolute",
    zIndex: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.35)",
  },
  thumbStrip: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 12,
    backgroundColor: "transparent",
  },
  counter: {
    textAlign: "center",
    fontSize: 13,
    color: "#ffffff",
    marginBottom: 10,
    fontFamily: "CenturyGothic-Bold",
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  thumbScroll: {
    gap: 10,
    alignItems: "center",
    paddingHorizontal: 14,
  },
  thumbFrame: {
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.55,
    shadowRadius: 4,
    elevation: 6,
  },
  thumbFrameActive: {
    borderWidth: 2,
    borderColor: "#FACC15",
    padding: 2,
  },
  thumbImg: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  thumbImgActive: {
    width: 60,
    height: 60,
  },
});
