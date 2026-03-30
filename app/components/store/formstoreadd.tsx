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
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Avatar, Chip, Divider, HelperText, Icon, IconButton, TextInput } from "react-native-paper";
import { Button } from "../common/Button";
import { useForm, Controller, useWatch, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  handlePickImage,
  handlePickMultipleImages,
  truncateFileName,
} from "../../utils/form/pick-document";
import { Dropdown } from "react-native-element-dropdown";
import { CategoryListSelect } from "../common/CategoryListSelect";
import {
  BUSINESS_TYPES,
  trMoneyRegex,
  PRICING_OPTIONS,
  DAYS_TR,
  IST,
} from "../../constants";
import {
  useAddBarberStoreMutation,
  useLazyGetMineStoresQuery,
  useUploadImageMutation,
  useUploadMultipleImagesMutation,
} from "../../store/api";
import { useCategoryHierarchy } from "../../hook/useCategoryHierarchy";
import "react-native-get-random-values";
import { v4 as uuid } from "uuid";
import {
  fmtHHmm,
  fromHHmm,
  HOLIDAY_OPTIONS,
  timeHHmmRegex,
  toMinutes,
} from "../../utils/time/time-helper";
import DateTimePicker from "@react-native-community/datetimepicker";
import { parseTR } from "../../utils/form/money-helper";
import * as Location from "expo-location";
import { MapPicker } from "../common/mappicker";
import { BarberStoreCreateDto, ImageOwnerType } from "../../types";
import { getErrorMessage } from "../../utils/errorHandler";
import { useAppDispatch } from "../../store/hook";
import { showSnack } from "../../store/snackbarSlice";
import { useCanPerformAction } from "../../hook/useCanPerformAction";
import { mapBarberType, mapPricingType } from "../../utils/form/form-mappers";
import { resolveMimeType } from "../../utils/form/pick-document";
import { ChairItem } from "./ChairItem";
import { WorkingHoursAccordion } from "./WorkingHoursAccordion";
import { ManuelBarberItem } from "./ManuelBarberItem";
import { useOptimizedChairOptions } from "../../hooks/useOptimizedFieldArray";
import { useAuth } from "../../hook/useAuth";
import { useLanguage } from "../../hook/useLanguage";
import { useTheme } from "../../hook/useTheme";
import { useActionGuard } from "../../hook/useActionGuard";
import { MESSAGES } from "../../constants/messages";
import { ensureLocationGateWithUI } from "../location/location-gate";
import { LocationStatus } from "../../types";
import { StepFormIndicator } from "../common/StepFormIndicator";
import { extractCreatedStoreIdFromResponse } from "../../utils/form/store-create-response";

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

const createBarberSchema = (t: (key: string) => string) =>
  z.object({
    id: z.string(),
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

const createChairSchema = (t: (key: string) => string) =>
  z
    .object({
      id: z.string(),
      mode: z.enum(["named", "barber"]),
      name: z.string().trim().optional(),
      barberId: z.string().optional(),
    })
    .superRefine((v, ctx) => {
      if (v.mode === "named") {
        if (!v.name || !v.name.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["name"],
            message: t("form.chairNameRequired"),
          });
        }
      } else {
        if (!v.barberId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["barberId"],
            message: t("form.barberSelectionRequired"),
          });
        }
      }
    });

const createSchema = (t: (key: string) => string) =>
  z.object({
    storeImages: z
      .array(
        z.object({
          uri: z.string().min(1),
          name: z.string().min(1),
          type: z.string().min(1),
        }),
      )
      .max(3, t("form.maxImages"))
      .optional(),
    storeName: z.string({ required_error: t("form.storeNameRequired") }).trim().min(2, t("form.storeNameMin")),
    type: z.string({ required_error: t("form.storeTypeRequired") }),
    // Ana başlıklar (seçilen main kategorilere göre)
    selectedMainHeadings: z.array(z.string()).optional(),
    // Alt başlıklar (seçilen ana başlıklara göre)
    selectedSubHeadings: z.array(z.string()).optional(),
    // Hizmetler (seçilen alt başlıklara göre) - final seçim
    selectedCategories: z.array(z.string()).min(1, t("form.atLeastOneService")),
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
  });

const createFullSchema = (t: (key: string) => string) =>
  createSchema(t)
    .extend({
      barbers: z.array(createBarberSchema(t)).default([]),
      chairs: z.array(createChairSchema(t)).default([]),
    })
    .superRefine((data, ctx) => {
      if (data.type && String(data.type).trim()) {
        if (!data.selectedMainHeadings || data.selectedMainHeadings.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("form.mainHeadingsRequired"),
            path: ["selectedMainHeadings"],
          });
        }
      }
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
      const norm = (s?: string) => (s ?? "").trim().toLowerCase();
      const nameToIdxs = new Map<string, number[]>();
      barbers.forEach((b, i) => {
        const k = norm(b.name);
        if (!k) return;
        nameToIdxs.set(k, [...(nameToIdxs.get(k) ?? []), i]);
      });
      for (const [, idxs] of nameToIdxs) {
        if (idxs.length > 1) {
          idxs.forEach((i) =>
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["barbers", i, "name"],
              message: t("form.duplicateBarberName"),
            }),
          );
        }
      }
      const assigned = new Map<string, number[]>();
      chairs.forEach((c, i) => {
        if (c.mode === "barber" && c.barberId) {
          assigned.set(c.barberId, [...(assigned.get(c.barberId) ?? []), i]);
        }
      });
      for (const [, idxs] of assigned) {
        if (idxs.length > 1) {
          idxs.forEach((i) =>
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["chairs", i, "barberId"],
              message: t("form.barberAssignedToAnotherChair"),
            }),
          );
        }
      }
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

