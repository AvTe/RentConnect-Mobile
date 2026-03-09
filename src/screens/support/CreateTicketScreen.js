import React, { useState } from 'react';
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
import { createTicket, TICKET_CATEGORIES, TICKET_PRIORITIES } from '../../lib/ticketService';
import { COLORS, FONTS } from '../../constants/theme';

const CreateTicketScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const toast = useToast();

    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('general');
    const [priority, setPriority] = useState('medium');
    const [submitting, setSubmitting] = useState(false);

    const hasUnsavedChanges = subject.trim().length > 0 || description.trim().length > 0;

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

    const isValid = subject.trim().length >= 3 && description.trim().length >= 10;

    const handleSubmit = async () => {
        if (!isValid || submitting) return;

        setSubmitting(true);
        try {
            const result = await createTicket({
                userId: user.id,
                subject: subject.trim(),
                description: description.trim(),
                category,
                priority,
            });

            if (result.success) {
                toast.success('Ticket created successfully');
                navigation.goBack();
            } else {
                toast.error(result.error || 'Failed to create ticket');
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
                <Text style={styles.headerTitle}>Create Ticket</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Subject */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Subject</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Brief summary of your issue"
                        placeholderTextColor={COLORS.textLight}
                        value={subject}
                        onChangeText={setSubject}
                        maxLength={100}
                    />
                </View>

                {/* Category */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Category</Text>
                    <View style={styles.optionsGrid}>
                        {TICKET_CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.optionChip,
                                    category === cat.id && styles.optionChipActive,
                                ]}
                                onPress={() => setCategory(cat.id)}
                            >
                                <Feather
                                    name={cat.icon}
                                    size={14}
                                    color={category === cat.id ? COLORS.primary : COLORS.textSecondary}
                                />
                                <Text
                                    style={[
                                        styles.optionChipText,
                                        category === cat.id && styles.optionChipTextActive,
                                    ]}
                                >
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Priority */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Priority</Text>
                    <View style={styles.priorityRow}>
                        {TICKET_PRIORITIES.map((p) => (
                            <TouchableOpacity
                                key={p.id}
                                style={[
                                    styles.priorityChip,
                                    priority === p.id && { backgroundColor: p.color + '15', borderColor: p.color },
                                ]}
                                onPress={() => setPriority(p.id)}
                            >
                                <View style={[styles.priorityDot, { backgroundColor: p.color }]} />
                                <Text
                                    style={[
                                        styles.priorityText,
                                        priority === p.id && { color: p.color },
                                    ]}
                                >
                                    {p.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Description */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.textInput, styles.textArea]}
                        placeholder="Describe your issue in detail (minimum 10 characters)"
                        placeholderTextColor={COLORS.textLight}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={5}
                        textAlignVertical="top"
                        maxLength={2000}
                    />
                    <Text style={styles.charCount}>{description.length}/2000</Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitBtn, (!isValid || submitting) && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={!isValid || submitting}
                >
                    {submitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <>
                            <Feather name="send" size={18} color="#FFFFFF" />
                            <Text style={styles.submitBtnText}>Submit Ticket</Text>
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
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
    },
    scrollView: { flex: 1 },
    scrollContent: { padding: 20 },
    fieldGroup: { marginBottom: 24 },
    label: {
        fontSize: 14,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
        marginBottom: 10,
    },
    textInput: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.text,
    },
    textArea: {
        minHeight: 120,
        paddingTop: 12,
    },
    charCount: {
        fontSize: 11,
        fontFamily: FONTS.regular,
        color: COLORS.textLight,
        textAlign: 'right',
        marginTop: 6,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 30,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 6,
    },
    optionChipActive: {
        backgroundColor: COLORS.primaryLight,
        borderColor: COLORS.primary,
    },
    optionChipText: {
        fontSize: 13,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
    },
    optionChipTextActive: {
        color: COLORS.primary,
    },
    priorityRow: {
        flexDirection: 'row',
        gap: 8,
    },
    priorityChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 30,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 6,
    },
    priorityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    priorityText: {
        fontSize: 13,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
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
        fontFamily: FONTS.semiBold,
        color: '#FFFFFF',
    },
});

export default CreateTicketScreen;
