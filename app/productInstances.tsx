import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from '@expo/vector-icons';
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from './AppNavigator';
import {fetchCartItems} from "@/app/cart";
import {useTheme} from "@/app/themeContext";

type ProductDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ProductDetail'>;
type ProductDetailScreenRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;

type ProductDetailProps = {
    navigation: ProductDetailScreenNavigationProp;
    route: ProductDetailScreenRouteProp;
};

interface Product {
    id: string;
    name: string;
    price: number;
    description: string;
    photo: string;
}

interface ProductInstance {
    id: string;
    expiration_date: string;
    quantity: number;
    state: string;
    discount: number;
}

interface Basket {
    id: number;
    name: string;
    price: number;
    commerce_id: number;
    products: { product_type: string; quantity: number }[];
    quantity: number;
    category: string;
}

interface CartItem {
    product_instance?: string;
    quantity: number;
    price: number;
    name: string;
    expiration_date?: string;
    photo: string;
    id?: string;
    basket_id?: number;
}

const fetchProductInstances = async (productId: string | number) => {
    const token = await AsyncStorage.getItem('token');
    const response = await fetch(`https://regusto.azurewebsites.net/api/product/${productId}/product_instance`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch product instances');
    }
    return response.json();
};

const addToCartApi = async (item: CartItem | { id: number; quantity: number }, cart: CartItem[] | undefined) => {
    const token = await AsyncStorage.getItem('token');
    let updatedCart = cart ? [...cart] : [];

    const existingItemIndex = updatedCart.findIndex(cartItem =>
        'basket_id' in item ? cartItem.basket_id === item.id : cartItem.product_instance === item.id
    );

    if (existingItemIndex > -1) {
        updatedCart[existingItemIndex].quantity += item.quantity;
    } else {
        updatedCart.push('basket_id' in item ? item : {...item, product_instance: item.id} as CartItem);
    }

    const body = {
        products: updatedCart
    };
    const response = await fetch(`https://regusto.azurewebsites.net/api/shop_cart`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        console.log('Failed to add item to cart:', response.status);
        throw new Error('Failed to add item to cart');
    }
    return response.json();
};

