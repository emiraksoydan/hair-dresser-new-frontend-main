import { Icon } from "react-native-paper";
import React, { useCallback, useMemo, useRef, useState } from "react";
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
import { useRouter } from "expo-router";

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
  /** Sosyal profil sahibi (panel kartından profil görüntüleme) */
  socialOwnerType?: number;
  socialOwnerId?: string;
};

/**
 * Liste kartı görseli üzerinde: dikey üç nokta — içinde karşılaştır + fotoğrafları gör.
 */
export function PanelImageOverflowMenu({ images, panelCompare, galleryTitle, socialOwnerType, socialOwnerId }: Props) {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [dropdownLeft, setDropdownLeft] = useState<number | null>(null);
  const anchorRef = useRef<View>(null);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setDropdownLeft(null);
  }, []);

  const openMenu = useCallback(() => {
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
      setMenuOpen(true);
    });
  }, []);

  const toggleMenu = useCallback(() => {
    if (menuOpen) closeMenu();
    else openMenu();
  }, [menuOpen, closeMenu, openMenu]);

  const hasPhotos = (images?.length ?? 0) > 0;
  const showCompare = Boolean(panelCompare && !panelCompare.hidden);

  const hasSocial = socialOwnerType != null && !!socialOwnerId;
  const showButton = showCompare || hasPhotos || hasSocial;
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
    if (hasSocial) {
      items.push({
        key: "social",
        icon: "instagram",
        label: t("social.openSocialProfile"),
        onPress: () => {
          router.push({
            pathname: "/(screens)/social/profile-view",
            params: { ownerType: String(socialOwnerType), ownerId: socialOwnerId },
          } as any);
        },
      });
    }
    return items;
  }, [showCompare, hasPhotos, hasSocial, panelCompare, socialOwnerType, socialOwnerId, router, t]);

  if (!showButton || menuItems.length === 0) return null;

  const menuReady = menuOpen && dropdownLeft !== null;

  return (
    <>
      <View ref={anchorRef} style={styles.anchor} pointerEvents="box-none" collapsable={false}>
        <TouchableOpacity
          onPress={toggleMenu}
          activeOpacity={0.85}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("panel.overflowMenuA11y")}
          style={styles.pill}
        >
          <Icon source="dots-vertical" size={18} color="rgba(255,255,255,0.92)" />
        </TouchableOpacity>

        {menuReady ? (
        <MotiView
          from={{ opacity: 0, scale: 0.94, translateY: -4 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
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
        >
          <View style={styles.menuList}>
            {menuItems.map((row) => (
              <Pressable
                key={row.key}
                onPress={() => {
                  closeMenu();
                  row.onPress();
                }}
                style={({ pressed }) => [
                  styles.row,
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
          </View>
        </MotiView>
        ) : null}

        {menuReady && (
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
  menuList: {
    gap: 6,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  row: {
    paddingVertical: 8,
    paddingRight: 10,
    paddingLeft: 18,
    borderRadius: 8,
  },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 12,
    minWidth: 0,
    paddingLeft: 6,
  },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    backgroundColor: "rgba(250, 204, 21, 0.16)",
    marginRight: 2,
  },
  rowLabel: {
    flex: 1,
    flexShrink: 1,
    fontSize: 12.5,
    lineHeight: 18,
    paddingVertical: 2,
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
