import React, { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Text } from "../common/Text";
import { Icon } from "react-native-paper";
import type { StoreDayAvailabilityDto, SlotDto } from "../../types";
import { fmtDateOnly, getDayInfo, normalizeTime } from "../../utils/time/time-helper";
import type { ThemeColors } from "../../hook/useTheme";
import { useLanguage } from "../../hook/useLanguage";

/**
 * Haftalık grid — davranış özeti
 *
 * - Kapalı gün (`isDayClosed`): Dükkan çalışma saatlerinde o haftanın günü “kapalı” ise
 *   tüm sütun kapalı görünür (çizgi/lejant); hücrelere tıklanamaz, slot seçilmez.
 * - Dolu koltuk (`slot.isBooked`): API o tarih/saat için koltuğu dolu bildirirse hücre
 *   dolu stilinde kalır, `TouchableOpacity` devre dışı; `onCellPress` zaten seçim yapmaz.
 * - Geçmiş saat (`slot.isPast`): Aynı şekilde devre dışı; seçilemez.
 * - Tatil / tek seferlik kapalı gün: Uygulama ayrı bir “tatil takvimi” çizmiyor; gün
 *   çalışma saatlerinde kapalıysa yukarıdaki “kapalı sütun” gibi davranır. Sadece
 *   müsaitlikte slot yoksa ilgili hücreler boş kalır (kapalı sütun gibi gri değil).
 */
const TIME_COL = 54;
const HEADER_MIN_H = 56;

/** Satır yüksekliği: ekranın ~%5’i; okunabilir alt/üst sınır */
const ROW_HEIGHT_RATIO = 0.05;
const ROW_HEIGHT_MIN = 38;
const ROW_HEIGHT_MAX = 50;

/**
 * Dikey kaydırma alanı: ekranın ~%36’sı; kısa telefonda minimum kullanılabilir yükseklik,
 * çok uzun ekranda üst sınır (üstteki ScrollView ile yarışmasın diye).
 */
const BODY_SCROLL_HEIGHT_RATIO = 0.36;
const BODY_SCROLL_MIN = 240;
const BODY_SCROLL_MAX = 520;

/** App booking accent (storebooking ile aynı aile: amber + açık sarı vurgu) */
const SEL = {
  ring: "#fea60e",
  dotStrong: "#fde047",
  fillHeaderLight: "rgba(254, 166, 14, 0.14)",
  fillHeaderDark: "rgba(254, 166, 14, 0.2)",
  fillCellLight: "rgba(254, 166, 14, 0.15)",
  fillCellDark: "rgba(254, 166, 14, 0.22)",
};

/** Google Calendar–style neutrals + uygulama seçim sarısı */
const G = {
  light: {
    surface: "#ffffff",
    headerBg: "#f8f9fa",
    gridLine: "#e8eaed",
    gridLineStrong: "#dadce0",
    muted: "#70757a",
    onSurface: "#3c4043",
    todayRing: "#1a73e8",
    todayCol: "rgba(26, 115, 232, 0.06)",
    booked: "#fce8e6",
    bookedBorder: "#f28b82",
    pastFill: "#f1f3f4",
    freeDot: "#1e8e3e",
    selectedRing: SEL.ring,
    selectedDot: SEL.dotStrong,
    closedFill: "#f1f3f4",
    legendBorder: "#dadce0",
  },
  dark: {
    surface: "#1e1e1e",
    headerBg: "#252525",
    gridLine: "#3c4043",
    gridLineStrong: "#5f6368",
    muted: "#9aa0a6",
    onSurface: "#e8eaed",
    todayRing: "#8ab4f8",
    todayCol: "rgba(138, 180, 248, 0.08)",
    booked: "rgba(242, 139, 130, 0.22)",
    bookedBorder: "#f28b82",
    pastFill: "#2d2d2d",
    freeDot: "#81c995",
    selectedRing: SEL.ring,
    selectedDot: SEL.dotStrong,
    closedFill: "#2d2d2d",
    legendBorder: "#5f6368",
  },
};

function computeRowHeight(windowHeight: number) {
  return Math.min(
    ROW_HEIGHT_MAX,
    Math.max(ROW_HEIGHT_MIN, Math.round(windowHeight * ROW_HEIGHT_RATIO)),
  );
}

function computeBodyMaxScrollHeight(windowHeight: number) {
  return Math.min(
    BODY_SCROLL_MAX,
    Math.max(BODY_SCROLL_MIN, Math.round(windowHeight * BODY_SCROLL_HEIGHT_RATIO)),
  );
}

type Props = {
  days: Date[];
  availabilityByDay: StoreDayAvailabilityDto[] | undefined;
  chairId: string | null;
  selectedDateOnly: string;
  selectedSlotKeys: string[];
  isDayClosed: (d: Date) => boolean;
  onCellPress: (dateOnly: string, slot: SlotDto) => void;
  colors: ThemeColors;
  isDark: boolean;
  title: string;
  legendFree: string;
  legendBooked: string;
  legendPast: string;
  legendClosed: string;
};

