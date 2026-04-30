import { useCallback, useRef } from 'react';

/**
 * Arka arkaya verilen async görevleri sıraya alır; zincir kırılmasın diye hata yutulur.
 * Ayar kaydı gibi hızlı ardışık işlemlerde sunucuya giden payload’ın ref ile uyumlu kalması için kullanılır.
 */
export function useSerialAsyncQueue() {
    const tailRef = useRef<Promise<unknown>>(Promise.resolve());

    const enqueue = useCallback((task: () => Promise<void>) => {
        const next = tailRef.current.then(() => task(), () => task());
        tailRef.current = next.catch(() => {});
        return next;
    }, []);

    return enqueue;
}
