import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../context/ToastContext';
import { FONTS } from '../../constants/theme';

const COLORS = {
    primary: '#FE9200',
    primaryLight: '#FFF5E6',
    background: '#F8F9FB',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
};

const PROPERTY_TYPES = [
    'Studio',
    '1 Bedroom',
    '2 Bedroom',
    '3 Bedroom',
    '4+ Bedroom',
    'Bedsitter',
    'Single Room',
    'Commercial',
];

const LOCATIONS = [
    'Kilimani',
    'Westlands',
    'Lavington',
    'Kileleshwa',
    'South B',
    'South C',
    'Langata',
    'Karen',
    'Embakasi',
    'Ruaka',
    'Kasarani',
    'Ngong Road',
];

const BUDGET_RANGES = [
    { label: 'Under KSh 15K', min: 0, max: 15000 },
    { label: 'KSh 15K - 30K', min: 15000, max: 30000 },
    { label: 'KSh 30K - 50K', min: 30000, max: 50000 },
    { label: 'KSh 50K - 75K', min: 50000, max: 75000 },
    { label: 'KSh 75K - 100K', min: 75000, max: 100000 },
    { label: 'Over KSh 100K', min: 100000, max: null },
];

const MOVE_IN_OPTIONS = [
    { label: 'Immediate', value: 'immediate' },
    { label: 'Within a week', value: 'week' },
    { label: 'Within a month', value: 'month' },
    { label: 'Flexible', value: 'flexible' },
];

const LEAD_STATUS = [
    { label: 'Available', value: 'available', icon: 'check-circle', color: '#10B981' },
    { label: 'Open', value: 'open', icon: 'clock', color: '#F59E0B' },
    { label: 'Sold Out', value: 'sold_out', icon: 'x-circle', color: '#EF4444' },
];

