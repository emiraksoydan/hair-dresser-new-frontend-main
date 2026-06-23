import React, { useCallback, useMemo, useState } from 'react';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import {
  View,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
  Dimensions,
} from 'react-native';

import { SOCIAL_ACCENT } from '../../constants/socialTheme';
import type { SocialPostDto } from '../../types/social';
import { SocialPostType } from '../../types/social';
import {
  splitDiscoverMasonry,
  pickActiveDiscoverPlayId,
  type DiscoverMasonryColumnItem,
} from '../../utils/social/socialDiscoverGrid';
import { SocialDiscoverGridTile } from './SocialDiscoverGridTile';

type Props = {
  posts: SocialPostDto[];
  loading?: boolean;
  loadingMore?: boolean;
  onEndReached?: () => void;
};

const VIEWPORT_H = Dimensions.get('window').height;

export const SocialDiscoverMasonryGrid: React.FC<Props> = ({
  posts,
  loading,
  loadingMore,
  onEndReached,
}) => {
  const router = useSafeNavigation();
  const [scrollY, setScrollY] = useState(0);

  const masonry = useMemo(() => splitDiscoverMasonry(posts), [posts]);
  const allItems = useMemo(
    () => [...masonry.left, ...masonry.right],
    [masonry.left, masonry.right],
  );

  const activePlayId = useMemo(
    () => pickActiveDiscoverPlayId(allItems, scrollY, VIEWPORT_H),
    [allItems, scrollY],
  );

  const openPost = useCallback(
    (post: SocialPostDto) => {
      if (post.type === SocialPostType.Reel) {
        router.push({
          pathname: '/(screens)/social/reel-view',
          params: { postId: post.id },
        } as any);
        return;
      }
      router.push({
        pathname: '/(screens)/social/post-detail',
        params: { postId: post.id },
      } as any);
    },
    [router],
  );

  const renderColumn = useCallback(
    (items: DiscoverMasonryColumnItem[]) =>
      items.map(({ post, height }) => (
        <SocialDiscoverGridTile
          key={post.id}
          post={post}
          height={height}
          shouldPlay={activePlayId === post.id}
          onPress={() => openPost(post)}
        />
      )),
    [activePlayId, openPost],
  );

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      setScrollY(y);
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 280) {
        onEndReached?.();
      }
    },
    [onEndReached],
  );

  if (loading && posts.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-16">
        <ActivityIndicator color={SOCIAL_ACCENT} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onScroll={handleScroll}
      scrollEventThrottle={32}
      contentContainerStyle={{
        paddingBottom: 100,
        minHeight: masonry.contentHeight,
      }}
    >
      <View className="flex-row">
        <View className="flex-1">{renderColumn(masonry.left)}</View>
        <View className="flex-1">{renderColumn(masonry.right)}</View>
      </View>
      {loadingMore && (
        <View className="py-4 items-center">
          <ActivityIndicator color={SOCIAL_ACCENT} />
        </View>
      )}
    </ScrollView>
  );
};
