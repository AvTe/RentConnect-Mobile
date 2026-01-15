import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Image,
    Alert,
    ActivityIndicator,
    FlatList,
    Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import debounce from 'lodash.debounce';
import { supabase } from '../lib/supabase';
import {
    searchLocations,
    parseRequirementsWithAI,
    sendOTP,
    verifyOTP,
    PROPERTY_TYPES,
    BUDGET_PRESETS,
    CURRENCY_CONFIG,
    formatCurrency,
} from '../lib/api';
import OTPInput from '../components/OTPInput';

const TOTAL_STEPS = 4;

const TenantLeadScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Form data
    const [location, setLocation] = useState('');
    const [locationData, setLocationData] = useState(null);
    const [propertyType, setPropertyType] = useState('');
    const [budget, setBudget] = useState('');
    const [selectedBudgetOption, setSelectedBudgetOption] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('KE');

    // Location autocomplete
    const [locationSuggestions, setLocationSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchingLocation, setSearchingLocation] = useState(false);

    // AI Quick Fill
    const [showAIPanel, setShowAIPanel] = useState(false);
    const [aiInput, setAiInput] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    // OTP Verification
    const [showOTPModal, setShowOTPModal] = useState(false);
    const [otpStep, setOtpStep] = useState('idle'); // idle, sending, sent, verifying, verified
    const [otpError, setOtpError] = useState('');
    const [otpTimer, setOtpTimer] = useState(0);
    const [resendTimer, setResendTimer] = useState(0);

    // Animations
    const progressAnim = useRef(new Animated.Value(0.25)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: currentStep / TOTAL_STEPS,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [currentStep]);

    // OTP Timer effect
    useEffect(() => {
        let interval;
        if (otpTimer > 0) {
            interval = setInterval(() => setOtpTimer(t => t - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [otpTimer]);

    // Resend Timer effect
    useEffect(() => {
        let interval;
        if (resendTimer > 0) {
            interval = setInterval(() => setResendTimer(t => t - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    // Debounced location search
    const debouncedSearch = useCallback(
        debounce(async (query) => {
            if (query.length < 2) {
                setLocationSuggestions([]);
                setShowSuggestions(false);
                return;
            }
            setSearchingLocation(true);
            const results = await searchLocations(query);
            setLocationSuggestions(results);
            setShowSuggestions(results.length > 0);
            setSearchingLocation(false);
        }, 300),
        []
    );

    const handleLocationChange = (text) => {
        setLocation(text);
        setLocationData(null);
        debouncedSearch(text);
    };

    const handleLocationSelect = (item) => {
        const displayName = item.area ? `${item.area}, ${item.city}` : item.name;
        setLocation(displayName);
        setLocationData(item);
        setCountryCode(item.countryCode || 'KE');
        setShowSuggestions(false);
    };

    // AI Quick Fill handler
    const handleAIQuickFill = async () => {
        if (aiInput.length < 10) {
            Alert.alert('Too Short', 'Please describe your requirements in more detail');
            return;
        }
        setAiLoading(true);
        try {
            const result = await parseRequirementsWithAI(aiInput);
            if (result.success && result.data) {
                if (result.data.location) setLocation(result.data.location);
                if (result.data.propertyType) {
                    const matched = PROPERTY_TYPES.find(p =>
                        p.label.toLowerCase().includes(result.data.propertyType.toLowerCase())
                    );
                    if (matched) setPropertyType(matched.id);
                }
                if (result.data.budget) setBudget(result.data.budget.toString());
                setShowAIPanel(false);
                Alert.alert('Success', 'Form filled with your requirements!');
            } else {
                Alert.alert('Error', 'Could not parse your requirements. Try being more specific.');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to process. Please try again.');
        } finally {
            setAiLoading(false);
        }
    };

    // OTP handlers
    const handleSendOTP = async () => {
        if (!phone || phone.length < 9) {
            Alert.alert('Invalid Phone', 'Please enter a valid phone number');
            return;
        }
        const fullPhone = `+${countryCode === 'KE' ? '254' : '91'}${phone.replace(/\D/g, '')}`;
        setOtpStep('sending');
        const result = await sendOTP(fullPhone);
        if (result.success) {
            setOtpStep('sent');
            setOtpTimer(300); // 5 minutes
            setResendTimer(30);
            setShowOTPModal(true);
        } else {
            setOtpStep('idle');
            Alert.alert('Error', result.error || 'Failed to send OTP');
        }
    };

    const handleVerifyOTP = async (otp) => {
        const fullPhone = `+${countryCode === 'KE' ? '254' : '91'}${phone.replace(/\D/g, '')}`;
        setOtpStep('verifying');
        setOtpError('');
        const result = await verifyOTP(fullPhone, otp);
        if (result.success && result.verified) {
            setOtpStep('verified');
            setShowOTPModal(false);
            Alert.alert('Verified!', 'Your phone number has been verified');
        } else {
            setOtpError(result.error || 'Invalid code. Please try again.');
            setOtpStep('sent');
        }
    };

    // Budget preset selection handler
    const handleBudgetSelect = (optionId) => {
        setSelectedBudgetOption(optionId);
        setBudget('');
    };

    const animateTransition = (direction, callback) => {
        const startValue = direction === 'next' ? 50 : -50;
        slideAnim.setValue(startValue);
        fadeAnim.setValue(0);

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(callback);
    };

    const handleNext = () => {
        // Validation
        if (currentStep === 1 && !location.trim()) {
            Alert.alert('Required', 'Please enter your preferred location');
            return;
        }
        if (currentStep === 2 && !propertyType) {
            Alert.alert('Required', 'Please select a property type');
            return;
        }
        if (currentStep === 3 && !budget && !selectedBudgetOption) {
            Alert.alert('Required', 'Please set your budget');
            return;
        }
        if (currentStep === 4) {
            if (!name.trim()) {
                Alert.alert('Required', 'Please enter your name');
                return;
            }
            if (!email.trim()) {
                Alert.alert('Required', 'Please enter your email');
                return;
            }
            handleSubmit();
            return;
        }

        animateTransition('next', () => {
            setCurrentStep(currentStep + 1);
        });
    };

    const handleBack = () => {
        if (currentStep === 1) {
            navigation.goBack();
            return;
        }
        animateTransition('back', () => {
            setCurrentStep(currentStep - 1);
        });
    };

    const handleSubmit = async () => {
        setLoading(true);

        try {
            // Get budget value as number
            const budgetValue = selectedBudgetOption
                ? (BUDGET_PRESETS[countryCode] || BUDGET_PRESETS.KE).find(b => b.id === selectedBudgetOption)?.max || 0
                : parseInt(budget) || 0;

            // Get bedrooms from property type
            let bedrooms = 1;
            if (propertyType === '2 Bedroom') bedrooms = 2;
            else if (propertyType === '3 Bedroom') bedrooms = 3;
            else if (propertyType === 'Studio') bedrooms = 0;

            // Prepare lead data matching the database schema
            const leadData = {
                // Location (single field, not area/city)
                location: location.trim(),

                // Property type
                property_type: propertyType,
                bedrooms: bedrooms,

                // Budget as number
                budget: budgetValue,

                // Contact details with correct column names
                tenant_name: name.trim(),
                tenant_email: email.trim(),
                tenant_phone: phone.trim() || '',  // Empty string instead of null

                // Status
                status: 'active',
            };

            // Insert into Supabase
            const { data, error } = await supabase
                .from('leads')
                .insert([leadData])
                .select();

            if (error) throw error;

            setSubmitted(true);
        } catch (error) {
            console.error('Error submitting lead:', error);
            Alert.alert('Error', 'Failed to submit your request. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getProgressPercentage = () => {
        return `${Math.round((currentStep / TOTAL_STEPS) * 100)}%`;
    };

    // Render Success Screen
    if (submitted) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <ScrollView contentContainerStyle={styles.successContainer}>
                    {/* House Image */}
                    <View style={styles.successImageContainer}>
                        <Image
                            source={require('../../assets/hero section img.jpg')}
                            style={styles.successImage}
                            resizeMode="cover"
                        />
                        <View style={styles.successCheckContainer}>
                            <View style={styles.successCheck}>
                                <Feather name="check" size={28} color="#FFFFFF" />
                            </View>
                        </View>
                    </View>

                    {/* Success Message */}
                    <Text style={styles.successTitle}>Request Submitted!</Text>
                    <Text style={styles.successDescription}>
                        Your rental request is now live. Local agents will be notified and will contact you shortly.
                    </Text>

                    {/* What happens next */}
                    <View style={styles.nextStepsCard}>
                        <Text style={styles.nextStepsTitle}>What happens next?</Text>

                        <View style={styles.nextStepItem}>
                            <View style={[styles.nextStepIcon, { backgroundColor: '#FEF3C7' }]}>
                                <Feather name="bell" size={18} color="#D97706" />
                            </View>
                            <View style={styles.nextStepContent}>
                                <Text style={styles.nextStepLabel}>Agents notified instantly</Text>
                                <Text style={styles.nextStepDesc}>We've sent your request to top rated agents in the area.</Text>
                            </View>
                        </View>

                        <View style={styles.nextStepItem}>
                            <View style={[styles.nextStepIcon, { backgroundColor: '#FFF5E6' }]}>
                                <Feather name="message-square" size={18} color="#FE9200" />
                            </View>
                            <View style={styles.nextStepContent}>
                                <Text style={styles.nextStepLabel}>Agents contact you with offers</Text>
                                <Text style={styles.nextStepDesc}>Expect calls or messages within the next 24 hours.</Text>
                            </View>
                        </View>

                        <View style={styles.nextStepItem}>
                            <View style={[styles.nextStepIcon, { backgroundColor: '#FEE2E2' }]}>
                                <Feather name="key" size={18} color="#EF4444" />
                            </View>
                            <View style={styles.nextStepContent}>
                                <Text style={styles.nextStepLabel}>Schedule viewings & move in</Text>
                                <Text style={styles.nextStepDesc}>Pick your favorite home and sign the lease.</Text>
                            </View>
                        </View>
                    </View>

                    {/* Buttons */}
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => navigation.navigate('Landing')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.primaryButtonText}>View My Requests</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => navigation.navigate('Landing')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.secondaryButtonText}>Go to Home</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }

    // Render Step Content
    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <Animated.View style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
                        <Text style={styles.stepTitle}>Where do you want to live?</Text>
                        <Text style={styles.stepDescription}>
                            Search for a city, neighborhood, or area where you're looking to rent.
                        </Text>

                        {/* Location Input with Autocomplete */}
                        <View style={styles.locationWrapper}>
                            <View style={[styles.locationInputContainer, showSuggestions && styles.locationInputActive]}>
                                <Feather name="navigation" size={20} color="#FE9200" style={styles.locationIcon} />
                                <TextInput
                                    style={styles.locationInput}
                                    placeholder="e.g., Westlands, Nairobi"
                                    placeholderTextColor="#9CA3AF"
                                    value={location}
                                    onChangeText={handleLocationChange}
                                />
                                {searchingLocation && <ActivityIndicator size="small" color="#FE9200" />}
                                {locationData && <Feather name="check-circle" size={20} color="#10B981" />}
                            </View>

                            {/* Location Suggestions Dropdown */}
                            {showSuggestions && (
                                <View style={styles.suggestionsContainer}>
                                    {locationSuggestions.map((item, index) => (
                                        <TouchableOpacity
                                            key={item.id || index}
                                            style={styles.suggestionItem}
                                            onPress={() => handleLocationSelect(item)}
                                        >
                                            <Feather name="map-pin" size={16} color="#6B7280" />
                                            <View style={styles.suggestionText}>
                                                <Text style={styles.suggestionName}>{item.area || item.name}</Text>
                                                <Text style={styles.suggestionCity}>{item.city}, {item.country}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* AI Quick Fill - Hidden for now
                        <TouchableOpacity
                            style={styles.aiQuickFill}
                            onPress={() => setShowAIPanel(!showAIPanel)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.aiIconContainer}>
                                <Feather name="zap" size={18} color="#FE9200" />
                            </View>
                            <View style={styles.aiTextContainer}>
                                <Text style={styles.aiTitle}>AI Quick Fill</Text>
                                <Text style={styles.aiDescription}>Describe your needs in plain language</Text>
                            </View>
                            <View style={styles.aiBadge}>
                                <Text style={styles.aiBadgeText}>AI{'\n'}POWERED</Text>
                            </View>
                            <Feather name={showAIPanel ? 'chevron-up' : 'chevron-down'} size={20} color="#9CA3AF" />
                        </TouchableOpacity>

                        {showAIPanel && (
                            <View style={styles.aiPanel}>
                                <TextInput
                                    style={styles.aiTextarea}
                                    placeholder="E.g., I need a 2 bedroom apartment in Westlands with a budget of 50K, must have parking..."
                                    placeholderTextColor="#9CA3AF"
                                    value={aiInput}
                                    onChangeText={setAiInput}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                                <TouchableOpacity
                                    style={[styles.aiButton, aiLoading && styles.buttonDisabled]}
                                    onPress={handleAIQuickFill}
                                    disabled={aiLoading}
                                >
                                    {aiLoading ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <>
                                            <Feather name="zap" size={18} color="#FFFFFF" />
                                            <Text style={styles.aiButtonText}>Auto-Fill Form</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                        */}
                    </Animated.View>
                );

            case 2:
                return (
                    <Animated.View style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
                        <Text style={styles.stepTitle}>What type of property?</Text>
                        <Text style={styles.stepDescription}>
                            Select the type of property you're looking for.
                        </Text>

                        {/* Property Type Grid */}
                        <View style={styles.propertyGrid}>
                            {PROPERTY_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type.id}
                                    style={[
                                        styles.propertyCard,
                                        propertyType === type.id && styles.propertyCardSelected,
                                    ]}
                                    onPress={() => setPropertyType(type.id)}
                                    activeOpacity={0.8}
                                >
                                    <View style={[
                                        styles.propertyIconContainer,
                                        propertyType === type.id && styles.propertyIconSelected,
                                    ]}>
                                        <Feather
                                            name={type.icon}
                                            size={22}
                                            color={propertyType === type.id ? '#FE9200' : '#6B7280'}
                                        />
                                    </View>
                                    <Text style={[
                                        styles.propertyLabel,
                                        propertyType === type.id && styles.propertyLabelSelected,
                                    ]}>
                                        {type.label}
                                    </Text>
                                    <Text style={styles.propertyDescription}>{type.description}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>
                );

            case 3:
                return (
                    <Animated.View style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
                        <Text style={styles.stepTitle}>What's your budget?</Text>
                        <Text style={styles.stepDescription}>
                            Set your monthly rental budget. You can enter a custom amount or use quick presets.
                        </Text>

                        {/* Budget Input */}
                        <View style={styles.budgetHeader}>
                            <Text style={styles.budgetLabel}>Monthly Budget</Text>
                            <Text style={styles.budgetCurrency}>KES</Text>
                        </View>
                        <View style={styles.budgetInputContainer}>
                            <Text style={styles.budgetPrefix}>KSh</Text>
                            <TextInput
                                style={styles.budgetInput}
                                placeholder="Enter amount"
                                placeholderTextColor="#9CA3AF"
                                value={budget}
                                onChangeText={(text) => {
                                    setBudget(text);
                                    setSelectedBudgetOption('');
                                }}
                                keyboardType="numeric"
                            />
                            <Feather name="dollar-sign" size={20} color="#9CA3AF" />
                        </View>

                        {/* Quick Select */}
                        <Text style={styles.quickSelectLabel}>Quick select:</Text>
                        <View style={styles.budgetChips}>
                            {(BUDGET_PRESETS[countryCode] || BUDGET_PRESETS.KE).map((option) => (
                                <TouchableOpacity
                                    key={option.id}
                                    style={[
                                        styles.budgetChip,
                                        selectedBudgetOption === option.id && styles.budgetChipSelected,
                                    ]}
                                    onPress={() => handleBudgetSelect(option.id)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[
                                        styles.budgetChipText,
                                        selectedBudgetOption === option.id && styles.budgetChipTextSelected,
                                    ]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>
                );

            case 4:
                return (
                    <Animated.View style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
                        <Text style={styles.stepTitle}>Contact Details</Text>
                        <Text style={styles.stepDescription}>
                            How can agents reach you?
                        </Text>

                        {/* Name Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Your Name</Text>
                            <View style={styles.inputContainer}>
                                <Feather name="user" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="John Doe"
                                    placeholderTextColor="#9CA3AF"
                                    value={name}
                                    onChangeText={setName}
                                    autoCapitalize="words"
                                />
                            </View>
                        </View>

                        {/* Email Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Email Address</Text>
                            <View style={styles.inputContainer}>
                                <Feather name="mail" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="john@example.com"
                                    placeholderTextColor="#9CA3AF"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        {/* Phone Input */}
                        <View style={styles.inputGroup}>
                            <View style={styles.inputLabelRow}>
                                <Text style={styles.inputLabel}>WhatsApp Number</Text>
                                <Text style={styles.optionalLabel}>OPTIONAL</Text>
                            </View>
                            <View style={styles.inputContainer}>
                                <View style={styles.countryCode}>
                                    <Text style={styles.flag}>🇮🇳</Text>
                                    <Text style={styles.countryCodeText}>+91</Text>
                                    <Feather name="chevron-down" size={16} color="#9CA3AF" />
                                </View>
                                <TextInput
                                    style={[styles.input, styles.phoneInput]}
                                    placeholder="98765 43210"
                                    placeholderTextColor="#9CA3AF"
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                />
                            </View>
                            <Text style={styles.inputHint}>
                                Note: Agents will use this number to contact you via WhatsApp.
                            </Text>
                        </View>
                    </Animated.View>
                );

            default:
                return null;
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Image
                            source={require('../../assets/yoombaa logo.png')}
                            style={styles.headerLogo}
                            resizeMode="contain"
                        />
                    </View>
                    <TouchableOpacity
                        style={styles.agentButton}
                        onPress={() => navigation.navigate('SignUp')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.agentButtonText}>I'm an Agent</Text>
                    </TouchableOpacity>
                </View>

                {/* Back Button */}
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Feather name="arrow-left" size={20} color="#1F2937" />
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>

                {/* Progress */}
                <View style={styles.progressContainer}>
                    <Text style={styles.progressText}>Step {currentStep} of {TOTAL_STEPS}</Text>
                    <Text style={styles.progressPercent}>{getProgressPercentage()}</Text>
                </View>
                <View style={styles.progressBar}>
                    <Animated.View
                        style={[
                            styles.progressFill,
                            {
                                width: progressAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0%', '100%'],
                                }),
                            },
                        ]}
                    />
                </View>

                {/* Content */}
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {renderStepContent()}
                </ScrollView>

                {/* Bottom Button */}
                <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}>
                    <TouchableOpacity
                        style={[styles.nextButton, loading && styles.buttonDisabled]}
                        onPress={handleNext}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <>
                                <Text style={styles.nextButtonText}>
                                    {currentStep === 4 ? 'Submit Request' : 'Next Step'}
                                </Text>
                                <Feather
                                    name={currentStep === 4 ? 'check' : 'chevron-right'}
                                    size={20}
                                    color="#FFFFFF"
                                    style={{ marginLeft: 8 }}
                                />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    keyboardView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerLogo: {
        width: 36,
        height: 36,
    },
    logoText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FE9200',
        marginLeft: 8,
    },
    agentButton: {
        backgroundColor: '#FE9200',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
    },
    agentButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    backText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#1F2937',
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    progressText: {
        fontSize: 14,
        color: '#6B7280',
    },
    progressPercent: {
        fontSize: 14,
        color: '#6B7280',
    },
    progressBar: {
        height: 4,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 20,
        borderRadius: 2,
        marginBottom: 24,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#FE9200',
        borderRadius: 2,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 12,
    },
    stepDescription: {
        fontSize: 15,
        color: '#6B7280',
        lineHeight: 22,
        marginBottom: 32,
    },
    // Step 1 - Location
    locationWrapper: {
        marginBottom: 16,
        zIndex: 10,
    },
    locationInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FE9200',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        backgroundColor: '#FFFFFF',
    },
    locationInputActive: {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    locationIcon: {
        marginRight: 12,
    },
    locationInput: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
    },
    suggestionsContainer: {
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderTopWidth: 0,
        borderColor: '#FE9200',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        maxHeight: 200,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    suggestionText: {
        marginLeft: 12,
        flex: 1,
    },
    suggestionName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
    },
    suggestionCity: {
        fontSize: 13,
        color: '#6B7280',
    },
    aiQuickFill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    aiIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#FFF5E6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#FE9200',
    },
    aiTextContainer: {
        flex: 1,
    },
    aiTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
    },
    aiDescription: {
        fontSize: 13,
        color: '#6B7280',
    },
    aiBadge: {
        borderWidth: 1,
        borderColor: '#FE9200',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginRight: 8,
    },
    aiBadgeText: {
        fontSize: 10,
        color: '#FE9200',
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 12,
    },
    aiPanel: {
        marginTop: 16,
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    aiTextarea: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 12,
        fontSize: 14,
        color: '#1F2937',
        minHeight: 100,
        marginBottom: 12,
    },
    aiButton: {
        flexDirection: 'row',
        backgroundColor: '#FE9200',
        borderRadius: 12,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    aiButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    // Step 2 - Property Type
    propertyGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    propertyCard: {
        width: '48%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    propertyCardSelected: {
        borderColor: '#FE9200',
        backgroundColor: '#FFF5E6',
    },
    propertyIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    propertyIconSelected: {
        backgroundColor: '#FFF5E6',
    },
    propertyLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    propertyLabelSelected: {
        color: '#FE9200',
    },
    propertyDescription: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    // Step 3 - Budget
    budgetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    budgetLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
    },
    budgetCurrency: {
        fontSize: 14,
        color: '#6B7280',
    },
    budgetInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 24,
    },
    budgetPrefix: {
        fontSize: 16,
        color: '#1F2937',
        fontWeight: '500',
        marginRight: 8,
    },
    budgetInput: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
    },
    quickSelectLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 12,
    },
    budgetChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    budgetChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    budgetChipSelected: {
        borderColor: '#FE9200',
        backgroundColor: '#FFF5E6',
    },
    budgetChipText: {
        fontSize: 14,
        color: '#6B7280',
    },
    budgetChipTextSelected: {
        color: '#FE9200',
        fontWeight: '600',
    },
    // Step 4 - Contact
    inputGroup: {
        marginBottom: 20,
    },
    inputLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 8,
    },
    optionalLabel: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '500',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
    },
    phoneInput: {
        marginLeft: 12,
    },
    countryCode: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 12,
        borderRightWidth: 1,
        borderRightColor: '#E5E7EB',
    },
    flag: {
        fontSize: 18,
        marginRight: 4,
    },
    countryCodeText: {
        fontSize: 16,
        color: '#1F2937',
        marginRight: 4,
    },
    inputHint: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 8,
        lineHeight: 18,
    },
    // Bottom Button
    bottomContainer: {
        paddingHorizontal: 20,
        paddingTop: 16,
        backgroundColor: '#FFFFFF',
    },
    nextButton: {
        flexDirection: 'row',
        backgroundColor: '#FE9200',
        borderRadius: 16,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    nextButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    // Success Screen
    successContainer: {
        flexGrow: 1,
        paddingHorizontal: 20,
    },
    successImageContainer: {
        height: 220,
        borderRadius: 20,
        overflow: 'hidden',
        marginTop: 20,
        marginBottom: 24,
        position: 'relative',
    },
    successImage: {
        width: '100%',
        height: '100%',
    },
    successCheckContainer: {
        position: 'absolute',
        bottom: -24,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    successCheck: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#FFFFFF',
    },
    successTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 12,
    },
    successDescription: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    nextStepsCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 20,
        marginBottom: 32,
    },
    nextStepsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 20,
    },
    nextStepItem: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    nextStepIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    nextStepContent: {
        flex: 1,
    },
    nextStepLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    nextStepDesc: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
    },
    primaryButton: {
        backgroundColor: '#FE9200',
        borderRadius: 16,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        borderWidth: 2,
        borderColor: '#FE9200',
        borderRadius: 16,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    secondaryButtonText: {
        color: '#FE9200',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default TenantLeadScreen;
