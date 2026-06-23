import i18n from '../i18n/config';
import { showAlert } from '../store/alertSlice';
import { store } from '../store/redux-store';

/** React dışındaki yardımcılardan GlobalAlert (Paper Dialog) göstermek için. */
export function showGlobalAlertError(
  message: string,
  title: string = String(i18n.t('common.error')),
): void {
  store.dispatch(
    showAlert({
      title,
      message,
      type: 'error',
    }),
  );
}
