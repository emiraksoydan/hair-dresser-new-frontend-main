import { createContext, useContext } from "react";

/** null id = yeni panel ekleme formu */
export type FreeBarberPanelSheetApi = {
  openPanel: (freeBarberId: string | null) => void;
};

export const FreeBarberPanelSheetContext =
  createContext<FreeBarberPanelSheetApi | null>(null);

export function useFreeBarberPanelSheet() {
  return useContext(FreeBarberPanelSheetContext);
}
