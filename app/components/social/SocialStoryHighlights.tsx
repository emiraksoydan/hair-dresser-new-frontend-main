import React, { useCallback, useMemo, useState } from 'react';

import { useSafeNavigation } from '../../hook/useSafeNavigation';

import { View, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';

import { SOCIAL_ACCENT } from '../../constants/socialTheme';

import { Icon } from 'react-native-paper';



import { Text } from '../common/Text';

import { useTheme } from '../../hook/useTheme';

import { useLanguage } from '../../hook/useLanguage';

import { useGetSocialStoryHighlightsQuery,

  useLazyGetSocialStoryHighlightDetailQuery,

  useRemoveSocialStoryHighlightItemMutation,

} from '../../store/api';

import type { SocialProfileDto, SocialStoryGroupDto } from '../../types/social';

import { SocialStoryViewer } from './SocialStoryViewer';

import { useStoryViews } from '../../hook/useStoryViews';

import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';

import { useAlert } from '../../hook/useAlert';

import { showSnack } from '../../store/snackbarSlice';

import { useAppDispatch } from '../../store/hook';



const RING = 52;

const INNER = 44;

const ITEM_W = 62;

const GAP = 8;



type Props = {

  profile: SocialProfileDto;

  /** Parent handles horizontal inset; default 0 aligns with section title */

  contentPaddingHorizontal?: number;

};



export const SocialStoryHighlights: React.FC<Props> = ({

  profile,

  contentPaddingHorizontal = 0,

}) => {

  const { colors, isDark } = useTheme();

  const { t } = useLanguage();

  const router = useSafeNavigation();

  const { confirm } = useAlert();

  const dispatch = useAppDispatch();

  const { data: highlights, isLoading } = useGetSocialStoryHighlightsQuery(profile.id);

  const [fetchDetail, { isFetching: loadingDetail }] = useLazyGetSocialStoryHighlightDetailQuery();

  const [removeHighlightItem, { isLoading: removingHighlightItem }] = useRemoveSocialStoryHighlightItemMutation();

  const { markViewed } = useStoryViews();

  const { activeProfileId } = useActiveSocialProfile();

  const canManage = profile.id === activeProfileId;

  const [viewerOpen, setViewerOpen] = useState(false);

  const [viewerGroup, setViewerGroup] = useState<SocialStoryGroupDto | null>(null);

  const [viewingHighlightId, setViewingHighlightId] = useState<string | null>(null);



  const list = highlights ?? [];

  const showNew = canManage;



  const goToEdit = useCallback(

    (highlightId: string) => {

      router.push({

        pathname: '/(screens)/social/edit-highlight',

        params: { highlightId },

      } as never);

    },

    [router],

  );



  const openHighlight = useCallback(

    async (highlightId: string) => {

      try {

        const detail = await fetchDetail(highlightId).unwrap();

        if (!detail?.items?.length) {

          if (canManage) goToEdit(highlightId);

          return;

        }

        setViewerGroup({

          profile,

          hasUnviewed: false,

          stories: detail.items.map((item) => ({

            id: item.id,

            profileId: profile.id,

            mediaUrl: item.mediaUrl,

            thumbnailUrl: item.thumbnailUrl,

            durationSec: item.durationSec,

            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),

            createdAt: item.createdAt,

            isOwnStory: canManage,

          })),

        });

        setViewingHighlightId(highlightId);

        setViewerOpen(true);

      } catch {

        // ignore

      }

    },

    [fetchDetail, profile, goToEdit],

  );



  const handleRemoveHighlightStory = useCallback(

    (itemId: string) => {

      if (!viewingHighlightId || !canManage) return;

      confirm(

        t('social.removeHighlightItemTitle'),

        t('social.removeHighlightItemMessage'),

        async () => {

          try {

            const res = await removeHighlightItem({ highlightId: viewingHighlightId, itemId }).unwrap();

            if (res?.success) {

              dispatch(showSnack({ message: t('social.highlightItemRemoved'), isError: false }));

              setViewerGroup((prev) => {

                if (!prev) return null;

                const nextStories = prev.stories.filter((s) => s.id !== itemId);

                if (nextStories.length === 0) {

                  setViewerOpen(false);

                  setViewingHighlightId(null);

                  return null;

                }

                return { ...prev, stories: nextStories };

              });

            }

          } catch {

            dispatch(showSnack({ message: t('social.highlightFailed'), isError: true }));

          }

        },

        undefined,

        t('social.remove'),

        t('common.cancel'),

      );

    },

    [viewingHighlightId, canManage, confirm, removeHighlightItem, dispatch, t],

  );



  const ringStyle = useMemo(

    () => ({

      borderColor: isDark ? '#6b7280' : '#9ca3af',

      bg: isDark ? '#374151' : '#e5e7eb',

    }),

    [isDark],

  );



  if (!showNew && list.length === 0 && !isLoading) return null;



  return (

    <>

      <ScrollView

        horizontal

        showsHorizontalScrollIndicator={false}

        contentContainerStyle={{

          paddingHorizontal: contentPaddingHorizontal,

          paddingVertical: 6,

          gap: GAP,

        }}

      >

        {showNew && (

          <TouchableOpacity

            onPress={() =>

              router.push({

                pathname: '/(screens)/social/create-highlight',

                params: { profileId: profile.id },

              } as any)

            }

            style={{ alignItems: 'center', width: ITEM_W }}

          >

            <View

              style={{

                width: RING,

                height: RING,

                borderRadius: RING / 2,

                borderWidth: 1.5,

                borderColor: ringStyle.borderColor,

                alignItems: 'center',

                justifyContent: 'center',

                backgroundColor: ringStyle.bg,

              }}

            >

              <Icon source="plus" size={22} color={colors.headerText} />

            </View>

            <Text

              numberOfLines={1}

              style={{ marginTop: 4, fontSize: 10, color: colors.textSecondary, maxWidth: ITEM_W, textAlign: 'center' }}

            >

              {t('social.newHighlight')}

            </Text>

          </TouchableOpacity>

        )}



        {isLoading && list.length === 0 ? (

          <ActivityIndicator color={SOCIAL_ACCENT} style={{ marginTop: 16 }} />

        ) : (

          list.map((h) => (

            <View key={h.id} style={{ alignItems: 'center', width: ITEM_W }}>

              <TouchableOpacity

                onPress={() => openHighlight(h.id)}

                disabled={loadingDetail}

                activeOpacity={0.85}

              >

                <View

                  style={{

                    width: RING,

                    height: RING,

                    borderRadius: RING / 2,

                    borderWidth: 1.5,

                    borderColor: ringStyle.borderColor,

                    padding: 2,

                    alignItems: 'center',

                    justifyContent: 'center',

                  }}

                >

                  <View

                    style={{

                      width: INNER,

                      height: INNER,

                      borderRadius: INNER / 2,

                      backgroundColor: ringStyle.bg,

                      overflow: 'hidden',

                      alignItems: 'center',

                      justifyContent: 'center',

                    }}

                  >

                    {h.coverUrl ? (

                      <Image source={{ uri: h.coverUrl }} style={{ width: INNER, height: INNER }} />

                    ) : (

                      <Icon source="image-outline" size={18} color={colors.headerText} />

                    )}

                  </View>

                </View>

              </TouchableOpacity>



              {canManage ? (

                <TouchableOpacity

                  onPress={() => goToEdit(h.id)}

                  hitSlop={6}

                  style={{

                    position: 'absolute',

                    top: 0,

                    right: 4,

                    width: 20,

                    height: 20,

                    borderRadius: 10,

                    backgroundColor: SOCIAL_ACCENT,

                    alignItems: 'center',

                    justifyContent: 'center',

                    borderWidth: 1.5,

                    borderColor: colors.screenBg,

                  }}

                  accessibilityLabel={t('social.editHighlight')}

                >

                  <Icon source="pencil" size={11} color="#fff" />

                </TouchableOpacity>

              ) : null}



              <Text

                numberOfLines={2}

                style={{ marginTop: 4, fontSize: 10, color: colors.textSecondary, maxWidth: ITEM_W, textAlign: 'center' }}

              >

                {h.title}

              </Text>

            </View>

          ))

        )}

      </ScrollView>



      {viewerGroup && (

        <SocialStoryViewer

          visible={viewerOpen}

          groups={[viewerGroup]}

          startGroupIndex={0}

          viewerProfileId={activeProfileId}

          onClose={() => {

            setViewerOpen(false);

            setViewerGroup(null);

            setViewingHighlightId(null);

          }}

          onViewed={markViewed}

          highlightContext={

            canManage && viewingHighlightId

              ? {

                  highlightId: viewingHighlightId,

                  onRemoveItem: handleRemoveHighlightStory,

                  removing: removingHighlightItem,

                }

              : undefined

          }

        />

      )}

    </>

  );

};

