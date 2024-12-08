import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    TextInput,
    Dimensions,
    ActivityIndicator,
    LayoutAnimation, RefreshControl
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from "@/app/themeContext";
import {fetchStores, fetchFavorites, fetchNearbyStores} from "@/app/api";
import { Restaurante } from './home';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
    FadeInDown,
    FadeInRight,
    Layout,
    useAnimatedScrollHandler,
    useSharedValue
} from 'react-native-reanimated';
import {NavigationProp, RouteProp, useFocusEffect} from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {MainTabParamList, RootStackParamList} from "@/app/AppNavigator";
import {Store} from "@/app/AppNavigator";
import * as Location from 'expo-location';
import abstract_timer from "pusher-js/src/core/utils/timers/abstract_timer";


function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return Math.round(distance * 10) / 10; // Round to one decimal place
}

const { width } = Dimensions.get('window');

const categories = ["All", "Restaurant", "Supermarket", "Bakery", "Nearby"];

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

type StoresScreenProps = {
    navigation: NavigationProp<any>;
    route: RouteProp<MainTabParamList, 'Stores'>;
};

export interface StoreWithAddress {
    id: string;
    name: string;
    category: string;
    phone: string;
    rating: number;
    isFavorite?: boolean;
    logo: string;
    latitude: number;
    longitude: number;
}

