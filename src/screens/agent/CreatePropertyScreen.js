import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
    createProperty,
    updateProperty,
    PROPERTY_TYPES,
    LISTING_TYPES,
    AMENITIES,
} from '../../lib/propertyService';

const COLORS = {
    primary: '#FE9200',
    primaryLight: '#FFF5E6',
    background: '#F8F9FB',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    textLight: '#9CA3AF',
    border: '#E5E7EB',
    success: '#10B981',
    error: '#EF4444',
};

const CreatePropertyScreen = ({ navigation, route }) => {
    const editProperty = route.params?.editProperty;
    const isEditing = !!editProperty;
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const toast = useToast();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [propertyType, setPropertyType] = useState('apartment');
    const [listingType, setListingType] = useState('rent');
    const [price, setPrice] = useState('');
    const [bedrooms, setBedrooms] = useState('');
    const [bathrooms, setBathrooms] = useState('');
    const [area, setArea] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [selectedAmenities, setSelectedAmenities] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (editProperty) {
            setTitle(editProperty.title || '');
            setDescription(editProperty.description || '');
            setPropertyType(editProperty.property_type || 'apartment');
            setListingType(editProperty.listing_type || 'rent');
            setPrice(editProperty.price?.toString() || '');
            setBedrooms(editProperty.bedrooms?.toString() || '');
            setBathrooms(editProperty.bathrooms?.toString() || '');
            setArea(editProperty.area?.toString() || '');
            setAddress(editProperty.address || '');
            setCity(editProperty.city || '');
            setSelectedAmenities(editProperty.amenities || []);
        }
    }, [editProperty]);

    const toggleAmenity = (amenity) => {
        setSelectedAmenities(prev =>
            prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
        );
    };

    const isValid = title.trim().length >= 3 && price && city.trim().length >= 2;

    const handleSubmit = async () => {
        if (!isValid || submitting) return;

        setSubmitting(true);
        try {
            const propertyData = {
                agentId: user.id,
                title: title.trim(),
                description: description.trim(),
                propertyType,
                listingType,
                price: parseFloat(price),
                bedrooms: bedrooms ? parseInt(bedrooms) : null,
                bathrooms: bathrooms ? parseInt(bathrooms) : null,
                area: area ? parseFloat(area) : null,
                address: address.trim(),
                city: city.trim(),
                amenities: selectedAmenities,
            };

            let result;
            if (isEditing) {
                result = await updateProperty(editProperty.id, {
                    title: propertyData.title,
                    description: propertyData.description,
                    property_type: propertyData.propertyType,
                    listing_type: propertyData.listingType,
                    price: propertyData.price,
                    bedrooms: propertyData.bedrooms,
                    bathrooms: propertyData.bathrooms,
                    area: propertyData.area,
                    address: propertyData.address,
                    city: propertyData.city,
                    amenities: propertyData.amenities,
                });
            } else {
                result = await createProperty(propertyData);
            }

            if (result.success) {
                toast.success(isEditing ? 'Property updated' : 'Property created');
                navigation.goBack();
            } else {
                toast.error(result.error || 'Failed to save property');
            }
        } catch (error) {
            toast.error('Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Feather name="chevron-left" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {isEditing ? 'Edit Property' : 'Add Property'}
                </Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Title */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Property Title *</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="e.g., Modern 2BR Apartment in Kilimani"
                        placeholderTextColor={COLORS.textLight}
                        value={title}
                        onChangeText={setTitle}
                        maxLength={100}
                    />
                </View>

                {/* Property Type */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Property Type</Text>
                    <View style={styles.chipGrid}>
                        {PROPERTY_TYPES.map((pt) => (
                            <TouchableOpacity
                                key={pt.id}
                                style={[styles.chip, propertyType === pt.id && styles.chipActive]}
                                onPress={() => setPropertyType(pt.id)}
                            >
                                <Feather
                                    name={pt.icon}
                                    size={14}
                                    color={propertyType === pt.id ? COLORS.primary : COLORS.textSecondary}
                                />
                                <Text style={[styles.chipText, propertyType === pt.id && styles.chipTextActive]}>
                                    {pt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Listing Type */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Listing Type</Text>
                    <View style={styles.toggleRow}>
                        {LISTING_TYPES.map((lt) => (
                            <TouchableOpacity
                                key={lt.id}
                                style={[styles.toggleBtn, listingType === lt.id && styles.toggleBtnActive]}
                                onPress={() => setListingType(lt.id)}
                            >
                                <Text style={[styles.toggleText, listingType === lt.id && styles.toggleTextActive]}>
                                    {lt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Price */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Price (KES) *</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="e.g., 25000"
                        placeholderTextColor={COLORS.textLight}
                        value={price}
                        onChangeText={setPrice}
                        keyboardType="numeric"
                    />
                </View>

                {/* Bedrooms / Bathrooms */}
                <View style={styles.rowFields}>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Bedrooms</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="0"
                            placeholderTextColor={COLORS.textLight}
                            value={bedrooms}
                            onChangeText={setBedrooms}
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Bathrooms</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="0"
                            placeholderTextColor={COLORS.textLight}
                            value={bathrooms}
                            onChangeText={setBathrooms}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                {/* Area */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Area (sqft)</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="e.g., 750"
                        placeholderTextColor={COLORS.textLight}
                        value={area}
                        onChangeText={setArea}
                        keyboardType="numeric"
                    />
                </View>

                {/* Location */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>City *</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="e.g., Nairobi"
                        placeholderTextColor={COLORS.textLight}
                        value={city}
                        onChangeText={setCity}
                    />
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Address</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Street address or area"
                        placeholderTextColor={COLORS.textLight}
                        value={address}
                        onChangeText={setAddress}
                    />
                </View>

                {/* Description */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.textInput, styles.textArea]}
                        placeholder="Describe the property..."
                        placeholderTextColor={COLORS.textLight}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        maxLength={2000}
                    />
                </View>

                {/* Amenities */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Amenities</Text>
                    <View style={styles.chipGrid}>
                        {AMENITIES.map((amenity) => {
                            const isSelected = selectedAmenities.includes(amenity);
                            return (
                                <TouchableOpacity
                                    key={amenity}
                                    style={[styles.chip, isSelected && styles.chipActive]}
                                    onPress={() => toggleAmenity(amenity)}
                                >
                                    <Feather
                                        name={isSelected ? 'check' : 'plus'}
                                        size={12}
                                        color={isSelected ? COLORS.primary : COLORS.textSecondary}
                                    />
                                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                                        {amenity}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Submit */}
                <TouchableOpacity
                    style={[styles.submitBtn, (!isValid || submitting) && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={!isValid || submitting}
                >
                    {submitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <>
                            <Feather name={isEditing ? 'check' : 'plus'} size={18} color="#FFFFFF" />
                            <Text style={styles.submitBtnText}>
                                {isEditing ? 'Update Property' : 'Add Property'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
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
    backBtn: { padding: 4 },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
    },
    scrollView: { flex: 1 },
    scrollContent: { padding: 20 },
    fieldGroup: { marginBottom: 20 },
    label: {
        fontSize: 14,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.text,
    },
    textArea: {
        minHeight: 100,
        paddingTop: 12,
    },
    rowFields: {
        flexDirection: 'row',
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 30,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 5,
    },
    chipActive: {
        backgroundColor: COLORS.primaryLight,
        borderColor: COLORS.primary,
    },
    chipText: {
        fontSize: 13,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
    },
    chipTextActive: {
        color: COLORS.primary,
    },
    toggleRow: {
        flexDirection: 'row',
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    toggleBtnActive: {
        backgroundColor: COLORS.primary,
    },
    toggleText: {
        fontSize: 14,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
    },
    toggleTextActive: {
        color: '#FFFFFF',
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 30,
        gap: 8,
        marginTop: 8,
    },
    submitBtnDisabled: {
        backgroundColor: COLORS.textLight,
    },
    submitBtnText: {
        fontSize: 16,
        fontFamily: 'DMSans_600SemiBold',
        color: '#FFFFFF',
    },
});

export default CreatePropertyScreen;
