import { createContext, useContext } from "react";

export type BarberStoreSheetApi = {
  openAddStore: () => void;
};

export const BarberStoreSheetContext = createContext<BarberStoreSheetApi | null>(
  null,
);

export function useBarberStoreSheet() {
  return useContext(BarberStoreSheetContext);
}
