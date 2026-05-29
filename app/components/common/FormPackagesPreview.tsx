import React, { useMemo } from "react";
import { View } from "react-native";
import { Text } from "./Text";
import type { PackageFormItem, ServiceOption } from "../store/ServicePackageStep";
import { parseTR } from "../../utils/form/money-helper";

const ACCENT = "#c2a523";

type Props = {
  packages: PackageFormItem[];
  serviceOptions: ServiceOption[];
  colors: { borderColor: string; sectionHeaderText: string; textSecondary: string };
  title: string;
  currencySymbol: string;
};

/** Form önizleme adımında paketlerin son halini gösterir. */
export function FormPackagesPreview({
  packages,
  serviceOptions,
  colors,
  title,
  currencySymbol,
}: Props) {
  const labelById = useMemo(
    () => new Map(serviceOptions.map((o) => [o.id, o.label])),
    [serviceOptions],
  );

  const validPackages = useMemo(
    () =>
      packages.filter(
        (p) =>
          p.packageName.trim() &&
          p.serviceOfferingIds.length > 0 &&
          parseTR(p.totalPrice) != null &&
          (parseTR(p.totalPrice) ?? 0) > 0,
      ),
    [packages],
  );

  if (validPackages.length === 0) return null;

  return (
    <View
      className="py-1.5"
      style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor }}
    >
      <Text className="text-gray-400 text-lg mb-1">{title}</Text>
      {validPackages.map((pkg) => {
        const price = parseTR(pkg.totalPrice);
        const serviceLabels = pkg.serviceOfferingIds
          .map((id) => labelById.get(id) ?? id)
          .filter(Boolean);
        return (
          <View
            key={pkg.localId || pkg.id}
            className="py-2"
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.borderColor,
            }}
          >
            <View className="flex-row justify-between items-start gap-2">
              <Text
                className="text-lg flex-1"
                style={{ color: colors.sectionHeaderText, fontFamily: "CenturyGothic-Bold" }}
                numberOfLines={2}
              >
                {pkg.packageName.trim()}
              </Text>
              <Text
                className="text-lg"
                style={{ color: ACCENT, fontFamily: "CenturyGothic-Bold" }}
              >
                {price != null ? `${price} ${currencySymbol}` : "—"}
              </Text>
            </View>
            {serviceLabels.length > 0 && (
              <Text
                className="text-base mt-1"
                style={{ color: colors.textSecondary, fontFamily: "CenturyGothic" }}
                numberOfLines={3}
              >
                {serviceLabels.join(" · ")}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
