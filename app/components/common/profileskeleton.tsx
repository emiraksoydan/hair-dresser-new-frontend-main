import { View } from 'react-native';
import { Skeleton } from 'moti/skeleton';
import { useTheme } from '../../hook/useTheme';

export const ProfileSkeleton = () => {
    const { colors, isDark } = useTheme();
    const colorMode = isDark ? 'dark' : 'light';

    return (
        <View style={{ flex: 1, backgroundColor: colors.screenBg }} className='px-6 pt-6'>
            {/* Avatar Section */}
            <View className="items-center mb-6">
                <Skeleton width={120} height={120} radius="round" colorMode={colorMode} />
                <View className="h-3" />
                <Skeleton width={160} height={20} radius={8} colorMode={colorMode} />
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: colors.borderColor }} className="mb-6" />

            {/* Profile Info Title */}
            <Skeleton width={120} height={18} radius={8} colorMode={colorMode} />
            <View className="h-4" />

            {/* Form Container */}
            <View style={{ backgroundColor: colors.cardBg }} className="rounded-xl p-4">
                {/* Name Fields Row */}
                <View className="flex-row gap-3 mb-4">
                    <View className="flex-1">
                        <Skeleton width={60} height={14} radius={6} colorMode={colorMode} />
                        <View className="h-2" />
                        <Skeleton width="100%" height={48} radius={8} colorMode={colorMode} />
                    </View>
                    <View className="flex-1">
                        <Skeleton width={70} height={14} radius={6} colorMode={colorMode} />
                        <View className="h-2" />
                        <Skeleton width="100%" height={48} radius={8} colorMode={colorMode} />
                    </View>
                </View>

                {/* Phone Field */}
                <View className="mb-4">
                    <Skeleton width={100} height={14} radius={6} colorMode={colorMode} />
                    <View className="h-2" />
                    <Skeleton width="100%" height={48} radius={8} colorMode={colorMode} />
                </View>

                {/* Update Button */}
                <Skeleton width="100%" height={48} radius={8} colorMode={colorMode} />
            </View>

            {/* Logout Section */}
            <View className="mt-6">
                <Skeleton width={100} height={18} radius={8} colorMode={colorMode} />
                <View className="h-4" />
                <Skeleton width="100%" height={56} radius={12} colorMode={colorMode} />
            </View>
        </View>
    );
};
