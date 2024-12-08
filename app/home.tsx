import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, BackHandler,
    Dimensions,
    Image,
    ImageSourcePropType, RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {Feather} from '@expo/vector-icons';
import Animated, {
    Extrapolation,
    FadeIn,
    FadeInDown,
    interpolate,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';
import {NavigationProp, useFocusEffect, useNavigation} from "@react-navigation/native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {StackNavigationProp} from "@react-navigation/stack";
import {RootStackParamList} from "@/app/AppNavigator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {Store} from "@/app/AppNavigator";
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTheme} from "@/app/themeContext";
import {
    fetchBaskets,
    fetchExpiringProducts,
    fetchFavorites,
    fetchNearbyStores,
    fetchOrders,
    fetchStores
} from "@/app/api";
import {Product} from "@/app/commercePage";
import {registerForPushNotificationsAsync} from "@/app/pushNotifications";
import { FlatList } from 'react-native-gesture-handler'
import {Order, ProductInstance} from "./orders"
import { MapModal } from './MapModal'; // Added import
const { width } = Dimensions.get('window');

interface Categoria {
    id: string;
    nombre: string;
    icono: ImageSourcePropType;
}

export interface Restaurante {
    id: string;
    name: string;
    category: string;
    phone: string;
    rating: number;
    logo: string;
    isFavorite: boolean;
    latitude: number;
    longitude: number;
    address_data: string;
}

export interface ExpiringProduct {
    id: number;
    expiration_date: string;
    product_id: string;
    quantity: number;
    state: string;
    product_name: string;
    product_description: string;
    product_price: number;
    product_category: string;
    commerce_id: string;
    commerce_name: string;
    commerce_logo: string | null;
    discount: number;
    is_premium: boolean;
    photo: string;
}

interface Basket {
    commerce_id: string;
    id: number;
    name: string;
    price: number;
    quantity: number;
    products: Product[];
    category: "Basket";
}

const categorias: Categoria[] = [
    { id: '4', nombre: 'Nearby', icono: require('../assets/images/ReGustoLogo-removebg-preview.png') },
    { id: '1', nombre: 'Restaurant', icono: require('../assets/images/ReGustoLogo-removebg-preview.png') },
    { id: '2', nombre: 'Supermarket', icono: require('../assets/images/ReGustoLogo-removebg-preview.png') },
    { id: '3', nombre: 'Bakery', icono: require('../assets/images/ReGustoLogo-removebg-preview.png') },
];

type HomeNavigationProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;

const traducirCategorias = (categoria: string) => {
    switch(categoria) {
        case 'Restaurant':
            return 'Restaurante';
        case 'Bakery':
            return 'Panadería';
        case 'Supermarket':
            return 'Supermercado';
        case 'Nearby':
            return 'Cerca de ti';
    }
}

