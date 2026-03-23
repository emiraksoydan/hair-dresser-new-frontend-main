/**
 * Custom hook for appointment booking logic
 * Extracted from StoreBookingContent to reduce complexity
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { ChairSlotDto } from '../types';
import { normalizeTime, addMinutesToHHmm } from '../utils/time/time-helper';
import { APPOINTMENT_CONSTANTS } from '../constants/appointment';
import { useLanguage } from './useLanguage';

interface UseAppointmentBookingProps {
    chairs: ChairSlotDto[];
    preselectedServices?: string[];
}

export const useAppointmentBooking = ({ chairs, preselectedServices }: UseAppointmentBookingProps) => {
    const [selectedChairId, setSelectedChairId] = useState<string | null>(null);
    const [selectedSlotKeys, setSelectedSlotKeys] = useState<string[]>([]);
    const [selectedServices, setSelectedServices] = useState<string[]>(preselectedServices ?? []);

    // Preselected services varsa, bunları başlangıçta seçili yap
    useEffect(() => {
        if (preselectedServices && preselectedServices.length > 0) {
            setSelectedServices(preselectedServices);
        }
    }, [preselectedServices]);

    // Gün değiştiğinde veya chairs değiştiğinde ilk koltuk seç
    useEffect(() => {
        if (chairs.length > 0) {
            const currentChairExists = selectedChairId && chairs.some(c => c.chairId === selectedChairId);
            if (!currentChairExists) {
                setSelectedChairId(chairs[0].chairId);
            }
        } else {
            setSelectedChairId(null);
        }
    }, [chairs, selectedChairId]);

    const selectedChair = useMemo(
        () => chairs.find((c) => c.chairId === selectedChairId) ?? null,
        [chairs, selectedChairId]
    );

    useEffect(() => {
        setSelectedSlotKeys([]);
    }, [selectedChairId]);

    const onToggleSlot = useCallback((slot: { start: string }, isBooked: boolean, isPast: boolean) => {
        if (isBooked || isPast) return;
        const key = normalizeTime(slot.start);

        setSelectedSlotKeys((prev) => {
            if (prev.includes(key)) return prev.filter((k) => k !== key);

            const next = [...prev, key];
            // 1 saatlik ardışık slot kontrolü kaldırıldı - artık herhangi bir slot seçilebilir
            return next;
        });
    }, []);

    const startHHmm = useMemo(() => {
        if (selectedSlotKeys.length === 0) return null;
        return [...selectedSlotKeys].sort()[0];
    }, [selectedSlotKeys]);

    const endHHmm = useMemo(() => {
        if (!startHHmm) return null;
        return addMinutesToHHmm(startHHmm, selectedSlotKeys.length * APPOINTMENT_CONSTANTS.SLOT_DURATION_MINUTES);
    }, [startHHmm, selectedSlotKeys.length]);

    const toggleService = useCallback((id: string) => {
        setSelectedServices(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    }, []);

    return {
        selectedChairId,
        setSelectedChairId,
        selectedSlotKeys,
        setSelectedSlotKeys,
        selectedServices,
        toggleService,
        selectedChair,
        onToggleSlot,
        startHHmm,
        endHHmm,
    };
};
