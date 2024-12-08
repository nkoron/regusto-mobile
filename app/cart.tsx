import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    SafeAreaView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, CommonActions, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/app/AppNavigator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    runOnJS,
    useAnimatedGestureHandler,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { openMercadoPago } from "@/app/mercadoPago";
import {useTheme} from "@/app/themeContext";
import * as Linking from 'expo-linking';
export interface Preference {
    items: Items[];
    order: number;
}

export interface Items {
    title: string;
    quantity: number;
    unit_price: number;
    product_instance: string;
}

export interface CartItem {
    price: number;
    quantity: number;
    product_instance: string;
    name: string;
    id: string;
    expiration_date?: string;
    photo: string;
    basket_id?: string;
}

type CartNavigationProp = StackNavigationProp<RootStackParamList, 'Cart'>;

export const fetchCartItems = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
        throw new Error('You need to be logged in to view your cart.');
    }

    const response = await fetch('https://regusto.azurewebsites.net/api/shop_cart', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch cart items');
    }
    const data = await response.json();
    return data;
};

export const updateCartItem = async (updatedCartItems: CartItem[]) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
        throw new Error('You need to be logged in to update cart items.');
    }

    const response = await fetch('https://regusto.azurewebsites.net/api/shop_cart', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            products: updatedCartItems.map(item => ({
                product_instance: item.product_instance,
                quantity: item.quantity,
                price: item.price,
                name: item.name,
                id: item.id,
                expiration_date: item.expiration_date,
                basket_id: item.basket_id
            }))
        })
    });

    if (!response.ok) {
        throw new Error('Failed to update cart item');
    }

    return response.json();
};

const placeOrder = async (cartItems: CartItem[]) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
        throw new Error('You need to be logged in to checkout.');
    }

    const orderItems = cartItems.map((item: CartItem) => {
        if (item.basket_id) {
            return {
                basket_id: item.basket_id,
                quantity: item.quantity,
            };
        } else {
            return {
                product_instance: parseInt(item.product_instance),
                quantity: item.quantity,
            };
        }
    });

    const response = await fetch('https://regusto.azurewebsites.net/api/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            products: orderItems
        })
    });

    if (!response.ok) {
        throw new Error('Failed to place order!');
    }

    return response.json();
};

const CartItemComponent = React.memo(({
                                          item,
                                          onRemove,
                                          onUpdateQuantity,
                                          isUpdating,
                                          animatedItemId
                                      }: {
    item: CartItem;
    onRemove: (id: string) => void;
    onUpdateQuantity: (id: string, change: number) => void;
    isUpdating: boolean;
    animatedItemId: string | null;
}) => {
    const { colors } = useTheme();
    const translateX = useSharedValue(0);

    const panGestureHandler = useAnimatedGestureHandler({
        onActive: (event) => {
            translateX.value = Math.min(0, Math.max(-80, event.translationX));
        },
        onEnd: () => {
            const shouldSnap = translateX.value < -40;
            translateX.value = withSpring(shouldSnap ? -80 : 0, { damping: 50 });
        },
    });

    const rStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const rIconStyle = useAnimatedStyle(() => {
        const opacity = Math.min(1, -translateX.value / 80);
        return { opacity };
    });

    return (
        <View style={styles.cartItemContainer}>
            <Animated.View style={[styles.deleteIconContainer, rIconStyle]}>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => onRemove(item.id)}
                >
                    <Feather name="trash-2" size={24} color="white" />
                </TouchableOpacity>
            </Animated.View>
            <PanGestureHandler onGestureEvent={panGestureHandler}>
                <Animated.View style={[styles.cartItem, rStyle, { backgroundColor: colors.secondaryBackground }]}>
                    <Image source={{uri: `${item.photo ? item.photo : 'https://via.placeholder.com/60'}`}} style={styles.itemImage} />
                    <View style={styles.itemDetails}>
                        <Text style={[styles.itemName, { color: colors.primary }]}>{item.name}</Text>
                        <Text style={[styles.itemPrice, { color: colors.text }]}>
                            ${item.price !== undefined ? item.price.toFixed(2) : "Price not available"}
                        </Text>
                        {item.expiration_date && (
                            <Text style={[styles.itemPrice, { color: colors.text }]}>
                                Vence: {new Date(item.expiration_date).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                            </Text>
                        )}
                        {item.basket_id && (
                            <Text style={[styles.itemPrice, { color: colors.text }]}>
                                ID Canasta: {item.basket_id}
                            </Text>
                        )}
                    </View>
                    <View style={styles.quantityControl}>
                        <TouchableOpacity onPress={() => onUpdateQuantity(item.id, -1)} disabled={isUpdating}>
                            <Feather name="minus" size={24} color={colors.primary} />
                        </TouchableOpacity>
                        <Text style={[styles.quantityText, { color: colors.text }]}>{item.quantity}</Text>
                        <TouchableOpacity onPress={() => onUpdateQuantity(item.id, 1)} disabled={isUpdating}>
                            <Feather name="plus" size={24} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                    {isUpdating && animatedItemId === item.id && (
                        <ActivityIndicator size="small" color={colors.primary} style={styles.updateLoader} />
                    )}
                </Animated.View>
            </PanGestureHandler>
        </View>
    );
});

