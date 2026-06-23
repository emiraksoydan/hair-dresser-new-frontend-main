import React from 'react';

import { useSafeNavigation } from '../../hook/useSafeNavigation';

import { TouchableOpacity } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from 'react-native-paper';



import { useLanguage } from '../../hook/useLanguage';

import { useAuth } from '../../hook/useAuth';

import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';

import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT } from '../../constants/socialTheme';

import { getSocialProfileRequiredMessage } from '../../utils/social/socialNoProfileMessage';

import { showSnack } from '../../store/snackbarSlice';

import { useAppDispatch } from '../../store/hook';



type Props = {

  topOffset?: number;

  /** Video üzerinde konumlandırma */

  onDark?: boolean;

  inline?: boolean;

};



export const SocialReelsAddButton: React.FC<Props> = ({ topOffset = 8, onDark = false, inline = false }) => {

  const insets = useSafeAreaInsets();

  const router = useSafeNavigation();

  const dispatch = useAppDispatch();

  const { t } = useLanguage();

  const { userType } = useAuth();

  const { activeProfileId } = useActiveSocialProfile();



  const onPress = () => {

    if (!activeProfileId) {

      dispatch(showSnack({ message: getSocialProfileRequiredMessage(t, userType), isError: true }));

      return;

    }

    router.push({

      pathname: '/(screens)/social/create-post',

      params: {

        mode: 'reel',

        profileId: activeProfileId,

      },

    } as any);

  };



  return (

    <TouchableOpacity

      onPress={onPress}

      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}

      accessibilityLabel={t('social.createReel')}

      activeOpacity={0.85}

      style={{

        ...(inline

          ? { position: 'relative', top: undefined, right: undefined, zIndex: undefined }

          : {

              position: 'absolute',

              right: 12,

              top: insets.top + topOffset,

              zIndex: 30,

            }),

        width: 44,

        height: 44,

        borderRadius: 22,

        alignItems: 'center',

        justifyContent: 'center',

        backgroundColor: SOCIAL_ACCENT,

        shadowColor: onDark ? '#000' : 'transparent',

        shadowOffset: { width: 0, height: 2 },

        shadowOpacity: onDark ? 0.35 : 0,

        shadowRadius: 4,

        elevation: onDark ? 6 : 2,

      }}

    >

      <Icon source="plus" size={26} color={SOCIAL_ACCENT_TEXT} />

    </TouchableOpacity>

  );

};


