import { useSelector } from "react-redux";
import { hideSnack } from "../store/snackbarSlice";
import { RootState } from "../store/redux-store";
import React, { useRef, useCallback, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useLanguage } from "./useLanguage";
import { useAppDispatch } from "../store/hook";
import { Text } from "../components/common/Text";

// Mesaj göstermek için hook yok: `useAppDispatch` + `showSnack` (`../store/snackbarSlice`).
// Bu dosyada yalnızca `GlobalSnackbar` — `_layout` içinde mount; geri kalan kod `dispatch(showSnack({...}))`.

// Global Snackbar Component — Paper `Snackbar` yerine sabit bar: kütüphane giriş animasyonu gecikmeyi artırıyordu.
export const GlobalSnackbar: React.FC = () => {
  const { visible, message, isError } = useSelector(
    (state: RootState) => state.snackbar,
  );
  const dispatch = useAppDispatch();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDismiss = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    dispatch(hideSnack());
  }, [dispatch]);

  useEffect(() => {
    if (visible) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        handleDismiss();
      }, 2800);
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [visible, handleDismiss]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <Pressable style={styles.backdrop} onPress={handleDismiss} accessibilityRole="button">
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.bar,
            {
              marginTop: insets.top + 6,
              backgroundColor: isError ? "#b91c1c" : "#15803d",
            },
          ]}
        >
          <Text style={styles.barText} numberOfLines={4}>
            {message}
          </Text>
          <Pressable onPress={handleDismiss} hitSlop={12} accessibilityRole="button">
            <Text style={styles.barAction}>{t("common.close")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 12,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 99999,
  },
  barText: {
    flex: 1,
    color: "white",
    fontSize: 15,
  },
  barAction: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
});