export default function PaginaInicio({ navigation }: { navigation: NavigationProp<any> }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredRestaurantes, setFilteredRestaurantes] = useState<Restaurante[]>([]);
    const headerHeight = useSharedValue(100);
    const scrollY = useSharedValue(0);
    const scale = useSharedValue(1);
    const insets = useSafeAreaInsets();
    const navigate = useNavigation<HomeNavigationProp>();
    const [showSearchResults, setShowSearchResults] = useState(false);
    const queryClient = useQueryClient();
    const { colors } = useTheme();
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null); // Added state for selected order
    const [isMapModalVisible, setIsMapModalVisible] = useState(false); // Added state for map modal visibility
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        Promise.all([
            queryClient.invalidateQueries({ queryKey: ['favorites'] }),
            queryClient.invalidateQueries({ queryKey: ['stores'] }),
            queryClient.invalidateQueries({ queryKey: ['nearbyStores'] }),
            queryClient.invalidateQueries({ queryKey: ['expiringProducts'] }),
            queryClient.invalidateQueries({ queryKey: ['baskets'] }),
            queryClient.invalidateQueries({ queryKey: ['orders'] })
        ]).then(() => setRefreshing(false));
    }, [queryClient]);


    useFocusEffect(
        useCallback(() => {
            const handleBackPress = () => {
                Alert.alert(
                    'Salir',
                    '¿Estás seguro de que deseas salir de la aplicación?',
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Salir', onPress: () => {
                                AsyncStorage.removeItem('token');
                                AsyncStorage.removeItem('user');
                                navigation.navigate('Login');
                            } },
                    ],
                    { cancelable: true }
                );
                return true; // Retorna true para bloquear el gesto de retroceso.
            };

            BackHandler.addEventListener('hardwareBackPress', handleBackPress);

            return () => {
                BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
            };
        }, [])
    );

    const {
        data: favorites,
        isLoading: isFavoritesLoading,
        isError: isFavoritesError,
        error: favoritesError
    } = useQuery({
        queryKey: ['favorites'],
        queryFn: fetchFavorites
    });

    const {
        data: stores,
        isLoading: isStoresLoading,
        isError: isStoresError,
        error: storesError
    } = useQuery({
        queryKey: ['stores'],
        queryFn: fetchStores
    });

    const {
        data: nearbyStores,
        isLoading: isNearbyStoresLoading,
        isError: isNearbyStoresError,
        error: nearbyStoresError
    } = useQuery({
        queryKey: ['nearbyStores'],
        queryFn: fetchNearbyStores
    });

    const {
        data: expiringProducts,
        isLoading: isExpiringProductsLoading,
        isError: isExpiringProductsError,
        error: expiringProductsError
    } = useQuery({
        queryKey: ['expiringProducts'],
        queryFn: fetchExpiringProducts
    });

    const {
        data: baskets,
        isLoading: isBasketsLoading,
        isError: isBasketsError,
        error: basketsError
    } = useQuery({
        queryKey: ['baskets'],
        queryFn: fetchBaskets
    });

    const {
        data: orders = [],
        isLoading: isOrdersLoading,
        isError: isOrdersError,
        error: ordersError,
        refetch: refetchOrders
    } = useQuery({
        queryKey: ['orders'],
        queryFn: fetchOrders,
    });


    useEffect(() => {
        if (stores && favorites) {
            const favoriteIds = favorites.map((fav) => fav.commerce_id);
            // const allStores = [...stores, ...(nearbyStores || [])];
            const allStores = [...stores];
            const storesWithFavorites = allStores.map((store) => ({
                ...store,
                isFavorite: favoriteIds.includes(store.id)
            }));
            setFilteredRestaurantes(storesWithFavorites);
        }
    }, [stores, favorites, nearbyStores]);
    useEffect(() => {
        registerForPushNotificationsAsync();
    }, []);
    const toggleFavoriteMutation = useMutation({
        mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                throw new Error('No token found');
            }

            const method = isFavorite ? 'DELETE' : 'POST';
            const response = await fetch(`https://regusto.azurewebsites.net/api/commerce/${id}/favorite`, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return { id, isFavorite: !isFavorite };
        },
        onMutate: async ({ id, isFavorite }) => {
            await queryClient.cancelQueries({ queryKey: ['stores'] });
            await queryClient.cancelQueries({ queryKey: ['nearbyStores'] });

            const previousStores = queryClient.getQueryData<Restaurante[]>(['stores']);
            const previousNearbyStores = queryClient.getQueryData<Restaurante[]>(['nearbyStores']);

            queryClient.setQueryData<Restaurante[]>(['stores'], (old) =>
                old?.map(store =>
                    store.id === id ? { ...store, isFavorite: !isFavorite } : store
                )
            );

            queryClient.setQueryData<Restaurante[]>(['nearbyStores'], (old) =>
                old?.map(store =>
                    store.id === id ? { ...store, isFavorite: !isFavorite } : store
                )
            );

            return { previousStores, previousNearbyStores };
        },
        onError: (err, variables, context) => {
            if (context?.previousStores) {
                queryClient.setQueryData<Restaurante[]>(['stores'], context.previousStores);
            }
            if (context?.previousNearbyStores) {
                queryClient.setQueryData<Restaurante[]>(['nearbyStores'], context.previousNearbyStores);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
        },
    });

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const toggleFavorite = useCallback((id: string, isFavorite: boolean) => {
        toggleFavoriteMutation.mutate({ id, isFavorite });
    }, [toggleFavoriteMutation]);

    const renderedCategories = new Set<string>();

    const primaryColorWithOpacity = (opacity: number) => {
        const hex = colors.primary.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.background,
        },
        loadingText: {
            marginLeft: 8,
            fontSize: 16,
            color: colors.text,
        },
        headerContent: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: colors.primary,
        },
        ubicacion: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        textoUbicacion: {
            marginLeft: 4,
            marginRight: 4,
            fontSize: 16,
            fontWeight: '600',
            color: colors.secondaryBackground,
        },
        headerIcons: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        headerIcon: {
            padding: 8,
            marginLeft: 2,
        },
        scrollView: {
            flex: 1,
        },
        searchContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.secondaryBackground,
            marginHorizontal: 16,
            marginTop: 16,
            marginBottom: 8,
            paddingHorizontal: 12,
            borderRadius: 8,
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
        },
        searchIcon: {
            marginRight: 8,
        },
        searchInput: {
            flex: 1,
            height: 40,
            fontSize: 16,
            color: colors.text,
        },
        searchResultsList: {
            flex: 1,
            paddingHorizontal: 16,
            paddingTop: 16,
        },
        bannerContainer: {
            margin: 16,
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: primaryColorWithOpacity(0.8),
        },
        bannerImage: {
            width: '100%',
            height: 140,
            resizeMode: 'cover',
        },
        bannerContent: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            padding: 16,
            justifyContent: 'center',
        },
        bannerTitle: {
            fontSize: 24,
            fontWeight: 'bold',
            color: '#FFFFFF',
            // color: colors.secondaryBackground,
            marginBottom: 8,
        },
        bannerSubtitle: {
            fontSize: 16,
            color: '#FFFFFF',
            // color: colors.secondaryBackground,
            marginBottom: 16,
        },
        bannerButton: {
            backgroundColor: colors.accent,
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 25,
            alignSelf: 'flex-start',
        },
        bannerButtonText: {
            color: colors.primary,
            fontWeight: 'bold',
            fontSize: 16,
        },
        seccion: {
            marginBottom: 24,
        },
        price: {
            fontSize: 16,
            fontWeight: 'bold',
            color: colors.secondaryText,
        },
        encabezadoSeccion: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            marginBottom: 12,
        },
        tituloSeccion: {
            fontSize: 20,
            fontWeight: '700',
            color: colors.secondaryText,
        },
        categoriasContainer: {
            paddingHorizontal: 16,
        },
        itemCategoria: {
            alignItems: 'center',
            marginRight: 16,
            width: (width - 32) / 4,
        },
        iconoCategoria: {
            width: 60,
            height: 60,
            borderRadius: 30,
        },
        nombreCategoria: {
            marginTop: 8,
            fontSize: 12,
            fontWeight: '500',
            width: '100%',
            color: colors.text,
            textAlign: 'center',
        },
        restaurantesContainer: {
            paddingHorizontal: 16,
        },
        tarjetaRestaurante: {
            backgroundColor: colors.secondaryBackground,
            borderRadius: 16,
            marginRight: 16,
            marginBottom: 16,
            width: width * 0.75,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
            overflow: 'hidden',
        },
        tarjetaRestauranteTouchable: {
            flex: 1,
        },
        imagenRestaurante: {
            width: '100%',
            height: 150,
            resizeMode: 'cover',
        },
        detallesRestaurante: {
            padding: 16,
        },
        nombreRestaurante: {
            fontSize: 18,
            fontWeight: '700',
            color: colors.secondaryText,
            marginBottom: 8,
        },
        infoContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
        },
        categoryContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.primary + '20',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
        },
        categoriaRestaurante: {
            fontSize: 14,
            color: colors.secondaryText,
            marginLeft: 4,
            fontWeight: '600',
        },
        ratingContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.accent + '20',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
        },
        ratingText: {
            fontSize: 14,
            fontWeight: '600',
            color: "#F4D548",
            marginLeft: 4,
        },
        phoneContainer: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        phoneRestaurante: {
            fontSize: 14,
            color: colors.text,
            marginLeft: 8,
        },
        botonFavorito: {
            position: 'absolute',
            top: 12,
            right: 12,
            backgroundColor: colors.secondaryBackground + 'CC',
            borderRadius: 20,
            padding: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        botonPlus: {
            position: 'absolute',
            top: 12,
            right: 12,
            backgroundColor: colors.secondaryBackground + 'CC',
            borderRadius: 20,
            padding: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        detailsButton: {
            position: 'absolute',
            top: 12,
            right: 12,
            borderRadius: 20,
            padding: 8,
            borderWidth: 1,
            borderColor: colors.primary,
            borderStyle: 'solid',
        },
        detailsButtonText: {
            color: colors.primary
        },

        botonFavoritoSelected: {
            position: 'absolute',
            top: 12,
            right: 12,
            backgroundColor: colors.secondaryBackground,
            borderRadius: 20,
            padding: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        errorContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
            backgroundColor: colors.background,
        },
        errorText: {
            fontSize: 16,
            color: 'red',
            textAlign: 'center',
        },
        expiringProductPrice: {
            fontSize: 16,
            fontWeight: '700',
            color: colors.secondaryText,
            marginBottom: 4,
        },
        basketCard: {
            backgroundColor: colors.secondaryBackground,
            borderRadius: 12,
            marginRight: 16,
            width: 220,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
            overflow: 'hidden',
        },
        basketDetails: {
            padding: 16,
        },
        basketName: {
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 4,
        },
        basketPrice: {
            fontSize: 18,
            fontWeight: '700',
            color: colors.secondaryText,
            marginBottom: 4,
        },
        basketQuantity: {
            fontSize: 14,
            color: colors.searchIcon,
            marginBottom: 2,
        },
        basketProductCount: {
            fontSize: 14,
            color: colors.searchIcon,
            marginBottom: 4,
        },
        basketCommerce: {
            fontSize: 14,
            color: colors.secondaryText,
            fontWeight: '500',
        },
        basketsContainer: {
            paddingHorizontal: 16,
            paddingVertical: 8,
        },
        readyOrdersSection: {
            marginBottom: 18,
        },
        readyOrdersSectionTitle: {
            fontSize: 22,
            fontWeight: '700',
            color: colors.secondaryText,
            marginBottom: 12,
            paddingHorizontal: 16,
        },
        readyOrderCard: {
            backgroundColor: colors.secondaryBackground,
            borderRadius: 12,
            marginRight: 16,
            padding: 16,
            width: width * 0.8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        readyOrderInfo: {
            marginBottom: 12,
        },
        readyOrderId: {
            fontSize: 16,
            fontWeight: '600',
            color: colors.secondaryText,
            marginBottom: 4,
        },
        readyOrderPrice: {
            fontSize: 18,
            fontWeight: '700',
            color: colors.accent,
            marginBottom: 4,
        },
        readyOrderStatus: {
            fontSize: 14,
            color: colors.primary,
            fontWeight: '500',
            marginBottom: 8,
        },
        readyOrderPickupButton: {
            backgroundColor: colors.primary,
            borderRadius: 8,
            paddingVertical: 10,
            paddingHorizontal: 16,
            alignItems: 'center',
        },
        readyOrderPickupButtonText: {
            color: colors.secondaryBackground,
            fontWeight: '600',
            fontSize: 16,
        },
        readyOrdersContainer: {
            paddingLeft: 16,
            paddingRight: 16,
        },
        readyOrderCommerce: {
            fontSize: 14,
            color: colors.secondaryText,
            marginBottom: 4,
        },
        readyOrderQuantity: {
            fontSize: 14,
            color: colors.secondaryText,
            marginBottom: 4,
        },
        expiringProductCard: {
            backgroundColor: colors.secondaryBackground,
            borderRadius: 12,
            marginRight: 16,
            width: 160,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
            overflow: 'hidden',
        },
        expiringProductImage: {
            width: '100%',
            height: 120,
            resizeMode: 'cover',
        },
        expiringProductDetails: {
            padding: 12,
        },
        expiringProductName: {
            fontSize: 14,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 4,
        },
        priceContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 4,
        },
        discountPrice: {
            fontSize: 16,
            fontWeight: 'bold',
            color: colors.discount,
            marginRight: 8,
        },
        originalPrice: {
            fontSize: 14,
            textDecorationLine: 'line-through',
            color: colors.searchIcon,
        },
        expiringProductExpiration: {
            fontSize: 12,
            color: '#FF6B6B',
            marginBottom: 4,
        },
        expiringProductCommerce: {
            fontSize: 12,
            color: colors.searchIcon,
        },
        expiringProductsContainer: {
            paddingHorizontal: 16,
            paddingVertical: 8,
        },
    });

    const renderCategoria = ({ item, index }: { item: Categoria; index: number }) => {
        const nombreTraducido = traducirCategorias(item.nombre) || 'Desconocido';
        if (renderedCategories.has(nombreTraducido)) {
            return null; // Skip rendering if the category has already been rendered
        }

        renderedCategories.add(nombreTraducido);

        return (
            <Animated.View
                entering={FadeInDown.delay(index * 100).springify()}
                style={styles.itemCategoria}
            >
                <TouchableOpacity
                style={styles.itemCategoria}
                >
                    <Animated.Image
                        source={item.icono}
                        style={styles.iconoCategoria}
                    />
                    <Text style={styles.nombreCategoria}>{nombreTraducido}</Text>
                </TouchableOpacity>
            </Animated.View>
        );
    };
    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }]
        };
    });

    const renderRestaurante = ({ item, index }: { item: Restaurante; index: number }) => {
        return (
            <Animated.View
                entering={FadeInDown.delay(index * 100).springify()}
                style={styles.tarjetaRestaurante}
            >
                <Animated.View style={animatedStyle}>
                    <TouchableOpacity style={styles.tarjetaRestauranteTouchable} onPress={() => handleStorePress(item)}>
                        <Image source={{uri: `${item.logo ? item.logo : 'https://via.placeholder.com/150'}`}} style={styles.imagenRestaurante} />
                        <View style={styles.detallesRestaurante}>
                            <Text style={styles.nombreRestaurante}>{item.name}</Text>
                            <View style={styles.infoContainer}>
                                <View style={styles.categoryContainer}>
                                    <Feather name="tag" size={14} color="#269577" />
                                    <Text style={styles.categoriaRestaurante}>{traducirCategorias(item.category)}</Text>
                                </View>
                                <View style={styles.ratingContainer}>
                                    <Feather name="star" size={14} color="#F4D548" />
                                    <Text style={styles.ratingText}>
                                        {item.rating > 5 ? 'No calificado' : item.rating.toFixed(1)}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.phoneContainer}>
                                <Feather name="phone" size={14} color="#269577" />
                                <Text style={styles.phoneRestaurante}>{item.phone}</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={item.isFavorite ? styles.botonFavoritoSelected : styles.botonFavorito}
                            onPress={() => {
                                toggleFavorite(item.id, item.isFavorite);
                            }}
                            disabled={toggleFavoriteMutation.isPending}
                        >
                            <Feather
                                name={item.isFavorite ? "heart" : "heart"}
                                size={24}
                                color={item.isFavorite ? "#FF6B6B" : "#E0E0E0"}
                                testID="favoritesButton"
                            />
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>
        );
    };

    const renderExpiringProduct = ({ item }: { item: ExpiringProduct }) => {
        const discountedPrice = item.product_price * (1 - item.discount);
        return (
            <Animated.View
                entering={FadeInDown.delay(100).springify()}
                style={styles.expiringProductCard}
            >
                <TouchableOpacity onPress={() => handleExpiringProductPress(item)}>
                    <Image source={{ uri: item.photo || 'https://via.placeholder.com/150' }} style={styles.expiringProductImage} />
                    <View style={styles.expiringProductDetails}>
                        <Text style={styles.expiringProductName}>{item.product_name}</Text>
                        <View style={styles.priceContainer}>
                            {item.discount > 0 ? (
                                <>
                                    <Text style={styles.discountPrice}>${discountedPrice.toFixed(2)}</Text>
                                    <Text style={styles.originalPrice}>${item.product_price.toFixed(2)}</Text>
                                </>
                            ) : (
                                <Text style={styles.price}>${item.product_price.toFixed(2)}</Text>
                            )}
                        </View>
                        <Text style={styles.expiringProductExpiration}>Vence: {item.expiration_date}</Text>
                        <Text style={styles.expiringProductCommerce}>{item.commerce_name}</Text>
                    </View>
                    <View style={styles.botonPlus}>
                        <Feather
                            name={"plus"}
                            size={24}
                            color={colors.primary}
                            testID="plus"
                        />
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    function handleCategoryPress(nombre: string) {
        return () => {
            navigation.navigate('Stores', {category: nombre});
        };
    }

    const renderSeccion = ({ item }: { item: Categoria }) => {
        let restaurantesCategoria;
        const favoriteIds = favorites?.map((fav) => fav.commerce_id) || [];
        if (item.nombre === 'Nearby') {
            restaurantesCategoria = filteredRestaurantes.filter(store => nearbyStores?.some(nearbyStore => nearbyStore.id === store.id)) || [];
        } else {
            restaurantesCategoria = filteredRestaurantes.filter(restaurante => restaurante.category === item.nombre);
        }

        // Filtrar comercios duplicados
        const seen = new Set<string>();
        const uniqueRestaurantesCategoria = restaurantesCategoria.filter((restaurante) => {
            if (seen.has(restaurante.id)) {
                return false;
            }
            seen.add(restaurante.id);
            return true;
        });

        if (uniqueRestaurantesCategoria.length === 0) {
            return null;
        }


        return (
            <View style={styles.seccion}>
                <Animated.View entering={FadeIn.delay(200)} style={styles.encabezadoSeccion}>
                    <Text style={styles.tituloSeccion}>{traducirCategorias(item.nombre)}</Text>
                    <TouchableOpacity onPress={handleCategoryPress(item.nombre)}>
                        <Feather name="chevron-right" size={24} color="#269577" />
                    </TouchableOpacity>
                </Animated.View>
                <FlatList
                    data={uniqueRestaurantesCategoria}
                    renderItem={renderRestaurante}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.restaurantesContainer}
                />
            </View>
        );
    };
    const renderBasket = ({ item }: { item: Basket }) => {
        if (item.quantity === 0) return null; // Do not render baskets with quantity 0

        const store = stores?.find(store => store.id === item.commerce_id);
        return (
            <Animated.View
                entering={FadeInDown.delay(100).springify()}
                style={styles.basketCard}
            >
                <TouchableOpacity onPress={() => handleBasketPress(item)}>
                    <View style={styles.basketDetails}>
                        <Text style={styles.basketName}>{item.name}</Text>
                        <Text style={styles.basketPrice}>${(item.price).toFixed(2)}</Text>
                        <Text style={styles.basketQuantity}>Cantidad: {item.quantity}</Text>
                        <Text style={styles.basketProductCount}>Productos: {item.products.length}</Text>
                        {store && (
                            <Text style={styles.basketCommerce}>
                                <Feather name="shopping-bag" size={14} color="#269577" /> {store.name}
                            </Text>
                        )}
                    </View>
                    <View
                        style={[styles.botonPlus, {backgroundColor: colors.searchContainer}]}
                    >
                        <Feather
                            name={"plus"}
                            size={24}
                            color={colors.primary}
                            testID="plus"
                        />
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderReadyOrder = ({ item }: { item: Order }) => {
        if (item.status !== 'ready') return null;

        const store = stores?.find(store => store.id === item.commerce_id);
        const totalQuantity = item.products.reduce((sum, product) => sum + product.quantity, 0);

        return (
            <View style={styles.readyOrderCard}>
                <View style={styles.readyOrderInfo}>
                    <Text style={styles.readyOrderId}>Pedido #{item.order_id}</Text>
                    <Text style={styles.readyOrderPrice}>${item.price.toFixed(2)}</Text>
                    <Text style={styles.readyOrderStatus}>
                        <Feather name="check-circle" size={14} color={colors.primary} /> Listo para Retirar
                    </Text>
                    {store && (
                        <Text style={styles.readyOrderCommerce}>
                            <Feather name="shopping-bag" size={14} color={colors.primary} /> {store.name}
                        </Text>
                    )}
                    <Text style={styles.readyOrderQuantity}>
                        <Feather name="package" size={14} color={colors.primary} /> {totalQuantity} productos
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.readyOrderPickupButton}
                    onPress={() => {
                        setSelectedOrder(item);
                        setIsMapModalVisible(true);
                    }}
                >
                    <Text style={styles.readyOrderPickupButtonText}>Retirar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.detailsButton}
                    onPress={() => navigation.navigate('OrderDetails', { order: item })}
                >
                    <Text style={styles.detailsButtonText}>Detalles</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const handleStorePress = (store: Store) => {
        navigation.navigate('CommerceDetail', { store });
    };

    const handleExpiringProductPress = (product: ExpiringProduct) => {
        const productGo : Product = {
            id: product.product_id,
            name : product.product_name,
            description: product.product_description,
            price: product.product_price,
            category: product.product_category,
            discount: product.discount,
            photo: product.photo || 'https://via.placeholder.com/150',
            isFavorite: false,
            stock: product.quantity,
        }
        navigation.navigate('ProductDetail', { item : productGo });
    };

    const handleBasketPress = (basket: Basket) => {
        // Navigate to a basket detail page or show a modal with basket details
        navigation.navigate('ProductDetail', { item: basket });
    };

    const handleReadyOrderPress = (order: Order) => {
        // Navigate to an order detail page
        navigation.navigate('OrderDetail', { order: order });
    };


    if (isStoresError || isFavoritesError || isNearbyStoresError || isExpiringProductsError || isBasketsError || isOrdersError) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                    An error occurred: {(storesError as Error)?.message || (favoritesError as Error)?.message || (nearbyStoresError as Error)?.message || (expiringProductsError as Error)?.message || (basketsError as Error)?.message || (ordersError as Error)?.message}
                </Text>
            </View>
        );
    }

    const selectedStore = selectedOrder
        ? stores?.find(store => store.id === selectedOrder.commerce_id)
        : null;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.searchContainer}>
                <Feather name="search" size={20} color="#269577" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Locales..."
                    placeholderTextColor={colors.placeholder} // Set the placeholder text color
                    value={searchQuery}
                    onChangeText={(text) => {
                        setSearchQuery(text);
                        if (text.length > 0) {
                            const filtered = stores?.filter(restaurante =>
                                restaurante.name.toLowerCase().includes(text.toLowerCase())
                            ) || [];
                            setFilteredRestaurantes(filtered);
                            setShowSearchResults(true);
                        } else {
                            setFilteredRestaurantes(stores || []);
                            setShowSearchResults(false);
                        }
                    }}
                />
            </View>

            {showSearchResults ? (
                <FlatList
                    data={filteredRestaurantes}
                    renderItem={renderRestaurante}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    style={styles.searchResultsList}
                />
            ) : (
                <Animated.ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[colors.primary]}
                        />
                    }
                >
                    {/* Ready Orders Section */}
                    {orders.some(order => order.status === 'ready') && (
                        <View style={styles.readyOrdersSection}>
                            <Text style={styles.readyOrdersSectionTitle}>Pedidos Listos</Text>
                            <FlatList
                                data={orders.filter(order => order.status === 'ready')}
                                renderItem={renderReadyOrder}
                                keyExtractor={(item) => item.order_id}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.readyOrdersContainer}
                                style={{paddingBottom: 9, paddingTop: 4}}
                            />
                        </View>
                    )}

                    <FlatList
                        data={categorias}
                        renderItem={renderSeccion}
                        keyExtractor={(item) => item.id}
                        scrollEnabled={false}
                    />

                    {/* New section for expiring products */}
                    <View style={styles.seccion}>
                        <Animated.View entering={FadeIn.delay(200)} style={styles.encabezadoSeccion}>
                            <Text style={styles.tituloSeccion}>Productos cerca de vencerse</Text>
                        </Animated.View>
                        {isExpiringProductsLoading ? (
                            <ActivityIndicator size="large" color="#269577" />
                        ) : isExpiringProductsError ? (
                            <Text style={styles.errorText}>Error loading expiring products</Text>
                        ) : (
                            <FlatList
                                data={expiringProducts}
                                renderItem={renderExpiringProduct}
                                keyExtractor={(item) => item.id.toString()}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.expiringProductsContainer}
                            />
                        )}
                    </View>

                    {/* Updated Baskets section */}
                    <View style={styles.seccion}>
                        <Animated.View entering={FadeIn.delay(200)} style={styles.encabezadoSeccion}>
                            <Text style={styles.tituloSeccion}>Canastas disponibles</Text>

                        </Animated.View>
                        {isBasketsLoading ? (
                            <ActivityIndicator size="large" color="#269577" />
                        ) : isBasketsError ? (
                            <Text style={styles.errorText}>Error loading baskets</Text>
                        ) : (
                            <FlatList
                                data={baskets}
                                renderItem={renderBasket}
                                keyExtractor={(item) => item.id.toString()}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.basketsContainer}
                            />
                        )}
                    </View>
                </Animated.ScrollView>
            )}
            <MapModal
                isVisible={isMapModalVisible}
                onClose={() => setIsMapModalVisible(false)}
                order={selectedOrder}
                store={selectedStore}
            />
        </SafeAreaView>
    );
}

