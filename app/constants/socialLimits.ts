/** Backend `SocialMediaLimits.cs` ile senkron fallback — tercih: GET /social/config/limits */
export interface SocialLimitsConfig {
  storyVideoMaxDurationSec: number;
  storyLifetimeHours: number;
  postVideoMaxDurationSec: number;
  postCarouselMaxImages: number;
  highlightMaxItemsPerHighlight: number;
  commentMaxLength: number;
  freeTierMaxStoryPublications?: number;
  maxPinnedPostsPerProfile?: number;
}

export const DEFAULT_SOCIAL_LIMITS: SocialLimitsConfig = {
  storyVideoMaxDurationSec: 15,
  storyLifetimeHours: 24,
  postVideoMaxDurationSec: 60,
  postCarouselMaxImages: 10,
  highlightMaxItemsPerHighlight: 100,
  commentMaxLength: 2200,
};
/** @deprecated getSocialLimits().storyVideoMaxDurationSec kullanın */
export const MAX_SOCIAL_STORY_VIDEO_SEC = DEFAULT_SOCIAL_LIMITS.storyVideoMaxDurationSec;
/** @deprecated getSocialLimits().postVideoMaxDurationSec kullanın */
export const MAX_SOCIAL_POST_VIDEO_SEC = DEFAULT_SOCIAL_LIMITS.postVideoMaxDurationSec;
/** @deprecated getSocialLimits().postCarouselMaxImages kullanın */
export const MAX_SOCIAL_CAROUSEL = DEFAULT_SOCIAL_LIMITS.postCarouselMaxImages;
