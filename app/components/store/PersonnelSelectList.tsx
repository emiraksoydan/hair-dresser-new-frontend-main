import React from "react";
import { View, Pressable, ScrollView } from "react-native";
import { Text } from "../common/Text";
import { Icon } from "react-native-paper";
import { useTheme } from "../../hook/useTheme";

export type PersonnelOption = { label: string; value: string };

type Props = {
  options: PersonnelOption[];
  value: string | null | undefined;
  onChange: (personnelId: string) => void;
  disabled?: boolean;
  /** Boş liste veya disabled durumunda gösterilir */
  emptyHint: string;
  hasError?: boolean;
  /** Liste üstü kısa açıklama */
  hint?: string;
  /** Liste görünürken sol üst başlık (ör. Atanacak personel) */
  listTitle?: string;
  /** Başlık yanında rozet metni (ör. "3 seçenek") — verilmezse options.length kullanılır */
  listBadgeLabel?: string;
};

const ACCENT = "#c2a523";

function initials(label: string): string {
  const t = label.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
}

/**
 * Dikey liste; her satırda baş harf + ad + seçim (yatay hizalı).
 */
export const PersonnelSelectList = React.memo<Props>(
  ({
    options,
    value,
    onChange,
    disabled,
    emptyHint,
    hasError,
    hint,
    listTitle,
    listBadgeLabel,
  }) => {
    const { colors, isDark } = useTheme();
    const showList = !disabled && options.length > 0;

    const borderColor = hasError ? "#b00020" : colors.borderColor2;
    const bg = colors.cardBg;

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

    const badgeText =
      listBadgeLabel ?? (options.length > 0 ? String(options.length) : "");

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
            {badgeText ? (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 10,
                  backgroundColor: isDark
                    ? "rgba(194, 165, 35, 0.18)"
                    : "rgba(194, 165, 35, 0.14)",
                }}
              >
                <Text
                  style={{
                    fontFamily: "CenturyGothic-Bold",
                    fontSize: 12,
                    color: ACCENT,
                  }}
                >
                  {badgeText}
                </Text>
              </View>
            ) : null}
          </View>
        )}
        {!!hint && (
          <Text
            style={{
              fontFamily: "CenturyGothic",
              fontSize: 12,
              color: colors.textSecondary,
              marginBottom: 8,
              lineHeight: 17,
            }}
          >
            {hint}
          </Text>
        )}

        <View
          style={{
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor,
            backgroundColor: bg,
            overflow: "hidden",
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={{ maxHeight: 260 }}
            showsVerticalScrollIndicator={options.length > 5}
          >
            {options.map((opt, idx) => {
              const selected = value === opt.value;
              const ini = initials(opt.label);
              const isLast = idx === options.length - 1;
              return (
                <Pressable
                  key={opt.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => onChange(opt.value)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                    backgroundColor: selected
                      ? isDark
                        ? "rgba(194, 165, 35, 0.1)"
                        : "rgba(194, 165, 35, 0.08)"
                      : pressed
                        ? isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(0,0,0,0.03)"
                        : "transparent",
                  })}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      backgroundColor: selected
                        ? isDark
                          ? "rgba(194, 165, 35, 0.28)"
                          : "rgba(194, 165, 35, 0.22)"
                        : isDark
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.06)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "CenturyGothic-Bold",
                        fontSize: 14,
                        color: selected ? ACCENT : colors.sectionHeaderText,
                      }}
                    >
                      {ini}
                    </Text>
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      marginLeft: 12,
                      marginRight: 10,
                      fontFamily: "CenturyGothic",
                      fontSize: 15,
                      lineHeight: 20,
                      color: colors.sectionHeaderText,
                    }}
                    numberOfLines={2}
                  >
                    {opt.label}
                  </Text>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: selected ? ACCENT : colors.borderColor2,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: selected ? ACCENT : "transparent",
                    }}
                  >
                    {selected ? <Icon source="check" size={14} color="#fff" /> : null}
                  </View>
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
