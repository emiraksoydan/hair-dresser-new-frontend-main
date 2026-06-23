import {
  DEFAULT_SOCIAL_LIMITS,
  type SocialLimitsConfig,
} from '../../constants/socialLimits';

let active: SocialLimitsConfig = { ...DEFAULT_SOCIAL_LIMITS };

export function applySocialLimitsFromApi(next: Partial<SocialLimitsConfig>) {
  active = { ...DEFAULT_SOCIAL_LIMITS, ...next };
}

export function getSocialLimits(): Readonly<SocialLimitsConfig> {
  return active;
}
