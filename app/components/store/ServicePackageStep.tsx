import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Text } from "../common/Text";
import {
  Icon,
  IconButton,
  TextInput,
  HelperText,
  Divider,
  Checkbox,
} from "react-native-paper";
import { useTheme } from "../../hook/useTheme";
import { useLanguage } from "../../hook/useLanguage";
import { parseTR, trMoneyRegex } from "../../utils/form/money-helper";
import { isMonetaryWithinLimit, MAX_MONETARY_TRY_DISPLAY } from "../../constants/priceLimits";
import { v4 as uuid } from "uuid";

const ACCENT = "#c2a523";
const MAX_PACKAGES = 20;

export type PackageFormItem = {
  /** Geçici UI id'si (uuid) */
  localId: string;
  /** Backend'de kayıtlı paket ise gerçek ID */
  id?: string;
  packageName: string;
  totalPrice: string; // string tutuyoruz (para girişi)
  serviceOfferingIds: string[];
};

export type ServiceOption = {
  id: string; // serviceOffering id veya category name (formstoreadd'de isim)
  label: string;
};

type ServicePackageStepProps = {
  packages: PackageFormItem[];
  serviceOptions: ServiceOption[];
  onPackagesChange: (packages: PackageFormItem[]) => void;
};

type PackageErrors = {
  packageName?: string;
  totalPrice?: string;
  serviceOfferingIds?: string;
};

function validatePackage(
  pkg: PackageFormItem,
  t: (key: string, opts?: Record<string, string | number>) => string,
): PackageErrors {
  const errors: PackageErrors = {};
  if (!pkg.packageName.trim())
    errors.packageName = t("servicePackage.errNameRequired");
  if (pkg.packageName.trim().length > 100)
    errors.packageName = t("servicePackage.errNameMax");
  if (!pkg.totalPrice || pkg.totalPrice.trim() === "") {
    errors.totalPrice = t("servicePackage.errPriceRequired");
  } else if (!trMoneyRegex.test(pkg.totalPrice)) {
    errors.totalPrice = t("servicePackage.errPriceInvalid");
  } else {
    const n = parseTR(pkg.totalPrice);
    if (n === undefined || n <= 0) {
      errors.totalPrice = t("servicePackage.errPricePositive");
    } else if (!isMonetaryWithinLimit(n)) {
      errors.totalPrice = t("form.priceExceedsPlatformMax", { max: MAX_MONETARY_TRY_DISPLAY });
    }
  }
  if (!pkg.serviceOfferingIds || pkg.serviceOfferingIds.length === 0) {
    errors.serviceOfferingIds = t("servicePackage.errMinServices");
  }
  return errors;
}

