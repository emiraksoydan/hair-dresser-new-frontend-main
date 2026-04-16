import { Icon } from "react-native-paper";
import React, { useCallback, useMemo, useState } from 'react';
import { View, FlatList, Dimensions, RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { PerplexityAnimatedList } from '../common/PerplexityAnimatedList';
import { Text } from '../common/Text';
import { useGetMyFavoritesQuery, useGetMeQuery, useGetFreeBarberMinePanelQuery, useGetSettingQuery } from '../../store/api';
import { useAppDispatch } from '../../store/hook';
import { setFreeBarberSwipeIds, setStoreSwipeIds } from '../../store/bookingSwipeSlice';
import { shouldFilterStoresToOthersOnly, shouldFilterOwnFreeBarberFromCompare, isOtherUsersStore, isOtherUsersFreeBarber } from '../../utils/compare-eligibility';
import { FavoriteGetDto, FavoriteTargetType, UserType } from '../../types';
import { StoreCardInner } from '../store/storecard';
import { FreeBarberCardInner } from '../freebarber/freebarbercard';
import { CustomerCardInner } from '../customer/customercard';
import { ManuelBarberCardInner } from '../manuelbarber/manuelbarbercard';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import { BarberStoreGetDto, FreeBarGetDto, UserFavoriteDto, ManuelBarberFavoriteDto } from '../../types';

import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { RatingsBottomSheet } from '../rating/ratingsbottomsheet';
import { useBottomSheet } from '../../hook/useBottomSheet';
import FormStoreUpdate from '../store/formstoreupdate';
import { UnifiedStateWrapper } from '../common/UnifiedStateManager';
import { FormFreeBarberOperation } from '../freebarber/formfreebarberoper';
import { SkeletonComponent } from '../common/skeleton';
import { useLanguage } from '../../hook/useLanguage';
import { useTheme } from '../../hook/useTheme';
import { useFabOverlayWhenSheetOpen } from '../../hook/usePanelMoreFab';
import { useDeferredSheetPresent } from '../../hook/useDeferredSheetPresent';

type FavoritesListProps = {
    mode?: 'store' | 'customer' | 'freebarber';
};

const FAVORITE_CARD_STRIDE = 320;

const FavoritesList: React.FC<FavoritesListProps> = ({ mode = 'store' }) => {
    const { t } = useLanguage();
    const { colors } = useTheme();
    const { data: favorites, isLoading, refetch, isFetching, error, isError } = useGetMyFavoritesQuery();
    const { data: currentUser, isLoading: isUserLoading, isSuccess: isUserSuccess } = useGetMeQuery();
    const compareUid = currentUser?.data?.id;
    const compareUserType = currentUser?.data?.userType;

    // Kullanıcı tipi kontrolü - currentUser yüklenene kadar bekle
    const userType = currentUser?.data?.userType;
    const isFreeBarberUser = userType === UserType.FreeBarber;

    // FreeBarber kullanıcıları için kendi panelini çek (güncelleme sheet'i için gerekli)
    const { data: myFreeBarber } = useGetFreeBarberMinePanelQuery(undefined, {
        skip: !isUserSuccess || !isFreeBarberUser,
    });
    const { data: settingData } = useGetSettingQuery();
    const router = useSafeNavigation();
    const dispatch = useAppDispatch();

    // Bottom sheet hooks
    const ratingsSheet = useBottomSheet({
        snapPoints: ["50%", "85%"],
        enablePanDownToClose: true,
    });
    const updateStoreSheet = useBottomSheet({
        snapPoints: ["100%"],
        enablePanDownToClose: false,
        enableOverDrag: false,
        enableHandlePanningGesture: false,
    });
    const updateFreeBarberSheet = useBottomSheet({
        snapPoints: ["100%"],
        enablePanDownToClose: false,
        enableOverDrag: false,
        enableHandlePanningGesture: false,
    });

    const anyFavoritesSheetOpen =
        ratingsSheet.isOpen ||
        updateStoreSheet.isOpen ||
        updateFreeBarberSheet.isOpen;
    useFabOverlayWhenSheetOpen(anyFavoritesSheetOpen);

    const { present: presentRatings } = ratingsSheet;
    const { schedulePresent: scheduleRatingsPresent, cancelScheduledPresent: cancelRatingsPresent } =
        useDeferredSheetPresent(presentRatings);
    const { present: presentUpdateStore } = updateStoreSheet;
    const { schedulePresent: scheduleUpdateStorePresent, cancelScheduledPresent: cancelUpdateStorePresent } =
        useDeferredSheetPresent(presentUpdateStore);
    const { present: presentUpdateFreeBarber } = updateFreeBarberSheet;
    const { schedulePresent: scheduleUpdateFreeBarberPresent, cancelScheduledPresent: cancelUpdateFreeBarberPresent } =
        useDeferredSheetPresent(presentUpdateFreeBarber);

    const [selectedRatingsTarget, setSelectedRatingsTarget] = useState<{ targetId: string; targetName: string } | null>(null);
    const [selectedStoreForUpdate, setSelectedStoreForUpdate] = useState<BarberStoreGetDto | null>(null);

    const screenWidth = Dimensions.get("window").width;
    /** Panel keşif kartları (≈0.935–0.955) ile aynı genişlikte olmamalı — biraz daha dar */
    const cardWidth = screenWidth * 0.88;

    // Kullanıcının kendi user ID'sini al
    const currentUserId = useMemo(() => {
        return currentUser?.data?.id;
    }, [currentUser]);

    const storeFavorites = useMemo(() => {
        return favorites?.filter(f => f.targetType === FavoriteTargetType.Store && f.store) || [];
    }, [favorites]);

    const freeBarberFavorites = useMemo(() => {
        return favorites?.filter(f => f.targetType === FavoriteTargetType.FreeBarber && f.freeBarber) || [];
    }, [favorites]);

    const storeSwipeIdOrder = useMemo(
        () => storeFavorites.map((f) => f.store!.id),
        [storeFavorites],
    );
    const freeBarberSwipeIdOrder = useMemo(
        () => freeBarberFavorites.map((f) => f.freeBarber!.id),
        [freeBarberFavorites],
    );

    const goStoreDetail = useCallback((store: BarberStoreGetDto) => {
        // Eğer kullanıcının kendi store'u ise update sheet'e yönlendir
        // barberStoreOwnerId ile currentUserId karşılaştır
        if (store.barberStoreOwnerId && currentUserId && store.barberStoreOwnerId === currentUserId) {
            setSelectedStoreForUpdate(store);
            scheduleUpdateStorePresent(100);
            return;
        }

        dispatch(setStoreSwipeIds(storeSwipeIdOrder));
        router.push({
            pathname: "/store/[storeId]",
            params: { storeId: store.id, mode: mode },
        });
    }, [router, mode, currentUserId, scheduleUpdateStorePresent, dispatch, storeSwipeIdOrder]);

    const goFreeBarberDetail = useCallback((freeBarber: FreeBarGetDto) => {
        // Eğer kullanıcının kendi freeBarber paneli ise update sheet'e yönlendir
        // freeBarberUserId ile currentUserId karşılaştır
        if (freeBarber.freeBarberUserId && currentUserId && freeBarber.freeBarberUserId === currentUserId) {
            scheduleUpdateFreeBarberPresent(100);
            return;
        }

        dispatch(setFreeBarberSwipeIds(freeBarberSwipeIdOrder));
        router.push({
            pathname: "/freebarber/[freeBarberId]",
            params: { freeBarberId: freeBarber.id },
        });
    }, [router, currentUserId, scheduleUpdateFreeBarberPresent, dispatch, freeBarberSwipeIdOrder]);

    const handlePressRatings = useCallback((targetId: string, targetName: string) => {
        setSelectedRatingsTarget({ targetId, targetName });
        scheduleRatingsPresent(100);
    }, [scheduleRatingsPresent]);

    const [isPullRefreshing, setIsPullRefreshing] = useState(false);

    const customerFavorites = useMemo(() => {
        return favorites?.filter(f => f.targetType === FavoriteTargetType.Customer && f.customer) || [];
    }, [favorites]);

    const manuelBarberFavorites = useMemo(() => {
        return favorites?.filter(f => f.targetType === FavoriteTargetType.ManuelBarber && f.manuelBarber) || [];
    }, [favorites]);

    const comparableStoreFavorites = useMemo(() => {
        if (!shouldFilterStoresToOthersOnly(compareUserType)) return storeFavorites.length;
        return storeFavorites.filter((f) => f.store && isOtherUsersStore(f.store, compareUid)).length;
    }, [storeFavorites, compareUserType, compareUid]);

    const comparableFreeBarberFavorites = useMemo(() => {
        if (!shouldFilterOwnFreeBarberFromCompare(compareUserType)) return freeBarberFavorites.length;
        return freeBarberFavorites.filter((f) => f.freeBarber && isOtherUsersFreeBarber(f.freeBarber, compareUid)).length;
    }, [freeBarberFavorites, compareUserType, compareUid]);

    const canCompareFavorites = comparableStoreFavorites >= 2 || comparableFreeBarberFavorites >= 2;

    const allFavorites = useMemo(() => {
        return [...storeFavorites, ...freeBarberFavorites, ...customerFavorites, ...manuelBarberFavorites];
    }, [storeFavorites, freeBarberFavorites, customerFavorites, manuelBarberFavorites]);

    // Tip etiketi için fonksiyon
    const getTargetTypeLabel = useCallback((targetType: FavoriteTargetType) => {
        switch (targetType) {
            case FavoriteTargetType.Store:
                return t('labels.store');
            case FavoriteTargetType.FreeBarber:
                return t('labels.freeBarber');
            case FavoriteTargetType.Customer:
                return t('card.customer');
            case FavoriteTargetType.ManuelBarber:
                return t('favorites.manuelBarber');
            default:
                return t('favorites.unknown');
        }
    }, [t]);

    // Tip rengi için fonksiyon
    const getTargetTypeColor = useCallback((targetType: FavoriteTargetType) => {
        switch (targetType) {
            case FavoriteTargetType.Store:
                return 'bg-blue-500';
            case FavoriteTargetType.FreeBarber:
                return 'bg-green-500';
            case FavoriteTargetType.Customer:
                return 'bg-purple-500';
            case FavoriteTargetType.ManuelBarber:
                return 'bg-orange-500';
            default:
                return 'bg-gray-500';
        }
    }, []);

    const renderItem = useCallback(({ item, index }: { item: FavoriteGetDto; index: number }) => {
        const typeLabel = getTargetTypeLabel(item.targetType);
        const typeLabelColor = getTargetTypeColor(item.targetType);

        if (item.targetType === FavoriteTargetType.Store && item.store) {
            return (
                <StoreCardInner
                    store={item.store}
                    isList={true}
                    expanded={true}
                    cardWidthStore={cardWidth}
                    typeLabel={typeLabel}
                    typeLabelColor={typeLabelColor}
                    onPressUpdate={goStoreDetail}
                    onPressRatings={handlePressRatings}
                    isViewerFromFreeBr={mode === 'freebarber'}
                    showImageAnimation={settingData?.data?.showImageAnimation ?? true}
                    compactMeta
                />
            );
        } else if (item.targetType === FavoriteTargetType.FreeBarber && item.freeBarber) {
            return (
                <FreeBarberCardInner
                    freeBarber={item.freeBarber}
                    isList={true}
                    expanded={true}
                    cardWidthFreeBarber={cardWidth}
                    typeLabel={typeLabel}
                    typeLabelColor={typeLabelColor}
                    onPressUpdate={goFreeBarberDetail}
                    onPressRatings={handlePressRatings}
                    showImageAnimation={settingData?.data?.showImageAnimation ?? true}
                    compactMeta
                />
            );
        } else if (item.targetType === FavoriteTargetType.Customer && item.customer) {
            return (
                <CustomerCardInner
                    customer={item.customer}
                    isList={true}
                    expanded={true}
                    cardWidth={cardWidth}
                    typeLabel={typeLabel}
                    typeLabelColor={typeLabelColor}
                    onPressRatings={handlePressRatings}
                />
            );
        } else if (item.targetType === FavoriteTargetType.ManuelBarber && item.manuelBarber) {
            return (
                <ManuelBarberCardInner
                    manuelBarber={item.manuelBarber}
                    isList={true}
                    expanded={true}
                    cardWidth={cardWidth}
                    typeLabel={typeLabel}
                    typeLabelColor={typeLabelColor}
                />
            );
        }
        return null;
    }, [cardWidth, goStoreDetail, goFreeBarberDetail, getTargetTypeLabel, getTargetTypeColor, mode, handlePressRatings, settingData]);

    const handleRefresh = useCallback(async () => {
        setIsPullRefreshing(true);
        try {
            await refetch();
        } finally {
            setIsPullRefreshing(false);
        }
    }, [refetch]);

    if (isLoading) {
        return (
            <View className="flex-1  pt-4 px-4" style={{ backgroundColor: colors.screenBg }}>
                {Array.from({ length: 3 }).map((_, i) => <SkeletonComponent key={i} />)}
            </View>
        );
    }

    // Error veya Empty durumu - UnifiedStateWrapper ile
    if (isError || allFavorites.length === 0) {
        return (
            <View className="flex-1 " style={{ backgroundColor: colors.screenBg }}>
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 32, paddingHorizontal: 8 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={isPullRefreshing}
                            onRefresh={handleRefresh}
                            tintColor="#f05e23"
                        />
                    }
                >
                    <UnifiedStateWrapper
                        loading={isLoading}
                        error={error}
                        data={allFavorites}
                        fetchedOnce={true}
                        onRetry={refetch}
                        customMessages={{
                            empty: t('empty.noFavoritesAdded'),
                        }}
                        customAnimations={{
                            empty: require("../../../assets/animations/favorites-empty.json"),
                        }}
                    >
                        <View />
                    </UnifiedStateWrapper>
                </ScrollView>
            </View>
        );
    }

    return (
        <View className="flex-1 " style={{ backgroundColor: colors.screenBg }}>
            {canCompareFavorites && (
                <TouchableOpacity
                    onPress={() => router.push("/(screens)/compare/pick-pair")}
                    activeOpacity={0.85}
                    style={{
                        marginHorizontal: 16,
                        marginTop: 10,
                        marginBottom: 4,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        paddingVertical: 12,
                        borderRadius: 14,
                        backgroundColor: colors.cardBg,
                        borderWidth: 1,
                        borderColor: "#ffb90055",
                    }}
                >
                    <Icon source="compare-horizontal" size={22} color="#ffb900" />
                    <Text style={{ fontFamily: "CenturyGothic-Bold", color: colors.sectionHeaderText, fontSize: 14 }}>
                        {t("compare.fromFavorites")}
                    </Text>
                </TouchableOpacity>
            )}
            <PerplexityAnimatedList<FavoriteGetDto>
                data={allFavorites}
                keyExtractor={(item) => item.id}
                renderItem={renderItem as (info: { item: FavoriteGetDto; index: number }) => React.ReactNode}
                itemStride={FAVORITE_CARD_STRIDE}
                contentPaddingTop={10}
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingBottom: 100,
                    paddingTop: 10,
                    alignItems: "center",
                }}
                refreshControl={
                    <RefreshControl
                        refreshing={isPullRefreshing}
                        onRefresh={handleRefresh}
                        tintColor="#f05e23"
                    />
                }
            />

            {/* Yorumlar Bottom Sheet */}
            <BottomSheetModal
                ref={ratingsSheet.ref}
                snapPoints={ratingsSheet.snapPoints}
                enablePanDownToClose={ratingsSheet.enablePanDownToClose}
                handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
                backgroundStyle={{ backgroundColor: colors.sheetBg }}
                backdropComponent={ratingsSheet.makeBackdrop()}
                onChange={(index) => {
                    ratingsSheet.handleChange(index);
                    if (index < 0) {
                        setSelectedRatingsTarget(null);
                    }
                }}
                onDismiss={() => {
                    cancelRatingsPresent();
                    ratingsSheet.handleDismiss();
                }}
            >
                {selectedRatingsTarget ? (
                    <RatingsBottomSheet
                        targetId={selectedRatingsTarget.targetId}
                        targetName={selectedRatingsTarget.targetName}
                        onClose={() => {
                            cancelRatingsPresent();
                            setSelectedRatingsTarget(null);
                            ratingsSheet.dismiss();
                        }}
                    />
                ) : (
                    <View className="flex-1 pt-4">
                        <SkeletonComponent />
                    </View>
                )}
            </BottomSheetModal>

            {/* Store Update Bottom Sheet */}
            <BottomSheetModal
                ref={updateStoreSheet.ref}
                snapPoints={updateStoreSheet.snapPoints}
                enablePanDownToClose={updateStoreSheet.enablePanDownToClose}
                enableOverDrag={updateStoreSheet.enableOverDrag}
                enableHandlePanningGesture={updateStoreSheet.enableHandlePanningGesture}
                handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
                backgroundStyle={{ backgroundColor: colors.sheetBg }}
                backdropComponent={updateStoreSheet.makeBackdrop()}
                onChange={(index) => {
                    updateStoreSheet.handleChange(index);
                    if (index < 0) {
                        setSelectedStoreForUpdate(null);
                        // RTK Query otomatik olarak cache'i güncelleyecek
                    }
                }}
                onDismiss={() => {
                    cancelUpdateStorePresent();
                    updateStoreSheet.handleDismiss();
                    setSelectedStoreForUpdate(null);
                }}
            >
                <BottomSheetView className="h-full pt-2">
                    {selectedStoreForUpdate && (
                        <FormStoreUpdate
                            storeId={selectedStoreForUpdate.id}
                            enabled={updateStoreSheet.isOpen}
                            onClose={() => {
                                cancelUpdateStorePresent();
                                updateStoreSheet.dismiss();
                                setSelectedStoreForUpdate(null);
                            }}
                        />
                    )}
                </BottomSheetView>
            </BottomSheetModal>

            {/* FreeBarber Update Bottom Sheet */}
            <BottomSheetModal
                ref={updateFreeBarberSheet.ref}
                snapPoints={updateFreeBarberSheet.snapPoints}
                enablePanDownToClose={updateFreeBarberSheet.enablePanDownToClose}
                enableOverDrag={updateFreeBarberSheet.enableOverDrag}
                enableHandlePanningGesture={updateFreeBarberSheet.enableHandlePanningGesture}
                handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
                backgroundStyle={{ backgroundColor: colors.sheetBg }}
                backdropComponent={updateFreeBarberSheet.makeBackdrop()}
                onChange={(index) => {
                    updateFreeBarberSheet.handleChange(index);
                    if (index < 0) {
                        // RTK Query otomatik olarak cache'i güncelleyecek
                    }
                }}
                onDismiss={() => {
                    cancelUpdateFreeBarberPresent();
                    updateFreeBarberSheet.handleDismiss();
                }}
            >
                <BottomSheetView className="h-full pt-2">
                    {myFreeBarber && updateFreeBarberSheet.isOpen && (
                        <FormFreeBarberOperation
                            freeBarberId={myFreeBarber.id}
                            enabled={true}
                            onClose={() => {
                                cancelUpdateFreeBarberPresent();
                                updateFreeBarberSheet.dismiss();
                            }}
                        />
                    )}
                </BottomSheetView>
            </BottomSheetModal>
        </View>
    );
};

export default FavoritesList;
