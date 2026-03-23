import {
  ActivityIndicator,
  Animated,
  Image,
  ScrollView,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { Text } from "../common/Text";
import React, { useEffect, useMemo, useState, useRef } from "react";
import { z } from "zod";
import {
  DAYS_TR,
  PRICING_OPTIONS,
  trMoneyRegex,
} from "../../constants";
import { parseTR } from "../../utils/form/money-helper";
import {
  fmtHHmm,
  fromHHmm,
  HOLIDAY_OPTIONS,
  normalizeTime,
  timeHHmmRegex,
  toMinutes,
} from "../../utils/time/time-helper";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Avatar,
  Divider,
  HelperText,
  Icon,
  IconButton,
  TextInput,
} from "react-native-paper";
import { Button } from "../common/Button";
import { Dropdown } from "react-native-element-dropdown";
import { CategoryListSelect } from "../common/CategoryListSelect";
import { useCanPerformAction } from "../../hook/useCanPerformAction";
import {
  useDeleteImageMutation,
  useDeleteManuelBarberMutation,
  useDeleteStoreChairMutation,
  useLazyGetStoreByIdQuery,
  useUpdateBarberStoreMutation,
  useUploadMultipleImagesMutation,
  useUploadImageMutation,
  useUpdateImageBlobMutation,
} from "../../store/api";
import { useCategoryHierarchy } from "../../hook/useCategoryHierarchy";
import { CrudSkeletonComponent } from "../common/crudskeleton";
import {
  pickImageAndSet,
  handlePickMultipleImages,
  handlePickImage,
  truncateFileName,
} from "../../utils/form/pick-document";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MapPicker } from "../common/mappicker";
import { createStoreLocationHelpers } from "../../utils/store/store-location-helper";
import { getCurrentLocationSafe } from "../../utils/location/location-helper";
import { BarberEditModal } from "./barbereditmodal";
import {
  BarberFormValues,
  BarberStoreUpdateDto,
  ChairFormInitial,
  ImageOwnerType,
  ServiceOfferingUpdateDto,
} from "../../types";
import { getErrorMessage } from "../../utils/errorHandler";
import { MESSAGES } from "../../constants/messages";
import { ChairEditModal } from "./chaireditmodal";
import { safeCoord } from "../../utils/location/geo";
import { useAppDispatch } from "../../store/hook";
import { showSnack } from "../../store/snackbarSlice";
import { ChairItem } from "./ChairItem";
import { ManuelBarberItem } from "./ManuelBarberItem";
import { useOptimizedChairOptions } from "../../hooks/useOptimizedFieldArray";
import {
  mapBarberType,
  mapPricingType,
  mapTypeToDisplayName,
} from "../../utils/form/form-mappers";
import { useAuth } from "../../hook/useAuth";
import { useLanguage } from "../../hook/useLanguage";
import { useAlert } from "../../hook/useAlert";
import { StepFormIndicator } from "../common/StepFormIndicator";
import { useTheme } from "../../hook/useTheme";

const createChairPricingSchema = (t: (key: string) => string) =>
  z
    .object({
      mode: z.enum(["rent", "percent"]),
      rent: z.string().optional().nullable(),
      percent: z.coerce.number().optional().nullable(),
    })
    .superRefine((val, ctx) => {
      if (val.mode === "rent") {
        if (!val.rent || val.rent.trim() === "") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["rent"],
            message: t("form.rentPriceRequired"),
          });
          return;
        }
        if (!trMoneyRegex.test(val.rent)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["rent"],
            message: t("form.priceFormatInvalid"),
          });
          return;
        }
        const n = parseTR(val.rent);
        if (n == undefined || n <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["rent"],
            message: t("form.rentPricePositive"),
          });
        }
      } else if (val.mode === "percent") {
        if (val.percent == null || val.percent === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["percent"],
            message: t("form.percentRequired"),
          });
          return;
        }
        if (!Number.isInteger(val.percent)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["percent"],
            message: t("form.percentInteger"),
          });
          return;
        }
        if (val.percent < 10) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["percent"],
            message: t("form.percentMin"),
          });
          return;
        }
        if (val.percent > 90) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["percent"],
            message: t("form.percentMax"),
          });
          return;
        }
        if (val.percent % 10 !== 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["percent"],
            message: t("form.percentMultipleOf10"),
          });
        }
      }
    });

const createBarberSchema = (t: (key: string) => string) =>
  z.object({
    id: z.string().uuid(),
    name: z.string().trim().min(1, t("form.barberNameRequired")),
    avatar: z
      .object({
        uri: z.string(),
        name: z.string(),
        type: z.string().optional(),
      })
      .nullable()
      .optional(),
  });

const createLocationSchema = (t: (key: string) => string) =>
  z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      addressDescription: z.string().optional().default(""),
    })
    .superRefine((v, ctx) => {
      if (v.latitude == null || v.longitude == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["latitude"],
          message: t("form.locationRequired"),
        });
        return;
      }
    });

const createWorkingDaySchema = (t: (key: string) => string) =>
  z
    .object({
      id: z.string().uuid().optional(),
      ownerId: z.string().uuid().optional(),
      dayOfWeek: z.number().int().min(0).max(6),
      isClosed: z.boolean(),
      startTime: z.string().regex(timeHHmmRegex, "HH:mm"),
      endTime: z.string().regex(timeHHmmRegex, "HH:mm"),
    })
    .superRefine((v, ctx) => {
      if (v.isClosed) return;
      if (!v.startTime) {
        ctx.addIssue({
          code: "custom",
          path: ["startTime"],
          message: t("form.startTimeRequired"),
        });
        return;
      }
      if (!v.endTime) {
        ctx.addIssue({
          code: "custom",
          path: ["endTime"],
          message: t("form.endTimeRequired"),
        });
        return;
      }
      // 00:00 kontrolü kaldırıldı - artık 00:00 seçilebilir
      const s = toMinutes(v.startTime);
      const e = toMinutes(v.endTime);
      if (s >= e) {
        ctx.addIssue({
          code: "custom",
          path: ["endTime"],
          message: t("form.endTimeGreater"),
        });
        return;
      }
      // Minimum ve maksimum saat kontrolleri kaldırıldı
    });

const createChairSchema = (t: (key: string) => string) =>
  z
    .object({
      id: z.string().uuid(),
      name: z.string().trim().optional(),
      barberId: z.string().uuid().optional(),
    })
    .superRefine((v, ctx) => {
      if (!v.name && !v.barberId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["name"],
          message: t("form.chairNameOrBarberRequired"),
        });
      }
      if (v.name && v.barberId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["barberId"],
          message: t("form.chairNameOrBarberExclusive"),
        });
      }
    });

const ImageAssetSchema = z.object({
  uri: z.string().min(1),
  name: z.string().min(1),
  type: z.string().optional(),
});

const createTaxDocumentImageField = (t: (key: string) => string) =>
  z
    .custom<{
      uri: string;
      name: string;
      type?: string;
    }>(
      (v) =>
        !!v && typeof v === "object" && "uri" in (v as any) && (v as any).uri,
      { message: t("form.taxDocumentRequired") },
    )
    .pipe(ImageAssetSchema);

const createSchema = (t: (key: string) => string) =>
  z
    .object({
      storeImages: z
        .array(
          z.object({
            id: z.string().uuid().optional(),
            uri: z.string().min(1),
            name: z.string().min(1),
            type: z.string().min(1),
          }),
        )
        .max(3, t("form.maxImages"))
        .optional(),
      storeName: z
        .string({ required_error: t("form.storeNameRequired") })
        .trim(),
      type: z.string({ required_error: t("form.storeTypeRequired") }),
      // Ana başlıklar (seçilen main kategorilere göre)
      selectedMainHeadings: z.array(z.string()).optional(),
      // Alt başlıklar (seçilen ana başlıklara göre)
      selectedSubHeadings: z.array(z.string()).optional(),
      // Hizmetler (seçilen alt başlıklara göre) - final seçim
      selectedCategories: z
        .array(z.string())
        .min(1, t("form.atLeastOneService")),
      prices: z.record(
        z.string(),
        z
          .string()
          .refine(
            (val) => {
              if (!val || val === "") return false; // Boş olamaz
              const num = parseFloat(val.replace(/\./g, "").replace(",", "."));
              return !isNaN(num) && num >= 0; // 0 veya daha büyük olmalı
            },
            { message: t("form.priceCannotBeNegative") },
          ),
      ),
      pricingType: createChairPricingSchema(t),
      workingHours: z
        .array(createWorkingDaySchema(t))
        .length(7, t("form.sevenDaysRequired")),
      holidayDays: z.array(z.number().int().min(0).max(6)).default([]),
      location: createLocationSchema(t),
      taxDocumentImage: createTaxDocumentImageField(t),
      barbers: z.array(createBarberSchema(t)).default([]),
      chairs: z
        .array(createChairSchema(t))
        .min(1, t("form.minChairs"))
        .default([]),
    })
    .superRefine((data, ctx) => {
      // Ana başlıklar seçilip alt başlıklar seçilmezse hata ver
      if (data.selectedMainHeadings && data.selectedMainHeadings.length > 0) {
        if (!data.selectedSubHeadings || data.selectedSubHeadings.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("form.subHeadingsRequired"),
            path: ["selectedSubHeadings"],
          });
        }
      }

      const barbers = (data.barbers ?? []) as Array<
        z.infer<ReturnType<typeof createBarberSchema>>
      >;
      const chairs = (data.chairs ?? []) as Array<
        z.infer<ReturnType<typeof createChairSchema>>
      >;
      const validBarbersCount = barbers.filter((b) => !!b.name?.trim()).length;
      if (validBarbersCount > 30) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["barbers"],
          message: t("form.maxBarbers").replace(
            "{{count}}",
            validBarbersCount.toString(),
          ),
        });
      }
      const validChairsCount = chairs.length;
      if (validChairsCount > 30) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["chairs"],
          message: t("form.maxChairs").replace(
            "{{count}}",
            validChairsCount.toString(),
          ),
        });
      }
    });

export type FormUpdateValues = z.input<ReturnType<typeof createSchema>>;

const PreviewRow = ({ label, value, colors }: { label: string; value: string; colors: any }) => (
  <View className="py-1.5" style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor }}>
    <Text className="text-gray-400 text-sm mb-0.5">{label}</Text>
    <Text className="text-sm" style={{ color: colors.sectionHeaderText }}>{value || "—"}</Text>
  </View>
);

const PreviewRowList = ({ label, items, colors }: { label: string; items: string[]; colors: any }) => {
  const unique = React.useMemo(() => Array.from(new Set(items)), [items]);
  if (unique.length === 0) return null;
  return (
    <View className="py-1.5" style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor }}>
      <Text className="text-gray-400 text-sm mb-1">{label}</Text>
      {unique.map((item, i) => (
        <Text key={`${item}-${i}`} className="text-sm py-0.5" style={{ color: colors.sectionHeaderText }}>{item}</Text>
      ))}
    </View>
  );
};

