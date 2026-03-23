import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';

interface TypeLabelProps {
  label: string;
  color?: string;
  className?: string;
}

/**
 * Reusable type label badge component
 */
export const TypeLabel: React.FC<TypeLabelProps> = ({
  label,
  color = 'bg-purple-500',
  className = '',
}) => {
  if (!label) return null;

  return (
    <View className={`${color} px-2 py-1 rounded-xl flex-row items-center justify-center ${className}`}>
      <Text className="text-white text-base font-century-gothic-sans-medium">
        {label}
      </Text>
    </View>
  );
};
