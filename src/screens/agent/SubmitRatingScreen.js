import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { submitAgentRating, RATING_CATEGORIES } from '../../lib/ratingService';
import { COLORS, FONTS } from '../../constants/theme';

const SubmitRatingScreen = ({ navigation, route }) => {
    const { agentId, agentName, leadId } = route.params;
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const toast = useToast();

    const [overallRating, setOverallRating] = useState(0);
    const [review, setReview] = useState('');
    const [categoryRatings, setCategoryRatings] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const handleCategoryRating = (categoryId, rating) => {
        setCategoryRatings(prev => ({ ...prev, [categoryId]: rating }));
    };

    const isValid = overallRating > 0;

    const handleSubmit = async () => {
        if (!isValid || submitting) return;

        setSubmitting(true);
        try {
            const result = await submitAgentRating({
                agentId,
                tenantId: user.id,
                leadId,
                rating: overallRating,
                review: review.trim(),
                categories: categoryRatings,
            });

            if (result.success) {
                toast.success('Rating submitted successfully');
                navigation.goBack();
            } else {
                toast.error(result.error || 'Failed to submit rating');
            }
        } catch (error) {
            toast.error('Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    const renderStarSelector = (currentRating, onSelect, size = 32) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <TouchableOpacity key={i} onPress={() => onSelect(i)} activeOpacity={0.7}>
                    <Feather
                        name="star"
                        size={size}
                        color={i <= currentRating ? COLORS.starFilled : COLORS.starEmpty}
                    />
                </TouchableOpacity>
            );
        }
        return <View style={styles.starsRow}>{stars}</View>;
    };

    const getRatingLabel = (rating) => {
        if (rating === 0) return 'Tap to rate';
        if (rating === 1) return 'Poor';
        if (rating === 2) return 'Fair';
        if (rating === 3) return 'Good';
        if (rating === 4) return 'Very Good';
        return 'Excellent';
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Feather name="chevron-left" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Rate Agent</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Agent Info */}
                <View style={styles.agentCard}>
                    <View style={styles.agentAvatar}>
                        <Feather name="user" size={24} color={COLORS.primary} />
                    </View>
                    <Text style={styles.agentName}>{agentName || 'Agent'}</Text>
                    <Text style={styles.agentSubtext}>How was your experience?</Text>
                </View>

                {/* Overall Rating */}
                <View style={styles.ratingSection}>
                    <Text style={styles.sectionLabel}>Overall Rating</Text>
                    <View style={styles.overallRatingWrap}>
                        {renderStarSelector(overallRating, setOverallRating, 40)}
                        <Text style={[
                            styles.ratingLabel,
                            overallRating > 0 && { color: COLORS.starFilled },
                        ]}>
                            {getRatingLabel(overallRating)}
                        </Text>
                    </View>
                </View>

                {/* Category Ratings */}
                <View style={styles.ratingSection}>
                    <Text style={styles.sectionLabel}>Rate by Category</Text>
                    {RATING_CATEGORIES.map((cat) => (
                        <View key={cat.id} style={styles.categoryRow}>
                            <View style={styles.categoryLeft}>
                                <Feather name={cat.icon} size={16} color={COLORS.textSecondary} />
                                <Text style={styles.categoryLabel}>{cat.label}</Text>
                            </View>
                            {renderStarSelector(
                                categoryRatings[cat.id] || 0,
                                (rating) => handleCategoryRating(cat.id, rating),
                                22
                            )}
                        </View>
                    ))}
                </View>

                {/* Review */}
                <View style={styles.ratingSection}>
                    <Text style={styles.sectionLabel}>Write a Review (Optional)</Text>
                    <TextInput
                        style={styles.reviewInput}
                        placeholder="Share your experience with this agent..."
                        placeholderTextColor={COLORS.textLight}
                        value={review}
                        onChangeText={setReview}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        maxLength={500}
                    />
                    <Text style={styles.charCount}>{review.length}/500</Text>
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
                            <Feather name="check" size={18} color="#FFFFFF" />
                            <Text style={styles.submitBtnText}>Submit Rating</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
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
    backBtn: { padding: 4 },
    headerTitle: {
        fontSize: 18,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
    },
    scrollView: { flex: 1 },
    scrollContent: { padding: 20 },
    agentCard: {
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 24,
        marginBottom: 24,
    },
    agentAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    agentName: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        marginBottom: 4,
    },
    agentSubtext: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
    },
    ratingSection: {
        marginBottom: 24,
    },
    sectionLabel: {
        fontSize: 15,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
        marginBottom: 14,
    },
    overallRatingWrap: {
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 20,
    },
    starsRow: {
        flexDirection: 'row',
        gap: 6,
    },
    ratingLabel: {
        fontSize: 15,
        fontFamily: FONTS.medium,
        color: COLORS.textLight,
        marginTop: 10,
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 14,
        marginBottom: 8,
    },
    categoryLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    categoryLabel: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: COLORS.text,
    },
    reviewInput: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.text,
        minHeight: 100,
    },
    charCount: {
        fontSize: 11,
        fontFamily: FONTS.regular,
        color: COLORS.textLight,
        textAlign: 'right',
        marginTop: 6,
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 30,
        gap: 8,
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

export default SubmitRatingScreen;
