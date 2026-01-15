import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
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
};

const ProfileScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { user, userProfile, refreshProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

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
        }
        if (user) {
            setEmail(user.email || '');
        }
    }, [userProfile, user]);

    const handleSave = async () => {
        if (!fullName.trim()) {
            Alert.alert('Required', 'Please enter your name');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('users')
                .upsert({
                    id: user.id,
                    email: user.email,
                    name: fullName.trim(),
                    city: city.trim(),
                    phone: phone.trim(),
                    updated_at: new Date().toISOString(),
                });

            if (error) throw error;

            if (refreshProfile) await refreshProfile();
            Alert.alert('Success', 'Profile updated successfully');
            navigation.goBack();
        } catch (error) {
            console.error('Error saving profile:', error);
            Alert.alert('Error', 'Failed to save profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const InputField = ({ label, value, onChangeText, placeholder, keyboardType, editable = true, rightElement }) => (
        <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={styles.inputWrapper}>
                <TextInput
                    style={[styles.input, !editable && styles.inputDisabled]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType={keyboardType}
                    editable={editable}
                />
                {rightElement}
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Photo */}
                <View style={styles.photoSection}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <Feather name="user" size={40} color={COLORS.primary} />
                        </View>
                        <TouchableOpacity style={styles.cameraBtn}>
                            <Feather name="camera" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Form Fields */}
                <InputField
                    label="FULL NAME"
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Enter your name"
                />

                <InputField
                    label="EMAIL ADDRESS"
                    value={email}
                    editable={false}
                    placeholder="Email"
                />

                <InputField
                    label="CITY"
                    value={city}
                    onChangeText={setCity}
                    placeholder="Enter your city"
                />

                <View style={styles.inputContainer}>
                    <View style={styles.phoneLabelRow}>
                        <Text style={styles.inputLabel}>PHONE NUMBER</Text>
                        {phoneVerified && (
                            <View style={styles.verifiedBadge}>
                                <Feather name="check-circle" size={14} color={COLORS.success} />
                                <Text style={styles.verifiedText}>VERIFIED</Text>
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
                            placeholder="712 345 678"
                            placeholderTextColor={COLORS.textSecondary}
                            keyboardType="phone-pad"
                        />
                    </View>
                </View>
            </ScrollView>

            {/* Save Button */}
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
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    cancelText: {
        fontSize: 16,
        color: COLORS.text,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
    },
    placeholder: {
        width: 50,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    photoSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.primary,
    },
    cameraBtn: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.card,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 10,
        letterSpacing: 0.5,
    },
    inputWrapper: {
        backgroundColor: COLORS.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    input: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        fontSize: 16,
        color: COLORS.text,
    },
    inputDisabled: {
        backgroundColor: '#F9FAFB',
        color: COLORS.textSecondary,
    },
    phoneLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    verifiedText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.success,
    },
    phoneInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    countryCode: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 8,
    },
    flagEmoji: {
        fontSize: 20,
    },
    codeText: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '500',
    },
    phoneDivider: {
        width: 1,
        height: 24,
        backgroundColor: COLORS.border,
    },
    phoneInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 16,
        fontSize: 16,
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
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
});

export default ProfileScreen;
