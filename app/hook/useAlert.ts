import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { showAlert, hideAlert, AlertButton } from '../store/alertSlice';
import { useLanguage } from './useLanguage';

/**
 * useAlert hook - Alert.alert yerine kullanılır
 */
export const useAlert = () => {
  const dispatch = useDispatch();
  const { t } = useLanguage();

  const defaultOkButton = useCallback((): AlertButton[] => [{ text: t('common.ok') }], [t]);

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
          buttons: buttons ?? defaultOkButton(),
          type: type || 'info',
        })
      );
    },
    [dispatch, defaultOkButton]
  );

  const alertSuccess = useCallback(
    (title: string, message: string, buttons?: AlertButton[]) => {
      dispatch(
        showAlert({
          title,
          message,
          buttons: buttons ?? defaultOkButton(),
          type: 'success',
        })
      );
    },
    [dispatch, defaultOkButton]
  );

  const alertError = useCallback(
    (title: string, message: string, buttons?: AlertButton[]) => {
      dispatch(
        showAlert({
          title,
          message,
          buttons: buttons ?? defaultOkButton(),
          type: 'error',
        })
      );
    },
    [dispatch, defaultOkButton]
  );

  const alertWarning = useCallback(
    (title: string, message: string, buttons?: AlertButton[]) => {
      dispatch(
        showAlert({
          title,
          message,
          buttons: buttons ?? defaultOkButton(),
          type: 'warning',
        })
      );
    },
    [dispatch, defaultOkButton]
  );

  const confirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      onCancel?: () => void,
      confirmText?: string,
      cancelText?: string
    ) => {
      dispatch(
        showAlert({
          title,
          message,
          buttons: [
            { text: cancelText ?? t('common.no'), style: 'cancel', onPress: onCancel },
            { text: confirmText ?? t('common.yes'), onPress: onConfirm },
          ],
          type: 'warning',
        })
      );
    },
    [dispatch, t]
  );

  const dismiss = useCallback(() => {
    dispatch(hideAlert());
  }, [dispatch]);

  const showSuccess = useCallback(
    (message: string) => {
      dispatch(
        showAlert({
          title: t('common.success'),
          message,
          buttons: defaultOkButton(),
          type: 'success',
        })
      );
    },
    [dispatch, t, defaultOkButton]
  );

  const showError = useCallback(
    (message: string) => {
      dispatch(
        showAlert({
          title: t('common.error'),
          message,
          buttons: defaultOkButton(),
          type: 'error',
        })
      );
    },
    [dispatch, t, defaultOkButton]
  );

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
            { text: t('common.no'), style: 'cancel', onPress: onCancel },
            { text: t('common.yes'), onPress: onConfirm },
          ],
          type: 'warning',
        })
      );
    },
    [dispatch, t]
  );

  return {
    alert,
    alertSuccess,
    alertError,
    alertWarning,
    confirm,
    dismiss,
    showSuccess,
    showError,
    showConfirm,
  };
};

export type { AlertButton };
