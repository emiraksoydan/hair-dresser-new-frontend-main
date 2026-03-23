// utils/store-location-helpers.ts
import type { FieldValues, Path, UseFormGetValues, UseFormSetValue } from "react-hook-form";
import * as Location from "expo-location";
import type { HasLocation } from "../../types";
import { reverseGeocodeLine } from "../location/location-helper";

export function createStoreLocationHelpers<T extends FieldValues & HasLocation>(
    setValue: UseFormSetValue<T>,
    getValues: UseFormGetValues<T>
) {
    const updateLocation = (latitude: number, longitude: number) => {
        const addr = (getValues("location.addressDescription" as Path<T>) as string) ?? "";
        setValue(
            "location" as Path<T>,
            { latitude, longitude, addressDescription: addr } as any,
            { shouldDirty: true, shouldValidate: true }
        );
    };
    const reverseAndSetAddress = async (latitude: number, longitude: number) => {
        const line = await reverseGeocodeLine(latitude, longitude);
        if (!line) return;
        setValue("location.addressDescription" as Path<T>, line as any, {
            shouldDirty: true,
            shouldValidate: true,
        });
    };
    // (Opsiyonel) Harita seçimi gibi yerlerde direkt kullanılabilir:
    const pickFromMap = async (latitude: number, longitude: number) => {
        updateLocation(latitude, longitude);
        await reverseAndSetAddress(latitude, longitude);
    };

    return { updateLocation, reverseAndSetAddress, pickFromMap };
}
