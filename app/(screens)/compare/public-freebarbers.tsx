import React, { useMemo, type ReactNode } from "react";
import { useLocalSearchParams } from "expo-router";

import { Text } from "../../components/common/Text";
import { AnimatedMoneyText } from "../../components/common/AnimatedMoneyText";
import { useTheme } from "../../hook/useTheme";
import { useLanguage } from "../../hook/useLanguage";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { useGetFreeBarberForUsersQuery } from "../../store/api";
import { FreeBarberPanelDto } from "../../types";
import { getBarberTypeLabel } from "../../utils/card-helpers";
import { formatFavoriteCount } from "../../utils/formatFavoriteCount";
import type { CompareWinner } from "./compareShared";
import { useCompareMetrics } from "./compareShared";
import type { CompareMetricRowData } from "./compareMetricTypes";
import { FreeBarberCompareView } from "./FreeBarberCompareView";

function valueStyle(colors: { sectionHeaderText: string }, m: { titleNameFont: number }, bold: boolean) {
  return {
    color: colors.sectionHeaderText,
    fontSize: m.titleNameFont,
    fontFamily: bold ? ("CenturyGothic-Bold" as const) : ("CenturyGothic" as const),
  };
}

function useFreeBarberMetricRows(
  t: (k: string) => string,
  l: FreeBarberPanelDto | undefined,
  r: FreeBarberPanelDto | undefined,
  m: { titleNameFont: number },
  colors: { sectionHeaderText: string },
) {
  return useMemo(() => {
    if (!l || !r) {
      return { rows: [] as CompareMetricRowData[], leftWins: 0, rightWins: 0, leftPct: 50 };
    }
    const rows: CompareMetricRowData[] = [];
    let leftWins = 0;
    let rightWins = 0;
    const st = () => valueStyle(colors, m, true);

    const addMetric = (label: string, winner: CompareWinner, leftNode: ReactNode, rightNode: ReactNode) => {
      if (winner === "left") leftWins += 1;
      else if (winner === "right") rightWins += 1;
      rows.push({ label, winner, left: leftNode, right: rightNode });
    };

    rows.push({
      label: t("compare.type"),
      winner: "skip",
      left: <Text style={st()}>{getBarberTypeLabel(l.type)}</Text>,
      right: <Text style={st()}>{getBarberTypeLabel(r.type)}</Text>,
    });

    const wRating = l.rating === r.rating ? ("tie" as const) : l.rating > r.rating ? ("left" as const) : ("right" as const);
    addMetric(
      t("profile.rating"),
      wRating,
      <AnimatedMoneyText value={l.rating} minimumFractionDigits={1} maximumFractionDigits={1} style={st()} enabled />,
      <AnimatedMoneyText value={r.rating} minimumFractionDigits={1} maximumFractionDigits={1} style={st()} enabled />,
    );

    const wRev = l.reviewCount === r.reviewCount ? ("tie" as const) : l.reviewCount > r.reviewCount ? ("left" as const) : ("right" as const);
    addMetric(
      t("profile.reviews"),
      wRev,
      <AnimatedMoneyText value={l.reviewCount} maximumFractionDigits={0} style={st()} enabled />,
      <AnimatedMoneyText value={r.reviewCount} maximumFractionDigits={0} style={st()} enabled />,
    );

    const wFav = l.favoriteCount === r.favoriteCount ? ("tie" as const) : l.favoriteCount > r.favoriteCount ? ("left" as const) : ("right" as const);
    addMetric(
      t("profile.favorites"),
      wFav,
      <AnimatedMoneyText value={l.favoriteCount} formatDisplay={formatFavoriteCount} maximumFractionDigits={0} style={st()} enabled />,
      <AnimatedMoneyText value={r.favoriteCount} formatDisplay={formatFavoriteCount} maximumFractionDigits={0} style={st()} enabled />,
    );

    const sL = l.offerings?.length ?? 0;
    const sR = r.offerings?.length ?? 0;
    const wS = sL === sR ? ("tie" as const) : sL > sR ? ("left" as const) : ("right" as const);
    addMetric(
      t("compare.serviceCount"),
      wS,
      <AnimatedMoneyText value={sL} maximumFractionDigits={0} style={st()} enabled />,
      <AnimatedMoneyText value={sR} maximumFractionDigits={0} style={st()} enabled />,
    );

    const wAv =
      l.isAvailable === r.isAvailable
        ? ("tie" as const)
        : l.isAvailable && !r.isAvailable
          ? ("left" as const)
          : !l.isAvailable && r.isAvailable
            ? ("right" as const)
            : ("tie" as const);
    addMetric(
      t("compare.availability"),
      wAv,
      <Text style={st()}>{l.isAvailable ? t("status.available") : t("status.busy")}</Text>,
      <Text style={st()}>{r.isAvailable ? t("status.available") : t("status.busy")}</Text>,
    );

    const totalW = leftWins + rightWins;
    const leftPct = totalW === 0 ? 50 : (100 * leftWins) / totalW;
    return { rows, leftWins, rightWins, leftPct };
  }, [l, r, t, colors, m]);
}

export default function PublicFreeBarbersCompareScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useSafeNavigation();
  const m = useCompareMetrics();
  const { left, right } = useLocalSearchParams<{ left?: string; right?: string }>();

  const qLeft = useGetFreeBarberForUsersQuery(left ?? "", { skip: !left });
  const qRight = useGetFreeBarberForUsersQuery(right ?? "", { skip: !right });
  const fl = qLeft.data;
  const fr = qRight.data;
  const { rows, leftWins, rightWins, leftPct } = useFreeBarberMetricRows(t, fl, fr, m, colors);
  const loading = (qLeft.isFetching && !qLeft.data) || (qRight.isFetching && !qRight.data);

  return (
    <FreeBarberCompareView
      title={t("compare.publicFreeBarbersTitle")}
      subtitle={t("compare.publicSubtitle")}
      loading={loading}
      left={fl}
      right={fr}
      rows={rows}
      leftWins={leftWins}
      rightWins={rightWins}
      leftPct={leftPct}
      onBack={() => router.back()}
    />
  );
}
