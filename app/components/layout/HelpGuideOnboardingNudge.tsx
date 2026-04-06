import React, { useEffect, useRef } from "react";
import { Alert } from "react-native";
import {
  clearHelpGuidePendingLocal,
  getHelpGuidePending,
} from "../../lib/helpGuideOnboarding";
import { useLanguage } from "../../hook/useLanguage";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { useCompleteHelpGuidePromptMutation } from "../../store/api";

/** Konum / bildirim / mikrofon izin diyaloglarından sonra göstermek için gecikme (ms). */
const AFTER_PERMISSIONS_MS = 4500;

/**
 * Yalnızca yeni kayıtta sunucu ShowHelpGuideOnboarding=true olduğunda AsyncStorage bayrağı set edilir;
 * bir kez uyarı gösterilir.
 */
export function HelpGuideOnboardingNudge() {
  const { t } = useLanguage();
  const router = useSafeNavigation();
  const [completePrompt] = useCompleteHelpGuidePromptMutation();
  const shownRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled || shownRef.current) return;
      const pending = await getHelpGuidePending();
      if (!pending || cancelled) return;
      shownRef.current = true;
      Alert.alert(
        t("helpGuide.onboardingTitle"),
        t("helpGuide.onboardingMessage"),
        [
          {
            text: t("helpGuide.openGuide"),
            onPress: async () => {
              try {
                await completePrompt().unwrap();
              } catch {
                /* yine de ekrana gitsin */
              }
              await clearHelpGuidePendingLocal();
              router.push("/(screens)/help-guide" as any);
            },
          },
          {
            text: t("common.ok"),
            style: "cancel",
            onPress: async () => {
              try {
                await completePrompt().unwrap();
              } catch {
                /* sessiz */
              }
              await clearHelpGuidePendingLocal();
            },
          },
        ],
        { cancelable: false },
      );
    }, AFTER_PERMISSIONS_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [completePrompt, router, t]);

  return null;
}
