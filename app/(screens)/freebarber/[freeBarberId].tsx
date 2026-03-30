import { Icon } from "react-native-paper";
import { TouchableOpacity, View, StatusBar } from 'react-native'
import React, { useCallback, useEffect, useMemo } from 'react'
import { useLocalSearchParams } from 'expo-router';

import FreeBarberBookingContent from '../../components/freebarber/freebarberbooking';
import { BookingSwipePager } from '../../components/common/BookingSwipePager';
import { useTheme } from '../../hook/useTheme';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import { clearFreeBarberSwipeIds } from '../../store/bookingSwipeSlice';

const FreeBarberDetail = () => {

    const router = useSafeNavigation();
    const dispatch = useAppDispatch();
    const { colors, isDark } = useTheme();
    const { freeBarberId, freeBarber, mode, appointmentId } = useLocalSearchParams<{
        freeBarberId?: string;
        freeBarber?: string;
        mode?: string;
        appointmentId?: string;
    }>();
    const frbId = (freeBarberId ?? freeBarber ?? "").toString();
    const bookingMode: "add-store" | undefined =
        mode === "add-store" ? "add-store" : undefined;
    const swipeFreeBarberIds = useAppSelector((s) => s.bookingSwipe.freeBarberIds);

    useEffect(() => {
        return () => {
            dispatch(clearFreeBarberSwipeIds());
        };
    }, [dispatch]);

    const showSwipePager = useMemo(
        () =>
            !!swipeFreeBarberIds &&
            swipeFreeBarberIds.length > 1 &&
            !!frbId &&
            swipeFreeBarberIds.includes(frbId),
        [swipeFreeBarberIds, frbId],
    );

    const onSwipeCommit = useCallback(
        (_index: number, id: string) => {
            router.setParams({ freeBarberId: id });
        },
        [router],
    );

    const bookingProps = useMemo(
        () => ({
            isBottomSheet: false as const,
            mode: bookingMode,
            appointmentId,
            disableHeaderImageSwipe: !!showSwipePager,
        }),
        [bookingMode, appointmentId, showSwipePager],
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.screenBg }}>
            <StatusBar translucent backgroundColor="transparent" barStyle={isDark ? "light-content" : "dark-content"} />
            {showSwipePager && swipeFreeBarberIds ? (
                <BookingSwipePager
                    ids={swipeFreeBarberIds}
                    initialId={frbId}
                    onCommittedIndex={onSwipeCommit}
                >
                    {(id) => (
                        <FreeBarberBookingContent
                            barberId={id}
                            {...bookingProps}
                        />
                    )}
                </BookingSwipePager>
            ) : (
                <FreeBarberBookingContent
                    barberId={frbId}
                    {...bookingProps}
                />
            )}
            <TouchableOpacity
                onPress={() => router.back()}
                className="absolute top-10 left-5 z-20 rounded-full p-3"
                style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
            >
                <Icon source="chevron-left" size={25} color="white" />
            </TouchableOpacity>
        </View>
    );
}

export default FreeBarberDetail
