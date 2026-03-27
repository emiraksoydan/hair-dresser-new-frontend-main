import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';

interface TypeLabelProps {
  label: string;
  color?: string;
  className?: string;
  /** Kart üstü chip satırlarında diğer rozetlerle aynı boyut */
  compact?: boolean;
}

/**
 * Reusable type label badge component
 */
export const TypeLabel: React.FC<TypeLabelProps> = ({
  label,
  color = 'bg-purple-500',
  className = '',
  compact = false,
}) => {
  if (!label) return null;

  return (
    <View
      className={`${color} ${compact ? 'px-2.5 py-1 rounded-full' : 'px-2 py-1 rounded-xl'} flex-row items-center justify-center self-start ${className}`}
    >
      <Text className={`text-white font-century-gothic-sans-medium ${compact ? 'text-sm' : 'text-base'}`}>
        {label}
      </Text>
    </View>
  );
};
