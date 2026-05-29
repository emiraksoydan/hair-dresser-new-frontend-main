import React, { useEffect, useState } from "react";
import { View, TouchableOpacity } from "react-native";
import { Icon } from "react-native-paper";
import { Text } from "./Text";
import { ServiceOfferingsList } from "./ServiceOfferingsList";
import { ServicePackagesList, ServicePackageItem } from "./ServicePackagesList";
import { useTheme } from "../../hook/useTheme";
import { useLanguage } from "../../hook/useLanguage";
import { useGetServicePackagesByOwnerQuery } from "../../store/api";
import type { ServiceOfferingGetDto } from "../../types";

type Props = {
  ownerId: string;
  /** Varsayılan hizmet listesi; `renderServices` verilirse yok sayılır. */
  serviceOfferings?: ServiceOfferingGetDto[];
  /** Serbest berber gibi bölünmüş hizmet UI için. */
  renderServices?: React.ReactNode;
  expanded?: boolean;
  className?: string;
};

/**
 * Kartlarda Hizmetler / Paketler sekmesi — ownerId dükkan veya serbest berber panel id'si.
 */
export function CardServicesPackagesSection({
  ownerId,
  serviceOfferings = [],
  renderServices,
  expanded = false,
  className = "mt-4",
}: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"services" | "packages">("services");

  useEffect(() => {
    setActiveTab("services");
  }, [ownerId]);

  const {
    data: packagesData,
    isFetching: packagesFetching,
    isError: packagesError,
  } = useGetServicePackagesByOwnerQuery(ownerId, {
    skip: !ownerId || activeTab !== "packages",
    refetchOnMountOrArgChange: true,
  });

  const packages = packagesData ?? [];

  return (
    <View className={`rounded-xl pr-2 ${className}`}>
      <View
        className="flex-row mb-2 rounded-lg overflow-hidden"
        style={{
          backgroundColor: colors.cardBg2,
          borderWidth: 1,
          borderColor: colors.borderColor,
          minHeight: 38,
        }}
      >
        <TouchableOpacity
          onPress={() => setActiveTab("services")}
          activeOpacity={0.7}
          className="flex-1 py-2 items-center flex-row justify-center gap-1"
          style={{
            backgroundColor:
              activeTab === "services"
                ? isDark
                  ? "rgba(96,165,250,0.18)"
                  : "rgba(96,165,250,0.12)"
                : "transparent",
          }}
        >
          <Icon
            source="scissors-cutting"
            size={14}
            color={activeTab === "services" ? "#60a5fa" : colors.textSecondary}
          />
          <Text
            style={{
              fontSize: 13,
              fontFamily: "CenturyGothic-Bold",
              color: activeTab === "services" ? "#60a5fa" : colors.textSecondary,
            }}
          >
            {t("common.services")}
          </Text>
        </TouchableOpacity>
        <View style={{ width: 1, backgroundColor: colors.borderColor }} />
        <TouchableOpacity
          onPress={() => setActiveTab("packages")}
          activeOpacity={0.7}
          className="flex-1 py-2 items-center flex-row justify-center gap-1"
          style={{
            backgroundColor:
              activeTab === "packages"
                ? isDark
                  ? "rgba(167,139,250,0.18)"
                  : "rgba(167,139,250,0.12)"
                : "transparent",
          }}
        >
          <Icon
            source="tag-multiple-outline"
            size={14}
            color={activeTab === "packages" ? "#a78bfa" : colors.textSecondary}
          />
          <Text
            style={{
              fontSize: 13,
              fontFamily: "CenturyGothic-Bold",
              color: activeTab === "packages" ? "#a78bfa" : colors.textSecondary,
            }}
          >
            {t("servicePackage.tabPackages")}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "services" && (
        <View style={{ minHeight: expanded ? undefined : 188 }}>
          {renderServices ?? (
            <ServiceOfferingsList
              offerings={serviceOfferings}
              layout="vertical"
              previewCount={3}
              showExpandButton
            />
          )}
        </View>
      )}

      {activeTab === "packages" && (
        packagesFetching ? (
          <View className="py-4 items-center">
            <Icon source="loading" size={20} color={colors.textSecondary} />
          </View>
        ) : packagesError ? (
          <View className="py-3 items-center">
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: "CenturyGothic" }}>
              {t("common.loadingError")}
            </Text>
          </View>
        ) : packages.length === 0 ? (
          <View className="py-3 items-center">
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: "CenturyGothic" }}>
              {t("servicePackage.noPackagesYet")}
            </Text>
          </View>
        ) : (
          <ServicePackagesList packages={packages as ServicePackageItem[]} />
        )
      )}
    </View>
  );
}
