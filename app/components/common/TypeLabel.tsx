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
 * Reusable type label badge — StatusBadge (panel büyük mod) ile aynı metin/padding
 * compact: pill (rounded-full), aksi: rounded-xl
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
      className={`${color} px-2.5 py-1 ${compact ? 'rounded-full' : 'rounded-xl'} flex-row items-center justify-center self-start ${className}`}
    >
      <Text className="text-white font-century-gothic-sans-medium text-sm">
        {label}
      </Text>
    </View>
  );
};
