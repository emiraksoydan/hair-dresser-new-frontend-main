import React, { useMemo } from "react";
import { BaseTabLayout } from "../components/layout/BaseTabLayout";
import { UserType } from "../types";
import { useLanguage } from "../hook/useLanguage";
import { getCommonTabs, panelTabConfigs, accentColors } from "../config/tabConfig";

const FreeBarberLayout = () => {
  const { t } = useLanguage();

  const tabs = useMemo(() => getCommonTabs(t, {
    icon: panelTabConfigs.freeBarber.icon,
    iconFocused: panelTabConfigs.freeBarber.iconFocused,
    label: t(panelTabConfigs.freeBarber.labelKey),
  }), [t]);

  return (
    <BaseTabLayout
      userType={UserType.FreeBarber}
      accentColor={accentColors.freeBarber}
      tabs={tabs}
    />
  );
};

export default FreeBarberLayout;
