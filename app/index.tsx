import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './AppNavigator';
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar, View } from 'react-native';
import 'react-native-get-random-values';
import ThemeProvider from './themeContext';
import { LinkingOptions, NavigationContainer } from "@react-navigation/native";
import * as Linking from 'expo-linking';
import { RootStackParamList } from './AppNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            staleTime: 1000 * 60 * 5, // 5 minutes
        },
    },
});

const prefix = Linking.createURL('/');

const linking: LinkingOptions<RootStackParamList> = {
    prefixes: [prefix, 'exp://', 'exp://192.168.0.7:8081', 'exp://192.168.0.7:8081/--/'],
    config: {
        screens: {
            Login: 'login',
            OpeningAnimation: 'opening',
            MainTabs: {
                screens: {
                    PaginaInicio: 'home',
                    Orders: 'orders',
                    Stores: 'stores',
                    Profile: 'profile',
                },
            },
            CommerceDetail: 'commerce/:storeId',
            Cart: 'cart',
            OrderDetails: 'order/:orderId',
            Favorites: 'favorites',
            ProductDetail: 'product/:productId',
            Chat: 'chat/:orderId',
            PaymentSuccess: 'payment-success/:orderId',
        },
    },
};

export default function App() {
    return (
        <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                <SafeAreaProvider>
                    <NavigationContainer linking={linking}>
                        <View style={{ flex: 1 }}>
                            <StatusBar translucent backgroundColor="transparent" />
                            <AppNavigator />
                        </View>
                    </NavigationContainer>
                </SafeAreaProvider>
            </QueryClientProvider>
        </ThemeProvider>
    );
}

