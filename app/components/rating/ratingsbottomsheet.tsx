import { Icon } from "react-native-paper";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Text } from "../common/Text";
import { BottomSheetView, BottomSheetFlatList } from "@gorhom/bottom-sheet";

import { api, useGetRatingsByTargetQuery } from "../../store/api";
import { useAppDispatch } from "../../store/hook";
import { RatingGetDto, UserType, BarberType } from "../../types";
import { useAuth } from "../../hook/useAuth";
import { useLanguage } from "../../hook/useLanguage";
import { getBarberTypeName } from "../../utils/store/barber-type";
import { useTheme } from "../../hook/useTheme";
import { getErrorMessage } from "../../utils/errorHandler";
import { COLORS, getTextOnGold, getStarRatingWidgetProps } from "../../constants/colors";
import { ThemedStarIcon } from "../common/ThemedStarIcon";

const GOLD = COLORS.UI.ACCENT_GOLD;

const RATINGS_PAGE_SIZE = 30;
/** RN `onEndReached` ilk layout'ta yanlış tetiklenebilir — footer spinner flash'ını önler. */
const RATINGS_END_REACHED_GRACE_MS = 450;

type RatingsBottomSheetProps = {
  targetId: string;
  targetName: string;
  onClose: () => void;
};

export const RatingsBottomSheet: React.FC<RatingsBottomSheetProps> = ({
  targetId,
  targetName,
  onClose,
}) => {
  const { userId } = useAuth();
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const onGoldFg = getTextOnGold(isDark);
  const dispatch = useAppDispatch();

  // Query'yi normal şekilde çalıştır - sheet açıldığında component mount olur ve query otomatik tetiklenir
  const {
    data: ratings,
    isLoading,
    isError,
    error: ratingsQueryError,
    refetch,
  } = useGetRatingsByTargetQuery(
    { targetId, limit: RATINGS_PAGE_SIZE },
    { skip: !targetId },
  );

  // Infinite scroll state
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const hasMoreRef = useRef(true);
  const lastLoadedBeforeRef = useRef<string | null>(null);
  const suppressEndReachedUntilMsRef = useRef(0);
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<
    number | null
  >(null); // null = Hepsi
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  const bumpEndReachedGrace = useCallback(() => {
    suppressEndReachedUntilMsRef.current = Date.now() + RATINGS_END_REACHED_GRACE_MS;
  }, []);

  useEffect(() => {
    bumpEndReachedGrace();
  }, [bumpEndReachedGrace]);

  // Başka işletme / hedef seçildiğinde filtre ve sayfalama state'ini sıfırla
  useEffect(() => {
    setShowOnlyMine(false);
    setSelectedRatingFilter(null);
    hasMoreRef.current = true;
    lastLoadedBeforeRef.current = null;
    bumpEndReachedGrace();
  }, [targetId, bumpEndReachedGrace]);

  // Filtre değişince RN FlatList bazen hemen onEndReached tetikler — hayalet sayfalama isteğini kes
  useEffect(() => {
    bumpEndReachedGrace();
  }, [showOnlyMine, selectedRatingFilter, bumpEndReachedGrace]);

  const loadOlderRatings = useCallback(async () => {
    if (!targetId) return;
    if (Date.now() < suppressEndReachedUntilMsRef.current) return;
    if (isLoadingOlder || !hasMoreRef.current) return;
    if (!ratings || ratings.length === 0) return;

    // En eski rating'in (CreatedAt, Id) çifti cursor — tie-breaker için beforeId.
    const oldest = ratings[ratings.length - 1];
    const before = oldest?.createdAt;
    const beforeId = oldest?.id;
    if (!before) return;

    // Aynı cursor'u tekrar fetch etme (onEndReached double-fire guard).
    const cursorKey = `${before}|${beforeId ?? ""}`;
    if (lastLoadedBeforeRef.current === cursorKey) return;
    lastLoadedBeforeRef.current = cursorKey;

    setIsLoadingOlder(true);
    try {
      const result = await dispatch(
        api.endpoints.getRatingsByTarget.initiate(
          { targetId, before, beforeId, limit: RATINGS_PAGE_SIZE },
          // subscribe:false ÖNEMLİ — initiate default'ta yeni subscriber yaratır ve
          // unwrap edilse bile unsubscribe etmez. Her sayfa scroll'unda yeni anonim
          // subscriber birikir; mutation invalidate ettiğinde hepsi refetch tetikler
          // (ekstra ağ + memory leak). Sadece bir-defalık fetch + cache merge istiyoruz.
          { subscribe: false, forceRefetch: true },
        ),
      ).unwrap();
      // Daha az sayfa geldiyse sona ulaşıldı.
      if (!Array.isArray(result) || result.length < RATINGS_PAGE_SIZE) {
        hasMoreRef.current = false;
      }
    } catch {
      // Ağ hatası — bir sonraki denemeye kadar bu cursor'u tekrar kullanılabilir kıl.
      lastLoadedBeforeRef.current = null;
    } finally {
      setIsLoadingOlder(false);
    }
  }, [dispatch, targetId, ratings, isLoadingOlder]);

  const handleRefresh = useCallback(() => {
    bumpEndReachedGrace();
    hasMoreRef.current = true;
    lastLoadedBeforeRef.current = null;
    refetch();
  }, [refetch, bumpEndReachedGrace]);

  const safeRatings = Array.isArray(ratings) ? ratings : [];

  // useMemo'dan ÖNCE tanımlanmalı — aksi halde "Benim yorumlarım" filtresinde isMyRating undefined kalır
  const isMyRating = useCallback((rating: RatingGetDto) => {
    if (!rating.ratedFromId || !userId) return false;
    return rating.ratedFromId === userId;
  }, [userId]);

  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch {
      return dateStr;
    }
  };

  // Filtrelenmiş yorumlar
  const filteredRatings = useMemo(() => {
    if (!Array.isArray(safeRatings)) return [];
    let result = safeRatings;
    if (showOnlyMine) result = result.filter((r: RatingGetDto) => isMyRating(r));
    if (selectedRatingFilter !== null) result = result.filter((r: RatingGetDto) => Math.round(r.score) === selectedRatingFilter);
    return result;
  }, [safeRatings, selectedRatingFilter, showOnlyMine, isMyRating]);

  // UserType ve BarberType'a göre görünen isim
  const getDisplayName = (rating: RatingGetDto) => {
    return rating.ratedFromName || t("favorites.unknown");
  };

  const renderRatingItem = ({ item }: { item: RatingGetDto }) => {
    const isMyComment = isMyRating(item);
    const displayName = getDisplayName(item);
    const imageUrl = item.ratedFromImage;
    const roundedScore = Math.round(item.score);
    const starProps = getStarRatingWidgetProps(isDark);

    return (
      <View className="mb-4">
        {/* Üst kısım: Kullanıcı bilgileri */}
        <View className="flex-row items-start">
          {/* Profil fotoğrafı */}
          <View className="relative mr-3 mt-1">
            <Image
              source={
                imageUrl
                  ? { uri: imageUrl }
                  : require("../../../assets/images/empty.png")
              }
              className="w-12 h-12 rounded-full"
              resizeMode="cover"
            />
            {/* "Sizin yorumunuz" badge */}
            {isMyComment && (
              <View
                className="absolute -top-1 -right-1 rounded-full px-1.5 py-0.5"
                style={{ backgroundColor: GOLD }}
              >
                <Text className="text-[8px] font-bold" style={{ color: onGoldFg }}>
                  {t("rating.yourBadge")}
                </Text>
              </View>
            )}
          </View>

          {/* Kullanıcı bilgileri ve tarih */}
          <View className="flex-1 mr-2">
            <View className="flex-row items-center gap-2 flex-wrap mb-1">
              <Text
                className="font-century-gothic-bold text-base"
                style={{ color: colors.sectionHeaderText }}
                numberOfLines={1}
              >
                {displayName}
              </Text>
              {/* UserType badge - backend'den gelen veri */}
              {item.ratedFromUserType !== null &&
                item.ratedFromUserType !== undefined && (
                  <View
                    className="rounded-full px-2 py-0.5"
                    style={{
                      backgroundColor: isDark ? "rgba(250, 204, 21, 0.18)" : GOLD,
                      borderWidth: 1,
                      borderColor: isDark ? "rgba(250, 204, 21, 0.4)" : GOLD,
                    }}
                  >
                    <Text
                      className="text-[10px] font-century-gothic-bold"
                      style={{ color: onGoldFg }}
                    >
                      {item.ratedFromUserType === UserType.Customer
                        ? t("card.customer")
                        : item.ratedFromUserType === UserType.FreeBarber
                          ? t("labels.freeBarber")
                          : item.ratedFromUserType === UserType.BarberStore
                            ? t("labels.store")
                            : ""}
                    </Text>
                  </View>
                )}
              {/* BarberType badge - FreeBarber veya Store için */}
              {item.ratedFromBarberType !== null &&
                item.ratedFromBarberType !== undefined && (
                  <View
                    className="rounded-full px-2 py-0.5"
                    style={{
                      backgroundColor: "rgba(59, 130, 246, 0.16)",
                      borderWidth: 1,
                      borderColor: "rgba(59, 130, 246, 0.36)",
                    }}
                  >
                    <Text
                      className="text-[10px] font-century-gothic-bold"
                      style={{ color: "#1e40af" }}
                    >
                      {getBarberTypeName(item.ratedFromBarberType)}
                    </Text>
                  </View>
                )}
            </View>
            <Text
              style={{ color: colors.sectionHeaderText, opacity: 0.7 }}
              className="text-xs font-century-gothic-bold"
            >
              {formatDateTime(item.createdAt)}
            </Text>
            {/* Yorum metni */}

            {item.comment && (
              <View className="mt-2">
                <Text className="text-sm font-century-gothic leading-5" style={{ color: colors.sectionHeaderText }}>
                  {item.comment}
                </Text>
              </View>
            )}
          </View>

          {/* Rating badge - sağ tarafta */}
          <View
            style={{ backgroundColor: GOLD, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, alignItems: "center", justifyContent: "center" }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
              <ThemedStarIcon size={14} color={starProps.color} type="full" index={0} />
              <Text style={{ fontSize: 11, fontFamily: "CenturyGothic-Bold", color: onGoldFg }}>
                {roundedScore}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const ratingFilters = [
    { label: t("rating.all"), value: null },
    { value: 5 },
    { value: 4 },
    { value: 3 },
    { value: 2 },
    { value: 1 },
  ] as { label?: string; value: number | null }[];

  return (
    <BottomSheetView style={{ flex: 1, backgroundColor: colors.sheetBg }}>
      {/* Header */}
      <View className="px-4 pt-4 pb-3">
        <Text className="font-century-gothic-bold text-xl mb-4" style={{ color: colors.sectionHeaderText }}>
          {t("card.reviews")}
        </Text>

        {/* Benim Yorumlarım + (filtre açıkken) görsel geri — tüm yorumlara dön */}
        {!isLoading && safeRatings.length > 0 && (
          <View className="flex-row items-center gap-2 mb-3 flex-wrap">
            {showOnlyMine && (
              <TouchableOpacity
                onPress={() => {
                  bumpEndReachedGrace();
                  setShowOnlyMine(false);
                }}
                className="flex-row items-center gap-1 rounded-full px-2.5 py-1.5 bg-transparent"
                style={{ borderWidth: 1, borderColor: GOLD }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t("rating.all")}
              >
                <Icon source="arrow-left" size={16} color={onGoldFg} />
                <Text className="text-xs font-semibold" style={{ color: onGoldFg }}>{t("rating.all")}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setShowOnlyMine(v => !v)}
              className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
              style={
                showOnlyMine
                  ? { backgroundColor: GOLD }
                  : { borderWidth: 1, borderColor: GOLD, backgroundColor: 'transparent' }
              }
              activeOpacity={0.8}
              accessibilityState={{ selected: showOnlyMine }}
            >
              <Icon source="account-heart" size={14} color={onGoldFg} />
              <Text className="text-xs font-semibold" style={{ color: onGoldFg }}>
                {t("rating.myReviews")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Rating Filtreleri - Sadece veri varsa göster */}
        {!isLoading && safeRatings.length > 0 && !showOnlyMine && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 16 }}
          >
            {ratingFilters.map((filter) => {
                const isSelected = selectedRatingFilter === filter.value;
                const starProps = getStarRatingWidgetProps(isDark);
                return (
                  <TouchableOpacity
                    key={filter.value ?? "all"}
                    onPress={() => setSelectedRatingFilter(filter.value)}
                    className="rounded-full px-3 py-2"
                    style={
                      isSelected
                        ? { backgroundColor: GOLD }
                        : { backgroundColor: 'transparent', borderWidth: 1, borderColor: GOLD }
                    }
                  >
                    {filter.label ? (
                      <Text className="text-sm font-medium" style={{ color: onGoldFg }}>
                        {filter.label}
                      </Text>
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <ThemedStarIcon size={14} color={starProps.color} type="full" index={0} />
                        <Text className="text-sm font-medium" style={{ color: onGoldFg }}>
                          {filter.value}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
          </ScrollView>
        )}
      </View>

      {/* Yorumlar listesi */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={onGoldFg} />
        </View>
      ) : isError && safeRatings.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <Icon source="alert-circle-outline" size={64} color="#6b7280" />
          <Text className="text-base mt-4 text-center px-2" style={{ color: colors.sectionHeaderText }}>
            {getErrorMessage(ratingsQueryError) || t("error.serviceUnavailable")}
          </Text>
          <TouchableOpacity
            onPress={() => {
              bumpEndReachedGrace();
              hasMoreRef.current = true;
              lastLoadedBeforeRef.current = null;
              refetch();
            }}
            className="mt-6 rounded-xl px-6 py-3"
            style={{ backgroundColor: GOLD }}
            activeOpacity={0.85}
          >
            <Text className="font-century-gothic-bold" style={{ color: onGoldFg }}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : safeRatings.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <Icon source="comment-outline" size={64} color="#6b7280" />
          <Text className="text-[#9ca3af] text-base mt-4 text-center">
            {t("card.noReviews")}
          </Text>
        </View>
      ) : filteredRatings.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <Icon source="comment-outline" size={64} color="#6b7280" />
          <Text className="text-[#9ca3af] text-base mt-4 text-center">
            {t("common.noSearchResults")}
          </Text>
        </View>
      ) : (
        <BottomSheetFlatList
          data={filteredRatings}
          keyExtractor={(item: RatingGetDto) => item.id}
          renderItem={renderRatingItem}
          contentContainerStyle={{ padding: 16 }}
          refreshing={isLoading}
          onRefresh={handleRefresh}
          onEndReached={loadOlderRatings}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isLoadingOlder ? (
              <View style={{ paddingVertical: 12 }}>
                <ActivityIndicator size="small" color={onGoldFg} />
              </View>
            ) : null
          }
        />
      )}
    </BottomSheetView>
  );
};
