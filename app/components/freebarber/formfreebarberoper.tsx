import React, { useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  ScrollView,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { Text } from "../common/Text";
import { Divider, HelperText, Icon, IconButton, Switch, TextInput } from "react-native-paper";
import { Button } from "../common/Button";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dropdown } from "react-native-element-dropdown";
import { CategoryListSelect } from "../common/CategoryListSelect";
import {
  handlePickMultipleImages,
  handlePickImage,
  truncateFileName,
} from "../../utils/form/pick-document";
import { parseTR } from "../../utils/form/money-helper";
import {
  ImageOwnerType,
  ServiceOfferingCreateDto,
  ServiceOfferingUpdateDto,
} from "../../types";
import { getErrorMessage } from "../../utils/errorHandler";
import { trMoneyRegex } from "../../constants";
import { getCurrentLocationSafe } from "../../utils/location/location-helper";
import { useAppDispatch } from "../../store/hook";
import { showSnack } from "../../store/snackbarSlice";
import {
  mapBarberType,
  mapTypeToDisplayName,
} from "../../utils/form/form-mappers";
import {
  useAddFreeBarberPanelMutation,
  useDeleteImageMutation,
  useLazyGetFreeBarberMinePanelQuery,
  useLazyGetFreeBarberMinePanelDetailQuery,
  useUpdateFreeBarberPanelMutation,
  useUploadMultipleImagesMutation,
  useUploadImageMutation,
  useUpdateImageBlobMutation,
} from "../../store/api";
import { useCategoryHierarchy } from "../../hook/useCategoryHierarchy";
import { useAuth } from "../../hook/useAuth";
import { useLanguage } from "../../hook/useLanguage";
import { CrudSkeletonComponent } from "../common/crudskeleton";
import { MESSAGES } from "../../constants/messages";
import { useCanPerformAction } from "../../hook/useCanPerformAction";
import { StepFormIndicator } from "../common/StepFormIndicator";
import { useTheme } from "../../hook/useTheme";
import { useActionGuard } from "../../hook/useActionGuard";

// --- Schema Definitions ---
const createLocationSchema = (t: (key: string) => string) =>
  z
    .object({
      latitude: z.number({ required_error: t("form.locationRequired") }),
      longitude: z.number({ required_error: t("form.locationRequired") }),
    })
    .refine((data) => data.latitude !== 0 && data.longitude !== 0, {
      message: t("form.locationRequired"),
      path: ["latitude"],
    });

const ImageAssetSchema = z.object({
  uri: z.string().min(1),
  name: z.string().min(1),
  type: z.string().optional(),
});

const createCertificateImageField = (t: (key: string) => string) =>
  z
    .custom<{
      uri: string;
      name: string;
      type?: string;
    }>(
      (v) =>
        !!v && typeof v === "object" && "uri" in (v as any) && (v as any).uri,
      { message: t("form.certificateImageRequired") },
    )
    .pipe(ImageAssetSchema)
    .optional();

const createSchema = (t: (key: string) => string) =>
  z.object({
    name: z
      .string({ required_error: t("form.nameRequired") })
      .trim()
      .min(1, t("form.minOneChar")),
    surname: z
      .string({ required_error: t("form.surnameRequired") })
      .trim()
      .min(1, t("form.minOneChar")),
    images: z
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
    // Ana kategori: sadece bir tane seçilebilir
    selectedMainCategories: z
      .array(z.string())
      .min(1, t("form.atLeastOneMainCategory"))
      .max(1, t("form.onlyOneMainCategory")),
    // Güzellik salonu belgesi opsiyonel
    beautySalonCertificateImage: createCertificateImageField(t),
    // Güzellik salonu ana kategorileri (belge varsa zorunlu)
    selectedBeautySalonMainHeadings: z.array(z.string()).optional(),
    // Güzellik salonu alt başlıkları
    selectedBeautySalonSubHeadings: z.array(z.string()).optional(),
    // Güzellik salonu hizmetleri (ayrı tutulmalı)
    selectedBeautySalonCategories: z.array(z.string()).optional(),
    // Ana başlıklar (seçilen main kategorilere göre) - Erkek/Kadın için
    selectedMainHeadings: z.array(z.string()).optional(),
    // Alt başlıklar (seçilen ana başlıklara göre)
    selectedSubHeadings: z.array(z.string()).optional(),
    // Hizmetler (seçilen alt başlıklara göre) - final seçim (sadece ana kategori hizmetleri)
    selectedCategories: z
      .array(z.string())
      .optional(),
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
    location: createLocationSchema(t),
    certificateImage: createCertificateImageField(t),
    isAvailable: z.boolean().default(true),
  })
    .superRefine((data, ctx) => {
      // Ana kategoriler seçilip alt dropdownlar seçilmezse hata ver
      if (data.selectedMainCategories && data.selectedMainCategories.length > 0) {
        if (!data.selectedMainHeadings || data.selectedMainHeadings.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("form.mainHeadingsRequired"),
            path: ["selectedMainHeadings"],
          });
        } else if (!data.selectedSubHeadings || data.selectedSubHeadings.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("form.subHeadingsRequired"),
            path: ["selectedSubHeadings"],
          });
        }
      }

      // Güzellik salonu belgesi varsa, güzellik salonu ana başlıkları zorunlu
      if (data.beautySalonCertificateImage) {
        if (!data.selectedBeautySalonMainHeadings || data.selectedBeautySalonMainHeadings.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("form.beautySalonMainHeadingsRequired"),
            path: ["selectedBeautySalonMainHeadings"],
          });
        } else if (!data.selectedBeautySalonSubHeadings || data.selectedBeautySalonSubHeadings.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("form.beautySalonSubHeadingsRequired"),
            path: ["selectedBeautySalonSubHeadings"],
          });
        }
      }

      // En az bir kategori seçilmeli (ana kategori veya güzellik salonu)
      const hasMainCategories = (data.selectedCategories && data.selectedCategories.length > 0);
      const hasBeautySalonCategories = (data.selectedBeautySalonCategories && data.selectedBeautySalonCategories.length > 0);
      if (!hasMainCategories && !hasBeautySalonCategories) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("form.atLeastOneCategory"),
          path: ["selectedCategories"],
        });
      }
    });

export type FormFreeBarberValues = z.input<ReturnType<typeof createSchema>>;

// Güzellik salonu fiyat anahtarı prefix'i - aynı isimli hizmetlerin çakışmasını önler
const BS_PRICE_PREFIX = "bs:";
const bsPriceKey = (name: string) => `${BS_PRICE_PREFIX}${name}`;
const isBsPriceKey = (key: string) => key.startsWith(BS_PRICE_PREFIX);
const stripBsPrefix = (key: string) => isBsPriceKey(key) ? key.slice(BS_PRICE_PREFIX.length) : key;

const Row = ({ label, value, colors }: { label: string; value: string; colors: any }) => (
  <View className="py-1.5" style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor }}>
    <Text className="text-gray-400 text-sm mb-0.5">{label}</Text>
    <Text className="text-sm" style={{ color: colors.sectionHeaderText }}>{value || "—"}</Text>
  </View>
);

const RowList = ({ label, items, colors }: { label: string; items: string[]; colors: any }) => {
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
  freeBarberId: string | null;
  enabled: boolean;
  onClose?: () => void;
  error?: any; // API error durumu
  locationStatus?: "unknown" | "granted" | "denied"; // Location status
};

// Step field names for validation
const STEP_FIELDS: Record<number, (keyof FormFreeBarberValues)[]> = {
  0: ["images", "certificateImage", "name", "surname"],
  1: ["selectedMainCategories"],
  2: ["selectedMainHeadings"],
  3: ["selectedSubHeadings"],
  4: ["selectedCategories"],
  5: ["beautySalonCertificateImage", "selectedBeautySalonMainHeadings", "selectedBeautySalonSubHeadings", "selectedBeautySalonCategories"],
  6: ["prices", "location"],
  7: [],
  8: ["isAvailable"],
};

