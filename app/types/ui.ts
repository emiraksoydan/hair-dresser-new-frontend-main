/**
 * UI component prop types
 */

export type SearchBarProps = {
  searchQuery: string;
  setSearchQuery: (text: string) => void;
};

export type FormatListButtonProps = {
  isList: boolean;
  setIsList: (control: boolean) => void;
};

export type OnPressProps = {
  onPress?: () => void;
};

export type EmptyStateProps = {
  loading: boolean;
  locationStatus: import('./location').LocationStatus;
  hasLocation: boolean;
  fetchedOnce: boolean;
  hasData: boolean;
  noResultText: string;
  needLocationText?: string;
  deniedText?: string;
  onRetry?: () => void;
};

