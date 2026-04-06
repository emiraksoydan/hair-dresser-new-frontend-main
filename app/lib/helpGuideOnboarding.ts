import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@hair_help_guide_pending";

export async function persistHelpGuideOnboardingFromAuthPayload(
  data: unknown,
): Promise<void> {
  if (!data || typeof data !== "object") return;
  const d = data as Record<string, unknown>;
  if (!("showHelpGuideOnboarding" in d) && !("ShowHelpGuideOnboarding" in d)) {
    return;
  }
  const show =
    d.showHelpGuideOnboarding === true || d.ShowHelpGuideOnboarding === true;
  if (show) await AsyncStorage.setItem(KEY, "1");
  else await AsyncStorage.removeItem(KEY);
}

export async function getHelpGuidePending(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY);
  return v === "1";
}

export async function clearHelpGuidePendingLocal(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
