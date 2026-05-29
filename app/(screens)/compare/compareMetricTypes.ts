import type { ReactNode } from "react";
import type { CompareWinner } from "./compareShared";

export type CompareMetricRowData = {
  label: string;
  winner: CompareWinner;
  left: ReactNode;
  right: ReactNode;
};
