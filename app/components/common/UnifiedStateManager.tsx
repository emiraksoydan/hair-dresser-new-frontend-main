import React from "react";
import { View, ActivityIndicator, TouchableOpacity } from "react-native";
import { Text } from "./Text";
import { LottieViewComponent } from "./lottieview";
import { useLanguage } from "../../hook/useLanguage";
import { useTheme } from "../../hook/useTheme";
import { LocationStatus } from "../../types";

export type StateType =
  | "loading"
  | "error"
  | "empty"
  | "location-denied"
  | "location-unavailable"
  | "network-error"
  | "service-unavailable";

export interface UnifiedStateProps {
  state: StateType;
  message?: string;
  onRetry?: () => void;
  showRetryButton?: boolean;
  customAnimation?: any;
  loading?: boolean;
  locationStatus?: LocationStatus;
  hasData?: boolean;
  fetchedOnce?: boolean;
  error?: any;
}

interface StateConfig {
  animation: any;
  defaultMessage: string;
  showRetry: boolean;
}

const stateConfigurations: Record<StateType, StateConfig> = {
  loading: {
    animation: null,
    defaultMessage: "common.loading",
    showRetry: false,
  },
  error: {
    animation: require("../../../assets/animations/error.json"),
    defaultMessage: "error.general",
    showRetry: true,
  },
  empty: {
    animation: require("../../../assets/animations/empty.json"),
    defaultMessage: "empty.noResultsFound",
    showRetry: false,
  },
  "location-denied": {
    animation: require("../../../assets/animations/Location.json"),
    defaultMessage: "location.permissionDeniedSettings",
    showRetry: true,
  },
  "location-unavailable": {
    animation: require("../../../assets/animations/Location.json"),
    defaultMessage: "location.unavailable",
    showRetry: true,
  },
  "network-error": {
    animation: require("../../../assets/animations/error.json"),
    defaultMessage: "error.network",
    showRetry: true,
  },
  "service-unavailable": {
    animation: require("../../../assets/animations/error.json"),
    defaultMessage: "error.serviceUnavailable",
    showRetry: true,
  },
};

export const UnifiedStateManager: React.FC<UnifiedStateProps> = ({
  state,
  message,
  onRetry,
  showRetryButton = true,
  customAnimation,
  loading = false,
  locationStatus,
  hasData = false,
  fetchedOnce = false,
  error,
}) => {
  const { t } = useLanguage();
  const { colors } = useTheme();

  // Auto-determine state from props if not explicitly provided
  const determineState = (): StateType => {
    if (loading && !fetchedOnce) return "loading";
    if (locationStatus === "denied") return "location-denied";
    if (locationStatus === "unknown") return "location-unavailable";
    if (error) {
      // getErrorType fonksiyonunu kullan - tüm hata türlerini doğru şekilde handle eder
      return getErrorType(error);
    }
    if (fetchedOnce && !hasData) return "empty";
    return state;
  };

  const currentState = determineState();
  const config = stateConfigurations[currentState];

  // Don't render anything if no state to show
  if (!currentState || (currentState === "loading" && fetchedOnce)) {
    return null;
  }

  // Loading state - show spinner
  if (currentState === "loading") {
    return (
      <View className="flex-1 items-center justify-center py-8">
        <ActivityIndicator size="large" color="#c2a523" />
      </View>
    );
  }

  const displayMessage = message || t(config.defaultMessage);
  const animationSource = customAnimation || config.animation;
  const shouldShowRetry = showRetryButton && config.showRetry && onRetry;

  return (
    <View className="flex-1 items-center justify-start py-4 px-2">
      <View style={{ backgroundColor: colors.cardBg }} className="rounded-2xl p-6 items-center w-full">
        <LottieViewComponent
          animationSource={animationSource}
          message={displayMessage}
          animationSize={120}
        />
        {shouldShowRetry && (
          <View className="mt-4">
            <TouchableOpacity
              onPress={onRetry}
              className="bg-[#c2a523] px-6 py-2 rounded-lg"
              activeOpacity={0.8}
            >
              <Text className="text-white font-medium">{t("common.retry")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

// Helper function to determine error type from API error
export const getErrorType = (error: any): StateType => {
  if (!error) return "error";

  const status = error.status;
  const message = error?.data?.message || error?.message || '';

  // RTK Query string status types - bunlar network/timeout hatalarını gösterir
  if (
    status === 'FETCH_ERROR' ||
    status === 'TIMEOUT_ERROR' ||
    status === 'PARSING_ERROR' ||
    status === 'CUSTOM_ERROR'
  ) {
    return "service-unavailable";
  }

  // Network connectivity issues (numeric status)
  if (status === 0 || status === null || status === undefined) {
    return "service-unavailable";
  }

  // Server errors (5xx)
  if (typeof status === 'number' && status >= 500) {
    return "service-unavailable";
  }

  // Mesaj içeriğine göre kontrol
  if (
    message?.toLowerCase().includes('network') ||
    message?.toLowerCase().includes('timeout') ||
    message?.toLowerCase().includes('ulaşılamadı') ||
    message?.toLowerCase().includes('unavailable') ||
    message?.toLowerCase().includes('sunucu')
  ) {
    return "service-unavailable";
  }

  // Client errors (400-499) are generally application errors
  return "error";
};

// Hook for unified state management
export const useUnifiedState = (props: {
  loading: boolean;
  error?: any;
  data?: any[];
  locationStatus?: LocationStatus;
  fetchedOnce?: boolean;
}) => {
  const { loading, error, data, locationStatus, fetchedOnce } = props;

  const hasData = Array.isArray(data) ? data.length > 0 : !!data;

  let state: StateType | null = null;

  if (loading && !fetchedOnce) {
    state = "loading";
  } else if (locationStatus === "denied") {
    state = "location-denied";
  } else if (locationStatus === "unknown") {
    state = "location-unavailable";
  } else if (error) {
    state = getErrorType(error);
  } else if (fetchedOnce && !hasData) {
    state = "empty";
  }

  return {
    shouldShowState: !!state,
    state,
    hasData,
  };
};

// Component wrapper for easy usage
export interface UnifiedStateWrapperProps {
  loading: boolean;
  error?: any;
  data?: any[];
  locationStatus?: LocationStatus;
  fetchedOnce?: boolean;
  onRetry?: () => void;
  customMessages?: Partial<Record<StateType, string>>;
  customAnimations?: Partial<Record<StateType, any>>;
  children: React.ReactNode;
}

export const UnifiedStateWrapper: React.FC<UnifiedStateWrapperProps> = ({
  loading,
  error,
  data,
  locationStatus,
  fetchedOnce = false,
  onRetry,
  customMessages = {},
  customAnimations = {},
  children,
}) => {
  const { shouldShowState, state } = useUnifiedState({
    loading,
    error,
    data,
    locationStatus,
    fetchedOnce,
  });

  if (shouldShowState && state) {
    return (
      <UnifiedStateManager
        state={state}
        message={customMessages[state]}
        customAnimation={customAnimations[state]}
        onRetry={onRetry}
        loading={loading}
        locationStatus={locationStatus}
        hasData={Array.isArray(data) ? data.length > 0 : !!data}
        fetchedOnce={fetchedOnce}
        error={error}
      />
    );
  }

  return <>{children}</>;
};
