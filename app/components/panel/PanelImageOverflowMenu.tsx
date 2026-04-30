import { Icon } from "react-native-paper";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { MotiView } from "moti";

import { Text } from "../common/Text";
import { ImageGetDto } from "../../types";
import { useLanguage } from "../../hook/useLanguage";
import { useTheme } from "../../hook/useTheme";
import { PanelImageGalleryModal } from "./PanelImageGalleryModal";

const DROPDOWN_WIDTH = 188;

export type PanelCompareConfig = {
  selected: boolean;
  onPress: () => void;
  hidden?: boolean;
};

type Props = {
  images?: ImageGetDto[] | null;
  panelCompare?: PanelCompareConfig | null;
  /** Galeri modal başlığı (işletme / berber adı) */
  galleryTitle?: string;
};

/**
 * Liste kartı görseli üzerinde: dikey üç nokta — içinde karşılaştır + fotoğrafları gör.
 */
export function PanelImageOverflowMenu({ images, panelCompare, galleryTitle }: Props) {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  /** Ekran dışına taşmaması için pill’e göre yatay ofset (px) */
  const [dropdownLeft, setDropdownLeft] = useState(0);
  const anchorRef = useRef<View>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const id = requestAnimationFrame(() => {
      anchorRef.current?.measureInWindow((x, _y, _w, _h) => {
        const pad = 10;
        const sw = Dimensions.get("window").width;
        let left = 0;
        const screenLeft = x + left;
        if (screenLeft + DROPDOWN_WIDTH > sw - pad) {
          left = sw - pad - DROPDOWN_WIDTH - x;
        }
        if (x + left < pad) {
          left = pad - x;
        }
        setDropdownLeft(left);
      });
    });
    return () => cancelAnimationFrame(id);
  }, [menuOpen]);

  const hasPhotos = (images?.length ?? 0) > 0;
  const showCompare = Boolean(panelCompare && !panelCompare.hidden);

  const showButton = showCompare || hasPhotos;
  const menuItems = useMemo(() => {
    const items: Array<{ key: string; icon: string; label: string; onPress: () => void }> = [];
    if (showCompare && panelCompare) {
      items.push({
        key: "compare",
        icon: panelCompare.selected ? "check" : "compare-horizontal",
        label: t("panel.overflowCompare"),
        onPress: () => {
          panelCompare.onPress();
        },
      });
    }
    if (hasPhotos) {
      items.push({
        key: "photos",
        icon: "image-multiple-outline",
        label: t("panel.overflowPhotos"),
        onPress: () => {
          setGalleryOpen(true);
        },
      });
    }
    return items;
  }, [showCompare, hasPhotos, panelCompare, t]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  if (!showButton || menuItems.length === 0) return null;

  return (
    <>
      <View ref={anchorRef} style={styles.anchor} pointerEvents="box-none" collapsable={false}>
        <TouchableOpacity
          onPress={() => setMenuOpen((o) => !o)}
          activeOpacity={0.85}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("panel.overflowMenuA11y")}
          style={styles.pill}
        >
          <Icon source="dots-vertical" size={18} color="rgba(255,255,255,0.92)" />
        </TouchableOpacity>

        <MotiView
          from={{ opacity: 0, scale: 0.94, translateY: -4 }}
          animate={{
            opacity: menuOpen ? 1 : 0,
            scale: menuOpen ? 1 : 0.94,
            translateY: menuOpen ? 0 : -4,
          }}
          transition={{ type: "timing", duration: 180 }}
          style={[
            styles.dropdown,
            {
              left: dropdownLeft,
              width: DROPDOWN_WIDTH,
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.94)"
                : "rgba(255, 255, 255, 0.98)",
              borderColor: "rgba(250, 204, 21, 0.42)",
            },
          ]}
          pointerEvents={menuOpen ? "auto" : "none"}
        >
          {menuItems.map((row, index) => (
            <Pressable
              key={row.key}
              onPress={() => {
                closeMenu();
                row.onPress();
              }}
              style={({ pressed }) => [
                styles.row,
                index < menuItems.length - 1 && styles.rowSeparator,
                pressed && {
                  opacity: 0.9,
                  backgroundColor: "rgba(250, 204, 21, 0.14)",
                },
              ]}
              accessibilityRole="menuitem"
            >
              <View style={styles.rowInner}>
                <View style={styles.rowIconWrap}>
                  <Icon source={row.icon as any} size={18} color="#d97706" />
                </View>
                <Text
                  style={styles.rowLabel}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {row.label}
                </Text>
              </View>
            </Pressable>
          ))}
        </MotiView>

        {menuOpen && (
          <Pressable style={styles.backdrop} onPress={closeMenu} accessibilityLabel="Dismiss menu" />
        )}
      </View>

      <PanelImageGalleryModal
        visible={galleryOpen && hasPhotos}
        onClose={() => setGalleryOpen(false)}
        images={images ?? []}
        title={galleryTitle}
      />
    </>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 25,
  },
  pill: {
    backgroundColor: "rgba(15,23,42,0.78)",
    borderColor: "rgba(250, 204, 21,0.55)",
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 6,
  },
  dropdown: {
    position: "absolute",
    top: 42,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 6,
    zIndex: 26,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 12,
    overflow: "hidden",
  },
  row: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  rowSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(250, 204, 21, 0.22)",
  },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 10,
    minWidth: 0,
  },
  rowIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    backgroundColor: "rgba(250, 204, 21, 0.16)",
  },
  rowLabel: {
    flex: 1,
    flexShrink: 1,
    fontSize: 12.5,
    lineHeight: 17,
    fontFamily: "CenturyGothic-Bold",
    color: "#b45309",
  },
  backdrop: {
    position: "absolute",
    top: -800,
    left: -800,
    right: -800,
    bottom: -800,
    zIndex: 20,
  },
});
