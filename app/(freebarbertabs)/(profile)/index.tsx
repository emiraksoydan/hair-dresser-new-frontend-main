import { InteractionManager, View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native'
import { Text } from '../../components/common/Text'
import { Avatar, Divider, IconButton, TextInput, HelperText, Switch, Icon, Portal, Modal as PaperModal } from 'react-native-paper';
import { OtpInput } from 'react-native-otp-entry';
import { Button } from '../../components/common/Button';
import { useRevokeMutation, useGetMeQuery, useUpdateProfileMutation, useUploadImageMutation, useUpdateImageBlobMutation, useGetSettingQuery, useUpdateSettingMutation, useGetSubscriptionStatusQuery, useSendPhoneChangeOtpMutation, useUpdatePhoneMutation } from '../../store/api';
import { tokenStore } from '../../lib/tokenStore';
import { clearStoredTokens, saveTokens } from '../../lib/tokenStorage';
import { resetSignalRState } from '../../store/signalrSlice';
import { api } from '../../store/api';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { handlePickImage } from '../../utils/form/pick-document';
import { ImageOwnerType } from '../../types';
import { useAppDispatch } from '../../store/hook';
import { showSnack } from '../../store/snackbarSlice';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { ProfileSkeleton } from '../../components/common/profileskeleton';
import { getErrorMessage } from '../../utils/errorHandler';
import { LottieViewComponent } from '../../components/common/lottieview';
import { MESSAGES } from '../../constants/messages';
import { useLanguage } from '../../hook/useLanguage';
import { LanguageSelector } from '../../components/common/LanguageSelector';
import { useThemeContext } from '../../context/ThemeContext';
import { useTheme } from '../../hook/useTheme';
import { DEFAULT_AVATAR } from '../../constants/images';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import { useActionGuard } from '../../hook/useActionGuard';

const createProfileSchema = (t: (key: string) => string) => z.object({
    firstName: z.string({ required_error: t('auth.firstName') + ' ' + t('common.required') })
        .min(2, { message: t('auth.firstName') + ' ' + t('common.minLength').replace('{{min}}', '2') })
        .max(20, { message: t('auth.firstName') + ' ' + t('common.maxLength').replace('{{max}}', '20') })
        .regex(/^[^\s]+$/, { message: t('auth.firstName') + ' ' + t('common.noSpaces') }),
    lastName: z.string({ required_error: t('auth.lastName') + ' ' + t('common.required') })
        .min(2, { message: t('auth.lastName') + ' ' + t('common.minLength').replace('{{min}}', '2') })
        .max(20, { message: t('auth.lastName') + ' ' + t('common.maxLength').replace('{{max}}', '20') })
        .regex(/^[^\s]+$/, { message: t('auth.lastName') + ' ' + t('common.noSpaces') }),
    phoneNumber: z.string()
        .refine((val) => /^5\d{9}$/.test(val), { message: t('profile.phoneFormat') }),
});

type ProfileFormValues = z.infer<ReturnType<typeof createProfileSchema>>;

const Index = () => {
    const { t, currentLanguage } = useLanguage();
    const { themeMode, toggleTheme } = useThemeContext();
    const { colors, isDark } = useTheme();
    const profileSchema = useMemo(() => createProfileSchema(t), [t, currentLanguage]);
    const resolver = useMemo(() => zodResolver(profileSchema), [profileSchema]);
    const router = useSafeNavigation();
    const guard = useActionGuard();
    const [logout, { isLoading: isLoggingOut }] = useRevokeMutation();
    const { data: userData, isLoading: isLoadingUser, refetch, isFetching, error: userError, isError: isUserError } = useGetMeQuery();
    const [isLoggingOutState, setIsLoggingOutState] = useState(false);
    const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
    const [uploadImage] = useUploadImageMutation();
    const [updateImageBlob] = useUpdateImageBlobMutation();
    const { data: settingData, isLoading: isLoadingSetting, refetch: refetchSetting } = useGetSettingQuery();
    const { data: subscriptionData } = useGetSubscriptionStatusQuery();
    const [updateSetting, { isLoading: isUpdatingSetting }] = useUpdateSettingMutation();
    const [sendPhoneChangeOtp, { isLoading: isSendingOtp }] = useSendPhoneChangeOtpMutation();
    const [updatePhone, { isLoading: isUpdatingPhone }] = useUpdatePhoneMutation();
    const dispatch = useAppDispatch();
    const [refreshing, setRefreshing] = useState(false);
    const isUpdatingSettingRef = useRef(false);
    const [phoneModalVisible, setPhoneModalVisible] = useState(false);
    const [phoneChangeStep, setPhoneChangeStep] = useState<'input' | 'otp'>('input');
    const [newPhoneInput, setNewPhoneInput] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [localShowImageAnimation, setLocalShowImageAnimation] = useState<boolean | null>(null);
    const displayShowImageAnimation = localShowImageAnimation !== null ? localShowImageAnimation : (settingData?.data?.showImageAnimation ?? true);

    useEffect(() => {
        if (settingData?.data) {
            setLocalShowImageAnimation(settingData.data.showImageAnimation);
        }
    }, [settingData?.data?.showImageAnimation]);

    // Memoize theme objects
    const textInputTheme = useMemo(() => ({
        roundness: 10,
        colors: { onSurfaceVariant: "#fea60e", primary: "#fea60e" }
    }), []);

    // Memoize avatar source
    const avatarSource = useMemo(() => {
        if (userData?.data?.image?.imageUrl) {
            return { uri: userData.data.image.imageUrl };
        }
        return DEFAULT_AVATAR;
    }, [userData?.data?.image?.imageUrl]);

    // Memoize full name
    const fullName = useMemo(() => {
        return `${userData?.data?.firstName || ''} ${userData?.data?.lastName || ''}`.trim();
    }, [userData?.data?.firstName, userData?.data?.lastName]);

    const {
        control,
        handleSubmit,
        formState: { errors, isDirty },
        reset,
        trigger,
    } = useForm<ProfileFormValues>({
        resolver,
        defaultValues: {
            firstName: '',
            lastName: '',
            phoneNumber: '',
        },
    });

    // Dil değiştiğinde validation'ı tetikle
    useEffect(() => {
        if (Object.keys(errors).length > 0) {
            trigger();
        }
    }, [currentLanguage, trigger, errors]);

    // Memoize phone number processing
    const processedPhone = useMemo(() => {
        if (!userData?.data?.phoneNumber) return '';
        return userData.data.phoneNumber.startsWith('+90')
            ? userData.data.phoneNumber.substring(3)
            : userData.data.phoneNumber;
    }, [userData?.data?.phoneNumber]);

    useEffect(() => {
        if (userData?.data) {
            reset({
                firstName: userData.data.firstName || '',
                lastName: userData.data.lastName || '',
                phoneNumber: processedPhone,
            });
        }
    }, [userData, reset, processedPhone]);

    const onSubmit = useCallback(async (data: ProfileFormValues) => {
        try {
            const result = await updateProfile({
                firstName: data.firstName,
                lastName: data.lastName,
                phoneNumber: userData?.data?.phoneNumber || '',
            });
            if ('error' in result) {
                const errorMsg = (result.error as any)?.data?.message || t('profile.updateFailed');
                dispatch(showSnack({ message: errorMsg, isError: true }));
                return;
            }

            if (result.data?.success && result.data?.data) {
                tokenStore.set({
                    accessToken: result.data.data.token,
                    refreshToken: result.data.data.refreshToken,
                });
                await saveTokens({
                    accessToken: result.data.data.token,
                    refreshToken: result.data.data.refreshToken,
                });

                dispatch(showSnack({ message: t('profile.updateSuccess'), isError: false }));
                reset(data);
            } else {
                dispatch(showSnack({ message: result.data?.message || t('profile.operationError'), isError: true }));
            }
        } catch (error: any) {
            dispatch(showSnack({ message: error?.message || t('profile.updateFailed'), isError: true }));
        }
    }, [updateProfile, dispatch, reset, t]);

    const closePhoneModal = useCallback(() => {
        setPhoneModalVisible(false);
        setPhoneChangeStep('input');
        setNewPhoneInput('');
        setOtpCode('');
    }, []);

    const handleSendPhoneChangeOtp = useCallback(async () => {
        if (!/^5\d{9}$/.test(newPhoneInput)) {
            dispatch(showSnack({ message: t('profile.phoneFormat'), isError: true }));
            return;
        }
        const result = await sendPhoneChangeOtp({ newPhone: newPhoneInput });
        if ('error' in result) {
            dispatch(showSnack({ message: (result.error as any)?.data?.message || t('profile.updateFailed'), isError: true }));
            return;
        }
        if (result.data?.success) {
            setPhoneChangeStep('otp');
            dispatch(showSnack({ message: t('profile.phoneOtpSent'), isError: false }));
        } else {
            dispatch(showSnack({ message: result.data?.message || t('profile.updateFailed'), isError: true }));
        }
    }, [newPhoneInput, sendPhoneChangeOtp, dispatch, t]);

    const handleVerifyPhoneOtp = useCallback(async () => {
        const result = await updatePhone({ newPhone: newPhoneInput, otpCode });
        if ('error' in result) {
            dispatch(showSnack({ message: (result.error as any)?.data?.message || t('profile.updateFailed'), isError: true }));
            return;
        }
        if (result.data?.success && result.data?.data) {
            tokenStore.set({
                accessToken: result.data.data.token,
                refreshToken: result.data.data.refreshToken,
            });
            await saveTokens({
                accessToken: result.data.data.token,
                refreshToken: result.data.data.refreshToken,
            });
            closePhoneModal();
            dispatch(showSnack({ message: t('profile.phoneChangeSuccess'), isError: false }));
            await refetch();
        } else {
            dispatch(showSnack({ message: result.data?.message || t('profile.updateFailed'), isError: true }));
        }
    }, [newPhoneInput, otpCode, updatePhone, dispatch, t, closePhoneModal, refetch]);

    const handleImagePick = useCallback(() => guard(async () => {
        try {
            const file = await handlePickImage();
            if (!file || !userData?.data?.id) return;

            const formData = new FormData();
            formData.append('file', {
                uri: file.uri,
                name: file.name,
                type: file.type,
            } as any);

            // Eğer mevcut profil fotoğrafı varsa update-blob kullan, yoksa yeni ekle
            const existingImageId = userData?.data?.imageId;
            let result;

            if (existingImageId) {
                // Mevcut blob'u güncelle (aynı URL korunur)
                result = await updateImageBlob({ imageId: existingImageId, file: formData });
                if ('error' in result) {
                    throw new Error('Image update failed');
                }
            } else {
                // Yeni blob oluştur
                formData.append('ownerType', String(ImageOwnerType.User));
                formData.append('ownerId', userData.data.id);
                result = await uploadImage({ data: formData, isProfileImage: true });
                if ('error' in result) {
                    throw new Error('Image upload failed');
                }
            }

            if (result.data?.success) {
                dispatch(showSnack({ message: result.data?.message ?? t('profile.photoUpdated'), isError: false }));
                // Manually refetch user profile to get updated image
                await refetch();
            } else {
                dispatch(showSnack({ message: result.data?.message ?? t('profile.photoUploadFailed'), isError: true }));
            }
        } catch (error: any) {
            dispatch(showSnack({ message: error?.message ?? t('profile.photoUploadError'), isError: true }));
        }
    }), [guard, userData?.data?.id, userData?.data?.imageId, uploadImage, updateImageBlob, dispatch, t, refetch]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await refetch();
        } catch (error) {
            dispatch(showSnack({ message: MESSAGES.PROFILE.REFRESH_FAILED, isError: true }));
        } finally {
            setRefreshing(false);
        }
    }, [refetch, dispatch]);

    const handleLogout = useCallback(async () => {
        setIsLoggingOutState(true);
        try {
            const tokenLoad = tokenStore.refresh;
            if (tokenLoad !== null && tokenLoad !== undefined) {
                const res = await logout({ refreshToken: tokenLoad });
                if ('error' in res) {
                    // Logout hatası sessizce atlanır
                    setIsLoggingOutState(false);
                }
                if (res.data?.success)
                    InteractionManager.runAfterInteractions(async () => {
                        // 1. SignalR bağlantısını kapat ve state'i temizle
                        await resetSignalRState();

                        // 2. RTK Query cache'lerini temizle
                        dispatch(api.util.resetApiState());

                        // 3. Token'ları temizle
                        tokenStore.clear();
                        await clearStoredTokens();

                        // 4. Auth sayfasına yönlendir
                        router.replace("(auth)");
                    });
            } else {
                setIsLoggingOutState(false);
            }
        } catch {
            // Error handled silently
            setIsLoggingOutState(false);
        }
    }, [logout, router, dispatch]);

    // Memoize error message - Hook'lar early return'lerden önce olmalı
    const errorMessage = useMemo(() => {
        if (!isUserError || !userError) return null;
        return getErrorMessage(userError);
    }, [isUserError, userError]);

    // Logout sırasında skeleton gösterme
    if (isLoadingUser && !isLoggingOutState) {
        return <ProfileSkeleton />;
    }

    // Error durumu - refresh edildiğinde de göster
    if (isUserError && userError && errorMessage) {
        return (
            <View className="flex-1">
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing || isFetching}
                            onRefresh={handleRefresh}
                            colors={['#10B981']}
                            tintColor='#10B981'
                        />
                    }
                >
                    <LottieViewComponent
                        animationSource={require('../../../assets/animations/error.json')}
                        message={errorMessage}
                    />
                </ScrollView>
            </View>
        );
    }

    return (
        <ScrollView
            className='flex-1 pl-0 pt-4 '
            style={{ backgroundColor: colors.screenBg }}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={['#10B981']}
                    tintColor='#10B981'
                />
            }
        >
            <View className='items-center mx-6 py-6 rounded-xl' style={{ backgroundColor: colors.cardBg }}>
                <View className="relative h-[120px] w-[120px]">
                    <View style={{
                        width: 120,
                        height: 120,
                        borderRadius: 60,
                        borderWidth: 1.5,
                        borderColor: '#fea60e',
                        overflow: 'hidden',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        <Avatar.Image
                            size={120}
                            source={avatarSource}
                        />
                    </View>
                    <IconButton
                        icon="pencil"
                        size={20}
                        iconColor={colors.sectionHeaderText}
                        style={{ position: 'absolute', bottom: -5, right: -0, backgroundColor: isDark ? '#38393b' : '#d1d5db', }}
                        onPress={handleImagePick}
                    />
                </View>
                <View className="flex-row items-center justify-center mt-4">
                    <Icon source="account" size={22} color={colors.sectionHeaderText} />
                    <Text className='font-century-gothic ml-2 text-2xl' style={{ color: colors.sectionHeaderText }}>
                        {fullName}
                    </Text>
                </View>

                <View className="flex-row items-center justify-center mt-2">
                    <Icon source="phone" size={20} color={colors.sectionHeaderText} />
                    <Text className='font-century-gothic ml-2 text-lg' style={{ color: colors.sectionHeaderText }}>
                        {processedPhone}
                    </Text>
                </View>
            </View>

            <View className='px-6 pt-6'>
                <Text className='text-lg mb-4 font-century-gothic-bold' style={{ color: colors.sectionHeaderText }}>{t('profile.title')}</Text>

                <View className='rounded-xl p-4 mb-6' style={{ backgroundColor: colors.cardBg }}>
                    <View className='flex-row gap-3'>
                        <View className='flex-1'>
                            <Controller
                                control={control}
                                name="firstName"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        dense
                                        label={t('auth.firstName')}
                                        mode="outlined"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        textColor={colors.sectionHeaderText}
                                        error={!!errors.firstName}
                                        outlineColor={errors.firstName ? "#b00020" : "#fea60e"}
                                        activeOutlineColor={errors.firstName ? "#b00020" : "#fea60e"}
                                        theme={textInputTheme}
                                        style={{ backgroundColor: colors.cardBg, marginBottom: 0, fontFamily: 'CenturyGothic' }}
                                    />
                                )}
                            />
                        </View>

                        <View className='flex-1'>
                            <Controller
                                control={control}
                                name="lastName"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        dense
                                        label={t('auth.lastName')}
                                        mode="outlined"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        textColor={colors.sectionHeaderText}
                                        error={!!errors.lastName}
                                        outlineColor={errors.lastName ? "#b00020" : "#fea60e"}
                                        activeOutlineColor={errors.lastName ? "#b00020" : "#fea60e"}
                                        theme={textInputTheme}
                                        style={{ backgroundColor: colors.cardBg, marginBottom: 0, fontFamily: 'CenturyGothic' }}
                                    />
                                )}
                            />
                        </View>
                    </View>
                    {(errors.firstName || errors.lastName) && (
                        <View className='flex-row gap-3 mt-[-8px]'>
                            <View className='flex-1'>
                                <HelperText type="error" visible={!!errors.firstName} style={{ marginTop: 0, paddingTop: 0, fontFamily: 'CenturyGothic' }}>
                                    {errors.firstName?.message || ' '}
                                </HelperText>
                            </View>
                            <View className='flex-1'>
                                <HelperText type="error" visible={!!errors.lastName} style={{ marginTop: 0, paddingTop: 0, fontFamily: 'CenturyGothic' }}>
                                    {errors.lastName?.message || ' '}
                                </HelperText>
                            </View>
                        </View>
                    )}

                    <Controller
                        control={control}
                        name="phoneNumber"
                        render={({ field: { value } }) => (
                            <View className='flex-row items-center gap-2 mt-2'>
                                <TextInput
                                    dense
                                    label={t('profile.phonePlaceholder')}
                                    mode="flat"
                                    value={value}
                                    editable={false}
                                    textColor="#9ca3af"
                                    underlineColor="transparent"
                                    activeUnderlineColor="transparent"
                                    theme={{
                                        roundness: 10,
                                        colors: { onSurfaceVariant: "#6b7280", primary: "#6b7280" }
                                    }}
                                    style={{ backgroundColor: isDark ? '#1f2937' : '#f3f4f6', flex: 1, fontFamily: 'CenturyGothic', borderRadius: 8 }}
                                />
                                <TouchableOpacity
                                    onPress={() => setPhoneModalVisible(true)}
                                    style={{ backgroundColor: '#3B83BD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }}
                                >
                                    <Text style={{ color: 'white', fontFamily: 'CenturyGothic', fontSize: 12 }}>{t('profile.phoneChange')}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    />
                    <Button
                        mode="contained"
                        onPress={handleSubmit(onSubmit)}
                        loading={isUpdating}
                        disabled={!isDirty || isUpdating}
                        className="mt-4 mb-2"
                        buttonColor="#fea60e"
                        textColor="white"
                    >
                        {t('profile.save')}
                    </Button>
                </View>

                <Text className='text-lg mb-4 font-century-gothic-bold' style={{ color: colors.sectionHeaderText }}>{t('profile.userActions') || 'Kullanıcı İşlemleri'}</Text>
                <View className='rounded-xl mb-6' style={{ backgroundColor: colors.cardBg }}>
                    <TouchableOpacity
                        onPress={() => router.push('/(screens)/profile/blocked-users')}
                        activeOpacity={0.7}
                        className='flex-row items-center justify-between p-4'
                        style={{ borderBottomColor: colors.borderColor, borderBottomWidth: 1 }}
                    >
                        <View className='flex-row items-center'>
                            <Icon source="account-cancel" size={24} color="#ef4444" />
                            <Text className='text-base ml-3' style={{ color: colors.sectionHeaderText }}>{t('profile.blockedUsers') || 'Engellenen Kullanıcılar'}</Text>
                        </View>
                        <Icon source="chevron-right" size={24} color="#6b7280" />
                    </TouchableOpacity>

                    {/* Şikayetlerim */}
                    <TouchableOpacity
                        onPress={() => router.push('/(screens)/profile/complaints')}
                        activeOpacity={0.7}
                        className='flex-row items-center justify-between p-4'
                        style={{ borderBottomColor: colors.borderColor, borderBottomWidth: 1 }}
                    >
                        <View className='flex-row items-center'>
                            <Icon source="alert-circle-outline" size={24} color="#f59e0b" />
                            <Text className='text-base ml-3' style={{ color: colors.sectionHeaderText }}>{t('profile.myComplaints') || 'Şikayetlerim'}</Text>
                        </View>
                        <Icon source="chevron-right" size={24} color="#6b7280" />
                    </TouchableOpacity>

                    {/* İsteklerim */}
                    <TouchableOpacity
                        onPress={() => router.push('/(screens)/profile/requests')}
                        activeOpacity={0.7}
                        className='flex-row items-center justify-between p-4'
                    >
                        <View className='flex-row items-center'>
                            <Icon source="message-text-outline" size={24} color="#10B981" />
                            <Text className='text-base ml-3' style={{ color: colors.sectionHeaderText }}>{t('profile.myRequests') || 'İsteklerim'}</Text>
                        </View>
                        <Icon source="chevron-right" size={24} color="#6b7280" />
                    </TouchableOpacity>
                </View>

                <Text className='text-lg mb-4 font-century-gothic-bold' style={{ color: colors.sectionHeaderText }}>{t('profile.settings')}</Text>
                <View className='rounded-xl p-4 mb-6' style={{ backgroundColor: colors.cardBg }}>
                    <View className='flex-row items-center justify-between'>
                        <View className='flex-1 mr-4'>
                            <Text className='text-base font-medium mb-1' style={{ color: colors.sectionHeaderText }}>{t('profile.imageAnimation')}</Text>
                            <Text className='text-sm' style={{ color: colors.textSecondary }}>{t('profile.imageAnimationDescription')}</Text>
                        </View>
                        <Switch
                            value={displayShowImageAnimation}
                            onValueChange={async (value) => {
                                if (isUpdatingSettingRef.current) return;
                                isUpdatingSettingRef.current = true;
                                setLocalShowImageAnimation(value);
                                try {
                                    var result = await updateSetting({
                                        showImageAnimation: value,
                                    }).unwrap();
                                    // refetchSetting çağrısını kaldırdık - RTK Query otomatik güncelliyor
                                    dispatch(showSnack({ message: result.message ?? t('settings.updateSuccess'), isError: false }));
                                } catch (error: any) {
                                    setLocalShowImageAnimation(!value);
                                    dispatch(showSnack({ message: error?.data?.message || t('profile.settingUpdateError'), isError: true }));
                                } finally {
                                    isUpdatingSettingRef.current = false;
                                }
                            }}
                            disabled={isUpdatingSetting || isLoadingSetting}
                        />
                    </View>
                    <View className='flex-row items-center justify-between mt-4'>
                        <Text className='text-base font-century-gothic-bold' style={{ color: colors.sectionHeaderText }}>{t('profile.language')}</Text>
                        <LanguageSelector showLabel={false} />
                    </View>
                    <View style={{ height: 1, backgroundColor: colors.borderColor, marginVertical: 8 }} />
                    <View className='flex-row items-center justify-between'>
                        <View className='flex-row items-center gap-2'>
                            <Icon source={themeMode === 'dark' ? 'weather-night' : 'weather-sunny'} size={20} color={themeMode === 'dark' ? '#60a5fa' : '#f59e0b'} />
                            <Text className='text-base font-century-gothic-bold' style={{ color: colors.sectionHeaderText }}>
                                {themeMode === 'dark' ? 'Koyu Mod' : 'Açık Mod'}
                            </Text>
                        </View>
                        <Switch
                            value={themeMode === 'dark'}
                            onValueChange={toggleTheme}
                            color='#60a5fa'
                        />
                    </View>
                </View>

                {/* Abonelik Durumu */}
                {subscriptionData?.data && (
                    <View className='mb-6'>
                        <Text className='text-lg mb-4 font-century-gothic-bold' style={{ color: colors.sectionHeaderText }}>{t('subscription.title')}</Text>
                        <View
                            className='rounded-xl p-4'
                            style={{
                                backgroundColor:
                                    subscriptionData.data.status === 'Banned' ? 'rgba(127,29,29,0.3)' :
                                    subscriptionData.data.status === 'Expired' ? 'rgba(124,45,18,0.3)' :
                                    subscriptionData.data.status === 'Active' ? 'rgba(20,83,45,0.3)' :
                                    colors.cardBg,
                                borderWidth: 1,
                                borderColor:
                                    subscriptionData.data.status === 'Banned' ? '#ef4444' :
                                    subscriptionData.data.status === 'Expired' ? '#f97316' :
                                    subscriptionData.data.status === 'Active' ? '#22c55e' :
                                    '#fea60e',
                            }}
                        >
                            <View className='flex-row items-center mb-2'>
                                <Icon
                                    source={
                                        subscriptionData.data.status === 'Banned' ? 'account-cancel' :
                                        subscriptionData.data.status === 'Expired' ? 'clock-alert-outline' :
                                        subscriptionData.data.status === 'Active' ? 'check-circle-outline' :
                                        'clock-outline'
                                    }
                                    size={22}
                                    color={
                                        subscriptionData.data.status === 'Banned' ? '#ef4444' :
                                        subscriptionData.data.status === 'Expired' ? '#f97316' :
                                        subscriptionData.data.status === 'Active' ? '#22c55e' :
                                        '#fea60e'
                                    }
                                />
                                <Text
                                    className='ml-2 text-base font-century-gothic-bold'
                                    style={{
                                        color:
                                            subscriptionData.data.status === 'Banned' ? '#f87171' :
                                            subscriptionData.data.status === 'Expired' ? '#fb923c' :
                                            subscriptionData.data.status === 'Active' ? '#4ade80' :
                                            '#fea60e',
                                    }}
                                >
                                    {t(`subscription.status${subscriptionData.data.status}`)}
                                </Text>
                                {(subscriptionData.data.status === 'Trial' || subscriptionData.data.status === 'Active') && (
                                    <Text className='text-sm ml-2' style={{ color: colors.textSecondary }}>
                                        {subscriptionData.data.status === 'Trial'
                                            ? t('subscription.trialDaysLeft').replace('{{days}}', String(subscriptionData.data.trialDaysLeft))
                                            : t('subscription.subscriptionDaysLeft').replace('{{days}}', String(subscriptionData.data.subscriptionDaysLeft))
                                        }
                                    </Text>
                                )}
                            </View>
                            <Text className='text-sm' style={{ color: colors.textSecondary }}>
                                {subscriptionData.data.status === 'Banned' ? t('subscription.bannedInfo') :
                                 subscriptionData.data.status === 'Expired' ? t('subscription.expiredInfo') :
                                 subscriptionData.data.status === 'Trial' ? t('subscription.trialInfo') : ''}
                            </Text>
                            <TouchableOpacity
                                onPress={() => router.push('/(screens)/subscription')}
                                activeOpacity={0.8}
                                style={{
                                    marginTop: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#fea60e',
                                    borderRadius: 10,
                                    paddingVertical: 10,
                                    gap: 6,
                                }}
                            >
                                <Icon source="crown-outline" size={16} color="#fff" />
                                <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'CenturyGothic-Bold' }}>
                                    {t('subscription.viewPlans')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                <Button
                    mode='contained'
                    icon="logout"
                    onPress={handleLogout}
                    loading={isLoggingOut}
                    disabled={isLoggingOut}
                    contentStyle={{
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    buttonColor='red'
                    textColor="white"
                    className="mb-4"
                >
                    {t('profile.logout')}
                </Button>
            </View>

        <Portal>
          <PaperModal
            visible={phoneModalVisible}
            onDismiss={closePhoneModal}
            contentContainerStyle={{
              padding: 24,
              margin: 20,
              borderRadius: 16,
              backgroundColor: colors.sheetBg,
            }}
          >
            <Text style={{ color: colors.sectionHeaderText, fontSize: 18, fontFamily: 'CenturyGothic-Bold', marginBottom: 4 }}>
              {t('profile.phoneChangeOtpTitle')}
            </Text>
            <Text style={{ color: '#9ca3af', fontSize: 13, marginBottom: 16, fontFamily: 'CenturyGothic' }}>
              {phoneChangeStep === 'input' ? t('profile.phoneChangeOtpDesc') : t('profile.phoneOtpSent')}
            </Text>

            {phoneChangeStep === 'input' ? (
              <>
                <TextInput
                  dense
                  label={t('profile.phonePlaceholder')}
                  mode="outlined"
                  value={newPhoneInput}
                  onChangeText={setNewPhoneInput}
                  keyboardType="phone-pad"
                  maxLength={10}
                  textColor={colors.sectionHeaderText}
                  outlineColor="#fea60e"
                  theme={{ roundness: 10, colors: { onSurfaceVariant: "#fea60e", primary: "#fea60e" } }}
                  style={{ backgroundColor: colors.cardBg, fontFamily: 'CenturyGothic' }}
                />
                <HelperText type="info" visible style={{ color: '#9ca3af', fontFamily: 'CenturyGothic' }}>
                  {t('profile.phoneFormat')}
                </HelperText>
                <Button
                  mode="contained"
                  onPress={handleSendPhoneChangeOtp}
                  loading={isSendingOtp}
                  disabled={isSendingOtp}
                  className="mt-1"
                  buttonColor="#059669"
                  textColor="white"
                >
                  {t('profile.phoneChangeOtpSend')}
                </Button>
              </>
            ) : (
              <>
                <OtpInput
                  numberOfDigits={6}
                  onFilled={(code) => { setOtpCode(code); }}
                  focusColor="#fea60e"
                  theme={{
                    containerStyle: { marginBottom: 12 },
                    pinCodeContainerStyle: {
                      width: 44,
                      height: 52,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: isDark ? '#334155' : '#d1d5db',
                      backgroundColor: colors.cardBg,
                    },
                    pinCodeTextStyle: {
                      fontSize: 20,
                      color: colors.sectionHeaderText,
                    },
                  }}
                  type="numeric"
                />
                <Button
                  mode="contained"
                  onPress={handleVerifyPhoneOtp}
                  loading={isUpdatingPhone}
                  disabled={isUpdatingPhone || otpCode.length < 6}
                  className="mt-2"
                  buttonColor="#059669"
                  textColor="white"
                >
                  {t('profile.phoneChangeOtpVerify')}
                </Button>
                <Button
                  mode="text"
                  onPress={() => setPhoneChangeStep('input')}
                  className="mt-1"
                  textColor="#fea60e"
                >
                  {t('profile.phoneOtpResend')}
                </Button>
              </>
            )}

            <Button
              mode="outlined"
              onPress={closePhoneModal}
              className="mt-2"
              textColor="#ef4444"
              style={{ borderColor: '#ef4444' }}
            >
              {t('common.cancel')}
            </Button>
          </PaperModal>
        </Portal>
        </ScrollView>
    );
}

export default Index
