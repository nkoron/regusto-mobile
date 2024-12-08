import * as WebBrowser from 'expo-web-browser';
import {Alert} from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from 'expo-linking';

const CHECK_INTERVAL = 15000; // Check every 5 seconds
const MAX_CHECKS = 50; // Maximum number of checks (1 minute total)

const checkPaymentStatus = async (paymentId) => {
    try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
            throw new Error('You need to be logged in to view your cart.');
        }
        const response = await fetch(`https://regusto.azurewebsites.net/api/orders`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const myOrder = data.find(order => order.id === paymentId);
        console.log(myOrder);
        return myOrder.status === 'pending';
    } catch (error) {
        console.error('Error checking payment status:', error);
        return false;
    }
};

export const openMercadoPago = async (preference, orderId) => {


    const token = await AsyncStorage.getItem('token');
    try {
        const response = await fetch('https://regusto.azurewebsites.net/api/payment/createpreference', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(preference),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("data",data)
        // Open the browser with the Mercado Pago URL
        WebBrowser.openBrowserAsync(data.init_point);

        // Start checking payment status
        // let checksCount = 0;
        // const intervalId = setInterval(async () => {
        //     if (checksCount >= MAX_CHECKS) {
        //         clearInterval(intervalId);
        //         Alert.alert(
        //             'Payment Status',
        //             'We couldn\'t confirm your payment. Please check your Mercado Pago account.',
        //             [
        //                 { text: 'OK', onPress: () => WebBrowser.dismissBrowser() },
        //                 { text: 'I\'ve Paid', onPress: () => {
        //                         WebBrowser.dismissBrowser();
        //                         Alert.alert('Thank You', 'Thank you for your payment. We\'ll process your order shortly.');
        //                     }}
        //             ]
        //         );
        //         return;
        //     }
        //
        //     let isPaymentComplete = await checkPaymentStatus(orderId);
        //     if (isPaymentComplete) {
        //         clearInterval(intervalId);
        //         WebBrowser.dismissBrowser();
        //          Alert.alert('Payment Successful', 'Your payment has been processed successfully.');
        //         return;
        //     }
        //
        //     checksCount++;
        // }, CHECK_INTERVAL);

    } catch (error) {
        console.error('Error in openMercadoPago:', error);
        Alert.alert('Error', `Could not process payment: ${(error).message}`);
    }
};