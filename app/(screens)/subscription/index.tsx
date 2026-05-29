import { Icon } from "react-native-paper";
import { View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Text } from '../../components/common/Text';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useSafeNavigation } from '../../hook/useSafeNavigation';


export default function SubscriptionPage() {
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const router = useSafeNavigation();

    return (
        <View style={{ flex: 1, backgroundColor: colors.screenBg }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.cardBg} translucent={false} />
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.cardBg }} edges={["top"]}>
            {/* Header */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderColor,
                    backgroundColor: colors.cardBg,
                }}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: colors.screenBg,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                    }}
                >
                    <Icon source="arrow-left" size={22} color={colors.sectionHeaderText} />
                </TouchableOpacity>
                <Text style={{ color: colors.sectionHeaderText, fontSize: 18, fontFamily: 'CenturyGothic-Bold', flex: 1 }}>
                    {t('subscription.plansTitle')}
                </Text>
                <View
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: '#fea60e22',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Icon source="crown-outline" size={20} color="#fea60e" />
                </View>
            </View>

            <ScrollView
                style={{ flex: 1, backgroundColor: colors.screenBg }}
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
            >
                <View
                    style={{
                        backgroundColor: colors.cardBg,
                        borderRadius: 16,
                        padding: 24,
                        borderWidth: 1,
                        borderColor: colors.borderColor,
                        alignItems: 'center',
                        marginTop: 8,
                    }}
                >
                    <View
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: 32,
                            backgroundColor: 'rgba(16,185,129,0.12)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 16,
                        }}
                    >
                        <Icon source="crown-outline" size={32} color="#10B981" />
                    </View>
                    <Text style={{ color: colors.sectionHeaderText, fontSize: 16, fontFamily: 'CenturyGothic-Bold', textAlign: 'center', marginBottom: 10 }}>
                        {t('subscription.plansTitle')}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: 'CenturyGothic', textAlign: 'center', lineHeight: 20 }}>
                        {t('subscription.processLaterShort')}
                    </Text>
                </View>
            </ScrollView>
            </SafeAreaView>
        </View>
    );
}
