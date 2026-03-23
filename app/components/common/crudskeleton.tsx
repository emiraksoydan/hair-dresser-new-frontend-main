// components/StoreSkeleton.tsx
import { View } from 'react-native';
import { Skeleton } from 'moti/skeleton';
import { useTheme } from '../../hook/useTheme';

export const CrudSkeletonComponent = () => {
    const { isDark } = useTheme();
    const colorMode = isDark ? 'dark' : 'light';
    return (
        <View className="px-4 py-4 gap-4">
            <Skeleton width="100%" height={120} radius={8} colorMode={colorMode} />
            <Skeleton.Group show >
                <View className="flex-row mt-5 gap-5">
                    <View className="flex-1">
                        <Skeleton width="100%" height={40} radius={8} colorMode={colorMode} />
                    </View>
                    <View className="flex-1">
                        <Skeleton width="100%" height={40} radius={8} colorMode={colorMode} />
                    </View>
                </View>
            </Skeleton.Group>
            <View className='mt-5'>
                <Skeleton width="100%" height={40} radius={8} colorMode={colorMode} />

            </View>
            <View className="mt-5 gap-5 ">
                {[0, 1, 2].map((row) => (
                    <Skeleton.Group key={row} show>
                        <View className="flex-row gap-2">
                            <View className="flex-1">
                                <Skeleton width={"100%"} height={28} radius={8} colorMode={colorMode} />

                            </View>
                            <View className="flex-1">
                                <Skeleton width={"100%"} height={28} radius={8} colorMode={colorMode} />

                            </View>
                        </View>
                    </Skeleton.Group>
                ))}
            </View>
        </View>
    );
};
