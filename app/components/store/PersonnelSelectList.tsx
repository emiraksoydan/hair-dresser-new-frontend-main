import React from "react";
import { View, Pressable, ScrollView } from "react-native";
import { MotiView } from "moti";
import { Text } from "../common/Text";
import { Icon } from "react-native-paper";
import { useTheme } from "../../hook/useTheme";

export type PersonnelOption = {
  label: string;
  value: string;
  ratingAvg?: number | null;
  ratingCount?: number | null;
};

type Props = {
  options: PersonnelOption[];
  value: string | null | undefined;
  onChange: (personnelId: string) => void;
  disabled?: boolean;
  emptyHint: string;
  hasError?: boolean;
  hint?: string;
  listTitle?: string;
  listBadgeLabel?: string;
};

const ACCENT = "#c2a523";
const CARD_W = 80;
const AVATAR = 52;

function initials(label: string): string {
  const t = label.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return t.slice(0, 2).toUpperCase();
}

export const PersonnelSelectList = React.memo<Props>(
  ({ options, value, onChange, disabled, emptyHint, hasError, hint, listTitle, listBadgeLabel }) => {
    const { colors, isDark } = useTheme();
    const showList = !disabled && options.length > 0;
    const borderColor = hasError ? "#b00020" : colors.borderColor2;

    if (!showList) {
      return (
        <View
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor,
            paddingVertical: 18,
            paddingHorizontal: 12,
            alignItems: "center",
            backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon source="account-alert-outline" size={28} color={colors.textSecondary} />
          </View>
          <Text
            style={{
              marginTop: 10,
              textAlign: "center",
              fontFamily: "CenturyGothic",
              fontSize: 13,
              lineHeight: 19,
              color: colors.textSecondary,
            }}
          >
            {emptyHint}
          </Text>
        </View>
      );
    }

    const badgeText = listBadgeLabel ?? (options.length > 0 ? `${options.length} seçenek` : "");

    return (
      <View>
        {!!listTitle && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: hint ? 6 : 10,
            }}
          >
            <Text
              style={{
                fontFamily: "CenturyGothic-Bold",
                fontSize: 14,
                color: colors.sectionHeaderText,
                flex: 1,
                marginRight: 8,
              }}
              numberOfLines={2}
            >
              {listTitle}
            </Text>
            {!!badgeText && (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 10,
                  backgroundColor: isDark ? "rgba(194,165,35,0.18)" : "rgba(194,165,35,0.14)",
                }}
              >
                <Text style={{ fontFamily: "CenturyGothic-Bold", fontSize: 12, color: ACCENT }}>
                  {badgeText}
                </Text>
              </View>
            )}
          </View>
        )}
        {!!hint && (
          <Text
            style={{
              fontFamily: "CenturyGothic",
              fontSize: 12,
              color: colors.textSecondary,
              marginBottom: 10,
              lineHeight: 17,
            }}
          >
            {hint}
          </Text>
        )}

        <View
          style={{
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: hasError ? "#b00020" : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
            backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#ffffff",
            overflow: "hidden",
          }}
        >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12, gap: 10 }}
        >
          {options.map((opt) => {
            const selected = value === opt.value;
            const ini = initials(opt.label);
            const hasRating = !!opt.ratingAvg && !!opt.ratingCount && opt.ratingCount > 0;

            return (
              <Pressable
                key={opt.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => onChange(opt.value)}
                style={({ pressed }) => ({
                  width: CARD_W,
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 6,
                  borderRadius: 16,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected
                    ? ACCENT
                    : isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.08)",
                  backgroundColor: selected
                    ? isDark
                      ? "rgba(194,165,35,0.12)"
                      : "rgba(194,165,35,0.07)"
                    : pressed
                      ? isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(0,0,0,0.03)"
                      : isDark
                        ? "rgba(255,255,255,0.03)"
                        : "#ffffff",
                  shadowColor: selected ? ACCENT : "#000",
                  shadowOffset: { width: 0, height: selected ? 3 : 1 },
                  shadowOpacity: selected ? 0.18 : 0.05,
                  shadowRadius: selected ? 8 : 3,
                  elevation: selected ? 4 : 1,
                })}
              >
                {/* Avatar */}
                <View style={{ position: "relative", marginBottom: hasRating ? 6 : 8 }}>
                  <MotiView
                    animate={{ scale: selected ? 1.05 : 1 }}
                    transition={{ type: "spring", damping: 14 }}
                    style={{
                      width: AVATAR,
                      height: AVATAR,
                      borderRadius: AVATAR / 2,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: selected
                        ? isDark
                          ? "rgba(194,165,35,0.3)"
                          : "rgba(194,165,35,0.2)"
                        : isDark
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.06)",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "CenturyGothic-Bold",
                        fontSize: 16,
                        color: selected ? ACCENT : colors.sectionHeaderText,
                      }}
                    >
                      {ini}
                    </Text>
                  </MotiView>

                  {/* Seçim check badge */}
                  {selected && (
                    <MotiView
                      from={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", damping: 12 }}
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: ACCENT,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 2,
                        borderColor: isDark ? "#1a1a2e" : "#ffffff",
                      }}
                    >
                      <Icon source="check" size={11} color="#fff" />
                    </MotiView>
                  )}
                </View>

                {/* Rating chip */}
                {hasRating && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 3,
                      paddingHorizontal: 7,
                      paddingVertical: 3,
                      borderRadius: 20,
                      marginBottom: 6,
                      backgroundColor: isDark
                        ? "rgba(245,158,11,0.18)"
                        : "rgba(245,158,11,0.12)",
                    }}
                  >
                    <Icon source="star" size={12} color="#f59e0b" />
                    <Text
                      style={{
                        fontFamily: "CenturyGothic-Bold",
                        fontSize: 11,
                        color: isDark ? "#fbbf24" : "#d97706",
                      }}
                    >
                      {opt.ratingAvg!.toFixed(1)}
                    </Text>
                  </View>
                )}

                {/* İsim */}
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: selected ? "CenturyGothic-Bold" : "CenturyGothic",
                    fontSize: 12,
                    color: selected ? ACCENT : colors.sectionHeaderText,
                    textAlign: "center",
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        </View>
      </View>
    );
  },
);

PersonnelSelectList.displayName = "PersonnelSelectList";
