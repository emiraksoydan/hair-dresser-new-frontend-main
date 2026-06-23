import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { OwnerAvatar } from '../common/owneravatar';
import { ImageOwnerType, UserType } from '../../types';
import { useTheme } from '../../hook/useTheme';

const CHAT_AVATAR_PLACEHOLDER = require('../../../assets/images/profileempty.webp');

type Props = {
  userId: string;
  imageUrl?: string | null;
  userType?: UserType;
  size?: number;
  ringColor: string;
  active?: boolean;
  hasUnread?: boolean;
  onPress?: () => void;
  skipOwnerImageFetch?: boolean;
};

export const ChatThreadRingAvatar: React.FC<Props> = ({
  userId,
  imageUrl,
  userType,
  size = 54,
  ringColor,
  active = false,
  hasUnread = false,
  onPress,
  skipOwnerImageFetch = false,
}) => {
  const { colors, isDark } = useTheme();
  const inner = size - 8;
  const ringWidth = active ? 3 : hasUnread ? 2.5 : 2;
  const resolvedRing = active ? ringColor : hasUnread ? ringColor : isDark ? 'rgba(148,163,184,0.35)' : 'rgba(148,163,184,0.28)';

  const iconSource =
    userType === UserType.BarberStore
      ? 'store'
      : userType === UserType.FreeBarber
        ? 'account-supervisor'
        : 'account';

  const content = (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: ringWidth,
          borderColor: resolvedRing,
          padding: 2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            overflow: 'hidden',
            backgroundColor: isDark ? '#374151' : '#e5e7eb',
          }}
        >
          <OwnerAvatar
            ownerId={userId}
            ownerType={ImageOwnerType.User}
            fallbackUrl={imageUrl}
            skipOwnerImageFetch={skipOwnerImageFetch}
            placeholderAsset={CHAT_AVATAR_PLACEHOLDER}
            imageClassName="w-full h-full"
            iconSource={iconSource}
            iconSize={Math.round(inner * 0.42)}
            iconColor={colors.headerText}
            iconContainerClassName="bg-transparent"
          />
        </View>
      </View>
      {hasUnread && !active ? (
        <View
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: ringColor,
            borderWidth: 2,
            borderColor: isDark ? colors.screenBg : '#ffffff',
          }}
        />
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} accessibilityRole="button">
      {content}
    </TouchableOpacity>
  );
};
