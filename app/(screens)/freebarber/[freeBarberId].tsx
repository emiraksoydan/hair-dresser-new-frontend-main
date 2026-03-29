import { Icon } from "react-native-paper";
import { TouchableOpacity, View, StatusBar } from 'react-native'
import React from 'react'
import { useLocalSearchParams } from 'expo-router';

import FreeBarberBookingContent from '../../components/freebarber/freebarberbooking';
import { useTheme } from '../../hook/useTheme';
import { useSafeNavigation } from '../../hook/useSafeNavigation';

const FreeBarberDetail = () => {

    const router = useSafeNavigation();
    const { colors, isDark } = useTheme();
    const { freeBarberId, freeBarber, mode, appointmentId } = useLocalSearchParams<{
        freeBarberId?: string;
        freeBarber?: string;
        mode?: string;
        appointmentId?: string;
    }>();
    const frbId = (freeBarberId ?? freeBarber ?? "").toString();
    const bookingMode = mode === "add-store" ? "add-store" : undefined;

    return (
        <View style={{ flex: 1, backgroundColor: colors.screenBg }}>
            <StatusBar translucent backgroundColor="transparent" barStyle={isDark ? "light-content" : "dark-content"} />
            <FreeBarberBookingContent
                barberId={frbId}
                isBottomSheet={false}
                mode={bookingMode}
                appointmentId={appointmentId}
            />
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
