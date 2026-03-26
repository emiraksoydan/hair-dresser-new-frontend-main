import { useSelector } from "react-redux";
import { hideSnack } from "../store/snackbarSlice";
import { RootState } from "../store/redux-store";
import { Portal, Snackbar } from "react-native-paper";
import React, { useRef, useCallback, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "./useLanguage";

// useSnackbar hook kaldırıldı - direkt slice kullanın:
// import { useAppDispatch } from '../store/hook';
// import { showSnack } from '../store/snackbarSlice';
// const dispatch = useAppDispatch();
// dispatch(showSnack({ message: 'Mesaj', isError: false }));

// Global Snackbar Component
export const GlobalSnackbar: React.FC = () => {
  const { visible, message, isError } = useSelector(
    (state: RootState) => state.snackbar,
  );
  const dispatch = useDispatch();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleDismiss = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    dispatch(hideSnack());
  }, [dispatch]);

  // Auto-hide after 3 seconds
  useEffect(() => {
    if (visible) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        handleDismiss();
      }, 3000);
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [visible, handleDismiss]);

  return (
    <Portal>
      <Snackbar
        visible={visible}
        onDismiss={handleDismiss}
        duration={3000}
        wrapperStyle={{
          top: 0,
          bottom: "auto",
          paddingTop: insets.top,
          paddingBottom: 0,
        }}
        style={{
          backgroundColor: isError ? "#b91c1c" : "#15803d", // Kırmızı: hata, Yeşil: başarı
        }}
        action={{
          label: t("common.close"),
          onPress: handleDismiss,
          textColor: "white",
        }}
      >
        {message}
      </Snackbar>
    </Portal>
  );
};
