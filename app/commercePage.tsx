import React, {useCallback, useMemo, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from './AppNavigator';
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import asyncStorage from "@react-native-async-storage/async-storage/src/AsyncStorage";
import {SearchBar} from "./Components/SearchBar";
import {useTheme} from "@/app/themeContext";
type CommerceDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CommerceDetail'>;
type CommerceDetailScreenRouteProp = RouteProp<RootStackParamList, 'CommerceDetail'>;

type CommerceDetailProps = {
    navigation: CommerceDetailScreenNavigationProp;
    route: CommerceDetailScreenRouteProp;
};

interface Rating {
    id: string;
    stars: number;
    description: string;
    created_at: string;
}
export interface Product {
    id: string;
    name: string;
    price: number;
    discount?: number;
    description: string;
    category: string;
    isFavorite?: boolean;
    photo: string;
    stock: number;
}

export interface CartItem {
    product_instance: string;
    quantity: number;
    price: number;
    id: string;
}

export interface Basket {
    id: number;
    name: string;
    price: number;
    commerce_id: number;
    products: { product_type: string, quantity: number }[];
    quantity: number;
    category: string;
}

const fetchProducts = async (storeId: string) => {
    const token = await AsyncStorage.getItem('token');
    const response = await fetch(`https://regusto.azurewebsites.net/api/product?commerce_id=${storeId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch products');
    }

    return response.json();
};

export const fetchBaskets = async (storeId: string): Promise<Basket[]> => {
    const token = await AsyncStorage.getItem('token');

    const response = await fetch(`https://regusto.azurewebsites.net/api/basket?commerce_id=${storeId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch baskets ${response.statusText}`);
    }

    const baskets: Basket[] = await response.json();
    return baskets.map(basket => ({ ...basket, category: "Canastas" }));
};

const fetchCartItemCount = async () => {
    const token = await AsyncStorage.getItem('token');
    const response = await fetch('https://regusto.azurewebsites.net/api/shop_cart', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch cart items');
    }
    const cartItems: CartItem[] = await response.json();
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
};

const toggleFavoriteApi = async (storeId: string, isFavorite: boolean | undefined) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
        throw new Error('No token found');
    }

    const method = isFavorite ? 'DELETE' : 'POST';
    const response = await fetch(`https://regusto.azurewebsites.net/api/commerce/${storeId}/favorite`, {
        method: method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return !isFavorite;
};


const fetchRatings = async (storeId: string): Promise<Rating[]> => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
        throw new Error('No token found');
    }

    const response = await fetch(`https://regusto.azurewebsites.net/api/rating/${storeId}/commerce`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: Rating[] = await response.json();
    return data;
};

