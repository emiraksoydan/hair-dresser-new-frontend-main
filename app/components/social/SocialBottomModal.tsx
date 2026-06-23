import React from 'react';
import {
  Modal,
  Pressable,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  ViewStyle,
  type DimensionValue,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from 'react-native-paper';
import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';

export type SocialBottomModalProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  keyboardAvoiding?: boolean;
  maxHeight?: DimensionValue;
  surface?: 'card' | 'screen';
  contentStyle?: StyleProp<ViewStyle>;
};

export const SocialBottomModal: React.FC<SocialBottomModalProps> = ({
  visible,
  onClose,
  title,
  children,
  keyboardAvoiding = false,
  maxHeight,
  surface = 'card',
  contentStyle,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const backgroundColor = surface === 'screen' ? colors.screenBg : colors.cardBg;

  const panel = (
    <View
      className="rounded-t-2xl"
      style={[
        {
          backgroundColor,
          paddingBottom: insets.bottom + 12,
          maxHeight,
        },
        contentStyle,
      ]}
    >
      {title != null && (
        <View
          className="flex-row items-center justify-between px-4 pt-3.5 pb-2.5 border-b"
          style={{ borderBottomColor: colors.borderColor2 }}
        >
          <Text className="text-[17px] font-bold" style={{ color: colors.headerText }}>
            {title}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityRole="button">
            <Icon source="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
      {children}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/45" onPress={onClose} accessibilityRole="button" />
      {keyboardAvoiding ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {panel}
        </KeyboardAvoidingView>
      ) : (
        panel
      )}
    </Modal>
  );
};
