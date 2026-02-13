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
    Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';

const COLORS = {
    primary: '#FE9200',
    primaryLight: '#FFF5E6',
    background: '#F8F9FB',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
    successLight: '#D1FAE5',
    error: '#EF4444',
};

const AgentProfileEditScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const { user, userData, refreshUserData } = useAuth();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [profileImage, setProfileImage] = useState(null);

    // Form fields
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        agencyName: '',
        agencyAddress: '',
        bio: '',
        experience: '',
        specialization: '',
    });

    useEffect(() => {
        if (userData) {
            setFormData({
                name: userData.name || '',
                email: userData.email || user?.email || '',
                phone: userData.phone || '',
                agencyName: userData.agency_name || userData.agencyName || '',
                agencyAddress: userData.agency_address || '',
                bio: userData.bio || '',
                experience: userData.experience?.toString() || '',
                specialization: userData.specialization || '',
            });
            setProfileImage(userData.avatar_url || userData.profile_image);
        }
    }, [userData, user]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handlePickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
            Alert.alert('Permission Required', 'Please allow access to your photo library');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setProfileImage(result.assets[0].uri);
            toast.success('Photo selected! Save to upload.');
        }
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error('Name is required');
            return;
        }

        setSaving(true);

        try {
            const updateData = {
                name: formData.name.trim(),
                phone: formData.phone.trim(),
                agency_name: formData.agencyName.trim(),
                agency_address: formData.agencyAddress.trim(),
                bio: formData.bio.trim(),
                experience: formData.experience ? parseInt(formData.experience) : null,
                specialization: formData.specialization.trim(),
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', user.id);

            if (error) throw error;

            // Refresh user data
            if (refreshUserData) {
                await refreshUserData();
            }

            toast.success('Profile updated successfully!');
            navigation.goBack();
        } catch (error) {
            console.error('Error saving profile:', error);
            toast.error('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const InputField = ({ label, value, onChangeText, placeholder, multiline, keyboardType, editable = true }) => (
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TextInput
                style={[
                    styles.input,
                    multiline && styles.inputMultiline,
                    !editable && styles.inputDisabled,
                ]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={COLORS.textSecondary}
                multiline={multiline}
                numberOfLines={multiline ? 4 : 1}
                keyboardType={keyboardType || 'default'}
                editable={editable}
            />
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Feather name="x" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <TouchableOpacity
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                        <Text style={styles.saveButtonText}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Profile Photo Section */}
                <View style={styles.photoSection}>
                    <TouchableOpacity
                        style={styles.photoContainer}
                        onPress={handlePickImage}
                    >
                        {profileImage ? (
                            <Image
                                source={{ uri: profileImage }}
                                style={styles.profileImage}
                            />
                        ) : (
                            <View style={styles.photoPlaceholder}>
                                <Text style={styles.photoPlaceholderText}>
                                    {formData.name?.charAt(0).toUpperCase() || 'A'}
                                </Text>
                            </View>
                        )}
                        <View style={styles.cameraIcon}>
                            <Feather name="camera" size={14} color="#FFFFFF" />
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handlePickImage}>
                        <Text style={styles.changePhotoText}>Change Photo</Text>
                    </TouchableOpacity>
                </View>

                {/* Personal Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>

                    <InputField
                        label="Full Name"
                        value={formData.name}
                        onChangeText={(val) => handleInputChange('name', val)}
                        placeholder="Enter your full name"
                    />

                    <InputField
                        label="Email"
                        value={formData.email}
                        placeholder="your@email.com"
                        editable={false}
                    />

                    <InputField
                        label="Phone Number"
                        value={formData.phone}
                        onChangeText={(val) => handleInputChange('phone', val)}
                        placeholder="+254 700 000 000"
                        keyboardType="phone-pad"
                    />
                </View>

                {/* Agency Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Agency Information</Text>

                    <InputField
                        label="Agency Name"
                        value={formData.agencyName}
                        onChangeText={(val) => handleInputChange('agencyName', val)}
                        placeholder="Your agency or company name"
                    />

                    <InputField
                        label="Agency Address"
                        value={formData.agencyAddress}
                        onChangeText={(val) => handleInputChange('agencyAddress', val)}
                        placeholder="Office address"
                    />

                    <InputField
                        label="Years of Experience"
                        value={formData.experience}
                        onChangeText={(val) => handleInputChange('experience', val)}
                        placeholder="e.g. 5"
                        keyboardType="numeric"
                    />

                    <InputField
                        label="Specialization"
                        value={formData.specialization}
                        onChangeText={(val) => handleInputChange('specialization', val)}
                        placeholder="e.g. Residential, Commercial"
                    />
                </View>

                {/* Bio */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About You</Text>

                    <InputField
                        label="Bio"
                        value={formData.bio}
                        onChangeText={(val) => handleInputChange('bio', val)}
                        placeholder="Tell tenants about yourself and your services..."
                        multiline
                    />
                </View>

                {/* Quick Links */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Links</Text>

                    <View style={styles.quickLinks}>
                        <TouchableOpacity
                            style={styles.quickLink}
                            onPress={() => navigation.navigate('AgentWallet')}
                        >
                            <View style={[styles.quickLinkIcon, { backgroundColor: '#DBEAFE' }]}>
                                <Feather name="credit-card" size={18} color="#3B82F6" />
                            </View>
                            <View style={styles.quickLinkInfo}>
                                <Text style={styles.quickLinkTitle}>Wallet</Text>
                                <Text style={styles.quickLinkSubtitle}>Balance & Transactions</Text>
                            </View>
                            <Feather name="chevron-right" size={18} color={COLORS.border} />
                        </TouchableOpacity>

                        <View style={styles.quickLinkDivider} />

                        <TouchableOpacity
                            style={styles.quickLink}
                            onPress={() => navigation.navigate('AgentRewards')}
                        >
                            <View style={[styles.quickLinkIcon, { backgroundColor: '#FEF3C7' }]}>
                                <Feather name="gift" size={18} color="#F59E0B" />
                            </View>
                            <View style={styles.quickLinkInfo}>
                                <Text style={styles.quickLinkTitle}>Rewards</Text>
                                <Text style={styles.quickLinkSubtitle}>Earn rewards & bonuses</Text>
                            </View>
                            <Feather name="chevron-right" size={18} color={COLORS.border} />
                        </TouchableOpacity>

                        <View style={styles.quickLinkDivider} />

                        <TouchableOpacity
                            style={styles.quickLink}
                            onPress={() => navigation.navigate('AgentAssets')}
                        >
                            <View style={[styles.quickLinkIcon, { backgroundColor: COLORS.primaryLight }]}>
                                <Feather name="folder" size={18} color={COLORS.primary} />
                            </View>
                            <View style={styles.quickLinkInfo}>
                                <Text style={styles.quickLinkTitle}>My Assets</Text>
                                <Text style={styles.quickLinkSubtitle}>Your saved content</Text>
                            </View>
                            <Feather name="chevron-right" size={18} color={COLORS.border} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ height: 50 }} />
            </ScrollView>
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
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.text,
    },
    saveButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    saveButtonText: {
        fontSize: 15,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.primary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    // Photo Section
    photoSection: {
        alignItems: 'center',
        paddingVertical: 20,
        backgroundColor: COLORS.card,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    photoContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: COLORS.primary,
    },
    photoPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.primary,
    },
    photoPlaceholderText: {
        fontSize: 40,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.primary,
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.card,
    },
    changePhotoText: {
        fontSize: 14,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.primary,
    },
    // Sections
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.text,
        marginBottom: 12,
    },
    // Input
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 13,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
        marginBottom: 6,
    },
    input: {
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.text,
    },
    inputMultiline: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    inputDisabled: {
        backgroundColor: COLORS.background,
        color: COLORS.textSecondary,
    },
    // Quick Links
    quickLinks: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    quickLink: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
    },
    quickLinkIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickLinkInfo: {
        flex: 1,
        marginLeft: 12,
    },
    quickLinkTitle: {
        fontSize: 15,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.text,
    },
    quickLinkSubtitle: {
        fontSize: 12,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        marginTop: 1,
    },
    quickLinkDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginLeft: 66,
    },
});

export default AgentProfileEditScreen;
