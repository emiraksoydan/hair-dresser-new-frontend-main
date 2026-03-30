import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, Switch, TouchableOpacity, View, Platform } from "react-native";
import { HelperText, Icon } from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MotiView } from "moti";
import { Text } from "../common/Text";
import { DAYS_TR } from "../../constants";
import { fmtHHmm, fromHHmm } from "../../utils/time/time-helper";
import type { FieldErrors, UseFormSetValue, UseFormTrigger } from "react-hook-form";
import { useLanguage } from "../../hook/useLanguage";

type WhRow = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isClosed: boolean;
};

type Props = {
  working: WhRow[] | undefined;
  holidayDays: number[] | undefined;
  errors: FieldErrors<any>;
  colors: {
    cardBg: string;
    cardBg2: string;
    sectionHeaderText: string;
    textSecondary: string;
    borderColor: string;
  };
  isDark: boolean;
  setValue: UseFormSetValue<any>;
  trigger: UseFormTrigger<any>;
};

// Colors
const GREEN_OPEN = "#22c55e";
const RED_CLOSED = "#f87171";

export function WorkingHoursAccordion({
  working,
  holidayDays,
  errors,
  colors,
  isDark,
  setValue,
  trigger,
}: Props) {
  const { t } = useLanguage();
  const holidaySet = useMemo(() => new Set(holidayDays ?? []), [holidayDays]);

  // Android time picker state
  const [androidPickerState, setAndroidPickerState] = useState<{
    dayIdx: number;
    field: "startTime" | "endTime";
    value: Date;
  } | null>(null);

  const isDayOpen = useCallback(
    (day: number, idx: number) => {
      const row = working?.[idx];
      if (!row) return false;
      return !row.isClosed && !holidaySet.has(day);
    },
    [working, holidaySet],
  );

  const toggleDay = useCallback(
    (day: number, idx: number, open: boolean) => {
      if (open) {
        setValue(`workingHours.${idx}.isClosed`, false, { shouldDirty: true, shouldValidate: true });
        const next = (holidayDays ?? []).filter((h) => h !== day);
        setValue("holidayDays", next, { shouldDirty: true, shouldValidate: true });
      } else {
        setValue(`workingHours.${idx}.isClosed`, true, { shouldDirty: true, shouldValidate: true });
        const next = Array.from(new Set([...(holidayDays ?? []), day]));
        setValue("holidayDays", next, { shouldDirty: true, shouldValidate: true });
      }
      trigger(["workingHours", "holidayDays"]);
    },
    [setValue, trigger, holidayDays],
  );

  const closedDays = useMemo(
    () => DAYS_TR.filter((d) => {
      const idx = (working ?? []).findIndex((w) => w.dayOfWeek === d.day);
      if (idx < 0) return false;
      return !isDayOpen(d.day, idx);
    }),
    [working, isDayOpen],
  );

  // Time picker press handler - Android opens dialog, iOS uses compact inline
  const handleTimePress = useCallback(
    (dayIdx: number, field: "startTime" | "endTime", currentDate: Date) => {
      if (Platform.OS === "android") {
        setAndroidPickerState({ dayIdx, field, value: currentDate });
      }
    },
    [],
  );

  return (
    <View style={{ gap: 8 }}>
      {DAYS_TR.map((d) => {
        const idx = (working ?? []).findIndex((w) => w.dayOfWeek === d.day);
        if (idx < 0) return null;
        const row = working![idx];
        const open = isDayOpen(d.day, idx);
        const whErr = errors.workingHours as
          | Record<number, { startTime?: { message?: string }; endTime?: { message?: string } }>
          | undefined;
        const dayErr = whErr?.[idx];
        const start = fromHHmm(row.startTime || "09:00");
        const end = fromHHmm(row.endTime || "18:00");

        const cardBorderColor = open
          ? isDark ? "rgba(34,197,94,0.35)" : "rgba(34,197,94,0.28)"
          : isDark ? "rgba(248,113,113,0.3)" : "rgba(248,113,113,0.25)";
        /** Açık günde arka plan kart rengi: yeşil switch beyaz/zemin üzerinde net görünsün */
        const cardBg = open
          ? isDark ? "rgba(34,197,94,0.07)" : colors.cardBg
          : isDark ? "rgba(248,113,113,0.07)" : "rgba(248,113,113,0.04)";
        const accentColor = open ? GREEN_OPEN : RED_CLOSED;

        return (
          <View
            key={d.day}
            style={{
              borderRadius: 16,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: cardBorderColor,
              backgroundColor: cardBg,
            }}
          >
            {/* Gün + saat solda; switch sağda */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 14,
                paddingVertical: 12,
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 5,
                  backgroundColor: accentColor,
                  flexShrink: 0,
                }}
              />
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
                }}
              >
                <Text
                  style={{
                    fontFamily: "CenturyGothic-Bold",
                    fontSize: 16,
                    color: open ? colors.sectionHeaderText : colors.textSecondary,
                    flexShrink: 0,
                    maxWidth: "42%",
                  }}
                  numberOfLines={1}
                >
                  {d.full}
                </Text>
                {open ? (
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 10,
                      backgroundColor: isDark ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.12)",
                      borderWidth: 1,
                      borderColor: "rgba(34,197,94,0.3)",
                      flexShrink: 1,
                    }}
                  >
                    <Text
                      style={{ fontSize: 12, fontFamily: "CenturyGothic-Bold", color: GREEN_OPEN }}
                      numberOfLines={1}
                    >
                      {row.startTime || "09:00"} – {row.endTime || "18:00"}
                    </Text>
                  </View>
                ) : (
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 10,
                      backgroundColor: isDark ? "rgba(248,113,113,0.15)" : "rgba(248,113,113,0.1)",
                      borderWidth: 1,
                      borderColor: "rgba(248,113,113,0.3)",
                      flexShrink: 0,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontFamily: "CenturyGothic", color: RED_CLOSED }}>
                      {t("form.closed") ?? "Kapalı"}
                    </Text>
                  </View>
                )}
              </View>
              <Switch
                value={open}
                onValueChange={(v) => toggleDay(d.day, idx, v)}
                trackColor={{
                  false: isDark ? "rgba(255,255,255,0.14)" : "#e2e8f0",
                  true: isDark ? "#15803d" : GREEN_OPEN,
                }}
                thumbColor={open ? "#ffffff" : (isDark ? "#94a3b8" : "#f8fafc")}
                ios_backgroundColor={isDark ? "rgba(255,255,255,0.14)" : "#e2e8f0"}
                style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }], flexShrink: 0 }}
              />
            </View>

            {/* Expanded time pickers */}
            {open && (
              <MotiView
                from={{ opacity: 0, translateY: -6 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 200 }}
                style={{
                  paddingHorizontal: 14,
                  paddingBottom: 14,
                  paddingTop: 4,
                  borderTopWidth: 1,
                  borderTopColor: isDark ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.18)",
                  backgroundColor: isDark ? "rgba(0,0,0,0.08)" : "rgba(34,197,94,0.03)",
                }}
              >
                {/* Başlangıç + bitiş — tek satır, ortalanmış */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 12, rowGap: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 15, fontFamily: "CenturyGothic-Bold", color: colors.sectionHeaderText }}>
                      {t("form.startTime") ?? "Açılış"}
                    </Text>
                    {Platform.OS === "ios" ? (
                      <DateTimePicker
                        value={start}
                        mode="time"
                        display="compact"
                        locale="tr-TR"
                        onChange={(_, date) => {
                          if (!date) return;
                          setValue(`workingHours.${idx}.startTime`, fmtHHmm(date), { shouldDirty: true, shouldValidate: true });
                          trigger([`workingHours.${idx}.startTime`, `workingHours.${idx}.endTime`]);
                        }}
                      />
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleTimePress(idx, "startTime", start)}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 12,
                          backgroundColor: isDark ? "rgba(254,166,14,0.12)" : "rgba(254,166,14,0.1)",
                          borderWidth: 1,
                          borderColor: "rgba(254,166,14,0.35)",
                        }}
                      >
                        <Text style={{ fontSize: 17, fontFamily: "CenturyGothic-Bold", color: "#fea60e" }}>
                          {row.startTime || "09:00"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={{ fontSize: 18, fontFamily: "CenturyGothic-Bold", color: colors.textSecondary }}>–</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 15, fontFamily: "CenturyGothic-Bold", color: colors.sectionHeaderText }}>
                      {t("form.endTime") ?? "Kapanış"}
                    </Text>
                    {Platform.OS === "ios" ? (
                      <DateTimePicker
                        value={end}
                        mode="time"
                        display="compact"
                        locale="tr-TR"
                        onChange={(_, date) => {
                          if (!date) return;
                          setValue(`workingHours.${idx}.endTime`, fmtHHmm(date), { shouldDirty: true, shouldValidate: true });
                          trigger([`workingHours.${idx}.startTime`, `workingHours.${idx}.endTime`]);
                        }}
                      />
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleTimePress(idx, "endTime", end)}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 12,
                          backgroundColor: isDark ? "rgba(254,166,14,0.12)" : "rgba(254,166,14,0.1)",
                          borderWidth: 1,
                          borderColor: "rgba(254,166,14,0.35)",
                        }}
                      >
                        <Text style={{ fontSize: 17, fontFamily: "CenturyGothic-Bold", color: "#fea60e" }}>
                          {row.endTime || "18:00"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {!!(dayErr?.startTime || dayErr?.endTime) && (
                  <HelperText type="error" visible style={{ paddingHorizontal: 0, marginTop: 4 }}>
                    {(dayErr?.startTime?.message as string) || (dayErr?.endTime?.message as string) || ""}
                  </HelperText>
                )}
              </MotiView>
            )}
          </View>
        );
      })}

      {/* Android time picker dialog */}
      {Platform.OS === "android" && androidPickerState && (
        <DateTimePicker
          value={androidPickerState.value}
          mode="time"
          is24Hour
          display="default"
          onChange={(_, date) => {
            setAndroidPickerState(null);
            if (!date) return;
            const { dayIdx, field } = androidPickerState;
            setValue(`workingHours.${dayIdx}.${field}`, fmtHHmm(date), { shouldDirty: true, shouldValidate: true });
            trigger([`workingHours.${dayIdx}.startTime`, `workingHours.${dayIdx}.endTime`]);
          }}
        />
      )}

      {/* Kapalı günler özeti - horizontal scroll */}
      {closedDays.length > 0 && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: "timing", duration: 300 }}
          style={{
            marginTop: 4,
            padding: 12,
            borderRadius: 14,
            backgroundColor: isDark ? "rgba(248,113,113,0.07)" : "rgba(248,113,113,0.05)",
            borderWidth: 1,
            borderColor: isDark ? "rgba(248,113,113,0.22)" : "rgba(248,113,113,0.18)",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Icon source="calendar-remove" size={16} color={RED_CLOSED} />
            <Text style={{ fontSize: 13, fontFamily: "CenturyGothic-Bold", color: RED_CLOSED }}>
              {t("form.closedDays") ?? "Kapalı Günler"}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 2 }}>
            {closedDays.map((d) => (
              <TouchableOpacity
                key={d.day}
                onPress={() => {
                  const idx = (working ?? []).findIndex((w) => w.dayOfWeek === d.day);
                  if (idx >= 0) toggleDay(d.day, idx, true);
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: isDark ? "rgba(248,113,113,0.15)" : "rgba(248,113,113,0.1)",
                  borderWidth: 1,
                  borderColor: "rgba(248,113,113,0.3)",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Text style={{ fontSize: 12, fontFamily: "CenturyGothic-Bold", color: RED_CLOSED }}>
                  {d.full}
                </Text>
                <Icon source="plus-circle-outline" size={13} color={RED_CLOSED} />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 8 }}>
            {t("form.closedDaysHint") ?? "Kapalı güne dokunarak açabilirsiniz"}
          </Text>
        </MotiView>
      )}
    </View>
  );
}
