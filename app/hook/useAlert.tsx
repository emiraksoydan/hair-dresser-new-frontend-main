import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { showAlert, hideAlert, AlertButton } from '../store/alertSlice';

/**
 * useAlert hook - Alert.alert yerine kullanılır
 * 
 * @example
 * const { alert, alertSuccess, alertError } = useAlert();
 * 
 * // Basit kullanım
 * alert('Başlık', 'Mesaj');
 * 
 * // Button'larla kullanım
 * alert('Başlık', 'Mesaj', [
 *   { text: 'İptal', style: 'cancel' },
 *   { text: 'Tamam', onPress: () => console.log('OK') }
 * ]);
 * 
 * // Success/Error kısayolları
 * alertSuccess('Başarılı', 'İşlem tamamlandı');
 * alertError('Hata', 'Bir sorun oluştu');
 */
export const useAlert = () => {
  const dispatch = useDispatch();

  /**
   * Genel alert göster
   */
  const alert = useCallback(
    (
      title: string,
      message: string,
      buttons?: AlertButton[],
      type?: 'info' | 'success' | 'error' | 'warning'
    ) => {
      dispatch(
        showAlert({
          title,
          message,
          buttons: buttons || [{ text: 'Tamam' }],
          type: type || 'info',
        })
      );
    },
    [dispatch]
  );

  /**
   * Success alert göster
   */
  const alertSuccess = useCallback(
    (title: string, message: string, buttons?: AlertButton[]) => {
      dispatch(
        showAlert({
          title,
          message,
          buttons: buttons || [{ text: 'Tamam' }],
          type: 'success',
        })
      );
    },
    [dispatch]
  );

  /**
   * Error alert göster
   */
  const alertError = useCallback(
    (title: string, message: string, buttons?: AlertButton[]) => {
      dispatch(
        showAlert({
          title,
          message,
          buttons: buttons || [{ text: 'Tamam' }],
          type: 'error',
        })
      );
    },
    [dispatch]
  );

  /**
   * Warning alert göster
   */
  const alertWarning = useCallback(
    (title: string, message: string, buttons?: AlertButton[]) => {
      dispatch(
        showAlert({
          title,
          message,
          buttons: buttons || [{ text: 'Tamam' }],
          type: 'warning',
        })
      );
    },
    [dispatch]
  );

  /**
   * Onay dialogu göster
   */
  const confirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      onCancel?: () => void,
      confirmText: string = 'Evet',
      cancelText: string = 'Hayır'
    ) => {
      dispatch(
        showAlert({
          title,
          message,
          buttons: [
            { text: cancelText, style: 'cancel', onPress: onCancel },
            { text: confirmText, onPress: onConfirm },
          ],
          type: 'warning',
        })
      );
    },
    [dispatch]
  );

  /**
   * Alert'i kapat
   */
  const dismiss = useCallback(() => {
    dispatch(hideAlert());
  }, [dispatch]);

  /**
   * Simple success message (only message, auto title)
   */
  const showSuccess = useCallback(
    (message: string) => {
      dispatch(
        showAlert({
          title: 'Başarılı',
          message,
          buttons: [{ text: 'Tamam' }],
          type: 'success',
        })
      );
    },
    [dispatch]
  );

  /**
   * Simple error message (only message, auto title)
   */
  const showError = useCallback(
    (message: string) => {
      dispatch(
        showAlert({
          title: 'Hata',
          message,
          buttons: [{ text: 'Tamam' }],
          type: 'error',
        })
      );
    },
    [dispatch]
  );

  /**
   * Confirm dialog with title and message
   */
  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      onCancel?: () => void
    ) => {
      dispatch(
        showAlert({
          title,
          message,
          buttons: [
            { text: 'Hayır', style: 'cancel', onPress: onCancel },
            { text: 'Evet', onPress: onConfirm },
          ],
          type: 'warning',
        })
      );
    },
    [dispatch]
  );

  return {
    alert,
    alertSuccess,
    alertError,
    alertWarning,
    confirm,
    dismiss,
    // Simple versions with auto titles
    showSuccess,
    showError,
    showConfirm,
  };
};

// Type export
export type { AlertButton };