export const ProductDetailScreen: React.FC<ProductDetailProps> = ({ navigation, route }) => {
    const { item } = route.params;
    const [selectedInstance, setSelectedInstance] = useState<ProductInstance | Basket | null>(null);
    const [quantity, setQuantity] = useState(1);
    const queryClient = useQueryClient();
    const { colors } = useTheme();

    if (!item) {
        return (
            <SafeAreaView style={styles.container}>
                <Text>Producto no encontrado</Text>
            </SafeAreaView>
        );
    }

    const isBasket = item && typeof item === 'object' && 'products' in item;

    const { data: productInstances, isLoading } = useQuery<ProductInstance[]>({
        queryKey: ['productInstances', item.id],
        queryFn: () => fetchProductInstances(item.id),
        enabled: !isBasket,
    });

    const {data: cartItems, isLoading: cartLoading} = useQuery<CartItem[]>({
        queryKey: ['cartItems'],
        queryFn: fetchCartItems,
    })

    const addToCartMutation = useMutation({
        mutationFn: (item: CartItem | { id: number; quantity: number }) => addToCartApi(item, cartItems),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cartItems'] });
            queryClient.invalidateQueries({ queryKey: ['cartItemCount'] });
            navigation.goBack();
        },
        onError: (error: Error) => {
            console.error('Failed to add item to cart:', error);
            Alert.alert('Error al agregar producto al carrito', error.message);
        }
    });

    useEffect(() => {
        if (selectedInstance) {
            setQuantity(1);
        }
    }, [selectedInstance]);

    const handleAddToCart = () => {
        if (isBasket) {
            console.log('Adding basket to cart');
            const basketItem: CartItem = {
                id: item.id.toString(),
                basket_id: item.id,
                quantity,
                price: item.price,
                name: item.name,
                photo: 'https://via.placeholder.com/60',
            };
            addToCartMutation.mutate(basketItem);
        } else if (selectedInstance) {
            if (quantity > selectedInstance.quantity) {
                Alert.alert('Error', 'No se puede agregar más productos de los que hay en stock');
                return;
            }
            const cartItem: CartItem = {
                id: (selectedInstance as ProductInstance).id,
                product_instance: (selectedInstance as ProductInstance).id,
                quantity,
                price: (1 - (selectedInstance as ProductInstance).discount) * item.price,
                name: item.name,
                expiration_date: (selectedInstance as ProductInstance).expiration_date,
                photo: item.photo || 'https://via.placeholder.com/60',
            };
            addToCartMutation.mutate(cartItem);
        }
    };
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.secondaryBackground, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color={colors.icon} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Detalles</Text>
            </View>
            <ScrollView>
                <Image source={{ uri: (item as Product).photo || 'https://via.placeholder.com/300' }} style={styles.productImage} />
                <View style={styles.content}>
                    <Text style={[styles.productName, { color: colors.text }]}>{item.name}</Text>
                    {!isBasket && <Text style={[styles.productDescription, { color: colors.secondaryText }]}>{(item as Product).description}</Text>}
                    <View style={styles.priceContainer}>
                        {selectedInstance && (selectedInstance as ProductInstance).discount > 0 ? (
                            <>
                                <Text style={[styles.discountPrice, { color: colors.discount }]}>
                                    ${((1 - (selectedInstance as ProductInstance).discount) * item.price).toFixed(2)}
                                </Text>
                                <Text style={[styles.originalPrice, { color: colors.searchIcon }]}>
                                    ${item.price.toFixed(2)}
                                </Text>
                            </>
                        ) : (
                            <Text style={[styles.price, { color: colors.primary }]}>{item.price.toFixed(2)}</Text>
                        )}
                    </View>

                    {isBasket ? (
                        <><View style={styles.basketInfo}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Contenidos de Canasta:</Text>
                            {(item as Basket).products.map((product, index) => (
                                <Text key={index} style={[styles.basketItem, { color: colors.secondaryText }]}>
                                    {product.product_type}: {product.quantity}
                                </Text>
                            ))}
                        </View><View style={styles.basketInfo}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Stock: {item.quantity}</Text>
                        </View></>
                    ) : (
                        <>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Fecha de Vencimiento</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.instancesContainer}>
                                {isLoading ? (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                ) : (
                                    productInstances?.map((instance) => (
                                        <TouchableOpacity
                                            key={instance.id}
                                            style={[
                                                styles.instanceItem,
                                                selectedInstance?.id === instance.id && styles.selectedInstance,
                                                { borderColor: selectedInstance?.id === instance.id ? colors.primary : colors.border, backgroundColor: colors.card }
                                            ]}
                                            onPress={() => setSelectedInstance(instance)}
                                        >
                                            <Text style={[styles.instanceDate, { color: colors.text }]}>
                                                {new Date(instance.expiration_date).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                                            </Text>
                                            <Text style={[styles.instanceDiscount, { color: colors.discount }]}>
                                                {instance.discount > 0 ? `${(instance.discount * 100).toFixed(0)}% de descuento` : 'Sin descuento'}
                                            </Text>
                                            <Text style={[styles.instanceQuantity, { color: colors.secondaryText }]}>
                                                Stock: {instance.quantity}
                                            </Text>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </ScrollView>
                        </>
                    )}

                    <View style={styles.quantityContainer}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Cantidad</Text>
                        <View style={styles.quantityControls}>
                            <TouchableOpacity
                                style={styles.quantityButton}
                                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                                disabled={quantity <= 1}
                            >
                                <Feather name="minus" size={24} color={(quantity <= 1) ? colors.disabled : colors.primary} />
                            </TouchableOpacity>
                            <Text style={[styles.quantityText, { color: colors.text }]}>{quantity}</Text>
                            <TouchableOpacity
                                style={styles.quantityButton}
                                onPress={() => {
                                    setQuantity(quantity + 1);
                                }}
                                disabled={isBasket ? quantity >= item.quantity : quantity >= (selectedInstance?.quantity || 1)}
                            >
                                <Feather name="plus" size={24} color={(isBasket ? quantity >= item.quantity : quantity >= (selectedInstance?.quantity || 1)) ? colors.disabled : colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>
            <View style={[styles.footer, { backgroundColor: colors.secondaryBackground, borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={((!isBasket && !selectedInstance) || addToCartMutation.isPending) ? styles.addToCartButtonDisabled : [styles.addToCartButton, { backgroundColor: colors.primary }]}
                    onPress={handleAddToCart}
                    disabled={(!isBasket && !selectedInstance) || addToCartMutation.isPending}
                >
                    <Text style={[styles.addToCartButtonText, { color: colors.buttonText }]}>
                        {addToCartMutation.isPending ? 'Agregando al Carrito...' : 'Agregar al Carrito'}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    productImage: {
        width: '100%',
        height: 300,
        resizeMode: 'cover',
    },
    content: {
        padding: 16,
    },
    productName: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    productDescription: {
        fontSize: 16,
        marginBottom: 16,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    discountPrice: {
        fontSize: 24,
        fontWeight: 'bold',
        marginRight: 8,
    },
    originalPrice: {
        fontSize: 18,
        textDecorationLine: 'line-through',
    },
    price: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    instancesContainer: {
        flexDirection: 'row',
        marginBottom: 24,
    },
    instanceItem: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginRight: 12,
        alignItems: 'center',
    },
    selectedInstance: {
        borderColor: '#269577',
        backgroundColor: '#e6f7f2',
    },
    instanceDate: {
        fontSize: 14,
        marginBottom: 4,
    },
    instanceDiscount: {
        fontSize: 12,
    },
    quantityContainer: {
        marginBottom: 24,
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    quantityButton: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 4,
        padding: 8,
    },
    quantityText: {
        fontSize: 18,
        fontWeight: 'bold',
        width: 50,
        textAlign: 'center',
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
    },
    addToCartButton: {
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
    },
    addToCartButtonDisabled: {
        backgroundColor: '#cccccc',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
    },
    addToCartButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    basketInfo: {
        marginBottom: 24,
    },
    basketItem: {
        fontSize: 16,
        marginBottom: 4,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        zIndex: 1,
        height: 70,
        paddingTop: Platform.OS === 'ios' ? 0 : 16,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 16,
    },
    instanceQuantity: {
        fontSize: 12,
        marginTop: 4,
    },
});