import React from 'react';
import { View } from 'react-native';
import { SocialMessageThreadList } from '../../components/social/SocialMessageThreadList';
import { useTheme } from '../../hook/useTheme';

export default function SocialMessagesScreen() {
  const { colors } = useTheme();
  return (
    <View className="flex-1" style={{ backgroundColor: colors.screenBg }}>
      <SocialMessageThreadList />
    </View>
  );
}
