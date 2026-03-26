import { View, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { Text } from '../../components/common/Text';
import { Icon } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import { useCancelSubscriptionMutation, useCreatePaytrTokenMutation, useGetSubscriptionStatusQuery, useGetMeQuery, useReactivateSubscriptionMutation } from '../../store/api';
import { UserType } from '../../types';
import { WebView } from 'react-native-webview';
import { useState } from 'react';

type PlanCardProps = {
    planName: string;
    planDesc: string;
    price: string;
    features: string[];
    isCurrent: boolean;
    accentColor: string;
    icon: string;
    onBuy: () => void;
    isBuying?: boolean;
    ctaLabel?: string;
    status: string | undefined;
    t: (key: string) => string;
    colors: ReturnType<typeof useTheme>['colors'];
};

function PlanCard({ planName, planDesc, price, features, isCurrent, accentColor, icon, onBuy, isBuying, ctaLabel, status, t, colors }: PlanCardProps) {
    const canBuy = status === 'Expired' || status === 'Trial';

    return (
        <View
            style={{
                backgroundColor: colors.cardBg,
                borderRadius: 16,
                marginBottom: 16,
                borderWidth: isCurrent ? 2 : 1,
                borderColor: isCurrent ? accentColor : colors.borderColor,
                overflow: 'hidden',
            }}
        >
            {/* Plan header */}
            <View
                style={{
                    backgroundColor: accentColor + '22',
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: accentColor + '44',
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View
                            style={{
                                width: 42,
                                height: 42,
                                borderRadius: 21,
                                backgroundColor: accentColor + '33',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Icon source={icon} size={22} color={accentColor} />
                        </View>
                        <View>
                            <Text style={{ color: colors.sectionHeaderText, fontSize: 16, fontFamily: 'CenturyGothic-Bold' }}>
                                {planName}
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'CenturyGothic', marginTop: 2 }}>
                                {planDesc}
                            </Text>
                        </View>
                    </View>
                    {isCurrent && (
                        <View
                            style={{
                                backgroundColor: accentColor,
                                borderRadius: 20,
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: 11, fontFamily: 'CenturyGothic-Bold' }}>
                                {t('subscription.currentPlan')}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Price */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 14 }}>
                    <Text style={{ color: accentColor, fontSize: 36, fontFamily: 'CenturyGothic-Bold', lineHeight: 40 }}>
                        ₺{price}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 14, fontFamily: 'CenturyGothic', marginBottom: 4, marginLeft: 4 }}>
                        {t('subscription.perMonth')}
                    </Text>
                </View>
            </View>

            {/* Features */}
            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: canBuy ? 8 : 16 }}>
                {features.map((feature, index) => (
                    <View
                        key={index}
                        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: index < features.length - 1 ? 10 : 0 }}
                    >
                        <Icon source="check-circle" size={17} color={accentColor} />
                        <Text
                            style={{
                                color: colors.sectionHeaderText,
                                fontSize: 13,
                                fontFamily: 'CenturyGothic',
                                marginLeft: 8,
                            }}
                        >
                            {feature}
                        </Text>
                    </View>
                ))}

                {/* CTA button */}
                {canBuy && (
                    <TouchableOpacity
                        onPress={onBuy}
                        disabled={isBuying}
                        activeOpacity={0.8}
                        style={{
                            marginTop: 16,
                            backgroundColor: isBuying ? accentColor + '88' : accentColor,
                            borderRadius: 12,
                            paddingVertical: 13,
                            alignItems: 'center',
                            flexDirection: 'row',
                            justifyContent: 'center',
                            gap: 8,
                        }}
                    >
                        {isBuying ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Icon source="credit-card-outline" size={18} color="#fff" />
                        )}
                        <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'CenturyGothic-Bold' }}>
                            {ctaLabel || t('subscription.buyNow')}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