export const CommerceDetailScreen: React.FC<CommerceDetailProps> = ({ navigation, route }) => {
    const { store } = route.params;
    const [activeTab, setActiveTab] = useState('products');
    const [activeCategory, setActiveCategory] = useState('all');
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const { colors } = useTheme();

    const cartBounce = useSharedValue(1);
    const cartOpacity = useSharedValue(1);

    const cartAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: cartBounce.value }],
            opacity: cartOpacity.value,
        };
    });

    const { data: ratings, isLoading: ratingsLoading } = useQuery({
        queryKey: ['ratings', store.id],
        queryFn: () => fetchRatings(store.id),
    });


    const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
        queryKey: ['products', store.id],
        queryFn: () => fetchProducts(store.id),
    });

    const { data: baskets, isLoading: basketsLoading } = useQuery<Basket[]>({
        queryKey: ['baskets', store.id],
        queryFn: () => fetchBaskets(store.id),
    });

    const { data: cartItemCount, refetch: refetchCartItemCount } = useQuery({
        queryKey: ['cartItemCount'],
        queryFn: fetchCartItemCount,
    });

    const toggleFavoriteMutation = useMutation({
        mutationFn: () => toggleFavoriteApi(store.id, store.isFavorite),
        onSuccess: (newFavoriteState) => {
            store.isFavorite = newFavoriteState;
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
        },
        onError: (error) => {
            console.log('Error toggling favorite:', error);
            Alert.alert('Error', 'Ocurrió un error al actualizar los favoritos. Por favor, inténtalo de nuevo.');
        },
    });

    const traducirCategorias = (categoria: string) => {
        switch(categoria) {
            case 'Restaurant':
                return 'Restaurante';
            case 'Bakery':
                return 'Panadería';
            case 'Supermarket':
                return 'Supermercado';
            case 'all':
                return 'Productos';
        }
    }

    useFocusEffect(
        useCallback(() => {
            refetchCartItemCount();
        }, [refetchCartItemCount])
    );

    const filteredProducts = useMemo(() => {
        return (activeCategory === 'all' ? products?.filter((product: Product) => product.stock !== 0) : products?.filter((product: Product) => product.category === activeCategory))
            ?.filter((product: Product) => product.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [products, activeCategory, searchQuery]);



    const categories = products ? ['all', 'Canastas', ...new Set(products.map((product: Product) => product.category))] : ['all'];

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
            <SafeAreaView style={styles.safeArea}>
                <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Feather name="arrow-left" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>{store.name}</Text>
                    <TouchableOpacity style={styles.cartButton} onPress={() => navigation.navigate('Cart')}>
                        <Feather name="shopping-cart" size={24} color={colors.text} />
                        {(cartItemCount ?? 0) > 0 && (
                            <View style={styles.cartBadge}>
                                <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={[styles.searchBarContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                    <SearchBar onSearch={setSearchQuery} />
                </View>

                <ScrollView >
                    <View>
                        <Image
                            source={{ uri: `${store.logo ? store.logo : 'https://via.placeholder.com/150'}` }}
                            style={styles.storeImage}
                        />
                        <TouchableOpacity
                            style={styles.favoriteButton}
                            onPress={() => toggleFavoriteMutation.mutate()}
                        >
                            <Feather
                                name={"heart"}
                                size={24}
                                color={store.isFavorite ? "#FF6B6B" : "#FFFFFF"}
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.tabContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                        <TouchableOpacity
                            style={[
                                styles.tab,
                                activeTab === 'products' && [styles.activeTab, { borderBottomColor: colors.primary }]
                            ]}
                            onPress={() => setActiveTab('products')}
                        >
                            <Text style={[
                                styles.tabText,
                                { color: activeTab === 'products' ? colors.primary : colors.text }
                            ]}>Productos</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.tab,
                                activeTab === 'info' && [styles.activeTab, { borderBottomColor: colors.primary }]
                            ]}
                            onPress={() => setActiveTab('info')}
                        >
                            <Text style={[
                                styles.tabText,
                                { color: activeTab === 'info' ? colors.primary : colors.text }
                            ]}>Informacion</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.tab,
                                activeTab === 'rating' && [styles.activeTab, { borderBottomColor: colors.primary }]
                            ]}
                            onPress={() => setActiveTab('rating')}
                        >
                            <Text style={[
                                styles.tabText,
                                { color: activeTab === 'rating' ? colors.primary : colors.text }
                            ]}>Calificaciones</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <View style={styles.storeInfo}>
                            <Text style={[styles.storeName, { color: colors.text }]}>{store.name}</Text>
                            <Text style={[styles.storeCategory, { color: colors.text }]}>{traducirCategorias(store.category)}</Text>
                            <View style={styles.ratingContainer}>
                                {ratings && ratings?.length > 0 && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name="star" size={16} color="#F4D548" />
                                        <Text style={[styles.ratingText, { color: colors.text }]}>{store.rating.toFixed(1)} •</Text>
                                    </View>
                                )}
                                <Text style={[styles.reviewCount, { color: colors.text, marginLeft: ratings?.length || 0 > 0? 4 : 0 }]}>{`${ratings?.length || 0 > 0? ratings?.length + ' calificaciones' : 'No hay calificaciones'}`}</Text>
                            </View>
                        </View>

                        {activeTab === 'products' && (
                            <View style={styles.productsSection}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                                    {categories.map((category: string) => (
                                        <TouchableOpacity
                                            key={category}
                                            style={[
                                                styles.categoryButton,
                                                {
                                                    backgroundColor: activeCategory === category ? colors.primary : colors.card
                                                }
                                            ]}
                                            onPress={() => setActiveCategory(category)}
                                        >
                                            <Text style={[
                                                styles.categoryButtonText,
                                                {
                                                    color: activeCategory === category ? colors.buttonText : colors.text,
                                                    fontWeight: activeCategory === category ? 'bold' : 'normal'
                                                }
                                            ]}>
                                                {category === 'all' ? 'Productos' : category}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                {(activeCategory === 'Canastas') && (
                                    <View style={styles.basketsSection}>
                                        {basketsLoading ? (
                                            <ActivityIndicator size="large" color="#269577" />
                                        ) : baskets && baskets.length > 0 ? (
                                            baskets.map((basket) => basket.quantity > 0 && (
                                                <TouchableOpacity key={basket.id} style={[styles.basketItem, { backgroundColor: colors.card }]} onPress={() => navigation.navigate('ProductDetail', { item: basket })}>
                                                    <Text style={[styles.basketName, { color: colors.text }]}>{basket.name}</Text>
                                                    <Text style={[styles.price, { color: colors.primary }]}>{basket.price.toFixed(2)} $</Text>
                                                    <Text style={[styles.basketProductCount, { color: colors.text }]}>{basket.products.length} products</Text>
                                                </TouchableOpacity>
                                            ))
                                        ) : activeCategory === 'Canastas' && (
                                            <View style={[styles.noProductsContainer, { backgroundColor: colors.searchContainer,}]}>
                                                <Text style={[styles.noBasketText, { color: colors.text }]}>No hay canastas disponibles.</Text>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {(activeCategory === 'all' || (activeCategory !== 'Canastas')) && (
                                    <>
                                        {productsLoading ? (
                                            <View style={styles.loadingContainer}>
                                                <ActivityIndicator size="large" color="#269577" />
                                                <Text style={[styles.loadingText, { color: colors.text }]}>Loading products...</Text>
                                            </View>
                                        ) : filteredProducts?.length === 0 ? (
                                            <View style={[styles.noProductsContainer, { backgroundColor: colors.searchContainer,}]}>
                                                <Text style={[styles.noProductsText, { color: colors.text }]}>No hay productos disponibles.</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.productGrid}>
                                                {filteredProducts?.map((product: Product) => product.stock > 0 && (
                                                    <TouchableOpacity key={product.id} style={[styles.productItem, { backgroundColor: colors.card }]} onPress={() => navigation.navigate('ProductDetail', { item: product })}>
                                                        <Image
                                                            source={{ uri: `${product.photo ? product.photo : 'https://via.placeholder.com/60'}` }}
                                                            style={styles.productImage}
                                                        />
                                                        <View style={styles.productInfo}>
                                                            <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>{product.name}</Text>
                                                            <Text style={[styles.productDescription, { color: colors.text }]} numberOfLines={2}>{product.description}</Text>
                                                            <View style={styles.priceContainer}>
                                                                {product.discount && product.discount > 0 ? (
                                                                    <>
                                                                        <Text style={styles.discountPrice}>{(product.price * (1 - product.discount)).toFixed(2)} $</Text>
                                                                        <Text style={[styles.originalPrice, { color: colors.text }]}>{product.price.toFixed(2)} $</Text>
                                                                    </>
                                                                ) : (
                                                                    <Text style={[styles.price, { color: colors.primary }]}>{product.price.toFixed(2)} $</Text>
                                                                )}
                                                            </View>
                                                        </View>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>
                        )}

                        {activeTab === 'rating' && (
                            <View style={styles.ratingSection}>
                                {ratingsLoading ? (
                                    <ActivityIndicator size="large" color="#269577" />
                                ) : ratings && ratings.length > 0 ? (
                                    ratings.map((rating: Rating) => (
                                        <View key={rating.id} style={[styles.ratingItem, { backgroundColor: colors.card }]}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <View style={styles.ratingStars}>
                                                    {[...Array(5)].map((_, i) => (
                                                        <Ionicons
                                                            key={i}
                                                            name={i < rating.stars ? "star" : "star-outline"}
                                                            size={16}
                                                            color={i < rating.stars ? "#F4D548" : "#D1D5DB"}
                                                        />
                                                    ))}
                                                </View>
                                                <Text style={[styles.ratingDescription, { color: colors.text, marginLeft: 8 }]}>
                                                    {new Date(rating.created_at).toLocaleDateString('en-CA')}
                                                </Text>
                                            </View>
                                            <Text style={[styles.ratingDescription, { color: colors.text }]}>{rating.description}</Text>
                                        </View>
                                    ))
                                ) : (
                                    <Text style={[styles.noRatingsText, { color: colors.text }]}>Este comercio no ha sido calificado aun</Text>
                                )}
                            </View>
                        )}

                        {activeTab === 'info' && (
                            <View style={styles.infoSection}>
                                <Text style={[styles.infoTitle, { color: colors.text }]}>About {store.name}</Text>
                                <View style={styles.infoItem}>
                                    <MaterialCommunityIcons name="clock-outline" size={24} color={colors.primary} />
                                    <Text style={[styles.infoText, { color: colors.text }]}>Open: 9:00 AM - 9:00 PM</Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <MaterialCommunityIcons name="phone-outline" size={24} color={colors.primary} />
                                    <Text style={[styles.infoText, { color: colors.text }]}>{store?.phone}</Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <MaterialCommunityIcons name="web" size={24} color={colors.primary} />
                                    <Text style={[styles.infoText, { color: colors.text }]}>www.{store.name.toLowerCase().replace(/\s/g, '')}.com</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    backButton: {
        padding: 8,
    },
    cartButton: {
        padding: 8,
    },
    cartBadge: {
        position: 'absolute',
        right: 0,
        top: 0,
        backgroundColor: '#FF6B6B',
        borderRadius: 10,
        width: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cartBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    storeImage: {
        width: '100%',
        height: 200,
        resizeMode: 'cover',
    },
    favoriteButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        padding: 8,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    tab: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#269577',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4A4A4A',
    },
    activeTabText: {
        color: '#269577',
    },
    content: {
        padding: 16,
    },
    storeInfo: {
        marginBottom: 16,
    },
    storeName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    storeCategory: {
        fontSize: 16,
        color: '#6B7280',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    ratingText: {
        fontSize: 16,
        marginLeft: 4,
        color: '#6B7280',
    },
    reviewCount: {
        color: '#6B7280',
    },
    productsSection: {
        marginTop: 16,
    },
    categoryScroll: {
        marginBottom: 16,
    },
    categoryButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#F9FAFB',
        marginRight: 8,
    },
    activeCategoryButton: {
        backgroundColor: '#D1FAE5',
    },
    categoryButtonText: {
        fontSize: 14,
        color: '#4A4A4A',
    },
    activeCategoryButtonText: {
        fontWeight: 'bold',
        color: '#269577',
    },
    productGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    productItem: {
        width: '48%',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
        elevation: 2,
    },
    productImage: {
        width: '100%',
        height: 120,
        resizeMode: 'cover',
        borderRadius: 8,
        marginBottom: 8,
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#1F2937',
    },
    productDescription: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    discountPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginRight: 8,
    },
    originalPrice: {
        fontSize: 14,
        textDecorationLine: 'line-through',
        color: '#6B7280',
    },
    price: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#269577',
    },
    basketsSection: {
        marginTop: 24,
    },
    basketItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
        elevation: 2,
    },
    basketName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    basketPrice: {
        fontSize: 16,
        color: '#269577',
        marginTop: 4,
    },
    basketProductCount: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    noBasketText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
    },
    ratingSection: {
        marginTop: 16,
    },
    ratingItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
        elevation: 2,
    },
    ratingStars: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    ratingDescription: {
        fontSize: 14,
        color: '#6B7280',
    },
    noRatingsText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 16,
    },
    infoSection: {
        marginTop: 16,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#1F2937',
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    infoText: {
        marginLeft: 12,
        fontSize: 16,
        color: '#4A4A4A',
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 8,
        fontSize: 16,
        color: '#4A4A4A',
    },
    noProductsContainer: {
        padding: 40,
        borderRadius: 8,
        alignItems: 'center',
        marginVertical: 16,
        color: '#4A4A4A',
    },
    noProductsText: {
        fontSize: 18,

    },
    searchBarContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
});

