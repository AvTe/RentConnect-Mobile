import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { updateUser } from '../../lib/database';
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

const ProfileScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const { user, userProfile, refreshProfile } = useAuth();
    const [saving, setSaving] = useState(false);
    const [profileImage, setProfileImage] = useState(null);

    // Form state
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [city, setCity] = useState('');
    const [phone, setPhone] = useState('');
    const [phoneVerified, setPhoneVerified] = useState(false);

    useEffect(() => {
        if (userProfile) {
            setFullName(userProfile.name || '');
            setCity(userProfile.city || '');
            setPhone(userProfile.phone || '');
            setPhoneVerified(userProfile.phone_verified || false);
            setProfileImage(userProfile.avatar_url || userProfile.profile_image || null);
        }
        if (user) {
            setEmail(user.email || '');
        }
    }, [userProfile, user]);

    const handleSave = async () => {
        if (!fullName.trim()) {
            toast.warning('Please enter your name');
            return;
        }

        setSaving(true);
        try {
            const updates = {
                name: fullName.trim(),
                city: city.trim(),
                phone: phone.trim(),
            };

            // Upload avatar to Supabase storage if user picked a new local image
            if (profileImage && profileImage.startsWith('file://')) {
                const uploadResult = await uploadAvatar(user.id, profileImage);
                if (uploadResult.success) {
                    updates.avatar = uploadResult.url;
                } else {
                    console.warn('Avatar upload failed, saving other fields:', uploadResult.error);
                }
            }

            const result = await updateUser(user.id, updates);

            if (!result.success) throw new Error(result.error);

            if (refreshProfile) await refreshProfile();
            toast.success('Profile updated successfully');
            navigation.goBack();
        } catch (error) {
            console.error('Error saving profile:', error);
            toast.error('Failed to save profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    /**
     * Upload avatar image to Supabase storage bucket "images"
     * Path: {userId}/avatar/{timestamp}-profile.jpg
     * Matches the web uploadProfileImage pattern.
     */
    const uploadAvatar = async (userId, localUri) => {
        try {
            // React Native: use FormData for reliable file upload to Supabase storage
            const timestamp = Date.now();
            const ext = localUri.split('.').pop()?.toLowerCase() || 'jpg';
            const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
            const path = `${userId}/avatar/${timestamp}-profile.${ext}`;

            const formData = new FormData();
            formData.append('', {
                uri: localUri,
                name: `${timestamp}-profile.${ext}`,
                type: mimeType,
            });

            const { data, error } = await supabase.storage
                .from('images')
                .upload(path, formData, {
                    cacheControl: '3600',
                    upsert: true,
                    contentType: mimeType,
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(data.path);

            return { success: true, url: publicUrl };
        } catch (error) {
            console.error('Avatar upload error:', error);
            return { success: false, error: error.message };
        }
    };

    const handlePickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                toast.error('Please allow access to your photo library');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
                setProfileImage(result.assets[0].uri);
                toast.success('Photo selected! Save to upload.');
            }
        } catch {
            toast.error('Failed to pick image');
        }
    };

    const getUserInitial = () => {
        if (fullName) return fullName.charAt(0).toUpperCase();
        if (email) return email.charAt(0).toUpperCase();
        return 'T';
    };

    const InputField = ({ label, value, onChangeText, placeholder, keyboardType, editable = true }) => (
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TextInput
                style={[styles.input, !editable && styles.inputDisabled]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={COLORS.textSecondary}
                keyboardType={keyboardType || 'default'}
                editable={editable}
            />
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header - Matches Agent ProfileEdit */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Feather name="x" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <TouchableOpacity
                    style={[styles.saveHeaderBtn, saving && styles.saveHeaderBtnDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                        <Text style={styles.saveHeaderBtnText}>Save</Text>
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
                    <TouchableOpacity style={styles.photoContainer} onPress={handlePickImage}>
                        {profileImage ? (
                            <Image source={{ uri: profileImage }} style={styles.profileImage} />
                        ) : (
                            <View style={styles.photoPlaceholder}>
                                <Feather name="user" size={36} color={COLORS.primary} />
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
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="Enter your full name"
                    />

                    <InputField
                        label="Email"
                        value={email}
                        editable={false}
                        placeholder="your@email.com"
                    />

                    <InputField
                        label="City"
                        value={city}
                        onChangeText={setCity}
                        placeholder="Enter your city"
                    />

                    {/* Phone Number with Country Code */}
                    <View style={styles.inputGroup}>
                        <View style={styles.phoneLabelRow}>
                            <Text style={styles.inputLabel}>Phone Number</Text>
                            {phoneVerified && (
                                <View style={styles.verifiedBadge}>
                                    <Feather name="check-circle" size={14} color={COLORS.success} />
                                    <Text style={styles.verifiedText}>Verified</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.phoneInputRow}>
                            <View style={styles.countryCode}>
                                <Text style={styles.flagEmoji}>🇰🇪</Text>
                                <Text style={styles.codeText}>+254</Text>
                            </View>
                            <View style={styles.phoneDivider} />
                            <TextInput
                                style={styles.phoneInput}
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="+254700123456"
                                placeholderTextColor={COLORS.textSecondary}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>
                </View>

                <View style={{ height: 50 }} />
            </ScrollView>

            {/* Bottom Save Button */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.9}
                >
                    {saving ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
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
    saveHeaderBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    saveHeaderBtnDisabled: {
        opacity: 0.5,
    },
    saveHeaderBtnText: {
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
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.text,
        marginBottom: 12,
    },
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
    inputDisabled: {
        backgroundColor: COLORS.background,
        color: COLORS.textSecondary,
    },
    phoneLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.successLight,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    verifiedText: {
        fontSize: 12,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.success,
    },
    phoneInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    countryCode: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 8,
    },
    flagEmoji: {
        fontSize: 20,
    },
    codeText: {
        fontSize: 15,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.text,
    },
    phoneDivider: {
        width: 1,
        height: 24,
        backgroundColor: COLORS.border,
    },
    phoneInput: {
        flex: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.text,
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 16,
        backgroundColor: COLORS.card,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    saveButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'DMSans_600SemiBold',
    },
});

export default ProfileScreen;