// MultiSelect stil objeleri - colors gerektirmeyen sabit değerler dışarıda tutulur
const MULTI_SELECT_STYLE_ERROR_BORDER = { borderColor: "#b00020" } as const;
const MULTI_SELECT_SELECTED_STYLE = {
  borderRadius: 10,
  backgroundColor: "#374151",
  borderColor: "#ffb900",
  paddingHorizontal: 10,
  paddingVertical: 6,
  margin: 0,
};
const MULTI_SELECT_SELECTED_TEXT_PROPS = { numberOfLines: 1 };
const MULTI_SELECT_FLAT_LIST_PROPS = {
  initialNumToRender: 10,
  maxToRenderPerBatch: 10,
  windowSize: 5,
};
const MULTI_SELECT_FLAT_LIST_PROPS_LARGE = {
  initialNumToRender: 15,
  maxToRenderPerBatch: 15,
  windowSize: 10,
  removeClippedSubviews: true,
  updateCellsBatchingPeriod: 50,
};

const PRICE_INPUT_BASE_STYLE = {
  borderWidth: 0,
  marginTop: 20,
  height: 35,
};

const FormStoreUpdate = React.memo(({
  storeId,
  enabled,
  onClose,
  error: externalError,
  locationStatus,
}: {
  storeId: string;
  enabled: boolean;
  onClose?: () => void;
  error?: any; // API error durumu
  locationStatus?: "unknown" | "granted" | "denied"; // Location status
}) => {
  const { userId } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const { confirm } = useAlert();
  const { colors } = useTheme();

  // MultiSelect style objects - depend on colors so defined inside component
  const MULTI_SELECT_STYLE = useMemo(() => ({
    backgroundColor: colors.cardBg,
    borderColor: colors.borderColor,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  }), [colors]);

  const MULTI_SELECT_STYLE_ERROR = useMemo(() => ({
    ...MULTI_SELECT_STYLE,
    ...MULTI_SELECT_STYLE_ERROR_BORDER,
  }), [MULTI_SELECT_STYLE]);

  const MULTI_SELECT_CONTAINER_STYLE = useMemo(() => ({
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: 10,
    overflow: "hidden" as const,
  }), [colors]);

  const MULTI_SELECT_INPUT_SEARCH_STYLE = useMemo(() => ({
    backgroundColor: colors.cardBg,
    borderColor: "#ffb900",
    borderWidth: 1,
    borderRadius: 8,
    color: colors.sectionHeaderText,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: 'CenturyGothic',
  }), [colors]);

  const MULTI_SELECT_PLACEHOLDER_STYLE = useMemo(() => ({ color: colors.textSecondary, fontFamily: 'CenturyGothic' }), [colors]);
  const MULTI_SELECT_SELECTED_TEXT_STYLE = useMemo(() => ({ color: colors.sectionHeaderText, fontFamily: 'CenturyGothic' }), [colors]);
  const MULTI_SELECT_ITEM_TEXT_STYLE = useMemo(() => ({ color: colors.sectionHeaderText, fontFamily: 'CenturyGothic' }), [colors]);

  const PRICE_INPUT_STYLE = useMemo(() => ({
    ...PRICE_INPUT_BASE_STYLE,
    backgroundColor: colors.cardBg,
  }), [colors]);

  const PRICE_INPUT_THEME = useMemo(() => ({
    roundness: 10,
    colors: {
      onSurfaceVariant: colors.textSecondary,
      primary: colors.sectionHeaderText,
    },
  }), [colors]);

  const schema = useMemo(() => createSchema(t), [t, currentLanguage]);
  const resolver = useMemo(() => zodResolver(schema), [schema]);
  const [triggerGetStore, { data, isLoading, isError, error }] =
    useLazyGetStoreByIdQuery();
  const [updateStore, { isLoading: updateLoading, isSuccess }] =
    useUpdateBarberStoreMutation();
  const [uploadMultipleImages] = useUploadMultipleImagesMutation();
  const [uploadImage] = useUploadImageMutation();
  const [deleteImage] = useDeleteImageMutation();
  const [updateImageBlob] = useUpdateImageBlobMutation();
  const [isImagePickerLoading, setIsImagePickerLoading] = React.useState(false);
  const [isTaxDocumentLoading, setIsTaxDocumentLoading] = React.useState(false);
  const [loadedStoreImages, setLoadedStoreImages] = React.useState<Set<number>>(
    new Set(),
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [completedSteps, setCompletedSteps] = React.useState<Set<number>>(new Set());
  const stepSlideAnim = React.useRef(new Animated.Value(0)).current;
  const prevStepRef = React.useRef(0);

  const stepLabels = React.useMemo(() => [
    t("form.stepStoreInfo"),
    t("form.stepMainHeadings"),
    t("form.stepSubHeadings"),
    t("form.stepStoreServices"),
    t("form.stepStorePrices"),
    t("form.stepStoreStaff"),
    t("form.stepStorePricing"),
    t("form.stepStoreHours"),
    t("form.stepStoreAddress"),
    t("form.stepPreview"),
  ], [t, currentLanguage]);

  const steps = React.useMemo(
    () => stepLabels.map((label, i) => ({ id: `step-${i}`, label })),
    [stepLabels],
  );
  const totalSteps = stepLabels.length;

  const stepFields: Record<number, (keyof FormUpdateValues)[]> = React.useMemo(() => ({
    0: ["storeImages", "taxDocumentImage", "storeName", "type"],
    1: ["selectedMainHeadings"],
    2: ["selectedSubHeadings"],
    3: ["selectedCategories"],
    4: ["prices"],
    5: ["barbers", "chairs"],
    6: ["pricingType"],
    7: ["workingHours", "holidayDays"],
    8: ["location"],
    9: [],
  }), []);

  const {
    control,
    handleSubmit,
    trigger,
    setValue,
    getValues,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormUpdateValues>({
    resolver,
    shouldFocusError: true,
    mode: "onSubmit",
    defaultValues: { storeName: data?.storeName },
  });

  const validateStep = React.useCallback(async (stepIndex: number): Promise<boolean> => {
    const fields = stepFields[stepIndex];
    if (!fields) return true;
    return trigger(fields as any);
  }, [trigger, stepFields]);

  const handleNextStep = React.useCallback(async () => {
    const valid = await validateStep(currentStep);
    if (!valid) return;
    setCompletedSteps((prev) => new Set(prev).add(currentStep));
    if (currentStep < totalSteps - 1) setCurrentStep((s) => s + 1);
  }, [currentStep, totalSteps, validateStep]);

  const handlePrevStep = React.useCallback(() => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCompletedSteps((prev) => {
        const next = new Set(prev);
        next.delete(prevStep);
        return next;
      });
      setCurrentStep(prevStep);
    }
  }, [currentStep]);

  useEffect(() => {
    if (prevStepRef.current === currentStep) {
      stepSlideAnim.setValue(0);
      return;
    }
    const width = Dimensions.get("window").width;
    const isForward = currentStep > prevStepRef.current;
    stepSlideAnim.setValue(isForward ? width : -width);
    Animated.timing(stepSlideAnim, {
      toValue: 0,
      duration: 260,
      useNativeDriver: true,
    }).start(() => {
      prevStepRef.current = currentStep;
    });
  }, [currentStep, stepSlideAnim]);

  const handleStepPress = React.useCallback((index: number) => {
    setCurrentStep(index);
  }, []);

  useEffect(() => {
    if (enabled && storeId) {
      triggerGetStore(storeId);
    }
    // enabled false olduğunda veya storeId değiştiğinde data'yı temizle
    if (!enabled) {
      // Form'u reset et
      reset();
      setCurrentStep(0);
      setCompletedSteps(new Set());
    }
  }, [enabled, storeId, triggerGetStore, reset]);

  const dispatch = useAppDispatch();

  // Error handling moved to try-catch in onSubmit to avoid duplicate snackbars

  const pickMultipleImages = async () => {
    setIsImagePickerLoading(true);
    try {
      const files = await handlePickMultipleImages(3);
      if (files && files.length > 0) {
        const currentImages = getValues("storeImages") || [];
        const newImages = [...currentImages, ...files].slice(0, 3);
        setValue("storeImages", newImages, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    } finally {
      setIsImagePickerLoading(false);
    }
  };

  const removeImage = (index: number) => {
    const currentImages = getValues("storeImages") || [];
    const newImages = currentImages.filter((_, i) => i !== index);
    setValue("storeImages", newImages, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };
  const [barberModalVisible, setBarberModalVisible] = useState(false);
  const [chairModalVisible, setChairModalVisible] = useState(false);

  const [barberModalTitle, setBarberModalTitle] = useState(t("form.addBarber"));
  const [chairModalTitle, setChairModalTitle] = useState(t("form.addChair"));

  const [barberInitialValues, setBarberInitialValues] = useState<
    Partial<BarberFormValues>
  >({});
  const [chairInitialValues, setChairInitialValues] = useState<
    Partial<ChairFormInitial>
  >({});
  const [chairAvailableBarbers, setChairAvailableBarbers] = useState<
    { id: string; name: string }[]
  >([]);

  const [deleteBarber, { isLoading: isDeleting }] =
    useDeleteManuelBarberMutation();
  const [deleteChair, { isLoading: isDeletingChair }] =
    useDeleteStoreChairMutation();

  const getAvailableBarbersForChair = (chairIndex: number) => {
    const currentChair = chairs[chairIndex];
    if (!currentChair) return [];

    const assignedBarberId = currentChair.barberId ?? null;

    return barbers
      .map((b) => ({ id: b.id, name: b.name }))
      .filter((b) => {
        const usedInAnotherChair = chairs.some(
          (c, i) => i !== chairIndex && c.barberId === b.id,
        );

        if (assignedBarberId && b.id === assignedBarberId) return true;
        return !usedInAnotherChair;
      });
  };
  const getAvailableBarbersForNewChair = () => {
    return barbers
      .filter((b) => {
        const isUsed = chairs.some((c) => c.barberId === b.id);
        return !isUsed;
      })
      .map((b) => ({
        id: b.id,
        name: b.name,
      }));
  };

  // Dil değiştiğinde validation'ı tetikle
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      trigger();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage]);

  useEffect(() => {
    if (!data) return;
    const imageListData = data.imageList ?? [];
    const initialImages = imageListData.map((img: any) => ({
      id: img.id, // Mevcut resimlerin ID'sini tut
      uri: img.imageUrl,
      name: img.imageUrl.split("/").pop() ?? `image-${img.id}.jpg`,
      type: img.imageUrl.toLowerCase().endsWith(".png")
        ? "image/png"
        : "image/jpeg",
    }));

    // Backend'den gelen serviceName aslında category name
    // Bunu ID'ye çevirmek için child kategoriler yüklenene kadar name olarak tutacağız
    const initialCategories = (data.serviceOfferings ?? []).map(
      (s) => s.serviceName,
    );
    const initialPrices = (data.serviceOfferings ?? []).reduce(
      (acc, s) => {
        acc[s.serviceName] = String(s.price);
        return acc;
      },
      {} as Record<string, string>,
    );
    const initialBarbers = (data.manuelBarbers ?? []).map((m) => ({
      id: m.id,
      name: m.fullName ?? "",
      avatar: m.profileImageUrl
        ? {
          uri: m.profileImageUrl,
          name: m.profileImageUrl.split("/").pop() ?? `barber-${m.id}.jpg`,
          type: "image/jpeg",
        }
        : null,
    }));
    const initialChairs = (data.barberStoreChairs ?? []).map((c) => ({
      id: c.id,
      name: c.name ?? undefined,
      barberId: c.manualBarberId ?? undefined,
    }));
    const initialPricing: FormUpdateValues["pricingType"] =
      data.pricingType?.toLowerCase() === "rent"
        ? {
          mode: "rent",
          rent: new Intl.NumberFormat("tr-TR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          }).format(data.pricingValue ?? 0),
          percent: undefined,
        }
        : {
          mode: "percent",
          percent: data.pricingValue ?? undefined,
          rent: undefined,
        };

    const initialWorkingHours: FormUpdateValues["workingHours"] = Array.from(
      { length: 7 },
      (_, day) => {
        const w = data.workingHours?.find((x) => x.dayOfWeek === day);
        if (!w) {
          return {
            id: undefined,
            ownerId: undefined,
            dayOfWeek: day,
            isClosed: true,
            startTime: "09:00",
            endTime: "18:00",
          };
        }
        return {
          id: w.id,
          ownerId: w.ownerId,
          dayOfWeek: w.dayOfWeek,
          isClosed: w.isClosed,
          startTime: normalizeTime(w.startTime as any),
          endTime: normalizeTime(w.endTime as any),
        };
      },
    );
    const initialHolidayDays = initialWorkingHours
      .filter((w) => w.isClosed)
      .map((w) => w.dayOfWeek);
    const c0 = safeCoord(data.latitude, data.longitude);

    reset({
      storeName: data.storeName ?? "",
      // BarberStoreDetail.type backend'den string gelebilir (örn: "MaleHairdresser")
      type: mapTypeToDisplayName(data.type as any),
      storeImages: initialImages.length > 0 ? initialImages : undefined,
      taxDocumentImage: data.taxDocumentImage
        ? {
          uri: data.taxDocumentImage.imageUrl,
          name:
            data.taxDocumentImage.imageUrl.split("/").pop() ??
            "tax-document.jpg",
          type: "image/jpeg",
        }
        : undefined,
      location: {
        latitude: c0?.lat ?? 0,
        longitude: c0?.lon ?? 0,
        addressDescription: data.addressDescription ?? "",
      },
      selectedCategories: initialCategories,
      prices: initialPrices,
      barbers: initialBarbers,
      chairs: initialChairs,
      pricingType: initialPricing,
      holidayDays: initialHolidayDays,
      workingHours: initialWorkingHours,
      selectedMainHeadings: [],
      selectedSubHeadings: [],
    });
    // Hook otomatik olarak services'ı günceller
  }, [data, reset]);

  const location = watch("location");
  const address = location?.addressDescription;
  const images = watch("storeImages");
  const barbers = watch("barbers") ?? [];
  const chairs = watch("chairs") ?? [];
  const pricingMode = watch("pricingType.mode");

  // Memoized barber lookup map to avoid O(n²) operations
  const barberMap = useMemo(() => {
    const map = new Map<string, string>();
    barbers.forEach((b) => {
      if (b.id && b.name) {
        map.set(b.id, b.name);
      }
    });
    return map;
  }, [barbers]);
  const taxDocErrorText =
    (errors.taxDocumentImage as any)?.message ||
    (errors.taxDocumentImage as any)?.name?.message ||
    (errors.taxDocumentImage as any)?.uri?.message;
  const barberErrorText = React.useMemo(() => {
    if (!errors.barbers) return "";
    const msgs: string[] = [];
    barbers.forEach((_, idx) => {
      const m = errors.barbers?.[idx]?.name?.message as string | undefined;
      if (m) msgs.push(`• ${idx + 1}. berber: ${m}`);
    });
    return msgs.join("\n");
  }, [errors.barbers, barbers]);
  const chairsErrorText = React.useMemo(() => {
    if (!errors.chairs) return "";
    const msgs: string[] = [];
    chairs.forEach((_, idx) => {
      const m1 = errors.chairs?.[idx]?.name?.message as string | undefined;
      const m2 = errors.chairs?.[idx]?.barberId?.message as string | undefined;
      if (m1 || m2) msgs.push(`• ${idx + 1}. koltuk: ${m1 ?? m2}`);
    });
    return msgs.join("\n");
  }, [errors.chairs, chairs]);

  const {
    fields: chairFields,
    append: addChair,
    remove: removeChair,
    update: updateChair,
  } = useFieldArray({
    control,
    name: "chairs",
    keyName: "_key",
  });
  const {
    fields: barberFields,
    append: addBarber,
    remove: removeBarber,
  } = useFieldArray({
    control,
    name: "barbers",
    keyName: "_key",
  });

  const working = watch("workingHours") ?? [];
  const holidayDays = watch("holidayDays") ?? [];
  const [activeDay, setActiveDay] = useState<number>(0);
  const [activeStart, setActiveStart] = useState<Date>(() =>
    fromHHmm(working[0]?.startTime ?? "09:00"),
  );
  const [activeEnd, setActiveEnd] = useState<Date>(() =>
    fromHHmm(working[0]?.endTime ?? "18:00"),
  );
  const selectedType = watch("type");
  const selectedMainHeadings = watch("selectedMainHeadings") ?? [];
  const selectedSubHeadings = watch("selectedSubHeadings") ?? [];
  const selectedCategories = watch("selectedCategories") ?? [];
  const effectiveType = selectedType || (data?.type ?? undefined);

  // Kategori hiyerarşisi - tek API çağrısı ile tüm kategoriler
  const {
    parentCategories,
    mainHeadings,
    subHeadings,
    services,
    findParentHierarchyFromServices,
    isLoading: isCategoryLoading,
  } = useCategoryHierarchy({
    selectedType: effectiveType,
    selectedMainHeadings,
    selectedSubHeadings,
  });

  // Data yüklendiğinde mevcut hizmetlerden geriye doğru ana başlık ve alt başlık bul
  const initialDataLoadedRef = useRef(false);
  React.useEffect(() => {
    if (!data || isCategoryLoading) return;
    if (parentCategories.length === 0) return;

    const initialCategories = (data.serviceOfferings ?? []).map(
      (s) => s.serviceName,
    );
    if (initialCategories.length === 0) return;

    const dataTypeName = data?.type != null ? mapTypeToDisplayName(data.type as any) : undefined;
    if (!dataTypeName) return;

    // Hizmet isimlerinden geriye doğru ana başlık ve alt başlık bul
    const { mainHeadings: foundMainHeadings, subHeadings: foundSubHeadings } =
      findParentHierarchyFromServices(initialCategories, dataTypeName);

    // Hiyerarşi henüz eşleşmedi ise tekrar dene (kategoriler henüz yüklenmemiş olabilir)
    if (foundMainHeadings.length === 0 && foundSubHeadings.length === 0) return;

    // Zaten yüklendiyse tekrar çalıştırma
    if (initialDataLoadedRef.current) return;

    // Seçili hizmetleri ve hiyerarşiyi set et
    setValue("selectedCategories", initialCategories, {
      shouldDirty: false,
      shouldValidate: false,
    });

    if (foundMainHeadings.length > 0) {
      setValue("selectedMainHeadings", foundMainHeadings, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }

    if (foundSubHeadings.length > 0) {
      setValue("selectedSubHeadings", foundSubHeadings, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }

    initialDataLoadedRef.current = true;
  }, [data, parentCategories, isCategoryLoading, findParentHierarchyFromServices, setValue]);

  // Kategori seçenekleri - ana başlıklar
  const mainHeadingOptions = useMemo(
    () =>
      mainHeadings.map((cat: any) => ({
        label: cat.name,
        value: cat.name,
      })),
    [mainHeadings],
  );

  // Kategori seçenekleri - alt başlıklar
  const subHeadingOptions = useMemo(
    () =>
      subHeadings.map((cat: any) => ({
        label: cat.name,
        value: cat.name,
      })),
    [subHeadings],
  );

  // Kategori seçenekleri - hizmetler (final seçim)
  const categoryOptions = useMemo(
    // Form state'te selectedCategories + prices anahtarları serviceName (Category.Name) olarak tutulur.
    // Backend de ServiceOffering.ServiceName üzerinden çalıştığı için en stabil yaklaşım.
    () =>
      services.map((cat: any) => ({ label: cat.name, value: cat.name })),
    [services],
  );
  const categoryOptionsWithSelected = useMemo(() => {
    const base = [...categoryOptions];
    const seen = new Set(base.map((o) => o.value));
    (selectedCategories ?? []).forEach((v) => {
      if (!seen.has(v)) {
        base.push({ label: v, value: v });
        seen.add(v);
      }
    });
    return base;
  }, [categoryOptions, selectedCategories]);

  // Memoized category label lookup map to avoid O(n²) operations
  const categoryLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    categoryOptionsWithSelected.forEach((opt) => {
      map.set(opt.value, opt.label);
    });
    return map;
  }, [categoryOptionsWithSelected]);

  // Memoized category value set for O(1) validation
  const categoryValueSet = useMemo(
    () => new Set(categoryOptionsWithSelected.map((opt) => opt.value)),
    [categoryOptionsWithSelected],
  );

  // Memoized parent categories dropdown data
  const parentCategoriesDropdownData = useMemo(
    () =>
      parentCategories.map((cat: any) => ({
        label: cat.name,
        value: cat.name,
      })),
    [parentCategories],
  );

  // Memoized parent categories value set for validation
  const parentCategoriesValueSet = useMemo(
    () => new Set(parentCategories.map((cat: any) => cat.name)),
    [parentCategories],
  );

  // FIX: Use working length instead of working array to avoid infinite loop
  const workingLengthRef = useRef<number>(0);
  const lastActiveDayRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const currentLength = working?.length || 0;
    const lengthChanged = currentLength !== workingLengthRef.current;
    const dayChanged = activeDay !== lastActiveDayRef.current;

    if (lengthChanged || dayChanged) {
      const idx = (working ?? []).findIndex((w) => w.dayOfWeek === activeDay);
      if (idx >= 0) {
        const row = working[idx];
        if (row) {
          setActiveStart(fromHHmm(row.startTime));
          setActiveEnd(fromHHmm(row.endTime));
        }
      }
    }
    workingLengthRef.current = currentLength;
    lastActiveDayRef.current = activeDay;
  }, [activeDay, working?.length]);

  const { updateLocation, reverseAndSetAddress } =
    createStoreLocationHelpers<FormUpdateValues>(setValue, getValues);
  const [locBusy, setLocBusy] = useState(false);
  const pickMyCurrentLocation = async () => {
    if (locBusy) return;
    setLocBusy(true);
    try {
      const res = await getCurrentLocationSafe();
      if (!res.ok) {
        dispatch(showSnack({ message: res.message, isError: true }));
        return;
      }

      updateLocation(res.lat, res.lon);
      await reverseAndSetAddress(res.lat, res.lon);
    } finally {
      setLocBusy(false);
    }
  };

  const openEditBarberModal = (index: number) => {
    const current = barbers[index];
    if (!current) return;
    setBarberModalTitle(t("form.updateBarber"));
    setBarberInitialValues({
      name: current.name,
      profileImage: current.avatar
        ? {
          uri: current.avatar.uri,
          name: current.avatar.name ?? "photo.jpg",
          type: current.avatar.type ?? "image/jpeg",
        }
        : undefined,
      id: current.id,
    });
    setBarberModalVisible(true);
  };
  const openEditChairModal = (index: number) => {
    const current = chairs[index];
    if (!current) return;
    const availableBarbers = getAvailableBarbersForChair(index);
    setChairModalTitle(t("form.updateChair"));
    setChairInitialValues({
      id: current.id,
      name: current.name ?? undefined,
      barberId: current.barberId ?? undefined,
    });
    setChairAvailableBarbers(availableBarbers);
    setChairModalVisible(true);
  };
  const closeBarberModal = async () => {
    setBarberModalVisible(false);
    // Modal kapandığında store data'sını yeniden yükle
    await triggerGetStore(storeId);
  };
  const closeChairModal = async () => {
    setChairModalVisible(false);
    setChairInitialValues({});
    setChairAvailableBarbers([]);
    // Modal kapandığında store data'sını yeniden yükle
    await triggerGetStore(storeId);
  };

  const openCreateBarberModal = () => {
    setBarberModalTitle(t("form.addBarber"));
    setBarberInitialValues({ name: "", profileImage: undefined, id: "" });
    setBarberModalVisible(true);
  };
  const openCreateChairModal = () => {
    const availableBarbers = getAvailableBarbersForNewChair();
    setChairModalTitle(t("form.addChair"));
    setChairInitialValues({
      name: undefined,
      id: undefined,
      barberId: undefined,
    });
    setChairAvailableBarbers(availableBarbers);
    setChairModalVisible(true);
  };
  const handleDeleteBarber = (index: number) => {
    const current = barbers[index];
    if (!current) return;
    confirm(
      t("form.deleteBarber"),
      t("form.deleteBarberConfirm", { name: current.name }),
      async () => {
        if (current.id) {
          const result = await deleteBarber(current.id);
          if ("error" in result) {
            dispatch(
              showSnack({
                message: getErrorMessage(result.error),
                isError: true,
              }),
            );
            return;
          }
          const res = result.data;
          dispatch(
            showSnack({
              message: res?.message || "",
              isError: !res?.success,
            }),
          );
          if (res?.success) {
            // Store data'sını yeniden yükle
            await triggerGetStore(storeId);
          }
        }
      },
      undefined,
      t("common.delete"),
      t("appointment.alerts.cancel"),
    );
  };
  const handleChair = (index: number) => {
    const current = chairs[index];
    if (!current) return;
    confirm(
      t("form.deleteChair"),
      t("form.deleteChairConfirm", { name: current.name }),
      async () => {
        if (current.id) {
          const result = await deleteChair(current.id);
          if ("error" in result) {
            dispatch(
              showSnack({
                message: getErrorMessage(result.error),
                isError: true,
              }),
            );
            return;
          }
          const res = result.data;
          dispatch(
            showSnack({
              message: res?.message || "",
              isError: !res?.success,
            }),
          );
          if (res?.success) {
            // Store data'sını yeniden yükle
            await triggerGetStore(storeId);
          }
        }
      },
      undefined,
      t("common.delete"),
      t("appointment.alerts.cancel"),
    );
  };

  // Type değişince alt seviyeleri reset et
  const prevTypeRef = React.useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevTypeRef.current === undefined) {
      prevTypeRef.current = selectedType;
      return;
    }
    if (
      selectedType &&
      prevTypeRef.current &&
      selectedType !== prevTypeRef.current
    ) {
      setValue("selectedMainHeadings", [], {
        shouldDirty: true,
        shouldValidate: false,
      });
      setValue("selectedSubHeadings", [], {
        shouldDirty: true,
        shouldValidate: false,
      });
      setValue("selectedCategories", [], {
        shouldDirty: true,
        shouldValidate: false,
      });
      setValue("prices", {}, { shouldDirty: true, shouldValidate: false });
    }
    prevTypeRef.current = selectedType;
  }, [selectedType, setValue]);

  // Ana başlıklar değişince alt seviyeleri reset et
  const prevMainHeadingsRef = useRef<string[]>([]);
  useEffect(() => {
    const prevKey = prevMainHeadingsRef.current.slice().sort().join(",");
    const currKey = selectedMainHeadings.slice().sort().join(",");

    if (prevKey !== currKey && prevMainHeadingsRef.current.length > 0) {
      setValue("selectedSubHeadings", [], {
        shouldDirty: true,
        shouldValidate: false,
      });
      setValue("selectedCategories", [], {
        shouldDirty: true,
        shouldValidate: false,
      });
      setValue("prices", {}, { shouldDirty: true, shouldValidate: false });
    }
    prevMainHeadingsRef.current = [...selectedMainHeadings];
  }, [selectedMainHeadings, setValue]);

  // Alt başlıklar değişince hizmetleri reset et
  const prevSubHeadingsRef = useRef<string[]>([]);
  useEffect(() => {
    const prevKey = prevSubHeadingsRef.current.slice().sort().join(",");
    const currKey = selectedSubHeadings.slice().sort().join(",");

    if (prevKey !== currKey && prevSubHeadingsRef.current.length > 0) {
      setValue("selectedCategories", [], {
        shouldDirty: true,
        shouldValidate: false,
      });
      setValue("prices", {}, { shouldDirty: true, shouldValidate: false });
    }
    prevSubHeadingsRef.current = [...selectedSubHeadings];
  }, [selectedSubHeadings, setValue]);

  // FIX: Use selectedCategories.length instead of selectedCategories array to avoid infinite loop
  const selectedCategoriesLengthRef = useRef<number>(0);
  useEffect(() => {
    const currentLength = selectedCategories?.length || 0;
    if (currentLength === selectedCategoriesLengthRef.current) return;
    selectedCategoriesLengthRef.current = currentLength;

    const currentPricesValues = getValues("prices") || {};
    const next: Record<string, string> = {};
    let changed = false;

    // Copy existing prices, filtering out undefined values
    Object.keys(currentPricesValues).forEach((k) => {
      const val = currentPricesValues[k];
      if (val !== undefined && val !== null) {
        next[k] = val;
      }
    });

    // Remove keys not in selectedCategories
    Object.keys(next).forEach((k) => {
      if (!selectedCategories?.includes(k)) {
        delete next[k];
        changed = true;
      }
    });

    // Add keys for new selectedCategories
    selectedCategories?.forEach((k) => {
      if (!(k in next)) {
        next[k] = "";
        changed = true;
      }
    });

    if (changed) {
      // Use shouldValidate: false to prevent validation cascade
      setValue("prices", next, {
        shouldDirty: true,
        shouldValidate: false,
      });
    }
  }, [selectedCategories?.length, setValue, getValues]);

  // Action kontrolü: Error veya location denied durumunda işlem yapılamaz
  const { checkAndAlert: checkCanPerformAction } = useCanPerformAction(
    externalError,
    locationStatus,
    "Bu işlemi gerçekleştirmek için konum izni gereklidir. Lütfen ayarlardan konum iznini açın.",
  );

  const OnSubmit = async (form: FormUpdateValues) => {
    // Error veya location denied kontrolü
    if (!checkCanPerformAction()) {
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    const existingImages = data?.imageList ?? [];
    const formImages = form.storeImages ?? [];

    // Mevcut resimlerin ID'lerine göre eşleştirme
    const existingImageMap = new Map(
      existingImages.map((img) => [img.id, img]),
    );
    const formImageMap = new Map(
      formImages.filter((img) => img.id).map((img) => [img.id!, img]),
    );

    // 1. Silinecek resimler: Mevcut resimlerde var ama form'da yok
    const removedImages = existingImages.filter(
      (img) => !formImageMap.has(img.id),
    );

    // 2. Güncellenecek resimler: ID var ve URI değişmiş (resim değiştirilmiş)
    // ÖNEMLİ: Backend URL (https://...) ile local file URI (file://...) karşılaştırması
    // Eğer URI local file URI ise (file:// veya content:// ile başlıyorsa), resim değiştirilmiş demektir
    const updatedImages = formImages.filter((img) => {
      if (!img.id) return false; // ID yoksa yeni resim
      const existingImg = existingImageMap.get(img.id);
      if (!existingImg) return false;

      // Eğer URI local file URI ise (file:// veya content:// ile başlıyorsa), resim değiştirilmiş
      const isLocalFile = img.uri.startsWith('file://') || img.uri.startsWith('content://');
      if (isLocalFile) return true;

      // Eğer URI backend URL ise ve mevcut imageUrl ile aynı değilse, güncelle
      // (Bu durum normalde olmamalı ama güvenlik için kontrol ediyoruz)
      return existingImg.imageUrl !== img.uri;
    });

    // 3. Yeni resimler: ID yok
    const newImages = formImages.filter((img) => !img.id);

    // Tax document image upload (tekli resim)
    // ÖNEMLİ: Eğer tax document değişmemişse (backend URL), yükleme yapma, mevcut ID'yi kullan
    let taxDocumentImageId: string | undefined = data?.taxDocumentImage?.id;
    if (form.taxDocumentImage) {
      // Tax document değişmiş mi kontrol et (local file URI ise değişmiş demektir)
      const isTaxDocumentChanged =
        form.taxDocumentImage.uri.startsWith('file://') ||
        form.taxDocumentImage.uri.startsWith('content://') ||
        (data?.taxDocumentImage?.imageUrl && form.taxDocumentImage.uri !== data.taxDocumentImage.imageUrl);

      if (isTaxDocumentChanged) {
        if (!userId) {
          dispatch(
            showSnack({
              message: MESSAGES.PROFILE.USER_NOT_FOUND,
              isError: true,
            }),
          );
          return;
        }
        const formData = new FormData();
        formData.append("file", {
          uri: form.taxDocumentImage.uri,
          name: form.taxDocumentImage.name ?? "tax-document.jpg",
          type: form.taxDocumentImage.type ?? "image/jpeg",
        } as any);
        formData.append("ownerType", String(ImageOwnerType.Store));
        formData.append("ownerId", userId);

        const uploadRes = await uploadImage({ data: formData });
        if ("error" in uploadRes) {
          dispatch(
            showSnack({
              message:
                getErrorMessage(uploadRes.error) ||
                MESSAGES.FORM.TAX_DOCUMENT_UPLOAD_FAILED,
              isError: true,
            }),
          );
          setIsSubmitting(false);
          return;
        }
        const uploadResult = uploadRes.data;
        if (!uploadResult?.success || !uploadResult?.data) {
          dispatch(
            showSnack({
              message:
                uploadResult?.message || MESSAGES.FORM.TAX_DOCUMENT_UPLOAD_ERROR,
              isError: true,
            }),
          );
          setIsSubmitting(false);
          return;
        }
        taxDocumentImageId = uploadResult.data;
      }
      // Eğer değişmemişse, taxDocumentImageId zaten mevcut ID'ye set edildi (yukarıda)
    }

    const payload: BarberStoreUpdateDto = {
      id: storeId,
      storeName: form.storeName,
      type: mapBarberType(form.type),
      pricingType: mapPricingType(form.pricingType.mode),
      addressDescription: form.location.addressDescription ?? "",
      latitude: form.location.latitude,
      longitude: form.location.longitude,
      pricingValue:
        form.pricingType.mode == "percent"
          ? form.pricingType.percent!
          : (parseTR(form.pricingType.rent ?? undefined) ?? 0),
      taxDocumentImageId: taxDocumentImageId,
      chairs: form.chairs!.map((c, index) => {
        return {
          id: c.id,
          barberId: c.barberId,
          name: c.name,
          storeId: storeId,
        };
      }),
      offerings: (form.selectedCategories ?? [])
        .map((categoryId) => {
          const priceStr = form.prices?.[categoryId] ?? "";
          const priceNum = parseTR(priceStr);
          if (priceNum == null) return null;

          // Category name'i bul (services hook'tan geliyor)
          const categoryName =
            services.find((cat) => cat.id === categoryId)?.name ??
            categoryId;

          const existingId = data?.serviceOfferings?.find(
            (o) => o.serviceName === categoryName,
          )?.id;

          const dto: ServiceOfferingUpdateDto = {
            id: existingId,
            serviceName: categoryName,
            price: priceNum,
            ownerId: storeId,
          };
          return dto;
        })
        .filter((x): x is ServiceOfferingUpdateDto => x !== null),
      manuelBarbers: (form.barbers || []).map((barber) => {
        return {
          id: barber.id,
          fullName: barber.name,
        };
      }),
      workingHours: form.workingHours,
    };

    const storeResult = await updateStore(payload);
    if ("error" in storeResult) {
      const errorMessage = getErrorMessage(storeResult.error);
      dispatch(
        showSnack({
          message: errorMessage || MESSAGES.FORM.STORE_UPDATE_ERROR,
          isError: true,
        }),
      );
      setIsSubmitting(false);
      return;
    }

    const result = storeResult.data;
    if (!result?.success) {
      dispatch(
        showSnack({
          message: result?.message || MESSAGES.FORM.STORE_UPDATE_ERROR,
          isError: true,
        }),
      );
      setIsSubmitting(false);
      return;
    }

    // Store güncelleme başarılı, şimdi resim işlemleri
    let uploadError: string | null = null;
    const hasImageChanges =
      removedImages.length > 0 ||
      updatedImages.length > 0 ||
      newImages.length > 0;

    if (hasImageChanges) {
      // 1. Silinecek resimleri sil
      for (const img of removedImages) {
        const delRes = await deleteImage(img.id);
        if ("error" in delRes) {
          uploadError =
            getErrorMessage(delRes.error) ||
            MESSAGES.FORM.IMAGE_DELETE_ERROR;
          break;
        }
        if (!delRes.data?.success) {
          uploadError =
            delRes.data?.message || MESSAGES.FORM.IMAGE_DELETE_ERROR;
          break;
        }
      }

      // 2. Güncellenecek resimleri update-blob ile güncelle (aynı blob'u koru)
      if (!uploadError) {
        for (const img of updatedImages) {
          if (!img.id) continue;
          const formData = new FormData();
          formData.append("file", {
            uri: img.uri,
            name: img.name ?? "photo.jpg",
            type: img.type ?? "image/jpeg",
          } as any);
          const updateRes = await updateImageBlob({
            imageId: img.id,
            file: formData,
          });
          if ("error" in updateRes) {
            uploadError =
              getErrorMessage(updateRes.error) ||
              MESSAGES.FORM.IMAGE_UPDATE_BLOB_ERROR;
            break;
          }
          if (!updateRes.data?.success) {
            uploadError =
              updateRes.data?.message || MESSAGES.FORM.IMAGE_UPDATE_BLOB_ERROR;
            break;
          }
        }
      }

      // 3. Yeni resimleri ekle
      if (!uploadError && newImages.length > 0) {
        const formData = new FormData();
        newImages.forEach((img) => {
          formData.append("files", {
            uri: img.uri,
            name: img.name ?? "photo.jpg",
            type: img.type ?? "image/jpeg",
          } as any);
        });
        formData.append("ownerType", String(ImageOwnerType.Store));
        formData.append("ownerId", storeId);
        const uploadRes = await uploadMultipleImages(formData);
        if ("error" in uploadRes) {
          uploadError =
            getErrorMessage(uploadRes.error) ||
            MESSAGES.FORM.STORE_IMAGES_UPLOAD_ERROR;
        } else if (!uploadRes.data?.success) {
          uploadError =
            uploadRes.data?.message || MESSAGES.FORM.STORE_IMAGES_UPLOAD_ERROR;
        }
      }
    }

    if (uploadError) {
      dispatch(
        showSnack({
          message: `${MESSAGES.FORM.STORE_IMAGES_UPDATE_ERROR} ${uploadError}`,
          isError: true,
        }),
      );
    } else {
      dispatch(
        showSnack({
          message: result.message || MESSAGES.FORM.STORE_UPDATE_SUCCESS,
          isError: false,
        }),
      );
    }

    // Refresh store data to show updated images
    await triggerGetStore(storeId);
    onClose?.();
    setIsSubmitting(false);
  };
  const c = safeCoord(location?.latitude, location?.longitude);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <View className="h-full" style={{ backgroundColor: colors.sheetBg }}>
        <View className="flex-row justify-between items-center px-2">
          <Text className="flex-1 font-century-gothic text-2xl" style={{ color: colors.sectionHeaderText }}>
            {t("form.updateStore")}
          </Text>
          <IconButton
            onPress={() => onClose?.()}
            icon="close"
            iconColor={colors.sectionHeaderText}
          />
        </View>
        <Divider style={{ height: 1, backgroundColor: colors.borderColor }} />
        {!enabled ? null : isLoading || !data ? (
          <View className="flex-1 pt-4">
            {Array.from({ length: 1 }).map((_, i) => (
              <CrudSkeletonComponent key={i} />
            ))}
          </View>
        ) : (
          <>
            <StepFormIndicator
              steps={steps}
              currentStep={currentStep}
              onStepPress={handleStepPress}
              canNavigateFreely={true}
              completedSteps={completedSteps}
            />
            <ScrollView
              key={currentStep}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              alwaysBounceVertical={false}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}
              style={{ flex: 1 }}
            >
              <Animated.View style={{ flex: 1, transform: [{ translateX: stepSlideAnim }] }}>
                {currentStep === 0 && (
                  <>
                    <Text className="text-xl mt-4 px-2" style={{ color: colors.sectionHeaderText }}>
                      {t("form.storeImagesTitle")}
                    </Text>
                    <View className="mt-4">
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                      >
                        {(images ?? []).map((img, index) => (
                          <View
                            key={index}
                            className="relative"
                            style={{ width: 260, height: 200 }}
                          >
                            <Image
                              className="w-full h-full rounded-xl"
                              source={{ uri: img.uri }}
                              resizeMode="cover"
                              onLoad={() =>
                                setLoadedStoreImages((prev) =>
                                  new Set(prev).add(index),
                                )
                              }
                            />
                            {!loadedStoreImages.has(index) && (
                              <View
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  justifyContent: "center",
                                  alignItems: "center",
                                  backgroundColor: colors.cardBg,
                                  borderRadius: 10,
                                }}
                              >
                                <ActivityIndicator size="large" color="#888" />
                              </View>
                            )}
                            <TouchableOpacity
                              onPress={() => removeImage(index)}
                              className="absolute top-2 right-2 bg-red-500 rounded-full p-1.5"
                              activeOpacity={0.85}
                            >
                              <Icon source="close" size={18} color="white" />
                            </TouchableOpacity>
                          </View>
                        ))}
                        {(!images || images.length < 3) && (
                          <TouchableOpacity
                            onPress={pickMultipleImages}
                            disabled={isImagePickerLoading}
                            className="rounded-xl items-center justify-center"
                            style={{ width: 260, height: 200, backgroundColor: colors.cardBg2, borderWidth: 1, borderColor: colors.borderColor }}
                            activeOpacity={0.85}
                          >
                            {isImagePickerLoading ? (
                              <ActivityIndicator size="large" color="#888" />
                            ) : (
                              <>
                                <Icon source="image-plus" size={40} color="#888" />
                                <Text className="text-gray-500 mt-2">{t("form.addImage")}</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                      </ScrollView>
                    </View>
                    <Text className="text-xl mt-6 px-2" style={{ color: colors.sectionHeaderText }}>
                      {t("form.storeInformation")}
                    </Text>
                    <View className="mt-2 px-2">
                      <Controller
                        control={control}
                        name="taxDocumentImage"
                        render={({ field: { value, onChange } }) => (
                          <>
                            <TouchableOpacity
                              activeOpacity={0.85}
                              disabled={isTaxDocumentLoading}
                              onPress={async () => {
                                setIsTaxDocumentLoading(true);
                                try {
                                  const file = await handlePickImage();
                                  if (file) onChange(file);
                                } finally {
                                  setIsTaxDocumentLoading(false);
                                }
                              }}
                            >
                              <TextInput
                                label="Vergi Levhası Resmi"
                                mode="outlined"
                                value={
                                  value?.name
                                    ? truncateFileName(value.name)
                                    : t("form.imageNotSelected")
                                }
                                editable={false}
                                dense
                                pointerEvents="none"
                                textColor={colors.sectionHeaderText}
                                outlineColor={
                                  errors.taxDocumentImage ? "#b00020" : colors.borderColor2
                                }
                                right={
                                  isTaxDocumentLoading ? (
                                    <ActivityIndicator
                                      size="small"
                                      color="#888"
                                      style={{ marginRight: 12 }}
                                    />
                                  ) : (
                                    <TextInput.Icon icon="image" color={colors.sectionHeaderText} />
                                  )
                                }
                                theme={{
                                  roundness: 10,
                                  colors: {
                                    onSurfaceVariant: colors.textSecondary,
                                    primary: colors.sectionHeaderText,
                                  },
                                }}
                                style={{ backgroundColor: colors.cardBg, borderWidth: 0 }}
                              />
                            </TouchableOpacity>
                            {value?.uri && !isTaxDocumentLoading && (
                              <View className="mt-2 mb-2 w-full">
                                <Image
                                  source={{ uri: value.uri }}
                                  style={{
                                    width: "100%",
                                    height: 200,
                                    borderRadius: 10,
                                  }}
                                  resizeMode="stretch"
                                />
                              </View>
                            )}
                            <HelperText
                              type="error"
                              visible={!!errors.taxDocumentImage}
                            >
                              {taxDocErrorText}
                            </HelperText>
                          </>
                        )}
                      />
                      <View className="flex-row gap-3">
                        <View className="flex-1">
                          <Controller
                            control={control}
                            name="storeName"
                            render={({ field: { onChange, onBlur, value } }) => (
                              <>
                                <TextInput
                                  label={t("form.storeNameLabel")}
                                  mode="outlined"
                                  dense
                                  value={value}
                                  onChangeText={onChange}
                                  onBlur={onBlur}
                                  textColor={colors.sectionHeaderText}
                                  outlineColor={errors.storeName ? "#b00020" : colors.borderColor2}
                                  theme={{
                                    roundness: 10,
                                    colors: {
                                      onSurfaceVariant: colors.textSecondary,
                                      primary: colors.sectionHeaderText,
                                    },
                                  }}
                                  style={{
                                    backgroundColor: colors.cardBg,
                                    borderWidth: 0,
                                    marginTop: -6,
                                  }}
                                />
                                <HelperText type="error" visible={!!errors.storeName} style={{ fontFamily: 'CenturyGothic' }}>
                                  {errors.storeName?.message}
                                </HelperText>
                              </>
                            )}
                          />
                        </View>
                        <View className="flex-1">
                          <Controller
                            control={control}
                            name="type"
                            render={({ field: { value, onChange } }) => {
                              // Use memoized dropdown data and validation set
                              const isValueValid =
                                value && parentCategoriesValueSet.has(value);

                              return (
                                <>
                                  <Dropdown
                                    data={parentCategoriesDropdownData}
                                    labelField="label"
                                    valueField="value"
                                    placeholder={t("form.selectMainCategory")}
                                    value={isValueValid ? value : null}
                                    onChange={(item: {
                                      label: string;
                                      value: string;
                                    }) => {
                                      onChange(item.value);
                                    }}
                                    style={{
                                      height: 42,
                                      borderRadius: 10,
                                      paddingHorizontal: 12,
                                      backgroundColor: colors.cardBg,
                                      borderWidth: 1,
                                      borderColor: errors.type ? "#b00020" : colors.borderColor2,
                                      justifyContent: "center",
                                      marginTop: 0,
                                    }}
                                    placeholderStyle={{ color: "gray", fontFamily: 'CenturyGothic' }}
                                    selectedTextStyle={{ color: colors.sectionHeaderText, fontFamily: 'CenturyGothic' }}
                                    itemTextStyle={{ color: colors.sectionHeaderText, fontFamily: 'CenturyGothic' }}
                                    containerStyle={{
                                      backgroundColor: colors.cardBg,
                                      borderWidth: 0,
                                      borderRadius: 10,
                                      overflow: "hidden",
                                    }}
                                    activeColor="#3a3b3d"
                                  />
                                  <HelperText
                                    className="text-4xl"
                                    type="error"
                                    visible={!!errors.type}
                                  >
                                    {errors.type?.message}
                                  </HelperText>
                                </>
                              );
                            }}
                          />
                        </View>
                      </View>
                    </View>
                  </>
                )}
                {currentStep === 1 && (
                  <>
                    <View className="mt-2 px-2">
                      {!selectedType || mainHeadingOptions.length === 0 ? (
                        <Text className="text-gray-400 text-center py-8">
                          {t("form.stepMainHeadings")} - {t("form.selectMainCategory")}
                        </Text>
                      ) : (
                        <>
                          <Text className="text-xl mb-3 font-century-gothic-bold" style={{ color: colors.sectionHeaderText }}>
                            {t("form.mainHeadings")}
                          </Text>
                          <View className="rounded-xl p-3" style={{ borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardBg }}>
                            <Controller
                              control={control}
                              name="selectedMainHeadings"
                              render={({ field: { value, onChange } }) => (
                                <>
                                  <CategoryListSelect
                                    data={mainHeadingOptions}
                                    value={(value ?? []) as string[]}
                                    onChange={onChange}
                                  />
                                  <HelperText
                                    type="error"
                                    visible={!selectedMainHeadings.length && !!errors.selectedMainHeadings}
                                  >
                                    {errors.selectedMainHeadings?.message}
                                  </HelperText>
                                </>
                              )}
                            />
                          </View>
                        </>
                      )}
                    </View>
                  </>
                )}
                {currentStep === 2 && (
                  <>
                    <View className="mt-2 px-2">
                      {selectedMainHeadings.length === 0 || subHeadingOptions.length === 0 ? (
                        <Text className="text-gray-400 text-center py-8">
                          {t("form.stepSubHeadings")} - {t("form.selectMainHeadings")}
                        </Text>
                      ) : (
                        <>
                          <Text className="text-xl mb-3 font-century-gothic-bold" style={{ color: colors.sectionHeaderText }}>
                            {t("form.subHeadings")}
                          </Text>
                          <View className="rounded-xl p-3" style={{ borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardBg }}>
                            <Controller
                              control={control}
                              name="selectedSubHeadings"
                              render={({ field: { value, onChange } }) => (
                                <>
                                  <CategoryListSelect
                                    data={subHeadingOptions}
                                    value={(value ?? []) as string[]}
                                    onChange={onChange}
                                  />
                                  <HelperText
                                    type="error"
                                    visible={!selectedSubHeadings.length && !!errors.selectedSubHeadings}
                                  >
                                    {errors.selectedSubHeadings?.message}
                                  </HelperText>
                                </>
                              )}
                            />
                          </View>
                        </>
                      )}
                    </View>
                  </>
                )}
                {currentStep === 3 && (
                  <>
                    <View className="mt-2 px-2">
                      {selectedSubHeadings.length === 0 || categoryOptions.length === 0 ? (
                        <Text className="text-gray-400 text-center py-8">
                          {t("form.stepStoreServices")} - {t("form.selectSubHeadings")}
                        </Text>
                      ) : (
                        <>
                          <Text className="text-xl mb-3 font-century-gothic-bold" style={{ color: colors.sectionHeaderText }}>
                            {t("form.servicesTitle")} ({selectedType})
                          </Text>
                          <View className="rounded-xl p-3" style={{ borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardBg }}>
                            <Controller
                              control={control}
                              name="selectedCategories"
                              render={({ field: { value, onChange } }) => {
                                return (
                                  <>
                                    <CategoryListSelect
                                      data={categoryOptionsWithSelected}
                                      value={(value ?? []).filter((v) =>
                                        categoryValueSet.has(v),
                                      )}
                                      onChange={onChange}
                                    />

                                    <HelperText
                                      type="error"
                                      visible={!selectedCategories.length && !!errors.selectedCategories}
                                    >
                                      {errors.selectedCategories?.message}
                                    </HelperText>
                                  </>
                                );
                              }}
                            />
                          </View>
                        </>
                      )}
                    </View>
                  </>
                )}
                {currentStep === 4 && (
                  <>
                    <View className="mt-2 px-2">
                      {!selectedCategories || selectedCategories.length === 0 ? (
                        <Text className="text-gray-400 text-center py-8">
                          {t("form.stepStorePrices")} - {t("form.selectService")}
                        </Text>
                      ) : (
                        <>
                          {selectedCategories.length > 0 && (
                            <View
                              className="mt-0 mx-0  rounded-xl"
                              style={{
                                backgroundColor: colors.cardBg,
                                paddingVertical: 6,
                                paddingHorizontal: 16,
                              }}
                            >
                              {selectedCategories.map((categoryId) => {
                                const label =
                                  categoryLabelMap.get(categoryId) ?? categoryId;
                                return (
                                  <View key={categoryId}>
                                    <View className="flex-row items-center gap-2 mb-0">
                                      <Text className="w-[35%]" style={{ color: colors.sectionHeaderText }}>
                                        {label} :
                                      </Text>
                                      <View className="w-[65%]">
                                        <Controller
                                          control={control}
                                          name={`prices.${categoryId}` as const}
                                          render={({
                                            field: { value, onChange, onBlur },
                                            fieldState: { error },
                                          }) => (
                                            <TextInput
                                              mode="outlined"
                                              dense
                                              keyboardType="numeric"
                                              label={t("form.priceLabel")}
                                              value={value ?? ""}
                                              onChangeText={(t) => {
                                                const raw = t.replace(/[^\d.,]/g, "");
                                                onChange(raw);
                                              }}
                                              onBlur={() => {
                                                const toTR = (s: string) => {
                                                  const n = Number(
                                                    s
                                                      .replace(/\./g, "")
                                                      .replace(",", "."),
                                                  );
                                                  if (Number.isNaN(n)) return s;
                                                  return new Intl.NumberFormat("tr-TR", {
                                                    minimumFractionDigits: 0,
                                                    maximumFractionDigits: 2,
                                                  }).format(n);
                                                };
                                                onChange(toTR(value ?? ""));
                                              }}
                                              textColor={colors.sectionHeaderText}
                                              outlineColor={error ? "#b00020" : colors.borderColor2}
                                              style={PRICE_INPUT_STYLE}
                                              theme={{ roundness: 10, colors: { onSurfaceVariant: colors.textSecondary, primary: colors.sectionHeaderText } }}
                                            />
                                          )}
                                        />
                                        <HelperText
                                          type="error"
                                          visible={!!errors.prices?.[categoryId]}
                                        >
                                          {errors.prices?.[categoryId]?.message as string}
                                        </HelperText>
                                      </View>
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  </>
                )}
                {currentStep === 5 && (
                  <>
                    <View className="mt-2 mx-0 flex-row items-center px-2">
                      <Text className="text-xl flex-1" style={{ color: colors.sectionHeaderText }}>
                        {t("form.workingBarbersCount")} : {barberFields.length}{" "}
                      </Text>
                      <Button
                        mode="text"
                        textColor="#c2a523"
                        onPress={openCreateBarberModal}
                      >
                        {t("form.addBarber")}
                      </Button>
                    </View>
                    {barberFields.length > 0 && (
                      <View className="rounded-xl mx-2 px-3 pt-4 pb-2" style={{ backgroundColor: colors.cardBg }}>
                        {barberFields.map((item, index) => (
                          <View
                            key={item._key}
                            className="flex-row items-center mb-3 gap-3"
                          >
                            {barbers[index]?.avatar?.uri ? (
                              <Avatar.Image
                                size={40}
                                source={{ uri: barbers[index]?.avatar?.uri }}
                              />
                            ) : (
                              <Avatar.Icon size={40} icon="account-circle" />
                            )}

                            <Controller
                              control={control}
                              name={`barbers.${index}.name`}
                              render={({ field: { value } }) => (
                                <TextInput
                                  label={t("form.barberName")}
                                  mode="outlined"
                                  dense
                                  value={value ?? ""}
                                  readOnly
                                  textColor={colors.sectionHeaderText}
                                  outlineColor={colors.borderColor2}
                                  theme={{
                                    roundness: 10,
                                    colors: {
                                      onSurfaceVariant: colors.textSecondary,
                                      primary: colors.sectionHeaderText,
                                    },
                                  }}
                                  style={{
                                    backgroundColor: colors.cardBg,
                                    borderWidth: 0,
                                    flex: 1,
                                  }}
                                />
                              )}
                            />
                            <TouchableOpacity
                              onPress={() => openEditBarberModal(index)}
                            >
                              <Icon size={22} source="update" color="#c2a523" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDeleteBarber(index)}
                            >
                              <Icon size={22} source="delete" color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        ))}
                        <HelperText type="error" visible={!!barberErrorText} style={{ fontFamily: 'CenturyGothic' }}>
                          {barberErrorText}
                        </HelperText>
                      </View>
                    )}
                    <View className="mt-4 mx-0 px-2 flex-row items-center">
                      <Text className="text-xl flex-1" style={{ color: colors.sectionHeaderText }}>
                        {t("form.chairCount")} : {chairFields.length}
                      </Text>
                      <Button
                        mode="text"
                        textColor="#c2a523"
                        onPress={openCreateChairModal}
                      >
                        {t("form.addChair")}
                      </Button>
                    </View>
                    {chairFields.length > 0 && (
                      <View className="rounded-xl mx-2 px-3 pt-4" style={{ backgroundColor: colors.cardBg }}>
                        {chairFields.map((item, index) => {
                          const chair = chairs[index];
                          if (!chair) return null;
                          const isBarberChair = !!chair.barberId;
                          const modeLabel = isBarberChair
                            ? t("form.barberChair")
                            : t("form.namedChair");
                          // barberMap'i her render'da güncel kullan (barbers watch ediliyor)
                          const barberName = isBarberChair
                            ? (barberMap.get(chair.barberId!) ?? t("form.unassigned"))
                            : "-";
                          return (
                            <View
                              key={`chair-${item.id || index}-${barberName}`}
                              className="flex-row items-center gap-3 mt-2  mb-3"
                            >
                              <Icon
                                size={24}
                                source={"chair-rolling"}
                                color="#c2a523"
                              ></Icon>
                              <View className="flex-1 rounded-xl items-center py-3 mt-[-5px] justify-center" style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderColor2 }}>
                                <Text className="text-gray-500 text-xs mb-1">
                                  {modeLabel}
                                </Text>
                              </View>
                              <View className="flex-1 items-center rounded-xl  py-3 mt-[-5px] justify-center" style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderColor2 }}>
                                {!isBarberChair ? (
                                  <Text className="text-xs mb-1" style={{ color: colors.sectionHeaderText }}>
                                    {chair.name}
                                  </Text>
                                ) : (
                                  <Text className="text-xs mb-1" style={{ color: colors.sectionHeaderText }}>
                                    {barberName}
                                  </Text>
                                )}
                              </View>
                              <TouchableOpacity
                                onPress={() => openEditChairModal(index)}
                              >
                                <Icon size={22} source="update" color="#c2a523" />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => handleChair(index)}>
                                <Icon size={22} source="delete" color="#ef4444" />
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                        <HelperText type="error" visible={!!chairsErrorText} style={{ fontFamily: 'CenturyGothic' }}>
                          {chairsErrorText}
                        </HelperText>
                      </View>
                    )}
                  </>
                )}
                {currentStep === 6 && (
                  <>
                    <View className="px-2">
                      <Text className="font-century-gothic ml-0 pt-4 mt-4 pb-2 text-xl" style={{ color: colors.sectionHeaderText }}>
                        {t("form.chairPricing")}
                      </Text>
                      <View className="mt-2 mx-0 rounded-xl px-3 py-3" style={{ backgroundColor: colors.cardBg }}>
                        <Controller
                          control={control}
                          name="pricingType.mode"
                          render={({ field: { value, onChange } }) => (
                            <View className="flex-row justify-center gap-16 ">
                              {PRICING_OPTIONS.map((opt) => (
                                <TouchableOpacity
                                  key={opt.value}
                                  onPress={() => onChange(opt.value)}
                                  className="flex-row items-center gap-2"
                                  activeOpacity={0.85}
                                >
                                  <View
                                    className={`w-4 h-4 rounded-full border ${value === opt.value
                                      ? "bg-green-500 border-green-500"
                                      : "border-gray-400"
                                      }`}
                                  />
                                  <Text style={{ color: colors.sectionHeaderText }}>{opt.label}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        />
                        {pricingMode === "rent" && (
                          <Controller
                            control={control}
                            name="pricingType.rent"
                            render={({ field: { value, onChange, onBlur } }) => (
                              <>
                                <TextInput
                                  dense
                                  value={value?.toString() ?? ""}
                                  onChangeText={(t) => {
                                    const raw = t.replace(/[^\d.,]/g, "");
                                    onChange(raw);
                                  }}
                                  onBlur={() => {
                                    const toTR = (s: string) => {
                                      const n = Number(
                                        s.replace(/\./g, "").replace(",", "."),
                                      );
                                      if (Number.isNaN(n)) return s;
                                      return new Intl.NumberFormat("tr-TR", {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 2,
                                      }).format(n);
                                    };
                                    onChange(toTR(value ?? ""));
                                  }}
                                  mode="outlined"
                                  label={t("form.rentPriceHourly")}
                                  textColor={colors.sectionHeaderText}
                                  outlineColor={
                                    errors.pricingType?.rent ? "#b00020" : colors.borderColor2
                                  }
                                  theme={{
                                    roundness: 10,
                                    colors: {
                                      onSurfaceVariant: colors.textSecondary,
                                      primary: colors.sectionHeaderText,
                                    },
                                  }}
                                  style={{
                                    backgroundColor: colors.cardBg,
                                    borderWidth: 0,
                                    marginTop: 8,
                                  }}
                                  keyboardType="numeric"
                                />
                                <HelperText
                                  type="error"
                                  visible={!!errors.pricingType?.rent}
                                >
                                  {errors.pricingType?.rent?.message as string}
                                </HelperText>
                              </>
                            )}
                          />
                        )}
                        {pricingMode === "percent" && (
                          <Controller
                            control={control}
                            name="pricingType.percent"
                            render={({ field: { value, onChange } }) => (
                              <>
                                <Dropdown
                                  dropdownPosition="top"
                                  data={[
                                    { label: "10%", value: "10" },
                                    { label: "20%", value: "20" },
                                    { label: "30%", value: "30" },
                                    { label: "40%", value: "40" },
                                    { label: "50%", value: "50" },
                                    { label: "60%", value: "60" },
                                    { label: "70%", value: "70" },
                                    { label: "80%", value: "80" },
                                    { label: "90%", value: "90" },
                                  ]}
                                  labelField="label"
                                  valueField="value"
                                  value={value ? String(value) : undefined}
                                  placeholder={t("form.selectPercent")}
                                  onChange={(item: {
                                    label: string;
                                    value: string;
                                  }) => onChange(item.value)}
                                  style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 10,
                                    backgroundColor: colors.cardBg,
                                    borderWidth: 1,
                                    borderColor: errors.pricingType?.percent
                                      ? "#b00020"
                                      : colors.borderColor2,
                                    marginTop: 12,
                                    height: 42,
                                  }}
                                  placeholderStyle={{ color: "gray", fontFamily: 'CenturyGothic' }}
                                  selectedTextStyle={{ color: colors.sectionHeaderText, fontFamily: 'CenturyGothic' }}
                                  itemTextStyle={{ color: colors.sectionHeaderText, fontFamily: 'CenturyGothic' }}
                                  containerStyle={{
                                    backgroundColor: colors.cardBg,
                                    borderWidth: 1,
                                    borderColor: colors.borderColor2,
                                    borderRadius: 10,
                                    overflow: "hidden",
                                  }}
                                  activeColor="#ffb900"
                                />
                                <HelperText
                                  type="error"
                                  visible={!!errors.pricingType?.percent}
                                >
                                  {errors.pricingType?.percent?.message as string}
                                </HelperText>
                              </>
                            )}
                          />
                        )}
                      </View>
                    </View>
                  </>
                )}
                {currentStep === 7 && (
                  <>
                    <View className="px-2">
                      <Text className="font-century-gothic ml-0 pt-4 pb-2 text-xl" style={{ color: colors.sectionHeaderText }}>
                        {t("form.workingHours")}
                      </Text>
                      <View className="mt-2 mx-0 rounded-xl px-2 py-3" style={{ backgroundColor: colors.cardBg }}>
                        <View className="mt-2 px-0">
                          <View className="flex-row  gap-2">
                            {DAYS_TR.map((d) => {
                              const isHoliday = (holidayDays ?? []).includes(d.day);
                              const isActive = activeDay === d.day;
                              return (
                                <TouchableOpacity
                                  key={d.day}
                                  disabled={isHoliday}
                                  onPress={() => setActiveDay(d.day)}
                                  className={`px-3 py-2 rounded-full border ${isHoliday
                                    ? "opacity-40 border-gray-600"
                                    : isActive
                                      ? "bg-emerald-500"
                                      : "border-gray-500"
                                    }`}
                                  activeOpacity={0.8}
                                >
                                  <Text className="text-xs" style={{ color: colors.sectionHeaderText }}>
                                    {d.label}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                          {(() => {
                            const idx = (working ?? []).findIndex(
                              (w) => w.dayOfWeek === activeDay,
                            );
                            if (idx < 0) return null;
                            const dayRow = working[idx];
                            const isDisabled =
                              dayRow?.isClosed ||
                              (holidayDays ?? []).includes(activeDay);
                            const dayErr = errors.workingHours?.[idx];
                            return (
                              <View className="mt-0 rounded-xl p-0" style={{ backgroundColor: colors.cardBg }}>
                                <View className="flex-row items-center mt-6">
                                  <Text className="text-sm" style={{ color: colors.sectionHeaderText }}>
                                    Başlangıç saati:
                                  </Text>
                                  <DateTimePicker
                                    value={activeStart}
                                    mode="time"
                                    is24Hour
                                    locale="tr-TR"
                                    disabled={isDisabled}
                                    onChange={(_, d) => {
                                      if (!d || isDisabled) return;
                                      setActiveStart(d);
                                      setValue(
                                        `workingHours.${idx}.startTime`,
                                        fmtHHmm(d),
                                        {
                                          shouldDirty: true,
                                          shouldValidate: true,
                                        },
                                      );
                                      trigger([
                                        `workingHours.${idx}.startTime`,
                                        `workingHours.${idx}.endTime`,
                                      ]);
                                    }}
                                  />
                                  <Text className="text-sm ml-5" style={{ color: colors.sectionHeaderText }}>
                                    Bitiş saati:
                                  </Text>
                                  <DateTimePicker
                                    value={activeEnd}
                                    mode="time"
                                    is24Hour
                                    locale="tr-TR"
                                    disabled={isDisabled}
                                    onChange={(_, d) => {
                                      if (!d || isDisabled) return;
                                      setActiveEnd(d);
                                      setValue(
                                        `workingHours.${idx}.endTime`,
                                        fmtHHmm(d),
                                        {
                                          shouldDirty: true,
                                          shouldValidate: true,
                                        },
                                      );
                                      trigger([
                                        `workingHours.${idx}.startTime`,
                                        `workingHours.${idx}.endTime`,
                                      ]);
                                    }}
                                  />
                                </View>
                                <HelperText
                                  type="error"
                                  visible={!!(dayErr?.startTime || dayErr?.endTime)}
                                >
                                  {((dayErr?.startTime?.message as string) ||
                                    (dayErr?.endTime?.message as string)) ??
                                    ""}
                                </HelperText>
                              </View>
                            );
                          })()}
                          <Text className="text-[#c2a523] font-century-gothic pt-2 pb-1 text-sm">
                            - {t("form.workingHoursInfo")}
                          </Text>
                          <Text className="text-xl mt-1" style={{ color: colors.sectionHeaderText }}>
                            Tatil Günleri
                          </Text>
                          <Controller
                            control={control}
                            name="holidayDays"
                            render={({
                              field: { value, onChange },
                              fieldState: { error },
                            }) => (
                              <>
                                <CategoryListSelect
                                  data={HOLIDAY_OPTIONS}
                                  value={(value ?? []).map(String)}
                                  onChange={(vals: string[]) => {
                                    const numeric = vals.map((v) => Number(v));
                                    onChange(numeric);
                                    const current = getValues("workingHours") ?? [];
                                    const updated = current.map((w) => ({
                                      ...w,
                                      isClosed: numeric.includes(w.dayOfWeek),
                                    }));
                                    setValue("workingHours", updated, {
                                      shouldDirty: true,
                                      shouldValidate: true,
                                    });
                                  }}
                                />
                                <HelperText type="error" visible={!!error} style={{ fontFamily: 'CenturyGothic' }}>
                                  {error?.message as string}
                                </HelperText>
                              </>
                            )}
                          />
                        </View>
                      </View>
                    </View>
                  </>
                )}
                {currentStep === 8 && (
                  <>
                    <View className="px-2">
                      <Text className="font-century-gothic ml-0 pt-4 pb-2 text-xl" style={{ color: colors.sectionHeaderText }}>
                        {t("form.setAddress")}
                      </Text>
                      <View className="mt-2 mx-0 rounded-xl px-2 py-3" style={{ backgroundColor: colors.cardBg }}>
                        <Text className="text-[#c2a523] font-century-gothic ml-0 pt-0 pb-2 text-sm">
                          - Eğer şuanda işletmede bulunuyorsanız aşağıdaki dükkanın
                          konumunu ala tıklayınız ama değilseniz haritadan konumunuza
                          tıklayınız.
                        </Text>
                        <Button
                          loading={locBusy}
                          disabled={locBusy}
                          mode="contained-tonal"
                          icon={"store"}
                          className="my-2.5"
                          onPress={pickMyCurrentLocation}
                          buttonColor="#10B981"
                          textColor="white"
                        >
                          {t("form.getStoreLocation")}
                        </Button>
                        <MapPicker
                          lat={c ? c.lat : undefined}
                          lng={c ? c.lon : undefined}
                          address={address}
                          onChange={async (la, ln) => {
                            updateLocation(la, ln);
                            await reverseAndSetAddress(la, ln);
                          }}
                        />
                        <HelperText
                          type="error"
                          visible={
                            !!(
                              errors.location?.latitude || errors.location?.longitude
                            )
                          }
                        >
                          {(errors.location?.latitude?.message as string) ||
                            (errors.location?.longitude?.message as string) ||
                            ""}
                        </HelperText>
                        <Controller
                          control={control}
                          name="location.addressDescription"
                          render={({ field: { value, onChange, onBlur } }) => (
                            <>
                              <TextInput
                                label={t("form.addressDescription")}
                                mode="outlined"
                                dense
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                multiline
                                readOnly
                                textColor={colors.sectionHeaderText}
                                outlineColor={
                                  errors.location?.addressDescription
                                    ? "#b00020"
                                    : colors.borderColor2
                                }
                                theme={{
                                  roundness: 10,
                                  colors: {
                                    onSurfaceVariant: colors.textSecondary,
                                    primary: colors.sectionHeaderText,
                                  },
                                }}
                                style={{
                                  backgroundColor: colors.cardBg,
                                  borderWidth: 0,
                                  marginTop: 0,
                                }}
                                placeholder={t("form.addressPlaceholder")}
                              />
                              <HelperText
                                type="error"
                                visible={!!errors.location?.addressDescription}
                              >
                                {
                                  errors.location?.addressDescription
                                    ?.message as string
                                }
                              </HelperText>
                            </>
                          )}
                        />
                      </View>
                    </View>
                  </>
                )}
                {currentStep === 9 && (
                  <>
                    <View className="px-2 py-4">
                      <Text className="text-lg font-bold mb-4" style={{ color: colors.sectionHeaderText }}>
                        {t("form.stepPreview")}
                      </Text>
                      <View className="rounded-xl p-4 gap-3" style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderColor }}>
                        {(getValues("storeImages") ?? []).length > 0 && (
                          <View className="mb-3">
                            <Text className="text-base font-century-gothic-bold mb-2" style={{ color: colors.sectionHeaderText }}>{t("form.panelImagesTitle")}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                              {(getValues("storeImages") ?? []).map((img: { uri: string }, idx: number) => (
                                <Image key={idx} source={{ uri: img.uri }} style={{ width: 140, height: 110, borderRadius: 10 }} resizeMode="cover" />
                              ))}
                            </ScrollView>
                          </View>
                        )}
                        {/* Vergi Levhası */}
                        {getValues("taxDocumentImage")?.uri && (
                          <View className="py-1.5" style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor }}>
                            <Text className="text-gray-400 text-sm mb-1">{t("form.taxDocumentImage")}</Text>
                            <Image source={{ uri: getValues("taxDocumentImage").uri }} style={{ width: 160, height: 110, borderRadius: 8 }} resizeMode="cover" />
                          </View>
                        )}
                        <PreviewRow label={t("form.storeNameLabel")} value={getValues("storeName") ?? ""} colors={colors} />
                        <PreviewRowList label={t("form.stepMainHeadings")} items={(getValues("selectedMainHeadings") ?? []).map((id: string) => mainHeadings.find((h: any) => h.id === id)?.name ?? id)} colors={colors} />
                        <PreviewRowList label={t("form.stepSubHeadings")} items={(getValues("selectedSubHeadings") ?? []).map((id: string) => subHeadings.find((h: any) => h.id === id)?.name ?? id)} colors={colors} />
                        <PreviewRowList label={t("form.servicesTitle")} items={(getValues("selectedCategories") ?? []).map((id: string) => services.find((s: any) => s.id === id)?.name ?? id)} colors={colors} />
                        {Object.keys(getValues("prices") ?? {}).length > 0 && (
                          <View className="mt-2">
                            <Text className="text-gray-400 text-sm mb-1">{t("form.stepStorePrices")}</Text>
                            {Object.entries(getValues("prices") ?? {}).map(([catId, price], idx) => (
                              <View key={`price-${idx}`} className="flex-row justify-between py-1">
                                <Text className="flex-1 text-sm" style={{ color: colors.sectionHeaderText }}>
                                  {services.find((s: any) => s.id === catId)?.name ?? catId}
                                </Text>
                                <Text className="text-sm" style={{ color: '#fea60e' }}>{typeof price === "string" ? price : ""}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                        {/* Fiyatlandırma Tipi */}
                        {(() => {
                          const pt = getValues("pricingType");
                          if (!pt?.mode) return null;
                          const isRent = pt.mode === "rent";
                          const ptValue = isRent ? (pt.rent ?? "—") : (pt.percent != null ? `%${pt.percent}` : "—");
                          const ptLabel = isRent ? "Kira (Koltuk kirası)" : "Yüzde (Komisyon)";
                          return (
                            <View className="py-1.5" style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor }}>
                              <Text className="text-gray-400 text-sm mb-0.5">{t("form.pricingTitle") || "Fiyatlandırma Tipi"}</Text>
                              <Text className="text-sm" style={{ color: colors.sectionHeaderText }}>{ptLabel}: <Text style={{ color: '#fea60e' }}>{ptValue}</Text></Text>
                            </View>
                          );
                        })()}
                        {/* Koltuklar */}
                        {(getValues("chairs") ?? []).length > 0 && (
                          <View className="py-1.5" style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor }}>
                            <Text className="text-gray-400 text-sm mb-1">{"Berber Koltukları"}</Text>
                            {(getValues("chairs") ?? []).map((chair: any, idx: number) => {
                              const isBarberChair = !!(chair.barberId) || chair.mode === "barber";
                              const barberName = isBarberChair && chair.barberId
                                ? (barberMap.get(chair.barberId) ?? (getValues("barbers") ?? []).find((b: any) => b.id === chair.barberId)?.name ?? "—")
                                : null;
                              const label = isBarberChair ? (barberName || "—") : (chair.name || "—");
                              return (
                                <View key={`chair-${idx}`} className="flex-row items-center py-0.5 gap-2">
                                  <Text className="text-sm" style={{ color: colors.textSecondary }}>{idx + 1}.</Text>
                                  <Text className="text-sm flex-1" style={{ color: colors.sectionHeaderText }}>{label}</Text>
                                  <Text className="text-xs" style={{ color: colors.textSecondary }}>{isBarberChair ? "Berbere atanmış" : "İsimli"}</Text>
                                </View>
                              );
                            })}
                          </View>
                        )}
                        {/* Çalışma Saatleri */}
                        {(() => {
                          const wh = getValues("workingHours") ?? [];
                          const hd = new Set(getValues("holidayDays") ?? []);
                          const rows = DAYS_TR.map((d) => {
                            const row = wh.find((w: any) => w.dayOfWeek === d.day);
                            const isHoliday = hd.has(d.day);
                            if (!row) return null;
                            return { label: d.full, isClosed: isHoliday || row.isClosed, start: row.startTime, end: row.endTime };
                          }).filter(Boolean);
                          if (rows.length === 0) return null;
                          return (
                            <View className="py-1.5" style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor }}>
                              <Text className="text-gray-400 text-sm mb-1">{t("form.workingHours")}</Text>
                              {rows.map((r: any, i: number) => (
                                <View key={i} className="flex-row justify-between py-0.5">
                                  <Text className="text-sm" style={{ color: colors.sectionHeaderText }}>{r.label}</Text>
                                  <Text className="text-sm" style={{ color: r.isClosed ? '#ef4444' : '#fea60e' }}>
                                    {r.isClosed ? "Kapalı" : `${r.start} - ${r.end}`}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          );
                        })()}
                        <PreviewRow label={t("form.addressDescription")} value={getValues("location.addressDescription") ?? ""} colors={colors} />
                      </View>
                    </View>
                  </>
                )}
              </Animated.View>
            </ScrollView>
            <View className="px-6 my-3 flex-row gap-3">
              {currentStep > 0 && (
                <Button
                  className="flex-1"
                  mode="outlined"
                  onPress={handlePrevStep}
                  buttonColor="#ffb900"
                  textColor="#ffb900"
                >
                  {t("form.stepPrev")}
                </Button>
              )}
              {currentStep < totalSteps - 1 ? (
                <Button
                  className="flex-1"
                  mode="contained"
                  onPress={handleNextStep}
                  buttonColor="#ffb900"
                  textColor="#1F2937"
                >
                  {t("form.stepNext")}
                </Button>
              ) : (
                <Button
                  className="flex-1"
                  disabled={updateLoading || isSubmitting}
                  loading={updateLoading || isSubmitting}
                  mode="contained"
                  onPress={handleSubmit(OnSubmit)}
                  buttonColor="#10B981"
                  textColor="white"
                  labelStyle={{ fontSize: 16 }}
                >
                  Güncelle
                </Button>
              )}
            </View>
            <BarberEditModal
              visible={barberModalVisible}
              title={barberModalTitle}
              initialValues={barberInitialValues}
              onClose={closeBarberModal}
              storeId={storeId}
            />
            <ChairEditModal
              visible={chairModalVisible}
              title={chairModalTitle}
              initialValues={chairInitialValues}
              barbers={chairAvailableBarbers}
              onClose={closeChairModal}
              storeId={storeId}
            />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
});

export default FormStoreUpdate;