const LeadFiltersScreen = ({ navigation, route }) => {
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const { onApplyFilters, currentFilters } = route.params || {};

    const [filters, setFilters] = useState({
        propertyTypes: [],
        locations: [],
        budgetRange: null,
        moveIn: null,
        status: [],
        verifiedOnly: false,
        sortBy: 'newest',
    });

    useEffect(() => {
        if (currentFilters) {
            setFilters(prev => ({ ...prev, ...currentFilters }));
        }
    }, [currentFilters]);

    const togglePropertyType = (type) => {
        setFilters(prev => ({
            ...prev,
            propertyTypes: prev.propertyTypes.includes(type)
                ? prev.propertyTypes.filter(t => t !== type)
                : [...prev.propertyTypes, type],
        }));
    };

    const toggleLocation = (location) => {
        setFilters(prev => ({
            ...prev,
            locations: prev.locations.includes(location)
                ? prev.locations.filter(l => l !== location)
                : [...prev.locations, location],
        }));
    };

    const toggleStatus = (status) => {
        setFilters(prev => ({
            ...prev,
            status: prev.status.includes(status)
                ? prev.status.filter(s => s !== status)
                : [...prev.status, status],
        }));
    };

    const handleApply = () => {
        if (onApplyFilters) {
            onApplyFilters(filters);
        }
        navigation.goBack();
        toast.success('Filters applied');
    };

    const handleReset = () => {
        setFilters({
            propertyTypes: [],
            locations: [],
            budgetRange: null,
            moveIn: null,
            status: [],
            verifiedOnly: false,
            sortBy: 'newest',
        });
    };

    const getActiveFilterCount = () => {
        let count = 0;
        if (filters.propertyTypes.length > 0) count++;
        if (filters.locations.length > 0) count++;
        if (filters.budgetRange) count++;
        if (filters.moveIn) count++;
        if (filters.status.length > 0) count++;
        if (filters.verifiedOnly) count++;
        return count;
    };

    const ChipButton = ({ label, selected, onPress }) => (
        <TouchableOpacity
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    const StatusChip = ({ item, selected }) => (
        <TouchableOpacity
            style={[styles.statusChip, selected && styles.statusChipSelected]}
            onPress={() => toggleStatus(item.value)}
            activeOpacity={0.7}
        >
            <Feather
                name={item.icon}
                size={16}
                color={selected ? '#FFFFFF' : item.color}
            />
            <Text style={[styles.statusChipText, selected && styles.statusChipTextSelected]}>
                {item.label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => navigation.goBack()}
                >
                    <Feather name="x" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Filter Leads</Text>
                <TouchableOpacity onPress={handleReset}>
                    <Text style={styles.resetText}>Reset</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Property Type */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Property Type</Text>
                    <View style={styles.chipsContainer}>
                        {PROPERTY_TYPES.map((type) => (
                            <ChipButton
                                key={type}
                                label={type}
                                selected={filters.propertyTypes.includes(type)}
                                onPress={() => togglePropertyType(type)}
                            />
                        ))}
                    </View>
                </View>

                {/* Location */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Location</Text>
                    <View style={styles.chipsContainer}>
                        {LOCATIONS.map((location) => (
                            <ChipButton
                                key={location}
                                label={location}
                                selected={filters.locations.includes(location)}
                                onPress={() => toggleLocation(location)}
                            />
                        ))}
                    </View>
                </View>

                {/* Budget Range */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Budget Range</Text>
                    <View style={styles.optionsContainer}>
                        {BUDGET_RANGES.map((range, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.optionButton,
                                    filters.budgetRange?.label === range.label && styles.optionButtonSelected,
                                ]}
                                onPress={() => setFilters(prev => ({
                                    ...prev,
                                    budgetRange: prev.budgetRange?.label === range.label ? null : range,
                                }))}
                            >
                                <Text style={[
                                    styles.optionText,
                                    filters.budgetRange?.label === range.label && styles.optionTextSelected,
                                ]}>
                                    {range.label}
                                </Text>
                                {filters.budgetRange?.label === range.label && (
                                    <Feather name="check" size={16} color={COLORS.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Move-in Date */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Move-in Date</Text>
                    <View style={styles.chipsContainer}>
                        {MOVE_IN_OPTIONS.map((option) => (
                            <ChipButton
                                key={option.value}
                                label={option.label}
                                selected={filters.moveIn === option.value}
                                onPress={() => setFilters(prev => ({
                                    ...prev,
                                    moveIn: prev.moveIn === option.value ? null : option.value,
                                }))}
                            />
                        ))}
                    </View>
                </View>

                {/* Lead Status */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Lead Status</Text>
                    <View style={styles.statusContainer}>
                        {LEAD_STATUS.map((status) => (
                            <StatusChip
                                key={status.value}
                                item={status}
                                selected={filters.status.includes(status.value)}
                            />
                        ))}
                    </View>
                </View>

                {/* Verified Only Toggle */}
                <TouchableOpacity
                    style={styles.toggleRow}
                    onPress={() => setFilters(prev => ({ ...prev, verifiedOnly: !prev.verifiedOnly }))}
                >
                    <View style={styles.toggleInfo}>
                        <Feather name="check-circle" size={20} color={COLORS.success} />
                        <Text style={styles.toggleLabel}>Verified tenants only</Text>
                    </View>
                    <View style={[
                        styles.toggle,
                        filters.verifiedOnly && styles.toggleActive,
                    ]}>
                        <View style={[
                            styles.toggleKnob,
                            filters.verifiedOnly && styles.toggleKnobActive,
                        ]} />
                    </View>
                </TouchableOpacity>

                {/* Sort By */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Sort By</Text>
                    <View style={styles.sortOptions}>
                        {[
                            { label: 'Newest First', value: 'newest' },
                            { label: 'Budget: High to Low', value: 'budget_desc' },
                            { label: 'Budget: Low to High', value: 'budget_asc' },
                            { label: 'Most Views', value: 'views' },
                        ].map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                style={[
                                    styles.sortOption,
                                    filters.sortBy === option.value && styles.sortOptionSelected,
                                ]}
                                onPress={() => setFilters(prev => ({ ...prev, sortBy: option.value }))}
                            >
                                <View style={[
                                    styles.radioCircle,
                                    filters.sortBy === option.value && styles.radioCircleSelected,
                                ]}>
                                    {filters.sortBy === option.value && (
                                        <View style={styles.radioFill} />
                                    )}
                                </View>
                                <Text style={styles.sortOptionText}>{option.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Bottom Bar */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
                <View style={styles.filterCount}>
                    <Text style={styles.filterCountText}>
                        {getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''} selected
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.applyButton}
                    onPress={handleApply}
                >
                    <Feather name="check" size={18} color="#FFFFFF" />
                    <Text style={styles.applyButtonText}>Apply Filters</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    closeButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    resetText: {
        fontSize: 14,
        fontFamily: FONTS.semiBold,
        color: COLORS.primary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    // Sections
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 15,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        marginBottom: 12,
    },
    // Chips
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    chipSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    chipText: {
        fontSize: 13,
        fontFamily: FONTS.medium,
        color: COLORS.text,
    },
    chipTextSelected: {
        color: '#FFFFFF',
    },
    // Status Chips
    statusContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    statusChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    statusChipSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    statusChipText: {
        fontSize: 12,
        fontFamily: FONTS.medium,
        color: COLORS.text,
    },
    statusChipTextSelected: {
        color: '#FFFFFF',
    },
    // Options
    optionsContainer: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    optionButtonSelected: {
        backgroundColor: COLORS.primaryLight,
    },
    optionText: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: COLORS.text,
    },
    optionTextSelected: {
        color: COLORS.primary,
        fontFamily: FONTS.semiBold,
    },
    // Toggle
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    toggleInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    toggleLabel: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: COLORS.text,
    },
    toggle: {
        width: 50,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.border,
        padding: 2,
    },
    toggleActive: {
        backgroundColor: COLORS.primary,
    },
    toggleKnob: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.card,
    },
    toggleKnobActive: {
        marginLeft: 'auto',
    },
    // Sort Options
    sortOptions: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    sortOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        gap: 12,
    },
    sortOptionSelected: {
        backgroundColor: COLORS.primaryLight,
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioCircleSelected: {
        borderColor: COLORS.primary,
    },
    radioFill: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.primary,
    },
    sortOptionText: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: COLORS.text,
    },
    // Bottom Bar
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.card,
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    filterCount: {
        flex: 1,
    },
    filterCountText: {
        fontSize: 13,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
    },
    applyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 24,
        height: 48,
        backgroundColor: COLORS.primary,
        borderRadius: 12,
    },
    applyButtonText: {
        fontSize: 15,
        fontFamily: FONTS.bold,
        color: '#FFFFFF',
    },
});

export default LeadFiltersScreen;
