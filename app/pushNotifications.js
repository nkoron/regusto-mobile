import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import {Platform} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Configure basic notification handling
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

// Function to register for push notifications and send token to backend
export async function registerForPushNotificationsAsync() {
    if (!Device.isDevice) {
        alert('Must use physical device for Push Notifications');
        return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return;
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'fergalicious',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }
    try {
        const response = await fetch('https://regusto.azurewebsites.net/api/subscribe-to-topic', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${await AsyncStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: token,
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to register push token: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error sending push token to backend:', error);
    }

    return token;
}

