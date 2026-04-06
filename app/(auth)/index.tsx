import {
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  useWindowDimensions,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "../components/common/Text";
import React, { useEffect, useMemo, useState } from "react";
import {
  HelperText,
  Icon,
  TextInput,
  Portal,
  Modal,
  DefaultTheme,
} from "react-native-paper";
import { showSnack } from "../store/snackbarSlice";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { userTypeItems } from "../constants";
import {
  useSendOtpMutation,
  useVerifyOtpMutation,
  api,
} from "../store/api";
import { OtpInput } from "react-native-otp-entry";
import { tokenStore } from "../lib/tokenStore";
import { loadTokens, saveTokens } from "../lib/tokenStorage";
import { OtpPurpose, UserType } from "../types";
import { pathByUserType } from "../utils/auth/redirect-by-user-type";
import { useAppDispatch } from "../store/hook";
import { getUserTypeFromToken } from "../utils/auth/auth";
import { useTheme } from "../hook/useTheme";
import { useLanguage } from "../hook/useLanguage";
import { LanguageSelector } from "../components/common/LanguageSelector";
import { LegalAgreementCheckbox } from "../components/auth/LegalAgreementCheckbox";
import { useSafeNavigation } from "../hook/useSafeNavigation";
import { persistHelpGuideOnboardingFromAuthPayload } from "../lib/helpGuideOnboarding";
import { useActionGuard } from "../hook/useActionGuard";

/** NetGsmSmsManager OTP_VALIDITY_SECONDS ile aynı (60 sn). */
const OTP_COUNTDOWN_SECONDS = 60;

/** #RRGGBB → yarı saydam OTP modal backdrop (ekran zeminiyle uyumlu). */
function backdropFromScreenBg(screenBg: string, isDark: boolean): string {
  const hex = screenBg.replace(/^#/, "").trim();
  if (hex.length !== 6 || !/^[a-fA-F0-9]+$/.test(hex)) {
    return isDark ? "rgba(0,0,0,0.78)" : "rgba(245,247,250,0.9)";
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const a = isDark ? 0.88 : 0.9;
  return `rgba(${r},${g},${b},${a})`;
}

// Schema'yı dinamik olarak oluşturmak için fonksiyon
const createSchemas = (t: (key: string) => string) => {
  const registerSchema = z.object({
    mode: z.literal("register"),
    firstName: z
      .string({
        required_error: t("auth.firstName") + " " + t("common.required"),
        invalid_type_error: t("auth.firstName") + " " + t("common.invalid"),
      })
      .min(2, {
        message:
          t("auth.firstName") +
          " " +
          t("common.minLength").replace("{{min}}", "2"),
      })
      .max(20, {
        message:
          t("auth.firstName") +
          " " +
          t("common.maxLength").replace("{{max}}", "20"),
      })
      .regex(/^\S+$/, {
        message: t("auth.firstName") + " " + t("common.noSpaces"),
      })
      .transform((value) => value.replace(/\s+/g, "")),
    surname: z
      .string({
        required_error: t("auth.lastName") + " " + t("common.required"),
        invalid_type_error: t("auth.lastName") + " " + t("common.invalid"),
      })
      .min(2, {
        message:
          t("auth.lastName") +
          " " +
          t("common.minLength").replace("{{min}}", "2"),
      })
      .max(20, {
        message:
          t("auth.lastName") +
          " " +
          t("common.maxLength").replace("{{max}}", "20"),
      })
      .regex(/^\S+$/, {
        message: t("auth.lastName") + " " + t("common.noSpaces"),
      })
      .transform((value) => value.replace(/\s+/g, "")),
    phone: z
      .string({
        required_error: t("auth.phoneNumber") + " " + t("common.required"),
        invalid_type_error: t("auth.phoneNumber") + " " + t("common.invalid"),
      })
      .length(10, {
        message:
          t("auth.phoneNumber") +
          " " +
          t("common.exactLength").replace("{{length}}", "10"),
      }),
    userType: z.enum(["customer", "freeBarber", "barberStore"], {
      errorMap: () => ({
        message: t("auth.userType") + " " + t("common.required"),
      }),
    }),
    legalAgreed: z.literal(true, {
      errorMap: () => ({ message: t("legal.mustAgree") }),
    }),
  });
  const loginSchema = z.object({
    mode: z.literal("login"),
    phone: z
      .string({
        required_error: t("auth.phoneNumber") + " " + t("common.required"),
        invalid_type_error: t("auth.phoneNumber") + " " + t("common.invalid"),
      })
      .length(10, {
        message:
          t("auth.phoneNumber") +
          " " +
          t("common.exactLength").replace("{{length}}", "10"),
      }),
    firstName: z.string().optional(),
    surname: z.string().optional(),
    userType: z.enum(["customer", "freeBarber", "barberStore"], {
      errorMap: () => ({
        message: t("auth.userType") + " " + t("common.required"),
      }),
    }),
    legalAgreed: z.boolean().optional(),
  });
  return z.discriminatedUnion("mode", [loginSchema, registerSchema]);
};

type FormData = z.infer<ReturnType<typeof createSchemas>>;

const Index = () => {
  const { colors, isDark } = useTheme();
  const { t, currentLanguage } = useLanguage();
  const schema = useMemo(() => createSchemas(t), [t, currentLanguage]);
  const resolver = useMemo(() => zodResolver(schema), [schema]);
  const dispatch = useAppDispatch();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setFocus,
    getValues,
    setValue,
    watch,
    reset,
    trigger,
  } = useForm<FormData>({
    resolver,
    mode: "onChange",
    shouldUnregister: false,
    defaultValues: {
      mode: "register",
    },
  });

  // Dil değiştiğinde validation'ı tetikle
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      trigger();
    }
  }, [currentLanguage, trigger, errors]);

  const route = useSafeNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [otpResetSignal, setOtpResetSignal] = useState(0);
  const [phone, setPhone] = useState("");
  const [left, setLeft] = useState(0);
  const isRegister = watch("mode") === "register";
  const selectedUserType = watch("userType");

  const toggleMode = () =>
    setValue("mode", isRegister === true ? "login" : "register");
  const [sendOtp, { isLoading, isError, data, error }] = useSendOtpMutation();
  const [verifyOtp] = useVerifyOtpMutation();
  const guard = useActionGuard();

  /** Modal kapalıyken de geri saysın; kapatıp "Doğrulama ekranına dön" ile süre doğru kalır. */
  const otpCountdownActive = left > 0;
  useEffect(() => {
    if (!otpCountdownActive) return;
    const t = setInterval(() => setLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [otpCountdownActive]);

  const onSubmit = async (data: FormData) => guard(async () => {
    try {
      let normalizedPhone = data.phone;
      if (normalizedPhone.startsWith("0")) {
        normalizedPhone = normalizedPhone.substring(1);
      }
      if (!normalizedPhone.startsWith("+90")) {
        normalizedPhone = `+90${normalizedPhone}`;
      }

      const payloadForSendOtp: {
        phoneNumber: string;
        userType?: UserType;
        otpPurpose: OtpPurpose;
        language: string;
      } = {
        phoneNumber: normalizedPhone,
        otpPurpose: isRegister ? OtpPurpose.Register : OtpPurpose.Login,
        language: currentLanguage,
        ...(isRegister ? { userType: mapUserTypeToNumber(data.userType) } : {}),
      };

      setPhone(normalizedPhone);
      const result = await sendOtp(payloadForSendOtp);

      if ("error" in result) {
        let errorMessage = t("common.error");
        const err = result.error as any;
        if (err?.status === 429) {
          errorMessage = err?.data?.message || t("auth.rateLimitExceeded") || "Çok fazla istek gönderildiniz. Lütfen birkaç dakika bekleyin.";
        } else if (err?.data?.message) {
          errorMessage = err.data.message;
        } else if (err?.message) {
          errorMessage = err.message;
        } else if (err?.error) {
          errorMessage = err.error;
        }
        dispatch(
          showSnack({
            message: errorMessage,
            isError: true,
          }),
        );
        return;
      }

      if (result.data?.success) {
        setModalVisible(true);
        setLeft(OTP_COUNTDOWN_SECONDS);
        dispatch(
          showSnack({
            message: result.data.message || t("auth.codeSent") || "Doğrulama kodu gönderildi",
            isError: false,
          }),
        );
      } else {
        dispatch(
          showSnack({
            message: result.data?.message || t("common.error"),
            isError: true,
          }),
        );
      }
    } catch (err: any) {
      dispatch(
        showSnack({
          message: err?.data?.message || t("common.error"),
          isError: true,
        }),
      );
    }
  });

  const mmss = useMemo(() => {
    const m = Math.floor(left / 60).toString().padStart(2, "0");
    const s = (left % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [left]);

  const maskedPhoneForOtp = useMemo(() => {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 4) return phone;
    const last4 = digits.slice(-4);
    return `+90 ··· ${last4.slice(0, 2)} ${last4.slice(2)}`;
  }, [phone]);

  const otpAccentPrimary = isDark ? "#ffb900" : "#d97706";
  const otpAccentSecondary = isDark ? "#c2a523" : "#f59e0b";

  const { width: screenWidth } = useWindowDimensions();
  // Modal inner width: screen - 40 (modal outer padding) - 44 (card inner padding)
  // 6 boxes with 6px gap between = 5 * 6 = 30px total gap
  const otpBoxSize = Math.floor((Math.min(screenWidth, 380) - 40 - 44 - 30) / 6);

  /** Paper Modal arka planı `theme.colors.backdrop` ile boyanır; `screenBg` ile aynı tonda yarı saydam. */
  const otpModalPaperTheme = useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        backdrop: backdropFromScreenBg(colors.screenBg, isDark),
      },
    }),
    [colors.screenBg, isDark],
  );

  const closeOtpModal = () => {
    setModalVisible(false);
    setOtpResetSignal((s) => s + 1);
  };

  const doVerify = async (code: string, phoneNumber?: string) => guard(async () => {
    try {
      const f = getValues();
      const userTypeToSend =
        mapUserTypeToNumber(f.userType) ?? UserType.Customer;
      const phoneToSend = phoneNumber || phone;

      if (!phoneToSend || phoneToSend.trim() === "") {
        dispatch(
          showSnack({
            message: t("auth.phoneNumber") + " " + t("common.error"),
            isError: true,
          }),
        );
        return;
      }

      const result = await verifyOtp({
        firstName: f.firstName ?? "",
        lastName: f.surname ?? "",
        phoneNumber: phoneToSend,
        code: code,
        device: null,
        userType: userTypeToSend,
        mode: isRegister ? "register" : "login",
      });

      if ("error" in result) {
        const errPayload = result.error as { data?: unknown; status?: unknown };
        let msg = "";
        if ((errPayload?.status as any) === 429) {
          const d = errPayload?.data as any;
          msg = d?.message || t("auth.rateLimitExceeded") || "Çok fazla deneme yapıldı. Lütfen birkaç dakika bekleyin.";
        } else {
          const raw = errPayload?.data;
          msg =
            typeof raw === "string"
              ? raw
              : raw && typeof raw === "object" && "message" in raw
                ? String((raw as { message?: string }).message ?? "")
                : "";
        }
        const lower = msg.toLowerCase();
        const isWrongCode =
          lower.includes("geçersiz") ||
          lower.includes("invalid") ||
          lower.includes("doğrulama kodu");
        dispatch(
          showSnack({
            message: isWrongCode ? (msg || t("auth.invalidCode")) : (msg || t("common.error")),
            isError: true,
          }),
        );
        setOtpResetSignal((s) => s + 1);
        return;
      }

      const response = result.data;
      if (response?.success === true && response.data) {
        tokenStore.set({
          accessToken: response.data.token,
          refreshToken: response.data.refreshToken,
        });
        await saveTokens({
          accessToken: response.data.token,
          refreshToken: response.data.refreshToken,
        });

        await persistHelpGuideOnboardingFromAuthPayload(response.data);

        dispatch(api.util.invalidateTags(["Notification"]));
        dispatch(
          showSnack({
            message: response.message || t("auth.login"),
            isError: false,
          }),
        );

        setModalVisible(false);
        setPhone("");
        reset(); // Formu temizle

        // Kullanıcı türüne göre doğru sayfaya yönlendir
        const userTypeFromToken = getUserTypeFromToken(response.data.token);
        const targetPath = pathByUserType(userTypeFromToken);
        route.replaceImmediate(targetPath);
      } else {
        dispatch(
          showSnack({
            message: response?.message || t("common.operationFailed"),
            isError: true,
          }),
        );
        setOtpResetSignal((s) => s + 1);
      }
    } catch (err: any) {
      const raw = err?.data;
      const msg =
        typeof raw === "string"
          ? raw
          : raw?.message ?? err?.message ?? t("common.error");
      dispatch(
        showSnack({
          message: msg,
          isError: true,
        }),
      );
      setOtpResetSignal((s) => s + 1);
    }
  });

  const mapUserTypeToNumber = (ut: FormData["userType"]) => {
    switch (ut) {
      case "customer":
        return UserType.Customer;
      case "freeBarber":
        return UserType.FreeBarber;
      case "barberStore":
        return UserType.BarberStore;
      default:
        return 0;
    }
  };

  // Resend butonu sadece OTP kodunun geçerlilik süresi dolduktan sonra aktif olmalı
  // left > 0 ise kod hala geçerli, resend devre dışı
  // left === 0 ise kod süresi doldu, resend aktif
  const canResend = left === 0;
  const onResend = async () => guard(async () => {
    if (!phone) return;

    try {
      const f = getValues();
      const payloadForSendOtp: {
        phoneNumber: string;
        userType?: UserType;
        otpPurpose: OtpPurpose;
        language: string;
      } = {
        phoneNumber: phone,
        otpPurpose: isRegister ? OtpPurpose.Register : OtpPurpose.Login,
        language: currentLanguage,
        ...(isRegister ? { userType: mapUserTypeToNumber(f.userType) } : {}),
      };

      const result = await sendOtp(payloadForSendOtp);

      if ("error" in result) {
        let errorMessage = t("common.error");
        const err = result.error as any;
        if (err?.status === 429) {
          errorMessage = err?.data?.message || t("auth.rateLimitExceeded") || "Çok fazla istek gönderildiniz. Lütfen birkaç dakika bekleyin.";
        } else if (err?.data?.message) {
          errorMessage = err.data.message;
        } else if (err?.message) {
          errorMessage = err.message;
        } else if (err?.error) {
          errorMessage = err.error;
        }
        dispatch(
          showSnack({
            message: errorMessage,
            isError: true,
          }),
        );
        return;
      }

      if (result.data?.success) {
        setLeft(OTP_COUNTDOWN_SECONDS);
        dispatch(
          showSnack({
            message: result.data.message || t("auth.codeSent") || "Yeni doğrulama kodu gönderildi",
            isError: false,
          }),
        );
      } else {
        dispatch(
          showSnack({
            message: result.data?.message || t("common.error"),
            isError: true,
          }),
        );
      }
    } catch (err: any) {
      dispatch(
        showSnack({
          message: err?.data?.message || t("common.error"),
          isError: true,
        }),
      );
    }
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: colors.background }}
      >
        <View className="flex-1 items-center justify-center p-4">
          {/* Header Section */}
          <View
            className="items-center justify-center mb-4"
            style={{ backgroundColor: colors.background }}
          >
            <Text
              className="text-4xl font-bold mb-1"
              style={{
                color: isDark ? "#ffffff" : "#000000",
                letterSpacing: 0.5,
              }}
            >
              {String(t("auth.title")).toUpperCase()}
            </Text>
          </View>

          {/* Form Card */}
          <View
            className="w-10/12 max-w-sm mx-4 rounded-2xl p-4"
            style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
          >
            {/* Name and Surname (Register only) */}
            {isRegister && (
              <>
                <View style={{ marginBottom: 4 }}>
                  <Controller
                    control={control}
                    name="firstName"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <>
                        <View style={{ position: 'relative' }}>
                          <TextInput
                            mode="outlined"
                            dense
                            label={t("auth.firstName")}
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            returnKeyType="next"
                            onSubmitEditing={() => setFocus("surname")}
                            placeholder={t("auth.firstName")}
                            placeholderTextColor={colors.textTertiary}
                            textColor={colors.text}
                            outlineColor={
                              errors.firstName ? "#ef4444" : colors.inputBorder
                            }
                            style={{
                              backgroundColor: colors.inputBackground,
                              fontSize: 16,
                              fontFamily: 'CenturyGothic-Bold',
                              shadowColor: '#000000',
                              shadowOffset: { width: 0, height: 4 },
                              shadowOpacity: 0.13,
                              shadowRadius: 6,
                              elevation: 4,
                            }}
                            contentStyle={{ height: 48, paddingVertical: 0 }}
                            theme={{
                              roundness: 10,
                              colors: {
                                background: colors.inputBackground,
                                onSurface: colors.text,
                                primary: colors.primary,
                              },
                            }}
                          />
                          <View pointerEvents="none" style={{ position: 'absolute', bottom: 6, left: 0, right: 0, height: 1, backgroundColor: colors.inputBorder, opacity: 0.3 }} />
                        </View>
                        {errors.firstName && (
                          <HelperText
                            type="error"
                            visible={true}
                            style={{
                              color: "#ef4444",
                              fontSize: 11,
                              fontWeight: "500",
                              fontFamily: 'CenturyGothic-Bold',
                              marginTop: -4,
                              marginBottom: 0,
                              paddingHorizontal: 0,

                            }}
                          >
                            {errors.firstName?.message}
                          </HelperText>
                        )}
                      </>
                    )}
                  />
                </View>
                <View style={{ marginBottom: 4 }}>
                  <Controller
                    control={control}
                    name="surname"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <>
                        <View style={{ position: 'relative' }}>
                          <TextInput
                            mode="outlined"
                            dense
                            label={t("auth.lastName")}
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            returnKeyType="next"
                            onSubmitEditing={() => setFocus("phone")}
                            placeholder={t("auth.lastName")}
                            placeholderTextColor={colors.textTertiary}
                            textColor={colors.text}
                            outlineColor={
                              errors.surname ? "#ef4444" : colors.inputBorder
                            }
                            style={{
                              backgroundColor: colors.inputBackground,
                              fontSize: 16,
                              fontFamily: 'CenturyGothic-Bold',
                              shadowColor: '#000000',
                              shadowOffset: { width: 0, height: 4 },
                              shadowOpacity: 0.13,
                              shadowRadius: 6,
                              elevation: 4,
                            }}
                            contentStyle={{ height: 48, paddingVertical: 0 }}
                            theme={{
                              roundness: 10,
                              colors: {
                                background: colors.inputBackground,
                                onSurface: colors.text,
                                primary: colors.primary,
                              },
                            }}
                          />
                          <View pointerEvents="none" style={{ position: 'absolute', bottom: 6, left: 0, right: 0, height: 1, backgroundColor: colors.inputBorder, opacity: 0.3 }} />
                        </View>
                        {errors.surname && (
                          <HelperText
                            type="error"
                            visible={true}
                            style={{
                              color: "#ef4444",
                              fontSize: 11,
                              fontWeight: "500",
                              fontFamily: 'CenturyGothic-Bold',
                              marginTop: -4,
                              marginBottom: 0,
                              paddingHorizontal: 0,
                            }}
                          >
                            {errors.surname?.message}
                          </HelperText>
                        )}
                      </>
                    )}
                  />
                </View>
              </>
            )}

            {/* Phone Number Input */}
            <View style={{ marginBottom: 4 }}>
              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <>
                    <View style={{ position: 'relative' }}>
                      <TextInput
                        mode="outlined"
                        dense
                        label={t("auth.phoneNumber")}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="number-pad"
                        placeholder="555 555 5555"
                        placeholderTextColor={colors.textTertiary}
                        textColor={colors.text}
                        outlineColor={
                          errors.phone ? "#ef4444" : colors.inputBorder
                        }
                        left={
                          <TextInput.Icon
                            icon="phone"
                            color={colors.textSecondary}
                            style={{ marginTop: 6 }}
                          />
                        }
                        style={{
                          backgroundColor: colors.inputBackground,
                          fontSize: 16,
                          fontFamily: 'CenturyGothic-Bold',
                          shadowColor: '#000000',
                          shadowOffset: { width: 0, height: 3 },
                          shadowOpacity: 0.08,
                          shadowRadius: 2,
                          elevation: 2,
                        }}
                        contentStyle={{ height: 48, paddingVertical: 0 }}
                        theme={{
                          roundness: 10,
                          colors: {
                            background: colors.inputBackground,
                            onSurface: colors.text,
                            primary: colors.primary,
                          },
                        }}
                      />
                      <View pointerEvents="none" style={{ position: 'absolute', bottom: 6, left: 0, right: 0, height: 1, backgroundColor: colors.inputBorder, opacity: 0.3 }} />
                    </View>
                    {errors.phone && (
                      <HelperText
                        type="error"
                        visible={true}
                        style={{
                          color: "#ef4444",
                          fontSize: 11,
                          fontWeight: "500",
                          fontFamily: 'CenturyGothic-Bold',
                          marginTop: -4,
                          marginBottom: 0,
                          paddingHorizontal: 0,
                        }}
                      >
                        {errors.phone?.message}
                      </HelperText>
                    )}
                  </>
                )}
              />
            </View>

            {/* User Type Selection */}
            <View style={{ marginBottom: 0 }}>
              <Text className="text-base font-bold mb-1" style={{ color: colors.text }}>
                {t("auth.userType")}
              </Text>
              <Controller
                control={control}
                name="userType"
                render={({ field: { value, onChange } }) => (
                  <View>
                    <View className="flex-row gap-2">
                      {userTypeItems.map((item) => {
                        const isSelected = value === item.value;
                        return (
                          <TouchableOpacity
                            key={item.value}
                            className="flex-1 flex-row items-center justify-center py-2.5 px-3 rounded-lg"
                            style={{
                              backgroundColor: isSelected
                                ? colors.primary
                                : colors.inputBackground,
                              borderWidth: 1.5,
                              borderColor: isSelected ? colors.primary : colors.inputBorder,
                              shadowColor: '#000000',
                              shadowOffset: { width: 0, height: 3 },
                              shadowOpacity: 0.08,
                              shadowRadius: 2,
                              elevation: 2,
                            }}
                            onPress={() => onChange(item.value)}
                          >
                            <Icon
                              source={item.icon}
                              size={18}
                              color={isSelected ? colors.primaryText : colors.text}
                            />
                            <Text
                              className="text-sm ml-2 font-bold"
                              style={{
                                color: isSelected ? colors.primaryText : colors.text,
                              }}
                            >
                              {item.value === "customer"
                                ? t("auth.customer")
                                : item.value === "freeBarber"
                                  ? t("auth.barber")
                                  : t("auth.salon")}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <HelperText
                      type="error"
                      visible={!!errors.userType}
                      style={{
                        color: "#ef4444",
                        fontSize: 12,
                        fontWeight: "600",
                        fontFamily: 'CenturyGothic-Bold',
                        marginTop: 0,
                        marginBottom: 0,
                      }}
                    >
                      {errors.userType?.message as string}
                    </HelperText>
                  </View>
                )}
              />
            </View>

            {/* Legal Agreement Checkbox - Only for Register */}
            {isRegister && (
              <View style={{ marginTop: 4, marginBottom: 8 }}>
                <Controller
                  control={control}
                  name="legalAgreed"
                  render={({ field: { value, onChange } }) => (
                    <LegalAgreementCheckbox
                      checked={value === true}
                      onToggle={onChange}
                      error={errors.legalAgreed?.message as string}
                    />
                  )}
                />
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              className="w-full rounded-lg py-3  items-center justify-center"
              style={{
                backgroundColor: colors.primary,
                opacity: isLoading ? 0.6 : 1,
                shadowColor: '#ffb900',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.35,
                shadowRadius: 6,
                elevation: 4,
              }}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primaryText} size="small" />
              ) : (
                <Text
                  className="text-lg font-bold"
                  style={{ color: colors.primaryText }}
                >
                  {t("auth.start")}
                </Text>
              )}
            </TouchableOpacity>

            {phone.length > 0 && !modalVisible ? (
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
                className="w-full mt-3 py-2.5 items-center justify-center rounded-lg"
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.inputBackground,
                }}
              >
                <Text
                  className="text-base font-century-gothic-bold"
                  style={{ color: otpAccentPrimary }}
                >
                  {t("auth.backToOtpVerification")}
                </Text>
              </TouchableOpacity>
            ) : null}

            {/* Login/Register Toggle */}
            <View className="flex-row items-center justify-center gap-2 mt-4">
              <Text className="text-base font-century-gothic-bold" style={{ color: colors.textSecondary }}>
                {isRegister
                  ? t("auth.alreadyHaveAccount")
                  : t("auth.noAccount")}
              </Text>
              <TouchableOpacity
                onPress={toggleMode}
                className="flex-row items-center "
              >
                <Text
                  className="text-base underline font-bold"
                  style={{ color: colors.text }}
                >
                  {isRegister ? t("auth.login") : t("auth.register")}
                </Text>
                <View className="ml-0.5">
                  <Icon source="arrow-right" size={16} color={colors.text} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Language Selector */}
            <View className="mt-4 mb-0.5 items-center">
              <LanguageSelector showLabel={true} />
            </View>
          </View>
        </View>
      </ScrollView>

      <Portal>
        <Modal
          visible={modalVisible}
          dismissable={false}
          theme={otpModalPaperTheme}
          contentContainerStyle={{
            flexGrow: 1,
            width: "100%",
            minHeight: Dimensions.get("window").height,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 20,
            margin: 0,
            backgroundColor: "transparent",
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 380,
              alignSelf: "center",
              borderRadius: 20,
              overflow: "hidden",
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: isDark ? 0.45 : 0.15,
              shadowRadius: 20,
              elevation: 16,
            }}
          >
                <LinearGradient
                  colors={[otpAccentSecondary, otpAccentPrimary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ height: 3, width: "100%" }}
                />
                <View style={{ paddingHorizontal: 22, paddingTop: 16, paddingBottom: 18 }}>

                  {/* Header — icon + close */}
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isDark ? "rgba(255,185,0,0.12)" : "rgba(217,119,6,0.1)",
                        }}
                      >
                        <Icon source="shield-key" size={20} color={otpAccentPrimary} />
                      </View>
                      <View>
                        <Text style={{ fontFamily: "CenturyGothic-Bold", fontSize: 16, color: colors.text }}>
                          {t("auth.verifyPhone")}
                        </Text>
                        <Text style={{ fontFamily: "CenturyGothic", fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                          {maskedPhoneForOtp || phone}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={closeOtpModal}
                      hitSlop={12}
                      accessibilityRole="button"
                      accessibilityLabel={t("common.cancel")}
                      style={({ pressed }) => ({
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: 1,
                        backgroundColor: pressed ? colors.inputBackground : "transparent",
                      })}
                    >
                      <Icon source="close" size={18} color={colors.textSecondary} />
                    </Pressable>
                  </View>

                  {/* Hint text */}
                  <Text style={{ fontFamily: "CenturyGothic", fontSize: 12, color: colors.textSecondary, marginBottom: 14 }}>
                    {t("auth.enterCode", { phone: maskedPhoneForOtp || phone })}
                  </Text>

                  {/* OTP boxes — dynamic width */}
                  <OtpInput
                    key={`otp-${otpResetSignal}`}
                    numberOfDigits={6}
                    onFilled={(code) => doVerify(code, phone)}
                    focusColor={otpAccentPrimary}
                    theme={{
                      containerStyle: {
                        marginBottom: 16,
                        gap: 6,
                      },
                      pinCodeContainerStyle: {
                        width: otpBoxSize,
                        height: otpBoxSize + 6,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: colors.inputBorder,
                        backgroundColor: colors.inputBackground,
                      },
                      focusedPinCodeContainerStyle: {
                        borderColor: otpAccentPrimary,
                        borderWidth: 2,
                        backgroundColor: isDark ? "rgba(255,185,0,0.08)" : "rgba(217,119,6,0.06)",
                      },
                      pinCodeTextStyle: {
                        fontSize: Math.min(otpBoxSize * 0.44, 22),
                        fontWeight: "700",
                        color: colors.text,
                        fontFamily: "CenturyGothic-Bold",
                      },
                    }}
                    type="numeric"
                    autoFocus
                  />

                  {/* Timer + Resend */}
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Icon
                        source="clock-outline"
                        size={15}
                        color={left > 0 ? otpAccentPrimary : colors.textSecondary}
                      />
                      <Text
                        style={{
                          fontFamily: "CenturyGothic-Bold",
                          fontSize: 13,
                          color: left > 0 ? colors.text : colors.textSecondary,
                          fontVariant: ["tabular-nums"],
                        }}
                      >
                        {mmss}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={onResend}
                      disabled={!canResend || isLoading}
                      activeOpacity={0.8}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 7,
                        borderRadius: 10,
                        borderWidth: 1.5,
                        borderColor: canResend && !isLoading ? otpAccentPrimary : colors.inputBorder,
                        backgroundColor: canResend && !isLoading
                          ? isDark ? "rgba(255,185,0,0.1)" : "rgba(217,119,6,0.08)"
                          : "transparent",
                        opacity: canResend && !isLoading ? 1 : 0.45,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      {isLoading ? (
                        <ActivityIndicator color={otpAccentPrimary} size="small" />
                      ) : (
                        <>
                          <Icon source="refresh" size={14} color={otpAccentPrimary} />
                          <Text style={{ fontFamily: "CenturyGothic-Bold", fontSize: 13, color: otpAccentPrimary }}>
                            {t("auth.resendCode")}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
        </Modal>
      </Portal>
    </KeyboardAvoidingView>
  );
};

export default Index;
