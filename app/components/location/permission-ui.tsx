// components/location/permission-ui.ts
import * as Location from "expo-location";

export async function ensureLocationPermissionWithPrompt(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === "granted") return true;

  // ÖNEMLİ: Eğer kullanıcı zaten "Don't allow" dediyse (canAskAgain=false), iOS dialog
  // göstermez — direkt false döner. Bu durumda request'i çağırmak da gereksiz.
  // Ayrıca canAskAgain=true OLSA BİLE bazı iOS sürümlerinde art arda iki kez request
  // çağrıldığında dialog dublese çıkabiliyor — burada erken dönüş tek-istek garantisi sağlar.
  if (current.status === "denied" && !current.canAskAgain) {
    return false;
  }

  // Sistem dialog'unu bir kez göster (Tam / Yaklaşık / Reddet seçimi kullanıcıya bırakılır)
  const req = await Location.requestForegroundPermissionsAsync();
  if (req.status === "granted") return true;

  // Reddedildiyse sessizce false dön — ekran içi uyarı bileşenleri devreye girer
  return false;
}
