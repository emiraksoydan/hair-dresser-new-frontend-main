import React, { useCallback } from 'react';
import { BottomSheetModal, type BottomSheetModalProps } from '@gorhom/bottom-sheet';
import { useTheme } from '../../hook/useTheme';
import { useBottomSheet } from '../../hook/useBottomSheet';

/** Matches `SocialBottomModal` (`rounded-t-2xl`). */
export const SOCIAL_SHEET_TOP_RADIUS = 16;

export type SocialBottomSheetProps = Omit<
  BottomSheetModalProps,
  'ref' | 'onDismiss'
> & {
  sheet: ReturnType<typeof useBottomSheet>;
  onDismiss?: () => void;
};

export const SocialBottomSheet: React.FC<SocialBottomSheetProps> = ({
  sheet,
  onDismiss,
  children,
  snapPoints,
  backdropComponent,
  onChange,
  enablePanDownToClose,
  enableOverDrag,
  enableHandlePanningGesture,
  backgroundStyle,
  handleIndicatorStyle,
  ...rest
}) => {
  const { colors } = useTheme();

  const handleDismiss = useCallback(() => {
    sheet.handleDismiss();
    onDismiss?.();
  }, [sheet, onDismiss]);

  return (
    <BottomSheetModal
      ref={sheet.ref}
      snapPoints={snapPoints ?? sheet.snapPoints}
      enablePanDownToClose={enablePanDownToClose ?? sheet.enablePanDownToClose}
      enableOverDrag={enableOverDrag ?? sheet.enableOverDrag}
      enableHandlePanningGesture={enableHandlePanningGesture ?? sheet.enableHandlePanningGesture}
      backdropComponent={backdropComponent ?? sheet.makeBackdrop()}
      onChange={onChange ?? sheet.handleChange}
      onDismiss={handleDismiss}
      backgroundStyle={[
        {
          backgroundColor: colors.sheetBg,
          borderTopLeftRadius: SOCIAL_SHEET_TOP_RADIUS,
          borderTopRightRadius: SOCIAL_SHEET_TOP_RADIUS,
        },
        backgroundStyle,
      ]}
      handleStyle={{
        borderTopLeftRadius: SOCIAL_SHEET_TOP_RADIUS,
        borderTopRightRadius: SOCIAL_SHEET_TOP_RADIUS,
      }}
      handleIndicatorStyle={[
        { backgroundColor: colors.borderColor2 },
        handleIndicatorStyle,
      ]}
      {...rest}
    >
      {children}
    </BottomSheetModal>
  );
};