function findSlotForChair(
  byDay: StoreDayAvailabilityDto[] | undefined,
  dateOnly: string,
  chairId: string,
  timeKey: string,
): SlotDto | undefined {
  const row = byDay?.find((d) => d.date === dateOnly);
  const chair = row?.chairs.find((c) => c.chairId === chairId);
  return chair?.slots.find((s) => normalizeTime(s.start) === timeKey);
}

export function BookingWeekGrid({
  days,
  availabilityByDay,
  chairId,
  selectedDateOnly,
  selectedSlotKeys,
  isDayClosed,
  onCellPress,
  colors,
  isDark,
  title,
  legendFree,
  legendBooked,
  legendPast,
  legendClosed,
}: Props) {
  const { t } = useLanguage();
  const palette = isDark ? G.dark : G.light;
  const { width: winW, height: winH } = useWindowDimensions();
  const rowHeight = useMemo(() => computeRowHeight(winH), [winH]);
  const bodyScrollMaxHeight = useMemo(() => computeBodyMaxScrollHeight(winH), [winH]);

  const inner = winW - 32;
  const dayColW = Math.max(44, (inner - TIME_COL - 2) / 7);

  const timeRows = useMemo(() => {
    if (!chairId || !availabilityByDay?.length) return [] as string[];
    const set = new Set<string>();
    for (const d of availabilityByDay) {
      const ch = d.chairs.find((c) => c.chairId === chairId);
      ch?.slots.forEach((s) => set.add(normalizeTime(s.start)));
    }
    return [...set].sort();
  }, [availabilityByDay, chairId]);

  if (!chairId) {
    return null;
  }

  const gridMinW = TIME_COL + 7 * dayColW;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionTitle, { color: colors.sectionHeaderText }]}>{title}</Text>

      <View style={[styles.legendRow, { borderColor: palette.legendBorder }]}>
        <LegendDot color={palette.freeDot} label={legendFree} muted={palette.muted} />
        <LegendDot color={palette.bookedBorder} label={legendBooked} muted={palette.muted} />
        <LegendDot color={palette.muted} label={legendPast} muted={palette.muted} />
        <LegendDot color={palette.gridLineStrong} label={legendClosed} muted={palette.muted} />
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: palette.surface,
            borderColor: palette.gridLineStrong,
          },
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
          <View style={{ minWidth: gridMinW }}>
            {/* Header — Google: weekday + day number in circle */}
            <View style={[styles.headerRow, { backgroundColor: palette.headerBg, borderBottomColor: palette.gridLineStrong }]}>
              <View style={[styles.cornerCell, { width: TIME_COL, borderRightColor: palette.gridLine }]} />
              {days.map((d) => {
                const key = fmtDateOnly(d);
                const info = getDayInfo(d);
                const closed = isDayClosed(d);
                const isSelectedDay = key === selectedDateOnly;
                const showToday = info.isToday && !closed;
                return (
                  <View
                    key={key}
                    style={[
                      styles.headerDay,
                      {
                        width: dayColW,
                        borderLeftColor: palette.gridLine,
                        backgroundColor: showToday ? palette.todayCol : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={[styles.headerWeekday, { color: closed ? "#ea4335" : palette.muted }]}
                      numberOfLines={1}
                    >
                      {info.isToday ? t("booking.today") : info.dayShort}
                    </Text>
                    <View
                      style={[
                        styles.dayCircle,
                        {
                          borderWidth: isSelectedDay || showToday ? 2 : 0,
                          borderColor: isSelectedDay
                            ? palette.selectedRing
                            : showToday
                              ? palette.todayRing
                              : "transparent",
                          backgroundColor: isSelectedDay
                            ? isDark
                              ? SEL.fillHeaderDark
                              : SEL.fillHeaderLight
                            : "transparent",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNum,
                          {
                            color: closed ? "#ea4335" : isSelectedDay ? palette.selectedRing : palette.onSurface,
                            fontWeight: isSelectedDay || showToday ? "700" : "600",
                          },
                        ]}
                      >
                        {info.dayNum}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <ScrollView
              style={styles.bodyScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              {timeRows.length === 0 ? (
                <Text style={[styles.emptyHint, { color: palette.muted }]}>—</Text>
              ) : (
                timeRows.map((timeKey, rowIndex) => (
                  <View
                    key={timeKey}
                    style={[
                      styles.dataRow,
                      {
                        borderTopColor: palette.gridLine,
                        borderTopWidth: rowIndex === 0 ? 0 : StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.timeCell,
                        {
                          width: TIME_COL,
                          borderRightColor: palette.gridLine,
                          height: rowHeight,
                        },
                      ]}
                    >
                      <Text style={[styles.timeText, { color: palette.muted }]}>{timeKey}</Text>
                    </View>
                    {days.map((d) => {
                      const dateOnly = fmtDateOnly(d);
                      const closed = isDayClosed(d);
                      const info = getDayInfo(d);
                      const isTodayCol = info.isToday && !closed;

                      if (closed) {
                        return (
                          <View
                            key={`${timeKey}-${dateOnly}-closed`}
                            style={[
                              styles.cell,
                              {
                                width: dayColW,
                                height: rowHeight,
                                borderLeftColor: palette.gridLine,
                                borderLeftWidth: StyleSheet.hairlineWidth,
                                backgroundColor: palette.closedFill,
                              },
                            ]}
                          >
                            <Text style={[styles.cellDash, { color: palette.muted }]}>—</Text>
                          </View>
                        );
                      }

                      const slot = findSlotForChair(availabilityByDay, dateOnly, chairId, timeKey);
                      if (!slot) {
                        return (
                          <View
                            key={`${timeKey}-${dateOnly}-empty`}
                            style={[
                              styles.cell,
                              {
                                width: dayColW,
                                height: rowHeight,
                                borderLeftColor: palette.gridLine,
                                borderLeftWidth: StyleSheet.hairlineWidth,
                                backgroundColor: isTodayCol ? palette.todayCol : "transparent",
                              },
                            ]}
                          />
                        );
                      }

                      const isBooked = slot.isBooked;
                      const isPast = slot.isPast;
                      const disabled = isBooked || isPast;
                      const isSelected =
                        dateOnly === selectedDateOnly && selectedSlotKeys.includes(timeKey);

                      let bg = "transparent";
                      let borderC = "transparent";
                      if (isBooked) {
                        bg = palette.booked;
                        borderC = palette.bookedBorder;
                      } else if (isPast) {
                        bg = palette.pastFill;
                        borderC = palette.gridLine;
                      } else if (isSelected) {
                        bg = isDark ? SEL.fillCellDark : SEL.fillCellLight;
                        borderC = palette.selectedRing;
                      } else if (!isBooked && !isPast) {
                        bg = isDark ? "rgba(129, 201, 149, 0.12)" : "rgba(30, 142, 62, 0.08)";
                        borderC = palette.gridLine;
                      }

                      return (
                        <TouchableOpacity
                          key={`${timeKey}-${dateOnly}`}
                          disabled={disabled}
                          onPress={() => onCellPress(dateOnly, slot)}
                          activeOpacity={0.7}
                          style={[
                            styles.cellTouchable,
                            {
                              width: dayColW,
                              height: rowHeight - 4,
                              marginVertical: 2,
                              borderLeftColor: palette.gridLine,
                              borderLeftWidth: StyleSheet.hairlineWidth,
                              backgroundColor: isTodayCol && !isBooked && !isPast && !isSelected ? palette.todayCol : bg,
                              borderColor: isSelected ? borderC : palette.gridLine,
                              borderWidth: isSelected ? 1.5 : StyleSheet.hairlineWidth,
                              opacity: disabled ? 0.65 : 1,
                            },
                          ]}
                        >
                          {isBooked && (
                            <Icon source="minus-circle" size={16} color={palette.bookedBorder} />
                          )}
                          {isPast && !isBooked && (
                            <Icon source="clock-outline" size={15} color={palette.muted} />
                          )}
                          {!isBooked && !isPast && (
                            <View
                              style={[
                                styles.availDot,
                                {
                                  backgroundColor: isSelected ? palette.selectedDot : palette.freeDot,
                                  transform: [{ scale: isSelected ? 1.15 : 1 }],
                                },
                              ]}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function LegendDot({
  color,
  label,
  muted,
}: {
  color: string;
  label: string;
  muted: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: muted }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "CenturyGothic-Bold",
    letterSpacing: 0.2,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "48%",
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 11,
    fontFamily: "CenturyGothic",
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  headerRow: {
    flexDirection: "row",
    minHeight: HEADER_MIN_H,
    borderBottomWidth: 1,
    alignItems: "stretch",
  },
  cornerCell: {
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  headerDay: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  headerWeekday: {
    fontSize: 11,
    fontFamily: "CenturyGothic",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  dayCircle: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNum: {
    fontSize: 15,
    fontFamily: "CenturyGothic-Bold",
  },
  bodyScroll: {},
  emptyHint: {
    textAlign: "center",
    paddingVertical: 24,
    fontFamily: "CenturyGothic",
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  timeCell: {
    justifyContent: "flex-start",
    paddingTop: 4,
    paddingRight: 6,
    borderRightWidth: StyleSheet.hairlineWidth,
    alignItems: "flex-end",
  },
  timeText: {
    fontSize: 11,
    fontFamily: "CenturyGothic",
    marginTop: 2,
  },
  cell: {
    alignItems: "center",
    justifyContent: "center",
  },
  cellDash: {
    fontSize: 12,
  },
  cellTouchable: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },
  availDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
});
