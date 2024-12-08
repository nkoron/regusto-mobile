import React, { useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
    Extrapolation,
    FadeIn,
    FadeInDown,
    interpolate,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';
import { NavigationProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {useTheme} from "@/app/themeContext";

// import {Restaurante} from "@/app/Components/Interfaces";
// import {Product} from "@/app/Components/Interfaces";

const { width } = Dimensions.get('window');

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    state: string;
    commerce_id: string;
    stock: number;
}


interface FavoriteProduct {
    id: string;
    product_id: string;
    user_id: string;
    product: Product;
}

interface Restaurante {
    id: string;
    commerce_id: string;
    user_id: string;
    name: string;
    category: string;
    phone: string;
    rating: number;
}

interface FavoriteCommerce {
    id: string;
    commerce: Restaurante;
}

type FavoriteItem = FavoriteProduct | FavoriteCommerce;

const fetchFavoriteProducts = async (): Promise<FavoriteProduct[]> => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
        throw new Error('No token found');
    }

    const response = await fetch('https://regusto.azurewebsites.net/api/favorite/product', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
};

const fetchFavoriteCommerces = async (): Promise<FavoriteCommerce[]> => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
        throw new Error('No token found');
    }

    const response = await fetch('https://regusto.azurewebsites.net/api/favorite/commerce', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
};
export default function FavoritesPage({ navigation }: { navigation: NavigationProp<any> }) {
    const { colors } = useTheme(); // Get the colors from the theme context
    const [activeTab, setActiveTab] = useState<'products' | 'commerces'>('products');
    const scrollY = useSharedValue(0);
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();

    const { data: favoriteProducts, isLoading: productsLoading } = useQuery<FavoriteProduct[]>({
        queryKey: ['favoriteProducts'],
        queryFn: fetchFavoriteProducts,
    });

    const { data: favoriteCommerces, isLoading: commercesLoading } = useQuery<FavoriteCommerce[]>({
        queryKey: ['favorites'],
        queryFn: fetchFavoriteCommerces,
    });

    const toggleFavoriteMutation = useMutation({
        mutationFn: async ({ id, type }: { id: string; type: 'product' | 'commerce' }) => {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                throw new Error('No token found');
            }

            const url = type === 'product'
                ? `https://regusto.azurewebsites.net/api/favorites/${id}`
                : `https://regusto.azurewebsites.net/api/commerce/${id}/favorite`;

            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        },
        onSuccess: (_, { id, type }) => {
            queryClient.setQueryData<FavoriteItem[]>(
                [type === 'product' ? 'favoriteProducts' : 'favorites'],
                (oldData) => oldData ? oldData.filter(item => item.id !== id) : []
            );
            queryClient.invalidateQueries({ queryKey: [type === 'product' ? 'favoriteProducts' : 'favorites'] });
        },
        onError: (error) => {
            console.error('Error removing favorite:', error);
            Alert.alert('Error', 'Ocurrió un error al actualizar los favoritos. Por favor, inténtalo de nuevo.');
        },
    });

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
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
                return 'Todos';
        }
    }

    const renderFavoriteItem = ({ item }: { item: FavoriteItem }) => {
        if ('product' in item) {
            return (
                <Animated.View
                    entering={FadeInDown.delay(100).springify()}
                    style={[styles.card, { backgroundColor: colors.card }]}
                >
                    <TouchableOpacity style={styles.cardTouchable}>
                        <View style={styles.cardImageContainer}>
                            <Image source={{ uri: 'https://via.placeholder.com/100' }} style={styles.cardImage} />
                        </View>
                        <View style={styles.cardDetails}>
                            <Text style={[styles.cardTitle, { color: colors.primary }]}>{item.product.name}</Text>
                            <Text style={[styles.cardDescription, { color: colors.text }]} numberOfLines={2}>{item.product.description}</Text>
                            <View style={styles.cardInfoContainer}>
                                <View style={styles.cardCategoryContainer}>
                                    <Feather name="tag" size={14} color={colors.icon} />
                                    <Text style={[styles.cardCategoryText, { color: colors.primary }]}>{item.product.category}</Text>
                                </View>
                                <Text style={[styles.cardPriceText, { color: colors.primary }]}>${item.product.price.toFixed(2)}</Text>
                            </View>
                            <View style={styles.cardStockContainer}>
                                <Feather name="package" size={14} color={colors.icon} />
                                <Text style={[styles.cardStockText, { color: colors.text }]}>{item.product.stock}</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.favoriteButton}
                            onPress={() => toggleFavoriteMutation.mutate({ id: item.product_id, type: 'product' })}
                        >
                            <Feather name="heart" size={24} color={colors.favorite} />
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Animated.View>
            );
        } else {
            return (
                <Animated.View
                    entering={FadeInDown.delay(100).springify()}
                    style={[styles.card, { backgroundColor: colors.card }]}
                >
                    <TouchableOpacity style={styles.cardTouchable} onPress={() => navigation.navigate("CommerceDetail", {store: item.commerce})}>
                        <View style={styles.cardImageContainer}>
                            <Image source={{ uri: 'https://via.placeholder.com/100' }} style={styles.cardImage} />
                        </View>
                        <View style={styles.cardDetails}>
                            <Text style={[styles.cardTitle, { color: colors.primary }]}>{item.commerce.name}</Text>
                            <View style={styles.cardInfoContainer}>
                                <View style={styles.cardCategoryContainer}>
                                    <Feather name="tag" size={14} color={colors.icon} />
                                    <Text style={[styles.cardCategoryText, { color: colors.primary }]}>{traducirCategorias(item.commerce.category)}</Text>
                                </View>
                                <View style={styles.cardRatingContainer}>
                                    <Feather name="star" size={14} color={colors.star} />
                                    <Text style={[styles.cardRatingText, { color: colors.primary }]}>
                                        {parseFloat(item.commerce.rating.toFixed(2)) > 5 ? 'N/A' : item.commerce.rating.toFixed(2)}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.cardPhoneContainer}>
                                <Feather name="phone" size={14} color={colors.icon} />
                                <Text style={[styles.cardPhoneText, { color: colors.text }]}>{item.commerce.phone}</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.favoriteButton}
                            onPress={() => toggleFavoriteMutation.mutate({ id: item.commerce.id, type: 'commerce' })}
                        >
                            <Feather name="heart" size={24} color={colors.favorite} />
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Animated.View>
            );
        }
    };

    const headerStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            scrollY.value,
            [0, 50],
            [1, 0],
            { extrapolateRight: Extrapolation.CLAMP }
        );

        return {
            opacity,
        };
    });

    if (productsLoading || commercesLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <Text style={[styles.loadingText, { color: colors.text }]}>Cargando favoritos...</Text>
            </View>
        );
    }

    // const favoriteItems = activeTab === 'products' ? favoriteProducts : favoriteCommerces;

    const favoriteItems = favoriteCommerces;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" />
            <Animated.View style={[styles.header, headerStyle, { backgroundColor: colors.secondaryBackground, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Feather name="arrow-left" size={24} color={colors.icon} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Mis Favoritos</Text>
                <View style={{ width: 24 }} />
            </Animated.View>

            <View style={[styles.tabContainer, { backgroundColor: colors.secondaryBackground }]}>
                {/*<TouchableOpacity*/}
                {/*    style={[styles.tab, activeTab === 'products' && { borderBottomColor: colors.primary }]}*/}
                {/*    onPress={() => setActiveTab('products')}*/}
                {/*>*/}
                {/*    <Text style={[styles.tabText, { color: activeTab === 'products' ? colors.primary : colors.text }]}>Productos</Text>*/}
                {/*</TouchableOpacity>*/}
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'commerces' && { borderBottomColor: colors.primary }]}
                    onPress={() => setActiveTab('commerces')}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'commerces' ? colors.primary : colors.text }]}>Comercios</Text>
                </TouchableOpacity>
            </View>

            <Animated.FlatList
                data={favoriteItems}
                renderItem={renderFavoriteItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                ListEmptyComponent={() => (
                    <Animated.View
                        entering={FadeIn.delay(300).springify()}
                        style={styles.emptyStateContainer}
                    >
                        <Feather name="heart" size={64} color={colors.icon} />
                        <Text style={[styles.emptyStateText, { color: colors.primary }]}>
                            No tienes {activeTab === 'products' ? 'productos' : 'comercios'} favoritos aún
                        </Text>
                        <Text style={[styles.emptyStateSubtext, { color: colors.text }]}>
                            Explora {activeTab === 'products' ? 'productos' : 'comercios'} y agrega tus favoritos
                        </Text>
                    </Animated.View>
                )}
            />
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
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    tab: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
    },
    listContainer: {
        padding: 16,
    },
    card: {
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
    },
    cardTouchable: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardImageContainer: {
        width: 100,
        height: 100,
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
        overflow: 'hidden',
    },
    cardImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    cardDetails: {
        flex: 1,
        padding: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 14,
        marginBottom: 8,
    },
    cardInfoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardCategoryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    cardCategoryText: {
        fontSize: 14,
        marginLeft: 4,
        fontWeight: '600',
    },
    cardPriceText: {
        fontSize: 16,
        fontWeight: '700',
    },
    cardStockContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardStockText: {
        fontSize: 14,
        marginLeft: 8,
    },
    cardRatingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    cardRatingText: {
        fontSize: 14,
        marginLeft: 4,
        fontWeight: '600',
    },
    cardPhoneContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    cardPhoneText: {
        fontSize: 14,
        marginLeft: 8,
    },
    favoriteButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        borderRadius: 20,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyStateText: {
        fontSize: 20,
        fontWeight: '700',
        marginTop: 16,
        textAlign: 'center',
    },
    emptyStateSubtext: {
        fontSize: 16,
        marginTop: 8,
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 18,
        fontWeight: '600',
    },
});