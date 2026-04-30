import { InteractionManager, View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from '../../components/common/Text'
import { Avatar, HelperText, Icon, IconButton, Modal as PaperModal, Portal, Switch, TextInput } from "react-native-paper";
import { OtpInput } from 'react-native-otp-entry';
import { Button } from '../../components/common/Button';
import { useRevokeMutation, useGetMeQuery, useUpdateProfileMutation, useUploadImageMutation, useUpdateImageBlobMutation, useSendPhoneChangeOtpMutation, useUpdatePhoneMutation, useGetSettingQuery, useUpdateSettingMutation, useSendDeleteAccountOtpMutation, useDeleteAccountMutation, useDeleteImageMutation, useUnregisterFcmTokenMutation } from '../../store/api';
import { getCurrentFcmToken } from '../../hook/useFcmToken';
import { tokenStore } from '../../lib/tokenStore';
import { clearStoredTokens, saveTokens } from '../../lib/tokenStorage';
import { resetSignalRState } from '../../store/signalrSlice';
import { api } from '../../store/api';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { handlePickImage } from '../../utils/form/pick-document';
import { ImageUploadHint } from '../../components/common/ImageUploadHint';
import { ImageOwnerType } from '../../types';
import { useAppDispatch } from '../../store/hook';
import { showSnack } from '../../store/snackbarSlice';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { ProfileSkeleton } from '../../components/common/profileskeleton';
import { getErrorMessage } from '../../utils/errorHandler';
import { UnifiedStateWrapper } from '../../components/common/UnifiedStateManager';
import { MESSAGES } from '../../constants/messages';
import { useLanguage } from '../../hook/useLanguage';
import { LanguageSelector } from '../../components/common/LanguageSelector';
import { useThemeContext } from '../../context/ThemeContext';
import { usePermissionSwitches } from '../../hook/usePermissionSwitches';
import { useSerialAsyncQueue } from '../../hook/useSerialAsyncQueue';
import { useTheme } from '../../hook/useTheme';
import { DEFAULT_AVATAR } from '../../constants/images';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import { useActionGuard } from '../../hook/useActionGuard';
import { useAlert } from '../../hook/useAlert';
import { getTabFabScrollPadding } from '../../components/layout/panelBottomOverlays';
import { getProfilePaperSwitchProps } from '../../constants/colors';
import { jwtDecode } from 'jwt-decode';
import { loadAllAccounts, removeAccount } from '../../lib/multiAccountStorage';
import { JwtPayload } from '../../types';
import { updateAccountsPhoneByPreviousPhone } from '../../lib/multiAccountStorage';
import { useMultiAccount } from '../../context/MultiAccountContext';

const createProfileSchema = (t: (key: string) => string) => z.object({
    firstName: z.string({ required_error: t('auth.firstName') + ' ' + t('common.required') })
        .trim()
        .min(2, { message: t('auth.firstName') + ' ' + t('common.minLength').replace('{{min}}', '2') })
        .max(20, { message: t('auth.firstName') + ' ' + t('common.maxLength').replace('{{max}}', '20') }),
    lastName: z.string({ required_error: t('auth.lastName') + ' ' + t('common.required') })
        .trim()
        .min(2, { message: t('auth.lastName') + ' ' + t('common.minLength').replace('{{min}}', '2') })
        .max(20, { message: t('auth.lastName') + ' ' + t('common.maxLength').replace('{{max}}', '20') }),
    phoneNumber: z.string()
        .refine((val) => /^5\d{9}$/.test(val), { message: t('profile.phoneFormat') }),
});

type ProfileFormValues = z.infer<ReturnType<typeof createProfileSchema>>;

const Index = () => {
    const router = useSafeNavigation();
    const guard = useActionGuard();
    const { confirm } = useAlert();
    const insets = useSafeAreaInsets();
    const scrollBottomPad = useMemo(() => getTabFabScrollPadding(insets.bottom), [insets.bottom]);
    const { t, currentLanguage } = useLanguage();
    const { themeMode, toggleTheme } = useThemeContext();
    const { locationGranted, notificationGranted, handleLocationToggle, handleNotificationToggle } = usePermissionSwitches();
    const { colors, isDark } = useTheme();
    const profileSchema = useMemo(() => createProfileSchema(t), [t, currentLanguage]);
    const resolver = useMemo(() => zodResolver(profileSchema), [profileSchema]);
    const [logout, { isLoading: isLoggingOut }] = useRevokeMutation();
    const [unregisterFcmToken] = useUnregisterFcmTokenMutation();
    const [deleteAccount, { isLoading: isDeletingAccount }] = useDeleteAccountMutation();
    const [sendDeleteAccountOtp, { isLoading: isSendingDeleteOtp }] = useSendDeleteAccountOtpMutation();
    const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
    const [deleteAccountStep, setDeleteAccountStep] = useState<'confirm' | 'otp'>('confirm');
    const [deleteAccountOtpCode, setDeleteAccountOtpCode] = useState('');
    const { data: userData, isLoading: isLoadingUser, refetch, isFetching, error: userError, isError: isUserError } = useGetMeQuery();
    const [isLoggingOutState, setIsLoggingOutState] = useState(false);
    const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
    const [uploadImage] = useUploadImageMutation();
    const [updateImageBlob] = useUpdateImageBlobMutation();
    const [deleteImage, { isLoading: isDeletingImage }] = useDeleteImageMutation();
    const [sendPhoneChangeOtp, { isLoading: isSendingOtp }] = useSendPhoneChangeOtpMutation();
    const [updatePhone, { isLoading: isUpdatingPhone }] = useUpdatePhoneMutation();
    const { data: settingData } = useGetSettingQuery();
    const [updateSetting] = useUpdateSettingMutation();
    /** Son bilinen ayarlar; ardışık/paralel isteklerde payload'ın birbirini ezmeyecek şekilde güncellenir */
    const latestSettingPayloadRef = useRef({
        showImageAnimation: true,
        showPriceAnimation: true,
        enableNotificationSound: true,
    });
    const dispatch = useAppDispatch();
    const [refreshing, setRefreshing] = useState(false);
    const [phoneModalVisible, setPhoneModalVisible] = useState(false);
    const [phoneChangeStep, setPhoneChangeStep] = useState<'input' | 'otp'>('input');
    const [newPhoneInput, setNewPhoneInput] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [isProfileImageFlowBusy, setIsProfileImageFlowBusy] = useState(false);
    const [localShowImageAnimation, setLocalShowImageAnimation] = useState<boolean | null>(null);
    const [localShowPriceAnimation, setLocalShowPriceAnimation] = useState<boolean | null>(null);
    const [localEnableNotificationSound, setLocalEnableNotificationSound] = useState<boolean | null>(null);
    const displayShowImageAnimation = localShowImageAnimation !== null ? localShowImageAnimation : (settingData?.data?.showImageAnimation ?? true);
    const displayShowPriceAnimation = localShowPriceAnimation !== null ? localShowPriceAnimation : (settingData?.data?.showPriceAnimation ?? true);
    const displayEnableNotificationSound = localEnableNotificationSound !== null ? localEnableNotificationSound : (settingData?.data?.enableNotificationSound ?? true);
    const { switchAccount } = useMultiAccount();
    const enqueueSettingsPersist = useSerialAsyncQueue();

    useEffect(() => {
        if (settingData?.data) {
            const d = settingData.data;
            latestSettingPayloadRef.current = {
                showImageAnimation: d.showImageAnimation ?? true,
                showPriceAnimation: d.showPriceAnimation ?? true,
                enableNotificationSound: d.enableNotificationSound ?? true,
            };
            setLocalShowImageAnimation(d.showImageAnimation);
            setLocalShowPriceAnimation(d.showPriceAnimation);
            setLocalEnableNotificationSound(d.enableNotificationSound);
        }
    }, [settingData?.data?.showImageAnimation, settingData?.data?.showPriceAnimation, settingData?.data?.enableNotificationSound]);

    const persistSettings = useCallback(() => {
        enqueueSettingsPersist(async () => {
            const payload = { ...latestSettingPayloadRef.current };
            try {
                const settingResult = await updateSetting(payload).unwrap();
                dispatch(showSnack({ message: settingResult.message || t('settings.updateSuccess'), isError: false }));
            } catch (error: any) {
                const errorMessage = error?.data?.message || getErrorMessage(error);
                dispatch(showSnack({ message: errorMessage || t('profile.settingUpdateError'), isError: true }));
                try {
                    const refreshed = await dispatch(
                        api.endpoints.getSetting.initiate(undefined, { forceRefetch: true }),
                    ).unwrap();
                    if (refreshed?.data) {
                        const d = refreshed.data;
                        latestSettingPayloadRef.current = {
                            showImageAnimation: d.showImageAnimation ?? true,
                            showPriceAnimation: d.showPriceAnimation ?? true,
                            enableNotificationSound: d.enableNotificationSound ?? true,
                        };
                        setLocalShowImageAnimation(d.showImageAnimation);
                        setLocalShowPriceAnimation(d.showPriceAnimation);
                        setLocalEnableNotificationSound(d.enableNotificationSound);
                    }
                } catch {
                    /* keep local UI; user can pull refresh */
                }
            }
        });
    }, [enqueueSettingsPersist, updateSetting, dispatch, t]);

    // Memoize theme objects

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
                throw new Error('Profile update failed');
            }

            if ('data' in result && result.data.success && result.data.data) {
                tokenStore.set({
                    accessToken: result.data.data.token,
                    refreshToken: result.data.data.refreshToken,
                });
                await saveTokens({
                    accessToken: result.data.data.token,
                    refreshToken: result.data.data.refreshToken,
                });

                dispatch(showSnack({ message: result.data.message || MESSAGES.PROFILE.UPDATE_SUCCESS, isError: false }));
                reset(data);
            } else {
                dispatch(showSnack({ message: result.data?.message || MESSAGES.PROFILE.UPDATE_FAILED, isError: true }));
            }
        } catch (error: any) {
            dispatch(showSnack({ message: error?.data?.message || MESSAGES.PROFILE.UPDATE_ERROR, isError: true }));
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
        const result = await sendPhoneChangeOtp({ newPhone: newPhoneInput, language: currentLanguage });
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
    }, [newPhoneInput, sendPhoneChangeOtp, dispatch, t, currentLanguage]);

    const handleVerifyPhoneOtp = useCallback(async () => {
        const result = await updatePhone({ newPhone: newPhoneInput, otpCode });
        if ('error' in result) {
            dispatch(showSnack({ message: (result.error as any)?.data?.message || t('profile.updateFailed'), isError: true }));
            return;
        }
        if (result.data?.success && result.data?.data) {
            const previousPhone = userData?.data?.phoneNumber || '';
            tokenStore.set({
                accessToken: result.data.data.token,
                refreshToken: result.data.data.refreshToken,
            });
            await saveTokens({
                accessToken: result.data.data.token,
                refreshToken: result.data.data.refreshToken,
            });
            await updateAccountsPhoneByPreviousPhone(previousPhone, newPhoneInput);
            closePhoneModal();
            dispatch(showSnack({ message: t('profile.phoneChangeSuccess'), isError: false }));
            await refetch();
        } else {
            dispatch(showSnack({ message: result.data?.message || t('profile.updateFailed'), isError: true }));
        }
    }, [newPhoneInput, otpCode, updatePhone, dispatch, t, closePhoneModal, refetch]);

    const handleImagePick = useCallback(() => guard(async () => {
        setIsProfileImageFlowBusy(true);
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
                // Mevcut blob'u güncelle
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

            if ('data' in result && result.data.success) {
                dispatch(showSnack({ message: result.data.message ?? t('profile.photoUpdated'), isError: false }));
                await refetch();
            } else {
                dispatch(showSnack({ message: result.data?.message ?? t('profile.photoUploadFailed'), isError: true }));
            }
        } catch (error: any) {
            dispatch(showSnack({ message: error?.message ?? t('profile.photoUploadError'), isError: true }));
        } finally {
            setIsProfileImageFlowBusy(false);
        }
    }), [guard, userData?.data?.id, userData?.data?.imageId, uploadImage, updateImageBlob, dispatch, t, refetch]);

    const handleDeleteImagePress = useCallback(() => {
        const imageId = userData?.data?.imageId;
        if (!imageId) return;
        confirm(
            t('profile.confirmDeletePhotoTitle'),
            t('profile.confirmDeletePhotoMessage'),
            () => {
                void guard(async () => {
                    try {
                        const result = await deleteImage(imageId);
                        if ('error' in result) {
                            dispatch(showSnack({ message: (result.error as any)?.data?.message ?? t('profile.photoUploadError'), isError: true }));
                            return;
                        }
                        dispatch(showSnack({ message: t('profile.photoDeleted'), isError: false }));
                        await refetch();
                    } catch (error: any) {
                        dispatch(showSnack({ message: error?.message ?? t('profile.photoUploadError'), isError: true }));
                    }
                });
            },
            undefined,
            t('common.delete'),
            t('common.cancel')
        );
    }, [userData?.data?.imageId, confirm, t, guard, deleteImage, dispatch, refetch]);

    const avatarImageActionsLocked = isProfileImageFlowBusy || isDeletingImage;

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

            // currentUserId'yi await'ten ÖNCE yakala.
            // baseQueryWithReauth, logout await'i sırasında 401 alıp tokenStore.clear()
            // çağırabilir; bu durumda tokenStore.access null olur ve removeAccount atlanır.
            const currentAccessToken = tokenStore.access;
            let loggedOutUserId: string | null = null;
            if (currentAccessToken) {
                try {
                    const decoded = jwtDecode<JwtPayload>(currentAccessToken);
                    loggedOutUserId = decoded.identifier || (decoded as any).sub || null;
                } catch {}
            }

            // FCM token'ı auth temizlenmeden önce sil (auth gerektirir).
            const fcmTok = getCurrentFcmToken();
            if (fcmTok) {
                await unregisterFcmToken({ fcmToken: fcmTok }).catch(() => {});
            }

            if (tokenLoad !== null && tokenLoad !== undefined) {
                // Best effort — sunucu hatası olsa bile client çıkışı yapılır
                await logout({ refreshToken: tokenLoad }).catch(() => {});
            }

            if (loggedOutUserId) {
                await removeAccount(loggedOutUserId);
            }

            const remaining = await loadAllAccounts();
            // Çıkış yapılan hesabın hâlâ listede görünmediğinden emin ol
            const nextAccount = [...remaining]
                .filter(a => !loggedOutUserId || a.id.toLowerCase() !== loggedOutUserId.toLowerCase())
                .sort((a, b) => b.savedAt - a.savedAt)[0];
            if (nextAccount) {
                await switchAccount(nextAccount);
                return;
            }

            InteractionManager.runAfterInteractions(async () => {
                // 1. SignalR bağlantısını kapat
                await resetSignalRState();

                // 2. RTK Query cache'lerini temizle
                dispatch(api.util.resetApiState());

                // 3. Token'ları temizle
                tokenStore.clear();
                await clearStoredTokens();

                // 4. Auth sayfasına yönlendir
                router.replace("(auth)");
            });
        } catch {
            setIsLoggingOutState(false);
            return;
        } finally {
            setIsLoggingOutState(false);
        }
    }, [logout, switchAccount, router, dispatch]);

    const handleSendDeleteAccountOtp = useCallback(async () => {
        const result = await sendDeleteAccountOtp({ language: currentLanguage });
        if ('error' in result) {
            dispatch(showSnack({ message: (result.error as any)?.data?.message || t('profile.deleteAccountError'), isError: true }));
            return;
        }
        if (result.data?.success) {
            setDeleteAccountStep('otp');
            dispatch(showSnack({ message: t('profile.phoneOtpSent'), isError: false }));
        } else {
            dispatch(showSnack({ message: result.data?.message || t('profile.deleteAccountError'), isError: true }));
        }
    }, [sendDeleteAccountOtp, dispatch, t, currentLanguage]);

    const handleDeleteAccount = useCallback(async () => {
        try {
            const currentAccessToken = tokenStore.access;
            let currentUserId: string | null = null;
            if (currentAccessToken) {
                try {
                    const decoded = jwtDecode<JwtPayload>(currentAccessToken);
                    currentUserId = decoded.identifier || (decoded as any).sub || null;
                } catch {}
            }
            const result = await deleteAccount({ otpCode: deleteAccountOtpCode }).unwrap();
            if (result.success) {
                setDeleteAccountModalVisible(false);
                dispatch(showSnack({ message: t('profile.deleteAccountSuccess'), isError: false }));
                if (currentUserId) {
                    await removeAccount(currentUserId);
                }

                const remaining = await loadAllAccounts();
                const nextAccount = [...remaining].sort((a, b) => b.savedAt - a.savedAt)[0];
                if (nextAccount) {
                    await switchAccount(nextAccount);
                    return;
                }

                await resetSignalRState();
                dispatch(api.util.resetApiState());
                tokenStore.clear();
                await clearStoredTokens();
                router.replace("(auth)");
            } else {
                dispatch(showSnack({ message: result.message || t('profile.deleteAccountError'), isError: true }));
            }
        } catch (error: any) {
            dispatch(showSnack({ message: error?.data?.message || t('profile.deleteAccountError'), isError: true }));
        }
    }, [deleteAccount, deleteAccountOtpCode, dispatch, switchAccount, router, t]);

    // Memoize error message - Hook'lar early return'lerden önce olmalı
    const errorMessage = useMemo(() => {
        if (!isUserError || !userError) return null;
        return getErrorMessage(userError);
    }, [isUserError, userError]);

    // Logout sırasında skeleton gösterme
    if (isLoadingUser && !isLoggingOutState) {
        return <ProfileSkeleton />;
    }

    if (isUserError && userError && errorMessage) {
        return (
            <View className="flex-1">
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 16 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing || isFetching}
                            onRefresh={handleRefresh}
                            colors={['#c2a523']}
                            tintColor='#c2a523'
                        />
                    }
                >
                    <UnifiedStateWrapper
                        loading={false}
                        error={userError}
                        data={[]}
                        fetchedOnce={true}
                        onRetry={handleRefresh}
                        refetching={!!refreshing}
                        customMessages={{
                            error: errorMessage,
                            'service-unavailable': errorMessage,
                            'network-error': errorMessage,
                        }}
                    >
                        <View />
                    </UnifiedStateWrapper>
                </ScrollView>
            </View>
        );
    }

    return (
        <ScrollView
            className='flex-1 pl-0 pt-4'
            style={{ backgroundColor: colors.screenBg }}
            contentContainerStyle={{ paddingBottom: scrollBottomPad }}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={['#c2a523']}
                    tintColor='#c2a523'
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
                        alignItems: 'center',
                        backgroundColor: '#ffffff',
                    }}>
                        <Avatar.Image
                            size={120}
                            source={avatarSource}
                            theme={{ colors: { primaryContainer: '#ffffff' } }}
                        />
                    </View>
                    <IconButton
                        icon="pencil"
                        size={20}
                        iconColor={colors.sectionHeaderText}
                        style={{ position: 'absolute', bottom: -5, right: -0, backgroundColor: isDark ? '#38393b' : '#d1d5db', }}
                        loading={isProfileImageFlowBusy}
                        disabled={avatarImageActionsLocked}
                        onPress={handleImagePick}
                    />
                    {userData?.data?.imageId && (
                        <IconButton
                            icon="trash-can-outline"
                            size={18}
                            iconColor="#ef4444"
                            style={{ position: 'absolute', bottom: -5, left: -0, backgroundColor: isDark ? '#38393b' : '#d1d5db', }}
                            loading={isDeletingImage}
                            disabled={avatarImageActionsLocked}
                            onPress={handleDeleteImagePress}
                        />
                    )}
                </View>
                <ImageUploadHint className="mt-3" align="center" />
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
                                        theme={{
                                            roundness: 10,
                                            colors: { onSurfaceVariant: "#fea60e", primary: "#fea60e" }
                                        }}
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
                                        theme={{
                                            roundness: 10,
                                            colors: { onSurfaceVariant: "#fea60e", primary: "#fea60e" }
                                        }}
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

                <Text className='text-lg mb-4 font-century-gothic-bold' style={{ color: colors.sectionHeaderText }}>{t('profile.userActions')}</Text>
                <View className='rounded-xl mb-6' style={{ backgroundColor: colors.cardBg }}>
                    <TouchableOpacity
                        onPress={() => router.push('/(screens)/profile/blocked-users')}
                        activeOpacity={0.7}
                        className='flex-row items-center justify-between p-4'
                        style={{ borderBottomColor: colors.borderColor, borderBottomWidth: 1 }}
                    >
                        <View className='flex-row items-center'>
                            <Icon source="account-cancel" size={24} color="#ef4444" />
                            <Text className='text-base ml-3' style={{ color: colors.sectionHeaderText }}>{t('profile.blockedUsers')}</Text>
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

                <Text className='text-lg mb-2 font-century-gothic-bold' style={{ color: colors.sectionHeaderText }}>{t('profile.settings')}</Text>

                <Text className='text-sm mb-2' style={{ color: colors.textSecondary }}>{t('profile.appearanceSection')}</Text>
                <View className='rounded-xl p-4 mb-4' style={{ backgroundColor: colors.cardBg }}>
                    <View className='flex-row items-center justify-between mb-2'>
                        <Text className='text-base font-century-gothic-bold' style={{ color: colors.sectionHeaderText }}>{t('profile.language')}</Text>
                        <LanguageSelector showLabel={false} />
                    </View>
                    <View style={{ height: 1, backgroundColor: colors.borderColor, marginVertical: 8 }} />
                    <View className='flex-row items-center justify-between'>
                        <View className='flex-row items-center gap-2'>
                            <Icon source={themeMode === 'dark' ? 'weather-night' : 'weather-sunny'} size={20} color={themeMode === 'dark' ? '#60a5fa' : '#f59e0b'} />
                            <Text className='text-base font-century-gothic-bold' style={{ color: colors.sectionHeaderText }}>
                                {themeMode === 'dark' ? t('profile.darkMode') : t('profile.lightMode')}
                            </Text>
                        </View>
                        <Switch
                            value={themeMode === 'dark'}
                            onValueChange={toggleTheme}
                            {...getProfilePaperSwitchProps(isDark)}
                        />
                    </View>
                </View>

                <Text className='text-sm mb-2' style={{ color: colors.textSecondary }}>{t('profile.preferencesSection')}</Text>
                <View className='rounded-xl p-4 mb-4' style={{ backgroundColor: colors.cardBg }}>
                    <View className='flex-row items-center justify-between'>
                        <View className='flex-1 mr-4'>
                            <Text className='text-base font-century-gothic-bold' style={{ color: colors.sectionHeaderText }}>{t('profile.imageAnimation')}</Text>
                            <Text className='text-sm' style={{ color: colors.textSecondary }}>{t('profile.imageAnimationDescription')}</Text>
                        </View>
                        <Switch
                            value={displayShowImageAnimation}
                            onValueChange={(value) => {
                                setLocalShowImageAnimation(value);
                                latestSettingPayloadRef.current = { ...latestSettingPayloadRef.current, showImageAnimation: value };
                                persistSettings();
                            }}
                            {...getProfilePaperSwitchProps(isDark)}
                        />
                    </View>
                    <View style={{ height: 1, backgroundColor: colors.borderColor, marginVertical: 8 }} />
                    <View className='flex-row items-center justify-between'>
                        <View className='flex-1 mr-4'>
                            <Text className='text-base font-century-gothic-bold' style={{ color: colors.sectionHeaderText }}>{t('profile.priceAnimation')}</Text>
                            <Text className='text-sm' style={{ color: colors.textSecondary }}>{t('profile.priceAnimationDescription')}</Text>
                        </View>
                        <Switch
                            value={displayShowPriceAnimation}
                            onValueChange={(value) => {
                                setLocalShowPriceAnimation(value);
                                latestSettingPayloadRef.current = { ...latestSettingPayloadRef.current, showPriceAnimation: value };
                                persistSettings();
                            }}
                            {...getProfilePaperSwitchProps(isDark)}
                        />
                    </View>
                    <View style={{ height: 1, backgroundColor: colors.borderColor, marginVertical: 8 }} />
                    <View className='flex-row items-center justify-between'>
                        <View className='flex-1 mr-4'>
                            <Text className='text-base font-century-gothic-bold' style={{ color: colors.sectionHeaderText }}>{t('profile.notificationSounds')}</Text>
                            <Text className='text-sm' style={{ color: colors.textSecondary }}>{t('profile.notificationSoundsDescription')}</Text>
                        </View>
                        <Switch
                            value={displayEnableNotificationSound}
                            onValueChange={(value) => {
                                setLocalEnableNotificationSound(value);
                                latestSettingPayloadRef.current = { ...latestSettingPayloadRef.current, enableNotificationSound: value };
                                persistSettings();
                            }}
                            {...getProfilePaperSwitchProps(isDark)}
                        />
                    </View>
                </View>

                <Text className='text-sm mb-2' style={{ color: colors.textSecondary }}>{t('profile.permissionsSection')}</Text>
                <View className='rounded-xl p-4 mb-4' style={{ backgroundColor: colors.cardBg }}>
                    <View className='flex-row items-center justify-between'>
                        <View className='flex-1 mr-4'>
                            <Text className='text-base font-century-gothic-bold' style={{ color: colors.sectionHeaderText }}>{t('profile.locationPermission')}</Text>
                            <Text className='text-sm' style={{ color: colors.textSecondary }}>{t('profile.locationPermissionDescription')}</Text>
                        </View>
                        <Switch
                            value={locationGranted}
                            onValueChange={handleLocationToggle}
                            {...getProfilePaperSwitchProps(isDark)}
                        />
                    </View>
                    <View style={{ height: 1, backgroundColor: colors.borderColor, marginVertical: 8 }} />
                    <View className='flex-row items-center justify-between'>
                        <View className='flex-1 mr-4'>
                            <Text className='text-base font-century-gothic-bold' style={{ color: colors.sectionHeaderText }}>{t('profile.notificationPermission')}</Text>
                            <Text className='text-sm' style={{ color: colors.textSecondary }}>{t('profile.notificationPermissionDescription')}</Text>
                        </View>
                        <Switch
                            value={notificationGranted}
                            onValueChange={handleNotificationToggle}
                            {...getProfilePaperSwitchProps(isDark)}
                        />
                    </View>
                </View>

                <Button
                    mode='outlined'
                    icon="account-plus-outline"
                    onPress={() => router.push({ pathname: '/(auth)', params: { addAccount: 'true' } } as any)}
                    contentStyle={{ alignItems: 'center', justifyContent: 'center', paddingLeft: 0 }}
                    textColor="#fea60e"
                    style={{ borderColor: '#fea60e', marginBottom: 8 }}
                >
                    {t('accounts.addAccount')}
                </Button>

                <Button
                    mode='outlined'
                    icon="account-remove"
                    onPress={() => setDeleteAccountModalVisible(true)}
                    disabled={isDeletingAccount}
                    contentStyle={{ alignItems: 'center', justifyContent: 'center', paddingLeft: 0 }}
                    textColor="#ef4444"
                    style={{ borderColor: '#ef4444', marginBottom: 8 }}
                >
                    {t('profile.deleteAccount')}
                </Button>

                <Button
                    mode='contained'
                    buttonColor='red'
                    icon="logout"
                    onPress={handleLogout}
                    loading={isLoggingOut}
                    disabled={isLoggingOut}
                    contentStyle={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingLeft: 0
                    }}
                    textColor="white"
                    className="mb-4"
                >
                    {t('profile.logout')}
                </Button>
            </View>

        <Portal>
          <PaperModal
            visible={deleteAccountModalVisible}
            onDismiss={() => { setDeleteAccountModalVisible(false); setDeleteAccountStep('confirm'); setDeleteAccountOtpCode(''); }}
            contentContainerStyle={{ padding: 24, margin: 20, borderRadius: 16, backgroundColor: colors.sheetBg }}
          >
            {deleteAccountStep === 'confirm' ? (
              <>
                <Text style={{ color: colors.sectionHeaderText, fontSize: 18, fontFamily: 'CenturyGothic-Bold', marginBottom: 8 }}>
                  {t('profile.deleteAccountConfirmTitle')}
                </Text>
                <Text style={{ color: '#9ca3af', fontSize: 14, marginBottom: 20, fontFamily: 'CenturyGothic' }}>
                  {t('profile.deleteAccountConfirmMessage')}
                </Text>
                <Button
                  mode="contained"
                  onPress={handleSendDeleteAccountOtp}
                  loading={isSendingDeleteOtp}
                  disabled={isSendingDeleteOtp}
                  buttonColor="#ef4444"
                  textColor="white"
                  style={{ marginBottom: 8 }}
                >
                  {t('profile.deleteAccountOtpSend')}
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => setDeleteAccountModalVisible(false)}
                  textColor="#6b7280"
                  style={{ borderColor: '#6b7280' }}
                >
                  {t('common.cancel')}
                </Button>
              </>
            ) : (
              <>
                <Text style={{ color: colors.sectionHeaderText, fontSize: 18, fontFamily: 'CenturyGothic-Bold', marginBottom: 8 }}>
                  {t('profile.deleteAccountOtpTitle')}
                </Text>
                <Text style={{ color: '#9ca3af', fontSize: 13, marginBottom: 16, fontFamily: 'CenturyGothic' }}>
                  {t('profile.deleteAccountOtpDesc')}
                </Text>
                <OtpInput
                  numberOfDigits={6}
                  onFilled={(code) => { setDeleteAccountOtpCode(code); }}
                  focusColor="#ef4444"
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
                    pinCodeTextStyle: { fontSize: 20, color: colors.sectionHeaderText },
                  }}
                  type="numeric"
                />
                <Button
                  mode="contained"
                  onPress={handleDeleteAccount}
                  loading={isDeletingAccount}
                  disabled={isDeletingAccount || deleteAccountOtpCode.length < 6}
                  buttonColor="#ef4444"
                  textColor="white"
                  style={{ marginBottom: 8 }}
                >
                  {t('profile.deleteAccountOtpVerify')}
                </Button>
                <Button
                  mode="text"
                  onPress={handleSendDeleteAccountOtp}
                  loading={isSendingDeleteOtp}
                  disabled={isSendingDeleteOtp}
                  textColor="#fea60e"
                >
                  {t('profile.deleteAccountOtpResend')}
                </Button>
              </>
            )}
          </PaperModal>

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
