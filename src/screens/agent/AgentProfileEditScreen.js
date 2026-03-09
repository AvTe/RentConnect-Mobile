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
    Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { updateUser } from '../../lib/database';
import { sendOTP, verifyOTP } from '../../lib/api';
import { COLORS, FONTS } from '../../constants/theme';

const AgentProfileEditScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const { user, userData, refreshUserData } = useAuth();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [profileImage, setProfileImage] = useState(null);

    // Phone OTP verification state
    const [otpModalVisible, setOtpModalVisible] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [otpSending, setOtpSending] = useState(false);
    const [otpVerifying, setOtpVerifying] = useState(false);
    const [phoneVerified, setPhoneVerified] = useState(false);

    // KYC/identity verification state
    const [verificationStatus, setVerificationStatus] = useState('unverified'); // unverified | pending | verified | rejected
    const [idDocument, setIdDocument] = useState(null); // { name, uri }
    const [uploadingDoc, setUploadingDoc] = useState(false);

    // Form fields
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        agencyName: '',
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
                bio: userData.bio || '',
                experience: userData.experience?.toString() || '',
                specialization: userData.specialization || '',
            });
            setProfileImage(userData.avatar_url || userData.profile_image);
            setPhoneVerified(userData.phone_verified || false);
            setVerificationStatus(userData.verification_status || 'unverified');
            if (userData.id_document_url) {
                setIdDocument({ name: 'ID Document (uploaded)', uri: userData.id_document_url });
            }
        }
    }, [userData, user]);

    // Unsaved changes detection
    const hasUnsavedChanges = userData ? (
        formData.name !== (userData.name || '') ||
        formData.phone !== (userData.phone || '') ||
        formData.agencyName !== (userData.agency_name || userData.agencyName || '') ||
        formData.bio !== (userData.bio || '') ||
        formData.experience !== (userData.experience?.toString() || '') ||
        formData.specialization !== (userData.specialization || '')
    ) : false;

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            if (!hasUnsavedChanges) return;
            e.preventDefault();
            Alert.alert(
                'Discard changes?',
                'You have unsaved changes. Are you sure you want to leave?',
                [
                    { text: 'Stay', style: 'cancel' },
                    { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
                ]
            );
        });
        return unsubscribe;
    }, [navigation, hasUnsavedChanges]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (field === 'phone') setPhoneVerified(false);
    };

    // Phone OTP verification
    const handleSendOTP = async () => {
        const phone = formData.phone.trim();
        if (!phone) {
            toast.error('Please enter a phone number first');
            return;
        }
        setOtpSending(true);
        try {
            const result = await sendOTP(phone);
            if (result.success) {
                setOtpCode('');
                setOtpModalVisible(true);
                toast.success('OTP sent to ' + phone);
            } else {
                toast.error(result.error || 'Failed to send OTP');
            }
        } catch {
            toast.error('Could not send OTP. Try again later.');
        } finally {
            setOtpSending(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (otpCode.length < 4) {
            toast.error('Please enter the verification code');
            return;
        }
        setOtpVerifying(true);
        try {
            const result = await verifyOTP(formData.phone.trim(), otpCode);
            if (result.success) {
                setPhoneVerified(true);
                setOtpModalVisible(false);
                toast.success('Phone verified successfully!');
                // Persist verification flag
                await updateUser(user.id, { phone_verified: true }).catch(() => {});
            } else {
                toast.error(result.error || 'Invalid code. Try again.');
            }
        } catch {
            toast.error('Verification failed. Try again.');
        } finally {
            setOtpVerifying(false);
        }
    };

    const handlePickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
            Alert.alert('Permission Required', 'Please allow access to your photo library');
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
                bio: formData.bio.trim(),
                experience: formData.experience ? parseInt(formData.experience) : null,
                specialization: formData.specialization.trim(),
            };

            const result = await updateUser(user.id, updateData);

            if (!result.success) throw new Error(result.error);

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
                    {/* Phone Verification */}
                    <View style={styles.phoneVerifyRow}>
                        {phoneVerified ? (
                            <View style={styles.verifiedBadge}>
                                <Feather name="check-circle" size={14} color={COLORS.success} />
                                <Text style={styles.verifiedText}>Verified</Text>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.verifyBtn}
                                onPress={handleSendOTP}
                                disabled={otpSending || !formData.phone.trim()}
                            >
                                {otpSending ? (
                                    <ActivityIndicator size="small" color={COLORS.primary} />
                                ) : (
                                    <>
                                        <Feather name="shield" size={14} color={COLORS.primary} />
                                        <Text style={styles.verifyBtnText}>Verify Phone</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
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

                {/* Identity Verification (KYC) Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Identity Verification</Text>

                    {/* Verification Status Banner */}
                    <View style={[
                        styles.kycStatusBanner,
                        verificationStatus === 'verified' && styles.kycStatusVerified,
                        verificationStatus === 'pending' && styles.kycStatusPending,
                        verificationStatus === 'rejected' && styles.kycStatusRejected,
                    ]}>
                        <Feather
                            name={verificationStatus === 'verified' ? 'check-circle' : verificationStatus === 'pending' ? 'clock' : verificationStatus === 'rejected' ? 'x-circle' : 'shield'}
                            size={20}
                            color={verificationStatus === 'verified' ? COLORS.success : verificationStatus === 'pending' ? '#F59E0B' : verificationStatus === 'rejected' ? COLORS.error : COLORS.textSecondary}
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.kycStatusTitle}>
                                {verificationStatus === 'verified' ? 'Verified Agent' :
                                 verificationStatus === 'pending' ? 'Verification Pending' :
                                 verificationStatus === 'rejected' ? 'Verification Rejected' :
                                 'Not Verified'}
                            </Text>
                            <Text style={styles.kycStatusDesc}>
                                {verificationStatus === 'verified' ? 'Your identity has been verified. Tenants can see your verified badge.' :
                                 verificationStatus === 'pending' ? 'Your document is being reviewed. This usually takes 1-2 business days.' :
                                 verificationStatus === 'rejected' ? 'Please re-upload a valid government-issued ID.' :
                                 'Upload a government-issued ID to get a verified badge and build trust with tenants.'}
                            </Text>
                        </View>
                    </View>

                    {/* Document Upload */}
                    {verificationStatus !== 'verified' && (
                        <>
                            {idDocument ? (
                                <View style={styles.docCard}>
                                    <Feather name="file-text" size={22} color={COLORS.primary} />
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.docName} numberOfLines={1}>{idDocument.name}</Text>
                                        <Text style={styles.docHint}>Tap to replace</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setIdDocument(null)}>
                                        <Feather name="x" size={18} color={COLORS.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                            ) : null}

                            <TouchableOpacity
                                style={styles.uploadBtn}
                                onPress={async () => {
                                    try {
                                        const result = await DocumentPicker.getDocumentAsync({
                                            type: ['image/*', 'application/pdf'],
                                            copyToCacheDirectory: true,
                                        });
                                        if (!result.canceled && result.assets?.[0]) {
                                            setIdDocument({
                                                name: result.assets[0].name,
                                                uri: result.assets[0].uri,
                                            });
                                            toast.success('Document selected');
                                        }
                                    } catch (err) {
                                        toast.error('Failed to pick document');
                                    }
                                }}
                            >
                                <Feather name="upload" size={18} color={COLORS.primary} />
                                <Text style={styles.uploadBtnText}>
                                    {idDocument ? 'Replace Document' : 'Upload ID Document'}
                                </Text>
                            </TouchableOpacity>

                            {idDocument && verificationStatus !== 'pending' && (
                                <TouchableOpacity
                                    style={[styles.submitKycBtn, uploadingDoc && { opacity: 0.6 }]}
                                    onPress={async () => {
                                        setUploadingDoc(true);
                                        try {
                                            // Save verification request to database
                                            const result = await updateUser(user.id, {
                                                verification_status: 'pending',
                                                id_document_name: idDocument.name,
                                                kyc_submitted_at: new Date().toISOString(),
                                            });
                                            if (result.success) {
                                                setVerificationStatus('pending');
                                                toast.success('Verification submitted! We\'ll review your document shortly.');
                                                if (refreshUserData) await refreshUserData();
                                            } else {
                                                throw new Error(result.error);
                                            }
                                        } catch (err) {
                                            toast.error('Failed to submit verification');
                                        } finally {
                                            setUploadingDoc(false);
                                        }
                                    }}
                                    disabled={uploadingDoc}
                                >
                                    {uploadingDoc ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <Text style={styles.submitKycBtnText}>Submit for Verification</Text>
                                    )}
                                </TouchableOpacity>
                            )}

                            <Text style={styles.kycHint}>
                                Accepted: National ID, Passport, or Driver's License (image or PDF)
                            </Text>
                        </>
                    )}
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

            {/* OTP Verification Modal */}
            <Modal visible={otpModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <TouchableOpacity style={styles.modalClose} onPress={() => setOtpModalVisible(false)}>
                            <Feather name="x" size={20} color={COLORS.text} />
                        </TouchableOpacity>
                        <View style={styles.modalIconWrap}>
                            <Feather name="smartphone" size={28} color={COLORS.primary} />
                        </View>
                        <Text style={styles.modalTitle}>Verify Phone</Text>
                        <Text style={styles.modalSubtitle}>
                            Enter the verification code sent to{' '}
                            <Text style={{ fontFamily: FONTS.semiBold }}>{formData.phone}</Text>
                        </Text>
                        <TextInput
                            style={styles.otpInput}
                            value={otpCode}
                            onChangeText={setOtpCode}
                            placeholder="Enter code"
                            keyboardType="number-pad"
                            maxLength={6}
                            autoFocus
                        />
                        <TouchableOpacity
                            style={[styles.modalBtn, otpVerifying && { opacity: 0.6 }]}
                            onPress={handleVerifyOTP}
                            disabled={otpVerifying}
                        >
                            {otpVerifying ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.modalBtnText}>Verify</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.resendBtn} onPress={handleSendOTP} disabled={otpSending}>
                            <Text style={styles.resendBtnText}>Resend Code</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
        fontFamily: FONTS.bold,
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
        fontFamily: FONTS.semiBold,
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
        fontFamily: FONTS.bold,
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
        fontFamily: FONTS.semiBold,
        color: COLORS.primary,
    },
    // Sections
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        marginBottom: 12,
    },
    // Input
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 13,
        fontFamily: FONTS.medium,
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
        fontFamily: FONTS.regular,
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
        fontFamily: FONTS.medium,
        color: COLORS.text,
    },
    quickLinkSubtitle: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginTop: 1,
    },
    quickLinkDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginLeft: 66,
    },
    // Phone Verify
    phoneVerifyRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: -8,
        marginBottom: 12,
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
        fontFamily: FONTS.semiBold,
        color: COLORS.success,
    },
    verifyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    verifyBtnText: {
        fontSize: 12,
        fontFamily: FONTS.semiBold,
        color: COLORS.primary,
    },
    // KYC / Identity Verification
    kycStatusBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: COLORS.background,
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    kycStatusVerified: {
        backgroundColor: '#D1FAE5',
        borderColor: '#6EE7B7',
    },
    kycStatusPending: {
        backgroundColor: '#FEF3C7',
        borderColor: '#FCD34D',
    },
    kycStatusRejected: {
        backgroundColor: '#FEE2E2',
        borderColor: '#FCA5A5',
    },
    kycStatusTitle: {
        fontSize: 15,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
        marginBottom: 2,
    },
    kycStatusDesc: {
        fontSize: 13,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        lineHeight: 18,
    },
    docCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primaryLight,
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.primary,
        borderStyle: 'dashed',
    },
    docName: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: COLORS.text,
    },
    docHint: {
        fontSize: 11,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginTop: 1,
    },
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: COLORS.card,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        borderStyle: 'dashed',
        borderRadius: 14,
        paddingVertical: 16,
        marginBottom: 12,
    },
    uploadBtnText: {
        fontSize: 15,
        fontFamily: FONTS.semiBold,
        color: COLORS.primary,
    },
    submitKycBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 10,
    },
    submitKycBtnText: {
        fontSize: 15,
        fontFamily: FONTS.semiBold,
        color: '#FFFFFF',
    },
    kycHint: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 8,
    },
    // OTP Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    modalCard: {
        width: '100%',
        backgroundColor: COLORS.card,
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
    },
    modalClose: {
        position: 'absolute',
        top: 16,
        right: 16,
    },
    modalIconWrap: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    otpInput: {
        width: '100%',
        height: 56,
        backgroundColor: COLORS.background,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        textAlign: 'center',
        fontSize: 24,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        letterSpacing: 8,
        marginBottom: 20,
    },
    modalBtn: {
        width: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 12,
    },
    modalBtnText: {
        fontSize: 16,
        fontFamily: FONTS.semiBold,
        color: '#FFFFFF',
    },
    resendBtn: { padding: 8 },
    resendBtnText: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: COLORS.primary,
    },
});

export default AgentProfileEditScreen;