export const FormFreeBarberOperation = React.memo(
  ({ freeBarberId, enabled, onClose, error, locationStatus }: Props) => {
    const isEdit = freeBarberId != null;
    const [currentStep, setCurrentStep] = React.useState(0);
    const [completedSteps, setCompletedSteps] = React.useState<Set<number>>(new Set());
    const stepSlideAnim = useRef(new Animated.Value(0)).current;
    const prevStepRef = useRef(0);

    const dispatch = useAppDispatch();
    const { userId } = useAuth();
    const { t, currentLanguage } = useLanguage();
    const { colors } = useTheme();

    const stepLabels = React.useMemo(() => {
      const base = [
        t("form.stepInfo"),
        t("form.stepMainCategories"),
        t("form.stepMainHeadings"),
        t("form.stepSubHeadings"),
        t("form.stepServices"),
        t("form.stepBeautySalon"),
        t("form.stepPrices"),
        t("form.stepPreview"),
      ];
      if (isEdit) base.push(t("form.stepAvailability"));
      return base;
    }, [t, isEdit, currentLanguage]);

    const steps = React.useMemo(
      () => stepLabels.map((label, i) => ({ id: `step-${i}`, label })),
      [stepLabels],
    );
    const totalSteps = stepLabels.length;
    const schema = useMemo(() => createSchema(t), [t, currentLanguage]);
    const resolver = useMemo(() => zodResolver(schema), [schema]);

    const [triggerGetFreeBarberMinePanel] =
      useLazyGetFreeBarberMinePanelQuery();
    const [addFreeBarber, { isLoading: addFreeBarberLoad }] =
      useAddFreeBarberPanelMutation();
    const [updateFreeBarber, { isLoading: updateFreeBarberLoad }] =
      useUpdateFreeBarberPanelMutation();
    const [uploadMultipleImages] = useUploadMultipleImagesMutation();
    const [uploadImage] = useUploadImageMutation();
    const [deleteImage] = useDeleteImageMutation();
    const [updateImageBlob] = useUpdateImageBlobMutation();
    const guard = useActionGuard();
    const [isImagePickerLoading, setIsImagePickerLoading] =
      React.useState(false);
    const [isCertificateLoading, setIsCertificateLoading] =
      React.useState(false);
    const [loadedImages, setLoadedImages] = React.useState<Set<number>>(
      new Set(),
    );

    const {
      control,
      handleSubmit,
      setValue,
      getValues,
      watch,
      reset,
      trigger,
      formState: { errors },
    } = useForm<FormFreeBarberValues>({
      resolver,
      shouldFocusError: true,
      mode: "onChange",
      defaultValues: {
        isAvailable: true,
        location: { latitude: 0, longitude: 0 },
        selectedMainCategories: [],
        selectedBeautySalonMainHeadings: [],
        selectedBeautySalonSubHeadings: [],
        selectedBeautySalonCategories: [],
        selectedMainHeadings: [],
        selectedSubHeadings: [],
        selectedCategories: [],
        prices: {},
      },
    });

    // Dil değiştiğinde validation'ı tetikle
    useEffect(() => {
      if (Object.keys(errors).length > 0) {
        trigger();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentLanguage]);

    const images = watch("images");
    const selectedMainCategories = watch("selectedMainCategories") ?? [];
    const beautySalonCertificateImage = watch("beautySalonCertificateImage");
    const selectedBeautySalonMainHeadings = watch("selectedBeautySalonMainHeadings") ?? [];
    const selectedBeautySalonSubHeadings = watch("selectedBeautySalonSubHeadings") ?? [];
    const selectedMainHeadings = watch("selectedMainHeadings") ?? [];
    const selectedSubHeadings = watch("selectedSubHeadings") ?? [];
    const selectedCategories = watch("selectedCategories") ?? [];
    const selectedBeautySalonCategories = watch("selectedBeautySalonCategories") ?? [];
    const currentPrices = watch("prices");

    // Kategori hiyerarşisi - tek API çağrısı ile tüm kategoriler
    const {
      parentCategories,
      mainHeadings,
      subHeadings,
      services,
      beautySalonMainHeadings,
      beautySalonSubHeadings,
      beautySalonServices,
      findParentHierarchyFromServices,
      isLoading: isCategoryLoading,
    } = useCategoryHierarchy({
      selectedTypes: selectedMainCategories,
      selectedMainHeadings,
      selectedSubHeadings,
      selectedBeautySalonMainHeadings,
      selectedBeautySalonSubHeadings,
    });

    // Edit ise panel detay çek - useEffect'lerden önce tanımlanmalı
    const [triggerGetFreeBarberPanel, { data, isLoading }] =
      useLazyGetFreeBarberMinePanelDetailQuery();

    // FreeBarber için Güzellik Salonu hariç tüm kategorileri göster
    // (Erkek Berber, Kadın Kuaför vb. tüm varyasyonlar)
    const allowedParentCategories = React.useMemo(() => {
      return parentCategories.filter(
        (cat: any) => cat.name !== "Güzellik Salonu",
      );
    }, [parentCategories]);

    // Güzellik salonu kategorisi
    const beautySalonCategory = useMemo(
      () => parentCategories.find((cat: any) => cat.name === "Güzellik Salonu"),
      [parentCategories],
    );

    // Not: Form state'te selectedCategories + prices anahtarları serviceName (Category.Name) olarak tutulur.
    // Backend de ServiceOffering.ServiceName üzerinden çalıştığı için name -> id dönüşümü yapmıyoruz.
    // Kategori hiyerarşisi artık useCategoryHierarchy hook'u tarafından otomatik yönetiliyor.

    useEffect(() => {
      if (!enabled) {
        // enabled false olduğunda form'u ve tüm ref'leri reset et
        reset();
        setCurrentStep(0);
        setCompletedSteps(new Set());
        initialDataLoadedRef.current = false;
        isRestoringRef.current = false;
        prevMainCategoriesRef.current = [];
        prevMainHeadingsRef.current = [];
        prevSubHeadingsRef.current = [];
        prevBsMainHeadingsRef.current = [];
        prevBsSubHeadingsRef.current = [];
        selectedCategoriesLengthRef.current = 0;
        selectedBeautySalonCategoriesLengthRef.current = 0;
        lastLoadedDataRef.current = null;
        return;
      }
      if (!isEdit) return;
      triggerGetFreeBarberPanel(freeBarberId!);
    }, [enabled, isEdit, freeBarberId, triggerGetFreeBarberPanel, reset]);

    const pickMultipleImages = async () => {
      setIsImagePickerLoading(true);
      try {
        const files = await handlePickMultipleImages(3);
        if (files && files.length > 0) {
          const currentImages = getValues("images") || [];
          const newImages = [...currentImages, ...files].slice(0, 3);
          setValue("images", newImages, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
      } finally {
        setIsImagePickerLoading(false);
      }
    };

    const removeImage = (index: number) => {
      const currentImages = getValues("images") || [];
      const newImages = currentImages.filter((_, i) => i !== index);
      setValue("images", newImages, {
        shouldDirty: true,
        shouldValidate: true,
      });
    };
    const gettingLocRef = useRef(false);
    const setLocationNow = async (): Promise<boolean> => {
      if (gettingLocRef.current) return false;
      gettingLocRef.current = true;
      try {
        const res = await getCurrentLocationSafe();
        if (!res.ok) {
          dispatch(
            showSnack({
              message: res.message || MESSAGES.FORM.LOCATION_NOT_AVAILABLE,
              isError: true,
            }),
          );
          return false;
        }
        setValue(
          "location",
          { latitude: res.lat, longitude: res.lon },
          { shouldDirty: true, shouldValidate: true },
        );
        return true;
      } finally {
        gettingLocRef.current = false;
      }
    };

    // Create modunda: form açılınca 1 kere konumu al ve set et
    const didInitCreateLoc = useRef(false);
    useEffect(() => {
      if (!enabled) return;
      if (isEdit) return;
      if (didInitCreateLoc.current) return;
      didInitCreateLoc.current = true;
      setLocationNow();
    }, [enabled, isEdit]);

    // Edit modunda mevcut hizmetlerden geriye doğru ana başlık ve alt başlık bul
    const initialDataLoadedRef = useRef(false);
    // Hierarchy restoration sırasında reset effect'lerinin tetiklenmesini önle
    const isRestoringRef = useRef(false);
    // Son yüklenen data referansı - aynı data ile tekrar yükleme yapılmasını önler
    const lastLoadedDataRef = useRef<any>(null);

    // TEK BİRLEŞİK EFFECT: Veri yükleme + hiyerarşi restorasyon
    // Hem data hem de kategori hiyerarşisi hazır olduğunda çalışır.
    // Tüm form değerlerini tek bir reset() çağrısı ile atomik olarak set eder.
    useEffect(() => {
      if (!enabled) return;
      if (!isEdit || !data) return;
      // Kategori hiyerarşisi yüklenene kadar bekle
      if (isCategoryLoading || parentCategories.length === 0) return;
      // Aynı data ile tekrar yükleme yapma
      if (lastLoadedDataRef.current === data) return;

      const imageListData = data?.imageList ?? [];
      const initialImages = imageListData.map((img: any) => ({
        id: img.id,
        uri: img.imageUrl,
        name: img.imageUrl.split("/").pop() ?? `image-${img.id}.jpg`,
        type: img.imageUrl.toLowerCase().endsWith(".png")
          ? "image/png"
          : "image/jpeg",
      }));

      const initialCategories = (data?.offerings ?? []).map(
        (s: any) => s.serviceName,
      );
      const initialPrices = (data?.offerings ?? []).reduce(
        (acc: Record<string, string>, s: any) => {
          acc[s.serviceName] = String(s.price);
          return acc;
        },
        {},
      );

      // Backend'den gelen type'ı main categories'e çevir
      const initialMainCategories: string[] = [];
      if (data?.type != null) {
        const typeName = mapTypeToDisplayName(data.type);
        if (typeName && typeName !== "Güzellik Salonu") {
          initialMainCategories.push(typeName);
        }
      }

      // --- Hiyerarşi restorasyon ---
      // Regular kategoriler için hiyerarşi bul
      const allFoundMainHeadings = new Set<string>();
      const allFoundSubHeadings = new Set<string>();
      const regularServices = new Set<string>();

      if (initialCategories.length > 0) {
        initialMainCategories.forEach((typeName) => {
          const { mainHeadings: foundMain, subHeadings: foundSub } =
            findParentHierarchyFromServices(initialCategories, typeName);
          foundMain.forEach((h) => allFoundMainHeadings.add(h));
          foundSub.forEach((h) => allFoundSubHeadings.add(h));
          initialCategories.forEach((serviceName) => {
            const { mainHeadings: testMain } = findParentHierarchyFromServices([serviceName], typeName);
            if (testMain.length > 0) {
              regularServices.add(serviceName);
            }
          });
        });
      }

      // Güzellik salonu için kontrol
      const { mainHeadings: bsMain, subHeadings: bsSub } =
        findParentHierarchyFromServices(initialCategories, "Güzellik Salonu");

      const beautySalonServicesList = initialCategories.filter((serviceName) => {
        const { mainHeadings: testMain } = findParentHierarchyFromServices([serviceName], "Güzellik Salonu");
        return testMain.length > 0;
      });

      // Regular services (güzellik salonu hariç)
      const regularServicesList = Array.from(regularServices);
      const finalRegularServices = regularServicesList.length > 0
        ? regularServicesList
        : (beautySalonServicesList.length > 0 ? [] : initialCategories);

      // Fiyatları hazırla (güzellik salonu prefix'li)
      const finalPrices = { ...initialPrices };
      beautySalonServicesList.forEach((serviceName) => {
        const existingPrice = finalPrices[serviceName];
        if (existingPrice !== undefined) {
          finalPrices[bsPriceKey(serviceName)] = existingPrice;
          if (!regularServices.has(serviceName)) {
            delete finalPrices[serviceName];
          }
        }
      });

      // Cascade reset effect'lerinin tetiklenmesini önle
      isRestoringRef.current = true;

      // Tüm form değerlerini TEK BİR reset() ile atomik olarak set et
      reset({
        ...getValues(),
        name: data?.firstName ?? "",
        surname: data?.lastName ?? "",
        selectedMainCategories: initialMainCategories,
        isAvailable: data?.isAvailable ?? true,
        images: initialImages.length > 0 ? initialImages : undefined,
        certificateImage: (data as any)?.barberCertificateImage
          ? {
            uri: (data as any).barberCertificateImage.imageUrl,
            name:
              (data as any).barberCertificateImage.imageUrl
                .split("/")
                .pop() ?? "certificate.jpg",
            type: "image/jpeg",
          }
          : undefined,
        beautySalonCertificateImage: (data as any)?.beautySalonCertificateImage
          ? {
            uri: (data as any).beautySalonCertificateImage.imageUrl,
            name:
              (data as any).beautySalonCertificateImage.imageUrl
                .split("/")
                .pop() ?? "beauty-certificate.jpg",
            type: "image/jpeg",
          }
          : undefined,
        location: {
          latitude: (data as any)?.latitude ?? 0,
          longitude: (data as any)?.longitude ?? 0,
        },
        // Hiyerarşi alanları - hepsi tek seferde set edilir
        selectedMainHeadings: Array.from(allFoundMainHeadings),
        selectedSubHeadings: Array.from(allFoundSubHeadings),
        selectedCategories: finalRegularServices,
        selectedBeautySalonMainHeadings: bsMain,
        selectedBeautySalonSubHeadings: bsSub,
        selectedBeautySalonCategories: beautySalonServicesList,
        prices: finalPrices,
      });

      // NOT: prevRef'leri burada güncellemiyoruz!
      // reset() formu günceller ama watch() değerleri henüz eski React state'i döndürür.
      // prevRef'ler [] olarak kaldığı sürece cascade reset'ler tetiklenmez (prevRef.length === 0 guard'ı).
      // Cascade reset effect'leri prevRef'leri kendileri güncelleyecek (sonraki render'da).

      if (!data?.latitude || data.latitude === 0) setLocationNow();

      lastLoadedDataRef.current = data;
      isRestoringRef.current = false;
      initialDataLoadedRef.current = true;
    }, [enabled, isEdit, data, parentCategories, isCategoryLoading, findParentHierarchyFromServices, reset, getValues]);

    // Kategori hiyerarşisi artık useCategoryHierarchy hook'u tarafından otomatik yönetiliyor
    // Eski useEffect'ler kaldırıldı - mainHeadings, subHeadings, services hook'tan geliyor

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
      () =>
        services.map((cat: any) => ({
          label: cat.name,
          value: cat.name,
        })),
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

    // Güzellik salonu ana başlıkları için options
    const beautySalonMainHeadingOptions = useMemo(() => {
      if (!beautySalonCategory) return [];
      return beautySalonMainHeadings.map((cat: any) => ({
        label: cat.name,
        value: cat.name,
      }));
    }, [beautySalonCategory, beautySalonMainHeadings]);

    // Güzellik salonu alt başlıkları için options (ayrı tutulmalı)
    const beautySalonSubHeadingOptions = useMemo(
      () =>
        beautySalonSubHeadings.map((cat: any) => ({
          label: cat.name,
          value: cat.name,
        })),
      [beautySalonSubHeadings],
    );

    // Güzellik salonu hizmetleri için options (ayrı tutulmalı)
    const beautySalonCategoryOptions = useMemo(
      () =>
        beautySalonServices.map((cat: any) => ({
          label: cat.name,
          value: cat.name,
        })),
      [beautySalonServices],
    );
    const beautySalonCategoryOptionsWithSelected = useMemo(() => {
      const base = [...beautySalonCategoryOptions];
      const seen = new Set(base.map((o) => o.value));
      (selectedBeautySalonCategories ?? []).forEach((v) => {
        if (!seen.has(v)) {
          base.push({ label: v, value: v });
          seen.add(v);
        }
      });
      return base;
    }, [beautySalonCategoryOptions, selectedBeautySalonCategories]);

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

    // Memoized parent categories dropdown data (çoklu seçim için)
    const parentCategoriesDropdownData = useMemo(
      () =>
        allowedParentCategories.map((cat: any) => ({
          label: cat.name,
          value: cat.name,
        })),
      [allowedParentCategories],
    );

    // Main kategoriler değişince alt seviyeleri reset et
    const prevMainCategoriesRef = useRef<string[]>([]);
    useEffect(() => {
      if (isRestoringRef.current) return;
      const mainCatsChanged =
        JSON.stringify(prevMainCategoriesRef.current.sort()) !==
        JSON.stringify([...selectedMainCategories].sort());

      if (mainCatsChanged && prevMainCategoriesRef.current.length > 0) {
        setValue("selectedMainHeadings", [], { shouldDirty: true, shouldValidate: true });
        setValue("selectedSubHeadings", [], { shouldDirty: true, shouldValidate: true });
        setValue("selectedCategories", [], { shouldDirty: true, shouldValidate: true });
        // Sadece ana kategori fiyatlarını temizle, güzellik salonu fiyatlarını koru
        const currentPrices = getValues("prices") ?? {};
        const bsOnlyPrices: Record<string, string> = {};
        Object.keys(currentPrices).forEach((k) => {
          if (isBsPriceKey(k)) bsOnlyPrices[k] = currentPrices[k];
        });
        setValue("prices", bsOnlyPrices, { shouldDirty: true, shouldValidate: true });
      }
      prevMainCategoriesRef.current = [...selectedMainCategories];
    }, [selectedMainCategories, setValue, getValues]);

    // Ana başlıklar değişince alt seviyeleri reset et
    const prevMainHeadingsRef = useRef<string[]>([]);
    useEffect(() => {
      if (isRestoringRef.current) return;
      const mainHeadingsChanged =
        JSON.stringify(prevMainHeadingsRef.current.sort()) !==
        JSON.stringify([...selectedMainHeadings].sort());

      if (mainHeadingsChanged && prevMainHeadingsRef.current.length > 0) {
        setValue("selectedSubHeadings", [], { shouldDirty: true, shouldValidate: true });
        setValue("selectedCategories", [], { shouldDirty: true, shouldValidate: true });
        const currentPrices = getValues("prices") ?? {};
        const bsOnlyPrices: Record<string, string> = {};
        Object.keys(currentPrices).forEach((k) => {
          if (isBsPriceKey(k)) bsOnlyPrices[k] = currentPrices[k];
        });
        setValue("prices", bsOnlyPrices, { shouldDirty: true, shouldValidate: true });
      }
      prevMainHeadingsRef.current = [...selectedMainHeadings];
    }, [selectedMainHeadings, setValue, getValues]);

    // Alt başlıklar değişince hizmetleri reset et
    const prevSubHeadingsRef = useRef<string[]>([]);
    useEffect(() => {
      if (isRestoringRef.current) return;
      const subHeadingsChanged =
        JSON.stringify(prevSubHeadingsRef.current.sort()) !==
        JSON.stringify([...selectedSubHeadings].sort());

      if (subHeadingsChanged && prevSubHeadingsRef.current.length > 0) {
        setValue("selectedCategories", [], { shouldDirty: true, shouldValidate: true });
        const currentPrices = getValues("prices") ?? {};
        const bsOnlyPrices: Record<string, string> = {};
        Object.keys(currentPrices).forEach((k) => {
          if (isBsPriceKey(k)) bsOnlyPrices[k] = currentPrices[k];
        });
        setValue("prices", bsOnlyPrices, { shouldDirty: true, shouldValidate: true });
      }
      prevSubHeadingsRef.current = [...selectedSubHeadings];
    }, [selectedSubHeadings, setValue, getValues]);

    // Güzellik salonu ana başlıkları değişince alt seviyeleri reset et
    const prevBsMainHeadingsRef = useRef<string[]>([]);
    useEffect(() => {
      if (isRestoringRef.current) return;
      const changed =
        JSON.stringify(prevBsMainHeadingsRef.current.sort()) !==
        JSON.stringify([...selectedBeautySalonMainHeadings].sort());

      if (changed && prevBsMainHeadingsRef.current.length > 0) {
        setValue("selectedBeautySalonSubHeadings", [], { shouldDirty: true, shouldValidate: true });
        setValue("selectedBeautySalonCategories", [], { shouldDirty: true, shouldValidate: true });
        // Güzellik salonu fiyatlarını temizle, ana kategori fiyatlarını koru
        const currentPrices = getValues("prices") ?? {};
        const mainOnlyPrices: Record<string, string> = {};
        Object.keys(currentPrices).forEach((k) => {
          if (!isBsPriceKey(k)) mainOnlyPrices[k] = currentPrices[k];
        });
        setValue("prices", mainOnlyPrices, { shouldDirty: true, shouldValidate: true });
      }
      prevBsMainHeadingsRef.current = [...selectedBeautySalonMainHeadings];
    }, [selectedBeautySalonMainHeadings, setValue, getValues]);

    // Güzellik salonu alt başlıkları değişince hizmetleri reset et
    const prevBsSubHeadingsRef = useRef<string[]>([]);
    useEffect(() => {
      if (isRestoringRef.current) return;
      const changed =
        JSON.stringify(prevBsSubHeadingsRef.current.sort()) !==
        JSON.stringify([...selectedBeautySalonSubHeadings].sort());

      if (changed && prevBsSubHeadingsRef.current.length > 0) {
        setValue("selectedBeautySalonCategories", [], { shouldDirty: true, shouldValidate: true });
        const currentPrices = getValues("prices") ?? {};
        const mainOnlyPrices: Record<string, string> = {};
        Object.keys(currentPrices).forEach((k) => {
          if (!isBsPriceKey(k)) mainOnlyPrices[k] = currentPrices[k];
        });
        setValue("prices", mainOnlyPrices, { shouldDirty: true, shouldValidate: true });
      }
      prevBsSubHeadingsRef.current = [...selectedBeautySalonSubHeadings];
    }, [selectedBeautySalonSubHeadings, setValue, getValues]);

    // prices sync - Ana kategori ve güzellik salonu hizmetleri için
    const selectedCategoriesLengthRef = useRef<number>(0);
    const selectedBeautySalonCategoriesLengthRef = useRef<number>(0);
    useEffect(() => {
      const currentLength = selectedCategories?.length || 0;
      const currentBeautySalonLength = selectedBeautySalonCategories?.length || 0;
      const totalLength = currentLength + currentBeautySalonLength;
      const prevTotalLength = selectedCategoriesLengthRef.current + selectedBeautySalonCategoriesLengthRef.current;

      if (totalLength === prevTotalLength &&
        currentLength === selectedCategoriesLengthRef.current &&
        currentBeautySalonLength === selectedBeautySalonCategoriesLengthRef.current) return;

      selectedCategoriesLengthRef.current = currentLength;
      selectedBeautySalonCategoriesLengthRef.current = currentBeautySalonLength;

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

      // Tüm seçili hizmetleri birleştir (güzellik salonu prefix'li)
      const allPriceKeys = [
        ...(selectedCategories ?? []),
        ...(selectedBeautySalonCategories ?? []).map(bsPriceKey),
      ];

      // Seçilmeyen hizmetlerin fiyatlarını sil
      Object.keys(next).forEach((k) => {
        if (!allPriceKeys.includes(k)) {
          delete next[k];
          changed = true;
        }
      });

      // Yeni seçilen hizmetler için boş fiyat ekle
      allPriceKeys.forEach((k) => {
        if (!(k in next)) {
          next[k] = "";
          changed = true;
        }
      });

      // Use shouldValidate: false to prevent validation cascade
      if (changed)
        setValue("prices", next, { shouldDirty: true, shouldValidate: false });
    }, [selectedCategories?.length, selectedBeautySalonCategories?.length, setValue, getValues]);

    // Action kontrolü: Error veya location denied durumunda işlem yapılamaz
    const { checkAndAlert: checkCanPerformAction } = useCanPerformAction(
      error,
      locationStatus,
      "Bu işlemi gerçekleştirmek için konum izni gereklidir. Lütfen ayarlardan konum iznini açın.",
    );

    const OnSubmit = React.useCallback(
      async (form: FormFreeBarberValues) => {
        // Error veya location denied kontrolü
        if (!checkCanPerformAction()) {
          return;
        }

        if (isEdit) {
          const ok = await setLocationNow();
          if (!ok) return;
          form = { ...form, location: getValues("location") };
        } else {
          if (
            !form.location?.latitude ||
            !form.location?.longitude ||
            (form.location.latitude === 0 && form.location.longitude === 0)
          ) {
            const ok = await setLocationNow();
            if (!ok) return;
            form = { ...form, location: getValues("location") };
          }
        }

        const existingImages = isEdit ? (data?.imageList ?? []) : [];
        const existingOfferings = isEdit ? (data?.offerings ?? []) : [];
        const formImages = form.images ?? [];

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

        // Ana kategori ve güzellik salonu hizmetlerini birleştir
        const normalCategories = (form.selectedCategories ?? []).map((name) => ({
          name,
          priceKey: name,
        }));
        const bsCategories = (form.selectedBeautySalonCategories ?? []).map((name) => ({
          name,
          priceKey: bsPriceKey(name),
        }));
        const allSelectedCategories = [...normalCategories, ...bsCategories];

        const offeringsMapped = allSelectedCategories
          .map(({ name: categoryName, priceKey }) => {
            // selectedCategories artık direkt category name olarak tutuluyor (ID değil)
            const priceStr = form.prices?.[priceKey] ?? "";
            const priceNum = parseTR(priceStr);
            if (priceNum == null) return null;

            if (!isEdit) {
              const dto: ServiceOfferingCreateDto = {
                serviceName: categoryName,
                price: priceNum,
              };
              return dto;
            } else {
              const existingId = (existingOfferings as any[]).find(
                (o) => o.serviceName === categoryName,
              )?.id;
              const dto: ServiceOfferingUpdateDto = {
                id: existingId,
                serviceName: categoryName,
                price: priceNum,
                ownerId: freeBarberId!,
              };
              return dto;
            }
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);

        const offerings = !isEdit
          ? (offeringsMapped as ServiceOfferingCreateDto[])
          : (offeringsMapped as ServiceOfferingUpdateDto[]);

        // Certificate ve beauty salon certificate - paralel yükleme
        const existingCertificateImage = (data as any)?.barberCertificateImage as { id?: string; imageUrl?: string } | undefined;
        let certImageId: string | undefined = existingCertificateImage?.id;

        const existingBeautyCertImage = (data as any)?.beautySalonCertificateImage as { id?: string; imageUrl?: string } | undefined;
        let beautyCertImageId: string | undefined = existingBeautyCertImage?.id;

        const isCertificateChanged = !!form.certificateImage && (
          form.certificateImage.uri.startsWith('file://') ||
          form.certificateImage.uri.startsWith('content://') ||
          !!(existingCertificateImage?.imageUrl && form.certificateImage.uri !== existingCertificateImage.imageUrl)
        );

        const isBeautyCertChanged = !!form.beautySalonCertificateImage && (
          form.beautySalonCertificateImage.uri.startsWith('file://') ||
          form.beautySalonCertificateImage.uri.startsWith('content://') ||
          !!(existingBeautyCertImage?.imageUrl && form.beautySalonCertificateImage.uri !== existingBeautyCertImage.imageUrl)
        );

        if ((isCertificateChanged || isBeautyCertChanged) && !userId) {
          dispatch(showSnack({ message: MESSAGES.PROFILE.USER_NOT_FOUND, isError: true }));
          return;
        }

        const makeCertFormData = (file: { uri: string; name?: string | null; type?: string | null }, defaultName: string) => {
          const fd = new FormData();
          fd.append("file", { uri: file.uri, name: file.name ?? defaultName, type: file.type ?? "image/jpeg" } as any);
          fd.append("ownerType", String(ImageOwnerType.User));
          fd.append("ownerId", userId!);
          return fd;
        };

        const [certUploadResult, beautyUploadResult] = await Promise.all([
          isCertificateChanged
            ? uploadImage({ data: makeCertFormData(form.certificateImage!, "certificate.jpg"), isProfileImage: false })
            : Promise.resolve(null),
          isBeautyCertChanged
            ? uploadImage({ data: makeCertFormData(form.beautySalonCertificateImage!, "beauty-certificate.jpg"), isProfileImage: false })
            : Promise.resolve(null),
        ]);

        if (certUploadResult) {
          if ("error" in certUploadResult) {
            dispatch(showSnack({ message: getErrorMessage(certUploadResult.error) || MESSAGES.FORM.CERTIFICATE_UPLOAD_FAILED, isError: true }));
            return;
          }
          if (!certUploadResult.data?.success || !certUploadResult.data.data) {
            dispatch(showSnack({ message: certUploadResult.data?.message || MESSAGES.FORM.CERTIFICATE_UPLOAD_ERROR, isError: true }));
            return;
          }
          certImageId = certUploadResult.data.data;
        }

        if (beautyUploadResult) {
          if ("error" in beautyUploadResult) {
            dispatch(showSnack({ message: getErrorMessage(beautyUploadResult.error) || MESSAGES.FORM.CERTIFICATE_UPLOAD_FAILED, isError: true }));
            return;
          }
          if (!beautyUploadResult.data?.success || !beautyUploadResult.data.data) {
            dispatch(showSnack({ message: beautyUploadResult.data?.message || MESSAGES.FORM.CERTIFICATE_UPLOAD_ERROR, isError: true }));
            return;
          }
          beautyCertImageId = beautyUploadResult.data.data;
        }

        // selectedMainCategories'den type'ı belirle (ilk seçilen kategori)
        // Backend'de tek bir type bekliyor, bu yüzden ilk seçilen kategoriyi kullanıyoruz
        const mainType = form.selectedMainCategories?.[0] || "";
        const mappedType = mainType ? mapBarberType(mainType) : undefined;

        const payload: any = {
          ...(isEdit ? { id: data?.id ?? freeBarberId ?? "" } : {}),
          firstName: form.name.trim(),
          lastName: form.surname.trim(),
          type: mappedType || 0, // Default to 0 if not found
          latitude: form.location.latitude,
          longitude: form.location.longitude,
          offerings,
          barberCertificateImageId: certImageId,
          beautySalonCertificateImageId: beautyCertImageId,
          isAvailable: isEdit ? form.isAvailable : true,
        };
        // Payload validation passed, proceed with submission

        const mutationResult = !isEdit
          ? await addFreeBarber(payload)
          : await updateFreeBarber(payload);
        if ("error" in mutationResult) {
          const errorMessage = getErrorMessage(mutationResult.error);
          const fallbackMessage = isEdit
            ? MESSAGES.FORM.FREEBARBER_UPDATE_ERROR
            : MESSAGES.FORM.FREEBARBER_CREATE_ERROR;
          dispatch(
            showSnack({
              message: errorMessage || fallbackMessage,
              isError: true,
            }),
          );
          return;
        }
        const result = mutationResult.data;
        if (result?.success) {
          let uploadError: string | null = null;
          const hasImageChanges = isEdit
            ? removedImages.length > 0 ||
            updatedImages.length > 0 ||
            newImages.length > 0
            : newImages.length > 0;

          if (hasImageChanges) {
            try {
              const ownerId = isEdit
                ? (data?.id ?? freeBarberId ?? "")
                : (mutationResult.data?.data ?? "");
              if (!ownerId) {
                throw new Error(MESSAGES.FORM.PANEL_ID_NOT_FOUND);
              }

              if (isEdit) {
                // 1. Silinecek resimleri paralel sil
                await Promise.all(
                  removedImages.map(async (img) => {
                    const deleteImageResult = await deleteImage(img.id);
                    if ("error" in deleteImageResult) {
                      throw new Error(
                        getErrorMessage(deleteImageResult.error) ||
                        MESSAGES.FORM.IMAGE_DELETE_ERROR,
                      );
                    }
                    const deleteResult = deleteImageResult.data;
                    if (!deleteResult?.success) {
                      throw new Error(
                        deleteResult?.message || MESSAGES.FORM.IMAGE_DELETE_ERROR,
                      );
                    }
                  }),
                );

                // 2. Güncellenecek resimleri paralel güncelle
                await Promise.all(
                  updatedImages
                    .filter((img) => img.id)
                    .map(async (img) => {
                      const formData = new FormData();
                      formData.append("file", {
                        uri: img.uri,
                        name: img.name ?? "photo.jpg",
                        type: img.type ?? "image/jpeg",
                      } as any);
                      const updateBlobResult = await updateImageBlob({
                        imageId: img.id!,
                        file: formData,
                      });
                      if ("error" in updateBlobResult) {
                        throw new Error(
                          getErrorMessage(updateBlobResult.error) ||
                          MESSAGES.FORM.IMAGE_UPDATE_BLOB_ERROR,
                        );
                      }
                      const updateResult = updateBlobResult.data;
                      if (!updateResult?.success) {
                        throw new Error(
                          updateResult?.message ||
                          MESSAGES.FORM.IMAGE_UPDATE_BLOB_ERROR,
                        );
                      }
                    }),
                );
              }

              // 3. Yeni resimleri ekle
              if (newImages.length > 0) {
                const formData = new FormData();
                newImages.forEach((img) => {
                  formData.append("files", {
                    uri: img.uri,
                    name: img.name ?? "photo.jpg",
                    type: img.type ?? "image/jpeg",
                  } as any);
                });
                formData.append("ownerType", String(ImageOwnerType.FreeBarber));
                formData.append("ownerId", ownerId);
                const uploadMultiResult = await uploadMultipleImages(formData);
                if ("error" in uploadMultiResult) {
                  throw new Error(
                    getErrorMessage(uploadMultiResult.error) ||
                    MESSAGES.FORM.FREEBARBER_IMAGES_UPLOAD_ERROR,
                  );
                }
                const uploadResult = uploadMultiResult.data;
                if (!uploadResult?.success) {
                  throw new Error(
                    uploadResult?.message ||
                    MESSAGES.FORM.FREEBARBER_IMAGES_UPLOAD_ERROR,
                  );
                }
              }
            } catch (uploadErr: any) {
              uploadError = getErrorMessage(uploadErr);
            }
          }

          if (uploadError) {
            const baseMessage = isEdit
              ? MESSAGES.FORM.FREEBARBER_IMAGES_UPDATE_ERROR
              : MESSAGES.FORM.FREEBARBER_IMAGES_UPLOAD_ERROR;
            dispatch(
              showSnack({
                message: `${baseMessage} ${uploadError}`,
                isError: true,
              }),
            );
          } else {
            const successMessage = isEdit
              ? MESSAGES.FORM.FREEBARBER_UPDATE_SUCCESS
              : MESSAGES.FORM.FREEBARBER_CREATE_SUCCESS;
            dispatch(
              showSnack({
                message: result.message || successMessage,
                isError: false,
              }),
            );
          }
          // Refresh panel data to show updated images
          if (isEdit) {
            await triggerGetFreeBarberPanel(freeBarberId!);
          } else {
            await triggerGetFreeBarberMinePanel();
          }
          onClose?.();
        } else {
          const errorMessage = isEdit
            ? MESSAGES.FORM.FREEBARBER_UPDATE_ERROR
            : MESSAGES.FORM.FREEBARBER_CREATE_ERROR;
          dispatch(
            showSnack({
              message: result?.message || errorMessage,
              isError: true,
            }),
          );
        }
      },
      [
        isEdit,
        data,
        freeBarberId,
        addFreeBarber,
        updateFreeBarber,
        dispatch,
        onClose,
        getValues,
        setLocationNow,
        triggerGetFreeBarberMinePanel,
        deleteImage,
        uploadMultipleImages,
        updateImageBlob,
      ],
    );

    const onErrors = React.useCallback((errors: any) => {
      // Validation errors are displayed to user via form state
    }, []);

    const validateStep = React.useCallback(async (stepIndex: number): Promise<boolean> => {
      const fields = STEP_FIELDS[stepIndex];
      if (!fields) return true;
      const result = await trigger(fields as any);
      return result;
    }, [trigger]);

    const handleNextStep = React.useCallback(async () => {
      const valid = await validateStep(currentStep);
      if (!valid) return;
      setCompletedSteps((prev) => new Set(prev).add(currentStep));
      if (currentStep < totalSteps - 1) {
        setCurrentStep((s) => s + 1);
      }
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

    // Skeleton sadece edit + data gelene kadar
    const showSkeleton = isEdit && (isLoading || !data);

    return (
      <View className="h-full">
        <View className="flex-row justify-between items-center px-2 py-2">
          <Text className="flex-1 font-century-gothic text-2xl" style={{ color: colors.sectionHeaderText }}>
            {!isEdit ? t("form.createPanel") : t("form.editPanel")}
          </Text>
          <IconButton
            onPress={() => onClose?.()}
            icon="close"
            iconColor={colors.sectionHeaderText}
          />
        </View>

        <Divider style={{ height: 1, backgroundColor: colors.borderColor }} />

        {!enabled ? null : showSkeleton ? (
          <View className="flex-1 pt-4">
            <CrudSkeletonComponent />
          </View>
        ) : (
          <>
            <StepFormIndicator
              steps={steps}
              currentStep={currentStep}
              onStepPress={handleStepPress}
              canNavigateFreely={isEdit}
              completedSteps={completedSteps}
            />
            <ScrollView
              key={currentStep}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              alwaysBounceVertical={false}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 24, paddingHorizontal: 16 }}
              style={{ flex: 1 }}
            >
              <Animated.View style={{ flex: 1, transform: [{ translateX: stepSlideAnim }] }}>
                {currentStep === 0 && (
                  <>
                    <Text className="text-xl mt-2" style={{ color: colors.sectionHeaderText }}>
                      {t("form.panelImagesTitle")}
                    </Text>

                    <Controller
                      control={control}
                      name="images"
                      render={() => (
                        <View className="mt-2">
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 8, gap: 12 }}
                          >
                            {(images ?? []).map((img, index) => (
                              <View
                                key={index}
                                className="relative"
                                style={{ width: 200, height: 150 }}
                              >
                                <Image
                                  className="w-full h-full rounded-xl"
                                  source={{ uri: img.uri }}
                                  resizeMode="cover"
                                  onLoad={() =>
                                    setLoadedImages((prev) =>
                                      new Set(prev).add(index),
                                    )
                                  }
                                />
                                {!loadedImages.has(index) && (
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
                                style={{ width: 200, height: 150, backgroundColor: colors.cardBg2, borderWidth: 1, borderColor: colors.borderColor }}
                                activeOpacity={0.85}
                              >
                                {isImagePickerLoading ? (
                                  <ActivityIndicator size="large" color="#888" />
                                ) : (
                                  <>
                                    <Icon
                                      source="image-plus"
                                      size={40}
                                      color="#888"
                                    />
                                    <Text className="text-gray-500 mt-2">
                                      {t("image.add")}
                                    </Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            )}
                          </ScrollView>
                          {errors.images && (
                            <View className="px-2">
                              <HelperText type="error" visible={!!errors.images} style={{ fontFamily: 'CenturyGothic' }}>
                                {errors.images.message as string}
                              </HelperText>
                            </View>
                          )}
                        </View>
                      )}
                    />

                    <Text className="text-xl mt-2 px-2" style={{ color: colors.sectionHeaderText }}>
                      {t("form.panelInformation")}
                    </Text>

                    {/* Certificate Image */}
                    <View className="px-2 mt-2">
                      <Controller
                        control={control}
                        name="certificateImage"
                        render={({ field: { value, onChange } }) => (
                          <>
                            <TouchableOpacity
                              activeOpacity={0.85}
                              disabled={isCertificateLoading}
                              onPress={async () => {
                                setIsCertificateLoading(true);
                                try {
                                  const file = await handlePickImage();
                                  if (file) onChange(file);
                                } finally {
                                  setIsCertificateLoading(false);
                                }
                              }}
                            >
                              <TextInput
                                label={t("form.certificateImage")}
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
                                  errors.certificateImage ? "#b00020" : colors.borderColor2
                                }
                                right={
                                  isCertificateLoading ? (
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
                                    onSurfaceVariant: "gray",
                                    primary: colors.sectionHeaderText,
                                  },
                                }}
                                style={{ backgroundColor: colors.cardBg }}
                              />
                            </TouchableOpacity>
                            {value?.uri && !isCertificateLoading && (
                              <View className="mt-2 mb-2 w-full">
                                <Image
                                  source={{ uri: value.uri }}
                                  style={{
                                    width: "100%",
                                    height: 200,
                                    borderRadius: 10,
                                  }}
                                  resizeMode="cover"
                                />
                              </View>
                            )}
                            <HelperText
                              type="error"
                              visible={!!errors.certificateImage}
                            >
                              {errors?.certificateImage?.message as string}
                            </HelperText>
                          </>
                        )}
                      />
                    </View>

                    {/* Name / Surname */}
                    <View className="px-2 mt-0 flex-row gap-3">
                      <View className="flex-1">
                        <Controller
                          control={control}
                          name="name"
                          render={({ field: { onChange, onBlur, value } }) => (
                            <>
                              <TextInput
                                label="İsim"
                                mode="outlined"
                                dense
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                textColor={colors.sectionHeaderText}
                                outlineColor={errors.name ? "#b00020" : colors.borderColor2}
                                activeOutlineColor={errors.name ? "#b00020" : "#ffb900"}
                                theme={{
                                  roundness: 10,
                                  colors: {
                                    onSurfaceVariant: "gray",
                                    primary: "#ffb900",
                                  },
                                }}
                                style={{ backgroundColor: colors.cardBg }}
                              />
                              <HelperText type="error" visible={!!errors.name} style={{ fontFamily: 'CenturyGothic' }}>
                                {errors?.name?.message as string}
                              </HelperText>
                            </>
                          )}
                        />
                      </View>
                      <View className="flex-1">
                        <Controller
                          control={control}
                          name="surname"
                          render={({ field: { onChange, onBlur, value } }) => (
                            <>
                              <TextInput
                                label="Soyisim"
                                mode="outlined"
                                dense
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                textColor={colors.sectionHeaderText}
                                outlineColor={errors.surname ? "#b00020" : colors.borderColor2}
                                activeOutlineColor={errors.surname ? "#b00020" : "#ffb900"}
                                theme={{
                                  roundness: 10,
                                  colors: {
                                    onSurfaceVariant: "gray",
                                    primary: "#ffb900",
                                  },
                                }}
                                style={{ backgroundColor: colors.cardBg }}
                              />
                              <HelperText type="error" visible={!!errors.surname} style={{ fontFamily: 'CenturyGothic' }}>
                                {errors?.surname?.message as string}
                              </HelperText>
                            </>
                          )}
                        />
                      </View>
                    </View>
                  </>
                )}
                {currentStep === 1 && (
                  <>
                    <View className="mt-2">
                      <Text className="text-xl mb-3 font-century-gothic-bold" style={{ color: colors.sectionHeaderText }}>
                        {t("form.mainCategories")} *
                      </Text>
                      <View className="rounded-xl p-3" style={{ borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardBg }}>
                        <Controller
                          control={control}
                          name="selectedMainCategories"
                          render={({ field: { value, onChange }, fieldState: { error } }) => (
                            <>
                              <CategoryListSelect
                                data={parentCategoriesDropdownData}
                                value={(value ?? []) as string[]}
                                onChange={onChange}
                                singleSelect
                              />
                              <HelperText type="error" visible={!!error} style={{ fontFamily: 'CenturyGothic' }}>
                                {errors?.selectedMainCategories?.message as string}
                              </HelperText>
                            </>
                          )}
                        />
                      </View>
                    </View>
                  </>
                )}
                {currentStep === 2 && (
                  <>
                    <View className="mt-2">
                      {selectedMainCategories.length === 0 || mainHeadingOptions.length === 0 ? (
                        <Text className="text-gray-400 text-center py-8">
                          {t("form.stepMainHeadings")} - {t("form.selectMainCategories")}
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
                {currentStep === 3 && (
                  <>
                    <View className="mt-2">
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
                {currentStep === 4 && (
                  <>
                    <View className="mt-2">
                      {selectedSubHeadings.length === 0 || categoryOptions.length === 0 ? (
                        <Text className="text-gray-400 text-center py-8">
                          {t("form.stepServices")} - {t("form.selectSubHeadings")}
                        </Text>
                      ) : (
                        <>
                          <Text className="text-xl mb-3 font-century-gothic-bold" style={{ color: colors.sectionHeaderText }}>
                            {t("form.servicesTitle")}
                          </Text>
                          <View className="rounded-xl p-3" style={{ borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardBg }}>
                            <Controller
                              control={control}
                              name="selectedCategories"
                              render={({ field: { value, onChange } }) => (
                                <>
                                  <CategoryListSelect
                                    data={categoryOptionsWithSelected}
                                    value={(value ?? []) as string[]}
                                    onChange={onChange}
                                  />
                                  <HelperText
                                    type="error"
                                    visible={!selectedCategories.length && !!errors.selectedCategories}
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
                {currentStep === 5 && (
                  <>
                    <View className="mt-2">
                      <Divider style={{ height: 1, backgroundColor: colors.borderColor2, marginVertical: 16 }} />
                      <Text className="text-xl mb-4 font-bold" style={{ color: colors.sectionHeaderText }}>
                        {t("form.beautySalonCategories")}
                      </Text>

                      {/* Güzellik Uzmanı Belgesi (Opsiyonel) */}
                      <View className="mb-4">
                        <Text className="text-lg mb-2 font-century-gothic-bold" style={{ color: colors.sectionHeaderText }}>
                          {t("form.beautyExpert")} ({t("common.optional")})
                        </Text>
                        <Controller
                          control={control}
                          name="beautySalonCertificateImage"
                          render={({ field: { value, onChange } }) => (
                            <>
                              <TouchableOpacity
                                activeOpacity={0.85}
                                disabled={isCertificateLoading}
                                onPress={async () => {
                                  setIsCertificateLoading(true);
                                  try {
                                    const file = await handlePickImage();
                                    if (file) onChange(file);
                                  } finally {
                                    setIsCertificateLoading(false);
                                  }
                                }}
                              >
                                <TextInput
                                  label={t("form.beautySalonCertificate")}
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
                                    errors.beautySalonCertificateImage ? "#b00020" : colors.borderColor2
                                  }
                                  right={
                                    isCertificateLoading ? (
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
                                      onSurfaceVariant: "gray",
                                      primary: colors.sectionHeaderText,
                                    },
                                  }}
                                  style={{ backgroundColor: colors.cardBg }}
                                />
                              </TouchableOpacity>
                              {value?.uri && !isCertificateLoading && (
                                <View className="mt-2 mb-2 w-full">
                                  <Image
                                    source={{ uri: value.uri }}
                                    style={{
                                      width: "100%",
                                      height: 200,
                                      borderRadius: 10,
                                    }}
                                    resizeMode="cover"
                                  />
                                </View>
                              )}
                              <HelperText
                                type="error"
                                visible={!!errors.beautySalonCertificateImage}
                              >
                                {errors?.beautySalonCertificateImage?.message as string}
                              </HelperText>
                            </>
                          )}
                        />
                      </View>
                    </View>

                    {/* Güzellik Salonu Kategorileri (Belge seçildiyse veya mevcut güzellik hizmetleri varsa) */}
                    {(beautySalonCertificateImage || (selectedBeautySalonCategories?.length ?? 0) > 0) && beautySalonMainHeadingOptions.length > 0 ? (
                      <View>
                        {/* Güzellik Uzmanı Ana Başlıklar */}
                        <View className="mt-2">
                          <Text className="text-lg mb-2 font-century-gothic-bold" style={{ color: colors.sectionHeaderText }}>
                            {t("form.beautySalonMainHeadings")} *
                          </Text>
                          <View className="rounded-xl p-3" style={{ borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardBg }}>
                            <Controller
                              control={control}
                              name="selectedBeautySalonMainHeadings"
                              render={({ field: { value, onChange }, fieldState: { error } }) => (
                                <>
                                  <CategoryListSelect
                                    data={beautySalonMainHeadingOptions}
                                    value={(value ?? []) as string[]}
                                    onChange={onChange}
                                  />
                                  <HelperText type="error" visible={!(value?.length) && !!error} style={{ fontFamily: 'CenturyGothic' }}>
                                    {error?.message as string}
                                  </HelperText>
                                </>
                              )}
                            />
                          </View>
                        </View>

                        {/* Güzellik Uzmanı Alt Başlıklar */}
                        {selectedBeautySalonMainHeadings.length > 0 && beautySalonSubHeadingOptions.length > 0 && (
                          <View className="mt-3">
                            <Text className="text-lg mb-2 font-century-gothic-bold" style={{ color: colors.sectionHeaderText }}>
                              {t("form.beautySalonSubHeadings")}
                            </Text>
                            <View className="rounded-xl p-3" style={{ borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardBg }}>
                              <Controller
                                control={control}
                                name="selectedBeautySalonSubHeadings"
                                render={({ field: { value, onChange } }) => (
                                  <>
                                    <CategoryListSelect
                                      data={beautySalonSubHeadingOptions}
                                      value={(value ?? []) as string[]}
                                      onChange={onChange}
                                    />
                                    <HelperText
                                      type="error"
                                      visible={!selectedBeautySalonSubHeadings.length && !!errors.selectedBeautySalonSubHeadings}
                                    >
                                      {errors.selectedBeautySalonSubHeadings?.message}
                                    </HelperText>
                                  </>
                                )}
                              />
                            </View>
                          </View>
                        )}

                        {/* Güzellik Uzmanı Hizmetleri */}
                        {selectedBeautySalonSubHeadings.length > 0 && beautySalonCategoryOptions.length > 0 && (
                          <View className="mt-3">
                            <Text className="text-lg mb-2 font-century-gothic-bold" style={{ color: colors.sectionHeaderText }}>
                              {t("form.beautySalonServices")}
                            </Text>
                            <View className="rounded-xl p-3" style={{ borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardBg }}>
                              <Controller
                                control={control}
                                name="selectedBeautySalonCategories"
                                render={({ field: { value, onChange }, fieldState: { error } }) => {
                                  const currentValue = value ?? [];
                                  return (
                                    <>
                                      <CategoryListSelect
                                        data={beautySalonCategoryOptionsWithSelected}
                                        value={currentValue as string[]}
                                        onChange={onChange}
                                      />
                                      <HelperText
                                        type="error"
                                        visible={!currentValue.length && !!error}
                                      >
                                        {error?.message}
                                      </HelperText>
                                    </>
                                  );
                                }}
                              />
                            </View>
                          </View>
                        )}
                      </View>
                    ) : null}
                  </>
                )}
                {currentStep === 6 && (
                  <>
                    {/* Prices - Ana Kategori Hizmetleri */}
                    {(selectedCategories ?? []).length > 0 && (
                      <View className="mt-2 mx-0 rounded-xl p-4" style={{ backgroundColor: colors.cardBg }}>
                        <Text className="text-lg mb-3 font-semibold" style={{ color: colors.sectionHeaderText }}>
                          {t("form.servicesTitle")} - {t("form.mainCategories")}
                        </Text>
                        {(selectedCategories ?? []).map((categoryId) => {
                          const label =
                            categoryLabelMap.get(categoryId) ?? categoryId;
                          return (
                            <View
                              key={categoryId}
                              className="flex-row items-center justify-between mb-2"
                            >
                              <Text className="w-[40%]" numberOfLines={1} style={{ color: colors.sectionHeaderText }}>
                                {label}
                              </Text>
                              <View className="w-[55%]">
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
                                      onChangeText={(t) =>
                                        onChange(t.replace(/[^\d.,]/g, ""))
                                      }
                                      onBlur={() => {
                                        const n = Number(
                                          value?.replace(/\./g, "").replace(",", "."),
                                        );
                                        if (!Number.isNaN(n)) {
                                          onChange(
                                            new Intl.NumberFormat("tr-TR", {
                                              minimumFractionDigits: 0,
                                              maximumFractionDigits: 2,
                                            }).format(n),
                                          );
                                        }
                                      }}
                                      textColor={colors.sectionHeaderText}
                                      outlineColor={error ? "#b00020" : colors.borderColor2}
                                      style={{
                                        backgroundColor: colors.cardBg,
                                        height: 40,
                                      }}
                                      theme={{
                                        roundness: 10,
                                        colors: {
                                          onSurfaceVariant: "gray",
                                          primary: colors.sectionHeaderText,
                                        },
                                      }}
                                    />
                                  )}
                                />
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {/* Prices - Güzellik Salonu Hizmetleri */}
                    {(selectedBeautySalonCategories ?? []).length > 0 && (
                      <View className="mt-4 mx-0 rounded-xl p-4" style={{ backgroundColor: colors.cardBg }}>
                        <Text className="text-lg mb-3 font-semibold" style={{ color: colors.sectionHeaderText }}>
                          {t("form.servicesTitle")} - {t("form.beautySalonCategories")}
                        </Text>
                        {(selectedBeautySalonCategories ?? []).map((categoryId) => {
                          const label =
                            categoryLabelMap.get(categoryId) ?? categoryId;
                          const priceKey = bsPriceKey(categoryId);
                          return (
                            <View
                              key={`bs-${categoryId}`}
                              className="flex-row items-center justify-between mb-2"
                            >
                              <Text className="w-[40%]" numberOfLines={1} style={{ color: colors.sectionHeaderText }}>
                                {label}
                              </Text>
                              <View className="w-[55%]">
                                <Controller
                                  control={control}
                                  name={`prices.${priceKey}` as const}
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
                                      onChangeText={(t) =>
                                        onChange(t.replace(/[^\d.,]/g, ""))
                                      }
                                      onBlur={() => {
                                        const n = Number(
                                          value?.replace(/\./g, "").replace(",", "."),
                                        );
                                        if (!Number.isNaN(n)) {
                                          onChange(
                                            new Intl.NumberFormat("tr-TR", {
                                              minimumFractionDigits: 0,
                                              maximumFractionDigits: 2,
                                            }).format(n),
                                          );
                                        }
                                      }}
                                      textColor={colors.sectionHeaderText}
                                      outlineColor={error ? "#b00020" : colors.borderColor2}
                                      style={{
                                        backgroundColor: colors.cardBg,
                                        height: 40,
                                      }}
                                      theme={{
                                        roundness: 10,
                                        colors: {
                                          onSurfaceVariant: "gray",
                                          primary: colors.sectionHeaderText,
                                        },
                                      }}
                                    />
                                  )}
                                />
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}

                  </>
                )}
                {currentStep === 7 && (
                  <>
                    <View className="px-0 py-4">
                      <Text className="text-lg font-bold mb-4" style={{ color: colors.sectionHeaderText }}>
                        {t("form.stepPreview")}
                      </Text>
                      <View className="rounded-xl p-4 gap-3" style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderColor }}>
                        {(getValues("images") ?? []).length > 0 && (
                          <View className="mb-3">
                            <Text className="text-base font-century-gothic-bold mb-2" style={{ color: colors.sectionHeaderText }}>{t("form.panelImagesTitle")}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                              {(getValues("images") ?? []).map((img: { uri: string }, idx: number) => (
                                <Image key={idx} source={{ uri: img.uri }} style={{ width: 140, height: 110, borderRadius: 10 }} resizeMode="cover" />
                              ))}
                            </ScrollView>
                          </View>
                        )}
                        <Row label={t("form.panelInformation")} value={`${getValues("name") ?? ""} ${getValues("surname") ?? ""}`.trim()} colors={colors} />
                        <RowList label={t("form.mainCategories")} items={(getValues("selectedMainCategories") ?? []).map((id: string) => categoryLabelMap.get(id) ?? id)} colors={colors} />
                        <RowList label={t("form.mainHeadings")} items={(getValues("selectedMainHeadings") ?? []).map((id: string) => categoryLabelMap.get(id) ?? id)} colors={colors} />
                        <RowList label={t("form.subHeadings")} items={(getValues("selectedSubHeadings") ?? []).map((id: string) => categoryLabelMap.get(id) ?? id)} colors={colors} />
                        <RowList label={t("form.servicesTitle")} items={(getValues("selectedCategories") ?? []).map((id: string) => categoryLabelMap.get(id) ?? id)} colors={colors} />
                        {/* Sertifika Resmi */}
                        {getValues("certificateImage")?.uri && (
                          <View className="py-1.5" style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor }}>
                            <Text className="text-base font-century-gothic-bold mb-2" style={{ color: colors.sectionHeaderText }}>{t("form.certificateImage")}</Text>
                            <Image source={{ uri: getValues("certificateImage")!.uri }} style={{ width: "100%", height: 160, borderRadius: 10 }} resizeMode="cover" />
                          </View>
                        )}
                        {/* Güzellik Uzmanı Sertifika Resmi */}
                        {getValues("beautySalonCertificateImage")?.uri && (
                          <View className="py-1.5" style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor }}>
                            <Text className="text-base font-century-gothic-bold mb-2" style={{ color: colors.sectionHeaderText }}>{t("form.beautyExpert")}</Text>
                            <Image source={{ uri: getValues("beautySalonCertificateImage")!.uri }} style={{ width: "100%", height: 160, borderRadius: 10 }} resizeMode="cover" />
                          </View>
                        )}
                        {/* Güzellik Salonu Kategorileri */}
                        <RowList label={t("form.beautySalonMainHeadings")} items={(getValues("selectedBeautySalonMainHeadings") ?? []).map((id: string) => id)} colors={colors} />
                        <RowList label={t("form.beautySalonSubHeadings")} items={(getValues("selectedBeautySalonSubHeadings") ?? []).map((id: string) => id)} colors={colors} />
                        <RowList label={t("form.beautySalonServices")} items={(getValues("selectedBeautySalonCategories") ?? []).map((id: string) => id)} colors={colors} />
                        {Object.keys(getValues("prices") ?? {}).length > 0 && (
                          <View className="mt-2">
                            <Text className="text-gray-400 text-sm mb-1">{t("form.stepPrices")}</Text>
                            {Object.entries(getValues("prices") ?? {}).map(([catId, price], idx) => {
                              const displayName = stripBsPrefix(catId);
                              const isBs = isBsPriceKey(catId);
                              return (
                                <View key={`price-${idx}-${catId}`} className="flex-row justify-between py-1">
                                  <Text className="flex-1" style={{ color: colors.sectionHeaderText }}>
                                    {categoryLabelMap.get(displayName) ?? displayName}
                                    {isBs ? ` (${t("form.beautySalonCategories")})` : ""}
                                  </Text>
                                  <Text className="text-[#ffb900]">{typeof price === "string" ? price : ""}</Text>
                                </View>
                              );
                            })}
                          </View>
                        )}
                        {/* Konum önizlemede gösterilmiyor */}
                      </View>
                    </View>
                  </>
                )}
                {currentStep === 8 && isEdit && (
                  <>
                    <View className="px-4 mt-2">
                      <View className="rounded-xl p-4 flex-row items-center justify-between" style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderColor }}>
                        <Text className="text-lg font-bold" style={{ color: colors.sectionHeaderText }}>
                          {t("status.availabilityStatus")}
                        </Text>
                        <Controller
                          control={control}
                          name="isAvailable"
                          render={({ field: { value, onChange } }) => (
                            <Switch
                              value={value}
                              onValueChange={onChange}
                              color="#0f766e"
                            />
                          )}
                        />
                      </View>
                    </View>
                  </>
                )}

                <View className="px-3 my-4 flex-row gap-3 pb-6">
                  {currentStep > 0 && (
                    <Button
                      className="flex-1 font-century-gothic"
                      mode="outlined"
                      onPress={handlePrevStep}
                      buttonColor="#ffb900"
                      textColor="#ffb900"
                      labelStyle={{ fontSize: 16 }}
                    >
                      {t("form.stepPrev")}
                    </Button>
                  )}
                  {currentStep < totalSteps - 1 ? (
                    <Button
                      className="font-century-gothic flex-1"
                      mode="contained"
                      onPress={handleNextStep}
                      buttonColor="#ffb900"
                      textColor="#1F2937"
                      labelStyle={{ fontSize: 16 }}
                    >
                      {t("form.stepNext")}
                    </Button>
                  ) : (
                    <Button
                      className="flex-1 font-century-gothic"
                      disabled={addFreeBarberLoad || updateFreeBarberLoad}
                      loading={addFreeBarberLoad || updateFreeBarberLoad}
                      mode="contained"
                      onPress={handleSubmit((form) => guard(() => OnSubmit(form)), onErrors)}
                      buttonColor="#10B981"
                      textColor="white"
                      labelStyle={{ fontSize: 16 }}
                    >
                      {!isEdit ? t("common.add") : t("common.update")}
                    </Button>
                  )}
                </View>
              </Animated.View>
            </ScrollView>
          </>
        )}
      </View>
    );
  },
);
