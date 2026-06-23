export enum SocialProfileOwnerType {
  Customer = 0,
  FreeBarber = 1,
  BarberStore = 2,
}

export enum SocialDmPolicy {
  Everyone = 0,
  FollowersOnly = 1,
}

export enum SocialPostType {
  Photo = 0,
  Carousel = 1,
  Video = 2,
  Reel = 3,
}

export enum SocialLikeTargetType {
  Post = 0,
  Comment = 1,
  Story = 2,
}

export interface SocialProfileSearchResultDto extends SocialProfileDto {
  distanceKm?: number | null;
}

export interface SocialProfileDto {
  id: string;
  ownerType: SocialProfileOwnerType;
  ownerId: string;
  userId: string;
  username: string;
  bio?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  dmPolicy?: SocialDmPolicy;
  hasActiveStory?: boolean;
  isMuted?: boolean;
  mutualFollowerCount?: number;
  isAvailable?: boolean | null;
  totalPostViews?: number | null;
  highlightCount?: number | null;
  reelCount?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  /** Backend alanı; gizli profil özelliği kullanılmıyor, her zaman false döner. */
  isPrivate: boolean;
  postCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isOwnProfile: boolean;
  ownerDisplayName?: string | null;
  ownerNumber?: string | null;
  ownerBarberType?: number | null;
  externalUrl?: string | null;
  averageRating?: number | null;
  ratingCount?: number | null;
  distanceKm?: number | null;
}

export interface SocialPostMediaDto {
  id: string;
  sortOrder: number;
  mediaUrl: string;
  thumbnailUrl?: string | null;
  durationSec?: number | null;
}

export interface SocialPostDto {
  id: string;
  profileId: string;
  profile: SocialProfileDto;
  caption?: string | null;
  type: SocialPostType;
  media: SocialPostMediaDto[];
  viewCount: number;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved: boolean;
  isOwnPost: boolean;
  isPinned?: boolean;
  pinnedAt?: string | null;
  createdAt: string;
  savedAt?: string | null;
  savedEntryId?: string | null;
}

export interface SocialStoryDto {
  id: string;
  profileId: string;
  mediaUrl: string;
  thumbnailUrl?: string | null;
  durationSec?: number | null;
  expiresAt: string;
  createdAt: string;
  isOwnStory: boolean;
  viewCount?: number | null;
  likeCount?: number;
  isLiked?: boolean;
}

export interface SocialStoryViewerDto {
  viewId: string;
  profile: SocialProfileDto;
  viewedAt: string;
  isLiked: boolean;
}

export interface SocialStoryGroupDto {
  profile: SocialProfileDto;
  stories: SocialStoryDto[];
  hasUnviewed: boolean;
}

export interface SocialStoryHighlightDto {
  id: string;
  profileId: string;
  title: string;
  coverUrl?: string | null;
  itemCount: number;
  sortOrder: number;
  createdAt: string;
}

export interface SocialStoryHighlightItemDto {
  id: string;
  sourceStoryId?: string | null;
  mediaUrl: string;
  thumbnailUrl?: string | null;
  durationSec?: number | null;
  sortOrder: number;
  createdAt: string;
}

export interface SocialStoryHighlightDetailDto extends SocialStoryHighlightDto {
  items: SocialStoryHighlightItemDto[];
}

export interface SocialFollowListItemDto {
  followId: string;
  followedAt: string;
  profile: SocialProfileDto;
}

/** GET /social/config/limits — backend SocialMediaLimits */
export interface SocialLimitsDto {
  storyVideoMaxDurationSec: number;
  storyLifetimeHours: number;
  postVideoMaxDurationSec: number;
  postCarouselMaxImages: number;
  highlightMaxItemsPerHighlight: number;
  commentMaxLength: number;
  freeTierMaxStoryPublications?: number;
  maxPinnedPostsPerProfile?: number;
}

export interface SocialFreeTierUsageDto {
  appliesLimits: boolean;
  storyDailyLimit: number;
  storyUsedToday: number;
  storyRemainingToday: number;
  highlightDailyLimit: number;
  highlightUsedToday: number;
  highlightRemainingToday: number;
  photoDailyLimit: number;
  photoUsedToday: number;
  photoRemainingToday: number;
  carouselDailyLimit: number;
  carouselUsedToday: number;
  carouselRemainingToday: number;
  videoDailyLimit: number;
  videoUsedToday: number;
  videoRemainingToday: number;
  reelDailyLimit: number;
  reelUsedToday: number;
  reelRemainingToday: number;
  maxPinnedPosts: number;
}

export interface SocialCommentDto {
  id: string;
  postId: string;
  profile: SocialProfileDto;
  parentCommentId?: string | null;
  text: string;
  likeCount: number;
  replyCount: number;
  isLiked: boolean;
  createdAt: string;
}

export enum SocialArchivedKind {
  Post = 0,
  Story = 1,
  Highlight = 2,
  HighlightItem = 3,
}

export interface SocialArchivedItemDto {
  kind: SocialArchivedKind;
  id: string;
  parentId?: string | null;
  parentTitle?: string | null;
  title?: string | null;
  thumbUrl?: string | null;
  postType?: SocialPostType;
  removedAt: string;
}

export interface SocialArchivedContentDto {
  items: SocialArchivedItemDto[];
}

export interface SocialRestoreArchivedRequest {
  kind: SocialArchivedKind;
  id: string;
  parentId?: string | null;
}
