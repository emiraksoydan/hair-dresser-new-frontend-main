// components/location/permission-ui.ts
import * as Location from "expo-location";
import { Alert, Linking, Platform } from "react-native";
import i18n from "../../i18n/config";

function openSettings() {
  Linking.openSettings();
}

export async function ensureLocationPermissionWithPrompt(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === "granted") return true;

  // ilk dene: request
  const req = await Location.requestForegroundPermissionsAsync();
  if (req.status === "granted") return true;

  // denied: UI göster
  return await new Promise<boolean>((resolve) => {
    const canAskAgain = !!req.canAskAgain;

    Alert.alert(
      i18n.t("location.permissionRequired"),
      canAskAgain
        ? i18n.t("location.permissionRequiredMessage")
        : i18n.t("location.permissionDeniedMessage"),
      [
        {
          text: i18n.t("location.cancel"),
          style: "cancel",
          onPress: () => resolve(false),
        },
        {
          text: canAskAgain
            ? i18n.t("location.tryAgain")
            : i18n.t("location.settings"),
          onPress: async () => {
            if (canAskAgain) {
              const again = await Location.requestForegroundPermissionsAsync();
              resolve(again.status === "granted");
            } else {
              openSettings();
              resolve(false);
            }
          },
        },
        ...(canAskAgain
          ? [
              {
                text: i18n.t("location.settings"),
                onPress: () => {
                  openSettings();
                  resolve(false);
                },
              },
            ]
          : []),
      ],
    );
  });
}
