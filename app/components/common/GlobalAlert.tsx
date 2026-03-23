import React, { useCallback } from 'react';
import { View } from 'react-native';
import { Dialog, Portal, Button } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/redux-store';
import { hideAlert, AlertButton } from '../../store/alertSlice';
import { Text } from './Text';
import { Icon } from 'react-native-paper';
import { useTheme } from '../../hook/useTheme';

/**
 * Global Alert Component - React Native Paper Dialog tabanlı
 * Alert.alert yerine kullanılır, Century Gothic font ile tutarlı görünüm sağlar
 */
export const GlobalAlert: React.FC = () => {
  const { visible, title, message, buttons, type } = useSelector(
    (state: RootState) => state.alert
  );
  const dispatch = useDispatch();
  const { colors } = useTheme();

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

  // Button style'a göre renk
  const getButtonColor = (style?: 'default' | 'cancel' | 'destructive') => {
    switch (style) {
      case 'destructive':
        return '#ef4444';
      case 'cancel':
        return '#6b7280';
      default:
        return '#22c55e';
    }
  };

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

        <Dialog.Actions style={{ justifyContent: 'center', gap: 12, paddingBottom: 16 }}>
          {buttons.map((button, index) => (
            <Button
              key={index}
              mode={button.style === 'cancel' ? 'outlined' : 'contained'}
              onPress={() => handleButtonPress(button)}
              buttonColor={button.style === 'cancel' ? 'transparent' : getButtonColor(button.style)}
              textColor={button.style === 'cancel' ? '#9ca3af' : 'white'}
              style={{
                borderRadius: 10,
                minWidth: 100,
                borderColor: button.style === 'cancel' ? colors.borderColor : 'transparent',
              }}
              labelStyle={{ fontFamily: 'CenturyGothic', fontSize: 14 }}
            >
              {button.text}
            </Button>
          ))}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};