export default function SubscriptionPage() {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const router = useSafeNavigation();

    const { data: subscriptionData } = useGetSubscriptionStatusQuery();
    const { data: userData } = useGetMeQuery();
    const [createPaytrToken, { isLoading: isCreatingToken }] = useCreatePaytrTokenMutation();
    const [cancelSubscription, { isLoading: isCancelling }] = useCancelSubscriptionMutation();
    const [reactivateSubscription, { isLoading: isReactivating }] = useReactivateSubscriptionMutation();
    const [paytrUrl, setPaytrUrl] = useState<string | null>(null);
    const [paytrMerchantOid, setPaytrMerchantOid] = useState<string | null>(null);

    const sub = subscriptionData?.data;
    const rawUt = userData?.data?.userType;
    const accountUserType =
        typeof rawUt === 'number'
            ? rawUt
            : rawUt === 'BarberStore'
              ? UserType.BarberStore
              : rawUt === 'FreeBarber'
                ? UserType.FreeBarber
                : rawUt === 'Customer'
                  ? UserType.Customer
                  : undefined;
    const showFreeBarberPlan = accountUserType === UserType.FreeBarber;
    const showBarberStorePlan = accountUserType === UserType.BarberStore;
    const showCustomerSubscriptionNote = accountUserType === UserType.Customer;

    const statusColor =
        sub?.status === 'Banned' ? '#ef4444' :
        sub?.status === 'Expired' ? '#f97316' :
        sub?.status === 'Active' ? '#22c55e' :
        '#fea60e';

    const statusIcon =
        sub?.status === 'Banned' ? 'account-cancel' :
        sub?.status === 'Expired' ? 'clock-alert-outline' :
        sub?.status === 'Active' ? 'check-circle-outline' :
        'clock-outline';

    const statusBg =
        sub?.status === 'Banned' ? 'rgba(127,29,29,0.3)' :
        sub?.status === 'Expired' ? 'rgba(124,45,18,0.3)' :
        sub?.status === 'Active' ? 'rgba(20,83,45,0.3)' :
        colors.cardBg;

    const freeBarberFeatures = [
        t('subscription.feature_appointments'),
        t('subscription.feature_personal_profile'),
        t('subscription.feature_messaging'),
        t('subscription.feature_location'),
        t('subscription.feature_favorites'),
        t('subscription.feature_unlimited_appointments'),
    ];

    const barberStoreFeatures = [
        t('subscription.feature_appointments'),
        t('subscription.feature_store_profile'),
        t('subscription.feature_store_management'),
        t('subscription.feature_messaging'),
        t('subscription.feature_location'),
        t('subscription.feature_favorites'),
        t('subscription.feature_unlimited_appointments'),
        t('subscription.feature_multi_staff'),
    ];

    const handleBuy = async (plan: 'FreeBarber' | 'BarberStore') => {
        try {
            const res = await createPaytrToken({ plan, months: 1 }).unwrap();
            const token = res?.data?.token;
            const merchantOid = res?.data?.merchantOid;
            if (!token) return;
            setPaytrMerchantOid(merchantOid ?? null);
            setPaytrUrl(`https://www.paytr.com/odeme/guvenli/${token}`);
        } catch {
            // errorHandler zaten global toast/alert yapıyor
        }
    };

    const handleCancelSubscription = () => {
        Alert.alert(
            t('subscription.cancelTitle'),
            t('subscription.cancelConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('subscription.cancelButton'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await cancelSubscription().unwrap();
                        } catch {
                            // global error handler
                        }
                    },
                },
            ],
        );
    };

    const handleReactivateSubscription = async () => {
        try {
            await reactivateSubscription().unwrap();
        } catch {
            // global error handler
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.screenBg }}>
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
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Mevcut Durum Kartı */}
                {sub && (
                    <View style={{ marginBottom: 24 }}>
                        <Text style={{ color: colors.sectionHeaderText, fontSize: 15, fontFamily: 'CenturyGothic-Bold', marginBottom: 10 }}>
                            {t('subscription.currentStatus')}
                        </Text>
                        <View
                            style={{
                                backgroundColor: statusBg,
                                borderRadius: 14,
                                borderWidth: 1,
                                borderColor: statusColor,
                                padding: 16,
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                <Icon source={statusIcon} size={22} color={statusColor} />
                                <Text style={{ color: statusColor, fontSize: 15, fontFamily: 'CenturyGothic-Bold', marginLeft: 8 }}>
                                    {t(`subscription.status${sub.status}`)}
                                </Text>
                                {(sub.status === 'Trial' || sub.status === 'Active') && (
                                    <View
                                        style={{
                                            marginLeft: 8,
                                            backgroundColor: statusColor + '33',
                                            borderRadius: 10,
                                            paddingHorizontal: 8,
                                            paddingVertical: 2,
                                        }}
                                    >
                                        <Text style={{ color: statusColor, fontSize: 12, fontFamily: 'CenturyGothic' }}>
                                            {sub.status === 'Trial'
                                                ? t('subscription.trialDaysLeft').replace('{{days}}', String(sub.trialDaysLeft))
                                                : t('subscription.subscriptionDaysLeft').replace('{{days}}', String(sub.subscriptionDaysLeft))
                                            }
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: 'CenturyGothic' }}>
                                {sub.status === 'Banned' ? t('subscription.bannedInfo') :
                                 sub.status === 'Expired' ? t('subscription.expiredInfo') :
                                 sub.status === 'Trial' ? t('subscription.trialInfo') :
                                 t('subscription.activeDesc')}
                            </Text>
                        </View>
                        {sub.status === 'Active' && (
                            <>
                                <View
                                    style={{
                                        marginTop: 10,
                                        backgroundColor: sub.cancelAtPeriodEnd ? '#f59e0b22' : '#22c55e22',
                                        borderColor: sub.cancelAtPeriodEnd ? '#f59e0b77' : '#22c55e55',
                                        borderWidth: 1,
                                        borderRadius: 10,
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                    }}
                                >
                                    <Text style={{ color: sub.cancelAtPeriodEnd ? '#f59e0b' : '#22c55e', fontSize: 12, fontFamily: 'CenturyGothic-Bold' }}>
                                        {sub.cancelAtPeriodEnd ? t('subscription.autoRenewOff') : t('subscription.autoRenewOn')}
                                    </Text>
                                </View>

                                {sub.cancelAtPeriodEnd ? (
                                    <TouchableOpacity
                                        onPress={handleReactivateSubscription}
                                        disabled={isReactivating}
                                        activeOpacity={0.8}
                                        style={{
                                            marginTop: 10,
                                            backgroundColor: isReactivating ? '#22c55e88' : '#22c55e',
                                            borderRadius: 10,
                                            paddingVertical: 12,
                                            alignItems: 'center',
                                            flexDirection: 'row',
                                            justifyContent: 'center',
                                            gap: 8,
                                        }}
                                    >
                                        {isReactivating ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Icon source="refresh" size={18} color="#fff" />
                                        )}
                                        <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'CenturyGothic-Bold' }}>
                                            {t('subscription.reactivateAutoRenew')}
                                        </Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        onPress={handleCancelSubscription}
                                        disabled={isCancelling}
                                        activeOpacity={0.8}
                                        style={{
                                            marginTop: 10,
                                            backgroundColor: isCancelling ? '#ef444488' : '#ef4444',
                                            borderRadius: 10,
                                            paddingVertical: 12,
                                            alignItems: 'center',
                                            flexDirection: 'row',
                                            justifyContent: 'center',
                                            gap: 8,
                                        }}
                                    >
                                        {isCancelling ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Icon source="close-circle-outline" size={18} color="#fff" />
                                        )}
                                        <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'CenturyGothic-Bold' }}>
                                            {t('subscription.cancelButton')}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </View>
                )}

                {showCustomerSubscriptionNote && (
                    <View
                        style={{
                            backgroundColor: colors.cardBg,
                            borderRadius: 14,
                            padding: 16,
                            borderWidth: 1,
                            borderColor: colors.borderColor,
                            marginBottom: 20,
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <Icon source="information-outline" size={22} color={colors.primary} />
                            <Text style={{ color: colors.sectionHeaderText, fontSize: 15, fontFamily: 'CenturyGothic-Bold', flex: 1 }}>
                                {t('subscription.customerPlansTitle')}
                            </Text>
                        </View>
                        <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: 'CenturyGothic', lineHeight: 20 }}>
                            {t('subscription.customerPlansInfo')}
                        </Text>
                    </View>
                )}

                {(showFreeBarberPlan || showBarberStorePlan) && (
                    <Text style={{ color: colors.sectionHeaderText, fontSize: 15, fontFamily: 'CenturyGothic-Bold', marginBottom: 12 }}>
                        {t('subscription.choosePlan')}
                    </Text>
                )}

                {showFreeBarberPlan && (
                    <PlanCard
                        planName={t('subscription.freeBarberPlanName')}
                        planDesc={t('subscription.freeBarberPlanDesc')}
                        price={t('subscription.freeBarberPrice')}
                        features={freeBarberFeatures}
                        isCurrent
                        accentColor="#3b82f6"
                        icon="account-outline"
                        onBuy={() => handleBuy('FreeBarber')}
                        isBuying={isCreatingToken}
                        ctaLabel={sub?.status === 'Expired' ? t('subscription.reactivateNow') : t('subscription.buyNow')}
                        status={sub?.status}
                        t={t}
                        colors={colors}
                    />
                )}

                {showBarberStorePlan && (
                    <PlanCard
                        planName={t('subscription.barberStorePlanName')}
                        planDesc={t('subscription.barberStorePlanDesc')}
                        price={t('subscription.barberStorePrice')}
                        features={barberStoreFeatures}
                        isCurrent
                        accentColor="#fea60e"
                        icon="store-outline"
                        onBuy={() => handleBuy('BarberStore')}
                        isBuying={isCreatingToken}
                        ctaLabel={sub?.status === 'Expired' ? t('subscription.reactivateNow') : t('subscription.buyNow')}
                        status={sub?.status}
                        t={t}
                        colors={colors}
                    />
                )}

                {/* PayTR Güvenlik Notu */}
                <View
                    style={{
                        backgroundColor: colors.cardBg,
                        borderRadius: 12,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: colors.borderColor,
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: 10,
                        marginTop: 4,
                    }}
                >
                    <Icon source="shield-check-outline" size={20} color="#22c55e" />
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.sectionHeaderText, fontSize: 13, fontFamily: 'CenturyGothic-Bold', marginBottom: 2 }}>
                            {t('subscription.paytrSecure')}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'CenturyGothic' }}>
                            {t('subscription.paytrNote')}
                        </Text>
                    </View>
                </View>

            </ScrollView>

            <Modal visible={!!paytrUrl} animationType="slide" onRequestClose={() => setPaytrUrl(null)}>
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.screenBg }}>
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
                            onPress={() => setPaytrUrl(null)}
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
                            <Icon source="close" size={22} color={colors.sectionHeaderText} />
                        </TouchableOpacity>
                        <Text style={{ color: colors.sectionHeaderText, fontSize: 16, fontFamily: 'CenturyGothic-Bold', flex: 1 }}>
                            {t('subscription.paymentTitle')}
                        </Text>
                        {paytrMerchantOid ? (
                            <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'CenturyGothic' }} numberOfLines={1}>
                                {paytrMerchantOid}
                            </Text>
                        ) : null}
                    </View>

                    {!paytrUrl ? (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <ActivityIndicator size="large" color="#22c55e" />
                        </View>
                    ) : (
                        <WebView
                            source={{ uri: paytrUrl }}
                            startInLoadingState
                            renderLoading={() => (
                                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                    <ActivityIndicator size="large" color="#22c55e" />
                                </View>
                            )}
                            onNavigationStateChange={(nav) => {
                                const u = nav.url || '';
                                if (u.includes('/payment/success') || u.includes('/payment/failed')) {
                                    setPaytrUrl(null);
                                }
                            }}
                        />
                    )}
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}
