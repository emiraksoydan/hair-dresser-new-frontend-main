import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT, SOCIAL_ACCENT_SOFT, SOCIAL_ACCENT_SOFT_DARK } from '../../constants/socialTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Icon, TextInput as PaperTextInput } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { pickSocialProfileImage } from '../../utils/social/pickSocialMedia';
import * as Location from 'expo-location';
import { Text } from '../../components/common/Text';
import { SocialBioEditor } from '../../components/social/SocialBioEditor';
import { bioPlainLength, BIO_MAX_LENGTH, isEmptyBio } from '../../utils/social/socialBioFormat';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';
import {
  useGetSocialMyProfilesQuery,
  useLazyGetSocialProfileByUsernameQuery,
  useUpdateSocialProfileMutation,
  useUploadSocialProfileAvatarMutation,
  useGetWorkingHoursByTargetQuery,
} from '../../store/api';
import { SocialProfileOwnerType } from '../../types/social';
import { socialProfileOwnerLabel } from '../../utils/social/socialProfileOwnerLabel';
import { buildSocialBioTemplate, formatWorkingHoursSummary } from '../../utils/social/socialBioTemplate';
import { getBarberTypeLabel } from '../../utils/card-helpers';
import { BarberType } from '../../types';
import { showSnack } from '../../store/snackbarSlice';
import { useAppDispatch } from '../../store/hook';
import { translateSocialApiMessage } from '../../utils/social/translateSocialApiMessage';
import { KeyboardDismissExclusionView } from '../../components/common/KeyboardDismissExclusionView';
import { useKeyboardBottomPadding } from '../../hook/useKeyboardBottomPadding';

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

