import React, { useEffect, useRef, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Text } from "../common/Text";
import { useTheme } from "../../hook/useTheme";
import { useLanguage } from "../../hook/useLanguage";
import { useAIAssistant } from "../../hook/useAIAssistant";

interface Props {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  accentColor: string;
  onClose?: () => void;
}

export function AIAssistantSheet({ sheetRef, accentColor, onClose }: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const {
    phase,
    transcript,
    response,
    errorMessage,
    startRecording,
    stopAndProcess,
    reset,
    cancelRecording,
  } = useAIAssistant();

  // Pulse animation for recording state
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (phase === "recording") {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [phase, pulseAnim]);

  /** Önce sheet kapanır; kayıt iptali onDismiss içinde (çift tetik / takılma azaltır). */
  const handleClose = useCallback(() => {
    sheetRef.current?.dismiss();
  }, [sheetRef]);

  const handleMicPress = async () => {
    if (phase === "idle" || phase === "done" || phase === "error") {
      reset();
      await startRecording();
    } else if (phase === "recording") {
      await stopAndProcess();
    }
  };

  const handleRetry = async () => {
    reset();
    await startRecording();
  };

  const isProcessing = phase === "transcribing" || phase === "thinking";
  const micDisabled = isProcessing;

  const micBgColor =
    phase === "recording"
      ? "#ef4444"
      : phase === "done"
        ? "#22c55e"
        : accentColor;

  const sheetBg = isDark ? "#1e293b" : "#ffffff";
  const borderColor = isDark ? "#334155" : "#e2e8f0";

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.55}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: isDark ? "#475569" : "#cbd5e1" }}
      backgroundStyle={{ backgroundColor: sheetBg }}
      onDismiss={() => {
        void cancelRecording();
        onClose?.();
      }}
      maxDynamicContentSize={520}
    >
      <BottomSheetView style={{ paddingBottom: insets.bottom + 16 }}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons
              name="robot-outline"
              size={22}
              color={accentColor}
            />
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t("ai.assistantTitle")}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Content area */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Idle hint */}
          {phase === "idle" && (
            <View style={styles.hintRow}>
              <MaterialCommunityIcons
                name="microphone-outline"
                size={18}
                color={colors.textSecondary}
              />
              <Text
                style={[styles.hintText, { color: colors.textSecondary }]}
              >
                {t("ai.tapToSpeak")}
              </Text>
            </View>
          )}

          {/* Recording */}
          {phase === "recording" && (
            <Text style={[styles.statusText, { color: "#ef4444" }]}>
              {t("ai.recording")}
            </Text>
          )}

          {/* Processing */}
          {isProcessing && (
            <View style={styles.processingRow}>
              <ActivityIndicator size="small" color={accentColor} />
              <Text
                style={[
                  styles.statusText,
                  { color: colors.textSecondary, marginLeft: 8 },
                ]}
              >
                {phase === "transcribing"
                  ? t("ai.transcribing")
                  : t("ai.thinking")}
              </Text>
            </View>
          )}

          {/* Transcript bubble */}
          {!!transcript && (
            <View
              style={[
                styles.bubble,
                styles.userBubble,
                { backgroundColor: accentColor },
              ]}
            >
              <Text style={styles.bubbleText}>{transcript}</Text>
            </View>
          )}

          {/* AI Response bubble */}
          {phase === "done" && response && (
            <View
              style={[
                styles.bubble,
                styles.aiBubble,
                {
                  backgroundColor: isDark ? "#1e3a5f" : "#eff6ff",
                  borderColor: accentColor + "33",
                },
              ]}
            >
              <Text style={[styles.bubbleText, { color: colors.text }]}>
                {response.response}
              </Text>
              {response.actionTaken && (
                <View style={styles.actionTakenRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                  <Text
                    style={[styles.actionTakenText, { color: "#22c55e" }]}
                  >
                    {t("ai.actionTaken")}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Error */}
          {phase === "error" && (() => {
            // i18next "key yoksa key'in kendisini döndürür" şeklinde çalıştığı için
            // `||` fallback çalışmaz. Elle bakıp yoksa ai.error_unknown'a düşüyoruz.
            const code = (errorMessage || "unknown").trim();
            const key = `ai.error_${code}`;
            const resolved = t(key);
            const errorText = resolved === key ? t("ai.error_unknown") : resolved;
            return (
              <View style={[styles.errorBox, { borderColor: "#ef4444" }]}>
                <Ionicons name="warning-outline" size={18} color="#ef4444" />
                <Text style={[styles.errorText, { color: "#ef4444" }]}>
                  {errorText}
                </Text>
              </View>
            );
          })()}
        </ScrollView>

        {/* Mic button */}
        <View style={styles.micRow}>
          {(phase === "done" || phase === "error") && (
            <TouchableOpacity
              onPress={handleRetry}
              style={[styles.retryBtn, { borderColor }]}
            >
              <Text style={[styles.retryText, { color: accentColor }]}>
                {t("ai.retry")}
              </Text>
            </TouchableOpacity>
          )}

          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              onPress={handleMicPress}
              disabled={micDisabled}
              style={[
                styles.micButton,
                {
                  backgroundColor: micDisabled
                    ? colors.textTertiary
                    : micBgColor,
                },
              ]}
              activeOpacity={0.8}
            >
              <Ionicons
                name={phase === "recording" ? "stop" : "mic"}
                size={30}
                color="#ffffff"
              />
            </TouchableOpacity>
          </Animated.View>

          {phase === "recording" && (
            <Text
              style={[styles.tapStopText, { color: colors.textSecondary }]}
            >
              {t("ai.tapToStop")}
            </Text>
          )}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "CenturyGothic-Bold",
  },
  content: {
    paddingHorizontal: 20,
    maxHeight: 260,
  },
  contentContainer: {
    paddingVertical: 16,
    gap: 12,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "center",
    marginTop: 16,
  },
  hintText: {
    fontSize: 14,
    fontFamily: "CenturyGothic",
  },
  statusText: {
    fontSize: 14,
    fontFamily: "CenturyGothic",
    textAlign: "center",
  },
  processingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "90%",
  },
  userBubble: {
    alignSelf: "flex-end",
  },
  aiBubble: {
    alignSelf: "flex-start",
    borderWidth: 1,
  },
  bubbleText: {
    fontSize: 14,
    fontFamily: "CenturyGothic",
    color: "#ffffff",
    lineHeight: 20,
  },
  actionTakenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  actionTakenText: {
    fontSize: 12,
    fontFamily: "CenturyGothic-Bold",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "CenturyGothic",
    flex: 1,
  },
  micRow: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  micButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  retryText: {
    fontSize: 13,
    fontFamily: "CenturyGothic-Bold",
  },
  tapStopText: {
    fontSize: 12,
    fontFamily: "CenturyGothic",
    textAlign: "center",
  },
});
