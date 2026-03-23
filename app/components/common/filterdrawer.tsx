/**
 * Yan panel filter drawer component
 * Soldan açılır, hem swipe hem de buton ile kontrol edilebilir
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { View, TouchableOpacity, ScrollView, Dimensions, Modal, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Divider, Icon, TextInput } from 'react-native-paper';
import { MultiSelect } from 'react-native-element-dropdown';
import { useCategoryHierarchy } from '../../hook/useCategoryHierarchy';
import { useLanguage } from '../../hook/useLanguage';
import { useTheme } from '../../hook/useTheme';

const DRAWER_WIDTH = Dimensions.get('window').width * 0.85;

interface FilterDrawerProps {
    visible: boolean;
    onClose: () => void;

    // Tür seçimi (Free Barber / Dükkan / Hepsi)
    selectedUserType: string;
    onChangeUserType: (type: string) => void;
    showUserTypeFilter?: boolean;

    // Ana Kategori seçimi (Erkek Berber / Kadın Kuaför / Güzellik Salonu / Hepsi)
    selectedMainCategory: string;
    onChangeMainCategory: (category: string) => void;

    // Ana Başlıklar (çoklu)
    selectedMainHeadings: string[];
    onChangeMainHeadings: (headings: string[]) => void;

    // Alt Başlıklar (çoklu)
    selectedSubHeadings: string[];
    onChangeSubHeadings: (headings: string[]) => void;

    // Hizmet seçimi (çoklu) - ID olarak
    selectedServices: string[];
    onChangeServices: (services: string[]) => void;

    // Fiyat seçimi
    priceSort: 'none' | 'asc' | 'desc';
    onChangePriceSort: (sort: 'none' | 'asc' | 'desc') => void;
    minPrice: string;
    maxPrice: string;
    onChangeMinPrice: (price: string) => void;
    onChangeMaxPrice: (price: string) => void;

    // Free barberler için dükkan fiyatlandırma türü
    showPricingType?: boolean;
    selectedPricingType: string;
    onChangePricingType: (type: string) => void;

    // Durum filtresi
    statusFilter: 'all' | 'available' | 'unavailable';
    onChangeStatus: (filter: 'all' | 'available' | 'unavailable') => void;

    // Puanlama filtresi
    selectedRating: number;
    onChangeRating: (rating: number) => void;

    // Favori filtresi
    showFavoritesOnly: boolean;
    onChangeFavoritesOnly: (value: boolean) => void;

    // Temizle butonu
    onClearFilters: () => void;
}

// Chip bileşeni - tekrar kullanılabilir
const FilterChipItem = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => {
    const { colors } = useTheme();
    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                backgroundColor: selected ? '#ffb900' : colors.cardBg2,
                borderColor: selected ? '#ffb900' : colors.borderColor,
                borderWidth: 1,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
            }}
            activeOpacity={0.7}
        >
            <Text style={{
                color: selected ? '#1a1b25' : colors.sectionHeaderText,
                fontSize: 13,
                fontWeight: selected ? '600' : '400',
                fontFamily: 'CenturyGothic',
            }}>
                {label}
            </Text>
        </TouchableOpacity>
    );
};


export const FilterDrawer: React.FC<FilterDrawerProps> = ({
    visible,
    onClose,
    selectedUserType,
    onChangeUserType,
    showUserTypeFilter = true,
    selectedMainCategory,
    onChangeMainCategory,
    selectedMainHeadings,
    onChangeMainHeadings,
    selectedSubHeadings,
    onChangeSubHeadings,
    selectedServices,
    onChangeServices,
    priceSort,
    onChangePriceSort,
    minPrice,
    maxPrice,
    onChangeMinPrice,
    onChangeMaxPrice,
    showPricingType = false,
    selectedPricingType,
    onChangePricingType,
    statusFilter,
    onChangeStatus,
    selectedRating,
    onChangeRating,
    showFavoritesOnly,
    onChangeFavoritesOnly,
    onClearFilters,
}) => {
    const { t } = useLanguage();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const translateX = useSharedValue(-DRAWER_WIDTH);

    const multiSelectStylesDynamic = useMemo(() => ({
        style: {
            backgroundColor: colors.cardBg2,
            borderColor: colors.borderColor,
            borderWidth: 1,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginBottom: 16,
        },
        containerStyle: {
            backgroundColor: colors.cardBg2,
            borderWidth: 1,
            borderColor: colors.borderColor,
            borderRadius: 12,
            overflow: 'hidden' as const,
        },
        inputSearchStyle: {
            backgroundColor: colors.cardBg2,
            borderColor: '#ffb900',
            borderWidth: 1,
            borderRadius: 8,
            color: colors.sectionHeaderText,
            paddingHorizontal: 12,
            paddingVertical: 8,
        },
        placeholderStyle: { color: colors.textSecondary, fontSize: 14, fontFamily: 'CenturyGothic' as const },
        selectedTextStyle: { color: colors.sectionHeaderText, fontSize: 14, fontFamily: 'CenturyGothic' as const },
        itemTextStyle: { color: colors.sectionHeaderText, fontSize: 14, fontFamily: 'CenturyGothic' as const },
        selectedStyle: {
            borderRadius: 8,
            backgroundColor: colors.borderColor,
            borderColor: '#ffb900',
            paddingHorizontal: 8,
            paddingVertical: 4,
            margin: 2,
        },
    }), [colors]);
    const prevMainCategoryRef = useRef(selectedMainCategory);
    const prevMainHeadingsRef = useRef(selectedMainHeadings);
    const prevSubHeadingsRef = useRef(selectedSubHeadings);

    // useCategoryHierarchy hook
    const {
        parentCategories,
        mainHeadings,
        subHeadings,
        services,
    } = useCategoryHierarchy({
        selectedType: selectedMainCategory !== 'all' ? selectedMainCategory : null,
        selectedMainHeadings,
        selectedSubHeadings,
    });

    // Cascade reset: mainCategory değişince alt seçimleri sıfırla
    useEffect(() => {
        if (prevMainCategoryRef.current !== selectedMainCategory) {
            prevMainCategoryRef.current = selectedMainCategory;
            onChangeMainHeadings([]);
            onChangeSubHeadings([]);
            onChangeServices([]);
        }
    }, [selectedMainCategory]);

    // Cascade reset: mainHeadings değişince alt seçimleri sıfırla
    useEffect(() => {
        const prev = prevMainHeadingsRef.current;
        const curr = selectedMainHeadings;
        if (prev.length !== curr.length || prev.some((v, i) => v !== curr[i])) {
            prevMainHeadingsRef.current = curr;
            onChangeSubHeadings([]);
            onChangeServices([]);
        }
    }, [selectedMainHeadings]);

    // Cascade reset: subHeadings değişince hizmetleri sıfırla
    useEffect(() => {
        const prev = prevSubHeadingsRef.current;
        const curr = selectedSubHeadings;
        if (prev.length !== curr.length || prev.some((v, i) => v !== curr[i])) {
            prevSubHeadingsRef.current = curr;
            onChangeServices([]);
        }
    }, [selectedSubHeadings]);

    // Dropdown options
    const mainHeadingsOptions = useMemo(() =>
        mainHeadings.map((cat) => ({ label: cat.name, value: cat.name })),
        [mainHeadings]
    );

    const subHeadingsOptions = useMemo(() =>
        subHeadings.map((cat) => ({ label: cat.name, value: cat.name })),
        [subHeadings]
    );

    // Hizmetler: value = id (backend'e GUID gönderilmeli)
    const servicesOptions = useMemo(() =>
        services.map((cat) => ({ label: cat.name, value: cat.id })),
        [services]
    );

    // Drawer animasyonu
    useEffect(() => {
        if (visible) {
            translateX.value = withTiming(0, { duration: 300 });
        } else {
            translateX.value = withTiming(-DRAWER_WIDTH, { duration: 300 });
        }
    }, [visible]);

    const drawerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: visible ? withTiming(1, { duration: 300 }) : withTiming(0, { duration: 300 }),
    }));

    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            if (event.translationX < 0) {
                translateX.value = event.translationX;
            }
        })
        .onEnd((event) => {
            if (event.translationX < -DRAWER_WIDTH / 3 || event.velocityX < -500) {
                translateX.value = withTiming(-DRAWER_WIDTH, { duration: 300 });
                runOnJS(onClose)();
            } else {
                translateX.value = withTiming(0, { duration: 300 });
            }
        });

    // Options
    const userTypeOptions = [
        { key: 'all', label: t('filters.all') },
        { key: 'freeBarber', label: t('labels.freeBarber') },
        { key: 'store', label: t('labels.store') },
    ];

    const mainCategories = useMemo(() => {
        const categories = parentCategories.map((cat: any) => cat.name);
        return Array.from(new Set(['all', ...categories]));
    }, [parentCategories]);

    const getMainCategoryLabel = (category: string) => {
        if (category === 'all') return t('filters.all');
        return category;
    };

    const pricingTypeOptions = [
        { key: 'all', label: t('filters.all') },
        { key: 'rent', label: t('filters.rental') },
        { key: 'percent', label: t('filters.percentage') },
    ];

    const statusOptions = [
        { label: t('filters.all'), value: 'all' },
        { label: t('filters.availableOpen'), value: 'available' },
        { label: t('filters.unavailableClosed'), value: 'unavailable' },
    ];

    const ratingOptions = [
        { label: t('filters.all'), value: 0 },
        { label: '1+', value: 1 },
        { label: '2+', value: 2 },
        { label: '3+', value: 3 },
        { label: '4+', value: 4 },
        { label: '5', value: 5 },
    ];

    const favoriteOptions = [
        { label: t('filters.all'), value: false },
        { label: t('filters.onlyFavorites'), value: true },
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.container}>
                {/* Backdrop */}
                <Animated.View style={[styles.backdrop, backdropStyle]}>
                    <TouchableOpacity
                        style={styles.backdropTouchable}
                        activeOpacity={1}
                        onPress={onClose}
                    />
                </Animated.View>

                {/* Drawer */}
                <GestureDetector gesture={panGesture}>
                    <Animated.View style={[styles.drawer, { backgroundColor: colors.sheetBg }, drawerStyle]}>
                        {/* Header */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: Math.max(16, insets.top + 8), borderBottomWidth: 1, borderBottomColor: colors.borderColor }}>
                            <Text className="text-white text-xl font-century-gothic-bold" style={{ color: colors.sectionHeaderText }}>{t('filters.title')}</Text>
                            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                                <Icon source="close" size={22} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Content */}
                        <ScrollView
                            className="flex-1 px-4"
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 100, paddingTop: 16 }}
                        >
                            {/* Kullanıcı Türü */}
                            {showUserTypeFilter && (
                                <>
                                    <Text style={{ color: colors.sectionHeaderText, fontSize: 14, fontFamily: 'CenturyGothicBold', marginBottom: 10 }}>
                                        {t('filters.userType')}
                                    </Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
                                        {userTypeOptions.map((option) => (
                                            <FilterChipItem
                                                key={option.key}
                                                label={option.label}
                                                selected={selectedUserType === option.key}
                                                onPress={() => onChangeUserType(option.key)}
                                            />
                                        ))}
                                    </ScrollView>
                                    <Divider style={{ backgroundColor: colors.borderColor, marginBottom: 16 }} />
                                </>
                            )}

                            {/* Ana Kategori */}
                            <Text style={{ color: colors.sectionHeaderText, fontSize: 14, fontFamily: 'CenturyGothicBold', marginBottom: 10 }}>
                                {t('filters.mainCategory')}
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
                                {mainCategories.map((category, index) => (
                                    <FilterChipItem
                                        key={category === 'all' ? 'category-all' : `category-${index}-${category}`}
                                        label={getMainCategoryLabel(category)}
                                        selected={selectedMainCategory === category}
                                        onPress={() => onChangeMainCategory(category)}
                                    />
                                ))}
                            </ScrollView>
                            <Divider style={{ backgroundColor: colors.borderColor, marginBottom: 16 }} />

                            {/* Ana Başlıklar */}
                            {mainHeadingsOptions.length > 0 && (
                                <>
                                    <Text style={{ color: colors.sectionHeaderText, fontSize: 14, fontFamily: 'CenturyGothicBold', marginBottom: 10 }}>
                                        {t('form.mainHeadings')}
                                    </Text>
                                    <MultiSelect
                                        data={mainHeadingsOptions}
                                        labelField="label"
                                        valueField="value"
                                        value={selectedMainHeadings}
                                        onChange={onChangeMainHeadings}
                                        placeholder={t('form.selectMainHeadings')}
                                        search
                                        searchPlaceholder={t('common.search')}
                                        dropdownPosition="auto"
                                        inside
                                        alwaysRenderSelectedItem
                                        visibleSelectedItem
                                        style={multiSelectStylesDynamic.style}
                                        containerStyle={multiSelectStylesDynamic.containerStyle}
                                        inputSearchStyle={multiSelectStylesDynamic.inputSearchStyle}
                                        placeholderStyle={multiSelectStylesDynamic.placeholderStyle}
                                        selectedTextStyle={multiSelectStylesDynamic.selectedTextStyle}
                                        itemTextStyle={multiSelectStylesDynamic.itemTextStyle}
                                        activeColor="#ffb900"
                                        selectedStyle={multiSelectStylesDynamic.selectedStyle}
                                        selectedTextProps={{ numberOfLines: 1 }}
                                    />
                                    <Divider style={{ backgroundColor: colors.borderColor, marginBottom: 16 }} />
                                </>
                            )}

                            {/* Alt Başlıklar */}
                            {subHeadingsOptions.length > 0 && (
                                <>
                                    <Text style={{ color: colors.sectionHeaderText, fontSize: 14, fontFamily: 'CenturyGothicBold', marginBottom: 10 }}>
                                        {t('form.subHeadings')}
                                    </Text>
                                    <MultiSelect
                                        data={subHeadingsOptions}
                                        labelField="label"
                                        valueField="value"
                                        value={selectedSubHeadings}
                                        onChange={onChangeSubHeadings}
                                        placeholder={t('form.selectSubHeadings')}
                                        search
                                        searchPlaceholder={t('common.search')}
                                        dropdownPosition="auto"
                                        inside
                                        alwaysRenderSelectedItem
                                        visibleSelectedItem
                                        style={multiSelectStylesDynamic.style}
                                        containerStyle={multiSelectStylesDynamic.containerStyle}
                                        inputSearchStyle={multiSelectStylesDynamic.inputSearchStyle}
                                        placeholderStyle={multiSelectStylesDynamic.placeholderStyle}
                                        selectedTextStyle={multiSelectStylesDynamic.selectedTextStyle}
                                        itemTextStyle={multiSelectStylesDynamic.itemTextStyle}
                                        activeColor="#ffb900"
                                        selectedStyle={multiSelectStylesDynamic.selectedStyle}
                                        selectedTextProps={{ numberOfLines: 1 }}
                                    />
                                    <Divider style={{ backgroundColor: colors.borderColor, marginBottom: 16 }} />
                                </>
                            )}

                            {/* Hizmetler */}
                            {servicesOptions.length > 0 && (
                                <>
                                    <Text style={{ color: colors.sectionHeaderText, fontSize: 14, fontFamily: 'CenturyGothicBold', marginBottom: 10 }}>
                                        {t('filters.services')}
                                    </Text>
                                    <MultiSelect
                                        data={servicesOptions}
                                        labelField="label"
                                        valueField="value"
                                        value={selectedServices}
                                        onChange={onChangeServices}
                                        placeholder={t('filters.selectService')}
                                        search
                                        searchPlaceholder={t('common.search')}
                                        dropdownPosition="auto"
                                        inside
                                        alwaysRenderSelectedItem
                                        visibleSelectedItem
                                        style={multiSelectStylesDynamic.style}
                                        containerStyle={multiSelectStylesDynamic.containerStyle}
                                        inputSearchStyle={multiSelectStylesDynamic.inputSearchStyle}
                                        placeholderStyle={multiSelectStylesDynamic.placeholderStyle}
                                        selectedTextStyle={multiSelectStylesDynamic.selectedTextStyle}
                                        itemTextStyle={multiSelectStylesDynamic.itemTextStyle}
                                        activeColor="#ffb900"
                                        selectedStyle={multiSelectStylesDynamic.selectedStyle}
                                        selectedTextProps={{ numberOfLines: 1 }}
                                    />
                                    <Divider style={{ backgroundColor: colors.borderColor, marginBottom: 16 }} />
                                </>
                            )}

                            {/* Fiyatlandırma Türü */}
                            {showPricingType && (
                                <>
                                    <Text style={{ color: colors.sectionHeaderText, fontSize: 14, fontFamily: 'CenturyGothicBold', marginBottom: 10 }}>
                                        {t('filters.pricingType')}
                                    </Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
                                        {pricingTypeOptions.map((option) => (
                                            <FilterChipItem
                                                key={option.key}
                                                label={option.label}
                                                selected={selectedPricingType === option.key}
                                                onPress={() => onChangePricingType(option.key)}
                                            />
                                        ))}
                                    </ScrollView>
                                    <Divider style={{ backgroundColor: colors.borderColor, marginBottom: 16 }} />
                                </>
                            )}

                            {/* Fiyat Sıralaması */}
                            <Text style={{ color: colors.sectionHeaderText, fontSize: 14, fontFamily: 'CenturyGothicBold', marginBottom: 10 }}>
                                {t('filters.priceSort')}
                            </Text>
                            <View className="flex-row gap-2 mb-4">
                                <TouchableOpacity
                                    onPress={() => onChangePriceSort(priceSort === 'asc' ? 'none' : 'asc')}
                                    style={{
                                        flex: 1,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        backgroundColor: priceSort === 'asc' ? '#ffb900' : colors.cardBg2,
                                        borderColor: priceSort === 'asc' ? '#ffb900' : colors.borderColor,
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Icon source="arrow-up" size={16} color={priceSort === 'asc' ? '#1a1b25' : colors.sectionHeaderText} />
                                    <Text style={{ fontSize: 13, marginLeft: 4, color: priceSort === 'asc' ? '#1a1b25' : colors.sectionHeaderText, fontWeight: priceSort === 'asc' ? '600' : '400' }}>
                                        {t('filters.lowest')}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => onChangePriceSort(priceSort === 'desc' ? 'none' : 'desc')}
                                    style={{
                                        flex: 1,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        backgroundColor: priceSort === 'desc' ? '#ffb900' : colors.cardBg2,
                                        borderColor: priceSort === 'desc' ? '#ffb900' : colors.borderColor,
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Icon source="arrow-down" size={16} color={priceSort === 'desc' ? '#1a1b25' : colors.sectionHeaderText} />
                                    <Text style={{ fontSize: 13, marginLeft: 4, color: priceSort === 'desc' ? '#1a1b25' : colors.sectionHeaderText, fontWeight: priceSort === 'desc' ? '600' : '400' }}>
                                        {t('filters.highest')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <Divider style={{ backgroundColor: colors.borderColor, marginBottom: 16 }} />

                            {/* Fiyat Aralığı */}
                            <Text style={{ color: colors.sectionHeaderText, fontSize: 14, fontFamily: 'CenturyGothicBold', marginBottom: 10 }}>
                                {t('filters.priceRange')}
                            </Text>
                            <View className="flex-row items-center gap-3 mb-4">
                                <View className="flex-1">
                                    <TextInput
                                        label={t('filters.minPrice')}
                                        mode="outlined"
                                        dense
                                        keyboardType="numeric"
                                        value={minPrice}
                                        onChangeText={(text) => onChangeMinPrice(text.replace(/[^\d]/g, ''))}
                                        placeholder="0"
                                        textColor={colors.sectionHeaderText}
                                        outlineColor={colors.borderColor}
                                        theme={{ roundness: 12, colors: { onSurfaceVariant: colors.textSecondary, primary: '#ffb900' } }}
                                        style={{ backgroundColor: colors.cardBg2, borderWidth: 0 }}
                                    />
                                </View>
                                <Text style={{ color: colors.textSecondary, marginTop: 8 }}>-</Text>
                                <View className="flex-1">
                                    <TextInput
                                        label={t('filters.maxPrice')}
                                        mode="outlined"
                                        dense
                                        keyboardType="numeric"
                                        value={maxPrice}
                                        onChangeText={(text) => onChangeMaxPrice(text.replace(/[^\d]/g, ''))}
                                        placeholder="∞"
                                        textColor={colors.sectionHeaderText}
                                        outlineColor={colors.borderColor}
                                        theme={{ roundness: 12, colors: { onSurfaceVariant: colors.textSecondary, primary: '#ffb900' } }}
                                        style={{ backgroundColor: colors.cardBg2, borderWidth: 0 }}
                                    />
                                </View>
                            </View>
                            <Divider style={{ backgroundColor: colors.borderColor, marginBottom: 16 }} />

                            {/* Durum Filtresi */}
                            <Text style={{ color: colors.sectionHeaderText, fontSize: 14, fontFamily: 'CenturyGothicBold', marginBottom: 10 }}>
                                {t('filters.status')}
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
                                {statusOptions.map((option) => (
                                    <FilterChipItem
                                        key={option.value}
                                        label={option.label}
                                        selected={statusFilter === option.value}
                                        onPress={() => onChangeStatus(option.value as any)}
                                    />
                                ))}
                            </ScrollView>
                            <Divider style={{ backgroundColor: colors.borderColor, marginBottom: 16 }} />

                            {/* Puanlama Filtresi */}
                            <Text style={{ color: colors.sectionHeaderText, fontSize: 14, fontFamily: 'CenturyGothicBold', marginBottom: 10 }}>
                                {t('filters.minimumRating')}
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
                                {ratingOptions.map((option) => (
                                    <FilterChipItem
                                        key={option.value}
                                        label={option.value === 0 ? option.label : `⭐ ${option.label}`}
                                        selected={selectedRating === option.value}
                                        onPress={() => onChangeRating(option.value)}
                                    />
                                ))}
                            </ScrollView>
                            <Divider style={{ backgroundColor: colors.borderColor, marginBottom: 16 }} />

                            {/* Favori Filtresi */}
                            <Text style={{ color: colors.sectionHeaderText, fontSize: 14, fontFamily: 'CenturyGothicBold', marginBottom: 10 }}>
                                {t('filters.favoriteFilter')}
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
                                {favoriteOptions.map((option) => (
                                    <FilterChipItem
                                        key={String(option.value)}
                                        label={option.label}
                                        selected={showFavoritesOnly === option.value}
                                        onPress={() => onChangeFavoritesOnly(option.value)}
                                    />
                                ))}
                            </ScrollView>
                        </ScrollView>

                        {/* Footer - Temizle Butonu */}
                        <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.borderColor }}>
                            <TouchableOpacity
                                onPress={onClearFilters}
                                style={{
                                    width: '100%',
                                    borderWidth: 1.5,
                                    borderColor: '#ffb900',
                                    borderRadius: 12,
                                    paddingVertical: 12,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={{ color: '#ffb900', fontSize: 14, fontWeight: '600', fontFamily: 'CenturyGothic' }}>
                                    {t('filters.clear')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </GestureDetector>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    backdropTouchable: {
        flex: 1,
    },
    drawer: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: DRAWER_WIDTH,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 20,
    },
});
