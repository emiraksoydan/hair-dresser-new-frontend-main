// components/StoreSkeleton.tsx
import { View } from 'react-native';
import { Skeleton } from 'moti/skeleton';
import { useTheme } from '../../hook/useTheme';

export const SkeletonComponent = () => {
    const { isDark } = useTheme();
    return (
        <View className="flex-row items-center mb-6 gap-5 px-4">
            <Skeleton width={64} height={64} radius={16} colorMode={isDark ? 'dark' : 'light'} />

            <View className="flex-1">
                <Skeleton width="70%" height={16} radius={8} colorMode={isDark ? 'dark' : 'light'} />
                <View className="h-2" />
                <Skeleton width="50%" height={14} radius={8} colorMode={isDark ? 'dark' : 'light'} />
                <View className="h-2" />
                <Skeleton width="90%" height={14} radius={8} colorMode={isDark ? 'dark' : 'light'} />
            </View>
        </View>
    );
};
