import React, { useCallback } from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { Dialog, Icon, Portal } from "react-native-paper";
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/redux-store';
import { hideAlert, AlertButton } from '../../store/alertSlice';
import { Text } from './Text';

import { useTheme } from '../../hook/useTheme';
import {
  SOFT_CANCEL_TEXT,
  primaryConfirmButtonColors,
  softCancelSurface,
} from '../../theme/confirmDialogStyles';

/**
 * Global Alert Component - React Native Paper Dialog tabanlı
 * Alert.alert yerine kullanılır, Century Gothic font ile tutarlı görünüm sağlar
 */
export const GlobalAlert: React.FC = () => {
  const { visible, title, message, buttons, type } = useSelector(
    (state: RootState) => state.alert
  );
  const dispatch = useDispatch();
  const { colors, isDark } = useTheme();
  const primaryBtn = primaryConfirmButtonColors(isDark);
  const cancelSurface = softCancelSurface(isDark);

  const handleDismiss = useCallback(() => {
    dispatch(hideAlert());
  }, [dispatch]);

  const handleButtonPress = useCallback(
    (button: AlertButton) => {
      dispatch(hideAlert());
      // Callback'i dialog kapandıktan sonra çağır
      if (button.onPress) {
        setTimeout(() => {
          button.onPress?.();
        }, 100);
      }
    },
    [dispatch]
  );

  // Type'a göre icon ve renk
  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return { icon: 'check-circle', color: '#22c55e' };
      case 'error':
        return { icon: 'alert-circle', color: '#ef4444' };
      case 'warning':
        return { icon: 'alert', color: '#f59e0b' };
      default:
        return { icon: 'information', color: '#3b82f6' };
    }
  };

  const typeConfig = getTypeConfig();

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={handleDismiss}
        dismissable={true}
        style={{
          backgroundColor: colors.cardBg,
          borderRadius: 16,
          maxWidth: 340,
          width: '85%',
          alignSelf: 'center',
          marginHorizontal: 'auto',
        }}
      >
        <Dialog.Title
          style={{
            color: colors.sectionHeaderText,
            fontFamily: 'CenturyGothic-Bold',
            fontSize: 18,
            textAlign: 'center',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon source={typeConfig.icon} size={24} color={typeConfig.color} />
            <Text style={{ color: colors.sectionHeaderText, fontFamily: 'CenturyGothic-Bold', fontSize: 18 }}>
              {title}
            </Text>
          </View>
        </Dialog.Title>

        <Dialog.Content>
          <Text
            style={{
              color: colors.sectionHeaderText,
              fontFamily: 'CenturyGothic',
              fontSize: 15,
              textAlign: 'center',
              lineHeight: 22,
            }}
          >
            {message}
          </Text>
        </Dialog.Content>

        <Dialog.Actions
          style={{
            width: '100%',
            paddingHorizontal: 12,
            paddingTop: 4,
            paddingBottom: 8,
            margin: 0,
            flexDirection: 'column',
            alignItems: 'stretch',
          }}
        >
          <View
            style={{
              flexDirection: buttons.length > 2 ? 'column' : 'row',
              flexWrap: 'wrap',
              alignItems: buttons.length > 2 ? 'stretch' : 'center',
              justifyContent: buttons.length === 2 ? 'center' : buttons.length === 1 ? 'center' : 'flex-start',
              width: '100%',
              paddingBottom: 12,
            }}
          >
            {buttons.map((button, index) => {
              const isCancel = button.style === 'cancel';
              const fontSize = buttons.length > 2 ? 15 : 14;
              const isPair = buttons.length === 2;
              const isSingle = buttons.length === 1;
              const bg = isCancel ? cancelSurface.backgroundColor : primaryBtn.backgroundColor;
              const borderCol = isCancel ? cancelSurface.borderColor : primaryBtn.borderColor;
              const fg = isCancel ? SOFT_CANCEL_TEXT : primaryBtn.color;
              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.88}
                  onPress={() => handleButtonPress(button)}
                  style={{
                    marginHorizontal: isPair ? 6 : 0,
                    marginBottom: buttons.length > 2 && index < buttons.length - 1 ? 10 : 0,
                    alignSelf: isSingle ? 'stretch' : 'center',
                    width: isSingle ? '100%' : undefined,
                  }}
                >
                  <View
                    collapsable={false}
                    style={{
                      borderRadius: 12,
                      minHeight: 48,
                      minWidth: isPair ? 128 : isSingle ? undefined : 120,
                      paddingVertical: 12,
                      paddingHorizontal: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1.5,
                      borderColor: borderCol,
                      backgroundColor: bg,
                      ...(Platform.OS === 'android' ? { elevation: 0 } : {}),
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'CenturyGothic',
                        fontSize,
                        fontWeight: '600',
                        textAlign: 'center',
                        color: fg,
                      }}
                    >
                      {button.text}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};