export default function SocialEditProfileScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useSafeNavigation();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ profileId?: string }>();

  const { activeProfileId, setActiveProfileId } = useActiveSocialProfile();
  const { data: profiles, isLoading, refetch } = useGetSocialMyProfilesQuery();
  const [updateProfile, { isLoading: saving }] = useUpdateSocialProfileMutation();
  const [uploadAvatar, { isLoading: uploadingAvatar }] = useUploadSocialProfileAvatarMutation();
  const [checkUsername] = useLazyGetSocialProfileByUsernameQuery();

  const profile = useMemo(
    () => profiles?.find((p) => p.id === activeProfileId) ?? profiles?.[0],
    [profiles, activeProfileId],
  );

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const usernameCheckSeq = useRef(0);

  useEffect(() => {
    if (params.profileId && profiles?.some((p) => p.id === params.profileId)) {
      setActiveProfileId(String(params.profileId));
    }
  }, [params.profileId, profiles, setActiveProfileId]);

  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username);
    setBio(profile.bio ?? '');
    setExternalUrl(profile.externalUrl ?? '');
    setUsernameError(null);
  }, [profile?.id, profile?.username, profile?.bio, profile?.externalUrl]);

  const ownerNumberLabel = useMemo(() => {
    if (!profile) return '';
    switch (profile.ownerType) {
      case SocialProfileOwnerType.BarberStore:
        return t('social.storeNumber');
      case SocialProfileOwnerType.FreeBarber:
        return t('social.barberNumber');
      default:
        return t('social.customerNumber');
    }
  }, [profile, t]);

  const ownerTypeColor = useMemo(() => {
    if (!profile) return SOCIAL_ACCENT;
    switch (profile.ownerType) {
      case SocialProfileOwnerType.BarberStore:
        return '#2563eb';
      case SocialProfileOwnerType.FreeBarber:
        return '#f05e23';
      default:
        return SOCIAL_ACCENT;
    }
  }, [profile]);

  const { data: workingHours } = useGetWorkingHoursByTargetQuery(profile?.ownerId ?? '', {
    skip: !profile || profile.ownerType !== SocialProfileOwnerType.BarberStore,
  });
  const workingHoursSummary = useMemo(
    () => formatWorkingHoursSummary(workingHours, t),
    [workingHours, t],
  );

  const handleApplyBioTemplate = useCallback(() => {
    if (!profile) return;
    const typeLabel =
      profile.ownerBarberType != null
        ? getBarberTypeLabel(profile.ownerBarberType as BarberType)
        : socialProfileOwnerLabel(profile.ownerType, t);
    setBio(buildSocialBioTemplate(profile.ownerType, profile.ownerDisplayName, typeLabel, t));
  }, [profile, t]);

  useEffect(() => {
    if (!profile) return;
    const trimmed = username.trim().toLowerCase();
    if (!trimmed || trimmed === profile.username) {
      setUsernameError(null);
      setUsernameChecking(false);
      return;
    }
    if (!USERNAME_PATTERN.test(trimmed)) {
      setUsernameError(t('social.usernameInvalid'));
      setUsernameChecking(false);
      return;
    }

    const seq = ++usernameCheckSeq.current;
    setUsernameChecking(true);
    const timer = setTimeout(async () => {
      try {
        const found = await checkUsername(trimmed).unwrap();
        if (usernameCheckSeq.current !== seq) return;
        if (found?.id && found.id !== profile.id) {
          setUsernameError(t('social.usernameTaken'));
        } else {
          setUsernameError(null);
        }
      } catch {
        if (usernameCheckSeq.current !== seq) return;
        setUsernameError(null);
      } finally {
        if (usernameCheckSeq.current === seq) setUsernameChecking(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [username, profile, checkUsername, t]);

  const handlePickAvatar = useCallback(async () => {
    if (!profile) return;
    const file = await pickSocialProfileImage({ allowsEditing: true, aspect: [1, 1] });
    if (!file) return;
    try {
      const res = await uploadAvatar({
        profileId: profile.id,
        file,
      }).unwrap();
      if (res?.success) {
        dispatch(showSnack({ message: t('social.avatarUpdated'), isError: false }));
        refetch();
      } else {
        Alert.alert(
          String(t('common.error')),
          translateSocialApiMessage(res?.message, t, t('social.avatarFailed')),
        );
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'data' in e
          ? (e as { data?: { message?: string } }).data?.message
          : undefined;
      Alert.alert(
        String(t('common.error')),
        translateSocialApiMessage(msg, t, t('social.avatarFailed')),
      );
    }
  }, [profile, uploadAvatar, dispatch, t, refetch]);

  const handleSave = useCallback(async () => {
    if (!profile) return;
    const trimmedUsername = username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(trimmedUsername)) {
      Alert.alert(String(t('common.error')), t('social.usernameInvalid'));
      return;
    }
    if (usernameError) {
      Alert.alert(String(t('common.error')), usernameError);
      return;
    }
    if (bioPlainLength(bio) > BIO_MAX_LENGTH) {
      Alert.alert(String(t('common.error')), t('social.bioTooLong', { max: BIO_MAX_LENGTH }));
      return;
    }

    if (trimmedUsername !== profile.username) {
      try {
        const found = await checkUsername(trimmedUsername).unwrap();
        if (found?.id && found.id !== profile.id) {
          setUsernameError(t('social.usernameTaken'));
          Alert.alert(String(t('common.error')), t('social.usernameTaken'));
          return;
        }
      } catch {
        /* kullanılabilir */
      }
    }

    try {
      const res = await updateProfile({
        profileId: profile.id,
        username: trimmedUsername,
        bio: isEmptyBio(bio) ? '' : bio.trim(),
        externalUrl: externalUrl.trim() || '',
      }).unwrap();
      if (res?.success) {
        dispatch(showSnack({ message: t('social.profileUpdated'), isError: false }));
        refetch();
        router.back();
      } else {
        const msg = translateSocialApiMessage(res?.message, t, t('social.profileUpdateFailed'));
        if (
          res?.message === 'social.errors.usernameTaken' ||
          msg === t('social.errors.usernameTaken')
        ) {
          setUsernameError(t('social.errors.usernameTaken'));
        }
        Alert.alert(String(t('common.error')), msg);
      }
    } catch (e: unknown) {
      const raw =
        e && typeof e === 'object' && 'data' in e && (e as { data?: { message?: string } }).data?.message
          ? String((e as { data?: { message?: string } }).data?.message)
          : undefined;
      const msg = translateSocialApiMessage(raw, t, t('social.profileUpdateFailed'));
      if (raw === 'social.errors.usernameTaken' || msg === t('social.errors.usernameTaken')) {
        setUsernameError(t('social.errors.usernameTaken'));
        Alert.alert(String(t('common.error')), t('social.errors.usernameTaken'));
        return;
      }
      Alert.alert(String(t('common.error')), msg);
    }
  }, [profile, username, bio, externalUrl, usernameError, updateProfile, checkUsername, dispatch, t, refetch, router]);

  const handleUpdateLocation = useCallback(async () => {
    if (!profile) return;
    setUpdatingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(String(t('common.error')), t('social.searchNeedInput'));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const res = await updateProfile({
        profileId: profile.id,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      }).unwrap();
      if (res?.success) {
        dispatch(showSnack({ message: t('social.locationUpdated'), isError: false }));
        refetch();
      }
    } catch {
      Alert.alert(String(t('common.error')), t('social.profileUpdateFailed'));
    } finally {
      setUpdatingLocation(false);
    }
  }, [profile, updateProfile, dispatch, t, refetch]);

  const { scrollBottomPadding } = useKeyboardBottomPadding(32);

  const cardStyle = useMemo(
    () => ({ backgroundColor: colors.cardBg, marginBottom: 10, borderColor: colors.borderColor2 }),
    [colors.cardBg, colors.borderColor2],
  );

  const busy = saving || uploadingAvatar;

  if (isLoading || !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.screenBg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={SOCIAL_ACCENT} />
      </View>
    );
  }

  const usernameAvailable =
    !usernameError &&
    !usernameChecking &&
    username.trim().toLowerCase() !== profile.username &&
    USERNAME_PATTERN.test(username.trim().toLowerCase());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.screenBg }} edges={['top']}>
      <View
        className="flex-row items-center px-3 py-2.5 border-b"
        style={{ borderBottomColor: colors.borderColor2 }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} disabled={busy} className="p-1">
          <Icon source="arrow-left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text className="flex-1 ml-2 text-[17px] font-bold" style={{ color: colors.headerText }}>
          {t('social.editProfile')}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={busy || !!usernameError || usernameChecking}
          className="rounded-full px-4 py-2 min-w-[72px] items-center"
          style={{
            backgroundColor: busy || usernameError || usernameChecking ? colors.borderColor2 : SOCIAL_ACCENT,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={SOCIAL_ACCENT_TEXT} />
          ) : (
            <Text className="font-bold text-sm" style={{ color: SOCIAL_ACCENT_TEXT }}>
              {t('profile.save')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <KeyboardDismissExclusionView className="flex-1">
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: scrollBottomPadding }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            nestedScrollEnabled
          >
        <View className="items-center mb-4">
          <TouchableOpacity onPress={handlePickAvatar} disabled={uploadingAvatar} activeOpacity={0.85}>
            <View style={{ position: 'relative' }}>
              <View
                className="items-center justify-center overflow-hidden"
                style={{
                  width: 108,
                  height: 108,
                  borderRadius: 54,
                  backgroundColor: isDark ? '#374151' : '#e5e7eb',
                  borderWidth: 3,
                  borderColor: isDark ? SOCIAL_ACCENT_SOFT_DARK : SOCIAL_ACCENT_SOFT,
                }}
              >
                {profile.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} style={{ width: 108, height: 108 }} />
                ) : (
                  <Icon source="account" size={52} color={colors.headerText} />
                )}
                {uploadingAvatar && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0.4)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ActivityIndicator color="#fff" />
                  </View>
                )}
              </View>
              <View
                className="absolute items-center justify-center rounded-full border-2"
                style={{
                  width: 34,
                  height: 34,
                  bottom: -2,
                  right: -2,
                  backgroundColor: SOCIAL_ACCENT,
                  borderColor: colors.screenBg,
                }}
              >
                <Icon source="pencil" size={18} color={SOCIAL_ACCENT_TEXT} />
              </View>
            </View>
          </TouchableOpacity>
          <Text className="text-xs mt-3 text-center" style={{ color: colors.textTertiary }}>
            {t('social.avatarTapHint')}
          </Text>
        </View>

        <Card mode="outlined" style={cardStyle}>
          <Card.Content>
            <View
              className="self-start px-2.5 py-1 rounded-full mb-2"
              style={{ backgroundColor: ownerTypeColor + (isDark ? '28' : '22') }}
            >
              <Text className="text-xs font-bold" style={{ color: '#000000' }}>
                {socialProfileOwnerLabel(profile.ownerType, t)}
              </Text>
            </View>
            {!!profile.ownerDisplayName && (
              <Text className="text-lg font-bold mb-1" style={{ color: colors.headerText }}>
                {profile.ownerDisplayName}
              </Text>
            )}
            {!!profile.ownerNumber && (
              <Text className="text-sm" style={{ color: colors.headerText }}>
                {ownerNumberLabel}:{' '}
                <Text className="font-bold">#{profile.ownerNumber}</Text>
              </Text>
            )}
            {profile.ownerBarberType != null && (
              <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                {t('social.businessType')}: {getBarberTypeLabel(profile.ownerBarberType as BarberType)}
              </Text>
            )}
            <View className="flex-row items-start gap-1.5 mt-3 pt-3 border-t" style={{ borderTopColor: colors.borderColor2 }}>
              <View style={{ marginTop: 1 }}>
                <Icon source="link-variant" size={14} color={colors.textTertiary} />
              </View>
              <Text className="text-xs flex-1 leading-4" style={{ color: colors.textTertiary }}>
                {t('social.linkedAccountHint')}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {workingHoursSummary ? (
          <Card mode="outlined" style={{ ...cardStyle, marginTop: 12 }}>
            <Card.Content className="flex-row items-center gap-2">
              <Icon source="clock-outline" size={18} color={SOCIAL_ACCENT} />
              <View className="flex-1">
                <Text className="text-xs font-semibold mb-0.5" style={{ color: colors.textSecondary }}>
                  {t('form.workingHours')}
                </Text>
                <Text className="text-sm" style={{ color: colors.headerText }}>
                  {workingHoursSummary}
                </Text>
              </View>
            </Card.Content>
          </Card>
        ) : null}

        <View style={{ marginTop: 12 }}>
          <Text className="text-[15px] font-bold mb-1" style={{ color: colors.headerText }}>
            {t('social.username')}
          </Text>
          <Text className="text-xs mb-1.5" style={{ color: colors.textSecondary }}>
            {t('social.usernameHint')}
          </Text>
          <View className="mb-2" style={{ borderRadius: 12, overflow: 'hidden' }}>
            <PaperTextInput
              mode="outlined"
              value={username}
              onChangeText={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
              placeholder={t('social.usernamePlaceholder')}
              editable={!busy}
              error={!!usernameError}
              outlineColor={colors.borderColor2}
              activeOutlineColor={usernameError ? '#ef4444' : SOCIAL_ACCENT}
              textColor={colors.headerText}
              style={{ backgroundColor: isDark ? colors.cardBg : '#ffffff' }}
              outlineStyle={{ borderRadius: 12 }}
              theme={{ roundness: 12 }}
              right={
                usernameChecking ? (
                  <PaperTextInput.Icon icon={() => <ActivityIndicator size={18} color={SOCIAL_ACCENT} />} />
                ) : usernameAvailable ? (
                  <PaperTextInput.Icon icon="check-circle" color="#22c55e" />
                ) : usernameError ? (
                  <PaperTextInput.Icon icon="alert-circle" color="#ef4444" />
                ) : undefined
              }
            />
          {!!usernameError && (
            <Text className="text-xs mt-1.5" style={{ color: '#ef4444' }}>
              {usernameError}
            </Text>
          )}
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text className="text-[15px] font-bold mb-1" style={{ color: colors.headerText }}>
            {t('social.bio')}
          </Text>
          <Text className="text-xs mb-1.5" style={{ color: colors.textSecondary }}>
            {t('social.bioEditorSubtitle')}
          </Text>
          {(profile.ownerType === SocialProfileOwnerType.FreeBarber ||
            profile.ownerType === SocialProfileOwnerType.BarberStore) && (
            <TouchableOpacity
              onPress={handleApplyBioTemplate}
              disabled={busy}
              className="self-start mb-2 px-3 py-1.5 rounded-full flex-row items-center gap-1.5"
              style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderColor2 }}
            >
              <Icon source="text-box-outline" size={14} color={SOCIAL_ACCENT} />
              <Text className="text-xs font-semibold" style={{ color: colors.headerText }}>
                {t('social.applyBioTemplate')}
              </Text>
            </TouchableOpacity>
          )}
          <SocialBioEditor
            value={bio}
            onChangeText={setBio}
            placeholder={t('social.bioPlaceholder')}
            editable={!busy}
            resetKey={profile.id}
          />
        </View>

        <View style={{ marginTop: 12 }}>
          <Text className="text-[15px] font-bold mb-1" style={{ color: colors.headerText }}>
            {t('social.externalUrl')}
          </Text>
          <PaperTextInput
            mode="outlined"
            value={externalUrl}
            onChangeText={setExternalUrl}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('social.externalUrlPlaceholder')}
            editable={!busy}
            outlineColor={colors.borderColor2}
            activeOutlineColor={SOCIAL_ACCENT}
            textColor={colors.headerText}
            style={{ backgroundColor: isDark ? colors.cardBg : '#ffffff' }}
            outlineStyle={{ borderRadius: 12 }}
            theme={{ roundness: 12 }}
          />
        </View>

        {(profile.ownerType === SocialProfileOwnerType.FreeBarber ||
          profile.ownerType === SocialProfileOwnerType.BarberStore) && (
          <TouchableOpacity
            onPress={handleUpdateLocation}
            disabled={busy || updatingLocation}
            className="mt-4 py-3 rounded-xl items-center flex-row justify-center gap-2"
            style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderColor2 }}
          >
            {updatingLocation ? (
              <ActivityIndicator size="small" color={SOCIAL_ACCENT} />
            ) : (
              <Icon source="crosshairs-gps" size={18} color={SOCIAL_ACCENT} />
            )}
            <Text className="font-semibold text-sm" style={{ color: colors.headerText }}>
              {t('social.updateLocation')}
            </Text>
          </TouchableOpacity>
        )}
          </ScrollView>
        </KeyboardDismissExclusionView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
