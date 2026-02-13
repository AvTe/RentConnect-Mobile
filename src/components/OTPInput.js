import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet, Text } from 'react-native';

const OTPInput = ({ length = 6, onComplete, error }) => {
    const [otp, setOtp] = useState(Array(length).fill(''));
    const inputRefs = useRef([]);

    const handleChange = (text, index) => {
        if (!/^\d*$/.test(text)) return;

        const newOtp = [...otp];
        newOtp[index] = text.slice(-1);
        setOtp(newOtp);

        // Auto-advance to next input
        if (text && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when complete
        if (newOtp.every(d => d !== '')) {
            onComplete?.(newOtp.join(''));
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleFocus = (index) => {
        // selectTextOnFocus prop handles text selection on focus
        // No additional native props manipulation needed
    };

    return (
        <View style={styles.container}>
            <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                    <TextInput
                        key={i}
                        ref={el => inputRefs.current[i] = el}
                        value={digit}
                        onChangeText={t => handleChange(t, i)}
                        onKeyPress={e => handleKeyPress(e, i)}
                        onFocus={() => handleFocus(i)}
                        keyboardType="number-pad"
                        maxLength={1}
                        style={[
                            styles.otpInput,
                            digit && styles.otpInputFilled,
                            error && styles.otpInputError,
                        ]}
                        selectTextOnFocus
                    />
                ))}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
    },
    otpInput: {
        width: 48,
        height: 56,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        textAlign: 'center',
        fontSize: 24,
        fontWeight: '600',
        color: '#1F2937',
        backgroundColor: '#FFFFFF',
    },
    otpInputFilled: {
        borderColor: '#FE9200',
        backgroundColor: '#FFF5E6',
    },
    otpInputError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEE2E2',
    },
    errorText: {
        marginTop: 12,
        fontSize: 14,
        color: '#EF4444',
        textAlign: 'center',
    },
});

export default OTPInput;
