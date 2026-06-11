import { useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import type { ProductSubscription, Purchase, PurchaseError } from 'react-native-iap';

// react-native-iap v15 NitroModules kullanır — Expo Go'da desteklenmez.
// Dynamic require ile yüklenir; yüklenemezse (Expo Go) hook no-op döner,
// uygulama çökmez. Gerçek IAP yalnızca native build'de çalışır.
let iap: any = null;
try {
    iap = require('react-native-iap');
} catch {
    // Expo Go veya NitroModules yoksa sessizce devam et
}

const _initConnection: () => Promise<void> = iap?.initConnection ?? (() => Promise.resolve());
const _endConnection: () => void = iap?.endConnection ?? (() => { });
const _fetchProducts: (p: any) => Promise<any> = iap?.fetchProducts ?? (() => Promise.resolve([]));
const _requestPurchase: (p: any) => Promise<void> = iap?.requestPurchase ?? (() => Promise.resolve());
const _purchaseUpdatedListener: (cb: (p: Purchase) => void) => { remove: () => void } =
    iap?.purchaseUpdatedListener ?? (() => ({ remove: () => { } }));
const _purchaseErrorListener: (cb: (e: PurchaseError) => void) => { remove: () => void } =
    iap?.purchaseErrorListener ?? (() => ({ remove: () => { } }));
const _finishTransaction: (p: any) => Promise<void> = iap?.finishTransaction ?? (() => Promise.resolve());
const _ErrorCode: any = iap?.ErrorCode ?? {};

// App Store Connect ve Play Console'da oluşturulacak product ID'ler
export const IAP_SKUS = {
    FreeBarber: Platform.select({
        ios: 'com.hairdresser.app.sub.freebarber.monthly',
        android: 'freebarber_monthly',
    })!,
    BarberStore: Platform.select({
        ios: 'com.hairdresser.app.sub.barberstore.monthly',
        android: 'barberstore_monthly',
    })!,
} as const;

export type IapPlanKey = keyof typeof IAP_SKUS;

type IapState = {
    isConnected: boolean;
    product: ProductSubscription | null;
    isPurchasing: boolean;
};

type UseIapOptions = {
    planKey: IapPlanKey;
    userId: string;
    onVerifyApple: (transactionId: string) => Promise<void>;
    onVerifyGoogle: (productId: string, purchaseToken: string) => Promise<void>;
    onSuccess: () => void;
    onError: (message: string) => void;
};

export function useIap({ planKey, userId, onVerifyApple, onVerifyGoogle, onSuccess, onError }: UseIapOptions) {
    const [state, setState] = useState<IapState>({
        isConnected: false,
        product: null,
        isPurchasing: false,
    });

    const onSuccessRef = useRef(onSuccess);
    const onErrorRef = useRef(onError);
    const onVerifyAppleRef = useRef(onVerifyApple);
    const onVerifyGoogleRef = useRef(onVerifyGoogle);
    useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);
    useEffect(() => { onErrorRef.current = onError; }, [onError]);
    useEffect(() => { onVerifyAppleRef.current = onVerifyApple; }, [onVerifyApple]);
    useEffect(() => { onVerifyGoogleRef.current = onVerifyGoogle; }, [onVerifyGoogle]);

    const sku = IAP_SKUS[planKey];

    useEffect(() => {
        // IAP modülü yüklenemedi (Expo Go) → setup'ı atla
        if (!iap) return;

        let mounted = true;
        let purchaseSub: { remove: () => void } | null = null;
        let errorSub: { remove: () => void } | null = null;

        const setup = async () => {
            try {
                await _initConnection();
                if (!mounted) return;
                setState(s => ({ ...s, isConnected: true }));

                const result = await _fetchProducts({ skus: [sku], type: 'subs' });
                if (!mounted) return;
                const subs = result as ProductSubscription[] | null;
                setState(s => ({ ...s, product: subs?.[0] ?? null }));
            } catch {
                if (mounted) setState(s => ({ ...s, isConnected: false }));
            }

            purchaseSub = _purchaseUpdatedListener(async (purchase: Purchase) => {
                if (!mounted) return;
                setState(s => ({ ...s, isPurchasing: true }));
                try {
                    if (Platform.OS === 'ios') {
                        const txId = purchase.transactionId;
                        if (!txId) throw new Error('Transaction ID alınamadı.');
                        await onVerifyAppleRef.current(txId);
                    } else {
                        const token = purchase.purchaseToken;
                        if (!token) throw new Error('Purchase token alınamadı.');
                        await onVerifyGoogleRef.current(purchase.productId, token);
                    }
                    await _finishTransaction({ purchase, isConsumable: false });
                    onSuccessRef.current();
                } catch (err: any) {
                    const msg: string = err?.data?.message || err?.message || 'Abonelik doğrulanamadı.';
                    onErrorRef.current(msg);
                } finally {
                    if (mounted) setState(s => ({ ...s, isPurchasing: false }));
                }
            });

            errorSub = _purchaseErrorListener((error: PurchaseError) => {
                if (!mounted) return;
                setState(s => ({ ...s, isPurchasing: false }));
                if (error.code !== _ErrorCode.UserCancelled) {
                    onErrorRef.current(error.message || 'Satın alma başarısız.');
                }
            });
        };

        setup();

        return () => {
            mounted = false;
            purchaseSub?.remove();
            errorSub?.remove();
            _endConnection();
        };
    }, [sku]);

    const purchase = useCallback(async () => {
        if (!iap || !state.product || !state.isConnected) return;
        setState(s => ({ ...s, isPurchasing: true }));
        try {
            const androidOffer = (state.product as any)?.subscriptionOffers?.[0];
            const androidOfferToken: string | undefined = androidOffer?.offerToken;

            await _requestPurchase({
                type: 'subs',
                request: {
                    apple: {
                        sku,
                        appAccountToken: userId,
                    },
                    google: {
                        skus: [sku],
                        ...(androidOfferToken
                            ? { subscriptionOffers: [{ sku, offerToken: androidOfferToken }] }
                            : {}),
                        obfuscatedAccountId: userId,
                    },
                },
            });
        } catch (err: any) {
            setState(s => ({ ...s, isPurchasing: false }));
            if (err?.code !== _ErrorCode.UserCancelled) {
                onErrorRef.current(err?.message || 'Satın alma başlatılamadı.');
            }
        }
    }, [state.product, state.isConnected, sku, userId]);

    const localizedPrice: string | null =
        (state.product as any)?.subscriptionOffers?.[0]?.displayPrice ?? null;

    return {
        isConnected: state.isConnected,
        product: state.product,
        localizedPrice,
        isPurchasing: state.isPurchasing,
        purchase,
    };
}