export default function CartPage() {
    const { colors } = useTheme();
    const navigation = useNavigation<CartNavigationProp>();
    const queryClient = useQueryClient();
    const [animatedItem, setAnimatedItem] = useState<string | null>(null);

    const { data: cartItems, isLoading, isError, refetch } = useQuery<CartItem[]>({
        queryKey: ['cartItems'],
        queryFn: fetchCartItems,
    });
    const createDeepLink = (screen: string, params = {}) => {
        return Linking.createURL(screen, {queryParams: params});
    };
    const updateQuantityMutation = useMutation({
        mutationFn: updateCartItem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cartItems'] });
            queryClient.invalidateQueries({ queryKey: ['cartItemCount'] });
            setAnimatedItem(null);
        },
    });

    const removeItemMutation = useMutation({
        mutationFn: updateCartItem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cartItems'] });
            queryClient.invalidateQueries({ queryKey: ['cartItemCount'] });
        },
    });

    const checkoutMutation = useMutation({
        mutationFn: placeOrder,

        onSuccess: async(data, variables) => {
            const preference = {
                items: variables.map((item : CartItem) => ({
                    title: item.name,
                    product_instance: item.product_instance,
                    quantity: item.quantity,
                    unit_price: item.price
                })),
                order: data.id,
                auto_return: 'approved',
                return_url: createDeepLink('/', {orderId: data.id})
            }
            console.log("PREFERENCE",preference);
            await openMercadoPago(preference, data.id);
            queryClient.invalidateQueries({ queryKey: ['cartItems'] });
            queryClient.invalidateQueries({ queryKey: ['cartItemCount'] });
        },
        onError: (error: Error) => {
            Alert.alert('Error', error.message);
        }
    });

    useFocusEffect(
        React.useCallback(() => {
            refetch();
        }, [refetch])
    );

    const updateQuantity = useCallback(async (id: string, change: number) => {
        if (!cartItems) return;

        setAnimatedItem(id);

        const updatedCartItems = cartItems.map((item: CartItem) =>
            item.id === id
                ? { ...item, quantity: Math.max(0, item.quantity + change) }
                : item
        ).filter((item: CartItem) => item.quantity > 0);

        updateQuantityMutation.mutate(updatedCartItems);
    }, [cartItems, updateQuantityMutation]);

    const removeItem = useCallback(async (id: string) => {
        if (!cartItems) return;

        const updatedCartItems = cartItems.filter((item: CartItem) => item.id !== id);
        removeItemMutation.mutate(updatedCartItems);
    }, [cartItems, removeItemMutation]);

    const getTotalPrice = useCallback(() => {
        if (!cartItems) return "0.00";
        return cartItems.reduce((total: number, item : CartItem) => total + item.price * item.quantity, 0).toFixed(2);
    }, [cartItems]);

    const handleCheckout = useCallback(() => {
        if (!cartItems) {
            console.error('No cart items found');
            return;
        }
        checkoutMutation.mutate(cartItems);
    }, [cartItems, checkoutMutation]);

    const handleGoBack = useCallback(() => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'MainTabs' }],
                })
            );
        }
    }, [navigation]);

    const renderItem = useCallback(({ item }: { item: CartItem }) => (
        <CartItemComponent
            item={item}
            onRemove={removeItem}
            onUpdateQuantity={updateQuantity}
            isUpdating={updateQuantityMutation.status === 'pending'}
            animatedItemId={animatedItem}
        />
    ), [removeItem, updateQuantity, updateQuantityMutation.status, animatedItem]);

    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.text }]}>Cargando los productos del carrito...</Text>
            </View>
        );
    }

    if (isError) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <Text style={[styles.loadingText, { color: colors.text }]}>Error cargando los productos del carrito. Por favor intentar de nuevo.</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.secondaryBackground, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={handleGoBack}>
                    <Feather name="arrow-left" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.primary }]}>Carrito</Text>
                <View style={{ width: 24 }} />
            </View>

            {cartItems && cartItems.length > 0 ? (
                <>
                    <FlatList
                        data={cartItems}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.cartList}
                    />
                    <View style={[styles.totalContainer, { backgroundColor: colors.secondaryBackground, borderTopColor: colors.border }]}>
                        <Text style={[styles.totalText, { color: colors.primary }]}>Total:</Text>
                        <Text style={[styles.totalPrice, { color: colors.primary }]}>${getTotalPrice()}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.checkoutButton, { backgroundColor: colors.primary }]}
                        onPress={handleCheckout}
                        disabled={checkoutMutation.status === 'pending'}
                    >
                        <Text style={[styles.checkoutButtonText, { color: colors.overText }]}>
                            {checkoutMutation.status === 'pending' ? 'Procesando...' : 'Avanzar a Pago'}
                        </Text>
                    </TouchableOpacity>
                </>
            ) : (
                <View style={styles.emptyCartContainer}>
                    <Feather name="shopping-cart" size={64} color={colors.primary} />
                    <Text style={[styles.emptyCartText, { color: colors.text }]}>Tu carrito esta vacio</Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    cartList: {
        paddingHorizontal: 16,
    },
    cartItemContainer: {
        position: 'relative',
        marginVertical: 8,
    },
    cartItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    deleteIconContainer: {
        position: 'absolute',
        right: 0,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    deleteButton: {
        backgroundColor: 'red',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height:  '100%',
        borderTopRightRadius: 8,
        borderBottomRightRadius: 8,
    },
    itemImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 16,
    },
    itemDetails: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '600',
    },
    itemPrice: {
        fontSize: 14,
        marginTop: 4,
    },
    quantityControl: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    quantityText: {
        fontSize: 16,
        fontWeight: '600',
        marginHorizontal: 8,
    },
    totalContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderTopWidth: 1,
    },
    totalText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    totalPrice: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    checkoutButton: {
        padding: 16,
        borderRadius: 8,
        margin: 16,
        alignItems: 'center',
    },
    checkoutButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    emptyCartContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyCartText: {
        fontSize: 18,
        marginTop: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
    updateLoader: {
        position: 'absolute',
        right: 8,
        top: 8,
    },
});