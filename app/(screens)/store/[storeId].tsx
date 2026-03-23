import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { StatusBar, View } from "react-native";

import StoreBookingContent from "../../components/store/storebooking";
import { useGetAllNotificationsQuery } from "../../store/api";
import { useAuth } from "../../hook/useAuth";
import { AppointmentStatus, StoreSelectionType, UserType } from "../../types";
import { useTheme } from "../../hook/useTheme";



export default function StoreDetail() {
    const { colors, isDark } = useTheme();
    const { storeId, mode, appointmentId } = useLocalSearchParams<{ storeId: string; mode?: string; appointmentId?: string }>();
    const { userType } = useAuth();
    const { data: notifications = [] } = useGetAllNotificationsQuery(undefined, {
        skip: userType !== UserType.FreeBarber,
    });

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

    return (
        <View style={{ flex: 1, backgroundColor: colors.screenBg }}>
            <StatusBar translucent backgroundColor="transparent" barStyle={isDark ? "light-content" : "dark-content"} />
            <StoreBookingContent
                storeId={storeId}
                isCustomer={isCustomer}
                isFreeBarber={isFreeBarber}
                isBottomSheet={false}
                mode={isAddStoreMode ? "add-store" : undefined}
                appointmentId={effectiveAppointmentId}
            />
        </View>
    );
}
