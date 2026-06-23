import React, { useEffect, useRef } from 'react';

import { View, TouchableOpacity, ActivityIndicator } from 'react-native';

import { BottomSheetView } from '@gorhom/bottom-sheet';

import { Text } from '../common/Text';

import { SocialCaptionInput } from './SocialCaptionInput';

import { SocialBottomSheet } from './SocialBottomSheet';

import { useLanguage } from '../../hook/useLanguage';

import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT } from '../../constants/socialTheme';

import { useBottomSheet } from '../../hook/useBottomSheet';



type Props = {

  visible: boolean;

  title: string;

  value: string;

  onChangeText: (text: string) => void;

  onClose: () => void;

  onSave: () => void;

  saving?: boolean;

  placeholder: string;

  maxLength: number;

};



export const SocialInlineEditSheet: React.FC<Props> = ({

  visible,

  title,

  value,

  onChangeText,

  onClose,

  onSave,

  saving = false,

  placeholder,

  maxLength,

}) => {

  const { t } = useLanguage();

  const sheet = useBottomSheet({ snapPoints: ['52%'], enableHandlePanningGesture: true });

  const wasVisible = useRef(false);



  useEffect(() => {

    if (visible && !wasVisible.current) sheet.present();

    if (!visible && wasVisible.current) sheet.dismiss();

    wasVisible.current = visible;

  }, [visible, sheet]);



  return (

    <SocialBottomSheet sheet={sheet} onDismiss={onClose} keyboardBehavior="interactive">

      <BottomSheetView style={{ paddingHorizontal: 16, paddingBottom: 24 }}>

        <Text className="text-[17px] font-bold mb-3" style={{ color: SOCIAL_ACCENT }}>

          {title}

        </Text>

        <SocialCaptionInput

          value={value}

          onChangeText={onChangeText}

          placeholder={placeholder}

          maxLength={maxLength}

        />

        <TouchableOpacity

          onPress={onSave}

          disabled={saving}

          className="mt-3.5 rounded-xl py-3 items-center"

          style={{ backgroundColor: SOCIAL_ACCENT, opacity: saving ? 0.7 : 1 }}

        >

          {saving ? (

            <ActivityIndicator color={SOCIAL_ACCENT_TEXT} />

          ) : (

            <Text className="text-[15px] font-bold" style={{ color: SOCIAL_ACCENT_TEXT }}>

              {t('common.save')}

            </Text>

          )}

        </TouchableOpacity>

      </BottomSheetView>

    </SocialBottomSheet>

  );

};