function hasErrors(errors: PackageErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** Form alanlarında 1-2-3 adım görünürlüğü */
function StepFieldLabel({
  step,
  label,
  colors,
}: {
  step: 1 | 2 | 3;
  label: string;
  colors: { textSecondary: string; textTertiary?: string };
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
        gap: 10,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: "rgba(194, 165, 35, 0.2)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontFamily: "CenturyGothic-Bold",
            fontSize: 14,
            color: ACCENT,
          }}
        >
          {step}
        </Text>
      </View>
      <Text
        style={{
          fontFamily: "CenturyGothic-Bold",
          fontSize: 13,
          color: colors.textSecondary,
          flex: 1,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ----- Package Card -----
type PackageCardProps = {
  pkg: PackageFormItem;
  index: number;
  serviceOptions: ServiceOption[];
  onEdit: (pkg: PackageFormItem) => void;
  onDelete: (localId: string) => void;
  colors: any;
  isDark: boolean;
  t: (key: string, opts?: Record<string, string | number>) => string;
};

const PackageCard = React.memo<PackageCardProps>(
  ({ pkg, index, serviceOptions, onEdit, onDelete, colors, isDark, t }) => {
    const selectedServices = serviceOptions.filter((s) =>
      pkg.serviceOfferingIds.includes(s.id),
    );
    const priceVal = parseTR(pkg.totalPrice);

    return (
      <View
        style={{
          marginBottom: 14,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.borderColor,
          backgroundColor: colors.cardBg,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
            paddingVertical: 12,
            backgroundColor: isDark
              ? "rgba(194, 165, 35, 0.08)"
              : "rgba(194, 165, 35, 0.06)",
            borderBottomWidth: 1,
            borderBottomColor: colors.borderColor,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: isDark
                ? "rgba(194, 165, 35, 0.18)"
                : "rgba(194, 165, 35, 0.12)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon source="tag-multiple-outline" size={20} color={ACCENT} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text
              style={{
                fontFamily: "CenturyGothic-Bold",
                fontSize: 15,
                color: colors.sectionHeaderText,
              }}
              numberOfLines={1}
            >
              {pkg.packageName ||
                t("servicePackage.defaultName", { index: index + 1 })}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textTertiary }}>
              {t("servicePackage.serviceCount", {
                count: selectedServices.length,
              })}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                backgroundColor: isDark
                  ? "rgba(194, 165, 35, 0.15)"
                  : "rgba(194, 165, 35, 0.1)",
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 4,
                marginRight: 4,
              }}
            >
              <Text
                style={{
                  fontFamily: "CenturyGothic-Bold",
                  color: ACCENT,
                  fontSize: 14,
                }}
              >
                {priceVal !== undefined ? `₺${priceVal.toFixed(2)}` : "—"}
              </Text>
            </View>
            <IconButton
              icon="pencil-outline"
              size={20}
              iconColor={ACCENT}
              onPress={() => onEdit(pkg)}
              style={{ margin: 0 }}
            />
            <IconButton
              icon="delete-outline"
              size={20}
              iconColor="#ef4444"
              onPress={() => onDelete(pkg.localId)}
              style={{ margin: 0 }}
            />
          </View>
        </View>

        {/* Services list */}
        {selectedServices.length > 0 && (
          <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
            {selectedServices.map((s, i) => (
              <View
                key={s.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 4,
                  borderBottomWidth: i < selectedServices.length - 1 ? 1 : 0,
                  borderBottomColor: colors.borderColor,
                }}
              >
                <Icon source="check-circle-outline" size={16} color={ACCENT} />
                <Text
                  style={{
                    marginLeft: 8,
                    fontSize: 13,
                    color: colors.sectionHeaderText,
                  }}
                >
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  },
);

// ----- Package Form Modal -----
type PackageFormModalProps = {
  visible: boolean;
  editingPkg: PackageFormItem | null;
  serviceOptions: ServiceOption[];
  onSave: (pkg: PackageFormItem) => void;
  onClose: () => void;
  colors: any;
  isDark: boolean;
  t: (key: string, opts?: Record<string, string | number>) => string;
};

const PackageFormModal = ({
  visible,
  editingPkg,
  serviceOptions,
  onSave,
  onClose,
  colors,
  isDark,
  t,
}: PackageFormModalProps) => {
  const [packageName, setPackageName] = useState(
    editingPkg?.packageName ?? "",
  );
  const [totalPrice, setTotalPrice] = useState(editingPkg?.totalPrice ?? "");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    editingPkg?.serviceOfferingIds ?? [],
  );
  const [touched, setTouched] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setPackageName(editingPkg?.packageName ?? "");
      setTotalPrice(editingPkg?.totalPrice ?? "");
      setSelectedServiceIds(editingPkg?.serviceOfferingIds ?? []);
      setTouched(false);
    }
  }, [visible, editingPkg]);

  const localPkg: PackageFormItem = useMemo(
    () => ({
      localId: editingPkg?.localId ?? "",
      id: editingPkg?.id,
      packageName,
      totalPrice,
      serviceOfferingIds: selectedServiceIds,
    }),
    [editingPkg, packageName, totalPrice, selectedServiceIds],
  );

  const errors = useMemo(
    () => (touched ? validatePackage(localPkg, t) : {}),
    [touched, localPkg, t],
  );

  const isEditing = editingPkg != null;

  const toggleService = useCallback((id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const handleSave = () => {
    setTouched(true);
    const errs = validatePackage(localPkg, t);
    if (hasErrors(errs)) return;
    onSave(localPkg);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.55)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.sheetBg ?? colors.cardBg,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: "90%",
            }}
          >
            {/* Modal Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: 8,
              }}
            >
              <Icon source="tag-multiple" size={22} color={ACCENT} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text
                  style={{
                    fontFamily: "CenturyGothic-Bold",
                    fontSize: 17,
                    color: colors.sectionHeaderText,
                  }}
                >
                  {isEditing
                    ? t("servicePackage.editModalTitle")
                    : t("servicePackage.newModalTitle")}
                </Text>
                <Text
                  style={{
                    marginTop: 4,
                    fontFamily: "CenturyGothic",
                    fontSize: 12,
                    lineHeight: 17,
                    color: colors.textTertiary,
                  }}
                >
                  {t("servicePackage.modalSubtitle")}
                </Text>
              </View>
              <IconButton
                icon="close"
                size={22}
                iconColor={colors.sectionHeaderText}
                onPress={onClose}
                style={{ margin: 0 }}
              />
            </View>
            <Divider
              style={{ backgroundColor: colors.borderColor, marginHorizontal: 16 }}
            />

            <ScrollView
              style={{ paddingHorizontal: 16 }}
              contentContainerStyle={{ paddingBottom: 24, paddingTop: 12 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <StepFieldLabel
                step={1}
                label={t("servicePackage.packageNameLabel")}
                colors={colors}
              />
              <TextInput
                value={packageName}
                onChangeText={setPackageName}
                onBlur={() => setTouched(true)}
                mode="outlined"
                placeholder={t("servicePackage.packageNamePlaceholder")}
                placeholderTextColor="#9ca3af"
                maxLength={100}
                error={!!errors.packageName}
                style={{ backgroundColor: colors.inputBg ?? colors.cardBg }}
                outlineColor={errors.packageName ? "#ef4444" : colors.borderColor}
                activeOutlineColor={ACCENT}
                textColor={colors.sectionHeaderText}
              />
              {errors.packageName && (
                <HelperText type="error" visible>
                  {errors.packageName}
                </HelperText>
              )}

              <View style={{ marginTop: 8 }}>
                <StepFieldLabel
                  step={2}
                  label={`${t("servicePackage.totalPriceLabel")} (₺)`}
                  colors={colors}
                />
              </View>
              <TextInput
                value={totalPrice}
                onChangeText={setTotalPrice}
                onBlur={() => setTouched(true)}
                mode="outlined"
                placeholder={t("servicePackage.pricePlaceholder")}
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
                error={!!errors.totalPrice}
                style={{ backgroundColor: colors.inputBg ?? colors.cardBg }}
                outlineColor={errors.totalPrice ? "#ef4444" : colors.borderColor}
                activeOutlineColor={ACCENT}
                textColor={colors.sectionHeaderText}
                left={<TextInput.Affix text="₺" />}
              />
              {errors.totalPrice && (
                <HelperText type="error" visible>
                  {errors.totalPrice}
                </HelperText>
              )}

              <View style={{ marginTop: 8 }}>
                <StepFieldLabel
                  step={3}
                  label={t("servicePackage.servicesPickLabel")}
                  colors={colors}
                />
              </View>
              <Text
                style={{
                  fontFamily: "CenturyGothic",
                  fontSize: 12,
                  color: colors.textTertiary,
                  marginBottom: 8,
                  lineHeight: 17,
                }}
              >
                {t("servicePackage.selectServicesHint")}
              </Text>
              {errors.serviceOfferingIds && (
                <HelperText type="error" visible>
                  {errors.serviceOfferingIds}
                </HelperText>
              )}
              {serviceOptions.length === 0 ? (
                <View
                  style={{
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.borderColor,
                    padding: 16,
                    alignItems: "center",
                  }}
                >
                  <Icon source="information-outline" size={24} color="#9ca3af" />
                  <Text style={{ color: "#9ca3af", marginTop: 6, fontSize: 13 }}>
                    {t("servicePackage.defineServicesFirst")}
                  </Text>
                </View>
              ) : (
                <View
                  style={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: errors.serviceOfferingIds
                      ? "#ef4444"
                      : colors.borderColor,
                    overflow: "hidden",
                  }}
                >
                  {serviceOptions.map((s, i) => {
                    const checked = selectedServiceIds.includes(s.id);
                    return (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => toggleService(s.id)}
                        activeOpacity={0.7}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                          borderTopWidth: i > 0 ? 1 : 0,
                          borderTopColor: colors.borderColor,
                          backgroundColor: checked
                            ? isDark
                              ? "rgba(194, 165, 35, 0.1)"
                              : "rgba(194, 165, 35, 0.06)"
                            : "transparent",
                        }}
                      >
                        <Checkbox
                          status={checked ? "checked" : "unchecked"}
                          color={ACCENT}
                          uncheckedColor={colors.borderColor}
                        />
                        <Text
                          style={{
                            flex: 1,
                            marginLeft: 10,
                            fontSize: 14,
                            color: checked
                              ? colors.sectionHeaderText
                              : colors.textTertiary ?? "#9ca3af",
                            fontFamily: checked
                              ? "CenturyGothic-Bold"
                              : "CenturyGothic",
                          }}
                        >
                          {s.label}
                        </Text>
                        {checked && (
                          <Icon
                            source="check-circle"
                            size={18}
                            color={ACCENT}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSave}
                activeOpacity={0.85}
                style={{
                  marginTop: 20,
                  borderRadius: 12,
                  backgroundColor: ACCENT,
                  paddingVertical: 14,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Icon
                  source={isEditing ? "content-save-edit" : "plus-circle"}
                  size={20}
                  color="#fff"
                />
                <Text
                  style={{
                    color: "#fff",
                    fontFamily: "CenturyGothic-Bold",
                    fontSize: 15,
                  }}
                >
                  {isEditing
                    ? t("servicePackage.save")
                    : t("servicePackage.add")}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ----- Main ServicePackageStep -----
export const ServicePackageStep: React.FC<ServicePackageStepProps> = ({
  packages,
  serviceOptions,
  onPackagesChange,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPkg, setEditingPkg] = useState<PackageFormItem | null>(null);

  const openAddModal = () => {
    if (packages.length >= MAX_PACKAGES) return;
    setEditingPkg(null);
    setModalVisible(true);
  };

  const openEditModal = useCallback((pkg: PackageFormItem) => {
    setEditingPkg(pkg);
    setModalVisible(true);
  }, []);

  const handleDelete = useCallback(
    (localId: string) => {
      onPackagesChange(packages.filter((p) => p.localId !== localId));
    },
    [packages, onPackagesChange],
  );

  const handleSave = useCallback(
    (saved: PackageFormItem) => {
      if (!editingPkg) {
        // Yeni paket
        onPackagesChange([
          ...packages,
          { ...saved, localId: saved.localId || uuid() },
        ]);
      } else {
        // Güncelleme
        onPackagesChange(
          packages.map((p) =>
            p.localId === editingPkg.localId ? { ...saved } : p,
          ),
        );
      }
      setModalVisible(false);
    },
    [editingPkg, packages, onPackagesChange],
  );

  const limitReached = packages.length >= MAX_PACKAGES;

  return (
    <View style={{ paddingHorizontal: 2 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: isDark
              ? "rgba(194, 165, 35, 0.14)"
              : "rgba(194, 165, 35, 0.1)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Icon source="tag-multiple-outline" size={22} color={ACCENT} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: "CenturyGothic-Bold",
              fontSize: 17,
              color: colors.sectionHeaderText,
            }}
          >
            {t("servicePackage.title")}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: colors.textTertiary,
              marginTop: 3,
              lineHeight: 17,
            }}
          >
            {t("servicePackage.sectionSubtitle")}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: colors.textSecondary,
              marginTop: 4,
            }}
          >
            {t("servicePackage.packageCount", {
              current: packages.length,
              max: MAX_PACKAGES,
            })}
          </Text>
        </View>
      </View>

      {/* Info */}
      <View
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.borderColor,
          backgroundColor: isDark
            ? "rgba(194, 165, 35, 0.07)"
            : "rgba(194, 165, 35, 0.06)",
          padding: 14,
          marginBottom: 16,
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: isDark
              ? "rgba(194, 165, 35, 0.2)"
              : "rgba(194, 165, 35, 0.18)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon source="lightbulb-on-outline" size={22} color={ACCENT} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: "CenturyGothic-Bold",
              fontSize: 13,
              color: colors.sectionHeaderText,
              marginBottom: 4,
            }}
          >
            {t("servicePackage.infoTitle")}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: colors.textSecondary,
              lineHeight: 18,
            }}
          >
            {t("servicePackage.stepHint")}
          </Text>
        </View>
      </View>

      {/* Packages List */}
      {packages.map((pkg, index) => (
        <PackageCard
          key={pkg.localId || pkg.id || `pkg-${index}`}
          pkg={pkg}
          index={index}
          serviceOptions={serviceOptions}
          onEdit={openEditModal}
          onDelete={handleDelete}
          colors={colors}
          isDark={isDark}
          t={t}
        />
      ))}

      {/* Empty State */}
      {packages.length === 0 && (
        <View
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: colors.borderColor,
            padding: 32,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Icon source="tag-multiple-outline" size={44} color="#9ca3af" />
          <Text
            style={{
              color: "#9ca3af",
              marginTop: 12,
              fontSize: 14,
              textAlign: "center",
            }}
          >
            {t("servicePackage.emptyState")}
          </Text>
        </View>
      )}

      {/* Limit Warning */}
      {limitReached && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: isDark
              ? "rgba(239, 68, 68, 0.1)"
              : "rgba(239, 68, 68, 0.06)",
            borderRadius: 10,
            padding: 10,
            marginBottom: 10,
            gap: 8,
          }}
        >
          <Icon source="alert-circle-outline" size={18} color="#ef4444" />
          <Text style={{ flex: 1, fontSize: 12, color: "#ef4444" }}>
            {t("servicePackage.limitWarning", { max: MAX_PACKAGES })}
          </Text>
        </View>
      )}

      {/* Add Button */}
      {!limitReached && (
        <TouchableOpacity
          onPress={openAddModal}
          activeOpacity={0.85}
          style={{
            borderRadius: 12,
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: ACCENT,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Icon source="plus-circle-outline" size={22} color={ACCENT} />
          <Text
            style={{
              color: ACCENT,
              fontFamily: "CenturyGothic-Bold",
              fontSize: 14,
            }}
          >
            {t("servicePackage.addNew")}
          </Text>
        </TouchableOpacity>
      )}

      {/* Modal */}
      <PackageFormModal
        visible={modalVisible}
        editingPkg={editingPkg}
        serviceOptions={serviceOptions}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
        colors={colors}
        isDark={isDark}
        t={t}
      />
    </View>
  );
};

export default ServicePackageStep;
