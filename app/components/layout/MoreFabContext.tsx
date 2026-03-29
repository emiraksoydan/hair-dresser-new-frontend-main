import { createContext } from "react";

export type MoreFabMenuItem = {
  id: string;
  icon: string;
  label: string;
  onPress: () => void;
};

export type HeaderDeleteAction = { onPress: () => void; loading: boolean } | null;

/** Panel ekranı `usePanelMoreFab` ile buraya satır ekler; layout birleştirip FAB'da gösterir.
 *  `reportOverlayOpen`: herhangi bir alt sheet açıldığında FAB'ı gizlemek için çağrılır.
 *  `setHeaderDeleteAction`: randevu sekmesi header'ına "tümünü sil" butonu yerleştirmek için. */
export const MoreFabPanelContext = createContext<{
  setPanelFabItems: (items: MoreFabMenuItem[] | null) => void;
  reportOverlayOpen: (open: boolean) => void;
  setHeaderDeleteAction: (action: HeaderDeleteAction) => void;
} | null>(null);
