import {
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Text } from "../components/common/Text";
import React, { useEffect, useMemo, useState } from "react";
import { TextInput, HelperText, Portal, Modal, Icon } from "react-native-paper";
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
import { useRouter } from "expo-router";
import { pathByUserType } from "../utils/auth/redirect-by-user-type";
import { useAppDispatch } from "../store/hook";
import { getUserTypeFromToken } from "../utils/auth/auth";
import { useTheme } from "../hook/useTheme";
import { useLanguage } from "../hook/useLanguage";
import { LanguageSelector } from "../components/common/LanguageSelector";
import { LegalAgreementCheckbox } from "../components/auth/LegalAgreementCheckbox";

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

  const route = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [phone, setPhone] = useState("");
  const [left, setLeft] = useState(0);
  const isRegister = watch("mode") === "register";
  const selectedUserType = watch("userType");

  const toggleMode = () =>
    setValue("mode", isRegister === true ? "login" : "register");
  const [sendOtp, { isLoading, isError, data, error }] = useSendOtpMutation();
  const [verifyOtp] = useVerifyOtpMutation();

  useEffect(() => {
    if (!modalVisible || left <= 0) return;
    const t = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [modalVisible, left]);

  // Reset timer when modal opens
  // Twilio OTP kodları 10 dakika (600 saniye) geçerlidir
  // Bu süre boyunca resend butonu devre dışı olmalı
  useEffect(() => {
    if (modalVisible) {
      setLeft(120); // 2 minutes (120 seconds) - NetGSM OTP validity period
    }
  }, [modalVisible]);

  const onSubmit = async (data: FormData) => {
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
      } = {
        phoneNumber: normalizedPhone,
        otpPurpose: isRegister ? OtpPurpose.Register : OtpPurpose.Login,
        ...(isRegister ? { userType: mapUserTypeToNumber(data.userType) } : {}),
      };

      setPhone(normalizedPhone);
      const result = await sendOtp(payloadForSendOtp);

      if ("error" in result) {
        let errorMessage = t("common.error");
        if (result.error && 'data' in result.error) {
          const errorData = result.error.data as any;
          errorMessage = errorData?.message || errorMessage;
        } else if (result.error && 'message' in result.error) {
          errorMessage = (result.error as any).message || errorMessage;
        } else if (result.error && 'error' in result.error) {
          errorMessage = (result.error as any).error || errorMessage;
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
        setLeft(600); // Start 10 minute countdown (Twilio OTP validity period)
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
  };

  const mmss = useMemo(() => {
    const m = Math.floor(left / 60)
      .toString()
      .padStart(2, "0");
    const s = (left % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [left]);

  const doVerify = async (code: string, phoneNumber?: string) => {
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
        throw new Error("Login failed");
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

        dispatch(api.util.invalidateTags(["Notification"]));
        dispatch(
          showSnack({
            message: response.message || t("auth.login"),
            isError: false,
          }),
        );

        setModalVisible(false);
        reset(); // Formu temizle

        // Kullanıcı türüne göre doğru sayfaya yönlendir
        const userTypeFromToken = getUserTypeFromToken(response.data.token);
        const targetPath = pathByUserType(userTypeFromToken);
        route.replace(targetPath);
      } else {
        dispatch(
          showSnack({
            message: response?.message || t("common.operationFailed"),
            isError: true,
          }),
        );
      }
    } catch (err: any) {
      dispatch(
        showSnack({
          message: err?.data?.message ?? t("common.error"),
          isError: true,
        }),
      );
    }
  };

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
  const onResend = async () => {
    if (!phone) return;

    try {
      const f = getValues();
      const payloadForSendOtp: {
        phoneNumber: string;
        userType?: UserType;
        otpPurpose: OtpPurpose;
      } = {
        phoneNumber: phone,
        otpPurpose: isRegister ? OtpPurpose.Register : OtpPurpose.Login,
        ...(isRegister ? { userType: mapUserTypeToNumber(f.userType) } : {}),
      };

      const result = await sendOtp(payloadForSendOtp);

      if ("error" in result) {
        let errorMessage = t("common.error");
        if (result.error && 'data' in result.error) {
          const errorData = result.error.data as any;
          errorMessage = errorData?.message || errorMessage;
        } else if (result.error && 'message' in result.error) {
          errorMessage = (result.error as any).message || errorMessage;
        } else if (result.error && 'error' in result.error) {
          errorMessage = (result.error as any).error || errorMessage;
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
        setLeft(600); // Reset countdown to 10 minutes (Twilio OTP validity period)
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
  };

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
              {t("auth.title").toLocaleUpperCase('tr-TR')}
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
                backgroundColor: "#1a1a1a",
                opacity: isLoading ? 0.6 : 1,
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.15,
                shadowRadius: 3,
                elevation: 3,
              }}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text
                  className="text-lg font-bold"
                  style={{ color: "#ffffff" }}
                >
                  {t("auth.start")}
                </Text>
              )}
            </TouchableOpacity>

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

          {/* OTP Modal */}
          <Portal>
            <Modal
              visible={modalVisible}
              dismissable={false}
              contentContainerStyle={{
                padding: 20,
                margin: 20,
                borderRadius: 16,
                backgroundColor: colors.card,
              }}
            >
              <Text
                className="text-xl font-bold mb-2"
                style={{ color: colors.text }}
              >
                {t("auth.verifyPhone")}
              </Text>
              <Text
                className="text-sm mb-5 font-century-gothic-bold"
                style={{ color: colors.textSecondary }}
              >
                {t("auth.enterCode", { phone })}
              </Text>

              <OtpInput
                numberOfDigits={6}
                onFilled={(code: any) => doVerify(code, phone)}
                focusColor={colors.primary}
                theme={{
                  containerStyle: { marginBottom: 12 },
                  pinCodeContainerStyle: {
                    width: 48,
                    height: 56,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.inputBorder,
                    backgroundColor: colors.inputBackground,
                  },
                  pinCodeTextStyle: {
                    fontSize: 22,
                    color: colors.text,
                  },
                }}
                type="numeric"
              />

              <View className="flex-row justify-between items-center">
                <Text
                  className="text-sm font-century-gothic-bold"
                  style={{ color: colors.textSecondary }}
                >
                  {t("auth.timeRemaining", { time: mmss })}
                </Text>
                <TouchableOpacity
                  onPress={onResend}
                  disabled={!canResend || isLoading}
                  style={{ opacity: canResend && !isLoading ? 1 : 0.5 }}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <Text
                      style={{
                        color: colors.primary,
                        textDecorationLine: "underline",
                      }}
                    >
                      {t("auth.resendCode")}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </Modal>
          </Portal>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Index;
