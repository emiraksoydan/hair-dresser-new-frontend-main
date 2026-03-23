/**
 * Form-related types
 */

import type { Control, UseFormSetValue } from "react-hook-form";

// Import types from component files
import type { FormValues as FormStoreAddValues } from "../components/store/formstoreadd";
import type { FormUpdateValues as FormStoreUpdateValues } from "../components/store/formstoreupdate";
import type { FormFreeBarberValues as FormFreeBarberValuesType } from "../components/freebarber/formfreebarberoper";

// Re-export for convenience
export type { FormValues } from "../components/store/formstoreadd";
export type { FormUpdateValues } from "../components/store/formstoreupdate";
export type { FormFreeBarberValues } from "../components/freebarber/formfreebarberoper";

export type ChairRowProps = {
  index: number;
  control: Control<FormStoreAddValues>;
  setValue: UseFormSetValue<FormStoreAddValues>;
  remove: () => void;
  barbers?: FormStoreAddValues['barbers'];
  takenSet: Set<string>;
};

export type BarberFormValues = {
  id?: string;
  name?: string;
  profileImage?: {
    uri: string;
    name: string;
    type: string;
  };
};

export type ChairFormInitial = {
  id?: string;
  name?: string;
  barberId?: string;
  mode?: 'named' | 'barber';
};

