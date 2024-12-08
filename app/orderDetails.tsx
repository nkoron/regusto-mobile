import React, {useCallback, useEffect} from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { RootStackParamList } from "@/app/AppNavigator";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchRatingInfo } from "@/app/ratings";
import {useTheme} from "@/app/themeContext";

type OrderDetailsPageProps = {
    route: RouteProp<RootStackParamList, 'OrderDetails'>;
    navigation: NavigationProp<any>;
};

const traducirOrdenes = (status: string) => {
    switch (status) {
        case 'accepted':
            return 'Aceptado';
        case 'pending':
            return 'Pendiente';
        case 'ready':
            return 'Listo';
        case 'completed':
            return 'Completado';
        case 'payed':
            return 'Pagado';
        case 'rejected':
            return 'Rechazado';
        case 'rated':
            return 'Calificado';
        default:
            return 'Desconocido';
    }
}

export default function OrderDetailsPage({ route, navigation }: OrderDetailsPageProps) {
    const { colors } = useTheme();
    const { order, storeName } = route.params;

    const handleRateOrder = () => {
        navigation.navigate('Rating', { order: order });
    };

    const queryClient = useQueryClient();

    const totalPrice = order.products.reduce((sum, product) => sum + product.price, 0);

    const totalDiscount = order.products.reduce((totalDiscount, product) => {
        return totalDiscount + product.price * product.discount;
    }, 0);

    const { data: ratingInfo, isLoading: isLoadingInfo, isError: isErrorInfo } = useQuery({
        queryKey: ['ratingInfo', order.order_id],
        queryFn: () => fetchRatingInfo(order.order_id),
    });


    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            <Animated.View entering={FadeInDown.delay(200)} style={[styles.header, { backgroundColor: colors.secondaryBackground, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Feather name="arrow-left" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.primary }]}>Detalles de la orden</Text>
                <View style={{ width: 24 }} />
            </Animated.View>

            <Animated.View entering={FadeInRight.delay(400)} style={[styles.orderInfo, { backgroundColor: colors.secondaryBackground }]}>
                <Text style={[styles.orderId, { color: colors.primary }]}>Orden #{order.order_id}</Text>
                <Text style={[styles.orderDate, { color: colors.text }]}>{new Date(order.created_at).toLocaleString()}</Text>
                <Text style={[styles.orderStatus, { color: colors.primary }]}>{traducirOrdenes(order.status)}</Text>
            </Animated.View>

            <Animated.View entering={FadeInRight.delay(600)} style={[styles.commerceInfo, { backgroundColor: colors.secondaryBackground }]}>
                <Text style={[styles.commerceName, { color: colors.primary }]}>{storeName}</Text>
            </Animated.View>

            <Animated.View entering={FadeInRight.delay(800)} style={[styles.productList, { backgroundColor: colors.secondaryBackground }]}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Productos</Text>
                {order.products.map((product, index) => (
                    <View key={index} style={styles.productItem}>
                        <Text style={[styles.productName, { color: colors.text }]}>{product.name}</Text>
                        <View style={styles.productDetails}>
                            <Text style={[styles.productQuantity, { color: colors.text }]}>x{product.quantity}</Text>
                            <Text style={[styles.productPrice, { color: colors.text }]}>{`$${product.price.toFixed(2)}`}</Text>
                        </View>
                    </View>
                ))}
            </Animated.View>

            <Animated.View entering={FadeInRight.delay(1000)} style={[styles.orderSummary, { backgroundColor: colors.secondaryBackground }]}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Resumen de la Orden</Text>
                <View style={styles.summaryItem}>
                    <Text style={{ color: colors.text }}>Subtotal</Text>
                    <Text style={{ color: colors.text }}>{`$${totalPrice.toFixed(2)}`}</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={{ color: colors.text }}>Descuentos</Text>
                    <Text style={{ color: colors.text }}>
                        {totalDiscount > 0 ? `$${totalDiscount.toFixed(2)}` : '$0'}
                    </Text>
                </View>
                <View style={[styles.summaryItem, styles.totalItem]}>
                    <Text style={[styles.totalText, { color: colors.primary }]}>Total</Text>
                    <Text style={[styles.totalAmount, { color: colors.primary }]}>{`$${order.price.toFixed(2)}`}</Text>
                </View>
            </Animated.View>

            {order.status === 'completed' && order.rating !== "rated" && (
                <Animated.View entering={FadeInRight.delay(1200)} style={styles.ratingButtonContainer}>
                    <TouchableOpacity style={[styles.ratingButton, { backgroundColor: colors.primary }]} onPress={handleRateOrder}>
                        <Feather name="star" size={24} color={colors.overText} style={styles.ratingButtonIcon} />
                        <Text style={[styles.ratingButtonText, { color: colors.overText }]}>Calificar esta Orden</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}
            {order.rating === "rated" && (
                <Animated.View entering={FadeInRight.delay(1200)} style={styles.ratingButtonContainer}>
                    <TouchableOpacity style={[styles.ratingButton, { backgroundColor: colors.primary }]} onPress={handleRateOrder}>
                        <Feather name="star" size={24} color={colors.overText} style={styles.ratingButtonIcon} />
                        <Text style={[styles.ratingButtonText, { color: colors.overText }]}>Orden ya calificada</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    orderInfo: {
        padding: 16,
        marginTop: 16,
        borderRadius: 12,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    orderId: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    orderDate: {
        fontSize: 14,
        marginBottom: 8,
    },
    orderStatus: {
        fontSize: 16,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    commerceInfo: {
        padding: 16,
        marginTop: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    commerceName: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    productList: {
        padding: 16,
        marginTop: 16,
        borderRadius: 12,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    productItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    productName: {
        fontSize: 16,
        flex: 1,
    },
    productDetails: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    productQuantity: {
        fontSize: 14,
        marginRight: 8,
    },
    productPrice: {
        fontSize: 16,
        fontWeight: '600',
    },
    orderSummary: {
        padding: 16,
        marginTop: 16,
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    summaryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    totalItem: {
        borderTopWidth: 1,
        paddingTop: 8,
        marginTop: 8,
    },
    totalText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    totalAmount: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    ratingButtonContainer: {
        padding: 16,
        marginBottom: 16,
    },
    ratingButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    ratingButtonIcon: {
        marginRight: 8,
    },
    ratingButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});

