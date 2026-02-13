import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export const usePushNotifications = () => {
    const [expoPushToken, setExpoPushToken] = useState(null);
    const [notification, setNotification] = useState(null);
    const [error, setError] = useState(null);

    const notificationListener = useRef();
    const responseListener = useRef();

    useEffect(() => {
        // Register for push notifications
        registerForPushNotificationsAsync()
            .then(token => {
                if (token) {
                    setExpoPushToken(token);
                    // Save token to database
                    savePushTokenToDatabase(token);
                }
            })
            .catch(err => {
                console.error('Push notification registration error:', err);
                setError(err.message);
            });

        // Listen for incoming notifications
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
            logger.log('Notification received:', notification);
        });

        // Listen for notification responses (when user taps notification)
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            logger.log('Notification response:', response);
            handleNotificationResponse(response);
        });

        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
        };
    }, []);

    return {
        expoPushToken,
        notification,
        error,
    };
};

async function registerForPushNotificationsAsync() {
    let token;

    // Push notifications only work on physical devices
    if (!Device.isDevice) {
        logger.log('Push notifications require a physical device');
        return null;
    }

    // Check if Android and set notification channel
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FE9200',
        });
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not already granted
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        logger.log('Push notification permission denied');
        return null;
    }

    // Get the push token
    try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;

        if (!projectId) {
            // For development, use experience ID
            token = (await Notifications.getExpoPushTokenAsync()).data;
        } else {
            token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        }

        logger.log('Expo Push Token:', token);
        return token;
    } catch (error) {
        console.error('Error getting push token:', error);
        return null;
    }
}

async function savePushTokenToDatabase(token) {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // Update the user's record with the push token
            const { error } = await supabase
                .from('users')
                .update({
                    push_token: token,
                    push_token_updated_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (error) {
                console.error('Error saving push token:', error);
            } else {
                logger.log('Push token saved to database');
            }
        }
    } catch (error) {
        console.error('Error saving push token:', error);
    }
}

function handleNotificationResponse(response) {
    const data = response.notification.request.content.data;

    // Handle different notification types
    if (data?.type === 'lead') {
        // Navigate to lead details
        logger.log('Navigate to lead:', data.leadId);
    } else if (data?.type === 'message') {
        // Navigate to messages
        logger.log('Navigate to message:', data.messageId);
    } else if (data?.type === 'request') {
        // Navigate to request details
        logger.log('Navigate to request:', data.requestId);
    }
}

// Helper function to send a local notification
export async function sendLocalNotification(title, body, data = {}) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data,
            sound: true,
        },
        trigger: null, // Immediately
    });
}

// Helper function to schedule a notification
export async function scheduleNotification(title, body, data = {}, seconds = 5) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data,
            sound: true,
        },
        trigger: {
            seconds,
        },
    });
}

// Helper to cancel all scheduled notifications
export async function cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

export default usePushNotifications;
