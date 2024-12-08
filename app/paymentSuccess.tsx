import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/app/AppNavigator";
import { Feather } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Order } from "@/app/orders";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useTheme} from "@/app/themeContext";
import {updateCartItem} from "@/app/cart";

type PaymentSuccessRouteProp = RouteProp<RootStackParamList, 'PaymentSuccess'>;
type PaymentSuccessNavigationProp = StackNavigationProp<RootStackParamList, 'PaymentSuccess'>;

export default function PaymentSuccessPage() {
    const navigation = useNavigation<PaymentSuccessNavigationProp>();
    const route = useRoute<PaymentSuccessRouteProp>();
    const [orderDetails, setOrderDetails] = useState<Order>();
    const queryClient = useQueryClient();
    const { colors } = useTheme(); // Get the colors from the theme context

    useEffect(() => {
        const fetchOrderDetails = async () => {
            try {
                const { orderId } = route.params;
                const token = await AsyncStorage.getItem('token');
                if (!token) throw new Error('No token found');
                console.log('orderId2', orderId);
                const response = await fetch(`https://regusto.azurewebsites.net/api/orders/${orderId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    console.log('response', response.statusText);
                    throw new Error('Failed to fetch order details');
                }

                const data = await response.json();
                console.log("data", data);
                setOrderDetails(data);
            } catch (error) {
                console.error('Error fetching order details:', error);
                // Handle error (e.g., show an error message to the user)
            }
        };

        fetchOrderDetails();
    }, [route.params]);

    const updateQuantityMutation = useMutation({
        mutationFn: updateCartItem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cartItems'] });
            queryClient.invalidateQueries({ queryKey: ['cartItemCount'] });
        },
    });

    const handleContinueShopping = async () => {
        const token = await AsyncStorage.getItem('token');
        const response = await fetch('https://regusto.azurewebsites.net/api/shop_cart', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                products: [],
            })
        });
        if (!response.ok) {
            throw new Error('Failed to update cart item');
        }
        updateQuantityMutation.mutate([]);
        navigation.replace('MainTabs', { screen: 'PaginaInicio' });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                <Feather name="check-circle" size={64} color={colors.primary} />
                <Text style={[styles.title, { color: colors.primary }]}>Pago Exitoso!</Text>
                <Text style={[styles.subtitle, { color: colors.text }]}>Gracias por tu compra.</Text>
                {orderDetails && (
                    <View style={[styles.orderDetails, { backgroundColor: colors.card }]}>
                        <Text style={[styles.orderTitle, { color: colors.text }]}>Detalles de tu orden:</Text>
                        <Text style={{ color: colors.text }}>ID Orden: {orderDetails.order_id}</Text>
                        <Text style={{ color: colors.text }}>Total: ${orderDetails.price.toFixed(2)}</Text>
                        <Text style={{ color: colors.text }}>Fecha: {new Date(orderDetails.created_at).toLocaleDateString()}</Text>
                    </View>
                )}
                <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleContinueShopping}>
                    <Text style={[styles.buttonText, { color: colors.buttonText }]}>Continuar comprando</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 20,
    },
    subtitle: {
        fontSize: 18,
        marginTop: 10,
    },
    orderDetails: {
        marginTop: 30,
        padding: 20,
        borderRadius: 8,
        width: '100%',
    },
    orderTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    button: {
        padding: 15,
        borderRadius: 8,
        marginTop: 30,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});