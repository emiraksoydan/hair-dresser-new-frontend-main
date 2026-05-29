import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo } from "react";
import { StatusBar, View } from "react-native";

import StoreBookingContent from "../../components/store/StoreBooking";
import { BookingSwipePager } from "../../components/common/BookingSwipePager";
import { useGetAllNotificationsQuery } from "../../store/api";
import { useAuth } from "../../hook/useAuth";
import { AppointmentStatus, StoreSelectionType, UserType } from "../../types";
import { useTheme } from "../../hook/useTheme";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import { clearStoreSwipeIds } from "../../store/bookingSwipeSlice";



export default function StoreDetail() {
    const { colors, isDark } = useTheme();
    const router = useSafeNavigation();
    const dispatch = useAppDispatch();
    const { storeId, mode, appointmentId } = useLocalSearchParams<{ storeId: string; mode?: string; appointmentId?: string }>();
    const swipeStoreIds = useAppSelector((s) => s.bookingSwipe.storeIds);
    const { userType } = useAuth();
    const { data: notifications = [] } = useGetAllNotificationsQuery(undefined, {
        skip: userType !== UserType.FreeBarber,
    });

    useEffect(() => {
        return () => {
            dispatch(clearStoreSwipeIds());
        };
    }, [dispatch]);

    const activeStoreSelectionAppointment = React.useMemo(() => {
        if (userType !== UserType.FreeBarber) return null;

        for (const notification of notifications) {
            if (!notification.payloadJson || notification.payloadJson === '{}') continue;

            try {
                const payload = JSON.parse(notification.payloadJson);
                let expiresAt: Date | null = null;
                if (payload?.pendingExpiresAt) {
                    let dateStr = payload.pendingExpiresAt;
                    if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+')) {
                        dateStr += 'Z';
                    }
                    expiresAt = new Date(dateStr);
                } else if (notification.createdAt) {
                    let createdStr = notification.createdAt;
                    if (typeof createdStr === 'string' && !createdStr.endsWith('Z') && !createdStr.includes('+')) {
                        createdStr += 'Z';
                    }
                    const createdAt = new Date(createdStr);
                    expiresAt = new Date(createdAt.getTime() + 30 * 60 * 1000);
                }
                const isExpired = expiresAt ? new Date().getTime() > expiresAt.getTime() : false;

                const isPending = payload?.status === AppointmentStatus.Pending ||
                    payload?.status === "Pending" ||
                    payload?.status === undefined;

                if (
                    payload?.storeSelectionType === StoreSelectionType.StoreSelection &&
                    isPending &&
                    !payload?.store &&
                    notification.appointmentId &&
                    !isExpired
                ) {
                    return { id: notification.appointmentId };
                }
            } catch {
                continue;
            }
        }
        return null;
    }, [notifications, userType]);

    const shouldForceAddStore = userType === UserType.FreeBarber && !appointmentId && !!activeStoreSelectionAppointment?.id;
    const effectiveMode = shouldForceAddStore ? "add-store" : mode;
    const effectiveAppointmentId = appointmentId ?? activeStoreSelectionAppointment?.id;

    // Mode yoksa userType'a göre belirle
    const isFreeBarber = effectiveMode === "free-barber" || effectiveMode === "add-store" || (!effectiveMode && userType === UserType.FreeBarber);
    const isCustomer = effectiveMode === "customer" || (!effectiveMode && userType === UserType.Customer);
    const isAddStoreMode = effectiveMode === "add-store";

    const showSwipePager = useMemo(
        () =>
            !!swipeStoreIds &&
            swipeStoreIds.length > 1 &&
            !!storeId &&
            swipeStoreIds.includes(storeId),
        [swipeStoreIds, storeId],
    );

    const onSwipeCommit = useCallback(
        (_index: number, id: string) => {
            router.setParams({ storeId: id });
        },
        [router],
    );

    const bookingProps = useMemo(
        () => ({
            isCustomer,
            isFreeBarber,
            isBottomSheet: false as const,
            mode: isAddStoreMode ? ("add-store" as const) : undefined,
            appointmentId: effectiveAppointmentId,
            disableHeaderImageSwipe: !!showSwipePager,
        }),
        [isCustomer, isFreeBarber, isAddStoreMode, effectiveAppointmentId, showSwipePager],
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.screenBg }}>
            <StatusBar translucent backgroundColor="transparent" barStyle={isDark ? "light-content" : "dark-content"} />
            {showSwipePager && swipeStoreIds ? (
                <BookingSwipePager
                    ids={swipeStoreIds}
                    initialId={storeId}
                    onCommittedIndex={onSwipeCommit}
                >
                    {(id) => (
                        <StoreBookingContent
                            storeId={id}
                            {...bookingProps}
                        />
                    )}
                </BookingSwipePager>
            ) : (
                <StoreBookingContent
                    storeId={storeId}
                    {...bookingProps}
                />
            )}
        </View>
    );
}
