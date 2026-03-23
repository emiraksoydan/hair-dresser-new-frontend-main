import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { ImageCarousel } from './imagecarousel';
import { ImageGetDto } from '../../types';

interface CardImageProps {
  images?: ImageGetDto[];
  singleImageUrl?: string | null;
  onPress?: () => void;
  isList: boolean;
  width: number;
  height?: number;
  borderRadiusClass?: string;
  showPagination?: boolean;
  autoPlay?: boolean;
  className?: string;
}

/**
 * Unified image component for cards
 * Supports both single image and image carousel
 */
export const CardImage: React.FC<CardImageProps> = ({
  images,
  singleImageUrl,
  onPress,
  isList,
  width,
  height,
  borderRadiusClass = 'rounded-lg',
  showPagination = true,
  autoPlay = true,
  className = '',
}) => {
  const imageHeight = height || (isList ? 250 : 112);
  const emptyImage = require('../../../assets/images/empty.png');

  // Birden fazla resim varsa her iki modda da carousel göster
  if (images && images.length > 1) {
    return (
      <View className={`relative ${className}`}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
          <ImageCarousel
            images={images}
            width={width}
            height={imageHeight}
            borderRadiusClass={borderRadiusClass}
            showPagination={isList ? showPagination : false}
            autoPlay={autoPlay}
          />
        </TouchableOpacity>
      </View>
    );
  }

  // Tek resim
  if (images && images.length > 0) {
    return (
      <View className={`relative ${className}`}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
          <Image
            defaultSource={emptyImage}
            className={`${borderRadiusClass} mb-0`}
            style={{ width, height: imageHeight }}
            source={{ uri: images[0].imageUrl }}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>
    );
  }

  // Single image
  return (
    <View className={`relative ${className}`}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        <Image
          defaultSource={emptyImage}
          className={`${isList ? 'w-full' : ''} ${borderRadiusClass} mb-0`}
          style={{ width, height: imageHeight }}
          source={singleImageUrl ? { uri: singleImageUrl } : emptyImage}
          resizeMode="cover"
        />
      </TouchableOpacity>
    </View>
  );
};
