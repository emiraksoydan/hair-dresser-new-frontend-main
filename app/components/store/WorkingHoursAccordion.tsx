import React, { useCallback, useMemo } from "react";
import { Switch, View, TouchableOpacity } from "react-native";
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

  return (
    <View style={{ gap: 6 }}>
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

        return (
          <View
            key={d.day}
            style={{
              borderRadius: 14,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: open
                ? isDark ? "rgba(254,166,14,0.25)" : "rgba(254,166,14,0.2)"
                : colors.borderColor,
              backgroundColor: open
                ? isDark ? "rgba(254,166,14,0.06)" : "rgba(254,166,14,0.04)"
                : colors.cardBg,
            }}
          >
            {/* Header row */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              {/* Day indicator dot */}
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: open ? "#fea60e" : isDark ? "#374151" : "#d1d5db",
                  marginRight: 10,
                }}
              />
              <Text
                style={{
                  fontFamily: "CenturyGothic-Bold",
                  fontSize: 14,
                  color: open ? colors.sectionHeaderText : colors.textSecondary,
                  flex: 1,
                }}
              >
                {d.label}
              </Text>

              {/* When open: compact time preview */}
              {open && (
                <Text
                  style={{
                    fontFamily: "CenturyGothic",
                    fontSize: 12,
                    color: "#fea60e",
                    marginRight: 10,
                  }}
                >
                  {row.startTime || "09:00"} – {row.endTime || "18:00"}
                </Text>
              )}

              {/* Kapalı badge */}
              {!open && (
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 8,
                    backgroundColor: isDark ? "rgba(75,85,99,0.4)" : "#f3f4f6",
                    marginRight: 10,
                  }}
                >
                  <Text style={{ fontSize: 11, fontFamily: "CenturyGothic", color: colors.textSecondary }}>
                    {t("form.closed") ?? "Kapalı"}
                  </Text>
                </View>
              )}

              <Switch
                value={open}
                onValueChange={(v) => toggleDay(d.day, idx, v)}
                trackColor={{ false: isDark ? "#374151" : "#d1d5db", true: "rgba(254,166,14,0.5)" }}
                thumbColor={open ? "#fea60e" : isDark ? "#6b7280" : "#9ca3af"}
                style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
              />
            </View>

            {/* Expanded time pickers */}
            {open && (
              <MotiView
                from={{ opacity: 0, translateY: -4 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 180 }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  paddingBottom: 10,
                  paddingTop: 2,
                  gap: 8,
                  borderTopWidth: 1,
                  borderTopColor: isDark ? "rgba(254,166,14,0.12)" : "rgba(254,166,14,0.15)",
                  backgroundColor: isDark ? "rgba(0,0,0,0.1)" : "rgba(254,166,14,0.04)",
                }}
              >
                <Icon source="clock-start" size={16} color="#fea60e" />
                <DateTimePicker
                  value={start}
                  mode="time"
                  is24Hour
                  locale="tr-TR"
                  onChange={(_, date) => {
                    if (!date) return;
                    setValue(`workingHours.${idx}.startTime`, fmtHHmm(date), { shouldDirty: true, shouldValidate: true });
                    trigger([`workingHours.${idx}.startTime`, `workingHours.${idx}.endTime`]);
                  }}
                />
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginHorizontal: 4 }}>→</Text>
                <Icon source="clock-end" size={16} color="#fea60e" />
                <DateTimePicker
                  value={end}
                  mode="time"
                  is24Hour
                  locale="tr-TR"
                  onChange={(_, date) => {
                    if (!date) return;
                    setValue(`workingHours.${idx}.endTime`, fmtHHmm(date), { shouldDirty: true, shouldValidate: true });
                    trigger([`workingHours.${idx}.startTime`, `workingHours.${idx}.endTime`]);
                  }}
                />
                {!!(dayErr?.startTime || dayErr?.endTime) && (
                  <HelperText type="error" visible style={{ flex: 1, paddingHorizontal: 0 }}>
                    {(dayErr?.startTime?.message as string) || (dayErr?.endTime?.message as string) || ""}
                  </HelperText>
                )}
              </MotiView>
            )}
          </View>
        );
      })}

      {/* Tatil günleri özeti */}
      {closedDays.length > 0 && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: "timing", duration: 300 }}
          style={{
            marginTop: 4,
            padding: 12,
            borderRadius: 14,
            backgroundColor: isDark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.05)",
            borderWidth: 1,
            borderColor: isDark ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.15)",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Icon source="calendar-remove" size={16} color="#ef4444" />
            <Text style={{ fontSize: 13, fontFamily: "CenturyGothic-Bold", color: "#ef4444" }}>
              {t("form.closedDays") ?? "Kapalı Günler"}
            </Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {closedDays.map((d) => (
              <TouchableOpacity
                key={d.day}
                onPress={() => {
                  const idx = (working ?? []).findIndex((w) => w.dayOfWeek === d.day);
                  if (idx >= 0) toggleDay(d.day, idx, true);
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 20,
                  backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.1)",
                  borderWidth: 1,
                  borderColor: "rgba(239,68,68,0.3)",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 12, fontFamily: "CenturyGothic-Bold", color: "#ef4444" }}>
                  {d.label}
                </Text>
                <Icon source="plus-circle-outline" size={13} color="#ef4444" />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 6 }}>
            {t("form.closedDaysHint") ?? "Kapalı güne dokunarak açabilirsiniz"}
          </Text>
        </MotiView>
      )}
    </View>
  );
}
