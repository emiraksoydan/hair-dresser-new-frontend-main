import React, { useState, useMemo } from 'react';
import { View, Image, Dimensions, StyleProp, ViewStyle } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import { useTheme } from '../../hook/useTheme';
import { ImageGetDto } from '../../types/common';

interface ImageCarouselProps {
  images: ImageGetDto[];
  width?: number;
  height?: number;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  borderRadiusClass?: string;
  containerStyle?: StyleProp<ViewStyle>;
  showPagination?: boolean;
  mode?: any; // Allow any mode supported by the carousel library
  /** false: üst seviye yatay sayfa kaydırması ile çakışmayı önlemek için tek görsel */
  enableSwipe?: boolean;
}

const emptyImage = require('../../../assets/images/empty.png');

export const ImageCarousel: React.FC<ImageCarouselProps> = React.memo(({
  images,
  width: widthProp,
  height = 250,
  autoPlay = true,
  autoPlayInterval = 3000,
  borderRadiusClass = '',
  containerStyle,
  showPagination = true,
  mode,
  enableSwipe = true,
}) => {
  const { isDark } = useTheme();
  const width = widthProp ?? Dimensions.get('window').width;
  const [activeIndex, setActiveIndex] = useState(0);

  // Memoize image data to prevent re-renders
  const imageData = useMemo(() => images || [], [images]);

  // Parse borderRadiusClass to get border radius value
  const getBorderRadius = () => {
    if (borderRadiusClass.includes('rounded-full')) return height / 2;
    if (borderRadiusClass.includes('rounded-xl')) return 12;
    if (borderRadiusClass.includes('rounded-lg')) return 8;
    if (borderRadiusClass.includes('rounded-md')) return 6;
    if (borderRadiusClass.includes('rounded-sm')) return 4;
    if (borderRadiusClass.includes('rounded-t-sm')) return 4;
    return 0;
  };

  const borderRadiusValue = getBorderRadius();

  // If no images or empty array, show placeholder
  if (!imageData || imageData.length === 0) {
    return (
      <View style={[{ width, height, borderRadius: borderRadiusValue, overflow: 'hidden' }, containerStyle]}>
        <Image
          source={emptyImage}
          style={{ width: '100%', height: '100%', borderRadius: borderRadiusValue }}
          resizeMode="cover"
        />
      </View>
    );
  }

  if (!enableSwipe) {
    const first = imageData[0];
    return (
      <View style={[{ width, height, overflow: 'hidden', borderRadius: borderRadiusValue }, containerStyle]}>
        <Image
          source={first?.imageUrl ? { uri: first.imageUrl } : emptyImage}
          defaultSource={emptyImage}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: borderRadiusValue,
          }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View style={[{ width, height, overflow: 'hidden', borderRadius: borderRadiusValue }, containerStyle]}>
      <Carousel
        loop={imageData.length === 1 ? false : true}
        width={width}
        height={height}
        autoPlay={imageData.length === 1 ? false : autoPlay}
        autoPlayInterval={imageData.length === 1 ? 0 : autoPlayInterval}
        data={imageData}
        scrollAnimationDuration={800}
        onSnapToItem={(index) => setActiveIndex(index)}
        {...(mode && mode !== 'default' ? { mode } : {})}
        renderItem={({ item }) => (
          <View
            style={{
              width: width,
              height: height,
              borderRadius: borderRadiusValue,
              overflow: 'hidden',
            }}
          >
            <Image
              source={item.imageUrl ? { uri: item.imageUrl } : emptyImage}
              defaultSource={emptyImage}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: borderRadiusValue,
              }}
              resizeMode="cover"
            />
          </View>
        )}
      />

      {/* Pagination Dots — state-based, no shared value read during render */}
      {showPagination && imageData.length > 1 && (
        <View style={{ position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', paddingVertical: 4 }}>
          {imageData.map((_, index) => (
            <View
              key={index}
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: index === activeIndex
                  ? '#f05e23'
                  : (isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)'),
                marginHorizontal: 4,
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  const sameImages = prevProps.images === nextProps.images;
  const sameAutoPlay = prevProps.autoPlay === nextProps.autoPlay;
  const sameBorderRadius = prevProps.borderRadiusClass === nextProps.borderRadiusClass;
  const sameWidth = prevProps.width === nextProps.width;
  const sameHeight = prevProps.height === nextProps.height;
  const samePagination = prevProps.showPagination === nextProps.showPagination;

  const sameSwipe = prevProps.enableSwipe === nextProps.enableSwipe;
  return sameImages && sameAutoPlay && sameBorderRadius && sameWidth && sameHeight && samePagination && sameSwipe;
});

ImageCarousel.displayName = 'ImageCarousel';
