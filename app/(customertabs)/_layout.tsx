import React, { useMemo } from "react";
import { BaseTabLayout } from "../components/layout/BaseTabLayout";
import { UserType } from "../types";
import { useLanguage } from "../hook/useLanguage";
import { getCommonTabs, panelTabConfigs, accentColors } from "../config/tabConfig";

const CustomerLayout = () => {
  const { t } = useLanguage();

  const tabs = useMemo(() => getCommonTabs(t, {
    icon: panelTabConfigs.customer.icon,
    iconFocused: panelTabConfigs.customer.iconFocused,
    label: t(panelTabConfigs.customer.labelKey),
  }), [t]);

  return (
    <BaseTabLayout
      userType={UserType.Customer}
      accentColor={accentColors.customer}
      tabs={tabs}
    />
  );
};

export default CustomerLayout;
