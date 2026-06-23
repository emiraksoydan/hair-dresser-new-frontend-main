import React, { useMemo, useState } from 'react';

import { useSafeNavigation } from '../../hook/useSafeNavigation';

import { View, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';



import { SocialEmptyStateCard } from './SocialEmptyStateCard';

import { Text } from '../common/Text';

import { SocialProfileGridTile } from './SocialProfileGridTile';

import { useTheme } from '../../hook/useTheme';

import { useLanguage } from '../../hook/useLanguage';

import type { SocialPostDto } from '../../types/social';

import {
  isSocialPhotoTabType,
  isSocialReelType,
  isSocialVideoType,
  normalizeSocialPostDto,
} from '../../utils/social/normalizeSocialPost';

import { SOCIAL_ACCENT } from '../../constants/socialTheme';

import { SocialUnderlineTabBar } from './SocialUnderlineTabBar';

import { SOCIAL_EMPTY_LOTTIES } from '../../constants/socialAnimations';



const COLS = 3;

const GRID_GAP = 2;

const SCREEN_W = Dimensions.get('window').width;

const TILE = (SCREEN_W - GRID_GAP * (COLS - 1)) / COLS;

const REEL_H = Math.round(TILE * 1.65);



type TabKey = 'posts' | 'videos' | 'reels';



type EmptyMessages = {

  posts: string;

  videos: string;

  reels: string;

};



type Props = {

  posts: SocialPostDto[];

  /** İlk yükleme — grid gizlenir */

  loading?: boolean;

  /** Sayfalama — grid kalır, altta spinner */

  loadingMore?: boolean;

  loadError?: boolean;

  onRetry?: () => void;

  emptyMessages?: EmptyMessages;

};



function chunkRows<T>(list: T[], cols: number): T[][] {

  const rows: T[][] = [];

  for (let i = 0; i < list.length; i += cols) rows.push(list.slice(i, i + cols));

  return rows;

}



export const SocialProfileMediaTabs: React.FC<Props> = ({
  posts,
  loading,
  loadingMore,
  loadError,
  onRetry,
  emptyMessages,
}) => {

  const { isDark } = useTheme();

  const { t } = useLanguage();

  const router = useSafeNavigation();

  const [tab, setTab] = useState<TabKey>('posts');



  const empty = emptyMessages ?? {

    posts: t('social.profilePostsEmpty'),

    videos: t('social.profileVideosEmpty'),

    reels: t('social.profileReelsEmpty'),

  };



  const { photoPosts, videoPosts, reelPosts } = useMemo(() => {

    const photos: SocialPostDto[] = [];

    const videos: SocialPostDto[] = [];

    const reels: SocialPostDto[] = [];

    for (const raw of posts) {
      const p = normalizeSocialPostDto(raw);
      if (!p) continue;
      if (isSocialReelType(p.type)) reels.push(p);
      else if (isSocialVideoType(p.type)) videos.push(p);
      else if (isSocialPhotoTabType(p.type)) photos.push(p);
      else photos.push(p);
    }

    return { photoPosts: photos, videoPosts: videos, reelPosts: reels };

  }, [posts]);



  const activeList =

    tab === 'posts' ? photoPosts : tab === 'videos' ? videoPosts : reelPosts;

  const rows = useMemo(() => chunkRows(activeList, COLS), [activeList]);



  const openPost = (post: SocialPostDto) => {
    if (isSocialReelType(post.type)) {

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

  };



  const tabs: { key: TabKey; icon: string; iconActive: string; label: string }[] = [

    {

      key: 'posts',

      icon: 'view-grid-outline',

      iconActive: 'view-grid',

      label: t('social.profileTabPosts'),

    },

    {

      key: 'videos',

      icon: 'play-circle-outline',

      iconActive: 'play-circle',

      label: t('social.profileTabVideos'),

    },

    {

      key: 'reels',

      icon: 'play-box-outline',

      iconActive: 'play-box',

      label: t('social.profileTabReels'),

    },

  ];



  const emptyMessage =

    tab === 'posts' ? empty.posts : tab === 'videos' ? empty.videos : empty.reels;



  const tileHeight = (post: SocialPostDto) =>
    isSocialReelType(post.type) ? REEL_H : TILE;



  const emptyLottie =

    tab === 'posts'

      ? SOCIAL_EMPTY_LOTTIES.post

      : tab === 'videos'

        ? SOCIAL_EMPTY_LOTTIES.video

        : SOCIAL_EMPTY_LOTTIES.reels;



  return (

    <View className="mt-2">

      <SocialUnderlineTabBar tabs={tabs} activeKey={tab} onChange={setTab} />



      {loading && posts.length === 0 ? (

        <ActivityIndicator className="my-8" color={SOCIAL_ACCENT} />

      ) : loadError ? (
        <TouchableOpacity onPress={onRetry} className="my-8 items-center px-6">
          <Text className="text-center text-sm" style={{ color: isDark ? '#fca5a5' : '#dc2626' }}>
            {t('common.error')}
          </Text>
          <Text className="text-center text-xs mt-2" style={{ color: SOCIAL_ACCENT }}>
            {t('common.retry')}
          </Text>
        </TouchableOpacity>

      ) : rows.length === 0 ? (

        <SocialEmptyStateCard

          animationSource={emptyLottie}

          message={emptyMessage}

          animationSize={120}

          animationKey={`social-profile-${tab}-empty`}

        />

      ) : (

        <View style={{ gap: GRID_GAP }}>

          {rows.map((row, rowIdx) => (

            <View key={rowIdx} style={{ flexDirection: 'row', gap: GRID_GAP }}>

              {row.map((post, colIdx) => {
                const h = tileHeight(post);
                return (
                  <SocialProfileGridTile
                    key={post.id ?? `${rowIdx}-${colIdx}`}
                    post={post}
                    width={TILE}
                    height={h}
                    isDark={isDark}
                    onPress={() => openPost(post)}
                  />
                );
              })}

            </View>

          ))}

        </View>

      )}

      {loadingMore ? <ActivityIndicator className="my-4" color={SOCIAL_ACCENT} /> : null}

    </View>

  );

};

