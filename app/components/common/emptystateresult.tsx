import React from "react";
import { LottieViewComponent } from "./lottieview";
import { EmptyStateProps } from "../../types";
import { useLanguage } from "../../hook/useLanguage";

export const EmptyState = ({
  loading,
  locationStatus,
  hasLocation,
  fetchedOnce,
  hasData,
  noResultText,
  needLocationText,
  deniedText,
  onRetry,
}: EmptyStateProps) => {
  const { t } = useLanguage();

  const defaultNeedLocationText =
    needLocationText || t("location.locationRequired");
  const defaultDeniedText = deniedText || t("location.permissionDeniedMessage");
  if (loading) return null;

  const showDenied = locationStatus === "denied";
  const showNeedLocation = !showDenied && !hasLocation;
  const showNoResults = fetchedOnce && !hasData && hasLocation;

  if (showDenied) {
    return (
      <LottieViewComponent
        animationSource={require("../../../assets/animations/Location.json")}
        message={defaultDeniedText}
      />
    );
  }
  if (showNeedLocation) {
    return (
      <LottieViewComponent
        animationSource={require("../../../assets/animations/Location.json")}
        message={defaultNeedLocationText}
      />
    );
  }

  if (showNoResults) {
    return <LottieViewComponent message={noResultText} />;
  }
  return null;
};