export type FormValues = z.input<ReturnType<typeof createFullSchema>>;

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

type Props = {
  onClose?: () => void;
  error?: any; // API error durumu (optional, component içinde de kontrol edilir)
  locationStatus?: LocationStatus; // Location status (optional, component içinde de kontrol edilir)
};
const FormStoreAdd = ({
  onClose,
  error: propError,
  locationStatus: propLocationStatus,
}: Props) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const stepSlideAnim = useRef(new Animated.Value(0)).current;
  const prevStepRef = useRef(0);

  const { userId } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const { colors, isDark } = useTheme();
  const dropdownItemActiveBg = isDark
    ? "rgba(194, 165, 35, 0.22)"
    : "rgba(139, 115, 85, 0.16)";

  const stepLabels = useMemo(() => [
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

  const steps = useMemo(
    () => stepLabels.map((label, i) => ({ id: `step-${i}`, label })),
    [stepLabels],
  );
  const totalSteps = stepLabels.length;

  const stepFields: Record<number, (keyof FormValues)[]> = useMemo(() => ({
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

  const fullSchema = useMemo(() => createFullSchema(t), [t, currentLanguage]);
  const resolver = useMemo(() => zodResolver(fullSchema), [fullSchema]);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>(
    propLocationStatus || "unknown",
  );

  // Location status kontrolü (component içinde)
  useEffect(() => {
    if (propLocationStatus) {
      setLocationStatus(propLocationStatus);
    } else {
      ensureLocationGateWithUI().then((gate) => {
        setLocationStatus(
          gate.ok
            ? "granted"
            : gate.reason === "permission"
              ? "denied"
              : "unknown",
        );
      });
    }
  }, [propLocationStatus]);

  // Error kontrolü: mutation error'ları da kontrol et
  const [addStore, { isLoading, isSuccess, error: mutationError }] =
    useAddBarberStoreMutation();
  const error = propError || mutationError;

  // Action kontrolü: Error veya location denied durumunda işlem yapılamaz
  const { checkAndAlert: checkCanPerformAction } = useCanPerformAction(
    error,
    locationStatus,
    "Bu işlemi gerçekleştirmek için konum izni gereklidir. Lütfen ayarlardan konum iznini açın.",
  );
  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    trigger,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver,
    shouldFocusError: true,
    mode: "onChange",
    defaultValues: {
      holidayDays: [],
      selectedCategories: [],
      prices: {},
      workingHours: DAYS_TR.map((d) => ({
        dayOfWeek: d.day,
        isClosed: false,
        startTime: "09:00",
        endTime: "18:00",
      })),
      location: {
        latitude: IST.latitude,
        longitude: IST.longitude,
        addressDescription: "",
      },
      barbers: [],
      chairs: [],
      pricingType: { mode: "rent", rent: "", percent: undefined },
    },
  });

  const validateStep = useCallback(async (stepIndex: number): Promise<boolean> => {
    const fields = stepFields[stepIndex];
    if (!fields) return true;
    return trigger(fields as any);
  }, [trigger, stepFields]);

  const handleNextStep = useCallback(async () => {
    const valid = await validateStep(currentStep);
    if (!valid) return;
    setCompletedSteps((prev) => new Set(prev).add(currentStep));
    if (currentStep < totalSteps - 1) setCurrentStep((s) => s + 1);
  }, [currentStep, totalSteps, validateStep]);

  const handlePrevStep = useCallback(() => {
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

  const handleStepPress = useCallback((index: number) => {
    setCurrentStep(index);
  }, []);

  const [triggerGetMineStores] = useLazyGetMineStoresQuery();
  const [uploadMultipleImages] = useUploadMultipleImagesMutation();
  const [uploadImage] = useUploadImageMutation();
  const guard = useActionGuard();
  const [isImagePickerLoading, setIsImagePickerLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Dil değiştiğinde validation'ı tetikle
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      trigger();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage]);

  const images = watch("storeImages");
  const selectedType = watch("type");
  const selectedMainHeadings = watch("selectedMainHeadings") ?? [];
  const selectedSubHeadings = watch("selectedSubHeadings") ?? [];
  const selectedCategories = watch("selectedCategories") ?? [];
  const currentPrices = watch("prices");

  // Kategori hiyerarşisi - tek API çağrısı ile tüm kategoriler
  const {
    parentCategories,
    mainHeadings,
    subHeadings,
    services,
  } = useCategoryHierarchy({
    selectedType,
    selectedMainHeadings,
    selectedSubHeadings,
  });
  const pricingMode = useWatch({ control, name: "pricingType.mode" });
  const holidayDays = watch("holidayDays");
  const working = watch("workingHours");
  const latitude = watch("location.latitude");
  const longitude = watch("location.longitude");
  const address = watch("location.addressDescription");
  const dispatch = useAppDispatch();
  const OnSubmit = async (data: FormValues) => {
    console.log(data);
    // Error veya location denied kontrolü
    if (!checkCanPerformAction()) {
      return;
    }
    // Double submit önleme - hem isSubmitting hem de isLoading kontrolü
    if (isSubmitting || isLoading) {
      return;
    }
    setIsSubmitting(true);
    const hasUploads =
      (data.storeImages?.length ?? 0) > 0 ||
      (data.barbers ?? []).some((b) => b.avatar?.uri);

    // Tax document image upload (tekli resim)
    let taxDocumentImageId: string | undefined;
    if (data.taxDocumentImage) {
      if (!userId) {
        dispatch(
          showSnack({
            message: MESSAGES.PROFILE.USER_NOT_FOUND,
            isError: true,
          }),
        );
        setIsSubmitting(false);
        return;
      }
      const formData = new FormData();
      formData.append("file", {
        uri: data.taxDocumentImage.uri,
        name: data.taxDocumentImage.name ?? "tax-document.jpg",
        type: resolveMimeType(data.taxDocumentImage.type, data.taxDocumentImage.name),
      } as any);
      formData.append("ownerType", String(ImageOwnerType.User));
      formData.append("ownerId", userId);

      const uploadRes = await uploadImage({ data: formData, isProfileImage: false });
      if ("error" in uploadRes) {
        // eslint-disable-next-line no-console
        console.log("taxDocument uploadImage error", uploadRes.error);
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

    const payload: BarberStoreCreateDto = {
      storeName: data.storeName,
      type: mapBarberType(data.type),
      pricingType: mapPricingType(data.pricingType.mode),
      addressDescription: data.location.addressDescription ?? "",
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      pricingValue:
        data.pricingType.mode == "percent"
          ? data.pricingType.percent!
          : (parseTR(data.pricingType.rent ?? undefined) ?? 0),
      taxDocumentImageId: taxDocumentImageId,
      chairs: data.chairs!.map((c) => {
        return {
          id: c.id,
          barberId: c.barberId,
          name: c.name,
          storeId: undefined,
        };
      }),
      offerings: (data.selectedCategories ?? [])
        .map((categoryId) => {
          const priceStr = data.prices?.[categoryId] ?? "";
          const priceNum = parseTR(priceStr);
          if (priceNum == null) return null;

          // Category name'i bul (services hook'tan geliyor)
          const categoryName =
            services.find((cat) => cat.id === categoryId)?.name ??
            categoryId;

          return {
            serviceName: categoryName,
            price: priceNum,
          };
        })
        .filter((x): x is { serviceName: string; price: number } => x !== null),
      manuelBarbers: (data.barbers || []).map((barber) => {
        return {
          id: barber.id,
          fullName: barber.name,
          storeId: undefined,
        };
      }),
      workingHours: data.workingHours,
    };
    const storeResult = await addStore(payload);
    if ("error" in storeResult) {
      // Debug log: network / API error details for store create/update
      // Özellikle "Servise ulaşılamadı" hatasını kök nedenine inmek için.
      // NOT: Production'da da kalabilir; sadece konsola yazar.
      // eslint-disable-next-line no-console
      console.log("addBarberStore error", storeResult.error);
      const errorMessage = getErrorMessage(storeResult.error);
      dispatch(
        showSnack({
          message: errorMessage || MESSAGES.FORM.STORE_CREATE_ERROR,
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
          message: result?.message || MESSAGES.FORM.STORE_CREATE_ERROR,
          isError: true,
        }),
      );
      setIsSubmitting(false);
      return;
    }

    // Store oluşturma başarılı, şimdi resim işlemleri
    let uploadError: string | null = null;
    if (hasUploads) {
      const createdStoreId = extractCreatedStoreIdFromResponse(storeResult.data);
      if (!createdStoreId) {
        uploadError = MESSAGES.FORM.STORE_ID_NOT_FOUND;
      } else {
        // Store resimleri yükle
        if ((data.storeImages ?? []).length > 0 && !uploadError) {
          const formData = new FormData();
          (data.storeImages ?? []).forEach((img) => {
            formData.append("files", {
              uri: img.uri,
              name: img.name ?? "photo.jpg",
              type: resolveMimeType(img.type, img.name),
            } as any);
          });
          formData.append("ownerType", String(ImageOwnerType.Store));
          formData.append("ownerId", createdStoreId);
          const uploadRes = await uploadMultipleImages(formData);
          if ("error" in uploadRes) {
            // eslint-disable-next-line no-console
            console.log("store uploadMultipleImages error", uploadRes.error);
            uploadError =
              getErrorMessage(uploadRes.error) ||
              MESSAGES.FORM.STORE_IMAGES_UPLOAD_ERROR;
          } else if (!uploadRes.data?.success) {
            uploadError =
              uploadRes.data?.message ||
              MESSAGES.FORM.STORE_IMAGES_UPLOAD_ERROR;
          }
        }

        // Berber resimleri paralel yükle
        if (!uploadError) {
          const barbersWithImages = (data.barbers ?? []).filter(
            (b) => b.avatar?.uri,
          );
          const barberUploadResults = await Promise.all(
            barbersWithImages.map(async (barber) => {
              const formData = new FormData();
              formData.append("file", {
                uri: barber.avatar!.uri,
                name: barber.avatar!.name ?? "photo.jpg",
                type: resolveMimeType(barber.avatar!.type, barber.avatar!.name),
              } as any);
              formData.append("ownerType", String(ImageOwnerType.ManuelBarber));
              formData.append("ownerId", barber.id);
              return uploadImage({ data: formData, isProfileImage: false });
            }),
          );
          for (const uploadRes of barberUploadResults) {
            if ("error" in uploadRes) {
              // eslint-disable-next-line no-console
              console.log("barber uploadImage error", uploadRes.error);
              uploadError =
                getErrorMessage(uploadRes.error) ||
                MESSAGES.FORM.BARBER_IMAGE_UPLOAD_ERROR;
              break;
            }
            if (!uploadRes.data?.success) {
              uploadError =
                uploadRes.data?.message ||
                MESSAGES.FORM.BARBER_IMAGE_UPLOAD_ERROR;
              break;
            }
          }
        }
      }
    }

    if (uploadError) {
      dispatch(
        showSnack({
          message: `${MESSAGES.FORM.STORE_IMAGES_UPLOAD_ERROR} ${uploadError}`,
          isError: true,
        }),
      );
    } else {
      dispatch(
        showSnack({
          message: result.message || MESSAGES.FORM.STORE_CREATE_SUCCESS,
          isError: false,
        }),
      );
    }

    // Refresh stores list to show new store with images
    await triggerGetMineStores();
    onClose?.();
    setIsSubmitting(false);
  };
  const {
    fields: barberFields,
    append: addBarber,
    remove: removeBarber,
    update: updateBarber,
  } = useFieldArray({ control, name: "barbers", keyName: "_key" });
  const {
    fields: chairFields,
    append: addChair,
    remove: removeChair,
  } = useFieldArray({ control, name: "chairs", keyName: "_key" });

  // Optimized chair options hook
  const { getBarberOptions } = useOptimizedChairOptions(
    control,
    "barbers",
    "chairs",
  );

  const barbers = useWatch({ control, name: "barbers" }) ?? [];
  const chairs = useWatch({ control, name: "chairs" }) ?? [];

  const validBarbers = React.useMemo(
    () => (barbers ?? []).filter((b) => !!b.name?.trim()),
    [barbers],
  );

  useEffect(() => {
    const validIds = new Set(validBarbers.map((b) => b.id));
    (chairs ?? []).forEach((c, idx) => {
      if (c.mode === "barber" && (!c.barberId || !validIds.has(c.barberId))) {
        setValue(`chairs.${idx}.barberId` as const, undefined, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    });
  }, [validBarbers]);

  const pickMultipleImages = async () => {
    setIsImagePickerLoading(true);
    try {
      const currentImages = getValues("storeImages") || [];
      const remainingSlots = 3 - currentImages.length;
      if (remainingSlots <= 0) {
        dispatch(showSnack({ message: t("form.maxImages"), isError: true }));
        return;
      }
      const files = await handlePickMultipleImages(remainingSlots);
      if (files && files.length > 0) {
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

  // Type değişince alt seviyeleri reset et
  const prevTypeRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevTypeRef.current !== undefined && prevTypeRef.current !== selectedType) {
      setValue("selectedMainHeadings", [], {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("selectedSubHeadings", [], {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("selectedCategories", [], {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("prices", {}, { shouldDirty: true, shouldValidate: true });
      // Hook otomatik olarak services'ı günceller
    }
    prevTypeRef.current = selectedType;
  }, [selectedType, setValue]);

  // Ana başlıklar değişince alt seviyeleri reset et
  const prevMainHeadingsRef = useRef<string[]>([]);
  useEffect(() => {
    const sortedKey = (arr: string[]) => [...arr].sort().join(",");
    const mainHeadingsChanged =
      sortedKey(prevMainHeadingsRef.current) !==
      sortedKey(selectedMainHeadings);

    if (mainHeadingsChanged && prevMainHeadingsRef.current.length > 0) {
      setValue("selectedSubHeadings", [], {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("selectedCategories", [], {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("prices", {}, { shouldDirty: true, shouldValidate: true });
      // Hook otomatik olarak services'ı günceller
    }
    prevMainHeadingsRef.current = [...selectedMainHeadings];
  }, [selectedMainHeadings, setValue]);

  // Alt başlıklar değişince hizmetleri reset et
  const prevSubHeadingsRef = useRef<string[]>([]);
  useEffect(() => {
    const sortedKey = (arr: string[]) => [...arr].sort().join(",");
    const subHeadingsChanged =
      sortedKey(prevSubHeadingsRef.current) !==
      sortedKey(selectedSubHeadings);

    if (subHeadingsChanged && prevSubHeadingsRef.current.length > 0) {
      setValue("selectedCategories", [], {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("prices", {}, { shouldDirty: true, shouldValidate: true });
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

    Object.keys(next).forEach((k) => {
      if (!selectedCategories?.includes(k)) {
        delete next[k];
        changed = true;
      }
    });

    (selectedCategories ?? []).forEach((k) => {
      if (!(k in next)) {
        next[k] = "";
        changed = true;
      }
    });

    if (changed) {
      // Use shouldValidate: false to prevent validation cascade
      setValue("prices", next, { shouldDirty: true, shouldValidate: false });
    }
  }, [selectedCategories?.length, setValue, getValues]);
  useEffect(() => {
    if (pricingMode === "rent") {
      setValue("pricingType.percent", null, {
        shouldValidate: false,
        shouldDirty: false,
      });
    } else if (pricingMode === "percent") {
      setValue("pricingType.rent", null, {
        shouldValidate: false,
        shouldDirty: false,
      });
    }
  }, [pricingMode, setValue]);
  // FIX: Use holidayDays length/stringified version to avoid infinite loop
  const holidayDaysRef = useRef<string>("");
  useEffect(() => {
    const holidayDaysStr = JSON.stringify(holidayDays ?? []);
    if (holidayDaysStr === holidayDaysRef.current) return;
    holidayDaysRef.current = holidayDaysStr;

    const set = new Set(holidayDays ?? []);
    const curr = getValues("workingHours") ?? [];
    curr.forEach((w, i) => {
      setValue(`workingHours.${i}.isClosed`, set.has(w.dayOfWeek), {
        shouldDirty: true,
        shouldValidate: true,
      });
    });
  }, [holidayDays?.length, getValues, setValue]);
  const updateLocation = (latitude: number, longitude: number) => {
    const addr = getValues("location.addressDescription") ?? "";
    setValue(
      "location",
      { latitude: latitude, longitude: longitude, addressDescription: addr },
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    );
  };
  const hasAutoPickedLocationRef = useRef(false);

  useEffect(() => {
    reverseAndSetAddress(IST.latitude, IST.longitude);
  }, []);

  // Harita adımına (step 8) gelindiğinde otomatik olarak kullanıcının konumunu al
  useEffect(() => {
    if (currentStep === 8 && !hasAutoPickedLocationRef.current) {
      hasAutoPickedLocationRef.current = true;
      pickMyCurrentLocation().catch(() => { });
    }
  }, [currentStep]);

  async function getPermissionOrAsk() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === "granted";
  }
  async function pickMyCurrentLocation() {
    const ok = await getPermissionOrAsk();
    if (!ok) {
      alert("Konum izni gerekli.");
      return;
    }
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude } = pos.coords;
    updateLocation(latitude, longitude);
    await reverseAndSetAddress(latitude, longitude);
  }
  async function reverseAndSetAddress(latitude: number, longitude: number) {
    try {
      const [rev] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (rev) {
        const line = [
          rev.name,
          rev.district,
          rev.subregion,
          rev.region,
          rev.country,
        ]
          .filter(Boolean)
          .join(", ");

        if (line) {
          setValue("location.addressDescription", line, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
      }
    } catch { }
  }
  const taxDocErrorText =
    (errors.taxDocumentImage as any)?.message ||
    (errors.taxDocumentImage as any)?.name?.message;
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <View className="h-full" style={{ backgroundColor: colors.sheetBg }}>
        <View className="flex-row justify-between items-center px-2">
          <Text className="text-white flex-1 font-century-gothic text-2xl" style={{ color: colors.sectionHeaderText }}>
            İşletme Ekle
          </Text>
          <IconButton onPress={onClose} icon="close" iconColor={colors.sectionHeaderText} />
        </View>
        <Divider style={{ borderWidth: 0.1, backgroundColor: colors.borderColor }} />
        <StepFormIndicator
          steps={steps}
          currentStep={currentStep}
          onStepPress={handleStepPress}
          canNavigateFreely={false}
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
                <Text className="text-white text-xl mt-4 px-2" style={{ color: colors.sectionHeaderText }}>
                  {t("form.storeImagesTitle")}
                </Text>
                <Controller
                  control={control}
                  name="storeImages"
                  render={() => (
                    <View className="mt-4">
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 8, gap: 12 }}
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
                            />
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
                            style={{ width: 260, height: 200, backgroundColor: colors.cardBg, borderColor: colors.borderColor, borderWidth: 1 }}
                            activeOpacity={0.85}
                          >
                            {isImagePickerLoading ? (
                              <ActivityIndicator size="large" color="#888" />
                            ) : (
                              <>
                                <Icon source="image-plus" size={40} color="#888" />
                                <Text className="text-gray-500 mt-2">
                                  {t("image.add")}
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                      </ScrollView>
                    </View>
                  )}
                />
                <Text className="text-white text-xl mt-6 px-2" style={{ color: colors.sectionHeaderText }}>
                  İşletme Bilgileri
                </Text>
                <View className="mt-2 px-2">
                  <Controller
                    control={control}
                    name="taxDocumentImage"
                    render={({ field: { value, onChange } }) => (
                      <>
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={async () => {
                            const file = await handlePickImage();
                            if (!file) return;
                            onChange(file);
                          }}
                        >
                          <TextInput
                            label={t("form.taxDocumentImage")}
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
                              errors.taxDocumentImage ? "#b00020" : colors.borderColor
                            }
                            right={<TextInput.Icon icon="image" color={colors.sectionHeaderText} />}
                            theme={{
                              roundness: 10,
                              colors: { onSurfaceVariant: colors.textSecondary, primary: colors.sectionHeaderText },
                            }}
                            style={{ backgroundColor: colors.cardBg, borderWidth: 0 }}
                          />
                        </TouchableOpacity>
                        <HelperText type="error" visible={!!errors.taxDocumentImage} style={{ fontFamily: 'CenturyGothic' }}>
                          {taxDocErrorText}
                        </HelperText>
                        {value?.uri && (
                          <View className="mt-2 relative w-full rounded-xl overflow-hidden" style={{ backgroundColor: colors.cardBg }}>
                            <Image
                              source={{ uri: value.uri }}
                              style={{ width: "100%", height: 200 }}
                              resizeMode="cover"
                            />
                            <TouchableOpacity
                              onPress={() => onChange(undefined as any)}
                              className="absolute top-2 right-2 bg-red-500 rounded-full p-1.5"
                              activeOpacity={0.85}
                            >
                              <Icon source="close" size={18} color="white" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </>
                    )}
                  />
                  <View className="flex-row gap-3 mt-6">
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
                              outlineColor={errors.storeName ? "#b00020" : colors.borderColor}
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
                        render={({ field: { value, onChange } }) => (
                          <>
                            <Dropdown
                              data={parentCategories.map((cat: any) => ({
                                label: cat.name,
                                value: cat.name,
                              }))}
                              labelField="label"
                              valueField="value"
                              placeholder={t("form.selectMainCategory")}
                              value={value}
                              onChange={(item: { label: string; value: string }) => {
                                onChange(item.value);
                              }}
                              style={{
                                height: 42,
                                borderRadius: 10,
                                paddingHorizontal: 12,
                                backgroundColor: colors.cardBg,
                                borderWidth: 1,
                                borderColor: errors.type ? "#b00020" : colors.borderColor,
                                justifyContent: "center",
                                marginTop: 0,
                              }}
                              placeholderStyle={{
                                color: colors.textSecondary,
                                fontFamily: "CenturyGothic",
                              }}
                              selectedTextStyle={{
                                color: colors.sectionHeaderText,
                                fontFamily: "CenturyGothic",
                              }}
                              itemTextStyle={{
                                color: colors.sectionHeaderText,
                                fontFamily: "CenturyGothic",
                              }}
                              containerStyle={{
                                backgroundColor: colors.cardBg,
                                borderWidth: 0,
                                borderRadius: 10,
                                overflow: "hidden",
                              }}
                              activeColor={dropdownItemActiveBg}
                            />
                            <HelperText
                              className="text-4xl"
                              type="error"
                              visible={!!errors.type}
                            >
                              {errors.type?.message}
                            </HelperText>
                          </>
                        )}
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
                    <>
                      <Text className="text-gray-400 text-center py-8">
                        {t("form.stepMainHeadings")} - {t("form.selectMainCategory")}
                      </Text>
                      <HelperText type="info" visible style={{ fontFamily: "CenturyGothic" }}>
                        {t("form.categoryStepHelperMainHeadings")}
                      </HelperText>
                      <HelperText type="error" visible={!!errors.selectedMainHeadings} style={{ fontFamily: "CenturyGothic" }}>
                        {errors.selectedMainHeadings?.message as string}
                      </HelperText>
                    </>
                  ) : (
                    <>
                      <Text className="text-xl mb-3 font-century-gothic-bold" style={{ color: colors.sectionHeaderText }}>
                        {t("form.mainHeadings")} *
                      </Text>
                      <HelperText type="info" visible style={{ fontFamily: "CenturyGothic", marginTop: -8, marginBottom: 8 }}>
                        {t("form.categoryStepHelperMainHeadings")}
                      </HelperText>
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
                                visible={!!errors.selectedMainHeadings}
                                style={{ fontFamily: "CenturyGothic" }}
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
                    <>
                      <Text className="text-gray-400 text-center py-8">
                        {t("form.stepSubHeadings")} - {t("form.selectMainHeadings")}
                      </Text>
                      <HelperText type="info" visible style={{ fontFamily: "CenturyGothic" }}>
                        {t("form.categoryStepHelperSubHeadings")}
                      </HelperText>
                      <HelperText type="error" visible={!!errors.selectedSubHeadings} style={{ fontFamily: "CenturyGothic" }}>
                        {errors.selectedSubHeadings?.message as string}
                      </HelperText>
                    </>
                  ) : (
                    <>
                      <Text className="text-xl mb-3 font-century-gothic-bold" style={{ color: colors.sectionHeaderText }}>
                        {t("form.subHeadings")} *
                      </Text>
                      <HelperText type="info" visible style={{ fontFamily: "CenturyGothic", marginTop: -8, marginBottom: 8 }}>
                        {t("form.categoryStepHelperSubHeadings")}
                      </HelperText>
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
                                visible={!!errors.selectedSubHeadings}
                                style={{ fontFamily: "CenturyGothic" }}
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
                    <>
                      <Text className="text-gray-400 text-center py-8">
                        {t("form.stepStoreServices")} - {t("form.selectSubHeadings")}
                      </Text>
                      <HelperText type="info" visible style={{ fontFamily: "CenturyGothic" }}>
                        {t("form.categoryStepHelperServicesStore")}
                      </HelperText>
                      <HelperText type="error" visible={!!errors.selectedCategories} style={{ fontFamily: "CenturyGothic" }}>
                        {errors.selectedCategories?.message as string}
                      </HelperText>
                    </>
                  ) : (
                    <>
                      <Text className="text-xl mb-3 font-century-gothic-bold" style={{ color: colors.sectionHeaderText }}>
                        {t("form.servicesTitle")} ({selectedType}) *
                      </Text>
                      <HelperText type="info" visible style={{ fontFamily: "CenturyGothic", marginTop: -8, marginBottom: 8 }}>
                        {t("form.categoryStepHelperServicesStore")}
                      </HelperText>
                      <View className="rounded-xl p-3" style={{ borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardBg }}>
                        <Controller
                          control={control}
                          name="selectedCategories"
                          render={({ field: { value, onChange } }) => (
                            <>
                              <CategoryListSelect
                                data={categoryOptions}
                                value={(value ?? []) as string[]}
                                onChange={onChange}
                              />
                              <HelperText
                                type="error"
                                visible={!!errors.selectedCategories}
                                style={{ fontFamily: "CenturyGothic" }}
                              >
                                {errors.selectedCategories?.message}
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
            {currentStep === 4 && (
              <>
                <View className="mt-2 px-2">
                  {!selectedCategories || selectedCategories.length === 0 ? (
                    <Text className="text-gray-400 text-center py-8">
                      {t("form.stepStorePrices")} - {t("form.selectService")}
                    </Text>
                  ) : (
                    <>
                      <Text className="text-xl mb-3 font-century-gothic-bold" style={{ color: colors.sectionHeaderText }}>
                        {t("form.stepStorePrices")} *
                      </Text>
                      <View
                        className="rounded-xl p-3"
                        style={{
                          borderWidth: 1,
                          borderColor: colors.borderColor,
                          backgroundColor: colors.cardBg,
                        }}
                      >
                        {selectedCategories.map((categoryId) => {
                          const label =
                            categoryOptions.find((i) => i.value === categoryId)
                              ?.label ?? categoryId;
                          return (
                            <View key={categoryId}>
                              <View className="flex-row items-center gap-2 mb-0">
                                <Text className="text-white w-[35%]" style={{ color: colors.sectionHeaderText }}>{label} :</Text>
                                <View className="w-[65%]">
                                  <Controller
                                    control={control}
                                    name={`prices.${categoryId}` as const}
                                    render={({
                                      field: { value, onChange },
                                      fieldState: { error },
                                    }) => (
                                      <TextInput
                                        mode="outlined"
                                        dense
                                        keyboardType="numeric"
                                        label={t("form.priceLabel")}
                                        value={value ?? ""}
                                        onChangeText={(text) => {
                                          const raw = text.replace(/[^\d.,]/g, "");
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
                                        textColor={colors.sectionHeaderText}
                                        outlineColor={error ? "#b00020" : colors.borderColor}
                                        style={{
                                          backgroundColor: colors.cardBg,
                                          borderWidth: 0,
                                          marginTop: 20,
                                          height: 35,
                                        }}
                                        theme={{
                                          roundness: 10,
                                          colors: {
                                            onSurfaceVariant: colors.textSecondary,
                                            primary: colors.sectionHeaderText,
                                          },
                                        }}
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
                    </>
                  )}
                </View>
              </>
            )}
            {currentStep === 5 && (
              <>
                <View
                  className="mx-2 mt-2 mb-3 rounded-xl px-3 py-3"
                  style={{
                    backgroundColor: isDark ? "rgba(194, 165, 35, 0.12)" : "rgba(194, 165, 35, 0.08)",
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(194, 165, 35, 0.28)" : "rgba(194, 165, 35, 0.35)",
                  }}
                >
                  <Text style={{ fontFamily: "CenturyGothic", fontSize: 14, lineHeight: 21, color: colors.sectionHeaderText }}>
                    {t("form.staffStepIntro")}
                  </Text>
                </View>
                <View className="mt-2 mx-0 flex-row items-center px-2">
                  <Text className="text-white text-xl flex-1" style={{ color: colors.sectionHeaderText }}>
                    {t("form.workingBarbersCount")} : {barberFields.length}{" "}
                  </Text>
                  <Button
                    mode="text"
                    textColor="#c2a523"
                    onPress={() =>
                      addBarber({ id: uuid(), name: "", avatar: null })
                    }
                  >
                    {t("form.addBarber")}
                  </Button>
                </View>
                {barberFields.length > 0 && (
                  <View
                    className="rounded-xl mx-2 px-3 pt-3 pb-2"
                    style={{
                      backgroundColor: colors.cardBg,
                      borderWidth: 1,
                      borderColor: colors.borderColor,
                    }}
                  >
                    {barberFields.map((item, index) => (
                      <ManuelBarberItem
                        key={item._key}
                        control={control}
                        index={index}
                        barberId={item.id}
                        avatarUri={barbers[index]?.avatar?.uri}
                        errors={errors}
                        onRemove={() => removeBarber(index)}
                        onAvatarPress={async () => {
                          const file = await handlePickImage();
                          if (file) {
                            updateBarber(index, {
                              ...(getValues(`barbers.${index}`) as any),
                              avatar: file,
                            });
                          }
                        }}
                      />
                    ))}
                    <HelperText type="error" visible={!!barberErrorText} style={{ fontFamily: 'CenturyGothic' }}>
                      {barberErrorText}
                    </HelperText>
                  </View>
                )}

                <View className="mt-1 mx-0 px-2 flex-row items-center">
                  <Text className="text-white text-xl flex-1" style={{ color: colors.sectionHeaderText }}>
                    {t("form.chairCount")} : {chairFields.length}
                  </Text>
                  <Button
                    mode="text"
                    textColor="#c2a523"
                    onPress={() =>
                      addChair({ id: uuid(), mode: "named", name: "" })
                    }
                  >
                    {t("form.addChair")}
                  </Button>
                </View>

                {chairFields.length > 0 && (
                  <View
                    className="rounded-xl mx-2 px-3 pt-3 pb-2"
                    style={{
                      backgroundColor: colors.cardBg,
                      borderWidth: 1,
                      borderColor: colors.borderColor,
                    }}
                  >
                    {chairFields.map((item, index) => (
                      <ChairItem
                        key={item._key}
                        control={control}
                        index={index}
                        chairId={item.id}
                        mode={chairs[index]?.mode ?? "named"}
                        barberOptions={getBarberOptions(item.id)}
                        errors={errors}
                        onRemove={() => removeChair(index)}
                        onModeChange={(mode) => {
                          setValue(`chairs.${index}.mode`, mode, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          if (mode === "named") {
                            setValue(`chairs.${index}.barberId`, undefined, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          } else {
                            setValue(`chairs.${index}.name`, undefined, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }
                        }}
                      />
                    ))}
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
                  <Text className="text-white font-century-gothic ml-0 pt-4 mt-4 pb-2 text-xl" style={{ color: colors.sectionHeaderText }}>
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
                              <Text className="text-white" style={{ color: colors.sectionHeaderText }}>{opt.label}</Text>
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
                                errors.pricingType?.rent ? "#b00020" : colors.borderColor
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
                              onChange={(item: { label: string; value: string }) =>
                                onChange(item.value)
                              }
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 10,
                                backgroundColor: colors.cardBg,
                                borderWidth: 1,
                                borderColor: errors.pricingType?.percent
                                  ? "#b00020"
                                  : colors.borderColor,
                                marginTop: 12,
                                height: 42,
                              }}
                              placeholderStyle={{
                                color: colors.textSecondary,
                                fontFamily: "CenturyGothic",
                              }}
                              selectedTextStyle={{
                                color: colors.sectionHeaderText,
                                fontFamily: "CenturyGothic",
                              }}
                              itemTextStyle={{
                                color: colors.sectionHeaderText,
                                fontFamily: "CenturyGothic",
                              }}
                              containerStyle={{
                                backgroundColor: colors.cardBg,
                                borderWidth: 1,
                                borderColor: colors.borderColor,
                                borderRadius: 10,
                                overflow: "hidden",
                              }}
                              activeColor={dropdownItemActiveBg}
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
                  <Text className="text-white font-century-gothic ml-0 pt-4 pb-2 text-xl" style={{ color: colors.sectionHeaderText }}>
                    {t("form.workingHours")}
                  </Text>
                  <View className="mt-2 mx-0 rounded-xl px-2 py-3" style={{ backgroundColor: colors.cardBg }}>
                    <WorkingHoursAccordion
                      working={working}
                      holidayDays={holidayDays}
                      errors={errors}
                      colors={{
                        cardBg: colors.cardBg,
                        cardBg2: colors.cardBg2,
                        sectionHeaderText: colors.sectionHeaderText,
                        textSecondary: colors.textSecondary,
                        borderColor: colors.borderColor,
                      }}
                      isDark={isDark}
                      setValue={setValue}
                      trigger={trigger}
                    />
                    <Text className="text-[#c2a523] font-century-gothic pt-2 pb-1 text-sm">
                      - {t("form.workingHoursInfo")}
                    </Text>
                  </View>
                </View>
              </>
            )}
            {currentStep === 8 && (
              <>
                <View className="px-2">
                  <Text className="text-white font-century-gothic ml-0 pt-4 pb-2 text-xl" style={{ color: colors.sectionHeaderText }}>
                    {t("form.setAddress")}
                  </Text>
                  <View className="mt-2 mx-0 rounded-xl px-2 py-3" style={{ backgroundColor: colors.cardBg }}>
                    <Text className="text-[#c2a523] font-century-gothic ml-0 pt-0 pb-2 text-sm">
                      - {t("form.addressInstruction")}
                    </Text>
                    <Button
                      mode="contained-tonal"
                      icon={"store"}
                      style={{ borderRadius: 12, marginVertical: 10 }}
                      onPress={pickMyCurrentLocation}
                      buttonColor="#10B981"
                      textColor="white"
                    >
                      İşletmenin konumunu al
                    </Button>
                    <MapPicker
                      lat={latitude ?? undefined}
                      lng={longitude ?? undefined}
                      address={address}
                      onChange={async (la, ln) => {
                        updateLocation(la, ln);
                        await reverseAndSetAddress(la, ln);
                      }}
                    />
                    <HelperText
                      type="error"
                      visible={
                        !!(errors.location?.latitude || errors.location?.longitude)
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
                              errors.location?.addressDescription ? "#b00020" : colors.borderColor
                            }
                            theme={{
                              roundness: 10,
                              colors: { onSurfaceVariant: colors.textSecondary, primary: colors.sectionHeaderText },
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
                            {errors.location?.addressDescription?.message as string}
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
                    {/* Mağaza Görselleri */}
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
                    <PreviewRow label={t("form.stepStoreInfo")} value={String(getValues("type") ?? "")} colors={colors} />
                    <PreviewRowList label={t("form.stepMainHeadings")} items={(getValues("selectedMainHeadings") ?? []).map((id: string) => mainHeadings.find((h: any) => h.id === id)?.name ?? id)} colors={colors} />
                    <PreviewRowList label={t("form.stepSubHeadings")} items={(getValues("selectedSubHeadings") ?? []).map((id: string) => subHeadings.find((h: any) => h.id === id)?.name ?? id)} colors={colors} />
                    <PreviewRowList label={t("form.servicesTitle")} items={(getValues("selectedCategories") ?? []).map((id: string) => services.find((s: any) => s.id === id)?.name ?? id)} colors={colors} />
                    {/* Fiyatlar */}
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
                    {(chairs ?? []).length > 0 && (
                      <View className="py-1.5" style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor }}>
                        <Text className="text-gray-400 text-sm mb-1">{"Berber Koltukları"}</Text>
                        {(chairs ?? []).map((chair: any, idx: number) => {
                          const isBarberChair = !!(chair.barberId) || chair.mode === "barber";
                          const barberName = isBarberChair && chair.barberId
                            ? (barbers.find((b: any) => b.id === chair.barberId)?.name ?? "—")
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
              disabled={isLoading || isSubmitting}
              loading={isLoading}
              mode="contained"
              onPress={handleSubmit((data) => guard(() => OnSubmit(data)))}
              buttonColor="#10B981"
              textColor="white"
              labelStyle={{ fontSize: 16 }}
            >
              Ekle
            </Button>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default React.memo(FormStoreAdd);
