import { useRef, useCallback, useState } from 'react';
import { BottomSheetModal, BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';

export type UseBottomSheetOptions = {
    snapPoints?: (string | number)[];
    enablePanDownToClose?: boolean;
    enableOverDrag?: boolean;
    /** false: tutacakla sheet konumu değişmez (CRUD formları için) */
    enableHandlePanningGesture?: boolean;
    appearsOnIndex?: number;
    disappearsOnIndex?: number;
    pressBehavior?: 'close' | 'collapse' | 'none';
};

export const useBottomSheet = (options: UseBottomSheetOptions = {}) => {
    const ref = useRef<BottomSheetModal>(null);
    const [isOpen, setIsOpen] = useState(false);

    const {
        snapPoints = ['50%'],
        enablePanDownToClose = true,
        enableOverDrag = false,
        enableHandlePanningGesture,
        appearsOnIndex = 0,
        disappearsOnIndex = -1,
        pressBehavior = 'close',
    } = options;

    const present = useCallback(() => {
        if (ref.current) {
            try {
                ref.current.present();
                // Eagerly set open so DeferredRender doesn't wait for onChange
                // (onChange can be unreliable on Android with 100% snap + no pan gesture)
                setIsOpen(true);
            } catch (error) {
                // Silently fail - ref might not be ready yet
            }
        }
    }, []);

    const dismiss = useCallback(() => {
        if (ref.current) {
            try {
                ref.current.dismiss();
            } catch (error) {
                // Hata durumunda sessizce geç
            }
        }
    }, []);

    const handleDismiss = useCallback(() => {
        setIsOpen(false);
    }, []);

    const makeBackdrop = useCallback(
        () => (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={appearsOnIndex}
                disappearsOnIndex={disappearsOnIndex}
                pressBehavior={pressBehavior}
            />
        ),
        [appearsOnIndex, disappearsOnIndex, pressBehavior]
    );

    const handleChange = useCallback((index: number) => {
        setIsOpen(index >= 0);
    }, []);

    return {
        ref,
        isOpen,
        present,
        dismiss,
        makeBackdrop,
        handleChange,
        handleDismiss,
        snapPoints,
        enablePanDownToClose,
        enableOverDrag,
        enableHandlePanningGesture,
    };
};