export default function StoresScreen({ navigation, route }: StoresScreenProps) {
    let {category} = route.params
    const [activeCategory, setActiveCategory] = useState(category || "All");    // const [activeCategory, setActiveCategory] = useState(category);
    const [searchQuery, setSearchQuery] = useState("");
    const { colors } = useTheme();
    const queryClient = useQueryClient();
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const scrollY = useSharedValue(0);
    const [refreshing, setRefreshing] = useState(false);

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
        data: favorites,
        isLoading: isFavoritesLoading,
        isError: isFavoritesError,
        error: favoritesError
    } = useQuery({
        queryKey: ['favorites'],
        queryFn: fetchFavorites
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



    const traducirCategorias = (category: string) => {
        switch (category) {
            case 'Restaurant':
                return 'Restaurante';
            case 'Bakery':
                return 'Panadería';
            case 'Supermarket':
                return 'Supermercado';
            case 'Nearby':
                return 'Cerca de Ti';
            case 'All':
                return 'Todos';
            case 'other':
                return 'Otro';
            default:
                return 'Desconocido';
        }
    }


    const [filteredStores, setFilteredStores] = useState<Restaurante[]>([]);

    useEffect(() => {
        if (stores && favorites && nearbyStores) {
            const favoriteIds = favorites.map((fav) => fav.commerce_id);
            const storesWithFavorites = stores.map((store) => ({
                ...store,
                isFavorite: favoriteIds.includes(store.id)
            }));
            filterStores(storesWithFavorites);
        }
    }, [stores, favorites, activeCategory, searchQuery, category]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            // When the screen is focused, check if there's a saved category
            AsyncStorage.getItem('activeCategory').then((savedCategory) => {
                if (savedCategory) {
                    setActiveCategory(savedCategory);
                } else if (category) {
                    setActiveCategory(category);
                }
            });
        });

        return unsubscribe;
    }, [navigation, category]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        Promise.all([
            queryClient.invalidateQueries({ queryKey: ['favorites'] }),
            queryClient.invalidateQueries({ queryKey: ['stores'] }),
            queryClient.invalidateQueries({ queryKey: ['nearbyStores'] }),
        ]).then(() => setRefreshing(false));
        console.log(nearbyStores)
    }, [queryClient]);

    useEffect(() => {
        const getUserLocation = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    console.error('Permission to access location was denied');
                    return;
                }

                const location = await Location.getCurrentPositionAsync({});
                setUserLocation({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });
            } catch (error) {
                console.error('Error getting location:', error);
            }
        };

        getUserLocation();
    }, []);

    const filterStores = useCallback((storesData: Restaurante[]) => {
        let filtered = [];
        if (activeCategory === "Nearby") {
            filtered = nearbyStores?.filter(store => store.name.toLowerCase().includes(searchQuery.toLowerCase())) || [];
            setFilteredStores(filtered);
            return;
        }
        filtered = storesData.filter(store =>
            (activeCategory === "All" || store.category === activeCategory) &&
            store.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredStores(filtered);
    }, [activeCategory, searchQuery]);

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

    const renderStore = ({ item, index }: { item: StoreWithAddress; index: number }) => (
        <AnimatedTouchableOpacity
            style={[styles.storeCard, { backgroundColor: colors.secondaryBackground }]}
            onPress={() => navigation.navigate('CommerceDetail', { store: item })}
            entering={FadeInDown.delay(index * 100).springify()}
            layout={Layout.springify()}
        >
            <Image source={{uri: item.logo || 'https://via.placeholder.com/150'}} style={styles.storeImage} />
            <View style={styles.storeDetails}>
                <Text style={[styles.storeName, { color: colors.secondaryText }]}>{item.name}</Text>
                <View style={styles.storeInfo}>
                    <View style={[styles.categoryContainer, { backgroundColor: colors.primary + '20' }]}>
                        <Feather name="tag" size={14} color={colors.primary} />
                        <Text style={[styles.categoryText, { color: colors.secondaryText }]}>{traducirCategorias(item.category)}</Text>
                    </View>
                </View>
                {userLocation && (
                    <View style={styles.distanceContainer}>
                        <Feather name="map-pin" size={14} color={colors.primary} />
                        <Text style={[styles.distanceText, { color: colors.text }]}>
                            {calculateDistance(
                                userLocation.latitude,
                                userLocation.longitude,
                                item.latitude? item.latitude : stores?.find(store => store.id === item.id)?.latitude,
                                item.longitude? item.longitude : stores?.find(store => store.id === item.id)?.longitude
                            )} km
                        </Text>
                    </View>
                )}
                {/*<View style={[styles.ratingContainer, { backgroundColor: colors.accent + '20' }]}>*/}
                {/*    <Feather name="star" size={11} color={colors.accent} />*/}
                {/*    <Text style={[styles.ratingText, { color: colors.accent }]}>*/}
                {/*        {item.rating > 5 ? 'N/A' : item.rating.toFixed(1)}*/}
                {/*    </Text>*/}
                {/*</View>*/}
            </View>
            <View style={[styles.ratingContainer, { backgroundColor: colors.accent + '20' }]}>
                <Feather name="star" size={11} color={colors.accent} />
                <Text style={[styles.ratingText, { color: colors.accent }]}>
                    {item.rating > 5 ? 'N/A' : item.rating.toFixed(1)}
                </Text>
            </View>
            <TouchableOpacity
                style={[styles.favoriteButton, { backgroundColor: colors.secondaryBackground + 'CC' }]}
                onPress={() => toggleFavoriteMutation.mutate({ id: item.id, isFavorite: item.isFavorite || false })}
            >
                <Feather
                    name={item.isFavorite ? "heart" : "heart"}
                    size={24}
                    color={item.isFavorite ? "#FF6B6B" : "#E0E0E0"}
                />
            </TouchableOpacity>
        </AnimatedTouchableOpacity>
    );

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const changeCategory = (category1: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setActiveCategory(category1);
        AsyncStorage.setItem('activeCategory', category1);
    };

    if (isStoresLoading || isFavoritesLoading || isNearbyStoresLoading) {
        return (
            <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (isStoresError || isFavoritesError || isNearbyStoresError) {
        return (
            <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
                <Text style={{ color: "#b00020" }}>
                    Error: {(storesError as Error)?.message || (favoritesError as Error)?.message || (nearbyStoresError as Error)?.message}
                </Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.secondaryText }]}>Descubre tiendas</Text>
            </View>
            <View style={[styles.searchContainer, { backgroundColor: colors.secondaryBackground }]}>
                <Feather name="search" size={20} color={colors.primary} style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Buscar tiendas..."
                    placeholderTextColor={colors.text + '80'}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <FlatList
                data={categories}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item, index }) => (
                    <Animated.View
                        entering={FadeInRight.delay(index * 100).springify()}
                    >
                        <TouchableOpacity
                            style={[
                                styles.categoryButton,
                                { backgroundColor: activeCategory === item ? colors.primary : colors.secondaryBackground }
                            ]}
                            onPress={() => changeCategory(item)}
                        >
                            <Text style={[
                                styles.categoryButtonText,
                                { color: activeCategory === item ? colors.secondaryBackground : colors.primary }
                            ]}>
                                {traducirCategorias(item)}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
                keyExtractor={(item) => item}
                style={styles.categoriesList}
            />

            {filteredStores.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                    <Text style={[styles.emptyStateText, { color: colors.text }]}>No hay Comercios {activeCategory === "Nearby" ? "" : "de Categoria"} {traducirCategorias(activeCategory)}</Text>
                </View>
            ) : (
                <Animated.FlatList
                    data={filteredStores}
                    renderItem={renderStore}
                    onScroll={scrollHandler}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.storesList}
                    numColumns={2}
                    scrollEventThrottle={16}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[colors.primary]}
                        />
                    }
                    columnWrapperStyle={styles.storeRow}
                />
            )}


        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: 8,
        height: 40,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    categoriesList: {
        paddingHorizontal: 16,
        marginBottom: 16,
        height: 50, // Fixed height for the category list container
        maxHeight: 50
    },
    categoryButton: {
        paddingHorizontal: 16,
        height: 36, // Fixed height for all category buttons
        borderRadius: 18,
        marginRight: 8,
        justifyContent: 'center', // Center content vertically
        alignItems: 'center', // Center content horizontally
    },
    categoryButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    storesList: {
        paddingHorizontal: 8,
    },
    storeRow: {
        justifyContent: 'space-between',
    },
    storeCard: {
        width: (width - 48) / 2,
        borderRadius: 8,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    storeImage: {
        width: '100%',
        height: 120,
        resizeMode: 'cover',
    },
    storeDetails: {
        padding: 12,
    },
    storeName: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
    },
    storeInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    categoryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    categoryText: {
        fontSize: 12,
        marginLeft: 4,
        fontWeight: '600',
    },
    ratingContainer: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    ratingText: {
        fontSize: 11,
        fontWeight: '600',
        marginLeft: 4,
    },
    distanceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    distanceText: {
        fontSize: 12,
        marginLeft: 8,
    },
    favoriteButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        borderRadius: 20,
        padding: 8,
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    emptyStateText: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptyStateSubText: {
        fontSize: 16,
        textAlign: 'center',
    },
});

